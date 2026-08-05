import { getDb } from "./db";
import { normalizeName, slugify } from "./slug";
import type {
  Auction,
  AuctionModerationStatus,
  Bid,
  FeeStatus,
  Inquiry,
  Listing,
  ListingKind,
  ListingStatus,
} from "./marketplace-types";
import type { Sex } from "./types";

type Row = Record<string, unknown>;

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toListing(row: Row): Listing {
  return {
    id: row.id as number,
    accountId: row.account_id as number,
    horseId: (row.horse_id as number) ?? null,
    kind: (row.kind as ListingKind) ?? "stud",
    slug: row.slug as string,
    name: row.name as string,
    sex: (row.sex as Sex) ?? "stallion",
    breed: (row.breed as string) ?? null,
    yearOfBirth: (row.year_of_birth as number) ?? null,
    color: (row.color as string) ?? null,
    country: (row.country as string) ?? null,
    location: (row.location as string) ?? null,
    disciplines: parseJson<string[]>(row.disciplines, []),
    description: (row.description as string) ?? null,
    priceCents: (row.price_cents as number) ?? null,
    priceCurrency: (row.price_currency as string) ?? "EUR",
    priceLabel: (row.price_label as string) ?? null,
    photoUrl: (row.photo_url as string) ?? null,
    contactName: (row.contact_name as string) ?? null,
    contactEmail: (row.contact_email as string) ?? null,
    contactPhone: (row.contact_phone as string) ?? null,
    status: (row.status as ListingStatus) ?? "pending",
    adminNote: (row.admin_note as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Öffentliche Sicht: keine Kontaktdaten - genau wie toPublicHorse() in db.ts. */
export function toPublicListing(listing: Listing): Listing {
  return { ...listing, contactEmail: null };
}

/* ------------------------------------------------------------------ */
/* Lesen                                                               */
/* ------------------------------------------------------------------ */

export interface ListingQuery {
  kind?: ListingKind;
  search?: string;
  breed?: string;
  discipline?: string;
  country?: string;
  sex?: Sex;
  status?: ListingStatus;
  sort?: "newest" | "name" | "priceAsc" | "priceDesc";
  limit?: number;
  offset?: number;
}

export interface ListingQueryResult {
  listings: Listing[];
  total: number;
}

export function queryListings(q: ListingQuery = {}): ListingQueryResult {
  const conn = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  where.push("status = @status");
  params.status = q.status ?? "approved";

  if (q.kind) {
    where.push("kind = @kind");
    params.kind = q.kind;
  }
  if (q.search?.trim()) {
    where.push("name_key LIKE @search");
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
  if (q.discipline) {
    where.push("disciplines LIKE @discipline");
    params.discipline = `%"${q.discipline}"%`;
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const orderSql =
    q.sort === "priceAsc"
      ? "ORDER BY price_cents IS NULL, price_cents ASC, name COLLATE NOCASE ASC"
      : q.sort === "priceDesc"
        ? "ORDER BY price_cents IS NULL, price_cents DESC, name COLLATE NOCASE ASC"
        : q.sort === "name"
          ? "ORDER BY name COLLATE NOCASE ASC"
          : "ORDER BY created_at DESC";

  const total = (
    conn
      .prepare(`SELECT COUNT(*) AS c FROM listings ${whereSql}`)
      .get(params) as { c: number }
  ).c;

  const limit = Math.min(Math.max(q.limit ?? 24, 1), 200);
  const offset = Math.max(q.offset ?? 0, 0);

  const rows = conn
    .prepare(
      `SELECT * FROM listings ${whereSql} ${orderSql} LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset }) as Row[];

  return { listings: rows.map(toListing), total };
}

export function getListingBySlug(slug: string): Listing | null {
  const row = getDb()
    .prepare("SELECT * FROM listings WHERE slug = ?")
    .get(slug) as Row | undefined;
  return row ? toListing(row) : null;
}

export function getListingById(id: number): Listing | null {
  const row = getDb()
    .prepare("SELECT * FROM listings WHERE id = ?")
    .get(id) as Row | undefined;
  return row ? toListing(row) : null;
}

export function listListingsForAccount(accountId: number): Listing[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM listings WHERE account_id = ? ORDER BY created_at DESC",
    )
    .all(accountId) as Row[];
  return rows.map(toListing);
}

export function countListingsByStatus(status: ListingStatus): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS c FROM listings WHERE status = ?")
      .get(status) as { c: number }
  ).c;
}

export interface MarketStats {
  listingsOnline: number;
  studListings: number;
  providers: number;
}

/** Zahlen für die Statistik-Kopfzeile - immer live aus der DB, nie erfunden. */
export function getMarketStats(): MarketStats {
  const conn = getDb();
  const listingsOnline = (
    conn.prepare("SELECT COUNT(*) AS c FROM listings WHERE status = 'approved'").get() as {
      c: number;
    }
  ).c;
  const studListings = (
    conn
      .prepare(
        "SELECT COUNT(*) AS c FROM listings WHERE status = 'approved' AND kind = 'stud'",
      )
      .get() as { c: number }
  ).c;
  const providers = (
    conn
      .prepare(
        `SELECT COUNT(DISTINCT account_id) AS c FROM listings WHERE status = 'approved'`,
      )
      .get() as { c: number }
  ).c;

  return { listingsOnline, studListings, providers };
}

/** Werte aus freigegebenen Inseraten - für Filter-Dropdowns. */
export function getListingFacets(): { breeds: string[]; countries: string[] } {
  const conn = getDb();
  const breeds = (
    conn
      .prepare(
        `SELECT DISTINCT breed AS v FROM listings
         WHERE status = 'approved' AND breed IS NOT NULL AND breed <> ''
         ORDER BY v COLLATE NOCASE`,
      )
      .all() as { v: string }[]
  ).map((r) => r.v);

  const countries = (
    conn
      .prepare(
        `SELECT DISTINCT country AS v FROM listings
         WHERE status = 'approved' AND country IS NOT NULL AND country <> ''
         ORDER BY v COLLATE NOCASE`,
      )
      .all() as { v: string }[]
  ).map((r) => r.v);

  return { breeds, countries };
}

/* ------------------------------------------------------------------ */
/* Schreiben                                                           */
/* ------------------------------------------------------------------ */

export type ListingInput = Omit<
  Listing,
  "id" | "slug" | "createdAt" | "updatedAt" | "status" | "adminNote"
>;

function uniqueSlug(conn: ReturnType<typeof getDb>, base: string): string {
  const exists = conn.prepare("SELECT 1 FROM listings WHERE slug = ?");
  if (!exists.get(base)) return base;
  for (let i = 2; i < 500; i++) {
    const candidate = `${base}-${i}`;
    if (!exists.get(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export function insertListing(input: ListingInput): Listing {
  const conn = getDb();
  const now = new Date().toISOString();
  const slug = uniqueSlug(conn, slugify(input.name));

  const info = conn
    .prepare(
      `INSERT INTO listings (
         account_id, horse_id, kind, slug, name, name_key, sex, breed,
         year_of_birth, color, country, location, disciplines, description,
         price_cents, price_currency, price_label, photo_url,
         contact_name, contact_email, contact_phone, status,
         created_at, updated_at
       ) VALUES (
         @account_id, @horse_id, @kind, @slug, @name, @name_key, @sex, @breed,
         @year_of_birth, @color, @country, @location, @disciplines, @description,
         @price_cents, @price_currency, @price_label, @photo_url,
         @contact_name, @contact_email, @contact_phone, 'pending',
         @created_at, @updated_at
       )`,
    )
    .run({
      account_id: input.accountId,
      horse_id: input.horseId,
      kind: input.kind,
      slug,
      name: input.name,
      name_key: normalizeName(input.name),
      sex: input.sex,
      breed: input.breed,
      year_of_birth: input.yearOfBirth,
      color: input.color,
      country: input.country,
      location: input.location,
      disciplines: JSON.stringify(input.disciplines ?? []),
      description: input.description,
      price_cents: input.priceCents,
      price_currency: input.priceCurrency,
      price_label: input.priceLabel,
      photo_url: input.photoUrl,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      created_at: now,
      updated_at: now,
    });

  return getListingById(Number(info.lastInsertRowid))!;
}

export function updateListingStatus(
  id: number,
  status: ListingStatus,
  adminNote?: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE listings
       SET status = @status, admin_note = COALESCE(@note, admin_note), updated_at = @now
       WHERE id = @id`,
    )
    .run({ id, status, note: adminNote ?? null, now: new Date().toISOString() });
}

/* ------------------------------------------------------------------ */
/* Kontaktanfragen                                                     */
/* ------------------------------------------------------------------ */

function toInquiry(row: Row): Inquiry {
  return {
    id: row.id as number,
    listingId: row.listing_id as number,
    senderName: row.sender_name as string,
    senderEmail: row.sender_email as string,
    senderPhone: (row.sender_phone as string) ?? null,
    message: row.message as string,
    handled: Boolean(row.handled),
    createdAt: row.created_at as string,
  };
}

export function insertInquiry(input: {
  listingId: number;
  senderName: string;
  senderEmail: string;
  senderPhone: string | null;
  message: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO inquiries (listing_id, sender_name, sender_email, sender_phone, message, created_at)
       VALUES (@listing_id, @sender_name, @sender_email, @sender_phone, @message, @now)`,
    )
    .run({
      listing_id: input.listingId,
      sender_name: input.senderName,
      sender_email: input.senderEmail,
      sender_phone: input.senderPhone,
      message: input.message,
      now: new Date().toISOString(),
    });
}

/** Anfragen für alle Inserate eines Kontos - neueste zuerst, samt Inseratsname. */
export function listInquiriesForAccount(
  accountId: number,
): (Inquiry & { listingName: string; listingSlug: string })[] {
  const rows = getDb()
    .prepare(
      `SELECT i.*, l.name AS listing_name, l.slug AS listing_slug
       FROM inquiries i
       JOIN listings l ON l.id = i.listing_id
       WHERE l.account_id = @accountId
       ORDER BY i.created_at DESC LIMIT 200`,
    )
    .all({ accountId }) as Row[];

  return rows.map((row) => ({
    ...toInquiry(row),
    listingName: row.listing_name as string,
    listingSlug: row.listing_slug as string,
  }));
}

export function countOpenInquiriesForAccount(accountId: number): number {
  return (
    getDb()
      .prepare(
        `SELECT COUNT(*) AS c FROM inquiries i
         JOIN listings l ON l.id = i.listing_id
         WHERE l.account_id = @accountId AND i.handled = 0`,
      )
      .get({ accountId }) as { c: number }
  ).c;
}

/** Prüft vor dem Als-erledigt-Markieren, dass die Anfrage zu einem Inserat
 * dieses Kontos gehört - verhindert, dass ein Konto fremde Anfragen ändert. */
export function markInquiryHandled(inquiryId: number, accountId: number): void {
  getDb()
    .prepare(
      `UPDATE inquiries SET handled = 1
       WHERE id = @inquiryId
         AND listing_id IN (SELECT id FROM listings WHERE account_id = @accountId)`,
    )
    .run({ inquiryId, accountId });
}

/* ------------------------------------------------------------------ */
/* Auktionen - ein einzelner Deckakt/Decktermin, nicht der ganze Hengst */
/* ------------------------------------------------------------------ */

function toAuction(row: Row): Auction {
  return {
    id: row.id as number,
    accountId: row.account_id as number,
    listingId: (row.listing_id as number) ?? null,
    slug: row.slug as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    seasonNote: (row.season_note as string) ?? null,
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    startingPriceCents: row.starting_price_cents as number,
    minIncrementCents: row.min_increment_cents as number,
    currency: (row.currency as string) ?? "EUR",
    moderationStatus: (row.moderation_status as AuctionModerationStatus) ?? "pending",
    cancelledAt: (row.cancelled_at as string) ?? null,
    feeType: (row.fee_type as "flat" | "percent") ?? "flat",
    feeAmountCents: (row.fee_amount_cents as number) ?? null,
    feePercent: (row.fee_percent as number) ?? null,
    feeStatus: (row.fee_status as FeeStatus) ?? "unpaid",
    feePaidAt: (row.fee_paid_at as string) ?? null,
    feeNote: (row.fee_note as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toBid(row: Row): Bid {
  return {
    id: row.id as number,
    auctionId: row.auction_id as number,
    accountId: row.account_id as number,
    amountCents: row.amount_cents as number,
    createdAt: row.created_at as string,
  };
}

export interface AuctionQuery {
  moderationStatus?: AuctionModerationStatus;
  limit?: number;
  offset?: number;
}

export interface AuctionQueryResult {
  auctions: Auction[];
  total: number;
}

/** Öffentliche Auktionsliste - abgesagte Auktionen werden nie mit angezeigt. */
export function queryAuctions(q: AuctionQuery = {}): AuctionQueryResult {
  const conn = getDb();
  const status = q.moderationStatus ?? "approved";
  const limit = Math.min(Math.max(q.limit ?? 24, 1), 200);
  const offset = Math.max(q.offset ?? 0, 0);

  const total = (
    conn
      .prepare(
        "SELECT COUNT(*) AS c FROM auctions WHERE moderation_status = @status AND cancelled_at IS NULL",
      )
      .get({ status }) as { c: number }
  ).c;

  const rows = conn
    .prepare(
      `SELECT * FROM auctions
       WHERE moderation_status = @status AND cancelled_at IS NULL
       ORDER BY end_at ASC LIMIT @limit OFFSET @offset`,
    )
    .all({ status, limit, offset }) as Row[];

  return { auctions: rows.map(toAuction), total };
}

export function getAuctionBySlug(slug: string): Auction | null {
  const row = getDb()
    .prepare("SELECT * FROM auctions WHERE slug = ?")
    .get(slug) as Row | undefined;
  return row ? toAuction(row) : null;
}

export function getAuctionById(id: number): Auction | null {
  const row = getDb().prepare("SELECT * FROM auctions WHERE id = ?").get(id) as
    | Row
    | undefined;
  return row ? toAuction(row) : null;
}

export function listAuctionsForAccount(accountId: number): Auction[] {
  const rows = getDb()
    .prepare("SELECT * FROM auctions WHERE account_id = ? ORDER BY created_at DESC")
    .all(accountId) as Row[];
  return rows.map(toAuction);
}

export function countAuctionsByStatus(status: AuctionModerationStatus): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS c FROM auctions WHERE moderation_status = ?")
      .get(status) as { c: number }
  ).c;
}

export type AuctionInput = Omit<
  Auction,
  | "id"
  | "slug"
  | "createdAt"
  | "updatedAt"
  | "moderationStatus"
  | "cancelledAt"
  | "feeStatus"
  | "feePaidAt"
  | "feeNote"
>;

function uniqueAuctionSlug(conn: ReturnType<typeof getDb>, base: string): string {
  const exists = conn.prepare("SELECT 1 FROM auctions WHERE slug = ?");
  if (!exists.get(base)) return base;
  for (let i = 2; i < 500; i++) {
    const candidate = `${base}-${i}`;
    if (!exists.get(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export function insertAuction(input: AuctionInput): Auction {
  const conn = getDb();
  const now = new Date().toISOString();
  const slug = uniqueAuctionSlug(conn, slugify(input.title));

  const info = conn
    .prepare(
      `INSERT INTO auctions (
         account_id, listing_id, slug, title, description, season_note,
         start_at, end_at, starting_price_cents, min_increment_cents, currency,
         moderation_status, fee_type, fee_amount_cents, fee_percent, fee_status,
         created_at, updated_at
       ) VALUES (
         @account_id, @listing_id, @slug, @title, @description, @season_note,
         @start_at, @end_at, @starting_price_cents, @min_increment_cents, @currency,
         'pending', @fee_type, @fee_amount_cents, @fee_percent, 'unpaid',
         @created_at, @updated_at
       )`,
    )
    .run({
      account_id: input.accountId,
      listing_id: input.listingId,
      slug,
      title: input.title,
      description: input.description,
      season_note: input.seasonNote,
      start_at: input.startAt,
      end_at: input.endAt,
      starting_price_cents: input.startingPriceCents,
      min_increment_cents: input.minIncrementCents,
      currency: input.currency,
      fee_type: input.feeType,
      fee_amount_cents: input.feeAmountCents,
      fee_percent: input.feePercent,
      created_at: now,
      updated_at: now,
    });

  return getAuctionById(Number(info.lastInsertRowid))!;
}

export function updateAuctionModerationStatus(
  id: number,
  status: AuctionModerationStatus,
): void {
  getDb()
    .prepare(
      "UPDATE auctions SET moderation_status = @status, updated_at = @now WHERE id = @id",
    )
    .run({ id, status, now: new Date().toISOString() });
}

export function setAuctionFeeStatus(
  id: number,
  feeStatus: FeeStatus,
  feeNote?: string | null,
): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE auctions
       SET fee_status = @feeStatus,
           fee_paid_at = CASE WHEN @feeStatus = 'paid' THEN @now ELSE fee_paid_at END,
           fee_note = COALESCE(@feeNote, fee_note),
           updated_at = @now
       WHERE id = @id`,
    )
    .run({ id, feeStatus, feeNote: feeNote ?? null, now });
}

/** Nur der Eigentümer darf absagen, und nur solange die Auktion noch nicht läuft. */
export function cancelOwnAuction(auctionId: number, accountId: number): boolean {
  const auction = getAuctionById(auctionId);
  if (!auction || auction.accountId !== accountId) return false;
  if (new Date(auction.startAt) <= new Date()) return false;

  getDb()
    .prepare(
      "UPDATE auctions SET cancelled_at = @now, updated_at = @now WHERE id = @id",
    )
    .run({ id: auctionId, now: new Date().toISOString() });
  return true;
}

/* ------------------------------------------------------------------ */
/* Gebote                                                              */
/* ------------------------------------------------------------------ */

export function getHighestBid(auctionId: number): Bid | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM bids WHERE auction_id = ?
       ORDER BY amount_cents DESC, created_at ASC LIMIT 1`,
    )
    .get(auctionId) as Row | undefined;
  return row ? toBid(row) : null;
}

/** Neueste zuerst, samt Anzeigename des Bieters. */
export function listBidsForAuction(
  auctionId: number,
  limit = 50,
): (Bid & { bidderName: string })[] {
  const rows = getDb()
    .prepare(
      `SELECT b.*, a.display_name AS bidder_name
       FROM bids b JOIN accounts a ON a.id = b.account_id
       WHERE b.auction_id = @auctionId
       ORDER BY b.amount_cents DESC, b.created_at ASC LIMIT @limit`,
    )
    .all({ auctionId, limit }) as Row[];

  return rows.map((row) => ({ ...toBid(row), bidderName: row.bidder_name as string }));
}

export type PlaceBidResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Prüft Zeitfenster und Mindestgebot in einer Transaktion, damit zwei
 * gleichzeitige Gebote nicht beide als "höchstes Gebot" durchgehen.
 */
export function placeBid(
  auctionId: number,
  accountId: number,
  amountCents: number,
): PlaceBidResult {
  const conn = getDb();

  const run = conn.transaction((): PlaceBidResult => {
    const auction = getAuctionById(auctionId);
    if (!auction || auction.moderationStatus !== "approved" || auction.cancelledAt) {
      return { ok: false, error: "Diese Auktion ist nicht (mehr) aktiv." };
    }

    // Verhindert, dass der Anbieter den Preis der eigenen Auktion über
    // Eigengebote künstlich hochtreibt.
    if (auction.accountId === accountId) {
      return { ok: false, error: "Auf die eigene Auktion kann nicht geboten werden." };
    }

    const now = new Date();
    if (now < new Date(auction.startAt)) {
      return { ok: false, error: "Die Auktion hat noch nicht begonnen." };
    }
    if (now > new Date(auction.endAt)) {
      return { ok: false, error: "Die Auktion ist bereits beendet." };
    }

    const highest = getHighestBid(auctionId);
    const minimum = highest
      ? highest.amountCents + auction.minIncrementCents
      : auction.startingPriceCents;

    if (amountCents < minimum) {
      return {
        ok: false,
        error: `Das Gebot muss mindestens ${(minimum / 100).toLocaleString("de-DE")} € betragen.`,
      };
    }

    conn
      .prepare(
        `INSERT INTO bids (auction_id, account_id, amount_cents, created_at)
         VALUES (@auctionId, @accountId, @amountCents, @now)`,
      )
      .run({ auctionId, accountId, amountCents, now: now.toISOString() });

    return { ok: true };
  });

  return run();
}
