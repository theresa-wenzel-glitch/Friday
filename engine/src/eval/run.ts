#!/usr/bin/env node
/**
 * Evaluations-Gate der Planungs-Engine (docs/10, Abschnitt "Evaluation").
 *
 * Regel aus dem Konzept: Kein Modell- oder Prompt-Wechsel geht ohne bestandene
 * Evaluation in Produktion. Dieses Skript ist das Gate — es setzt einen
 * Exit-Code, damit es in CI verwendbar ist.
 *
 *   npm run eval             vollständiger Lauf (braucht API-Key)
 *   npm run eval -- --case cafe-standard
 *   npm run eval -- --dry    nur Struktur- und Abdeckungsprüfung, ohne Modell
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { AnthropicPlanningModel, hasCredentials } from "../model/client.js";
import { findSimilar } from "../playbooks/index.js";
import { runPipeline } from "../pipeline.js";
import type { GoalInput, PipelineResult } from "../types.js";

/** Zielwerte aus docs/10. Unterschreitung = Gate nicht bestanden. */
export const THRESHOLDS = {
  schemaValidFirstTry: 0.97,
  acyclic: 1.0,
  capacityCompliance: 0.95,
  maxRepairRate: 0.08,
  maxMedianLatencyMs: 12_000,
  maxCostPerPlanEur: 0.2,
};

interface GoldCase {
  id: string;
  goal: string;
  input: Record<string, unknown>;
  expect: {
    feasibility?: string;
    intentKeyPrefix?: string;
    planExpected?: boolean;
    minMilestones?: number;
    requiresNode?: string;
    safetyFlag?: string;
    note?: string;
  };
}

const goldset = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "goldset.json"), "utf8"),
) as { version: number; cases: GoldCase[] };

/**
 * Nur ausführen, wenn direkt aufgerufen — sonst würde jeder Import der
 * Hilfsfunktionen (z. B. aus den Tests) die Evaluation mitstarten.
 */
if (isMainModule()) {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry") || !hasCredentials();
  const caseFlag = argv.indexOf("--case");
  const only = caseFlag !== -1 ? argv[caseFlag + 1] : undefined;
  const cases = only ? goldset.cases.filter((c) => c.id === only) : goldset.cases;

  if (only && cases.length === 0) {
    console.error(`Kein Fall mit der Kennung "${only}" im Goldstandard.`);
    process.exit(1);
  }

  if (dryRun) runDry(cases);
  else await runFull(cases);
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return !!entry && import.meta.url === pathToFileURL(entry).href;
}

/* -------------------------------------------------------------------------- */

/**
 * Trockenlauf ohne Modell: prüft die Struktur des Goldstandards und die
 * Playbook-Abdeckung. Beantwortet die Frage "für wie viele Fälle haben wir
 * überhaupt erfahrungsgestützten Kontext?".
 */
function runDry(cases: GoldCase[]): void {
  console.log(`\nEvaluation — Trockenlauf (kein API-Key oder --dry)\n`);
  console.log(`${cases.length} Fälle im Goldstandard v${goldset.version}\n`);

  let covered = 0;
  let planExpected = 0;

  for (const c of cases) {
    const matches = findSimilar(c.goal, { limit: 3 });
    const best = matches[0];
    const hasCover = !!best && best.score > 0.15;
    if (hasCover) covered++;
    if (c.expect.planExpected !== false) planExpected++;

    const mark = hasCover ? "\x1b[32m✓\x1b[0m" : "\x1b[33m·\x1b[0m";
    const label = best ? `${best.template.intentKey} (${best.score.toFixed(2)})` : "kein Playbook";
    console.log(`  ${mark} ${c.id.padEnd(24)} ${label}`);
  }

  const rate = covered / cases.length;
  console.log(
    `\nPlaybook-Abdeckung: ${covered}/${cases.length} (${(rate * 100).toFixed(0)} %)`,
  );
  console.log(`Fälle mit erwartetem Plan: ${planExpected}/${cases.length}`);
  console.log(
    `\n\x1b[2mFür den vollständigen Lauf: export ANTHROPIC_API_KEY=... && npm run eval\x1b[0m\n`,
  );
}

async function runFull(cases: GoldCase[]): Promise<void> {
  console.log(`\nEvaluation — vollständiger Lauf, ${cases.length} Fälle\n`);

  const model = new AnthropicPlanningModel();
  const results: { c: GoldCase; r: PipelineResult | null; error?: string; ms: number }[] = [];

  for (const c of cases) {
    const started = Date.now();
    process.stderr.write(`  ${c.id.padEnd(24)} `);

    try {
      const r = await runPipeline(toInput(c), { model });
      const ms = Date.now() - started;
      results.push({ c, r, ms });
      process.stderr.write(
        `${verdict(c, r)} ${(ms / 1000).toFixed(1)}s ${r.totalCostEur.toFixed(3)}€\n`,
      );
    } catch (err) {
      const ms = Date.now() - started;
      results.push({ c, r: null, error: String(err), ms });
      process.stderr.write(`\x1b[31mFEHLER\x1b[0m ${String(err).slice(0, 80)}\n`);
    }
  }

  report(results);
}

function toInput(c: GoldCase): GoalInput {
  const raw = c.input as Partial<GoalInput> & { targetDate?: string };
  return {
    rawInput: c.goal,
    weeklyCapacityMin: raw.weeklyCapacityMin ?? 360,
    targetDate: resolveRelativeDate(raw.targetDate),
    budgetEur: raw.budgetEur,
    postalPrefix: raw.postalPrefix,
    state: raw.state,
    experience: raw.experience,
    alreadyStarted: raw.alreadyStarted,
    includeWeekends: raw.includeWeekends,
  };
}

/** Wandelt Angaben wie "+18m" oder "+7d" in ein absolutes Datum. */
export function resolveRelativeDate(value: string | undefined, from = new Date()): string | undefined {
  if (!value) return undefined;
  const m = /^\+(\d+)([dwmy])$/.exec(value);
  if (!m) return value;

  const n = Number(m[1]);
  const d = new Date(from);
  switch (m[2]) {
    case "d": d.setUTCDate(d.getUTCDate() + n); break;
    case "w": d.setUTCDate(d.getUTCDate() + n * 7); break;
    case "m": d.setUTCMonth(d.getUTCMonth() + n); break;
    case "y": d.setUTCFullYear(d.getUTCFullYear() + n); break;
  }
  return d.toISOString().slice(0, 10);
}

function verdict(c: GoldCase, r: PipelineResult): string {
  const ok = checkExpectations(c, r).length === 0;
  return ok ? "\x1b[32mOK\x1b[0m    " : "\x1b[33mABW\x1b[0m   ";
}

/** Prüft die Erwartungen eines Goldstandard-Falls. */
export function checkExpectations(c: GoldCase, r: PipelineResult): string[] {
  const problems: string[] = [];
  const e = c.expect;

  if (e.planExpected === true && !r.plan) problems.push("Plan erwartet, keiner erzeugt");
  if (e.planExpected === false && r.plan) problems.push("kein Plan erwartet, aber einer erzeugt");
  if (e.feasibility && r.classification.feasibility !== e.feasibility) {
    problems.push(`feasibility ${r.classification.feasibility}, erwartet ${e.feasibility}`);
  }
  if (e.intentKeyPrefix && !r.classification.intentKey.startsWith(e.intentKeyPrefix)) {
    problems.push(`intentKey ${r.classification.intentKey}, erwartet Präfix ${e.intentKeyPrefix}`);
  }
  if (e.safetyFlag && r.classification.safetyFlag !== e.safetyFlag) {
    problems.push(`safetyFlag ${r.classification.safetyFlag}, erwartet ${e.safetyFlag}`);
  }
  if (e.minMilestones && (r.plan?.milestones.length ?? 0) < e.minMilestones) {
    problems.push(`nur ${r.plan?.milestones.length ?? 0} Meilensteine, erwartet ≥ ${e.minMilestones}`);
  }
  if (e.requiresNode && r.plan) {
    const present = r.plan.milestones.some((m) => m.playbookNodeId === e.requiresNode);
    if (!present) problems.push(`Pflichtknoten ${e.requiresNode} fehlt`);
  }

  return problems;
}

function report(
  results: { c: GoldCase; r: PipelineResult | null; error?: string; ms: number }[],
): void {
  const withPlan = results.filter((x) => x.r?.plan);
  const n = results.length;

  const firstTryValid = results.filter((x) => x.r && x.r.repairRounds === 0 && x.r.validation.valid).length;
  const repaired = results.filter((x) => x.r && x.r.repairRounds > 0).length;
  const capacityOk = withPlan.filter(
    (x) => !x.r!.validation.issues.some((i) => i.code === "capacity_exceeded"),
  ).length;
  const cyclic = withPlan.filter(
    (x) => x.r!.validation.issues.some((i) => i.code === "cycle_detected"),
  ).length;
  const deviations = results.filter((x) => x.r && checkExpectations(x.c, x.r).length > 0);
  const errors = results.filter((x) => !x.r);

  const latencies = results.map((x) => x.ms).sort((a, b) => a - b);
  const medianLatency = latencies[Math.floor(latencies.length / 2)] ?? 0;
  const costs = results.map((x) => x.r?.totalCostEur ?? 0);
  const avgCost = costs.reduce((a, b) => a + b, 0) / Math.max(costs.length, 1);

  console.log("\n" + "─".repeat(64));
  console.log("Ergebnis\n");

  const rows: [string, string, boolean][] = [
    ["Schemavalidität 1. Versuch", pct(firstTryValid / n), firstTryValid / n >= THRESHOLDS.schemaValidFirstTry],
    ["Zyklenfreiheit", pct(1 - cyclic / Math.max(withPlan.length, 1)), cyclic === 0],
    ["Kapazitätskonformität", pct(capacityOk / Math.max(withPlan.length, 1)), capacityOk / Math.max(withPlan.length, 1) >= THRESHOLDS.capacityCompliance],
    ["Reparaturquote", pct(repaired / n), repaired / n <= THRESHOLDS.maxRepairRate],
    ["Median-Latenz", `${(medianLatency / 1000).toFixed(1)} s`, medianLatency <= THRESHOLDS.maxMedianLatencyMs],
    ["Kosten je Plan (Ø)", `${avgCost.toFixed(3)} €`, avgCost <= THRESHOLDS.maxCostPerPlanEur],
  ];

  for (const [label, value, ok] of rows) {
    const mark = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    console.log(`  ${mark} ${label.padEnd(30)} ${value}`);
  }

  if (deviations.length > 0) {
    console.log(`\n  Abweichungen von den Erwartungen (${deviations.length}):`);
    for (const d of deviations) {
      console.log(`    ${d.c.id}: ${checkExpectations(d.c, d.r!).join("; ")}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n  \x1b[31mFehler (${errors.length}):\x1b[0m`);
    for (const e of errors) console.log(`    ${e.c.id}: ${e.error?.slice(0, 120)}`);
  }

  const passed = rows.every(([, , ok]) => ok) && errors.length === 0;
  console.log("\n" + "─".repeat(64));
  console.log(
    passed
      ? "\x1b[32mGate bestanden.\x1b[0m Änderung darf in Produktion.\n"
      : "\x1b[31mGate NICHT bestanden.\x1b[0m Änderung bleibt draußen.\n",
  );

  console.log(
    "\x1b[2mHinweis: Die automatischen Metriken prüfen Struktur, nicht Inhalt.\n" +
      "Die menschliche Stichprobenbewertung (30 Pläne, 5 Kriterien) bleibt\n" +
      "zusätzlich erforderlich — siehe docs/10.\x1b[0m\n",
  );

  process.exit(passed ? 0 : 1);
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)} %`;
}
