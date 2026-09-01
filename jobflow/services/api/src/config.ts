/**
 * Konfiguration aus Umgebungsvariablen.
 *
 * Wird beim Start einmal gelesen und geprüft. Fehlt etwas Sicherheitsrelevantes,
 * startet die API gar nicht erst - ein Backend, das mit einem Standardgeheimnis
 * hochfährt, ist gefährlicher als eines, das sich weigert.
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
  billing: {
    /** "stripe" oder "manual". Ohne Schlüssel bleibt es "manual". */
    provider: "stripe" | "manual";
    stripeSecretKey: string | null;
    stripeWebhookSecret: string | null;
    /** Preis-Kennungen aus dem Stripe-Konto, je Paket. */
    stripePriceIds: { PRO: string | null; BUSINESS: string | null };
    /** Wohin der Anbieter nach der Zahlung zurückleitet. */
    returnUrl: string;
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
  if (isProduction && sessionSecret.startsWith("bitte-ändern")) {
    throw new ConfigError("SESSION_SECRET steht noch auf dem Beispielwert.");
  }

  const stripeSecretKey = optionalString(env, "STRIPE_SECRET_KEY");
  const stripeWebhookSecret = optionalString(env, "STRIPE_WEBHOOK_SECRET");
  if (stripeSecretKey !== null && stripeWebhookSecret === null) {
    throw new ConfigError(
      "STRIPE_SECRET_KEY ist gesetzt, STRIPE_WEBHOOK_SECRET fehlt. Ohne Signaturprüfung " +
        "dürfte jeder Aufrufer Abos freischalten - deshalb startet die API so nicht.",
    );
  }
  if (isProduction && stripeSecretKey !== null && stripeSecretKey.startsWith("sk_test_")) {
    throw new ConfigError("In der Produktion darf kein Stripe-Testschlüssel verwendet werden.");
  }

  const providerRaw = optionalString(env, "AI_PROVIDER") ?? "rules";
  if (providerRaw !== "rules" && providerRaw !== "remote") {
    throw new ConfigError(`AI_PROVIDER muss "rules" oder "remote" sein, ist aber "${providerRaw}".`);
  }

  const aiBaseUrl = optionalString(env, "AI_BASE_URL");
  const aiApiKey = optionalString(env, "AI_API_KEY");
  if (providerRaw === "remote" && (aiBaseUrl === null || aiApiKey === null)) {
    throw new ConfigError('AI_PROVIDER="remote" benötigt AI_BASE_URL und AI_API_KEY.');
  }

  return {
    // PORT=0 ist zulässig: das Betriebssystem sucht dann einen freien Port.
    // Genau das brauchen die Tests, damit mehrere Läufe sich nicht behindern.
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
    billing: {
      // Der Anbieter wird nicht konfiguriert, sondern erkannt: sind Schlüssel
      // da, wird abgerechnet, sonst läuft alles im Paket Free weiter. Das
      // verhindert den gefährlichsten Fehler - eine Anwendung, die glaubt,
      // Zahlungen zu verarbeiten, während gar kein Konto verknüpft ist.
      provider: stripeSecretKey !== null && stripeWebhookSecret !== null ? "stripe" : "manual",
      stripeSecretKey,
      stripeWebhookSecret,
      stripePriceIds: {
        PRO: optionalString(env, "STRIPE_PRICE_PRO"),
        BUSINESS: optionalString(env, "STRIPE_PRICE_BUSINESS"),
      },
      returnUrl: optionalString(env, "BILLING_RETURN_URL") ?? "https://jobflow.example/konto",
    },
    isProduction,
  };
}
