/**
 * Konfiguration aus Umgebungsvariablen.
 *
 * Wird beim Start einmal gelesen und geprueft. Fehlt etwas Sicherheitsrelevantes,
 * startet die API gar nicht erst - ein Backend, das mit einem Standardgeheimnis
 * hochfaehrt, ist gefaehrlicher als eines, das sich weigert.
 */

export type AiProviderName = "rules" | "remote";

export interface Config {
  port: number;
  databaseUrl: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  corsOrigins: string[];
  ai: {
    provider: AiProviderName;
    baseUrl: string | null;
    apiKey: string | null;
    timeoutMs: number;
  };
  upload: {
    dir: string;
    maxBytes: number;
  };
  isProduction: boolean;
}

const SESSION_SECRET_MIN_LENGTH = 32;

class ConfigError extends Error {}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (value === undefined || value.trim() === "") {
    throw new ConfigError(`${key} ist nicht gesetzt. Siehe .env.example im Projektstamm.`);
  }
  return value.trim();
}

function optionalString(env: NodeJS.ProcessEnv, key: string): string | null {
  const value = env[key];
  return value === undefined || value.trim() === "" ? null : value.trim();
}

function integer(env: NodeJS.ProcessEnv, key: string, fallback: number, min = 1): number {
  const raw = optionalString(env, key);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new ConfigError(`${key} muss eine ganze Zahl ab ${min} sein, ist aber "${raw}".`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const isProduction = env["NODE_ENV"] === "production";

  const sessionSecret = required(env, "SESSION_SECRET");
  if (sessionSecret.length < SESSION_SECRET_MIN_LENGTH) {
    throw new ConfigError(
      `SESSION_SECRET muss mindestens ${SESSION_SECRET_MIN_LENGTH} Zeichen lang sein.`,
    );
  }
  if (isProduction && sessionSecret.startsWith("bitte-aendern")) {
    throw new ConfigError("SESSION_SECRET steht noch auf dem Beispielwert.");
  }

  const providerRaw = optionalString(env, "AI_PROVIDER") ?? "rules";
  if (providerRaw !== "rules" && providerRaw !== "remote") {
    throw new ConfigError(`AI_PROVIDER muss "rules" oder "remote" sein, ist aber "${providerRaw}".`);
  }

  const aiBaseUrl = optionalString(env, "AI_BASE_URL");
  const aiApiKey = optionalString(env, "AI_API_KEY");
  if (providerRaw === "remote" && (aiBaseUrl === null || aiApiKey === null)) {
    throw new ConfigError('AI_PROVIDER="remote" benoetigt AI_BASE_URL und AI_API_KEY.');
  }

  return {
    // PORT=0 ist zulaessig: das Betriebssystem sucht dann einen freien Port.
    // Genau das brauchen die Tests, damit mehrere Laeufe sich nicht behindern.
    port: integer(env, "PORT", 4000, 0),
    databaseUrl: required(env, "DATABASE_URL"),
    sessionSecret,
    sessionTtlSeconds: integer(env, "SESSION_TTL_SECONDS", 60 * 60 * 24 * 30),
    corsOrigins: (optionalString(env, "CORS_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    ai: {
      provider: providerRaw,
      baseUrl: aiBaseUrl,
      apiKey: aiApiKey,
      timeoutMs: integer(env, "AI_TIMEOUT_MS", 15_000),
    },
    upload: {
      dir: optionalString(env, "UPLOAD_DIR") ?? "./var/uploads",
      maxBytes: integer(env, "UPLOAD_MAX_BYTES", 8 * 1024 * 1024),
    },
    isProduction,
  };
}
