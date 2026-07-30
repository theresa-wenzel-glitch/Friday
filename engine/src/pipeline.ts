/**
 * Die achtstufige Planungs-Pipeline aus docs/10-ki-planungs-engine.md.
 *
 *   1 KLASSIFIZIEREN  Haiku       Domäne, intent_key, Machbarkeit, Sicherheit
 *   2 ABRUFEN         Playbooks   Top-5 nach Ähnlichkeit
 *   3 ERZEUGEN        Opus 5      Structured Output
 *   4 VALIDIEREN      deterministisch, 9 Regeln
 *   5 REPARIEREN      Opus 5      max. 2 Durchläufe
 *   6 TERMINIEREN     deterministisch
 *   7 VORLEGEN        (Client)    Nutzer bestätigt
 *   8 LERNEN          (ETL)       Korrekturen zurück in den Graphen
 *
 * Die Schritte 4 und 6 enthalten bewusst kein Modell.
 */
import {
  CLASSIFY_SYSTEM,
  buildCachedSystem,
  buildRepairMessage,
  buildUserMessage,
  buildVolatileSystem,
} from "./model/prompts.js";
import { ModelRefusalError, type PlanningModel } from "./model/client.js";
import { findSimilar, getPlaybook, requiredNodes } from "./playbooks/index.js";
import {
  CLASSIFICATION_JSON_SCHEMA,
  ClassificationSchema,
  GeneratedPlanSchema,
  PLAN_JSON_SCHEMA,
  toGeneratedPlan,
} from "./schema.js";
import { schedulePlan } from "./scheduler.js";
import { formatIssuesForRepair, validatePlan } from "./validator.js";
import type {
  Classification,
  GeneratedPlan,
  GoalInput,
  ModelUsage,
  PipelineResult,
  ValidationResult,
} from "./types.js";

export const MAX_REPAIR_ROUNDS = 2;

/** Antworttexte für Ziele außerhalb des Produktbereichs (docs/14, Teil C). */
const SAFETY_RESPONSES: Record<string, { reason: string; guidance: string }> = {
  mental_health_crisis: {
    reason: "Das Ziel deutet auf eine akute psychische Belastung hin.",
    guidance:
      "Dafür ist Atlas nicht das richtige Werkzeug. Die Telefonseelsorge ist rund um die " +
      "Uhr kostenlos erreichbar, und eine hausärztliche Praxis kann den nächsten Schritt " +
      "einleiten.",
  },
  over_indebtedness: {
    reason: "Das Ziel deutet auf eine Überschuldungssituation hin.",
    guidance:
      "Atlas erstellt dafür keinen Finanzplan. Anerkannte Schuldnerberatungsstellen " +
      "beraten kostenfrei und sind an dieser Stelle deutlich wirksamer.",
  },
  eating_disorder: {
    reason: "Das Ziel enthält Hinweise auf ein gestörtes Essverhalten.",
    guidance:
      "Atlas erstellt dafür keinen Plan zur Gewichtsreduktion. Eine ärztliche oder " +
      "psychotherapeutische Abklärung ist hier der richtige erste Schritt.",
  },
  illegal: {
    reason: "Das Ziel beschreibt ein rechtswidriges Vorhaben.",
    guidance: "Dafür erstellt Atlas keinen Plan.",
  },
  medical_risk: {
    reason: "Das Ziel ist ohne ärztliche Abklärung medizinisch riskant.",
    guidance:
      "Atlas kann dafür einen Plan erstellen — der erste Schritt ist dann aber eine " +
      "ärztliche Abklärung. Bestätige, dass du damit einverstanden bist.",
  },
};

export interface PipelineOptions {
  model: PlanningModel;
  /** Startdatum der Planung. Für Tests fixierbar. */
  today?: Date;
  /** Setzt die Klassifikation außer Kraft (spart einen Aufruf in Tests). */
  forceIntentKey?: string;
  onStep?: (step: string, detail?: string) => void;
}

export async function runPipeline(
  input: GoalInput,
  opts: PipelineOptions,
): Promise<PipelineResult> {
  const today = opts.today ?? new Date();
  const usage: ModelUsage[] = [];
  const step = opts.onStep ?? (() => {});

  /* 1 — Klassifizieren ---------------------------------------------------- */
  step("classify");
  const classification = opts.forceIntentKey
    ? syntheticClassification(opts.forceIntentKey, input)
    : await classify(input, opts.model, usage);

  if (classification.safetyFlag && classification.safetyFlag !== "medical_risk") {
    const response = SAFETY_RESPONSES[classification.safetyFlag]!;
    return {
      classification,
      plan: null,
      validation: { valid: false, issues: [] },
      repairRounds: 0,
      usage,
      totalCostEur: sumCost(usage),
      refusal: response,
    };
  }

  if (classification.feasibility === "unrealistic") {
    return {
      classification,
      plan: null,
      validation: { valid: false, issues: [] },
      repairRounds: 0,
      usage,
      totalCostEur: sumCost(usage),
      refusal: {
        reason: "Das Ziel ist im genannten Zeitrahmen nicht erreichbar.",
        guidance:
          "Atlas erzeugt dafür bewusst keinen Plan, der so tut, als ginge es. " +
          "Zwei Möglichkeiten: den Zeitrahmen erweitern oder ein Zwischenziel setzen.",
      },
    };
  }

  /* 2 — Abrufen ----------------------------------------------------------- */
  step("retrieve");
  const matches = findSimilar(input.rawInput, {
    intentKey: classification.intentKey,
    region: classification.region ?? undefined,
    limit: 5,
  });
  const playbooks = matches.map((m) => m.template);
  const primary = getPlaybook(classification.intentKey) ?? playbooks[0];
  step("retrieve", `${playbooks.length} Playbook(s): ${playbooks.map((p) => p.intentKey).join(", ")}`);

  const cachedSystem = buildCachedSystem(playbooks);
  const volatileSystem = buildVolatileSystem(input, today);
  const ctx = {
    input,
    startDate: today,
    requiredPlaybookNodes: primary ? requiredNodes(primary) : [],
  };

  /* 3 — Erzeugen ---------------------------------------------------------- */
  step("generate");
  let plan: GeneratedPlan;
  try {
    plan = await generate(opts.model, {
      cachedSystem,
      volatileSystem,
      userMessage: buildUserMessage(input),
      usage,
    });
  } catch (err) {
    if (err instanceof ModelRefusalError) {
      return {
        classification,
        plan: null,
        validation: { valid: false, issues: [] },
        repairRounds: 0,
        usage,
        totalCostEur: sumCost(usage),
        refusal: {
          reason: "Die Anfrage wurde von der Sicherheitsprüfung abgelehnt.",
          guidance: err.explanation ?? "Formuliere das Ziel bitte anders.",
        },
      };
    }
    throw err;
  }

  /* 4/5 — Validieren und reparieren --------------------------------------- */
  let validation: ValidationResult = validatePlan(plan, ctx);
  let repairRounds = 0;

  while (!validation.valid && repairRounds < MAX_REPAIR_ROUNDS) {
    repairRounds++;
    step("repair", `Durchlauf ${repairRounds}: ${validation.issues.length} Befund(e)`);

    plan = await generate(opts.model, {
      cachedSystem,
      volatileSystem,
      userMessage: buildRepairMessage(input, formatIssuesForRepair(validation.issues)),
      usage,
    });
    validation = validatePlan(plan, ctx);
  }

  /* 6 — Terminieren ------------------------------------------------------- */
  step("schedule");
  const scheduled = schedulePlan(plan, input, today);

  return {
    classification,
    plan: scheduled,
    validation,
    repairRounds,
    usage,
    totalCostEur: sumCost(usage),
    refusal: null,
  };
}

/* -------------------------------------------------------------------------- */

async function classify(
  input: GoalInput,
  model: PlanningModel,
  usage: ModelUsage[],
): Promise<Classification> {
  const result = await model.call<unknown>({
    tier: "light",
    cachedSystem: CLASSIFY_SYSTEM,
    userMessage: input.rawInput,
    format: CLASSIFICATION_JSON_SCHEMA,
    effort: "low",
    maxTokens: 1024,
  });
  usage.push(result.usage);

  const raw = ClassificationSchema.parse(result.data);
  return {
    domain: raw.domain,
    intentKey: raw.intent_key,
    confidence: raw.confidence,
    region: raw.region,
    feasibility: raw.feasibility,
    missingInfo: raw.missing_info,
    safetyFlag: raw.safety_flag,
  };
}

async function generate(
  model: PlanningModel,
  args: {
    cachedSystem: string;
    volatileSystem: string;
    userMessage: string;
    usage: ModelUsage[];
  },
): Promise<GeneratedPlan> {
  const result = await model.call<unknown>({
    tier: "heavy",
    cachedSystem: args.cachedSystem,
    volatileSystem: args.volatileSystem,
    userMessage: args.userMessage,
    format: PLAN_JSON_SCHEMA,
    effort: "high",
    maxTokens: 16000,
  });
  args.usage.push(result.usage);

  return toGeneratedPlan(GeneratedPlanSchema.parse(result.data));
}

function syntheticClassification(intentKey: string, input: GoalInput): Classification {
  return {
    domain: (intentKey.split(".")[0] as Classification["domain"]) ?? "other",
    intentKey,
    confidence: 1,
    region: input.state ?? null,
    feasibility: "plausible",
    missingInfo: [],
    safetyFlag: null,
  };
}

function sumCost(usage: ModelUsage[]): number {
  return usage.reduce((sum, u) => sum + u.costEur, 0);
}
