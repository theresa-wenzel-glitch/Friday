import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Session-Token.
 *
 * Der Client bekommt einen zufaelligen Wert, die Datenbank speichert nur
 * dessen HMAC. Wer die Datenbank liest, kann sich damit nicht anmelden, und
 * wer den HMAC-Schluessel kennt, kennt trotzdem keine Tokens.
 *
 * Bewusst kein JWT: eine Abmeldung oder Sperrung soll sofort wirken. Ein
 * signiertes Token ohne Serverzustand gilt dagegen bis zum Ablauf weiter.
 */
const TOKEN_BYTES = 32;

export function createToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

/** Zeitkonstanter Vergleich zweier Hex-Hashes. */
export function tokensMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

/** Liest das Bearer-Token aus dem Authorization-Header. */
export function bearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== "string") return null;
  const match = /^Bearer\s+(\S+)$/i.exec(value.trim());
  return match === null ? null : (match[1] as string);
}
