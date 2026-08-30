import type { IncomingMessage } from "node:http";
import { ApiError } from "./errors.js";

/** Groesse, die ein JSON-Rumpf hoechstens haben darf. Fotos gehen einen eigenen Weg. */
const MAX_JSON_BYTES = 256 * 1024;

/**
 * Liest den Rumpf einer Anfrage als JSON.
 *
 * Die Groesse wird waehrend des Lesens geprueft, nicht danach: sonst koennte
 * ein Client den Speicher des Servers fuellen, bevor die Pruefung greift.
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
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Die Anfrage ist zu gross.");
    }
    chunks.push(buffer);
  }

  if (total === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw ApiError.validation({}, "Der Anfragetext ist kein gueltiges JSON.");
  }
}

/** Liest einen binaeren Rumpf (Foto-Upload) mit harter Groessengrenze. */
export async function readBinaryBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    total += buffer.length;
    if (total > maxBytes) {
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Die Datei ist zu gross.");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
