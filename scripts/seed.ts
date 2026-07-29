/**
 * Legt den Startbestand an bekannten Hengsten an.
 *
 *   npm run seed
 *
 * Normalerweise nicht nötig - die App legt den Grundbestand beim ersten Start
 * automatisch an. Dieses Skript ist für den Fall gedacht, dass später Pferde zu
 * `src/lib/seed-data.ts` hinzugefügt werden. Der Lauf ist wiederholbar:
 * vorhandene Namen werden übersprungen, eingetragene Pferde bleiben unberührt.
 */

import path from "node:path";
import { getDb, seedFamousHorses } from "../src/lib/db";

process.env.DATABASE_PATH ??= path.join(
  process.cwd(),
  "data",
  "westernhengste.db",
);
process.env.SKIP_AUTO_SEED = "1";

const conn = getDb();
const created = seedFamousHorses();

const total = (
  conn.prepare("SELECT COUNT(*) AS c FROM horses").get() as { c: number }
).c;
const linked = (
  conn
    .prepare(
      "SELECT COUNT(*) AS c FROM horses WHERE sire_id IS NOT NULL OR dam_id IS NOT NULL",
    )
    .get() as { c: number }
).c;

console.log(`${created} Pferd(e) neu angelegt, Gesamtbestand: ${total}.`);
console.log(`${linked} davon sind mit mindestens einem Elternteil verknüpft.`);
