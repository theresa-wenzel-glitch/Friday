import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "wh_admin";
const MAX_AGE_SECONDS = 12 * 60 * 60;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value === "bitte-aendern") {
    throw new Error(
      "SESSION_SECRET ist nicht gesetzt. Bitte .env.local anlegen (siehe .env.example).",
    );
  }
  return value;
}

function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD;
  if (!value || value === "bitte-aendern") return null;
  return value;
}

/** Vergleich in konstanter Zeit, damit die Laufzeit nichts über das Passwort verrät. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function checkPassword(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  return safeEqual(input, expected);
}

/** Der Moderationsbereich ist erst nutzbar, wenn ein echtes Passwort gesetzt wurde. */
export function isAdminConfigured(): boolean {
  return adminPassword() !== null && Boolean(process.env.SESSION_SECRET);
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export async function createSession(): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  const token = `${payload}.${sign(payload)}`;

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isLoggedIn(): Promise<boolean> {
  if (!isAdminConfigured()) return false;

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }

  if (!safeEqual(signature, expected)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/** Wirft, wenn die aufrufende Aktion nicht angemeldet ist. */
export async function requireAdmin(): Promise<void> {
  if (!(await isLoggedIn())) {
    throw new Error("Nicht angemeldet.");
  }
}
