import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { aktiveQuelle } from "./datenquelle";

/*
 * SQLite als Speicher. Alles, was ein Nutzer tippt, steht hier auf dem Server -
 * die App vertraut keinen Werten, die aus dem Browser kommen.
 */

// Standardmäßig ein Unterordner des Projekts. Über DATENBANK lässt sich ein
// anderer, absoluter Pfad setzen (etwa ein Datenträger beim Hosting).
const pfad = process.env.DATENBANK || join(process.cwd(), ".data", "tippfeld.db");

declare global {
  // eslint-disable-next-line no-var
  var __tippfeldDb: Database.Database | undefined;
}

function oeffnen(): Database.Database {
  mkdirSync(dirname(pfad), { recursive: true });
  const db = new Database(pfad);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  schema(db);
  return db;
}

export function db(): Database.Database {
  if (!globalThis.__tippfeldDb) globalThis.__tippfeldDb = oeffnen();
  return globalThis.__tippfeldDb;
}

function schema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nutzer (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      zeichen    TEXT NOT NULL DEFAULT 'zeichen-1',
      rolle      TEXT NOT NULL DEFAULT 'nutzer',
      sprache    TEXT NOT NULL DEFAULT 'de',
      thema      TEXT NOT NULL DEFAULT 'dunkel',
      hinweise   INTEGER NOT NULL DEFAULT 1,
      erstellt   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS einstellung (
      schluessel TEXT PRIMARY KEY,
      wert       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wettbewerb (
      id      TEXT PRIMARY KEY,
      name    TEXT NOT NULL,
      kuerzel TEXT NOT NULL,
      land    TEXT NOT NULL,
      saison  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mannschaft (
      id            TEXT PRIMARY KEY,
      wettbewerb_id TEXT NOT NULL REFERENCES wettbewerb(id),
      name          TEXT NOT NULL,
      kuerzel       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spieler (
      id            TEXT PRIMARY KEY,
      mannschaft_id TEXT NOT NULL REFERENCES mannschaft(id),
      name          TEXT NOT NULL,
      position      TEXT NOT NULL,
      nummer        INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spiel (
      id            TEXT PRIMARY KEY,
      wettbewerb_id TEXT NOT NULL REFERENCES wettbewerb(id),
      spieltag      INTEGER NOT NULL,
      anstoss       TEXT NOT NULL,
      heim_id       TEXT NOT NULL REFERENCES mannschaft(id),
      gast_id       TEXT NOT NULL REFERENCES mannschaft(id),
      status        TEXT NOT NULL,
      tore_heim     INTEGER,
      tore_gast     INTEGER,
      -- 1 bedeutet: von Hand im Adminbereich gesetzt, beim nächsten Abgleich
      -- mit der Datenquelle nicht überschreiben.
      korrigiert    INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS spiel_nach_spieltag ON spiel(spieltag, anstoss);

    CREATE TABLE IF NOT EXISTS ereignis (
      spiel_id   TEXT NOT NULL REFERENCES spiel(id),
      spieler_id TEXT NOT NULL REFERENCES spieler(id),
      art        TEXT NOT NULL,
      minute     INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS ereignis_nach_spiel ON ereignis(spiel_id);

    CREATE TABLE IF NOT EXISTS liga (
      id            INTEGER PRIMARY KEY,
      name          TEXT NOT NULL,
      beschreibung  TEXT NOT NULL DEFAULT '',
      oeffentlich   INTEGER NOT NULL DEFAULT 0,
      code          TEXT NOT NULL UNIQUE,
      passcode      TEXT,
      zeichen       TEXT NOT NULL DEFAULT 'zeichen-1',
      punktesystem  TEXT NOT NULL,
      wettbewerb_id TEXT NOT NULL REFERENCES wettbewerb(id),
      sprache       TEXT NOT NULL DEFAULT 'de',
      gruender_id   INTEGER NOT NULL REFERENCES nutzer(id),
      erstellt      TEXT NOT NULL,
      gesperrt      INTEGER NOT NULL DEFAULT 0,
      sperrgrund    TEXT
    );

    CREATE TABLE IF NOT EXISTS mitglied (
      liga_id    INTEGER NOT NULL REFERENCES liga(id) ON DELETE CASCADE,
      nutzer_id  INTEGER NOT NULL REFERENCES nutzer(id),
      beigetreten TEXT NOT NULL,
      PRIMARY KEY (liga_id, nutzer_id)
    );

    CREATE TABLE IF NOT EXISTS tipp (
      id         INTEGER PRIMARY KEY,
      nutzer_id  INTEGER NOT NULL REFERENCES nutzer(id),
      spiel_id   TEXT NOT NULL REFERENCES spiel(id),
      tore_heim  INTEGER NOT NULL,
      tore_gast  INTEGER NOT NULL,
      abgegeben  TEXT NOT NULL,
      UNIQUE (nutzer_id, spiel_id)
    );

    CREATE TABLE IF NOT EXISTS spieler_tipp (
      nutzer_id  INTEGER NOT NULL REFERENCES nutzer(id),
      spiel_id   TEXT NOT NULL REFERENCES spiel(id),
      position   TEXT NOT NULL,
      spieler_id TEXT NOT NULL REFERENCES spieler(id),
      abgegeben  TEXT NOT NULL,
      PRIMARY KEY (nutzer_id, spiel_id, position)
    );

    CREATE TABLE IF NOT EXISTS meldung (
      id        INTEGER PRIMARY KEY,
      liga_id   INTEGER REFERENCES liga(id) ON DELETE CASCADE,
      melder_id INTEGER REFERENCES nutzer(id),
      grund     TEXT NOT NULL,
      erstellt  TEXT NOT NULL,
      erledigt  INTEGER NOT NULL DEFAULT 0
    );
  `);
}

/* --- Einstellungen ---------------------------------------------------- */

export function einstellung(schluessel: string): string | null {
  const zeile = db()
    .prepare("SELECT wert FROM einstellung WHERE schluessel = ?")
    .get(schluessel) as { wert: string } | undefined;
  return zeile?.wert ?? null;
}

export function einstellungSetzen(schluessel: string, wert: string): void {
  db()
    .prepare(
      `INSERT INTO einstellung (schluessel, wert) VALUES (?, ?)
       ON CONFLICT(schluessel) DO UPDATE SET wert = excluded.wert`,
    )
    .run(schluessel, wert);
}

/* --- Abgleich mit der Datenquelle -------------------------------------- */

export interface AbgleichBericht {
  quelle: string;
  istDemo: boolean;
  wettbewerbe: number;
  mannschaften: number;
  spieler: number;
  spiele: number;
  ereignisse: number;
  uebersprungen: number;
  zeitpunkt: string;
}

/**
 * Holt den Bestand aus der aktiven Datenquelle und schreibt ihn in die
 * Datenbank. Von Hand korrigierte Ergebnisse bleiben unangetastet.
 */
export async function datenAbgleichen(): Promise<AbgleichBericht> {
  const quelle = aktiveQuelle();
  const bestand = await quelle.laden();
  const verbindung = db();

  let uebersprungen = 0;

  const schreiben = verbindung.transaction(() => {
    const wettbewerb = verbindung.prepare(
      `INSERT INTO wettbewerb (id, name, kuerzel, land, saison) VALUES (@id, @name, @kuerzel, @land, @saison)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, kuerzel=excluded.kuerzel,
         land=excluded.land, saison=excluded.saison`,
    );
    for (const w of bestand.wettbewerbe) wettbewerb.run(w);

    const mannschaft = verbindung.prepare(
      `INSERT INTO mannschaft (id, wettbewerb_id, name, kuerzel) VALUES (@id, @wettbewerbId, @name, @kuerzel)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, kuerzel=excluded.kuerzel`,
    );
    for (const m of bestand.mannschaften) mannschaft.run(m);

    const spieler = verbindung.prepare(
      `INSERT INTO spieler (id, mannschaft_id, name, position, nummer)
       VALUES (@id, @mannschaftId, @name, @position, @nummer)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, position=excluded.position, nummer=excluded.nummer`,
    );
    for (const s of bestand.spieler) spieler.run(s);

    const istKorrigiert = verbindung.prepare("SELECT korrigiert FROM spiel WHERE id = ?");
    const spiel = verbindung.prepare(
      `INSERT INTO spiel (id, wettbewerb_id, spieltag, anstoss, heim_id, gast_id, status, tore_heim, tore_gast)
       VALUES (@id, @wettbewerbId, @spieltag, @anstoss, @heimId, @gastId, @status, @toreHeim, @toreGast)
       ON CONFLICT(id) DO UPDATE SET anstoss=excluded.anstoss, status=excluded.status,
         tore_heim=excluded.tore_heim, tore_gast=excluded.tore_gast`,
    );
    for (const s of bestand.spiele) {
      const vorhanden = istKorrigiert.get(s.id) as { korrigiert: number } | undefined;
      if (vorhanden?.korrigiert === 1) {
        uebersprungen++;
        continue;
      }
      spiel.run(s);
    }

    // Ereignisse eines Spiels werden komplett ersetzt, damit Nachmeldungen
    // (etwa eine nachträglich zuerkannte Vorlage) sauber ankommen.
    const betroffen = new Set(bestand.ereignisse.map((e) => e.spielId));
    const loeschen = verbindung.prepare("DELETE FROM ereignis WHERE spiel_id = ?");
    for (const spielId of betroffen) loeschen.run(spielId);
    const ereignis = verbindung.prepare(
      "INSERT INTO ereignis (spiel_id, spieler_id, art, minute) VALUES (@spielId, @spielerId, @art, @minute)",
    );
    for (const e of bestand.ereignisse) ereignis.run(e);
  });

  schreiben();

  const bericht: AbgleichBericht = {
    quelle: quelle.name,
    istDemo: quelle.istDemo,
    wettbewerbe: bestand.wettbewerbe.length,
    mannschaften: bestand.mannschaften.length,
    spieler: bestand.spieler.length,
    spiele: bestand.spiele.length,
    ereignisse: bestand.ereignisse.length,
    uebersprungen,
    zeitpunkt: new Date().toISOString(),
  };
  einstellungSetzen("letzter_abgleich", JSON.stringify(bericht));
  return bericht;
}

export function letzterAbgleich(): AbgleichBericht | null {
  const roh = einstellung("letzter_abgleich");
  if (!roh) return null;
  try {
    return JSON.parse(roh) as AbgleichBericht;
  } catch {
    return null;
  }
}
