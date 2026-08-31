import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { migrate, seed } from "@jobflow/database";
import pg from "pg";
import { loadConfig, type Config } from "../src/config.js";
import { createApiServer } from "../src/server.js";
import { silentLogger } from "../src/lib/logger.js";
import { buildServices, type AppServices } from "../src/services.js";

const { Pool } = pg;

/**
 * Die Integrationstests laufen gegen eine echte PostgreSQL-Datenbank.
 *
 * Ein Nachbau der Datenbank wäre für JobFlow wertlos: die interessanten
 * Zusicherungen - "nur ein angenommenes Angebot je Anfrage", die generierte
 * Gesamtsumme, die Berechtigungsprüfungen in den Abfragen - stecken im Schema
 * selbst. Ohne Datenbank ist keine davon getestet.
 *
 * Ist keine Testdatenbank konfiguriert, überspringen sich die Tests, statt
 * fehlzuschlagen.
 *
 * Jeder Lauf baut das Schema neu auf. Deshalb laufen die Testdateien
 * nacheinander (--test-concurrency=1 im test-Skript) - parallel würden sie
 * einander die Tabellen unter den Füßen wegziehen.
 */
export const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"] ?? process.env["DATABASE_URL"] ?? null;

export const skipUnlessDatabase = TEST_DATABASE_URL === null
  ? { skip: "TEST_DATABASE_URL ist nicht gesetzt - Integrationstests werden übersprungen." }
  : {};

export interface TestHarness {
  app: AppServices;
  server: Server;
  baseUrl: string;
  config: Config;
  close(): Promise<void>;
}

function testConfig(databaseUrl: string): Config {
  return loadConfig({
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: "test-geheimnis-mit-mindestens-32-zeichen",
    PORT: "0",
    AI_PROVIDER: "rules",
    NODE_ENV: "test",
  } as NodeJS.ProcessEnv);
}

/** Baut das Schema neu auf und startet die API auf einem freien Port. */
export async function startHarness(): Promise<TestHarness> {
  if (TEST_DATABASE_URL === null) throw new Error("Keine Testdatenbank konfiguriert.");

  const pool = new Pool({ connectionString: TEST_DATABASE_URL, max: 5 });
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await migrate(pool);
  await seed(pool);

  const config = testConfig(TEST_DATABASE_URL);
  const app = buildServices({ config, db: pool, logger: silentLogger });
  const server = createApiServer(app);

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;

  return {
    app,
    server,
    config,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await pool.end();
    },
  };
}

export interface ApiCallResult<T = unknown> {
  status: number;
  body: { success: boolean; data: T; error: { code: string; message: string; fields?: Record<string, string> } | null };
}

/** Kleiner Client für die Tests - spricht die API genau wie die App. */
export class TestClient {
  private token: string | null = null;

  constructor(private readonly baseUrl: string) {}

  setToken(token: string | null): void {
    this.token = token;
  }

  async call<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiCallResult<T>> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.token !== null) headers["authorization"] = `Bearer ${this.token}`;

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: (await response.json()) as ApiCallResult<T>["body"] };
  }

  get<T = unknown>(path: string): Promise<ApiCallResult<T>> {
    return this.call<T>("GET", path);
  }
  post<T = unknown>(path: string, body?: unknown): Promise<ApiCallResult<T>> {
    return this.call<T>("POST", path, body ?? {});
  }
  patch<T = unknown>(path: string, body: unknown): Promise<ApiCallResult<T>> {
    return this.call<T>("PATCH", path, body);
  }
  delete<T = unknown>(path: string): Promise<ApiCallResult<T>> {
    return this.call<T>("DELETE", path);
  }
}

/** Erwartet einen Erfolg und liefert die Nutzdaten. */
export function expectOk<T>(result: ApiCallResult<T>, context: string): T {
  if (!result.body.success) {
    throw new Error(
      `${context}: erwartet wurde Erfolg, kam aber ${result.status} ${result.body.error?.code} - ${result.body.error?.message}`,
    );
  }
  return result.body.data;
}

let emailCounter = 0;
export function uniqueEmail(prefix: string): string {
  emailCounter += 1;
  return `${prefix}-${process.pid}-${emailCounter}@example.test`;
}
