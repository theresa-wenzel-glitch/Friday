import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { sign, safeEqual } from "./session-crypto";
import type { Account, AccountRole, AccountStatus } from "./marketplace-types";

const COOKIE_NAME = "wh_session";
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

/** "scrypt:N:r:p:saltHex:hashHex" - Parameter mitgespeichert, falls sie später erhöht werden. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }

  const actual = crypto.scryptSync(password, salt, expected.length, {
    N,
    r,
    p,
    maxmem: SCRYPT_MAXMEM,
  });
  return safeEqual(actual.toString("hex"), expected.toString("hex"));
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Konten                                                              */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

function toAccount(row: Row): Account {
  return {
    id: row.id as number,
    email: row.email as string,
    displayName: row.display_name as string,
    phone: (row.phone as string) ?? null,
    role: (row.role as AccountRole) ?? "provider",
    isVerified: Boolean(row.is_verified),
    status: (row.status as AccountStatus) ?? "active",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export interface CreateAccountInput {
  email: string;
  password: string;
  displayName: string;
  phone?: string | null;
  role?: AccountRole;
}

export class AccountExistsError extends Error {
  constructor() {
    super("Für diese E-Mail-Adresse gibt es bereits ein Konto.");
  }
}

export function createAccount(input: CreateAccountInput): Account {
  const conn = getDb();
  const now = new Date().toISOString();
  const emailKey = normalizeEmail(input.email);

  if (findAccountByEmail(emailKey)) {
    throw new AccountExistsError();
  }

  const info = conn
    .prepare(
      `INSERT INTO accounts (
         email, email_key, password_hash, display_name, phone, role,
         is_verified, status, created_at, updated_at
       ) VALUES (
         @email, @email_key, @password_hash, @display_name, @phone, @role,
         0, 'active', @now, @now
       )`,
    )
    .run({
      email: input.email.trim(),
      email_key: emailKey,
      password_hash: hashPassword(input.password),
      display_name: input.displayName.trim(),
      phone: input.phone ?? null,
      role: input.role ?? "provider",
      now,
    });

  return getAccountById(Number(info.lastInsertRowid))!;
}

export function getAccountById(id: number): Account | null {
  const row = getDb().prepare("SELECT * FROM accounts WHERE id = ?").get(id) as
    | Row
    | undefined;
  return row ? toAccount(row) : null;
}

export function findAccountByEmail(email: string): Account | null {
  const row = getDb()
    .prepare("SELECT * FROM accounts WHERE email_key = ?")
    .get(normalizeEmail(email)) as Row | undefined;
  return row ? toAccount(row) : null;
}

/** Nur intern für den Login-Vergleich - liefert den Passwort-Hash mit. */
function getAccountRowByEmail(email: string): Row | undefined {
  return getDb()
    .prepare("SELECT * FROM accounts WHERE email_key = ?")
    .get(normalizeEmail(email)) as Row | undefined;
}

export function verifyLogin(email: string, password: string): Account | null {
  const row = getAccountRowByEmail(email);
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash as string)) return null;
  if ((row.status as AccountStatus) !== "active") return null;
  return toAccount(row);
}

/* ------------------------------------------------------------------ */
/* Sessions - serverseitig gespeichert, damit sie widerrufbar sind     */
/* ------------------------------------------------------------------ */

function cleanupExpiredSessions(): void {
  getDb()
    .prepare("DELETE FROM account_sessions WHERE expires_at < ?")
    .run(new Date().toISOString());
}

export async function createAccountSession(accountId: number): Promise<void> {
  cleanupExpiredSessions();

  const id = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MS);

  getDb()
    .prepare(
      `INSERT INTO account_sessions (id, account_id, created_at, expires_at)
       VALUES (@id, @account_id, @created_at, @expires_at)`,
    )
    .run({
      id,
      account_id: accountId,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

  const token = `${id}.${sign(id)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_MS / 1000),
  });
}

export async function destroyAccountSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  store.delete(COOKIE_NAME);
  if (!token) return;

  const [id] = token.split(".");
  if (id) getDb().prepare("DELETE FROM account_sessions WHERE id = ?").run(id);
}

/** Löscht alle Sessions eines Kontos - z. B. nach einem Passwortwechsel. */
export function destroyAllSessionsForAccount(accountId: number): void {
  getDb()
    .prepare("DELETE FROM account_sessions WHERE account_id = ?")
    .run(accountId);
}

export async function getCurrentAccount(): Promise<Account | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [id, signature] = token.split(".");
  if (!id || !signature) return null;

  let expected: string;
  try {
    expected = sign(id);
  } catch {
    return null;
  }
  if (!safeEqual(signature, expected)) return null;

  const row = getDb()
    .prepare(
      `SELECT a.* FROM account_sessions s
       JOIN accounts a ON a.id = s.account_id
       WHERE s.id = @id AND s.expires_at > @now AND a.status = 'active'`,
    )
    .get({ id, now: new Date().toISOString() }) as Row | undefined;

  return row ? toAccount(row) : null;
}

/** Wirft, wenn niemand angemeldet ist - Vorbild: requireAdmin() in auth.ts. */
export async function requireAccount(): Promise<Account> {
  const account = await getCurrentAccount();
  if (!account) throw new Error("Nicht angemeldet.");
  return account;
}
