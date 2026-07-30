import type { GeneratedMilestone, GeneratedPlan, GoalInput } from "../src/types.js";

export const input: GoalInput = {
  rawInput: "Ich möchte in 18 Monaten ein Café in Leipzig eröffnen.",
  weeklyCapacityMin: 360,
  targetDate: "2027-06-01",
  budgetEur: 28000,
  state: "SN",
  experience: "some",
};

export function task(title: string, minutes = 90, blocking = false) {
  return {
    title,
    why: `Begründung für ${title}`,
    how: null,
    estimatedMin: minutes,
    difficulty: "medium" as const,
    blocking,
    resourceHints: [],
  };
}

export function milestone(
  ref: string,
  overrides: Partial<GeneratedMilestone> = {},
): GeneratedMilestone {
  return {
    ref,
    title: `Meilenstein ${ref}`,
    definitionOfDone: `Fertig, wenn das Ergebnis von ${ref} schriftlich vorliegt und geprüft wurde.`,
    durationDays: 28,
    dependsOn: [],
    origin: "playbook",
    playbookNodeId: null,
    tasks: [task(`${ref} Aufgabe A`), task(`${ref} Aufgabe B`)],
    ...overrides,
  };
}

/** Ein Plan, der alle neun Regeln erfüllt. */
export function validPlan(): GeneratedPlan {
  return {
    summary: "Ein Plan für die Eröffnung eines Cafés in 18 Monaten.",
    assumptions: ["Angenommen, du hast keine gastronomische Vorerfahrung."],
    risks: [
      {
        milestoneRef: "m3",
        risk: "Die Finanzierung kann sich verzögern.",
        mitigation: "Mehr als ein Kreditinstitut ansprechen.",
      },
    ],
    milestones: [
      milestone("m1"),
      milestone("m2", { dependsOn: ["m1"] }),
      milestone("m3", { dependsOn: ["m2"] }),
      milestone("m4", { dependsOn: ["m3"] }),
      milestone("m5", { dependsOn: ["m4"] }),
    ],
  };
}
