import crypto from "node:crypto";

/**
 * Gemeinsame Signatur-Helfer für Session-Cookies. Ursprünglich Teil von
 * auth.ts (Admin-Login) - jetzt ausgelagert, damit accounts.ts (Anbieter-
 * Login) dieselbe Signatur ohne Duplikat nutzen kann.
 */

export function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value === "bitte-aendern") {
    throw new Error(
      "SESSION_SECRET ist nicht gesetzt. Bitte .env.local anlegen (siehe .env.example).",
    );
  }
  return value;
}

export function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Vergleich in konstanter Zeit, damit die Laufzeit nichts über den Wert verrät. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
