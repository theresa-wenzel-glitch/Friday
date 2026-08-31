import Constants from "expo-constants";
import type { ApiResponse } from "@jobflow/types";

/**
 * Der zentrale API-Client.
 *
 * Die Adresse steht in der Konfiguration, nicht im Quelltext - sonst lässt
 * sich die App nicht gegen verschiedene Umgebungen betreiben. Geheimnisse
 * gehören ohnehin nie in eine mobile App: alles, was in ihr steckt, kann
 * ausgelesen werden.
 */
const API_URL =
  (Constants.expoConfig?.extra?.["apiUrl"] as string | undefined) ??
  process.env["EXPO_PUBLIC_API_URL"] ??
  "http://localhost:4000";

/** Fehler mit dem Code aus der einheitlichen Antwortstruktur. */
export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Führt einen API-Aufruf aus und packt die Hülle { success, data, error }
 * aus. Die Screens bekommen dadurch entweder die Nutzdaten oder eine
 * Ausnahme - und müssen nicht jedes Mal dasselbe prüfen.
 */
export async function apiCall<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (authToken !== null) headers["authorization"] = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    // Kein Netz, falsche Adresse, Server nicht erreichbar. Der Nutzer soll
    // etwas Verständliches lesen, keinen fetch-Fehler.
    throw new ApiClientError(0, "NETWORK_ERROR", "Keine Verbindung zu JobFlow. Bist du online?");
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(response.status, "INTERNAL_ERROR", "Unerwartete Antwort vom Server.");
  }

  if (!payload.success) {
    throw new ApiClientError(
      response.status,
      payload.error.code,
      payload.error.message,
      payload.error.fields ?? {},
    );
  }
  return payload.data;
}

export const api = {
  get: <T>(path: string) => apiCall<T>(path),
  post: <T>(path: string, body?: unknown) => apiCall<T>(path, { method: "POST", body: body ?? {} }),
  patch: <T>(path: string, body: unknown) => apiCall<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => apiCall<T>(path, { method: "DELETE" }),
};

export { API_URL };
