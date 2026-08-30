import type { ApiErrorCode } from "@jobflow/types";

/**
 * Fehler, die bewusst nach aussen gehen.
 *
 * Alles andere (Programmierfehler, Datenbankausfaelle) wird zu einem
 * INTERNAL_ERROR ohne Details - interne Meldungen gehoeren ins Log, nicht
 * in die Antwort an einen fremden Client.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, code: ApiErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  static validation(fields: Record<string, string>, message = "Bitte pruefe deine Eingaben."): ApiError {
    return new ApiError(422, "VALIDATION_FAILED", message, fields);
  }

  static unauthenticated(message = "Bitte melde dich an."): ApiError {
    return new ApiError(401, "UNAUTHENTICATED", message);
  }

  /**
   * Bewusst auch dann, wenn ein Objekt existiert, aber jemand anderem gehoert:
   * ein 404 verraet weniger als ein 403. Ausnahme sind Faelle, in denen der
   * Nutzer das Objekt sehen darf, nur die Aktion nicht ausfuehren.
   */
  static forbidden(message = "Dazu fehlt dir die Berechtigung."): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Nicht gefunden."): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static rateLimited(message = "Zu viele Anfragen. Bitte kurz warten."): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Unerwarteter Fehler."): ApiError {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}
