import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  Baustelle,
  Betrieb,
  Eintrag,
  EintragDaten,
  EintragMitBaustelle,
  Medium,
  Nachtrag,
  Quelle,
  Wetter,
} from "./types";
import { LEERE_DATEN } from "./types";

/*
 * Eigene Datenbank für das Bautagebuch, getrennt vom Hengstverzeichnis.
 * Alles liegt unter einem Ordner: die Datenbank und die Fotos/Sprachnachrichten.
 */

export function datenOrdner(): string {
  return (
    process.env.BAUTAGEBUCH_DATA_DIR ||
    path.join(process.cwd(), "data", "bautagebuch")
  );
}

export function dateienOrdner(): string {
  return path.join(datenOrdner(), "dateien");
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  fs.mkdirSync(dateienOrdner(), { recursive: true });
  db = new Database(path.join(datenOrdner(), "bautagebuch.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(conn: Database.Database) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS betriebe (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT    NOT NULL,
      inhaber          TEXT    NOT NULL,
      email            TEXT,
      zugangscode      TEXT    NOT NULL UNIQUE,
      sitzung_version  INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS baustellen (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      betrieb_id    INTEGER NOT NULL REFERENCES betriebe(id) ON DELETE CASCADE,
      name          TEXT    NOT NULL,
      adresse       TEXT,
      ort           TEXT,
      auftraggeber  TEXT,
      lat           REAL,
      lon           REAL,
      aktiv         INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_baustellen_betrieb ON baustellen(betrieb_id);

    CREATE TABLE IF NOT EXISTS eintraege (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      betrieb_id         INTEGER NOT NULL REFERENCES betriebe(id) ON DELETE CASCADE,
      baustelle_id       INTEGER NOT NULL REFERENCES baustellen(id) ON DELETE CASCADE,
      nr                 INTEGER NOT NULL DEFAULT 0,
      datum              TEXT    NOT NULL,
      erfasst_am         TEXT    NOT NULL,
      erfasst_von        TEXT    NOT NULL,
      quelle             TEXT    NOT NULL,
      transkript         TEXT    NOT NULL DEFAULT '',
      daten              TEXT    NOT NULL,
      wetter             TEXT,
      lat                REAL,
      lon                REAL,
      ki_modus           TEXT    NOT NULL DEFAULT 'demo',
      status             TEXT    NOT NULL DEFAULT 'entwurf',
      abgeschlossen_am   TEXT,
      abgeschlossen_von  TEXT,
      hash               TEXT UNIQUE,
      vorheriger_hash    TEXT,
      created_at         TEXT    NOT NULL,
      updated_at         TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_eintraege_baustelle ON eintraege(baustelle_id, datum);
    CREATE INDEX IF NOT EXISTS idx_eintraege_betrieb ON eintraege(betrieb_id, created_at);

    CREATE TABLE IF NOT EXISTS medien (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      betrieb_id       INTEGER NOT NULL REFERENCES betriebe(id) ON DELETE CASCADE,
      eintrag_id       INTEGER REFERENCES eintraege(id) ON DELETE CASCADE,
      wartend_chat_id  TEXT,
      art              TEXT    NOT NULL,
      datei            TEXT    NOT NULL,
      mime             TEXT    NOT NULL,
      sha256           TEXT    NOT NULL,
      groesse          INTEGER NOT NULL,
      created_at       TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_medien_eintrag ON medien(eintrag_id);
    CREATE INDEX IF NOT EXISTS idx_medien_wartend ON medien(wartend_chat_id);

    CREATE TABLE IF NOT EXISTS nachtraege (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      eintrag_id  INTEGER NOT NULL REFERENCES eintraege(id) ON DELETE CASCADE,
      text        TEXT    NOT NULL,
      von         TEXT    NOT NULL,
      created_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS telegram_chats (
      chat_id       TEXT    PRIMARY KEY,
      betrieb_id    INTEGER NOT NULL REFERENCES betriebe(id) ON DELETE CASCADE,
      baustelle_id  INTEGER REFERENCES baustellen(id) ON DELETE SET NULL,
      person        TEXT    NOT NULL,
      wartender_text TEXT,
      linked_at     TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS telegram_updates (
      update_id    INTEGER PRIMARY KEY,
      received_at  TEXT NOT NULL
    );
  `);
}

const now = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Betriebe                                                             */
/* ------------------------------------------------------------------ */

// Ohne leicht verwechselbare Zeichen (0/O, 1/I/L), damit man den Code am
// Telefon durchsagen kann.
const CODE_ZEICHEN = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function neuerZugangscode(): string {
  const bytes = crypto.randomBytes(12);
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += CODE_ZEICHEN[bytes[i] % CODE_ZEICHEN.length];
    if (i === 3 || i === 7) code += "-";
  }
  return code;
}

/** Bringt Eingaben wie "abcd efgh ijkl" auf die Form ABCD-EFGH-IJKL. */
export function normalisiereCode(input: string): string {
  const roh = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (roh.length !== 12) return roh;
  return `${roh.slice(0, 4)}-${roh.slice(4, 8)}-${roh.slice(8, 12)}`;
}

interface BetriebRow {
  id: number;
  name: string;
  inhaber: string;
  email: string | null;
  zugangscode: string;
  sitzung_version: number;
  created_at: string;
}

function toBetrieb(row: BetriebRow): Betrieb {
  return {
    id: row.id,
    name: row.name,
    inhaber: row.inhaber,
    email: row.email,
    zugangscode: row.zugangscode,
    sitzungVersion: row.sitzung_version,
    createdAt: row.created_at,
  };
}

export function createBetrieb(input: {
  name: string;
  inhaber: string;
  email: string | null;
}): Betrieb {
  const code = neuerZugangscode();
  const info = getDb()
    .prepare(
      `INSERT INTO betriebe (name, inhaber, email, zugangscode, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.name, input.inhaber, input.email, code, now());
  return getBetrieb(Number(info.lastInsertRowid))!;
}

export function getBetrieb(id: number): Betrieb | null {
  const row = getDb().prepare("SELECT * FROM betriebe WHERE id = ?").get(id) as
    | BetriebRow
    | undefined;
  return row ? toBetrieb(row) : null;
}

export function findBetriebByCode(code: string): Betrieb | null {
  const row = getDb()
    .prepare("SELECT * FROM betriebe WHERE zugangscode = ?")
    .get(normalisiereCode(code)) as BetriebRow | undefined;
  return row ? toBetrieb(row) : null;
}

/** Neuer Code meldet alle bisherigen Geräte und Telegram-Chats ab. */
export function erneuereZugangscode(betriebId: number): string {
  const code = neuerZugangscode();
  const conn = getDb();
  conn.transaction(() => {
    conn
      .prepare(
        "UPDATE betriebe SET zugangscode = ?, sitzung_version = sitzung_version + 1 WHERE id = ?",
      )
      .run(code, betriebId);
    conn.prepare("DELETE FROM telegram_chats WHERE betrieb_id = ?").run(betriebId);
  })();
  return code;
}

export function updateBetriebName(betriebId: number, name: string) {
  getDb().prepare("UPDATE betriebe SET name = ? WHERE id = ?").run(name, betriebId);
}

/* ------------------------------------------------------------------ */
/* Baustellen                                                           */
/* ------------------------------------------------------------------ */

interface BaustelleRow {
  id: number;
  betrieb_id: number;
  name: string;
  adresse: string | null;
  ort: string | null;
  auftraggeber: string | null;
  lat: number | null;
  lon: number | null;
  aktiv: number;
  created_at: string;
}

function toBaustelle(row: BaustelleRow): Baustelle {
  return {
    id: row.id,
    betriebId: row.betrieb_id,
    name: row.name,
    adresse: row.adresse,
    ort: row.ort,
    auftraggeber: row.auftraggeber,
    lat: row.lat,
    lon: row.lon,
    aktiv: row.aktiv === 1,
    createdAt: row.created_at,
  };
}

export function createBaustelle(input: {
  betriebId: number;
  name: string;
  adresse: string | null;
  ort: string | null;
  auftraggeber: string | null;
  lat: number | null;
  lon: number | null;
}): Baustelle {
  const info = getDb()
    .prepare(
      `INSERT INTO baustellen (betrieb_id, name, adresse, ort, auftraggeber, lat, lon, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.betriebId,
      input.name,
      input.adresse,
      input.ort,
      input.auftraggeber,
      input.lat,
      input.lon,
      now(),
    );
  return getBaustelle(input.betriebId, Number(info.lastInsertRowid))!;
}

/** Holt eine Baustelle - aber nur, wenn sie zum angegebenen Betrieb gehört. */
export function getBaustelle(betriebId: number, id: number): Baustelle | null {
  const row = getDb()
    .prepare("SELECT * FROM baustellen WHERE id = ? AND betrieb_id = ?")
    .get(id, betriebId) as BaustelleRow | undefined;
  return row ? toBaustelle(row) : null;
}

export function listBaustellen(
  betriebId: number,
  opts: { nurAktive?: boolean } = {},
): (Baustelle & { anzahl: number; letzterEintrag: string | null })[] {
  const rows = getDb()
    .prepare(
      `SELECT b.*,
              (SELECT COUNT(*) FROM eintraege e WHERE e.baustelle_id = b.id) AS anzahl,
              (SELECT MAX(e.datum) FROM eintraege e WHERE e.baustelle_id = b.id) AS letzter
         FROM baustellen b
        WHERE b.betrieb_id = ? ${opts.nurAktive ? "AND b.aktiv = 1" : ""}
        ORDER BY b.aktiv DESC, b.name COLLATE NOCASE`,
    )
    .all(betriebId) as (BaustelleRow & { anzahl: number; letzter: string | null })[];
  return rows.map((r) => ({
    ...toBaustelle(r),
    anzahl: r.anzahl,
    letzterEintrag: r.letzter,
  }));
}

export function setBaustelleAktiv(betriebId: number, id: number, aktiv: boolean) {
  getDb()
    .prepare("UPDATE baustellen SET aktiv = ? WHERE id = ? AND betrieb_id = ?")
    .run(aktiv ? 1 : 0, id, betriebId);
}

export function updateBaustelleKoordinaten(id: number, lat: number, lon: number) {
  getDb().prepare("UPDATE baustellen SET lat = ?, lon = ? WHERE id = ?").run(lat, lon, id);
}

/* ------------------------------------------------------------------ */
/* Einträge                                                             */
/* ------------------------------------------------------------------ */

interface EintragRow {
  id: number;
  betrieb_id: number;
  baustelle_id: number;
  nr: number;
  datum: string;
  erfasst_am: string;
  erfasst_von: string;
  quelle: string;
  transkript: string;
  daten: string;
  wetter: string | null;
  lat: number | null;
  lon: number | null;
  ki_modus: string;
  status: string;
  abgeschlossen_am: string | null;
  abgeschlossen_von: string | null;
  hash: string | null;
  vorheriger_hash: string | null;
  created_at: string;
  updated_at: string;
  baustelle_name?: string;
}

function parseDaten(json: string): EintragDaten {
  try {
    return { ...LEERE_DATEN, ...(JSON.parse(json) as Partial<EintragDaten>) };
  } catch {
    return { ...LEERE_DATEN };
  }
}

function toEintrag(row: EintragRow): EintragMitBaustelle {
  return {
    id: row.id,
    betriebId: row.betrieb_id,
    baustelleId: row.baustelle_id,
    baustelleName: row.baustelle_name ?? "",
    nr: row.nr,
    datum: row.datum,
    erfasstAm: row.erfasst_am,
    erfasstVon: row.erfasst_von,
    quelle: row.quelle as Quelle,
    transkript: row.transkript,
    daten: parseDaten(row.daten),
    wetter: row.wetter ? (JSON.parse(row.wetter) as Wetter) : null,
    lat: row.lat,
    lon: row.lon,
    kiModus: row.ki_modus === "ki" ? "ki" : "demo",
    status: row.status === "abgeschlossen" ? "abgeschlossen" : "entwurf",
    abgeschlossenAm: row.abgeschlossen_am,
    abgeschlossenVon: row.abgeschlossen_von,
    hash: row.hash,
    vorherigerHash: row.vorheriger_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const EINTRAG_SELECT = `
  SELECT e.*, b.name AS baustelle_name
    FROM eintraege e
    JOIN baustellen b ON b.id = e.baustelle_id`;

export function createEintrag(input: {
  betriebId: number;
  baustelleId: number;
  datum: string;
  erfasstAm: string;
  erfasstVon: string;
  quelle: Quelle;
  transkript: string;
  daten: EintragDaten;
  wetter: Wetter | null;
  lat: number | null;
  lon: number | null;
  kiModus: "ki" | "demo";
  medienIds: number[];
}): number {
  const conn = getDb();
  return conn.transaction(() => {
    const info = conn
      .prepare(
        `INSERT INTO eintraege
           (betrieb_id, baustelle_id, datum, erfasst_am, erfasst_von, quelle,
            transkript, daten, wetter, lat, lon, ki_modus, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.betriebId,
        input.baustelleId,
        input.datum,
        input.erfasstAm,
        input.erfasstVon,
        input.quelle,
        input.transkript,
        JSON.stringify(input.daten),
        input.wetter ? JSON.stringify(input.wetter) : null,
        input.lat,
        input.lon,
        input.kiModus,
        now(),
        now(),
      );
    const id = Number(info.lastInsertRowid);
    const attach = conn.prepare(
      "UPDATE medien SET eintrag_id = ?, wartend_chat_id = NULL WHERE id = ? AND betrieb_id = ?",
    );
    for (const m of input.medienIds) attach.run(id, m, input.betriebId);
    return id;
  })();
}

export function getEintrag(betriebId: number, id: number): EintragMitBaustelle | null {
  const row = getDb()
    .prepare(`${EINTRAG_SELECT} WHERE e.id = ? AND e.betrieb_id = ?`)
    .get(id, betriebId) as EintragRow | undefined;
  return row ? toEintrag(row) : null;
}

export function getEintragByHash(hash: string): EintragMitBaustelle | null {
  const row = getDb()
    .prepare(`${EINTRAG_SELECT} WHERE e.hash = ?`)
    .get(hash) as EintragRow | undefined;
  return row ? toEintrag(row) : null;
}

export function listEintraege(
  betriebId: number,
  opts: { baustelleId?: number; von?: string; bis?: string; limit?: number; status?: string } = {},
): EintragMitBaustelle[] {
  const where = ["e.betrieb_id = ?"];
  const args: (string | number)[] = [betriebId];
  if (opts.baustelleId) {
    where.push("e.baustelle_id = ?");
    args.push(opts.baustelleId);
  }
  if (opts.von) {
    where.push("e.datum >= ?");
    args.push(opts.von);
  }
  if (opts.bis) {
    where.push("e.datum <= ?");
    args.push(opts.bis);
  }
  if (opts.status) {
    where.push("e.status = ?");
    args.push(opts.status);
  }
  args.push(opts.limit ?? 500);
  const rows = getDb()
    .prepare(
      `${EINTRAG_SELECT} WHERE ${where.join(" AND ")}
        ORDER BY e.datum DESC, e.erfasst_am DESC LIMIT ?`,
    )
    .all(...args) as EintragRow[];
  return rows.map(toEintrag);
}

/** Nur Entwürfe dürfen geändert werden - abgeschlossene Einträge sind fest. */
export function updateEntwurf(
  betriebId: number,
  id: number,
  input: { datum: string; daten: EintragDaten },
): boolean {
  const info = getDb()
    .prepare(
      `UPDATE eintraege SET datum = ?, daten = ?, updated_at = ?
        WHERE id = ? AND betrieb_id = ? AND status = 'entwurf'`,
    )
    .run(input.datum, JSON.stringify(input.daten), now(), id, betriebId);
  return info.changes > 0;
}

export function deleteEntwurf(betriebId: number, id: number): Medium[] {
  const conn = getDb();
  return conn.transaction(() => {
    const e = conn
      .prepare("SELECT id FROM eintraege WHERE id = ? AND betrieb_id = ? AND status = 'entwurf'")
      .get(id, betriebId);
    if (!e) return [];
    const medien = listMedien(id);
    conn.prepare("DELETE FROM eintraege WHERE id = ?").run(id);
    return medien;
  })();
}

/**
 * Schließt einen Entwurf ab: vergibt die laufende Nummer der Baustelle und
 * verkettet ihn über die Prüfsumme mit dem vorigen abgeschlossenen Eintrag.
 * Die Prüfsumme selbst berechnet `berechneHash` aus allen Inhalten.
 */
export function schliesseAb(
  betriebId: number,
  id: number,
  von: string,
  hashFn: (e: EintragMitBaustelle, medien: Medium[]) => string,
): EintragMitBaustelle | null {
  const conn = getDb();
  return conn.transaction(() => {
    const e = getEintrag(betriebId, id);
    if (!e || e.status !== "entwurf") return null;

    const vorher = conn
      .prepare(
        `SELECT nr, hash FROM eintraege
          WHERE baustelle_id = ? AND status = 'abgeschlossen'
          ORDER BY nr DESC LIMIT 1`,
      )
      .get(e.baustelleId) as { nr: number; hash: string } | undefined;

    const fertig: EintragMitBaustelle = {
      ...e,
      nr: (vorher?.nr ?? 0) + 1,
      status: "abgeschlossen",
      abgeschlossenAm: now(),
      abgeschlossenVon: von,
      vorherigerHash: vorher?.hash ?? null,
    };
    fertig.hash = hashFn(fertig, listMedien(id));

    conn
      .prepare(
        `UPDATE eintraege
            SET nr = ?, status = 'abgeschlossen', abgeschlossen_am = ?, abgeschlossen_von = ?,
                hash = ?, vorheriger_hash = ?, updated_at = ?
          WHERE id = ?`,
      )
      .run(
        fertig.nr,
        fertig.abgeschlossenAm,
        von,
        fertig.hash,
        fertig.vorherigerHash,
        now(),
        id,
      );
    return fertig;
  })();
}

export function zaehleEintraegeHeute(betriebId: number, baustelleId: number, datum: string): number {
  return (
    getDb()
      .prepare(
        "SELECT COUNT(*) AS c FROM eintraege WHERE betrieb_id = ? AND baustelle_id = ? AND datum = ?",
      )
      .get(betriebId, baustelleId, datum) as { c: number }
  ).c;
}

/* ------------------------------------------------------------------ */
/* Medien (Fotos und Sprachnachrichten)                                 */
/* ------------------------------------------------------------------ */

interface MediumRow {
  id: number;
  betrieb_id: number;
  eintrag_id: number | null;
  wartend_chat_id: string | null;
  art: string;
  datei: string;
  mime: string;
  sha256: string;
  groesse: number;
  created_at: string;
}

function toMedium(row: MediumRow): Medium {
  return {
    id: row.id,
    eintragId: row.eintrag_id,
    art: row.art === "audio" ? "audio" : "foto",
    datei: row.datei,
    mime: row.mime,
    sha256: row.sha256,
    groesse: row.groesse,
    createdAt: row.created_at,
  };
}

/** Speichert eine Datei unverändert ab und merkt sich ihre Prüfsumme. */
export function speichereMedium(input: {
  betriebId: number;
  art: "foto" | "audio";
  mime: string;
  bytes: Buffer;
  wartendChatId?: string | null;
}): Medium {
  const endung =
    input.art === "foto"
      ? input.mime === "image/png"
        ? "png"
        : "jpg"
      : audioEndung(input.mime);
  const relativ = path.join(String(input.betriebId), `${crypto.randomUUID()}.${endung}`);
  const ziel = path.join(dateienOrdner(), relativ);
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  fs.writeFileSync(ziel, input.bytes, { flag: "wx" });

  const sha256 = crypto.createHash("sha256").update(input.bytes).digest("hex");
  const info = getDb()
    .prepare(
      `INSERT INTO medien (betrieb_id, wartend_chat_id, art, datei, mime, sha256, groesse, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.betriebId,
      input.wartendChatId ?? null,
      input.art,
      relativ,
      input.mime,
      sha256,
      input.bytes.length,
      now(),
    );
  return getMedium(input.betriebId, Number(info.lastInsertRowid))!;
}

export function audioEndung(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

export function getMedium(betriebId: number, id: number): Medium | null {
  const row = getDb()
    .prepare("SELECT * FROM medien WHERE id = ? AND betrieb_id = ?")
    .get(id, betriebId) as MediumRow | undefined;
  return row ? toMedium(row) : null;
}

export function listMedien(eintragId: number): Medium[] {
  return (
    getDb()
      .prepare("SELECT * FROM medien WHERE eintrag_id = ? ORDER BY art DESC, id")
      .all(eintragId) as MediumRow[]
  ).map(toMedium);
}

export function leseMedium(m: Medium): Buffer {
  return fs.readFileSync(path.join(dateienOrdner(), m.datei));
}

export function loescheMediumDateien(medien: Medium[]) {
  for (const m of medien) {
    fs.rmSync(path.join(dateienOrdner(), m.datei), { force: true });
  }
}

/** Löscht Medien, die (noch) keinem Eintrag gehören - z. B. nach einem abgebrochenen Upload. */
export function verwerfeMedien(medien: Medium[]) {
  const stmt = getDb().prepare("DELETE FROM medien WHERE id = ? AND eintrag_id IS NULL");
  const weg = medien.filter((m) => stmt.run(m.id).changes > 0);
  loescheMediumDateien(weg);
}

/** Fotos/Sprachnachrichten, die per Telegram kamen, aber noch keinem Eintrag gehören. */
export function wartendeMedien(chatId: string, seitIso: string): Medium[] {
  return (
    getDb()
      .prepare(
        `SELECT * FROM medien
          WHERE wartend_chat_id = ? AND eintrag_id IS NULL AND created_at >= ?
          ORDER BY id`,
      )
      .all(chatId, seitIso) as MediumRow[]
  ).map(toMedium);
}

/** Räumt liegengebliebene Telegram-Medien auf (ältere als `vorIso`). */
export function verwerfeAlteWartende(chatId: string, vorIso: string) {
  const conn = getDb();
  const alt = (
    conn
      .prepare(
        "SELECT * FROM medien WHERE wartend_chat_id = ? AND eintrag_id IS NULL AND created_at < ?",
      )
      .all(chatId, vorIso) as MediumRow[]
  ).map(toMedium);
  if (alt.length === 0) return;
  conn
    .prepare(
      "DELETE FROM medien WHERE wartend_chat_id = ? AND eintrag_id IS NULL AND created_at < ?",
    )
    .run(chatId, vorIso);
  loescheMediumDateien(alt);
}

/* ------------------------------------------------------------------ */
/* Nachträge                                                            */
/* ------------------------------------------------------------------ */

export function addNachtrag(eintragId: number, text: string, von: string) {
  getDb()
    .prepare("INSERT INTO nachtraege (eintrag_id, text, von, created_at) VALUES (?, ?, ?, ?)")
    .run(eintragId, text, von, now());
}

export function listNachtraege(eintragId: number): Nachtrag[] {
  return (
    getDb()
      .prepare("SELECT * FROM nachtraege WHERE eintrag_id = ? ORDER BY id")
      .all(eintragId) as {
      id: number;
      eintrag_id: number;
      text: string;
      von: string;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    eintragId: r.eintrag_id,
    text: r.text,
    von: r.von,
    createdAt: r.created_at,
  }));
}

/* ------------------------------------------------------------------ */
/* Telegram                                                             */
/* ------------------------------------------------------------------ */

export interface TelegramChat {
  chatId: string;
  betriebId: number;
  baustelleId: number | null;
  person: string;
  wartenderText: string | null;
}

export function getTelegramChat(chatId: string): TelegramChat | null {
  const row = getDb()
    .prepare("SELECT * FROM telegram_chats WHERE chat_id = ?")
    .get(chatId) as
    | {
        chat_id: string;
        betrieb_id: number;
        baustelle_id: number | null;
        person: string;
        wartender_text: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    chatId: row.chat_id,
    betriebId: row.betrieb_id,
    baustelleId: row.baustelle_id,
    person: row.person,
    wartenderText: row.wartender_text,
  };
}

export function verknuepfeTelegramChat(chatId: string, betriebId: number, person: string) {
  getDb()
    .prepare(
      `INSERT INTO telegram_chats (chat_id, betrieb_id, person, linked_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET
         betrieb_id = excluded.betrieb_id, person = excluded.person,
         baustelle_id = NULL, wartender_text = NULL, linked_at = excluded.linked_at`,
    )
    .run(chatId, betriebId, person, now());
}

export function setTelegramBaustelle(chatId: string, baustelleId: number) {
  getDb()
    .prepare("UPDATE telegram_chats SET baustelle_id = ? WHERE chat_id = ?")
    .run(baustelleId, chatId);
}

export function setWartenderText(chatId: string, text: string | null) {
  getDb()
    .prepare("UPDATE telegram_chats SET wartender_text = ? WHERE chat_id = ?")
    .run(text, chatId);
}

export function listTelegramChats(betriebId?: number): TelegramChat[] {
  const rows = (
    betriebId
      ? getDb().prepare("SELECT * FROM telegram_chats WHERE betrieb_id = ?").all(betriebId)
      : getDb().prepare("SELECT * FROM telegram_chats").all()
  ) as {
    chat_id: string;
    betrieb_id: number;
    baustelle_id: number | null;
    person: string;
    wartender_text: string | null;
  }[];
  return rows.map((row) => ({
    chatId: row.chat_id,
    betriebId: row.betrieb_id,
    baustelleId: row.baustelle_id,
    person: row.person,
    wartenderText: row.wartender_text,
  }));
}

/** Telegram stellt Nachrichten bei Zeitüberschreitung erneut zu - jede nur einmal verarbeiten. */
export function merkeUpdate(updateId: number): boolean {
  const info = getDb()
    .prepare("INSERT OR IGNORE INTO telegram_updates (update_id, received_at) VALUES (?, ?)")
    .run(updateId, now());
  return info.changes > 0;
}
