import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planFromPlaybook } from "../src/fallback.js";
import { getPlaybook } from "../src/playbooks/index.js";
import { validatePlan } from "../src/validator.js";
import { schedulePlan } from "../src/scheduler.js";
import {
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  progressOf,
  setTaskStatus,
  taskKey,
} from "../src/store.js";
import { input } from "./fixtures.js";

describe("Playbook-Direktplan (Rückfall und Demobetrieb)", () => {
  const cafe = getPlaybook("founding.gastronomy.cafe")!;

  it("erzeugt einen Plan aus jedem Playbook", () => {
    for (const key of [
      "founding.gastronomy.cafe",
      "founding.services.freelance",
      "founding.retail.online",
    ]) {
      const plan = planFromPlaybook(getPlaybook(key)!, input);
      expect(plan.milestones.length).toBeGreaterThanOrEqual(5);
      expect(plan.summary.length).toBeGreaterThan(20);
    }
  });

  it("hält die Kapazitätsregel ein", () => {
    const plan = planFromPlaybook(cafe, input);
    const issues = validatePlan(plan, { input }).issues;
    expect(issues.filter((i) => i.code === "capacity_exceeded")).toHaveLength(0);
  });

  it("hält die Kapazitätsregel auch bei sehr wenig Zeit ein", () => {
    const tight = { ...input, weeklyCapacityMin: 60 };
    const plan = planFromPlaybook(cafe, tight);
    const issues = validatePlan(plan, { input: tight }).issues;
    expect(issues.filter((i) => i.code === "capacity_exceeded")).toHaveLength(0);
  });

  it("erzeugt keine Aufgabe über der Zeitobergrenze", () => {
    const generous = { ...input, weeklyCapacityMin: 40 * 60 };
    const plan = planFromPlaybook(cafe, generous);
    for (const m of plan.milestones) {
      for (const t of m.tasks) expect(t.estimatedMin).toBeLessThanOrEqual(480);
    }
  });

  it("ordnet Meilensteine abhängigkeitskonform und zyklenfrei", () => {
    const plan = planFromPlaybook(cafe, input);
    const issues = validatePlan(plan, { input }).issues;
    expect(issues.filter((i) => i.code === "cycle_detected")).toHaveLength(0);
    expect(issues.filter((i) => i.code === "missing_dependency")).toHaveLength(0);
  });

  it("benennt die Knoten mit hoher Abbruchquote als Risiko", () => {
    const plan = planFromPlaybook(cafe, input);
    expect(plan.risks.some((r) => r.milestoneRef === "cafe.businessplan")).toBe(true);
  });

  it("macht transparent, dass der Plan nicht personalisiert ist", () => {
    const plan = planFromPlaybook(cafe, input);
    expect(plan.assumptions.join(" ")).toContain("nicht auf deine Situation zugeschnitten");
  });

  it("lässt sich terminieren", () => {
    const scheduled = schedulePlan(planFromPlaybook(cafe, input), input, new Date("2026-01-05"));
    expect(scheduled.milestones.every((m) => m.tasks.every((t) => t.dueAt))).toBe(true);
  });
});

const USER = "user-1";

describe("Lokale Persistenz", () => {
  let dir: string;
  const cafe = getPlaybook("founding.gastronomy.cafe")!;

  function makeGoal() {
    const plan = schedulePlan(planFromPlaybook(cafe, input), input, new Date("2026-01-05"));
    return createGoal({
      userId: USER,
      input,
      classification: {
        domain: "founding",
        intentKey: cafe.intentKey,
        confidence: 0.5,
        region: "SN",
        feasibility: "plausible",
        missingInfo: [],
        safetyFlag: null,
      },
      plan,
      demo: true,
      costEur: 0,
    });
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "atlas-test-"));
    process.env.ATLAS_DATA = join(dir, "atlas.json");
  });

  afterEach(() => {
    delete process.env.ATLAS_DATA;
    rmSync(dir, { recursive: true, force: true });
  });

  it("legt ein Ziel an und liest es zurück", () => {
    const goal = makeGoal();
    expect(getGoal(USER, goal.id)?.id).toBe(goal.id);
    expect(listGoals(USER)).toHaveLength(1);
  });

  it("gibt bei leerer Ablage eine leere Liste zurück", () => {
    expect(listGoals(USER)).toEqual([]);
  });

  it("speichert den Aufgabenstatus dauerhaft", () => {
    const goal = makeGoal();
    const first = goal.plan.milestones[0]!;
    const key = taskKey(first.ref, first.tasks[0]!.title);

    setTaskStatus(USER, goal.id, key, "done");
    expect(getGoal(USER, goal.id)?.taskStatus[key]).toBe("done");
  });

  it("entfernt den Eintrag beim Zurücksetzen auf offen", () => {
    const goal = makeGoal();
    const first = goal.plan.milestones[0]!;
    const key = taskKey(first.ref, first.tasks[0]!.title);

    setTaskStatus(USER, goal.id, key, "done");
    setTaskStatus(USER, goal.id, key, "open");
    expect(getGoal(USER, goal.id)?.taskStatus[key]).toBeUndefined();
  });

  it("löscht ein Ziel", () => {
    const goal = makeGoal();
    expect(deleteGoal(USER, goal.id)).toBe(true);
    expect(deleteGoal(USER, goal.id)).toBe(false);
    expect(listGoals(USER)).toHaveLength(0);
  });
});

describe("Fortschritt", () => {
  const cafe = getPlaybook("founding.gastronomy.cafe")!;
  const plan = schedulePlan(planFromPlaybook(cafe, input), input, new Date("2026-01-05"));

  function goalWith(taskStatus: Record<string, "done" | "deferred">) {
    return {
      id: "x",
      userId: USER,
      createdAt: "2026-01-05T00:00:00Z",
      updatedAt: "2026-01-05T00:00:00Z",
      input,
      classification: {
        domain: "founding" as const,
        intentKey: cafe.intentKey,
        confidence: 0.5,
        region: null,
        feasibility: "plausible" as const,
        missingInfo: [],
        safetyFlag: null,
      },
      plan,
      taskStatus,
      demo: true,
      costEur: 0,
    };
  }

  it("zählt bei leerem Status null erledigte Aufgaben", () => {
    const p = progressOf(goalWith({}));
    expect(p.tasksDone).toBe(0);
    expect(p.milestonesDone).toBe(0);
    expect(p.tasksTotal).toBeGreaterThan(0);
  });

  it("liefert die erste offene Aufgabe als nächsten Schritt", () => {
    const first = plan.milestones[0]!;
    const p = progressOf(goalWith({}));
    expect(p.nextTask?.title).toBe(first.tasks[0]!.title);
  });

  it("überspringt zurückgestellte Aufgaben beim nächsten Schritt", () => {
    const first = plan.milestones[0]!;
    const p = progressOf(
      goalWith({ [taskKey(first.ref, first.tasks[0]!.title)]: "deferred" }),
    );
    expect(p.nextTask?.title).toBe(first.tasks[1]!.title);
  });

  it("zählt einen Meilenstein erst als erledigt, wenn alle Aufgaben erledigt sind", () => {
    const first = plan.milestones[0]!;
    const partial = Object.fromEntries(
      first.tasks.slice(0, -1).map((t) => [taskKey(first.ref, t.title), "done" as const]),
    );
    expect(progressOf(goalWith(partial)).milestonesDone).toBe(0);

    const complete = Object.fromEntries(
      first.tasks.map((t) => [taskKey(first.ref, t.title), "done" as const]),
    );
    expect(progressOf(goalWith(complete)).milestonesDone).toBe(1);
  });
});
