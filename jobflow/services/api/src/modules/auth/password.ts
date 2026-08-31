import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

// promisify wählt sonst die Überladung ohne Optionen; die Kostenparameter
// müssen aber übergeben werden.
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/**
 * Passwörter werden mit scrypt gehasht.
 *
 * scrypt ist in Node eingebaut und speicherhart - Angreifer können es nicht
 * beliebig auf Grafikkarten parallelisieren. Die Parameter stehen im Hash
 * selbst, damit sie sich später erhöhen lassen, ohne alte Hashes zu entwerten.
 */
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Kostenparameter. N muss eine Zweierpotenz sein. */
const PARAMS = { N: 16_384, r: 8, p: 1 } as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    // scrypt braucht ungefähr 128 * N * r Bytes; ohne angehobenes Limit
    // lehnt Node die Berechnung ab.
    maxmem: 256 * PARAMS.N * PARAMS.r,
  });

  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/**
 * Prüft ein Passwort gegen einen gespeicherten Hash.
 *
 * Der Vergleich laeuft über timingSafeEqual: ein Vergleich mit === würde
 * über die Laufzeit verraten, wie viele Bytes bereits stimmen.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4] as string, "base64");
    expected = Buffer.from(parts[5] as string, "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = await scrypt(password.normalize("NFKC"), salt, expected.length, {
    N,
    r,
    p,
    maxmem: 256 * N * r,
  });

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
