/**
 * Ablage für hochgeladene Pferdebilder.
 *
 * Die Dateien liegen bewusst NICHT unter `public/`, sondern neben der
 * Datenbank auf dem dauerhaften Volume. Damit gilt für sie dasselbe wie für
 * den übrigen Bestand: ein Backup des Datenverzeichnisses sichert alles, und
 * ein neues Abbild der Anwendung verliert nichts.
 *
 * Ausgeliefert wird ausschliesslich über `src/app/bilder/[file]/route.ts`.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_MB,
  isStoredPhotoName,
  type PhotoExtension,
} from "./photo";

/** Unter dieser Grösse ist es kein sinnvolles Foto, sondern ein Versehen. */
const MIN_PHOTO_BYTES = 128;

export function uploadDir(): string {
  if (process.env.UPLOAD_PATH) return process.env.UPLOAD_PATH;

  // Standard: neben der Datenbank, damit ein einziges Volume ausreicht.
  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), "data", "westernhengste.db");
  return path.join(path.dirname(dbPath), "uploads");
}

/**
 * Erkennt das Format am tatsächlichen Dateiinhalt.
 *
 * Auf `File.type` oder die Endung ist kein Verlass - beides bestimmt der
 * Absender. Erlaubt sind nur JPEG, PNG und WebP. SVG ist bewusst nicht dabei:
 * eine SVG-Datei kann Skripte enthalten und wäre im Browser gefährlich.
 */
export function sniffImageType(bytes: Uint8Array): PhotoExtension | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }

  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && PNG.every((b, i) => bytes[i] === b)) return "png";

  // WebP: "RIFF" .... "WEBP"
  if (bytes.length >= 12) {
    const tag = (start: number) =>
      String.fromCharCode(...bytes.subarray(start, start + 4));
    if (tag(0) === "RIFF" && tag(8) === "WEBP") return "webp";
  }

  return null;
}

export type SaveResult =
  | { ok: true; file: string }
  | { ok: false; error: string };

/**
 * Nimmt eine hochgeladene Datei entgegen und legt sie unter ihrem Inhalts-Hash
 * ab. Gleiche Datei zweimal hochgeladen heisst: eine Datei auf der Platte.
 */
export async function savePhoto(upload: File): Promise<SaveResult> {
  if (upload.size > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      error: `Das Bild ist zu groß (höchstens ${MAX_PHOTO_MB} MB).`,
    };
  }

  if (upload.size < MIN_PHOTO_BYTES) {
    return { ok: false, error: "Die Bilddatei ist leer oder beschädigt." };
  }

  const bytes = new Uint8Array(await upload.arrayBuffer());

  // Zweite Prüfung: `size` kommt vom Absender, die Länge des Puffers nicht.
  if (bytes.length > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Das Bild ist zu groß." };
  }

  const ext = sniffImageType(bytes);
  if (!ext) {
    return {
      ok: false,
      error: "Nur JPEG, PNG und WebP sind möglich. Bitte das Bild umwandeln.",
    };
  }

  const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 40);
  const file = `${hash}.${ext}`;
  const dir = uploadDir();
  const target = path.join(dir, file);

  try {
    await fs.promises.mkdir(dir, { recursive: true });
    // Liegt die Datei schon da, ist sie inhaltlich identisch - nichts zu tun.
    if (!fs.existsSync(target)) {
      await fs.promises.writeFile(target, bytes, { mode: 0o644 });
    }
  } catch (err) {
    console.error("Bild konnte nicht gespeichert werden:", err);
    return {
      ok: false,
      error: "Das Bild konnte nicht gespeichert werden. Bitte später erneut versuchen.",
    };
  }

  return { ok: true, file };
}

/** Vollständiger Pfad einer gespeicherten Datei, oder null bei ungültigem Namen. */
export function photoPath(file: string): string | null {
  if (!isStoredPhotoName(file)) return null;
  return path.join(uploadDir(), file);
}

export async function readPhoto(file: string): Promise<Buffer | null> {
  const full = photoPath(file);
  if (!full) return null;
  try {
    return await fs.promises.readFile(full);
  } catch {
    return null;
  }
}

/** Entfernt eine Datei von der Platte. Fehlt sie bereits, ist das kein Fehler. */
export async function removePhoto(file: string): Promise<void> {
  const full = photoPath(file);
  if (!full) return;
  try {
    await fs.promises.unlink(full);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error("Bild konnte nicht gelöscht werden:", err);
    }
  }
}
