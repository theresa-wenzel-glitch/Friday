/**
 * Baut die Ansichts-Version: eine einzelne HTML-Datei mit dem gesamten
 * Hengstbestand darin, die ohne Server funktioniert.
 *
 *   npm run vorschau
 *
 * Erzeugt zwei Dateien aus derselben Vorlage (vorschau/_seite.html):
 *
 *   vorschau/westernhengste.html  vollständige Seite zum Doppelklicken
 *   vorschau/inhalt.html          nur der Inhalt, zum Veröffentlichen
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const ROOT = process.cwd();
const DB_PATH = process.env.DATABASE_PATH ?? path.join(ROOT, "data", "westernhengste.db");
const TEMPLATE = path.join(ROOT, "vorschau", "_seite.html");

if (!fs.existsSync(DB_PATH)) {
  console.error(
    `Keine Datenbank unter ${DB_PATH}.\n` +
      "Bitte zuerst die App einmal starten (npm run dev) oder 'npm run seed' ausführen.",
  );
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

const rows = db
  .prepare(
    `SELECT id, slug, name, aka, sex, breed, registry_no, year_of_birth,
            year_of_death, color, country, disciplines, description,
            bloodline_note, sire_name, dam_name, sire_id, dam_id,
            availability, is_historic, photo_url, photo_credit
     FROM horses
     WHERE status = 'approved'
     ORDER BY name COLLATE NOCASE`,
  )
  .all();

// Nur die öffentlichen Felder - Kontaktdaten gehören nicht in eine Datei,
// die frei weitergegeben wird. photoUrl wird nur übernommen, wenn es eine
// vollständige http(s)-Adresse ist - ein selbst hochgeladenes Bild
// (/api/uploads/…) gibt es in dieser losgelösten Datei ohne Server nicht.
const horses = rows.map((r) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  aka: r.aka ?? null,
  sex: r.sex,
  breed: r.breed ?? null,
  reg: r.registry_no ?? null,
  born: r.year_of_birth ?? null,
  died: r.year_of_death ?? null,
  color: r.color ?? null,
  country: r.country ?? null,
  disciplines: JSON.parse(r.disciplines || "[]"),
  photoUrl: /^https?:\/\//i.test(r.photo_url ?? "") ? r.photo_url : null,
  photoCredit: r.photo_credit ?? null,
  description: r.description ?? null,
  note: r.bloodline_note ?? null,
  sireName: r.sire_name ?? null,
  damName: r.dam_name ?? null,
  sireId: r.sire_id ?? null,
  damId: r.dam_id ?? null,
  availability: r.availability,
  historic: Boolean(r.is_historic),
}));

const template = fs.readFileSync(TEMPLATE, "utf8");

const marker = /\/\*DATEN\*\/[\s\S]*?\/\*DATEN\*\//;
if (!marker.test(template)) {
  console.error("In vorschau/_seite.html fehlt die Markierung /*DATEN*/…/*DATEN*/.");
  process.exit(1);
}

// </script> im Datenblock würde das umgebende script-Element vorzeitig beenden.
const json = JSON.stringify(horses).replace(/<\//g, "<\\/");
const body = template.replace(marker, `/*DATEN*/${json}/*DATEN*/`);

const standalone = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Westernhengste – Hengstverzeichnis</title>
</head>
<body>
${body}
</body>
</html>
`;

fs.mkdirSync(path.join(ROOT, "vorschau"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "vorschau", "westernhengste.html"), standalone);
fs.writeFileSync(path.join(ROOT, "vorschau", "inhalt.html"), body);

const kb = (standalone.length / 1024).toFixed(0);
console.log(`${horses.length} Pferde eingebaut.`);
console.log(`vorschau/westernhengste.html  (${kb} KB) - zum Doppelklicken`);
console.log("vorschau/inhalt.html          - zum Veröffentlichen");
