import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool, PoolClient } from "pg";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const MIGRATIONS_DIR = path.join(packageRoot, "migrations");
export const SEEDS_DIR = path.join(packageRoot, "seeds");

export interface AppliedMigration {
  filename: string;
  checksum: string;
  appliedAt: Date;
}

interface SqlFile {
  filename: string;
  sql: string;
  checksum: string;
}

async function readSqlFiles(dir: string): Promise<SqlFile[]> {
  const entries = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
  const files: SqlFile[] = [];
  for (const filename of entries) {
    const sql = await readFile(path.join(dir, filename), "utf8");
    files.push({ filename, sql, checksum: createHash("sha256").update(sql).digest("hex") });
  }
  return files;
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function listApplied(pool: Pool): Promise<AppliedMigration[]> {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const result = await client.query<{ filename: string; checksum: string; applied_at: Date }>(
      "SELECT filename, checksum, applied_at FROM schema_migrations ORDER BY filename",
    );
    return result.rows.map((row) => ({
      filename: row.filename,
      checksum: row.checksum,
      appliedAt: row.applied_at,
    }));
  } finally {
    client.release();
  }
}

/**
 * Wendet alle noch offenen Migrationen an.
 *
 * Jede Migration laeuft in ihrer eigenen Transaktion: entweder sie geht
 * vollständig durch oder gar nicht. Bereits angewendete Dateien werden über
 * ihre Prüfsumme verglichen - wird eine Migration nachträglich verändert,
 * bricht der Lauf ab, statt zwei Umgebungen auseinanderlaufen zu lassen.
 */
export async function migrate(pool: Pool, log: (message: string) => void = () => {}): Promise<string[]> {
  const files = await readSqlFiles(MIGRATIONS_DIR);
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await ensureMigrationsTable(client);
    const known = new Map(
      (
        await client.query<{ filename: string; checksum: string }>(
          "SELECT filename, checksum FROM schema_migrations",
        )
      ).rows.map((row) => [row.filename, row.checksum] as const),
    );

    for (const file of files) {
      const knownChecksum = known.get(file.filename);
      if (knownChecksum !== undefined) {
        if (knownChecksum !== file.checksum) {
          throw new Error(
            `Migration ${file.filename} wurde nachträglich verändert. ` +
              "Bereits angewendete Migrationen dürfen nicht bearbeitet werden - " +
              "bitte stattdessen eine neue Migration anlegen.",
          );
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(file.sql);
        await client.query("INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)", [
          file.filename,
          file.checksum,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file.filename} fehlgeschlagen: ${(error as Error).message}`, {
          cause: error,
        });
      }
      applied.push(file.filename);
      log(`angewendet: ${file.filename}`);
    }
  } finally {
    client.release();
  }
  return applied;
}

/**
 * Spielt die Seed-Dateien ein. Sie sind idempotent formuliert, ein zweiter
 * Lauf ändert also nichts.
 */
export async function seed(pool: Pool, log: (message: string) => void = () => {}): Promise<string[]> {
  const files = await readSqlFiles(SEEDS_DIR);
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    for (const file of files) {
      await client.query("BEGIN");
      try {
        await client.query(file.sql);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Seed ${file.filename} fehlgeschlagen: ${(error as Error).message}`, {
          cause: error,
        });
      }
      applied.push(file.filename);
      log(`eingespielt: ${file.filename}`);
    }
  } finally {
    client.release();
  }
  return applied;
}

/**
 * Leert das Schema vollständig und baut es neu auf.
 *
 * Nur für Entwicklung und Tests gedacht - deshalb die ausdrückliche
 * Bestätigung im CLI und die Sperre gegen NODE_ENV=production.
 */
export async function reset(pool: Pool, log: (message: string) => void = () => {}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
    log("Schema geleert.");
  } finally {
    client.release();
  }
  await migrate(pool, log);
  await seed(pool, log);
}
