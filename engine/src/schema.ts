/**
 * Zwei Darstellungen desselben Plan-Schemas:
 *
 *  - `PLAN_JSON_SCHEMA` geht als `output_config.format` an die API und erzwingt
 *    die Struktur bereits bei der Erzeugung.
 *  - `GeneratedPlanSchema` (zod) prüft die Antwort noch einmal zur Laufzeit.
 *
 * Die Dopplung ist gewollt: Das JSON-Schema muss exakt der API-Erwartung
 * entsprechen, das zod-Schema liefert typsichere Parsergebnisse. Ein Test in
 * test/schema.test.ts stellt sicher, dass beide dasselbe akzeptieren.
 */
import { z } from "zod";

export const MIN_MILESTONES = 5;
export const MAX_MILESTONES = 10;
export const MAX_TASK_MINUTES = 480;

const TaskSchema = z.object({
  title: z.string().min(3),
  why: z.string().min(3),
  how: z.string().nullable(),
  estimated_min: z.number().int().min(5).max(MAX_TASK_MINUTES),
  difficulty: z.enum(["micro", "small", "medium", "large"]),
  blocking: z.boolean(),
  resource_hints: z.array(z.string()),
});

const MilestoneSchema = z.object({
  ref: z.string().min(1),
  title: z.string().min(3),
  definition_of_done: z.string().min(10),
  duration_days: z.number().int().min(1),
  depends_on: z.array(z.string()),
  origin: z.enum(["playbook", "generated"]),
  playbook_node_id: z.string().nullable(),
  tasks: z.array(TaskSchema).min(2).max(12),
});

export const GeneratedPlanSchema = z.object({
  summary: z.string().min(10),
  assumptions: z.array(z.string()),
  risks: z.array(
    z.object({
      milestone_ref: z.string(),
      risk: z.string(),
      mitigation: z.string(),
    }),
  ),
  milestones: z.array(MilestoneSchema).min(MIN_MILESTONES).max(MAX_MILESTONES),
});

export type RawGeneratedPlan = z.infer<typeof GeneratedPlanSchema>;

/** Wird als `output_config.format` an die Messages API übergeben. */
export const PLAN_JSON_SCHEMA = {
  type: "json_schema",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "assumptions", "risks", "milestones"],
    properties: {
      summary: { type: "string" },
      assumptions: { type: "array", items: { type: "string" } },
      risks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["milestone_ref", "risk", "mitigation"],
          properties: {
            milestone_ref: { type: "string" },
            risk: { type: "string" },
            mitigation: { type: "string" },
          },
        },
      },
      milestones: {
        type: "array",
        minItems: MIN_MILESTONES,
        maxItems: MAX_MILESTONES,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "ref",
            "title",
            "definition_of_done",
            "duration_days",
            "depends_on",
            "origin",
            "playbook_node_id",
            "tasks",
          ],
          properties: {
            ref: { type: "string" },
            title: { type: "string" },
            definition_of_done: { type: "string" },
            duration_days: { type: "integer", minimum: 1 },
            depends_on: { type: "array", items: { type: "string" } },
            origin: { type: "string", enum: ["playbook", "generated"] },
            playbook_node_id: { type: ["string", "null"] },
            tasks: {
              type: "array",
              minItems: 2,
              maxItems: 12,
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "title",
                  "why",
                  "how",
                  "estimated_min",
                  "difficulty",
                  "blocking",
                  "resource_hints",
                ],
                properties: {
                  title: { type: "string" },
                  why: { type: "string" },
                  how: { type: ["string", "null"] },
                  estimated_min: {
                    type: "integer",
                    minimum: 5,
                    maximum: MAX_TASK_MINUTES,
                  },
                  difficulty: {
                    type: "string",
                    enum: ["micro", "small", "medium", "large"],
                  },
                  blocking: { type: "boolean" },
                  resource_hints: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

/** Schema der Klassifikationsantwort (Schritt 1). */
export const CLASSIFICATION_JSON_SCHEMA = {
  type: "json_schema",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "domain",
      "intent_key",
      "confidence",
      "region",
      "feasibility",
      "missing_info",
      "safety_flag",
    ],
    properties: {
      domain: {
        type: "string",
        enum: ["founding", "health", "learning", "career", "finance", "other"],
      },
      intent_key: { type: "string" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      region: { type: ["string", "null"] },
      feasibility: {
        type: "string",
        enum: ["plausible", "ambitious", "unrealistic"],
      },
      missing_info: { type: "array", items: { type: "string" } },
      safety_flag: {
        type: ["string", "null"],
        enum: [
          "mental_health_crisis",
          "over_indebtedness",
          "eating_disorder",
          "illegal",
          "medical_risk",
          null,
        ],
      },
    },
  },
} as const;

export const ClassificationSchema = z.object({
  domain: z.enum(["founding", "health", "learning", "career", "finance", "other"]),
  intent_key: z.string(),
  confidence: z.number().min(0).max(1),
  region: z.string().nullable(),
  feasibility: z.enum(["plausible", "ambitious", "unrealistic"]),
  missing_info: z.array(z.string()),
  safety_flag: z
    .enum([
      "mental_health_crisis",
      "over_indebtedness",
      "eating_disorder",
      "illegal",
      "medical_risk",
    ])
    .nullable(),
});

/** Wandelt die snake_case-Modellausgabe in die camelCase-Domänentypen. */
export function toGeneratedPlan(raw: RawGeneratedPlan) {
  return {
    summary: raw.summary,
    assumptions: raw.assumptions,
    risks: raw.risks.map((r) => ({
      milestoneRef: r.milestone_ref,
      risk: r.risk,
      mitigation: r.mitigation,
    })),
    milestones: raw.milestones.map((m) => ({
      ref: m.ref,
      title: m.title,
      definitionOfDone: m.definition_of_done,
      durationDays: m.duration_days,
      dependsOn: m.depends_on,
      origin: m.origin,
      playbookNodeId: m.playbook_node_id,
      tasks: m.tasks.map((t) => ({
        title: t.title,
        why: t.why,
        how: t.how,
        estimatedMin: t.estimated_min,
        difficulty: t.difficulty,
        blocking: t.blocking,
        resourceHints: t.resource_hints,
      })),
    })),
  };
}
