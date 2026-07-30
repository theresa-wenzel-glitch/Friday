/**
 * Prüfung hochgeladener Bilder anhand der ersten Bytes (Magic Numbers) statt
 * anhand des vom Browser gemeldeten Dateityps - der lässt sich beliebig
 * fälschen, die Bytes am Dateianfang nicht ohne Weiteres.
 *
 * Erlaubt sind bewusst nur JPEG, PNG und WebP. Kein SVG: SVG-Dateien können
 * Skript enthalten und wären ein Einfallstor für Cross-Site-Scripting, wenn
 * sie später direkt im Browser geöffnet werden.
 */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

interface Signature {
  ext: "jpg" | "png" | "webp";
  mime: string;
  check: (bytes: Uint8Array) => boolean;
}

const SIGNATURES: Signature[] = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    mime: "image/png",
    check: (b) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    ext: "webp",
    mime: "image/webp",
    check: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 && // "RIFF"
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50, // "WEBP"
  },
];

export function detectImageType(
  bytes: Uint8Array,
): { ext: "jpg" | "png" | "webp"; mime: string } | null {
  if (bytes.length < 12) return null;
  for (const sig of SIGNATURES) {
    if (sig.check(bytes)) return { ext: sig.ext, mime: sig.mime };
  }
  return null;
}

export const UPLOAD_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** UUID plus bekannte Endung - genau das Muster, das die Upload-Route selbst erzeugt. */
export const UPLOAD_FILENAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
