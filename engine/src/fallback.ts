/**
 * Rückfall auf ein Playbook-Template als Direktplan.
 *
 * Zwei Aufgaben:
 *
 * 1. Letzte Stufe der Ausfallsicherheit (docs/08): Wenn das Modell ausfällt
 *    oder zwei Reparaturdurchläufe nicht reichen, bekommt der Mensch trotzdem
 *    einen Plan. Grundsatz aus dem Konzept: Es darf keinen Zustand geben, in
 *    dem ein Nutzer ohne Plan dasteht.
 *
 * 2. Demonstrationsbetrieb ohne API-Key — die Oberfläche ist damit vollständig
 *    bedienbar, bevor der erste Euro für Modellaufrufe ausgegeben wird.
 *
 * Der Plan ist bewusst gröber als ein erzeugter: Er personalisiert nicht, er
 * strukturiert nur. Genau das ist der Unterschied, den das Modell ausmacht.
 */
import type {
  GeneratedMilestone,
  GeneratedPlan,
  GeneratedTask,
  GoalInput,
  PlaybookNode,
  PlaybookTemplate,
} from "./types.js";
import { MAX_TASK_MINUTES } from "./schema.js";

export function planFromPlaybook(
  template: PlaybookTemplate,
  input: GoalInput,
): GeneratedPlan {
  const nodes = orderNodes(template);
  const milestones = nodes.map((node) => toMilestone(node, input));

  return {
    summary:
      `${template.title} — strukturierter Plan aus dem Playbook „${template.intentKey}". ` +
      `${milestones.length} Etappen über rund ${totalDays(milestones)} Tage.`,
    assumptions: [
      "Dieser Plan stammt direkt aus dem Playbook und ist nicht auf deine Situation zugeschnitten.",
      `Die Zeitangaben sind Mediandauern aus dem Playbook (Stichprobe: ${template.sampleSize}).`,
      ...(input.experience === "none"
        ? ["Angenommen, du hast in diesem Bereich keine Vorerfahrung."]
        : []),
    ],
    risks: nodes
      .filter((n) => n.dropoutRate >= 0.2)
      .map((n) => ({
        milestoneRef: n.id,
        risk:
          `An dieser Stelle geben laut Playbook ${(n.dropoutRate * 100).toFixed(0)} % ` +
          `der Menschen auf — der kritischste Punkt im ganzen Verlauf.`,
        mitigation:
          n.successCorrelates[0] ??
          "Schneide diesen Meilenstein in kleinere Schritte und hole dir Rückmeldung von außen.",
      })),
    milestones,
  };
}

/** Topologische Reihenfolge über `requiredBefore`. */
function orderNodes(template: PlaybookTemplate): PlaybookNode[] {
  const byId = new Map(template.nodes.map((n) => [n.id, n]));
  const placed = new Set<string>();
  const ordered: PlaybookNode[] = [];

  let progress = true;
  while (progress && ordered.length < template.nodes.length) {
    progress = false;
    for (const node of template.nodes) {
      if (placed.has(node.id)) continue;
      if (node.requiredBefore.every((r) => placed.has(r) || !byId.has(r))) {
        ordered.push(node);
        placed.add(node.id);
        progress = true;
      }
    }
  }

  // Bei einem Zyklus im Playbook: Rest anhängen statt scheitern.
  for (const node of template.nodes) {
    if (!placed.has(node.id)) ordered.push(node);
  }

  return ordered;
}

function toMilestone(node: PlaybookNode, input: GoalInput): GeneratedMilestone {
  return {
    ref: node.id,
    title: node.title,
    definitionOfDone: node.definitionOfDone,
    durationDays: node.typicalDurationDays,
    dependsOn: node.requiredBefore,
    origin: "playbook",
    playbookNodeId: node.id,
    tasks: buildTasks(node, input),
  };
}

/**
 * Aufgaben aus den Playbook-Angaben ableiten. Die Zuschnittgröße richtet sich
 * nach der Wochenkapazität, damit Validator-Regel 5 auch hier eingehalten wird.
 */
function buildTasks(node: PlaybookNode, input: GoalInput): GeneratedTask[] {
  const weeks = Math.max(node.typicalDurationDays / 7, 1);
  const budgetMin = Math.floor(input.weeklyCapacityMin * weeks * 0.7);

  const drafts: { title: string; why: string; blocking: boolean }[] = [
    {
      title: `${node.title}: Überblick verschaffen und Vorgehen festlegen`,
      why: "Ein klarer Startpunkt verhindert, dass dieser Meilenstein liegen bleibt.",
      blocking: true,
    },
    ...node.successCorrelates.slice(0, 2).map((c) => ({
      title: c,
      why: "Das unterscheidet laut Playbook diejenigen, die abschließen, von denen, die aufgeben.",
      blocking: false,
    })),
    {
      title: `Prüfen: ${shorten(node.definitionOfDone)}`,
      why: "Der Meilenstein gilt erst als erledigt, wenn dieses Ergebnis vorliegt.",
      blocking: true,
    },
  ];

  const perTask = Math.min(
    MAX_TASK_MINUTES,
    Math.max(30, Math.floor(budgetMin / drafts.length)),
  );

  return drafts.map((d, i) => ({
    title: d.title,
    why: d.why,
    how: null,
    estimatedMin: i === 0 ? Math.min(perTask, 60) : perTask,
    difficulty: perTask <= 30 ? "micro" : perTask <= 120 ? "small" : "medium",
    blocking: d.blocking,
    resourceHints: node.commonBlockers,
  }));
}

function shorten(s: string, max = 90): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

function totalDays(milestones: GeneratedMilestone[]): number {
  return milestones.reduce((sum, m) => sum + m.durationDays, 0);
}
