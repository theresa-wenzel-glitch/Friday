/**
 * Einheitliche Antwortstruktur.
 *
 * Jede API-Antwort hat exakt diese Form - im Erfolgs- wie im Fehlerfall.
 * Dadurch müssen Mobile, Web und Admin nicht pro Endpunkt raten, wie eine
 * Antwort aussieht.
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}

export interface ApiFailure {
  success: false;
  data: null;
  error: ApiErrorBody;
}

export interface ApiErrorBody {
  /** Maschinenlesbarer Code, z. B. "REQUEST_NOT_FOUND". */
  code: ApiErrorCode;
  /** Für Menschen lesbare Meldung (deutsch). */
  message: string;
  /** Feldbezogene Validierungsfehler: Feldpfad -> Meldung. */
  fields?: Record<string, string>;
}

export const API_ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "AI_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Seitenweise Auflistung. */
export interface Page<T> {
  items: T[];
  /** Gesamtzahl der Treffer ohne Berücksichtigung von limit/offset. */
  total: number;
  limit: number;
  offset: number;
}

/** Geografische Position. JobFlow speichert Koordinaten, keine Freitext-Adressen. */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** ISO-8601-Zeitstempel als String, so wie er über die API geht. */
export type IsoDateTime = string;

/** UUID v4 als String. */
export type Uuid = string;
