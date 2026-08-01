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

// Daten und Planer-Code werden eingesetzt, nicht abgetippt: eine Quelle für
// die Vorschau und für demo/test/planner.test.mjs.
const parts = {
  "/*__PLAYBOOKS__*/[]": JSON.stringify(playbooks, null, 2),
  "/*__ARCHETYPES__*/[]": readFileSync(join(here, "planner", "archetypes.json"), "utf8").trim(),
  "/*__DOMAINS__*/[]": readFileSync(join(here, "planner", "domains.json"), "utf8").trim(),
  "/*__PLANNER__*/": readFileSync(join(here, "planner", "planner.js"), "utf8"),
};

let html = template;
for (const [marker, value] of Object.entries(parts)) {
  if (!html.includes(marker)) {
    console.error(`Platzhalter ${marker} fehlt in template.html.`);
    process.exit(1);
  }
  html = html.replace(marker, () => value);
}

// Syntaxprüfung des eingebetteten Skripts. Ein Tippfehler im Inline-JavaScript
// macht die Datei sonst vollständig funktionslos, ohne dass man es der Datei
// ansieht — genau das ist schon einmal passiert (ein deutsches Schlusszeichen
// in einer Zeichenkette mit geraden Anführungszeichen).
const scriptStart = html.indexOf(">", html.indexOf("<script")) + 1;
const scriptEnd = html.lastIndexOf("</script>");
const js = html.slice(scriptStart, scriptEnd);
try {
  new Function(js);
} catch (err) {
  const line = js.slice(0, err.lineNumber ?? 0).split("\n").length;
  console.error(`Syntaxfehler im eingebetteten Skript: ${err.message}`);
  console.error(`Prüfe demo/template.html (etwa Zeile ${line} des Skriptblocks).`);
  process.exit(1);
}

// Ohne JavaScript muss der Anmeldebildschirm sichtbar sein — iOS-Vorschaufenster
// (Mail, Nachrichten, Dateien) führen keine Skripte aus.
if (/<section id="view-auth"[^>]*\bclass="[^"]*\bhidden\b/.test(html)) {
  console.error('view-auth darf nicht "hidden" sein — sonst bleibt die Seite ohne JavaScript leer.');
  process.exit(1);
}
if (!html.includes("<noscript>")) {
  console.error("Der noscript-Hinweis fehlt.");
  process.exit(1);
}

const out = join(here, "atlas-vorschau.html");
writeFileSync(out, html);

// Zweite Fassung für gehostete Seiten, die das Dokumentgerüst selbst mitbringen:
// nur <title>, <style>, Inhalt und <script> — ohne doctype, html, head, body.
const head = html.slice(html.indexOf("<title>"), html.indexOf("</head>"));
const body = html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.lastIndexOf("</body>"));
const hosted = `${head.trim()}\n${body.trim()}\n`;
const outHosted = join(here, "atlas-gehostet.html");
writeFileSync(outHosted, hosted);

const nodes = playbooks.reduce((n, p) => n + p.nodes.length, 0);
const archetypes = JSON.parse(parts["/*__ARCHETYPES__*/[]"]);
const domains = JSON.parse(parts["/*__DOMAINS__*/[]"]);
console.log(
  `Geschrieben: ${out}\n` +
    `  ${playbooks.length} Playbooks (${nodes} Knoten), ` +
    `${domains.length} Fachmodule, ${archetypes.length} Grundmuster, ` +
    `${(html.length / 1024).toFixed(1)} KB\n` +
    `Geschrieben: ${outHosted} (${(hosted.length / 1024).toFixed(1)} KB, ohne Dokumentgerüst)`,
);
