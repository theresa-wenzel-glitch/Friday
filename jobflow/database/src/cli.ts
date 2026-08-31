/**
 * Kommandozeile für das Datenbank-Schema.
 *
 *   pnpm --filter @jobflow/database migrate
 *   pnpm --filter @jobflow/database seed
 *   pnpm --filter @jobflow/database status
 *   pnpm --filter @jobflow/database reset -- --yes
 */
import pg from "pg";
import { listApplied, migrate, reset, seed } from "./migrator.js";

const { Pool } = pg;

function requireDatabaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL ist nicht gesetzt. Siehe .env.example im Projektstamm.");
  }
  return url;
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "migrate";
  const pool = new Pool({ connectionString: requireDatabaseUrl() });
  const log = (message: string) => console.log(`  ${message}`);

  try {
    switch (command) {
      case "migrate": {
        const applied = await migrate(pool, log);
        console.log(applied.length === 0 ? "Keine offenen Migrationen." : `${applied.length} Migration(en) angewendet.`);
        break;
      }
      case "seed": {
        const applied = await seed(pool, log);
        console.log(`${applied.length} Seed-Datei(en) eingespielt.`);
        break;
      }
      case "status": {
        const applied = await listApplied(pool);
        if (applied.length === 0) {
          console.log("Noch keine Migration angewendet.");
        } else {
          for (const entry of applied) {
            console.log(`  ${entry.appliedAt.toISOString()}  ${entry.filename}`);
          }
        }
        break;
      }
      case "reset": {
        if (process.env["NODE_ENV"] === "production") {
          throw new Error("reset ist in der Produktion gesperrt.");
        }
        if (!process.argv.includes("--yes")) {
          throw new Error(
            "reset löscht das gesamte Schema. Zum Bestätigen mit --yes aufrufen.",
          );
        }
        await reset(pool, log);
        console.log("Schema neu aufgebaut.");
        break;
      }
      default:
        throw new Error(`Unbekannter Befehl: ${command}. Erlaubt: migrate, seed, status, reset.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(`Fehler: ${(error as Error).message}`);
  process.exitCode = 1;
});
