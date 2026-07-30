import fs from "node:fs";
import path from "node:path";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "westernhengste.db");

/**
 * Hochgeladene Bilder liegen im selben Verzeichnis wie die Datenbank - beim
 * Docker-Betrieb also im selben Volume unter /data/uploads. So gibt es keinen
 * zusätzlichen Pfad, den man beim Einrichten der Sicherung vergessen kann.
 */
export function uploadsDir(): string {
  const dbFile = process.env.DATABASE_PATH || DEFAULT_DB_PATH;
  // Der Pfad hängt von einer Umgebungsvariable ab und zeigt zur Laufzeit auf
  // ein Volume ausserhalb des Builds - Turbopack braucht ihn beim Bauen nicht
  // nachzuverfolgen.
  const dir = path.join(/*turbopackIgnore: true*/ path.dirname(dbFile), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
