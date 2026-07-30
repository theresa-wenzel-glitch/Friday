#!/usr/bin/env node
/**
 * Kommandozeile der Planungs-Engine.
 *
 *   npm run plan -- "Ich möchte in 18 Monaten ein Café in Leipzig eröffnen" \
 *                   --hours 6 --deadline 2027-06-01 --state SN --budget 28000
 *   npm run validate -- pfad/zu/plan.json --hours 6
 *   npm run playbooks
 *
 * `plan` braucht ANTHROPIC_API_KEY. `validate` und `playbooks` laufen ohne.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { AnthropicPlanningModel, hasCredentials } from "./model/client.js";
import { loadPlaybooks, requiredNodes, riskiestNode, getPlaybook } from "./playbooks/index.js";
import { runPipeline } from "./pipeline.js";
import { GeneratedPlanSchema, toGeneratedPlan } from "./schema.js";
import { planToMarkdown, renderResult, renderValidation } from "./render.js";
import { schedulePlan } from "./scheduler.js";
import { validatePlan } from "./validator.js";
import type { GoalInput } from "./types.js";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "plan":
    await cmdPlan(args.slice(1));
    break;
  case "validate":
    cmdValidate(args.slice(1));
    break;
  case "schedule":
    cmdSchedule(args.slice(1));
    break;
  case "playbooks":
    cmdPlaybooks();
    break;
  default:
    usage();
    process.exit(command ? 1 : 0);
}

/* -------------------------------------------------------------------------- */

async function cmdPlan(argv: string[]): Promise<void> {
  const goal = argv.find((a) => !a.startsWith("--"));
  if (!goal) {
    console.error("Fehlt: die Zielbeschreibung.\n");
    usage();
    process.exit(1);
  }

  if (!hasCredentials()) {
    console.error(
      "\nKein ANTHROPIC_API_KEY in der Umgebung.\n\n" +
        "Die Planerzeugung braucht einen Schlüssel:\n" +
        "  export ANTHROPIC_API_KEY=sk-ant-...\n\n" +
        "Ohne Schlüssel laufen: `npm run validate`, `npm run schedule`, " +
        "`npm run playbooks`, `npm test`.\n",
    );
    process.exit(2);
  }

  const input = buildInput(goal, argv);
  const started = Date.now();

  const result = await runPipeline(input, {
    model: new AnthropicPlanningModel(),
    onStep: (step, detail) => {
      const label = {
        classify: "1/6 Klassifiziere Ziel",
        retrieve: "2/6 Suche passende Playbooks",
        generate: "3/6 Erzeuge Plan",
        repair: "5/6 Repariere Plan",
        schedule: "6/6 Terminiere",
      }[step] ?? step;
      console.error(`  ${label}${detail ? ` — ${detail}` : ""}`);
    },
  });

  console.log(renderResult(result));
  console.error(`Gesamtlaufzeit: ${((Date.now() - started) / 1000).toFixed(1)} s`);

  const outFlag = argv.indexOf("--out");
  if (outFlag !== -1 && argv[outFlag + 1]) {
    const path = argv[outFlag + 1]!;
    const payload = path.endsWith(".md")
      ? result.plan
        ? planToMarkdown(result.plan)
        : ""
      : JSON.stringify(result, null, 2);
    writeFileSync(path, payload);
    console.error(`Geschrieben: ${path}`);
  }

  if (!result.validation.valid || result.refusal) process.exit(1);
}

function cmdValidate(argv: string[]): void {
  const path = argv.find((a) => !a.startsWith("--"));
  if (!path) {
    console.error("Fehlt: Pfad zur Plan-JSON-Datei.");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(path, "utf8"));
  const parsed = GeneratedPlanSchema.safeParse(raw.plan ?? raw);

  if (!parsed.success) {
    console.error("\n✗ [Regel 1] Schemaverstoß:\n");
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const plan = toGeneratedPlan(parsed.data);
  const input = buildInput("", argv);
  const intentKey = flag(argv, "--intent");
  const template = intentKey ? getPlaybook(intentKey) : undefined;

  const result = validatePlan(plan, {
    input,
    requiredPlaybookNodes: template ? requiredNodes(template) : [],
  });

  console.log(renderValidation(result.issues, 0));
  process.exit(result.valid ? 0 : 1);
}

function cmdSchedule(argv: string[]): void {
  const path = argv.find((a) => !a.startsWith("--"));
  if (!path) {
    console.error("Fehlt: Pfad zur Plan-JSON-Datei.");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(path, "utf8"));
  const plan = toGeneratedPlan(GeneratedPlanSchema.parse(raw.plan ?? raw));
  const scheduled = schedulePlan(plan, buildInput("", argv));
  console.log(JSON.stringify(scheduled, null, 2));
}

function cmdPlaybooks(): void {
  const playbooks = loadPlaybooks();
  console.log(`\n${playbooks.length} Playbook(s) geladen:\n`);

  for (const p of playbooks) {
    const risky = riskiestNode(p);
    const unreviewed = p.reviewStatus === "unreviewed_draft";
    console.log(`  ${p.intentKey}  v${p.version}  [${p.region}]`);
    console.log(`    ${p.title}`);
    console.log(
      `    ${p.nodes.length} Knoten · ${p.nodes.filter((n) => n.mandatory).length} Pflicht · ` +
        `${p.edges.length} Kanten · Stichprobe ${p.sampleSize} · Konfidenz ${p.confidence}`,
    );
    if (risky) {
      console.log(
        `    Kritischster Knoten: ${risky.title} (${(risky.dropoutRate * 100).toFixed(0)} % Abbruch)`,
      );
    }
    if (unreviewed) {
      console.log(`    \x1b[33m! Fachlich noch nicht geprüft — nicht produktionstauglich\x1b[0m`);
    }
    console.log();
  }
}

/* -------------------------------------------------------------------------- */

function buildInput(goal: string, argv: string[]): GoalInput {
  const hours = Number(flag(argv, "--hours") ?? 6);
  return {
    rawInput: goal,
    weeklyCapacityMin: Math.round(hours * 60),
    targetDate: flag(argv, "--deadline"),
    budgetEur: flag(argv, "--budget") ? Number(flag(argv, "--budget")) : undefined,
    postalPrefix: flag(argv, "--plz"),
    state: flag(argv, "--state"),
    experience: flag(argv, "--experience") as GoalInput["experience"],
    includeWeekends: argv.includes("--weekends"),
  };
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
}

function usage(): void {
  console.log(`
Atlas Planungs-Engine

  npm run plan -- "<Ziel>" [Optionen]     Plan erzeugen (braucht API-Key)
  npm run validate -- <plan.json>         Plan gegen die 9 Regeln prüfen
  npm run schedule -- <plan.json>         Plan terminieren
  npm run playbooks                       Geladene Playbooks anzeigen
  npm run eval                            Evaluation gegen den Goldstandard

Optionen
  --hours <n>        verfügbare Stunden pro Woche (Standard 6)
  --deadline <ISO>   Zieltermin, z. B. 2027-06-01
  --budget <n>       Budget in Euro
  --plz <präfix>     erste drei Stellen der PLZ
  --state <kürzel>   Bundesland, z. B. SN (steuert Feiertage)
  --experience <e>   none | some | professional
  --weekends         Wochenenden stehen zur Verfügung
  --intent <key>     Playbook erzwingen (validate)
  --out <datei>      Ergebnis als .json oder .md schreiben

Beispiel
  npm run plan -- "Ich möchte in 18 Monaten ein Café in Leipzig eröffnen" \\
    --hours 6 --deadline 2027-06-01 --state SN --budget 28000
`);
}
