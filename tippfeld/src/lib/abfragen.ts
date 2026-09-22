import { db } from "./db";
import type { Position, SpielStatus } from "./datenquelle/typen";
import {
  bewerteSpielerTipps,
  bewerteTipp,
  punktesystemLesen,
  STANDARD_PUNKTESYSTEM,
  type Punktesystem,
  type SpielerBewertung,
  type TippBewertung,
} from "./punkte";
import {
  einschaetzen,
  LEERE_BILANZ,
  type Bilanz,
  type Direktduelle,
  type FormZeichen,
  type KiEinschaetzung,
  type LigaMittel,
  type MannschaftsForm,
} from "./ki";

/*
 * Alle Lesezugriffe der App. Punkte werden hier immer neu gerechnet und nie
 * gespeichert - dadurch kann kein Punktestand von einem falschen Zwischenwert
 * abhängen, und eine Ergebniskorrektur im Adminbereich wirkt sofort überall.
 */

export interface MannschaftKurz {
  id: string;
  name: string;
  kuerzel: string;
}

export interface SpielAnsicht {
  id: string;
  spieltag: number;
  anstoss: string;
  status: SpielStatus;
  toreHeim: number | null;
  toreGast: number | null;
  heim: MannschaftKurz;
  gast: MannschaftKurz;
  wettbewerb: { id: string; name: string; kuerzel: string };
  /** true, solange der Anpfiff in der Zukunft liegt. */
  tippbar: boolean;
  tipp: { toreHeim: number; toreGast: number } | null;
  bewertung: TippBewertung | null;
  spielerTipps: number;
}

interface SpielZeile {
  id: string;
  spieltag: number;
  anstoss: string;
  status: SpielStatus;
  tore_heim: number | null;
  tore_gast: number | null;
  heim_id: string;
  heim_name: string;
  heim_kuerzel: string;
  gast_id: string;
  gast_name: string;
  gast_kuerzel: string;
  w_id: string;
  w_name: string;
  w_kuerzel: string;
  tipp_heim: number | null;
  tipp_gast: number | null;
  spieler_tipps: number;
}

const SPIEL_AUSWAHL = `
  SELECT sp.id, sp.spieltag, sp.anstoss, sp.status, sp.tore_heim, sp.tore_gast,
         h.id AS heim_id, h.name AS heim_name, h.kuerzel AS heim_kuerzel,
         g.id AS gast_id, g.name AS gast_name, g.kuerzel AS gast_kuerzel,
         w.id AS w_id, w.name AS w_name, w.kuerzel AS w_kuerzel,
         t.tore_heim AS tipp_heim, t.tore_gast AS tipp_gast,
         (SELECT COUNT(*) FROM spieler_tipp st WHERE st.spiel_id = sp.id AND st.nutzer_id = @nutzer)
           AS spieler_tipps
    FROM spiel sp
    JOIN mannschaft h ON h.id = sp.heim_id
    JOIN mannschaft g ON g.id = sp.gast_id
    JOIN wettbewerb w ON w.id = sp.wettbewerb_id
    LEFT JOIN tipp t ON t.spiel_id = sp.id AND t.nutzer_id = @nutzer
`;

function zuAnsicht(z: SpielZeile, system: Punktesystem, jetzt: number): SpielAnsicht {
  const tipp = z.tipp_heim === null || z.tipp_gast === null
    ? null
    : { toreHeim: z.tipp_heim, toreGast: z.tipp_gast };
  const fertig = z.status === "beendet" && z.tore_heim !== null && z.tore_gast !== null;
  return {
    id: z.id,
    spieltag: z.spieltag,
    anstoss: z.anstoss,
    status: z.status,
    toreHeim: z.tore_heim,
    toreGast: z.tore_gast,
    heim: { id: z.heim_id, name: z.heim_name, kuerzel: z.heim_kuerzel },
    gast: { id: z.gast_id, name: z.gast_name, kuerzel: z.gast_kuerzel },
    wettbewerb: { id: z.w_id, name: z.w_name, kuerzel: z.w_kuerzel },
    tippbar: new Date(z.anstoss).getTime() > jetzt,
    tipp,
    bewertung:
      fertig && tipp
        ? bewerteTipp(tipp, { toreHeim: z.tore_heim!, toreGast: z.tore_gast! }, system)
        : null,
    spielerTipps: z.spieler_tipps,
  };
}

export function spieltagSpiele(spieltag: number, nutzerId: number | null): SpielAnsicht[] {
  const jetzt = Date.now();
  const zeilen = db()
    .prepare(`${SPIEL_AUSWAHL} WHERE sp.spieltag = @spieltag ORDER BY sp.anstoss, h.name`)
    .all({ spieltag, nutzer: nutzerId ?? -1 }) as SpielZeile[];
  return zeilen.map((z) => zuAnsicht(z, STANDARD_PUNKTESYSTEM, jetzt));
}

export function naechsteSpiele(nutzerId: number | null, anzahl = 5): SpielAnsicht[] {
  const jetzt = Date.now();
  const zeilen = db()
    .prepare(
      `${SPIEL_AUSWAHL} WHERE sp.anstoss > @jetzt AND sp.status = 'geplant'
       ORDER BY sp.anstoss LIMIT @anzahl`,
    )
    .all({ jetzt: new Date(jetzt).toISOString(), anzahl, nutzer: nutzerId ?? -1 }) as SpielZeile[];
  return zeilen.map((z) => zuAnsicht(z, STANDARD_PUNKTESYSTEM, jetzt));
}

export function offeneTipps(nutzerId: number, anzahl = 20): SpielAnsicht[] {
  const jetzt = Date.now();
  const zeilen = db()
    .prepare(
      `${SPIEL_AUSWAHL} WHERE sp.anstoss > @jetzt AND t.id IS NULL
       ORDER BY sp.anstoss LIMIT @anzahl`,
    )
    .all({ jetzt: new Date(jetzt).toISOString(), anzahl, nutzer: nutzerId }) as SpielZeile[];
  return zeilen.map((z) => zuAnsicht(z, STANDARD_PUNKTESYSTEM, jetzt));
}

export interface SpieltagInfo {
  spieltag: number;
  spiele: number;
  beendet: number;
  offen: number;
  erster: string;
  letzter: string;
}

export function spieltage(): SpieltagInfo[] {
  return db()
    .prepare(
      `SELECT spieltag,
              COUNT(*) AS spiele,
              SUM(CASE WHEN status = 'beendet' THEN 1 ELSE 0 END) AS beendet,
              SUM(CASE WHEN status = 'geplant' THEN 1 ELSE 0 END) AS offen,
              MIN(anstoss) AS erster, MAX(anstoss) AS letzter
         FROM spiel GROUP BY spieltag ORDER BY spieltag`,
    )
    .all() as SpieltagInfo[];
}

/** Der Spieltag, auf den die App standardmäßig zeigt: der mit dem nächsten Anpfiff. */
export function aktuellerSpieltag(): number {
  const jetzt = new Date().toISOString();
  const kommend = db()
    .prepare("SELECT spieltag FROM spiel WHERE anstoss > ? ORDER BY anstoss LIMIT 1")
    .get(jetzt) as { spieltag: number } | undefined;
  if (kommend) return kommend.spieltag;
  const letzter = db().prepare("SELECT MAX(spieltag) AS s FROM spiel").get() as { s: number | null };
  return letzter.s ?? 1;
}

/* --- Mannschaftsstatistik ---------------------------------------------- */

interface ErgebnisZeile {
  heim_id: string;
  gast_id: string;
  tore_heim: number;
  tore_gast: number;
  anstoss: string;
}

function beendeteSpiele(wettbewerbId: string): ErgebnisZeile[] {
  return db()
    .prepare(
      `SELECT heim_id, gast_id, tore_heim, tore_gast, anstoss FROM spiel
        WHERE wettbewerb_id = ? AND status = 'beendet'
          AND tore_heim IS NOT NULL AND tore_gast IS NOT NULL
        ORDER BY anstoss`,
    )
    .all(wettbewerbId) as ErgebnisZeile[];
}

function bilanzAddieren(bilanz: Bilanz, fuer: number, gegen: number): Bilanz {
  return {
    spiele: bilanz.spiele + 1,
    siege: bilanz.siege + (fuer > gegen ? 1 : 0),
    remis: bilanz.remis + (fuer === gegen ? 1 : 0),
    niederlagen: bilanz.niederlagen + (fuer < gegen ? 1 : 0),
    toreFuer: bilanz.toreFuer + fuer,
    toreGegen: bilanz.toreGegen + gegen,
  };
}

export function mannschaftsForm(mannschaftId: string, wettbewerbId: string): MannschaftsForm {
  const stamm = db()
    .prepare("SELECT id, name, kuerzel FROM mannschaft WHERE id = ?")
    .get(mannschaftId) as MannschaftKurz;

  let gesamt = { ...LEERE_BILANZ };
  let heim = { ...LEERE_BILANZ };
  let auswaerts = { ...LEERE_BILANZ };
  const verlauf: FormZeichen[] = [];

  for (const s of beendeteSpiele(wettbewerbId)) {
    const istHeim = s.heim_id === mannschaftId;
    const istGast = s.gast_id === mannschaftId;
    if (!istHeim && !istGast) continue;

    const fuer = istHeim ? s.tore_heim : s.tore_gast;
    const gegen = istHeim ? s.tore_gast : s.tore_heim;
    gesamt = bilanzAddieren(gesamt, fuer, gegen);
    if (istHeim) heim = bilanzAddieren(heim, fuer, gegen);
    else auswaerts = bilanzAddieren(auswaerts, fuer, gegen);
    verlauf.push(fuer > gegen ? "S" : fuer === gegen ? "U" : "N");
  }

  return {
    id: stamm.id,
    name: stamm.name,
    kuerzel: stamm.kuerzel,
    gesamt,
    heim,
    auswaerts,
    letzte: verlauf.slice(-5).reverse(),
  };
}

export function ligaMittel(wettbewerbId: string): LigaMittel {
  const spiele = beendeteSpiele(wettbewerbId);
  if (spiele.length === 0) {
    return { toreHeimProSpiel: 1.5, toreGastProSpiel: 1.25, ausgewerteteSpiele: 0 };
  }
  const heimTore = spiele.reduce((s, z) => s + z.tore_heim, 0);
  const gastTore = spiele.reduce((s, z) => s + z.tore_gast, 0);
  return {
    toreHeimProSpiel: heimTore / spiele.length,
    toreGastProSpiel: gastTore / spiele.length,
    ausgewerteteSpiele: spiele.length,
  };
}

export function direktduelle(heimId: string, gastId: string): Direktduelle {
  const zeilen = db()
    .prepare(
      `SELECT heim_id, tore_heim, tore_gast FROM spiel
        WHERE status = 'beendet' AND tore_heim IS NOT NULL
          AND ((heim_id = @a AND gast_id = @b) OR (heim_id = @b AND gast_id = @a))`,
    )
    .all({ a: heimId, b: gastId }) as Array<{ heim_id: string; tore_heim: number; tore_gast: number }>;

  const bilanz: Direktduelle = { spiele: zeilen.length, heimSiege: 0, remis: 0, gastSiege: 0 };
  for (const z of zeilen) {
    const toreA = z.heim_id === heimId ? z.tore_heim : z.tore_gast;
    const toreB = z.heim_id === heimId ? z.tore_gast : z.tore_heim;
    if (toreA > toreB) bilanz.heimSiege++;
    else if (toreA < toreB) bilanz.gastSiege++;
    else bilanz.remis++;
  }
  return bilanz;
}

/* --- Spieldetail --------------------------------------------------------- */

export interface KaderSpieler {
  id: string;
  name: string;
  position: Position;
  nummer: number;
  mannschaftId: string;
  mannschaftName: string;
  tore: number;
  vorlagen: number;
}

export interface SpielDetail {
  spiel: SpielAnsicht;
  heimForm: MannschaftsForm;
  gastForm: MannschaftsForm;
  ki: KiEinschaetzung;
  kader: KaderSpieler[];
  spielerTipps: Record<Position, string | null>;
  spielerBewertung: SpielerBewertung[];
  torschuetzen: Array<{ name: string; mannschaftId: string; minute: number; art: "tor" | "vorlage" }>;
}

export function spielDetail(spielId: string, nutzerId: number | null): SpielDetail | null {
  const jetzt = Date.now();
  const zeile = db()
    .prepare(`${SPIEL_AUSWAHL} WHERE sp.id = @id`)
    .get({ id: spielId, nutzer: nutzerId ?? -1 }) as SpielZeile | undefined;
  if (!zeile) return null;

  const spiel = zuAnsicht(zeile, STANDARD_PUNKTESYSTEM, jetzt);
  const heimForm = mannschaftsForm(spiel.heim.id, spiel.wettbewerb.id);
  const gastForm = mannschaftsForm(spiel.gast.id, spiel.wettbewerb.id);
  const ki = einschaetzen(
    heimForm,
    gastForm,
    ligaMittel(spiel.wettbewerb.id),
    direktduelle(spiel.heim.id, spiel.gast.id),
  );

  const kader = db()
    .prepare(
      `SELECT s.id, s.name, s.position, s.nummer, s.mannschaft_id AS mannschaftId,
              m.name AS mannschaftName,
              (SELECT COUNT(*) FROM ereignis e JOIN spiel x ON x.id = e.spiel_id
                WHERE e.spieler_id = s.id AND e.art = 'tor') AS tore,
              (SELECT COUNT(*) FROM ereignis e JOIN spiel x ON x.id = e.spiel_id
                WHERE e.spieler_id = s.id AND e.art = 'vorlage') AS vorlagen
         FROM spieler s JOIN mannschaft m ON m.id = s.mannschaft_id
        WHERE s.mannschaft_id IN (@heim, @gast)
        ORDER BY CASE s.position WHEN 'TW' THEN 1 WHEN 'ABW' THEN 2 WHEN 'MIT' THEN 3 ELSE 4 END,
                 s.nummer`,
    )
    .all({ heim: spiel.heim.id, gast: spiel.gast.id }) as KaderSpieler[];

  const gewaehlt = nutzerId
    ? (db()
        .prepare("SELECT position, spieler_id FROM spieler_tipp WHERE nutzer_id = ? AND spiel_id = ?")
        .all(nutzerId, spielId) as Array<{ position: Position; spieler_id: string }>)
    : [];
  const spielerTipps: Record<Position, string | null> = { TW: null, ABW: null, MIT: null, ANG: null };
  for (const g of gewaehlt) spielerTipps[g.position] = g.spieler_id;

  const ereignisse = db()
    .prepare(
      `SELECT e.spieler_id, e.art, e.minute, s.name, s.mannschaft_id
         FROM ereignis e JOIN spieler s ON s.id = e.spieler_id
        WHERE e.spiel_id = ? ORDER BY e.minute`,
    )
    .all(spielId) as Array<{
    spieler_id: string;
    art: "tor" | "vorlage";
    minute: number;
    name: string;
    mannschaft_id: string;
  }>;

  let spielerBewertung: SpielerBewertung[] = [];
  if (spiel.status === "beendet" && spiel.toreHeim !== null && spiel.toreGast !== null) {
    const nachschlag = new Map(kader.map((k) => [k.id, k]));
    const eingaben = gewaehlt
      .map((g) => {
        const k = nachschlag.get(g.spieler_id);
        return k
          ? {
              position: g.position,
              spielerId: k.id,
              spielerName: k.name,
              mannschaftId: k.mannschaftId,
            }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    spielerBewertung = bewerteSpielerTipps(
      eingaben,
      ereignisse.map((e) => ({ spielerId: e.spieler_id, art: e.art })),
      {
        heimId: spiel.heim.id,
        gastId: spiel.gast.id,
        toreHeim: spiel.toreHeim,
        toreGast: spiel.toreGast,
      },
    );
  }

  return {
    spiel,
    heimForm,
    gastForm,
    ki,
    kader,
    spielerTipps,
    spielerBewertung,
    torschuetzen: ereignisse.map((e) => ({
      name: e.name,
      mannschaftId: e.mannschaft_id,
      minute: e.minute,
      art: e.art,
    })),
  };
}

/* --- Punkte eines Nutzers ------------------------------------------------ */

export interface NutzerBilanz {
  punkte: number;
  tipps: number;
  exakte: number;
  differenzen: number;
  tendenzen: number;
  daneben: number;
  spielerPunkte: number;
  form: FormZeichen[];
}

interface TippZeile {
  spiel_id: string;
  spieltag: number;
  tore_heim: number;
  tore_gast: number;
  e_heim: number;
  e_gast: number;
  heim_id: string;
  gast_id: string;
  anstoss: string;
}

export function nutzerBilanz(
  nutzerId: number,
  system: Punktesystem = STANDARD_PUNKTESYSTEM,
  optionen: { wettbewerbId?: string; spieltag?: number } = {},
): NutzerBilanz {
  const bedingungen = ["sp.status = 'beendet'", "sp.tore_heim IS NOT NULL"];
  const werte: Record<string, unknown> = { nutzer: nutzerId };
  if (optionen.wettbewerbId) {
    bedingungen.push("sp.wettbewerb_id = @wettbewerb");
    werte.wettbewerb = optionen.wettbewerbId;
  }
  if (optionen.spieltag !== undefined) {
    bedingungen.push("sp.spieltag = @spieltag");
    werte.spieltag = optionen.spieltag;
  }

  const zeilen = db()
    .prepare(
      `SELECT t.spiel_id, sp.spieltag, t.tore_heim, t.tore_gast,
              sp.tore_heim AS e_heim, sp.tore_gast AS e_gast,
              sp.heim_id, sp.gast_id, sp.anstoss
         FROM tipp t JOIN spiel sp ON sp.id = t.spiel_id
        WHERE t.nutzer_id = @nutzer AND ${bedingungen.join(" AND ")}
        ORDER BY sp.anstoss`,
    )
    .all(werte) as TippZeile[];

  const bilanz: NutzerBilanz = {
    punkte: 0,
    tipps: zeilen.length,
    exakte: 0,
    differenzen: 0,
    tendenzen: 0,
    daneben: 0,
    spielerPunkte: 0,
    form: [],
  };

  for (const z of zeilen) {
    const b = bewerteTipp(
      { toreHeim: z.tore_heim, toreGast: z.tore_gast },
      { toreHeim: z.e_heim, toreGast: z.e_gast },
      system,
    );
    bilanz.punkte += b.punkte;
    if (b.exakt) bilanz.exakte++;
    else if (b.differenzRichtig) bilanz.differenzen++;
    else if (b.tendenzRichtig) bilanz.tendenzen++;
    else bilanz.daneben++;
    bilanz.form.push(b.exakt ? "S" : b.tendenzRichtig ? "U" : "N");
  }

  // Spieler-Tipps derselben Spiele
  const spielIds = zeilen.map((z) => z.spiel_id);
  if (spielIds.length > 0) {
    const platzhalter = spielIds.map(() => "?").join(",");
    const tipps = db()
      .prepare(
        `SELECT st.spiel_id, st.position, st.spieler_id, s.mannschaft_id, s.name,
                sp.heim_id, sp.gast_id, sp.tore_heim, sp.tore_gast
           FROM spieler_tipp st
           JOIN spieler s ON s.id = st.spieler_id
           JOIN spiel sp ON sp.id = st.spiel_id
          WHERE st.nutzer_id = ? AND st.spiel_id IN (${platzhalter})`,
      )
      .all(nutzerId, ...spielIds) as Array<{
      spiel_id: string;
      position: Position;
      spieler_id: string;
      mannschaft_id: string;
      name: string;
      heim_id: string;
      gast_id: string;
      tore_heim: number;
      tore_gast: number;
    }>;

    const nachSpiel = new Map<string, typeof tipps>();
    for (const t of tipps) {
      const liste = nachSpiel.get(t.spiel_id) ?? [];
      liste.push(t);
      nachSpiel.set(t.spiel_id, liste);
    }

    for (const [spielId, liste] of nachSpiel) {
      const ereignisse = db()
        .prepare("SELECT spieler_id, art FROM ereignis WHERE spiel_id = ?")
        .all(spielId) as Array<{ spieler_id: string; art: "tor" | "vorlage" }>;
      const bewertungen = bewerteSpielerTipps(
        liste.map((t) => ({
          position: t.position,
          spielerId: t.spieler_id,
          spielerName: t.name,
          mannschaftId: t.mannschaft_id,
        })),
        ereignisse.map((e) => ({ spielerId: e.spieler_id, art: e.art })),
        {
          heimId: liste[0].heim_id,
          gastId: liste[0].gast_id,
          toreHeim: liste[0].tore_heim,
          toreGast: liste[0].tore_gast,
        },
        system,
      );
      const summe = bewertungen.reduce((s, b) => s + b.punkte, 0);
      bilanz.spielerPunkte += summe;
      bilanz.punkte += summe;
    }
  }

  bilanz.form = bilanz.form.slice(-5).reverse();
  return bilanz;
}

/* --- Tipp-Historie ------------------------------------------------------- */

export interface HistorieEintrag extends SpielAnsicht {
  spielerPunkte: number;
}

export function tippHistorie(nutzerId: number, anzahl = 50): HistorieEintrag[] {
  const jetzt = Date.now();
  const zeilen = db()
    .prepare(
      `${SPIEL_AUSWAHL} WHERE t.id IS NOT NULL ORDER BY sp.anstoss DESC LIMIT @anzahl`,
    )
    .all({ nutzer: nutzerId, anzahl }) as SpielZeile[];

  return zeilen.map((z) => {
    const ansicht = zuAnsicht(z, STANDARD_PUNKTESYSTEM, jetzt);
    let spielerPunkte = 0;
    if (ansicht.status === "beendet" && ansicht.toreHeim !== null) {
      const detail = spielDetail(z.id, nutzerId);
      spielerPunkte = detail?.spielerBewertung.reduce((s, b) => s + b.punkte, 0) ?? 0;
    }
    return { ...ansicht, spielerPunkte };
  });
}

/* --- Ligen ---------------------------------------------------------------- */

export interface LigaZeile {
  id: number;
  name: string;
  beschreibung: string;
  oeffentlich: number;
  code: string;
  passcode: string | null;
  zeichen: string;
  punktesystem: string;
  wettbewerb_id: string;
  sprache: string;
  gruender_id: number;
  erstellt: string;
  gesperrt: number;
  sperrgrund: string | null;
}

export interface LigaAnsicht {
  id: number;
  name: string;
  beschreibung: string;
  oeffentlich: boolean;
  code: string;
  hatPasscode: boolean;
  zeichen: string;
  punktesystem: Punktesystem;
  wettbewerbId: string;
  wettbewerbName: string;
  sprache: string;
  gruenderId: number;
  gruenderName: string;
  erstellt: string;
  gesperrt: boolean;
  sperrgrund: string | null;
  mitglieder: number;
}

const LIGA_AUSWAHL = `
  SELECT l.*, n.name AS gruender_name, w.name AS wettbewerb_name,
         (SELECT COUNT(*) FROM mitglied m WHERE m.liga_id = l.id) AS mitglieder
    FROM liga l
    JOIN nutzer n ON n.id = l.gruender_id
    JOIN wettbewerb w ON w.id = l.wettbewerb_id
`;

type LigaRoh = LigaZeile & { gruender_name: string; wettbewerb_name: string; mitglieder: number };

function zuLiga(z: LigaRoh): LigaAnsicht {
  return {
    id: z.id,
    name: z.name,
    beschreibung: z.beschreibung,
    oeffentlich: z.oeffentlich === 1,
    code: z.code,
    hatPasscode: Boolean(z.passcode),
    zeichen: z.zeichen,
    punktesystem: punktesystemLesen(z.punktesystem),
    wettbewerbId: z.wettbewerb_id,
    wettbewerbName: z.wettbewerb_name,
    sprache: z.sprache,
    gruenderId: z.gruender_id,
    gruenderName: z.gruender_name,
    erstellt: z.erstellt,
    gesperrt: z.gesperrt === 1,
    sperrgrund: z.sperrgrund,
    mitglieder: z.mitglieder,
  };
}

export function ligaLaden(id: number): LigaAnsicht | null {
  const z = db().prepare(`${LIGA_AUSWAHL} WHERE l.id = ?`).get(id) as LigaRoh | undefined;
  return z ? zuLiga(z) : null;
}

export function ligaMitCode(code: string): LigaAnsicht | null {
  const z = db()
    .prepare(`${LIGA_AUSWAHL} WHERE UPPER(l.code) = UPPER(?)`)
    .get(code.trim()) as LigaRoh | undefined;
  return z ? zuLiga(z) : null;
}

export function istMitglied(ligaId: number, nutzerId: number): boolean {
  const z = db()
    .prepare("SELECT 1 AS da FROM mitglied WHERE liga_id = ? AND nutzer_id = ?")
    .get(ligaId, nutzerId);
  return Boolean(z);
}

export interface LigaMitPlatz extends LigaAnsicht {
  platz: number;
  punkte: number;
}

export function ligenVonNutzer(nutzerId: number): LigaMitPlatz[] {
  const zeilen = db()
    .prepare(
      `${LIGA_AUSWAHL} JOIN mitglied mit ON mit.liga_id = l.id AND mit.nutzer_id = ?
        ORDER BY l.name`,
    )
    .all(nutzerId) as LigaRoh[];

  return zeilen.map((z) => {
    const liga = zuLiga(z);
    const tabelle = rangliste(liga.id);
    const eigen = tabelle.find((r) => r.nutzerId === nutzerId);
    return { ...liga, platz: eigen?.platz ?? tabelle.length + 1, punkte: eigen?.punkte ?? 0 };
  });
}

export interface RanglistenEintrag {
  platz: number;
  nutzerId: number;
  name: string;
  zeichen: string;
  punkte: number;
  tipps: number;
  /** Tipps mit richtiger Tendenz, also alle Tipps, die Punkte gebracht haben. */
  richtige: number;
  exakte: number;
  tendenzen: number;
  form: FormZeichen[];
}

/** Rangliste einer Liga. Ohne Spieltag über die ganze Saison. */
export function rangliste(ligaId: number, spieltag?: number): RanglistenEintrag[] {
  const liga = ligaLaden(ligaId);
  if (!liga) return [];

  const mitglieder = db()
    .prepare(
      `SELECT n.id, n.name, n.zeichen FROM mitglied m JOIN nutzer n ON n.id = m.nutzer_id
        WHERE m.liga_id = ?`,
    )
    .all(ligaId) as Array<{ id: number; name: string; zeichen: string }>;

  const eintraege = mitglieder.map((m) => {
    const b = nutzerBilanz(m.id, liga.punktesystem, {
      wettbewerbId: liga.wettbewerbId,
      spieltag,
    });
    return {
      platz: 0,
      nutzerId: m.id,
      name: m.name,
      zeichen: m.zeichen,
      punkte: b.punkte,
      tipps: b.tipps,
      richtige: b.exakte + b.differenzen + b.tendenzen,
      exakte: b.exakte,
      tendenzen: b.tendenzen,
      form: b.form,
    };
  });

  eintraege.sort(
    (a, b) => b.punkte - a.punkte || b.exakte - a.exakte || a.name.localeCompare(b.name, "de"),
  );

  let letztePunkte: number | null = null;
  let letzterPlatz = 0;
  eintraege.forEach((e, i) => {
    if (e.punkte === letztePunkte) {
      e.platz = letzterPlatz;
    } else {
      e.platz = i + 1;
      letzterPlatz = e.platz;
      letztePunkte = e.punkte;
    }
  });

  return eintraege;
}

export type Sortierung = "beliebt" | "neu" | "gross";

export function oeffentlicheLigen(filter: {
  suche?: string;
  sortierung?: Sortierung;
  wettbewerbId?: string;
  sprache?: string;
}): LigaAnsicht[] {
  const bedingungen = ["l.oeffentlich = 1", "l.gesperrt = 0"];
  const werte: Record<string, unknown> = {};
  if (filter.suche?.trim()) {
    bedingungen.push("(l.name LIKE @suche OR l.beschreibung LIKE @suche)");
    werte.suche = `%${filter.suche.trim()}%`;
  }
  if (filter.wettbewerbId) {
    bedingungen.push("l.wettbewerb_id = @wettbewerb");
    werte.wettbewerb = filter.wettbewerbId;
  }
  if (filter.sprache) {
    bedingungen.push("l.sprache = @sprache");
    werte.sprache = filter.sprache;
  }

  const sortierung =
    filter.sortierung === "neu"
      ? "l.erstellt DESC"
      : filter.sortierung === "gross"
        ? "mitglieder DESC, l.name"
        : "mitglieder DESC, l.erstellt DESC";

  const zeilen = db()
    .prepare(`${LIGA_AUSWAHL} WHERE ${bedingungen.join(" AND ")} ORDER BY ${sortierung} LIMIT 60`)
    .all(werte) as LigaRoh[];
  return zeilen.map(zuLiga);
}

export function wettbewerbe(): Array<{ id: string; name: string; kuerzel: string; saison: string }> {
  return db()
    .prepare("SELECT id, name, kuerzel, saison FROM wettbewerb ORDER BY name")
    .all() as Array<{ id: string; name: string; kuerzel: string; saison: string }>;
}

/* --- Kurzfassung der Einschätzung für Listen ------------------------------- */

export interface KiKurz {
  spielId: string;
  heimProzent: number;
  remisProzent: number;
  gastProzent: number;
  favorit: "heim" | "remis" | "gast";
  verlaesslichkeit: KiEinschaetzung["verlaesslichkeit"];
}

/**
 * Berechnet die Einschätzung für mehrere Spiele auf einmal. Formen und
 * Ligamittel werden dabei nur einmal je Mannschaft geholt.
 */
export function kiFuerSpiele(spiele: SpielAnsicht[]): Map<string, KiKurz> {
  const formen = new Map<string, MannschaftsForm>();
  const mittel = new Map<string, LigaMittel>();
  const raus = new Map<string, KiKurz>();

  const holeForm = (mannschaftId: string, wettbewerbId: string) => {
    const schluessel = `${wettbewerbId}/${mannschaftId}`;
    let form = formen.get(schluessel);
    if (!form) {
      form = mannschaftsForm(mannschaftId, wettbewerbId);
      formen.set(schluessel, form);
    }
    return form;
  };

  for (const spiel of spiele) {
    let ligaWerte = mittel.get(spiel.wettbewerb.id);
    if (!ligaWerte) {
      ligaWerte = ligaMittel(spiel.wettbewerb.id);
      mittel.set(spiel.wettbewerb.id, ligaWerte);
    }
    const schaetzung = einschaetzen(
      holeForm(spiel.heim.id, spiel.wettbewerb.id),
      holeForm(spiel.gast.id, spiel.wettbewerb.id),
      ligaWerte,
      direktduelle(spiel.heim.id, spiel.gast.id),
    );
    const groesster = Math.max(
      schaetzung.heimProzent,
      schaetzung.remisProzent,
      schaetzung.gastProzent,
    );
    raus.set(spiel.id, {
      spielId: spiel.id,
      heimProzent: schaetzung.heimProzent,
      remisProzent: schaetzung.remisProzent,
      gastProzent: schaetzung.gastProzent,
      favorit:
        groesster === schaetzung.heimProzent
          ? "heim"
          : groesster === schaetzung.gastProzent
            ? "gast"
            : "remis",
      verlaesslichkeit: schaetzung.verlaesslichkeit,
    });
  }

  return raus;
}
