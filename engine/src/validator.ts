/**
 * Der deterministische Validator — Schritt 4 der Pipeline.
 *
 * Enthält bewusst KEIN Modell. Ob ein Plan zyklenfrei ist und ob 40 Stunden
 * Arbeit in eine Woche mit 6 verfügbaren Stunden passen, ist berechenbar —
 * und wird berechnet, nicht geraten. Siehe docs/10-ki-planungs-engine.md.
 *
 * Neun Regeln. Regel 1 (Schemakonformität) läuft vorgelagert in schema.ts.
 */
import { MAX_TASK_MINUTES } from "./schema.js";
import type {
  GeneratedMilestone,
  GeneratedPlan,
  ValidationContext,
  ValidationIssue,
  ValidationResult,
} from "./types.js";

/** Toleranz auf die Wochenkapazität (Regel 5). 20 % Puffer nach oben. */
export const CAPACITY_TOLERANCE = 1.2;

const MS_PER_DAY = 86_400_000;

export function validatePlan(
  plan: GeneratedPlan,
  ctx: ValidationContext,
): ValidationResult {
  const issues: ValidationIssue[] = [
    ...checkReferences(plan),
    ...checkAcyclic(plan),
    ...checkTotalDuration(plan, ctx),
    ...checkWeeklyLoad(plan, ctx),
    ...checkDefinitionOfDone(plan),
    ...checkTaskSize(plan),
    ...checkRequiredNodes(plan, ctx),
    ...checkUnsourcedFacts(plan),
  ];

  return { valid: !issues.some((i) => i.severity === "error"), issues };
}

/** Regel 3 — alle `dependsOn`-Referenzen existieren, keine Selbstbezüge. */
function checkReferences(plan: GeneratedPlan): ValidationIssue[] {
  const refs = new Set(plan.milestones.map((m) => m.ref));
  const issues: ValidationIssue[] = [];

  for (const m of plan.milestones) {
    for (const dep of m.dependsOn) {
      if (dep === m.ref) {
        issues.push({
          rule: 3,
          severity: "error",
          code: "self_dependency",
          message: `Meilenstein "${m.ref}" hängt von sich selbst ab.`,
          milestoneRef: m.ref,
        });
      } else if (!refs.has(dep)) {
        issues.push({
          rule: 3,
          severity: "error",
          code: "missing_dependency",
          message: `Meilenstein "${m.ref}" verweist auf "${dep}", das es im Plan nicht gibt.`,
          milestoneRef: m.ref,
        });
      }
    }
  }

  const seen = new Set<string>();
  for (const m of plan.milestones) {
    if (seen.has(m.ref)) {
      issues.push({
        rule: 3,
        severity: "error",
        code: "duplicate_ref",
        message: `Die Meilenstein-Kennung "${m.ref}" kommt mehrfach vor.`,
        milestoneRef: m.ref,
      });
    }
    seen.add(m.ref);
  }

  return issues;
}

/** Regel 2 — der Abhängigkeitsgraph ist azyklisch (Kahn-Algorithmus). */
function checkAcyclic(plan: GeneratedPlan): ValidationIssue[] {
  const order = topologicalOrder(plan.milestones);
  if (order.length === plan.milestones.length) return [];

  const unresolved = plan.milestones
    .filter((m) => !order.includes(m.ref))
    .map((m) => m.ref);

  return [
    {
      rule: 2,
      severity: "error",
      code: "cycle_detected",
      message:
        `Die Meilensteine ${unresolved.join(", ")} bilden einen Zyklus. ` +
        `Jeder Plan muss eine gültige Reihenfolge haben.`,
    },
  ];
}

/**
 * Topologische Sortierung. Gibt die Kennungen in gültiger Reihenfolge zurück;
 * ist das Ergebnis kürzer als die Eingabe, existiert ein Zyklus.
 */
export function topologicalOrder(milestones: GeneratedMilestone[]): string[] {
  const known = new Set(milestones.map((m) => m.ref));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const m of milestones) {
    const deps = m.dependsOn.filter((d) => known.has(d) && d !== m.ref);
    indegree.set(m.ref, deps.length);
    for (const d of deps) {
      dependents.set(d, [...(dependents.get(d) ?? []), m.ref]);
    }
  }

  const queue = milestones
    .filter((m) => (indegree.get(m.ref) ?? 0) === 0)
    .map((m) => m.ref);
  const order: string[] = [];

  while (queue.length > 0) {
    const ref = queue.shift()!;
    order.push(ref);
    for (const next of dependents.get(ref) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  return order;
}

/**
 * Länge des kritischen Pfads in Tagen. Meilensteine ohne Abhängigkeit
 * voneinander laufen parallel — eine simple Summe wäre zu pessimistisch.
 */
export function criticalPathDays(milestones: GeneratedMilestone[]): number {
  const byRef = new Map(milestones.map((m) => [m.ref, m]));
  const finish = new Map<string, number>();

  for (const ref of topologicalOrder(milestones)) {
    const m = byRef.get(ref)!;
    const start = Math.max(
      0,
      ...m.dependsOn.map((d) => finish.get(d) ?? 0),
    );
    finish.set(ref, start + m.durationDays);
  }

  return Math.max(0, ...finish.values());
}

/** Regel 4 — der kritische Pfad passt in den verfügbaren Zeitraum. */
function checkTotalDuration(
  plan: GeneratedPlan,
  ctx: ValidationContext,
): ValidationIssue[] {
  if (!ctx.input.targetDate) return [];

  const start = ctx.startDate ?? new Date();
  const target = new Date(ctx.input.targetDate);
  if (Number.isNaN(target.getTime())) return [];

  const availableDays = Math.floor((target.getTime() - start.getTime()) / MS_PER_DAY);
  const requiredDays = criticalPathDays(plan.milestones);

  if (requiredDays <= availableDays) return [];

  return [
    {
      rule: 4,
      severity: "error",
      code: "exceeds_timeframe",
      message:
        `Der Plan braucht ${requiredDays} Tage, bis zum Zieltermin sind aber nur ` +
        `${availableDays} Tage verfügbar. Es fehlen ${requiredDays - availableDays} Tage. ` +
        `Kürze Meilensteindauern oder reduziere den Umfang.`,
    },
  ];
}

/**
 * Regel 5 — die wöchentliche Aufgabenlast überschreitet die Kapazität nicht.
 *
 * Praktisch die wichtigste Regel: Modelle neigen zu Optimismus. Ohne diese
 * Prüfung entstehen Pläne mit 20 Wochenstunden für Menschen, die 6 haben —
 * der sicherste Weg zum Abbruch in Woche drei.
 */
function checkWeeklyLoad(
  plan: GeneratedPlan,
  ctx: ValidationContext,
): ValidationIssue[] {
  const capacity = ctx.input.weeklyCapacityMin;
  if (!capacity || capacity <= 0) return [];

  const limit = capacity * CAPACITY_TOLERANCE;
  const issues: ValidationIssue[] = [];

  for (const m of plan.milestones) {
    const load = weeklyLoadMinutes(m);
    if (load > limit) {
      issues.push({
        rule: 5,
        severity: "error",
        code: "capacity_exceeded",
        message:
          `Meilenstein "${m.ref}" verlangt ${Math.round(load)} Minuten pro Woche, ` +
          `verfügbar sind ${capacity} (Grenze mit Puffer: ${Math.round(limit)}). ` +
          `Verlängere die Dauer oder verkleinere die Aufgaben.`,
        milestoneRef: m.ref,
      });
    }
  }

  return issues;
}

export function weeklyLoadMinutes(m: GeneratedMilestone): number {
  const total = m.tasks.reduce((sum, t) => sum + t.estimatedMin, 0);
  const weeks = Math.max(m.durationDays / 7, 1 / 7);
  return total / weeks;
}

/** Regel 6 — jeder Meilenstein hat eine prüfbare Ergebnisdefinition. */
function checkDefinitionOfDone(plan: GeneratedPlan): ValidationIssue[] {
  const vague = /^(fertig|erledigt|abgeschlossen|done)\.?$/i;

  return plan.milestones
    .filter((m) => m.definitionOfDone.trim().length < 15 || vague.test(m.definitionOfDone.trim()))
    .map((m) => ({
      rule: 6,
      severity: "error" as const,
      code: "weak_definition_of_done",
      message:
        `Meilenstein "${m.ref}" hat keine prüfbare Ergebnisdefinition. ` +
        `Beschreibe konkret, woran der Abschluss erkennbar ist.`,
      milestoneRef: m.ref,
    }));
}

/** Regel 7 — keine Aufgabe dauert länger als einen Arbeitstag. */
function checkTaskSize(plan: GeneratedPlan): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const m of plan.milestones) {
    for (const t of m.tasks) {
      if (t.estimatedMin > MAX_TASK_MINUTES) {
        issues.push({
          rule: 7,
          severity: "error",
          code: "task_too_large",
          message:
            `Aufgabe "${t.title}" in "${m.ref}" dauert ${t.estimatedMin} Minuten. ` +
            `Mehr als ${MAX_TASK_MINUTES} Minuten ist keine Aufgabe, sondern ein Meilenstein.`,
          milestoneRef: m.ref,
        });
      }
    }
  }

  return issues;
}

/** Regel 8 — Pflichtknoten des Playbooks sind im Plan enthalten. */
function checkRequiredNodes(
  plan: GeneratedPlan,
  ctx: ValidationContext,
): ValidationIssue[] {
  const required = ctx.requiredPlaybookNodes ?? [];
  if (required.length === 0) return [];

  const present = new Set(
    plan.milestones.map((m) => m.playbookNodeId).filter((id): id is string => !!id),
  );

  return required
    .filter((node) => !present.has(node.id))
    .map((node) => ({
      rule: 8,
      severity: "error" as const,
      code: "missing_required_node",
      message: `Der Pflichtschritt "${node.title}" (${node.id}) fehlt im Plan.`,
    }));
}

/**
 * Regel 9 — keine unbelegten Zahlen-, Fristen- oder Behördenangaben.
 *
 * Heuristik, bewusst als Warnung: erfundene Gebührenhöhen, Formularnummern und
 * Fristen sind der gefährlichste Halluzinationstyp in dieser Domäne, weil sie
 * glaubwürdig aussehen. Treffer werden zur Umformulierung als Rechercheschritt
 * markiert, nicht automatisch verworfen.
 */
const UNSOURCED_PATTERNS: { code: string; pattern: RegExp; hint: string }[] = [
  {
    code: "specific_fee",
    pattern: /\b\d{1,4}(?:[.,]\d{2})?\s?(?:€|EUR|Euro)\b/,
    hint: "konkrete Gebühren-/Betragsangabe",
  },
  {
    code: "specific_deadline",
    pattern: /\binnerhalb\s+von\s+\d+\s+(?:Tagen|Wochen|Monaten)\b/i,
    hint: "konkrete Frist",
  },
  {
    code: "legal_reference",
    pattern: /§\s?\d+/,
    hint: "Paragrafenverweis",
  },
  {
    code: "form_number",
    pattern: /\b(?:Formular|Vordruck|Anlage)\s+[A-Z0-9][A-Z0-9\/-]{1,10}\b/,
    hint: "Formularnummer",
  },
];

function checkUnsourcedFacts(plan: GeneratedPlan): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const m of plan.milestones) {
    const texts = [
      m.definitionOfDone,
      ...m.tasks.flatMap((t) => [t.title, t.why, t.how ?? ""]),
    ];

    for (const { code, pattern, hint } of UNSOURCED_PATTERNS) {
      const hit = texts.find((text) => pattern.test(text));
      if (!hit) continue;

      issues.push({
        rule: 9,
        severity: "warning",
        code,
        message:
          `Meilenstein "${m.ref}" enthält eine ${hint} ("${hit.match(pattern)?.[0]}"), ` +
          `die nicht aus einer geprüften Quelle stammt. Als Rechercheschritt formulieren.`,
        milestoneRef: m.ref,
      });
    }
  }

  return issues;
}

/** Fasst die Befunde für die Reparaturschleife zusammen (Schritt 5). */
export function formatIssuesForRepair(issues: ValidationIssue[]): string {
  return issues
    .filter((i) => i.severity === "error")
    .map((i) => `- [Regel ${i.rule}/${i.code}] ${i.message}`)
    .join("\n");
}
