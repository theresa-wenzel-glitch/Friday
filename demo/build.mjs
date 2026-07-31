#!/usr/bin/env node
/**
 * Baut die eigenständige Vorschau-HTML.
 *
 *   node demo/build.mjs
 *
 * Setzt die Playbook-Daten aus engine/src/playbooks/data/ in die Vorlage ein,
 * statt sie abzutippen — so kann die Vorschau nicht von den echten Daten
 * abweichen. Ergebnis: demo/atlas-vorschau.html, eine Datei ohne Abhängigkeiten.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "engine", "src", "playbooks", "data");

const playbooks = readdirSync(dataDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(dataDir, f), "utf8")))
  // Nur die Felder, die die Vorschau tatsächlich braucht.
  .map((p) => ({
    intentKey: p.intentKey,
    title: p.title,
    sampleSize: p.sampleSize,
    nodes: p.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      definitionOfDone: n.definitionOfDone,
      typicalDurationDays: n.typicalDurationDays,
      dropoutRate: n.dropoutRate,
      successCorrelates: n.successCorrelates,
      requiredBefore: n.requiredBefore,
    })),
  }));

const template = readFileSync(join(here, "template.html"), "utf8");
const marker = "/*__PLAYBOOKS__*/[]";

if (!template.includes(marker)) {
  console.error(`Platzhalter ${marker} fehlt in template.html.`);
  process.exit(1);
}

const html = template.replace(marker, JSON.stringify(playbooks, null, 2));
const out = join(here, "atlas-vorschau.html");
writeFileSync(out, html);

const nodes = playbooks.reduce((n, p) => n + p.nodes.length, 0);
console.log(
  `Geschrieben: ${out}\n` +
    `  ${playbooks.length} Playbooks, ${nodes} Knoten, ${(html.length / 1024).toFixed(1)} KB`,
);
