/*
 * Demo-Datenquelle.
 *
 * Diese Daten sind AUSGEDACHT und dienen nur dazu, die App vorführen und
 * testen zu können. Die App kennzeichnet sie überall sichtbar als Demo-Daten.
 *
 * Bewusste Entscheidungen:
 * - Vereinsnamen sind echte deutsche Vereinsnamen als reiner Text, weil die
 *   App ohne Namen nicht vorführbar wäre. Logos, Wappen und Trikots fehlen
 *   vollständig. Vor einer Veröffentlichung sind die Nutzungsrechte an
 *   Namen und Daten zu klären (siehe lizenzhinweis).
 * - Spielernamen sind frei erfunden. Echte Spielernamen wären personenbezogene
 *   Daten und haben in Übungsdaten nichts zu suchen.
 * - Ergebnisse und Spielpläne werden aus einem festen Startwert erzeugt. Beim
 *   erneuten Einspielen kommt derselbe Bestand heraus, damit Punktestände
 *   nachvollziehbar bleiben.
 */
import type {
  Datenbestand,
  Datenquelle,
  Ereignis,
  Mannschaft,
  Position,
  Spiel,
  Spieler,
} from "./typen";

/** Kleiner, deterministischer Zufallsgenerator (mulberry32). */
function zufall(startwert: number) {
  let a = startwert >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VEREINE: Array<[string, string]> = [
  ["FC Bayern München", "FCB"],
  ["Borussia Dortmund", "BVB"],
  ["Bayer 04 Leverkusen", "B04"],
  ["RB Leipzig", "RBL"],
  ["VfB Stuttgart", "VFB"],
  ["Eintracht Frankfurt", "SGE"],
  ["SC Freiburg", "SCF"],
  ["TSG Hoffenheim", "TSG"],
  ["1. FC Union Berlin", "FCU"],
  ["Werder Bremen", "SVW"],
  ["FC Augsburg", "FCA"],
  ["Borussia Mönchengladbach", "BMG"],
  ["VfL Wolfsburg", "WOB"],
  ["1. FSV Mainz 05", "M05"],
  ["1. FC Heidenheim", "FCH"],
  ["VfL Bochum", "BOC"],
  ["1. FC Köln", "KOE"],
  ["Holstein Kiel", "KSV"],
];

const VORNAMEN = [
  "Jonas", "Milan", "Elias", "Tobias", "Noah", "Levin", "Kian", "Rafael",
  "Malik", "Sören", "Arne", "Piet", "Dario", "Emil", "Valentin", "Josip",
  "Nuri", "Fabio", "Anton", "Lasse", "Mats", "Ilias", "Benno", "Timo",
];

const NACHNAMEN = [
  "Brandt", "Okoro", "Kilic", "Sandberg", "Vogler", "Reiter", "Amend",
  "Lindqvist", "Marek", "Petrov", "Haugen", "Bergmann", "Tulu", "Novak",
  "Falk", "Serrano", "Wirtz-Hansen", "Dahlmann", "Keller", "Ibe",
  "Rosenthal", "Mensah", "Stauffer", "Lorenz",
];

/** Zwei Torhüter, drei Verteidiger, zwei Mittelfeld, zwei Sturm je Verein. */
const KADER_AUFBAU: Position[] = ["TW", "TW", "ABW", "ABW", "ABW", "MIT", "MIT", "MIT", "ANG", "ANG"];

const SPIELTAGE_RUECKWAERTS = 4; // abgeschlossene Spieltage
const SPIELTAGE_VORWAERTS = 2; // kommende Spieltage
const ERSTER_SPIELTAG = 24;

/**
 * Erzeugt einen vollständigen Bestand rund um den jetzigen Zeitpunkt:
 * vergangene Spieltage sind ausgewertet, der laufende Spieltag hat teils
 * abgelaufene, teils offene Tippfristen, die kommenden sind offen.
 */
function bestandErzeugen(jetzt: Date): Datenbestand {
  const w = zufall(20260322);

  const wettbewerb = {
    id: "demo-liga",
    name: "Demo-Bundesliga",
    kuerzel: "DBL",
    land: "Deutschland",
    saison: "2025/26",
  };

  const mannschaften: Mannschaft[] = VEREINE.map(([name, kuerzel], i) => ({
    id: `m${i + 1}`,
    wettbewerbId: wettbewerb.id,
    name,
    kuerzel,
  }));

  const spieler: Spieler[] = [];
  mannschaften.forEach((m, mi) => {
    KADER_AUFBAU.forEach((position, pi) => {
      const vorname = VORNAMEN[(mi * 7 + pi * 3) % VORNAMEN.length];
      const nachname = NACHNAMEN[(mi * 5 + pi * 11) % NACHNAMEN.length];
      spieler.push({
        id: `s${mi + 1}-${pi + 1}`,
        mannschaftId: m.id,
        name: `${vorname} ${nachname}`,
        position,
        nummer: pi === 0 ? 1 : pi === 1 ? 12 : pi * 3 + 1,
      });
    });
  });

  /** Spielstärke: gibt den Demo-Ergebnissen eine plausible Struktur. */
  const staerke = new Map(mannschaften.map((m, i) => [m.id, 1.45 - i * 0.045]));

  const spiele: Spiel[] = [];
  const ereignisse: Ereignis[] = [];

  // Der laufende Spieltag beginnt am letzten Samstag 15:30 Uhr Ortszeit.
  const samstag = new Date(jetzt);
  const tageSeitSamstag = (samstag.getUTCDay() + 1) % 7;
  samstag.setUTCDate(samstag.getUTCDate() - tageSeitSamstag);
  samstag.setUTCHours(13, 30, 0, 0); // 15:30 MESZ

  const anzahl = SPIELTAGE_RUECKWAERTS + 1 + SPIELTAGE_VORWAERTS;
  for (let t = 0; t < anzahl; t++) {
    const spieltag = ERSTER_SPIELTAG + t;
    const versatz = (t - SPIELTAGE_RUECKWAERTS) * 7;
    const paare = paarungen(spieltag, mannschaften.length);

    paare.forEach(([heimIndex, gastIndex], pi) => {
      const anstoss = new Date(samstag);
      anstoss.setUTCDate(anstoss.getUTCDate() + versatz);
      // Freitagabend, Samstag früh/spät, Sonntag - wie ein echter Spieltag.
      const plan = [-25.5, 0, 0, 0, 0, 3, 24.5, 27, 30];
      anstoss.setUTCMinutes(anstoss.getUTCMinutes() + plan[pi % plan.length] * 60);

      const heim = mannschaften[heimIndex];
      const gast = mannschaften[gastIndex];
      const beendet = anstoss.getTime() + 115 * 60 * 1000 < jetzt.getTime();
      const laeuft = !beendet && anstoss.getTime() <= jetzt.getTime();

      const spiel: Spiel = {
        id: `sp${spieltag}-${pi + 1}`,
        wettbewerbId: wettbewerb.id,
        spieltag,
        anstoss: anstoss.toISOString(),
        heimId: heim.id,
        gastId: gast.id,
        status: beendet ? "beendet" : laeuft ? "laeuft" : "geplant",
        toreHeim: null,
        toreGast: null,
      };

      if (beendet) {
        const heimStaerke = (staerke.get(heim.id) ?? 1) * 1.15;
        const gastStaerke = staerke.get(gast.id) ?? 1;
        spiel.toreHeim = tore(w, heimStaerke);
        spiel.toreGast = tore(w, gastStaerke);
        ereignisse.push(...toreVerteilen(w, spiel, spieler));
      }

      spiele.push(spiel);
    });
  }

  return { wettbewerbe: [wettbewerb], mannschaften, spieler, spiele, ereignisse };
}

/** Zieht eine Trefferzahl aus einer Poisson-Verteilung (Knuth). */
function tore(w: () => number, erwartung: number): number {
  const grenze = Math.exp(-erwartung);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= w();
  } while (p > grenze && k < 12);
  return k - 1;
}

/** Verteilt die gefallenen Tore auf plausible Schützen und Vorbereiter. */
function toreVerteilen(w: () => number, spiel: Spiel, alle: Spieler[]): Ereignis[] {
  const raus: Ereignis[] = [];
  const treffer: Array<[string, number]> = [
    [spiel.heimId, spiel.toreHeim ?? 0],
    [spiel.gastId, spiel.toreGast ?? 0],
  ];

  for (const [mannschaftId, anzahl] of treffer) {
    const kader = alle.filter((s) => s.mannschaftId === mannschaftId && s.position !== "TW");
    // Stürmer treffen häufiger als Verteidiger.
    const gewicht = (p: Position) => (p === "ANG" ? 5 : p === "MIT" ? 3 : 1);
    for (let i = 0; i < anzahl; i++) {
      const schuetze = ziehen(w, kader, gewicht);
      const minute = 1 + Math.floor(w() * 90);
      raus.push({ spielId: spiel.id, spielerId: schuetze.id, art: "tor", minute });
      if (w() < 0.65) {
        const vorbereiter = ziehen(
          w,
          kader.filter((s) => s.id !== schuetze.id),
          (p) => (p === "MIT" ? 5 : p === "ANG" ? 3 : 2),
        );
        raus.push({ spielId: spiel.id, spielerId: vorbereiter.id, art: "vorlage", minute });
      }
    }
  }
  return raus;
}

function ziehen(w: () => number, kader: Spieler[], gewicht: (p: Position) => number): Spieler {
  const summe = kader.reduce((s, k) => s + gewicht(k.position), 0);
  let ziel = w() * summe;
  for (const k of kader) {
    ziel -= gewicht(k.position);
    if (ziel <= 0) return k;
  }
  return kader[kader.length - 1];
}

/** Rundenturnier nach dem Berger-System: jede Mannschaft spielt genau einmal. */
function paarungen(runde: number, anzahl: number): Array<[number, number]> {
  const feld = [...Array(anzahl).keys()];
  const dreh = feld.slice(1);
  const versatz = runde % dreh.length;
  const gedreht = [...dreh.slice(versatz), ...dreh.slice(0, versatz)];
  const reihe = [feld[0], ...gedreht];

  const paare: Array<[number, number]> = [];
  for (let i = 0; i < anzahl / 2; i++) {
    const a = reihe[i];
    const b = reihe[anzahl - 1 - i];
    paare.push(runde % 2 === 0 ? [a, b] : [b, a]);
  }
  return paare;
}

export const demoQuelle: Datenquelle = {
  kennung: "demo",
  name: "Demo-Daten (keine Live-Daten)",
  istDemo: true,
  lizenzhinweis:
    "Ausgedachte Spielpläne, Ergebnisse und Spielernamen. Vereinsnamen sind reiner Text, " +
    "es werden keine Wappen, Logos oder Fotos verwendet. Vor einer Veröffentlichung sind " +
    "Nutzungsrechte für Wettbewerbs- und Vereinsnamen, Spielerdaten sowie Live- und " +
    "Statistikdaten gesondert zu klären.",
  async laden() {
    return bestandErzeugen(new Date());
  },
};
