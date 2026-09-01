import type { IncomingMessage } from "node:http";
import { ApiError } from "./errors.js";

/** Größe, die ein JSON-Rumpf höchstens haben darf. Fotos gehen einen eigenen Weg. */
const MAX_JSON_BYTES = 256 * 1024;

/**
 * Liest den Rumpf einer Anfrage als JSON.
 *
 * Die Größe wird während des Lesens geprüft, nicht danach: sonst könnte
 * ein Client den Speicher des Servers füllen, bevor die Prüfung greift.
 */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const contentType = req.headers["content-type"] ?? "";
  if (contentType !== "" && !contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Es wird application/json erwartet.");
  }

  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    total += buffer.length;
    if (total > MAX_JSON_BYTES) {
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Die Anfrage ist zu groß.");
    }
    chunks.push(buffer);
  }

  if (total === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw ApiError.validation({}, "Der Anfragetext ist kein gültiges JSON.");
  }
}

/**
 * Liest den Rumpf unverändert als Text.
 *
 * Für Webhooks von Zahlungsanbietern zwingend: die Signatur gilt für genau
 * diese Zeichenfolge. Wer erst JSON.parse und dann JSON.stringify aufruft,
 * ändert Reihenfolge und Leerzeichen - und die Prüfung schlägt fehl, obwohl
 * das Ereignis echt ist.
 */
export async function readRawBody(req: IncomingMessage, maxBytes = MAX_JSON_BYTES): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    total += buffer.length;
    if (total > maxBytes) {
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Die Anfrage ist zu groß.");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Liest einen binären Rumpf (Foto-Upload) mit harter Größengrenze. */
export async function readBinaryBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    total += buffer.length;
    if (total > maxBytes) {
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Die Datei ist zu groß.");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
