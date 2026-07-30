import { describe, expect, it } from "vitest";
import {
  ClassificationSchema,
  GeneratedPlanSchema,
  MAX_MILESTONES,
  MAX_TASK_MINUTES,
  MIN_MILESTONES,
  PLAN_JSON_SCHEMA,
  toGeneratedPlan,
} from "../src/schema.js";
import { estimateCostEur, PRICING } from "../src/model/client.js";
import { resolveRelativeDate } from "../src/eval/run.js";

const rawPlan = {
  summary: "Ein Plan für die Eröffnung eines Cafés.",
  assumptions: ["Keine gastronomische Vorerfahrung."],
  risks: [{ milestone_ref: "m1", risk: "Verzögerung", mitigation: "Puffer einplanen" }],
  milestones: Array.from({ length: MIN_MILESTONES }, (_, i) => ({
    ref: `m${i + 1}`,
    title: `Meilenstein ${i + 1}`,
    definition_of_done: "Fertig, wenn das Ergebnis schriftlich vorliegt und geprüft wurde.",
    duration_days: 30,
    depends_on: i === 0 ? [] : [`m${i}`],
    origin: "playbook" as const,
    playbook_node_id: null,
    tasks: [
      {
        title: "Aufgabe A",
        why: "Begründung",
        how: null,
        estimated_min: 90,
        difficulty: "medium" as const,
        blocking: false,
        resource_hints: [],
      },
      {
        title: "Aufgabe B",
        why: "Begründung",
        how: "Anleitung",
        estimated_min: 60,
        difficulty: "small" as const,
        blocking: true,
        resource_hints: ["ihk-leitfaden"],
      },
    ],
  })),
};

describe("Plan-Schema", () => {
  it("akzeptiert eine gültige Modellausgabe", () => {
    expect(GeneratedPlanSchema.safeParse(rawPlan).success).toBe(true);
  });

  it("lehnt zu wenige Meilensteine ab", () => {
    const tooFew = { ...rawPlan, milestones: rawPlan.milestones.slice(0, MIN_MILESTONES - 1) };
    expect(GeneratedPlanSchema.safeParse(tooFew).success).toBe(false);
  });

  it("lehnt zu viele Meilensteine ab", () => {
    const tooMany = {
      ...rawPlan,
      milestones: Array.from({ length: MAX_MILESTONES + 1 }, () => rawPlan.milestones[0]!),
    };
    expect(GeneratedPlanSchema.safeParse(tooMany).success).toBe(false);
  });

  it("lehnt eine Aufgabe über der Zeitobergrenze ab", () => {
    const tooLong = structuredClone(rawPlan);
    tooLong.milestones[0]!.tasks[0]!.estimated_min = MAX_TASK_MINUTES + 1;
    expect(GeneratedPlanSchema.safeParse(tooLong).success).toBe(false);
  });

  it("lehnt einen Meilenstein mit nur einer Aufgabe ab", () => {
    const single = structuredClone(rawPlan);
    single.milestones[0]!.tasks = [single.milestones[0]!.tasks[0]!];
    expect(GeneratedPlanSchema.safeParse(single).success).toBe(false);
  });

  it("JSON-Schema und zod-Schema stimmen in den Grenzwerten überein", () => {
    const ms = PLAN_JSON_SCHEMA.schema.properties.milestones;
    expect(ms.minItems).toBe(MIN_MILESTONES);
    expect(ms.maxItems).toBe(MAX_MILESTONES);
    expect(ms.items.properties.tasks.items.properties.estimated_min.maximum).toBe(
      MAX_TASK_MINUTES,
    );
  });

  it("JSON-Schema verbietet zusätzliche Felder", () => {
    expect(PLAN_JSON_SCHEMA.schema.additionalProperties).toBe(false);
    expect(PLAN_JSON_SCHEMA.schema.properties.milestones.items.additionalProperties).toBe(false);
  });

  it("wandelt snake_case in die Domänentypen um", () => {
    const plan = toGeneratedPlan(GeneratedPlanSchema.parse(rawPlan));

    expect(plan.milestones[0]!.definitionOfDone).toBeDefined();
    expect(plan.milestones[0]!.tasks[0]!.estimatedMin).toBe(90);
    expect(plan.risks[0]!.milestoneRef).toBe("m1");
  });
});

describe("Klassifikations-Schema", () => {
  it("akzeptiert eine gültige Klassifikation", () => {
    const ok = {
      domain: "founding",
      intent_key: "founding.gastronomy.cafe",
      confidence: 0.94,
      region: "SN",
      feasibility: "plausible",
      missing_info: ["budget"],
      safety_flag: null,
    };
    expect(ClassificationSchema.safeParse(ok).success).toBe(true);
  });

  it("lehnt eine Konfidenz außerhalb von 0 bis 1 ab", () => {
    const bad = {
      domain: "founding",
      intent_key: "x",
      confidence: 1.5,
      region: null,
      feasibility: "plausible",
      missing_info: [],
      safety_flag: null,
    };
    expect(ClassificationSchema.safeParse(bad).success).toBe(false);
  });
});

describe("Kostenschätzung", () => {
  it("rechnet Opus-5-Token korrekt in Euro um", () => {
    // 1 Mio. Eingabe + 1 Mio. Ausgabe = 5 $ + 25 $ = 30 $ → 27,60 €
    const cost = estimateCostEur("claude-opus-5", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    });
    expect(cost).toBeCloseTo(27.6, 2);
  });

  it("bewertet Cache-Lesen mit einem Zehntel des Eingabepreises", () => {
    const full = estimateCostEur("claude-opus-5", {
      inputTokens: 100_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    });
    const cached = estimateCostEur("claude-opus-5", {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 100_000,
      cacheCreationTokens: 0,
    });
    expect(cached).toBeCloseTo(full * 0.1, 5);
  });

  it("bleibt ein Erstplan unter dem Zielwert von 0,20 Euro", () => {
    // Kalkulation aus docs/11: 18.000 Eingabe (60 % gecacht), 6.000 Ausgabe.
    const cost = estimateCostEur("claude-opus-5", {
      inputTokens: 7_200,
      outputTokens: 6_000,
      cacheReadTokens: 10_800,
      cacheCreationTokens: 0,
    });
    expect(cost).toBeLessThan(0.2);
  });

  it("kennt die Preise aller drei Modellstufen", () => {
    expect(PRICING["claude-opus-5"]).toEqual({ input: 5, output: 25 });
    expect(PRICING["claude-sonnet-5"]).toEqual({ input: 3, output: 15 });
    expect(PRICING["claude-haiku-4-5"]).toEqual({ input: 1, output: 5 });
  });
});

describe("Relative Datumsangaben im Goldstandard", () => {
  const from = new Date("2026-01-15T00:00:00Z");

  it("löst Monate auf", () => {
    expect(resolveRelativeDate("+18m", from)).toBe("2027-07-15");
  });

  it("löst Tage auf", () => {
    expect(resolveRelativeDate("+7d", from)).toBe("2026-01-22");
  });

  it("lässt absolute Datumsangaben unverändert", () => {
    expect(resolveRelativeDate("2027-06-01", from)).toBe("2027-06-01");
  });

  it("gibt undefined zurück, wenn nichts angegeben ist", () => {
    expect(resolveRelativeDate(undefined, from)).toBeUndefined();
  });
});
