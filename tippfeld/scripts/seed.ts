/*
 * Legt einen vorführbaren Anfangsbestand an: Spielplan aus der Datenquelle,
 * ein paar Demo-Konten, zwei Ligen und Tipps für die bereits gespielten
 * Spieltage. Damit ist die App beim ersten Start nicht leer.
 *
 * Aufruf: npm run seed
 *
 * Das Skript schreibt direkt in die Datenbank und umgeht dabei bewusst die
 * Tippfrist - im laufenden Betrieb geht das nur über die geprüften Aktionen.
 */
import { db, datenAbgleichen } from "../src/lib/db";
import { STANDARD_PUNKTESYSTEM } from "../src/lib/punkte";

function zufall(startwert: number) {
  let a = startwert >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_KONTEN = [
  { name: "Mira", zeichen: "zeichen-1" },
  { name: "Jonas", zeichen: "zeichen-3" },
  { name: "Theo", zeichen: "zeichen-4" },
  { name: "Alma", zeichen: "zeichen-2" },
  { name: "Ravi", zeichen: "zeichen-5" },
];

async function los() {
  const bericht = await datenAbgleichen();
  console.log(
    `Datenquelle "${bericht.quelle}": ${bericht.spiele} Spiele, ${bericht.mannschaften} Mannschaften, ` +
      `${bericht.spieler} Spieler.`,
  );

  const jetzt = new Date().toISOString();
  const verbindung = db();

  // --- Konten ---------------------------------------------------------------
  const nutzerIds: number[] = [];
  for (const konto of DEMO_KONTEN) {
    const vorhanden = verbindung.prepare("SELECT id FROM nutzer WHERE name = ?").get(konto.name) as
      | { id: number }
      | undefined;
    if (vorhanden) {
      nutzerIds.push(vorhanden.id);
      continue;
    }
    const ergebnis = verbindung
      .prepare("INSERT INTO nutzer (name, zeichen, rolle, erstellt) VALUES (?, ?, 'nutzer', ?)")
      .run(konto.name, konto.zeichen, jetzt);
    nutzerIds.push(Number(ergebnis.lastInsertRowid));
  }
  console.log(`${nutzerIds.length} Demo-Konten bereit.`);

  // --- Ligen ----------------------------------------------------------------
  const wettbewerb = verbindung.prepare("SELECT id FROM wettbewerb LIMIT 1").get() as
    | { id: string }
    | undefined;
  if (!wettbewerb) throw new Error("Kein Wettbewerb vorhanden - lief der Abgleich?");

  const ligen = [
    {
      name: "Büro-Tippliga",
      beschreibung: "Die Runde aus dem zweiten Stock. Wer verliert, bringt Kuchen mit.",
      oeffentlich: 0,
      code: "TF7K2M",
      zeichen: "zeichen-1",
    },
    {
      name: "Offene Sonntagsrunde",
      beschreibung: "Für alle, die sonntags sowieso vor dem Spiel sitzen. Jede und jeder ist willkommen.",
      oeffentlich: 1,
      code: "SONNTG",
      zeichen: "zeichen-3",
    },
  ];

  const ligaIds: number[] = [];
  for (const liga of ligen) {
    const vorhanden = verbindung.prepare("SELECT id FROM liga WHERE code = ?").get(liga.code) as
      | { id: number }
      | undefined;
    if (vorhanden) {
      ligaIds.push(vorhanden.id);
      continue;
    }
    const ergebnis = verbindung
      .prepare(
        `INSERT INTO liga (name, beschreibung, oeffentlich, code, zeichen, punktesystem,
                           wettbewerb_id, sprache, gruender_id, erstellt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'de', ?, ?)`,
      )
      .run(
        liga.name,
        liga.beschreibung,
        liga.oeffentlich,
        liga.code,
        liga.zeichen,
        JSON.stringify(STANDARD_PUNKTESYSTEM),
        wettbewerb.id,
        nutzerIds[0],
        jetzt,
      );
    ligaIds.push(Number(ergebnis.lastInsertRowid));
  }

  const mitgliedEinfuegen = verbindung.prepare(
    "INSERT OR IGNORE INTO mitglied (liga_id, nutzer_id, beigetreten) VALUES (?, ?, ?)",
  );
  for (const ligaId of ligaIds) {
    for (const nutzerId of nutzerIds) mitgliedEinfuegen.run(ligaId, nutzerId, jetzt);
  }
  console.log(`${ligaIds.length} Ligen mit je ${nutzerIds.length} Mitgliedern.`);

  // --- Tipps für bereits gespielte Spiele ------------------------------------
  const gespielt = verbindung
    .prepare(
      `SELECT id, heim_id, gast_id, tore_heim, tore_gast FROM spiel
        WHERE status = 'beendet' AND tore_heim IS NOT NULL ORDER BY anstoss`,
    )
    .all() as Array<{ id: string; heim_id: string; gast_id: string; tore_heim: number; tore_gast: number }>;

  const tippEinfuegen = verbindung.prepare(
    `INSERT INTO tipp (nutzer_id, spiel_id, tore_heim, tore_gast, abgegeben)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(nutzer_id, spiel_id) DO NOTHING`,
  );
  const spielerTippEinfuegen = verbindung.prepare(
    `INSERT INTO spieler_tipp (nutzer_id, spiel_id, position, spieler_id, abgegeben)
     VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
  );
  const kaderHolen = verbindung.prepare(
    "SELECT id, position FROM spieler WHERE mannschaft_id IN (?, ?) AND position = ?",
  );

  const w = zufall(77001);
  let tippZahl = 0;

  const schreiben = verbindung.transaction(() => {
    for (const spiel of gespielt) {
      for (const [index, nutzerId] of nutzerIds.entries()) {
        // Jedes Konto tippt unterschiedlich nah am echten Ergebnis, damit die
        // Rangliste nicht zufällig gleich aussieht.
        const treffsicherheit = 0.22 + index * 0.06;
        const abweichen = (tore: number) => {
          if (w() < treffsicherheit) return tore;
          const verschiebung = w() < 0.5 ? -1 : 1;
          return Math.max(0, tore + verschiebung);
        };
        tippEinfuegen.run(
          nutzerId,
          spiel.id,
          abweichen(spiel.tore_heim),
          abweichen(spiel.tore_gast),
          jetzt,
        );
        tippZahl++;

        if (w() < 0.55) {
          for (const position of ["TW", "ABW", "MIT", "ANG"]) {
            const auswahl = kaderHolen.all(spiel.heim_id, spiel.gast_id, position) as Array<{ id: string }>;
            if (auswahl.length === 0) continue;
            const gewaehlt = auswahl[Math.floor(w() * auswahl.length)];
            spielerTippEinfuegen.run(nutzerId, spiel.id, position, gewaehlt.id, jetzt);
          }
        }
      }
    }
  });
  schreiben();

  console.log(`${tippZahl} Tipps für ${gespielt.length} ausgewertete Spiele angelegt.`);
  console.log("\nFertig. Melde dich in der App mit einem dieser Namen an:");
  console.log(`  ${DEMO_KONTEN.map((k) => k.name).join(", ")}`);
  console.log("Beitrittscode der privaten Liga: TF7K2M");
}

los().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
