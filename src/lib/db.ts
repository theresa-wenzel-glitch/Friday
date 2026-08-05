import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type {
  Availability,
  Correction,
  GeneticTest,
  Horse,
  HorseSource,
  HorseStatus,
  Sex,
} from "./types";
import { normalizeName, slugify } from "./slug";
import { SEED_HORSES } from "./seed-data";

const DEFAULT_PATH = path.join(process.cwd(), "data", "westernhengste.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const file = process.env.DATABASE_PATH || DEFAULT_PATH;
  fs.mkdirSync(path.dirname(file), { recursive: true });

  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);

  // Beim allerersten Start wird der bekannte Grundbestand angelegt, damit die
  // App nicht leer startet. Danach passiert hier nichts mehr.
  if (process.env.SKIP_AUTO_SEED !== "1") seedIfEmpty();

  return db;
}

let seedAttempted = false;

/** Legt den Startbestand an, sofern noch kein einziges Pferd erfasst ist. */
export function seedIfEmpty(): number {
  if (seedAttempted) return 0;
  seedAttempted = true;

  const count = (
    db!.prepare("SELECT COUNT(*) AS c FROM horses").get() as { c: number }
  ).c;
  if (count > 0) return 0;

  return seedFamousHorses();
}

/**
 * Legt die bekannten Gründer- und Vererberhengste an. Wiederholbar:
 * bereits vorhandene Namen werden übersprungen.
 */
export function seedFamousHorses(): number {
  let created = 0;

  for (const seed of SEED_HORSES) {
    if (findHorseByName(seed.name)) continue;

    insertHorse({
      name: seed.name,
      slug: slugify(seed.name),
      aka: seed.aka ?? null,
      sex: seed.sex ?? "stallion",
      breed: seed.breed ?? "Quarter Horse",
      registryNo: seed.registryNo ?? null,
      yearOfBirth: seed.yearOfBirth ?? null,
      yearOfDeath: seed.yearOfDeath ?? null,
      color: seed.color ?? null,
      heightCm: null,
      country: seed.country ?? null,
      location: null,
      studName: null,
      disciplines: seed.disciplines ?? [],
      description: seed.description ?? null,
      showRecord: null,
      offspring: null,
      bloodlineNote: seed.bloodlineNote ?? null,
      sireName: seed.sireName ?? null,
      damName: seed.damName ?? null,
      genetics: {},
      availability: seed.availability ?? "unknown",
      photoUrl: null,
      photoCredit: null,
      videoUrl: null,
      websiteUrl: null,
      allbreedUrl: null,
      ownerName: null,
      contactEmail: null,
      contactPhone: null,
      isHistoric: seed.isHistoric ?? false,
      // Bewusst false: die Angaben stammen aus allgemeiner Literatur und sind
      // noch nicht gegen Zuchtbuchpapiere geprüft.
      isVerified: false,
      status: "approved",
      source: "seed",
      submitterEmail: null,
      adminNote: null,
    });

    created++;
  }

  // Abschliessend alles durchverknüpfen, damit auch Vorfahren erfasst werden,
  // die erst nach ihren Nachkommen angelegt wurden.
  relinkAll();
  return created;
}

/** Baut sämtliche Eltern-Verknüpfungen neu auf. */
export function relinkAll(): void {
  const ids = getDb().prepare("SELECT id FROM horses").all() as { id: number }[];
  for (const { id } of ids) {
    linkParents(id);
    linkAsParentOfOthers(id);
  }
}

function migrate(conn: Database.Database) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS horses (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      slug           TEXT    NOT NULL UNIQUE,
      name           TEXT    NOT NULL,
      name_key       TEXT    NOT NULL,
      aka            TEXT,
      sex            TEXT    NOT NULL DEFAULT 'stallion',
      breed          TEXT,
      registry_no    TEXT,
      year_of_birth  INTEGER,
      year_of_death  INTEGER,
      color          TEXT,
      height_cm      INTEGER,
      country        TEXT,
      location       TEXT,
      stud_name      TEXT,
      disciplines    TEXT    NOT NULL DEFAULT '[]',
      description    TEXT,
      show_record    TEXT,
      offspring      TEXT,
      bloodline_note TEXT,
      sire_name      TEXT,
      dam_name       TEXT,
      sire_name_key  TEXT    NOT NULL DEFAULT '',
      dam_name_key   TEXT    NOT NULL DEFAULT '',
      sire_id        INTEGER REFERENCES horses(id) ON DELETE SET NULL,
      dam_id         INTEGER REFERENCES horses(id) ON DELETE SET NULL,
      genetics       TEXT    NOT NULL DEFAULT '{}',
      availability   TEXT    NOT NULL DEFAULT 'unknown',
      photo_url      TEXT,
      photo_credit   TEXT,
      video_url      TEXT,
      website_url    TEXT,
      allbreed_url   TEXT,
      owner_name     TEXT,
      contact_email  TEXT,
      contact_phone  TEXT,
      is_historic    INTEGER NOT NULL DEFAULT 0,
      is_verified    INTEGER NOT NULL DEFAULT 0,
      status         TEXT    NOT NULL DEFAULT 'pending',
      source         TEXT    NOT NULL DEFAULT 'community',
      submitter_email TEXT,
      admin_note     TEXT,
      created_at     TEXT    NOT NULL,
      updated_at     TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_horses_status   ON horses(status);
    CREATE INDEX IF NOT EXISTS idx_horses_name_key ON horses(name_key);
    CREATE INDEX IF NOT EXISTS idx_horses_sire     ON horses(sire_id);
    CREATE INDEX IF NOT EXISTS idx_horses_dam      ON horses(dam_id);
    CREATE INDEX IF NOT EXISTS idx_horses_country  ON horses(country);
    CREATE INDEX IF NOT EXISTS idx_horses_breed    ON horses(breed);
    CREATE INDEX IF NOT EXISTS idx_horses_sire_key ON horses(sire_name_key);
    CREATE INDEX IF NOT EXISTS idx_horses_dam_key  ON horses(dam_name_key);

    CREATE TABLE IF NOT EXISTS corrections (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      horse_id       INTEGER NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
      message        TEXT    NOT NULL,
      reporter_email TEXT,
      handled        INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_corrections_handled ON corrections(handled);

    -- Marktplatz: Anbieter-Konten, getrennt vom globalen Admin-Passwort.
    CREATE TABLE IF NOT EXISTS accounts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL,
      email_key     TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      display_name  TEXT    NOT NULL,
      phone         TEXT,
      role          TEXT    NOT NULL DEFAULT 'provider',
      is_verified   INTEGER NOT NULL DEFAULT 0,
      status        TEXT    NOT NULL DEFAULT 'active',
      created_at    TEXT    NOT NULL,
      updated_at    TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

    -- Widerrufbare Sessions (anders als das zustandslose Admin-Cookie):
    -- Logout auf anderen Geräten, Sperrung, Passwortwechsel muss sofort greifen.
    CREATE TABLE IF NOT EXISTS account_sessions (
      id          TEXT    PRIMARY KEY,
      account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at  TEXT    NOT NULL,
      expires_at  TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_account ON account_sessions(account_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON account_sessions(expires_at);

    -- Marktplatz-Inserate: Deckhengst-Angebot ODER Verkaufspferd. Getrennt von
    -- horses (Info-Verzeichnis) - horse_id ist nur eine optionale Verknuepfung.
    CREATE TABLE IF NOT EXISTS listings (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      horse_id       INTEGER REFERENCES horses(id) ON DELETE SET NULL,
      kind           TEXT    NOT NULL DEFAULT 'stud' CHECK (kind IN ('stud','sale')),
      slug           TEXT    NOT NULL UNIQUE,
      name           TEXT    NOT NULL,
      name_key       TEXT    NOT NULL DEFAULT '',
      sex            TEXT    NOT NULL DEFAULT 'stallion',
      breed          TEXT,
      year_of_birth  INTEGER,
      color          TEXT,
      country        TEXT,
      location       TEXT,
      disciplines    TEXT    NOT NULL DEFAULT '[]',
      description    TEXT,
      price_cents    INTEGER,
      price_currency TEXT    NOT NULL DEFAULT 'EUR',
      price_label    TEXT,
      photo_url      TEXT,
      contact_name   TEXT,
      contact_email  TEXT,
      contact_phone  TEXT,
      status         TEXT    NOT NULL DEFAULT 'pending',
      admin_note     TEXT,
      created_at     TEXT    NOT NULL,
      updated_at     TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_listings_status  ON listings(status);
    CREATE INDEX IF NOT EXISTS idx_listings_kind    ON listings(kind);
    CREATE INDEX IF NOT EXISTS idx_listings_account ON listings(account_id);
    CREATE INDEX IF NOT EXISTS idx_listings_country ON listings(country);

    -- Kontaktanfragen zu einem Inserat.
    CREATE TABLE IF NOT EXISTS inquiries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id    INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      sender_name   TEXT    NOT NULL,
      sender_email  TEXT    NOT NULL,
      sender_phone  TEXT,
      message       TEXT    NOT NULL,
      handled       INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inquiries_listing ON inquiries(listing_id);
    CREATE INDEX IF NOT EXISTS idx_inquiries_handled ON inquiries(handled);

    -- Deckakt-Auktionen: ein einzelner Decktermin eines Hengstes wird
    -- versteigert, nicht der Hengst selbst. Hoechstgebot wird immer live aus
    -- bids berechnet (kein winning_bid_id-Feld, siehe Architekturplan).
    CREATE TABLE IF NOT EXISTS auctions (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id           INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      listing_id           INTEGER REFERENCES listings(id) ON DELETE SET NULL,
      slug                 TEXT    NOT NULL UNIQUE,
      title                TEXT    NOT NULL,
      description          TEXT,
      season_note          TEXT,
      start_at             TEXT    NOT NULL,
      end_at               TEXT    NOT NULL,
      starting_price_cents INTEGER NOT NULL DEFAULT 0,
      min_increment_cents  INTEGER NOT NULL DEFAULT 1000,
      currency             TEXT    NOT NULL DEFAULT 'EUR',
      moderation_status    TEXT    NOT NULL DEFAULT 'pending',
      cancelled_at         TEXT,
      fee_type             TEXT    NOT NULL DEFAULT 'flat' CHECK (fee_type IN ('flat','percent')),
      fee_amount_cents     INTEGER,
      fee_percent          REAL,
      fee_status           TEXT    NOT NULL DEFAULT 'unpaid' CHECK (fee_status IN ('unpaid','invoiced','paid','waived')),
      fee_paid_at          TEXT,
      fee_note             TEXT,
      created_at           TEXT    NOT NULL,
      updated_at           TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(moderation_status);
    CREATE INDEX IF NOT EXISTS idx_auctions_end    ON auctions(end_at);
    CREATE INDEX IF NOT EXISTS idx_auctions_fee    ON auctions(fee_status);

    CREATE TABLE IF NOT EXISTS bids (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      auction_id   INTEGER NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
      account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL,
      created_at   TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id, amount_cents DESC);
  `);
}

/* ------------------------------------------------------------------ */
/* Zeilen <-> Objekte                                                  */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toHorse(row: Row): Horse {
  return {
    id: row.id as number,
    slug: row.slug as string,
    name: row.name as string,
    aka: (row.aka as string) ?? null,
    sex: (row.sex as Sex) ?? "stallion",
    breed: (row.breed as string) ?? null,
    registryNo: (row.registry_no as string) ?? null,
    yearOfBirth: (row.year_of_birth as number) ?? null,
    yearOfDeath: (row.year_of_death as number) ?? null,
    color: (row.color as string) ?? null,
    heightCm: (row.height_cm as number) ?? null,
    country: (row.country as string) ?? null,
    location: (row.location as string) ?? null,
    studName: (row.stud_name as string) ?? null,
    disciplines: parseJson<string[]>(row.disciplines, []),
    description: (row.description as string) ?? null,
    showRecord: (row.show_record as string) ?? null,
    offspring: (row.offspring as string) ?? null,
    bloodlineNote: (row.bloodline_note as string) ?? null,
    sireName: (row.sire_name as string) ?? null,
    damName: (row.dam_name as string) ?? null,
    sireId: (row.sire_id as number) ?? null,
    damId: (row.dam_id as number) ?? null,
    genetics: parseJson<Partial<Record<GeneticTest, string>>>(row.genetics, {}),
    availability: (row.availability as Availability) ?? "unknown",
    photoUrl: (row.photo_url as string) ?? null,
    photoCredit: (row.photo_credit as string) ?? null,
    videoUrl: (row.video_url as string) ?? null,
    websiteUrl: (row.website_url as string) ?? null,
    allbreedUrl: (row.allbreed_url as string) ?? null,
    ownerName: (row.owner_name as string) ?? null,
    contactEmail: (row.contact_email as string) ?? null,
    contactPhone: (row.contact_phone as string) ?? null,
    isHistoric: Boolean(row.is_historic),
    isVerified: Boolean(row.is_verified),
    status: (row.status as HorseStatus) ?? "pending",
    source: (row.source as HorseSource) ?? "community",
    submitterEmail: (row.submitter_email as string) ?? null,
    adminNote: (row.admin_note as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Öffentliche Sicht auf einen Datensatz: Kontaktdaten und Einreicher-Adresse
 * werden entfernt. Die E-Mail wird erst über /api/kontakt/[slug] herausgegeben,
 * damit sie nicht einfach aus dem HTML gescrapt werden kann.
 */
export function toPublicHorse(horse: Horse): Horse {
  return {
    ...horse,
    contactEmail: null,
    submitterEmail: null,
    adminNote: null,
  };
}

/** Zeigt an, ob überhaupt eine Kontaktmöglichkeit hinterlegt ist. */
export function hasContact(horse: Horse): boolean {
  return Boolean(horse.contactEmail);
}

/* ------------------------------------------------------------------ */
/* Lesen                                                               */
/* ------------------------------------------------------------------ */

export interface HorseQuery {
  search?: string;
  breed?: string;
  discipline?: string;
  country?: string;
  sex?: Sex;
  availability?: Availability;
  historic?: "only" | "exclude";
  status?: HorseStatus;
  sort?: "name" | "newest" | "year";
  limit?: number;
  offset?: number;
}

export interface HorseQueryResult {
  horses: Horse[];
  total: number;
}

export function queryHorses(q: HorseQuery = {}): HorseQueryResult {
  const conn = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  where.push("status = @status");
  params.status = q.status ?? "approved";

  if (q.search?.trim()) {
    // name_key ist die normalisierte Namensform; zusätzlich wird in Abstammung
    // und Stationsname gesucht, damit "Doc Bar" auch Nachkommen findet.
    where.push(
      `(name_key LIKE @search
        OR lower(COALESCE(aka, ''))       LIKE @search
        OR lower(COALESCE(sire_name, '')) LIKE @search
        OR lower(COALESCE(dam_name, ''))  LIKE @search
        OR lower(COALESCE(stud_name, '')) LIKE @search
        OR lower(COALESCE(owner_name, '')) LIKE @search)`,
    );
    params.search = `%${normalizeName(q.search)}%`;
  }

  if (q.breed) {
    where.push("breed = @breed");
    params.breed = q.breed;
  }
  if (q.country) {
    where.push("country = @country");
    params.country = q.country;
  }
  if (q.sex) {
    where.push("sex = @sex");
    params.sex = q.sex;
  }
  if (q.availability) {
    where.push("availability = @availability");
    params.availability = q.availability;
  }
  if (q.discipline) {
    where.push("disciplines LIKE @discipline");
    params.discipline = `%"${q.discipline}"%`;
  }
  if (q.historic === "only") where.push("is_historic = 1");
  if (q.historic === "exclude") where.push("is_historic = 0");

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const orderSql =
    q.sort === "newest"
      ? "ORDER BY created_at DESC, name COLLATE NOCASE ASC"
      : q.sort === "year"
        ? "ORDER BY year_of_birth IS NULL, year_of_birth DESC, name COLLATE NOCASE ASC"
        : "ORDER BY name COLLATE NOCASE ASC";

  const total = (
    conn
      .prepare(`SELECT COUNT(*) AS c FROM horses ${whereSql}`)
      .get(params) as { c: number }
  ).c;

  const limit = Math.min(Math.max(q.limit ?? 24, 1), 200);
  const offset = Math.max(q.offset ?? 0, 0);

  const rows = conn
    .prepare(
      `SELECT * FROM horses ${whereSql} ${orderSql} LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset }) as Row[];

  return { horses: rows.map(toHorse), total };
}

export function getHorseBySlug(slug: string): Horse | null {
  const row = getDb()
    .prepare("SELECT * FROM horses WHERE slug = ?")
    .get(slug) as Row | undefined;
  return row ? toHorse(row) : null;
}

export function getHorseById(id: number): Horse | null {
  const row = getDb().prepare("SELECT * FROM horses WHERE id = ?").get(id) as
    | Row
    | undefined;
  return row ? toHorse(row) : null;
}

export function findHorseByName(name: string): Horse | null {
  const row = getDb()
    .prepare(
      "SELECT * FROM horses WHERE name_key = ? ORDER BY status = 'approved' DESC, id ASC LIMIT 1",
    )
    .get(normalizeName(name)) as Row | undefined;
  return row ? toHorse(row) : null;
}

/** Direkte Nachkommen eines Pferdes (nur freigegebene Datensätze). */
export function getOffspring(horseId: number, limit = 60): Horse[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM horses
       WHERE (sire_id = @id OR dam_id = @id) AND status = 'approved'
       ORDER BY year_of_birth IS NULL, year_of_birth ASC, name COLLATE NOCASE ASC
       LIMIT @limit`,
    )
    .all({ id: horseId, limit }) as Row[];
  return rows.map(toHorse);
}

export function countByStatus(status: HorseStatus): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS c FROM horses WHERE status = ?")
      .get(status) as { c: number }
  ).c;
}

/** Werte, die tatsächlich in freigegebenen Datensätzen vorkommen - für Filter-Dropdowns. */
export function getFilterFacets(): {
  breeds: string[];
  countries: string[];
  disciplines: string[];
} {
  const conn = getDb();
  const breeds = (
    conn
      .prepare(
        `SELECT DISTINCT breed AS v FROM horses
         WHERE status = 'approved' AND breed IS NOT NULL AND breed <> ''
         ORDER BY v COLLATE NOCASE`,
      )
      .all() as { v: string }[]
  ).map((r) => r.v);

  const countries = (
    conn
      .prepare(
        `SELECT DISTINCT country AS v FROM horses
         WHERE status = 'approved' AND country IS NOT NULL AND country <> ''
         ORDER BY v COLLATE NOCASE`,
      )
      .all() as { v: string }[]
  ).map((r) => r.v);

  const rows = conn
    .prepare(
      `SELECT disciplines AS v FROM horses WHERE status = 'approved' AND disciplines <> '[]'`,
    )
    .all() as { v: string }[];

  const set = new Set<string>();
  for (const row of rows) {
    for (const d of parseJson<string[]>(row.v, [])) set.add(d);
  }

  return {
    breeds,
    countries,
    disciplines: [...set].sort((a, b) => a.localeCompare(b, "de")),
  };
}

/* ------------------------------------------------------------------ */
/* Schreiben                                                           */
/* ------------------------------------------------------------------ */

export type HorseInput = Omit<
  Horse,
  "id" | "slug" | "createdAt" | "updatedAt" | "sireId" | "damId"
> & { slug?: string };

function uniqueSlug(conn: Database.Database, base: string): string {
  const exists = conn.prepare("SELECT 1 FROM horses WHERE slug = ?");
  if (!exists.get(base)) return base;
  for (let i = 2; i < 500; i++) {
    const candidate = `${base}-${i}`;
    if (!exists.get(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export function insertHorse(input: HorseInput): Horse {
  const conn = getDb();
  const now = new Date().toISOString();
  const slug = uniqueSlug(conn, input.slug ?? slugify(input.name));

  const info = conn
    .prepare(
      `INSERT INTO horses (
         slug, name, name_key, aka, sex, breed, registry_no, year_of_birth,
         year_of_death, color, height_cm, country, location, stud_name,
         disciplines, description, show_record, offspring, bloodline_note,
         sire_name, dam_name, sire_name_key, dam_name_key,
         genetics, availability, photo_url, photo_credit,
         video_url, website_url, allbreed_url, owner_name, contact_email,
         contact_phone, is_historic, is_verified, status, source,
         submitter_email, admin_note, created_at, updated_at
       ) VALUES (
         @slug, @name, @name_key, @aka, @sex, @breed, @registry_no, @year_of_birth,
         @year_of_death, @color, @height_cm, @country, @location, @stud_name,
         @disciplines, @description, @show_record, @offspring, @bloodline_note,
         @sire_name, @dam_name, @sire_name_key, @dam_name_key,
         @genetics, @availability, @photo_url, @photo_credit,
         @video_url, @website_url, @allbreed_url, @owner_name, @contact_email,
         @contact_phone, @is_historic, @is_verified, @status, @source,
         @submitter_email, @admin_note, @created_at, @updated_at
       )`,
    )
    .run({
      slug,
      name: input.name,
      name_key: normalizeName(input.name),
      aka: input.aka,
      sex: input.sex,
      breed: input.breed,
      registry_no: input.registryNo,
      year_of_birth: input.yearOfBirth,
      year_of_death: input.yearOfDeath,
      color: input.color,
      height_cm: input.heightCm,
      country: input.country,
      location: input.location,
      stud_name: input.studName,
      disciplines: JSON.stringify(input.disciplines ?? []),
      description: input.description,
      show_record: input.showRecord,
      offspring: input.offspring,
      bloodline_note: input.bloodlineNote,
      sire_name: input.sireName,
      dam_name: input.damName,
      sire_name_key: input.sireName ? normalizeName(input.sireName) : "",
      dam_name_key: input.damName ? normalizeName(input.damName) : "",
      genetics: JSON.stringify(input.genetics ?? {}),
      availability: input.availability,
      photo_url: input.photoUrl,
      photo_credit: input.photoCredit,
      video_url: input.videoUrl,
      website_url: input.websiteUrl,
      allbreed_url: input.allbreedUrl,
      owner_name: input.ownerName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      is_historic: input.isHistoric ? 1 : 0,
      is_verified: input.isVerified ? 1 : 0,
      status: input.status,
      source: input.source,
      submitter_email: input.submitterEmail,
      admin_note: input.adminNote,
      created_at: now,
      updated_at: now,
    });

  const id = Number(info.lastInsertRowid);
  linkParents(id);
  linkAsParentOfOthers(id);
  return getHorseById(id)!;
}

/**
 * Verknüpft Vater/Mutter eines Datensatzes mit vorhandenen Einträgen,
 * sofern der Name eindeutig zugeordnet werden kann.
 */
export function linkParents(horseId: number): void {
  const conn = getDb();
  const horse = getHorseById(horseId);
  if (!horse) return;

  // Ein Vater muss ein Hengst sein, eine Mutter eine Stute. Wallache kommen als
  // Elternteil nicht in Frage - sie tauchen im Verzeichnis nur als Sportpferde auf.
  const resolve = (name: string | null, sex: Sex): number | null => {
    if (!name?.trim()) return null;
    const row = conn
      .prepare(
        `SELECT id FROM horses
         WHERE name_key = @key AND id <> @self AND sex = @sex
         ORDER BY status = 'approved' DESC, id ASC LIMIT 1`,
      )
      .get({ key: normalizeName(name), self: horseId, sex }) as
      | { id: number }
      | undefined;
    return row?.id ?? null;
  };

  conn
    .prepare("UPDATE horses SET sire_id = @sire, dam_id = @dam WHERE id = @id")
    .run({
      sire: resolve(horse.sireName, "stallion"),
      dam: resolve(horse.damName, "mare"),
      id: horseId,
    });
}

/**
 * Wird ein Pferd neu angelegt, das in anderen Datensätzen bereits als
 * Vater- bzw. Mutter-Name steht, werden diese offenen Verweise nachgezogen.
 * Dadurch wächst der Stammbaum automatisch, wenn Nutzer Vorfahren nachtragen.
 */
export function linkAsParentOfOthers(horseId: number): void {
  const conn = getDb();
  const horse = getHorseById(horseId);
  if (!horse || horse.sex === "gelding") return;

  const key = normalizeName(horse.name);
  if (!key) return;

  const column = horse.sex === "mare" ? "dam" : "sire";
  conn
    .prepare(
      `UPDATE horses SET ${column}_id = @id
       WHERE ${column}_id IS NULL AND ${column}_name_key = @key AND id <> @id`,
    )
    .run({ id: horseId, key });
}

export function updateHorseStatus(
  id: number,
  status: HorseStatus,
  adminNote?: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE horses
       SET status = @status, admin_note = COALESCE(@note, admin_note), updated_at = @now
       WHERE id = @id`,
    )
    .run({ id, status, note: adminNote ?? null, now: new Date().toISOString() });
}

export function setVerified(id: number, verified: boolean): void {
  getDb()
    .prepare(
      "UPDATE horses SET is_verified = @v, updated_at = @now WHERE id = @id",
    )
    .run({ id, v: verified ? 1 : 0, now: new Date().toISOString() });
}

export function deleteHorse(id: number): void {
  getDb().prepare("DELETE FROM horses WHERE id = ?").run(id);
}

/* ------------------------------------------------------------------ */
/* Korrekturmeldungen                                                  */
/* ------------------------------------------------------------------ */

export function insertCorrection(
  horseId: number,
  message: string,
  reporterEmail: string | null,
): void {
  getDb()
    .prepare(
      `INSERT INTO corrections (horse_id, message, reporter_email, created_at)
       VALUES (@horseId, @message, @email, @now)`,
    )
    .run({
      horseId,
      message,
      email: reporterEmail,
      now: new Date().toISOString(),
    });
}

export function listCorrections(handled = false): (Correction & {
  horseName: string;
  horseSlug: string;
})[] {
  const rows = getDb()
    .prepare(
      `SELECT c.*, h.name AS horse_name, h.slug AS horse_slug
       FROM corrections c JOIN horses h ON h.id = c.horse_id
       WHERE c.handled = @handled
       ORDER BY c.created_at DESC LIMIT 200`,
    )
    .all({ handled: handled ? 1 : 0 }) as Row[];

  return rows.map((row) => ({
    id: row.id as number,
    horseId: row.horse_id as number,
    message: row.message as string,
    reporterEmail: (row.reporter_email as string) ?? null,
    handled: Boolean(row.handled),
    createdAt: row.created_at as string,
    horseName: row.horse_name as string,
    horseSlug: row.horse_slug as string,
  }));
}

export function markCorrectionHandled(id: number): void {
  getDb().prepare("UPDATE corrections SET handled = 1 WHERE id = ?").run(id);
}

export function countOpenCorrections(): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS c FROM corrections WHERE handled = 0")
      .get() as { c: number }
  ).c;
}
