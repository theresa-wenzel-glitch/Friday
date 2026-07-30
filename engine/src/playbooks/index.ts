/**
 * Playbook-Speicher — Schritt 2 der Pipeline.
 *
 * V1 lädt die redaktionellen Playbooks aus JSON-Dateien und wählt per
 * Stichwortähnlichkeit aus. Sobald der Playbook-Graph aus realen Verläufen
 * wächst, ersetzt eine Vektorsuche (`pgvector`, HNSW) die Auswahl hier —
 * die Schnittstelle `findSimilar` bleibt dabei unverändert.
 *
 * Siehe docs/09-datenmodell.md.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PlaybookNode, PlaybookTemplate } from "../types.js";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "data");

let cache: PlaybookTemplate[] | null = null;

export function loadPlaybooks(): PlaybookTemplate[] {
  if (cache) return cache;

  cache = readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(DATA_DIR, f), "utf8")) as PlaybookTemplate);

  return cache;
}

export function getPlaybook(intentKey: string): PlaybookTemplate | undefined {
  return loadPlaybooks().find((p) => p.intentKey === intentKey);
}

export interface PlaybookMatch {
  template: PlaybookTemplate;
  score: number;
}

/**
 * Findet die ähnlichsten Playbooks. Platzhalter für die spätere Vektorsuche:
 * exakter Treffer auf den Intent-Key, sonst Stichwortüberdeckung.
 */
export function findSimilar(
  query: string,
  opts: { intentKey?: string; region?: string; limit?: number; minConfidence?: number } = {},
): PlaybookMatch[] {
  const { intentKey, region, limit = 5, minConfidence = 0.4 } = opts;
  const terms = tokenize(query);

  return loadPlaybooks()
    .filter((p) => p.confidence >= minConfidence)
    .filter((p) => !region || p.region === region || region.startsWith(p.region))
    .map((template) => {
      let score = overlap(terms, tokenize(`${template.title} ${template.intentKey}`));
      if (intentKey && template.intentKey === intentKey) score += 1;
      else if (intentKey && sharesPrefix(template.intentKey, intentKey)) score += 0.4;
      return { template, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Pflichtknoten eines Playbooks — Grundlage für Validator-Regel 8. */
export function requiredNodes(template: PlaybookTemplate): { id: string; title: string }[] {
  return template.nodes
    .filter((n) => n.mandatory)
    .map((n) => ({ id: n.id, title: n.title }));
}

/**
 * Verdichtet ein Playbook für den Prompt. Genau dieser Kontext ist der
 * Unterschied zwischen Atlas und einem Chatbot: Mediandauern, Streuung,
 * Abbruchquoten und Erfolgs-Korrelate aus realen Verläufen.
 */
export function toPromptContext(template: PlaybookTemplate): string {
  const lines: string[] = [
    `## Playbook: ${template.title} (${template.intentKey}, v${template.version}, Region ${template.region})`,
    `Stichprobe: ${template.sampleSize} reale Verläufe · Konfidenz ${template.confidence.toFixed(2)} · Quelle: ${template.source}`,
    "",
    "### Domänenhinweise",
    ...template.domainNotes.map((n) => `- ${n}`),
    "",
    "### Knoten",
  ];

  for (const n of template.nodes) {
    lines.push(
      `- **${n.id}** — ${n.title}${n.mandatory ? " [PFLICHT]" : ""}`,
      `  Fertig, wenn: ${n.definitionOfDone}`,
      `  Dauer: Median ${n.typicalDurationDays} Tage (p10 ${n.p10DurationDays}, p90 ${n.p90DurationDays})`,
      `  Abbruchquote an diesem Knoten: ${(n.dropoutRate * 100).toFixed(0)} %`,
      `  Vorbedingungen: ${n.requiredBefore.length ? n.requiredBefore.join(", ") : "keine"}`,
      `  Was Erfolgreiche anders machen: ${n.successCorrelates.join("; ")}`,
    );
  }

  const notable = template.edges.filter((e) => Math.abs(e.successDelta) >= 0.1);
  if (notable.length > 0) {
    lines.push("", "### Reihenfolgen mit belegtem Effekt");
    for (const e of notable) {
      const dir = e.successDelta > 0 ? "erhöht" : "senkt";
      lines.push(
        `- ${e.from} → ${e.to}: kommt in ${(e.frequency * 100).toFixed(0)} % der Verläufe vor, ` +
          `${dir} die Abschlusswahrscheinlichkeit um ${Math.abs(e.successDelta * 100).toFixed(0)} Prozentpunkte`,
      );
    }
  }

  return lines.join("\n");
}

/** Knoten mit der höchsten Abbruchquote — die kritischste Stelle im Pfad. */
export function riskiestNode(template: PlaybookTemplate): PlaybookNode | undefined {
  return [...template.nodes].sort((a, b) => b.dropoutRate - a.dropoutRate)[0];
}

/* -------------------------------------------------------------------------- */

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-zäöüß0-9]+/g, " ")
      .split(" ")
      .filter((t) => t.length > 3),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let hits = 0;
  for (const t of a) if (b.has(t)) hits++;
  return b.size === 0 ? 0 : hits / b.size;
}

function sharesPrefix(a: string, b: string): boolean {
  const [pa] = a.split(".");
  const [pb] = b.split(".");
  return pa === pb;
}
