import type { ServerResponse } from "node:http";
import type { ApiFailure, ApiSuccess, ApiErrorCode } from "@jobflow/types";

/**
 * Jede Antwort hat dieselbe Huelle: { success, data, error }.
 * Die Frontends muessen so nie pro Endpunkt raten, wie eine Antwort aussieht.
 */
export function success<T>(data: T): ApiSuccess<T> {
  return { success: true, data, error: null };
}

export function failure(
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>,
): ApiFailure {
  return {
    success: false,
    data: null,
    error: fields === undefined ? { code, message } : { code, message, fields },
  };
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    // Antworten der API sind nutzerspezifisch und duerfen nirgends
    // zwischengespeichert werden.
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  res.end(payload);
}
