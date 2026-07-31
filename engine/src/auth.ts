/**
 * Konten und Sitzungen.
 *
 * Bewusst ohne zusätzliche Abhängigkeiten — `node:crypto` bringt alles mit,
 * was hier gebraucht wird. Für einen Produktivbetrieb mit vielen Nutzern
 * gehört das hinter einen etablierten Anbieter oder eine geprüfte Bibliothek;
 * für einen ersten echten Mehrbenutzerbetrieb ist das hier korrekt gebaut:
 *
 *   - Passwörter mit scrypt und individuellem Salt, nie im Klartext
 *   - Vergleiche in konstanter Zeit (timingSafeEqual)
 *   - Sitzungstoken nur als SHA-256-Hash gespeichert — wer die Datei liest,
 *     kann sich damit nicht anmelden
 *   - Begrenzte Anmeldeversuche gegen Durchprobieren
 *   - Gleiche Fehlermeldung für unbekannte Adresse und falsches Passwort,
 *     damit die Anmeldung nicht verrät, welche Adressen registriert sind
 */
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export const SESSION_COOKIE = "atlas_session";
export const SESSION_DAYS = 30;

const SCRYPT_KEYLEN = 64;
const MIN_PASSWORD_LENGTH = 10;

/* -------------------------------------------------------------------------- */
/* Passwörter                                                                 */
/* -------------------------------------------------------------------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Gibt einen Klartext-Hinweis zurück, wenn das Passwort nicht taugt. */
export function checkPasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`;
  }
  if (/^\d+$/.test(password)) {
    return "Nur Ziffern ist zu leicht zu erraten. Nimm eine Wortfolge, die du dir merken kannst.";
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "Dieses Passwort steht in jeder Wörterliste. Nimm ein anderes.";
  }
  return null;
}

const COMMON_PASSWORDS = new Set([
  "passwort123", "password12", "1234567890", "qwertzuiop", "passwort1234",
  "geheim1234", "willkommen", "administrator", "hallowelt1", "sommer2026",
]);

/* -------------------------------------------------------------------------- */
/* E-Mail                                                                     */
/* -------------------------------------------------------------------------- */

/** Nur zur Normalisierung — die Zustellbarkeit prüft eine Bestätigungsmail. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/* -------------------------------------------------------------------------- */
/* Sitzungstoken                                                              */
/* -------------------------------------------------------------------------- */

export interface IssuedSession {
  /** Geht als Cookie an den Browser und wird nie gespeichert. */
  token: string;
  /** Wird gespeichert. Aus ihm lässt sich das Token nicht zurückrechnen. */
  tokenHash: string;
  expiresAt: string;
}

export function issueSession(): IssuedSession {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  return { token, tokenHash: hashToken(token), expiresAt: expires.toISOString() };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newUserId(): string {
  return randomUUID();
}

/* -------------------------------------------------------------------------- */
/* Anmeldeversuche begrenzen                                                  */
/* -------------------------------------------------------------------------- */

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60_000;

const attempts = new Map<string, { count: number; firstAt: number }>();

/** true = darf es versuchen. */
export function allowAttempt(key: string, now = Date.now()): boolean {
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return true;
  }

  entry.count++;
  return entry.count <= MAX_ATTEMPTS;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

export function attemptsRemaining(key: string, now = Date.now()): number {
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - entry.count);
}

/* -------------------------------------------------------------------------- */
/* Cookies                                                                    */
/* -------------------------------------------------------------------------- */

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};

  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((pair): pair is [string, string] => pair.length === 2 && !!pair[0])
      .map(([k, v]) => [k, decodeURIComponent(v)]),
  );
}

export function sessionCookie(token: string, expiresAt: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
