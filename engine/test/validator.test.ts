import { describe, expect, it } from "vitest";
import {
  criticalPathDays,
  topologicalOrder,
  validatePlan,
  weeklyLoadMinutes,
} from "../src/validator.js";
import { input, milestone, task, validPlan } from "./fixtures.js";

const ctx = { input, startDate: new Date("2026-01-01T00:00:00Z") };

describe("Validator", () => {
  it("akzeptiert einen regelkonformen Plan", () => {
    const result = validatePlan(validPlan(), ctx);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  describe("Regel 2 — Zyklenfreiheit", () => {
    it("erkennt einen direkten Zyklus", () => {
      const plan = validPlan();
      plan.milestones[0]!.dependsOn = ["m2"];
      plan.milestones[1]!.dependsOn = ["m1"];

      const result = validatePlan(plan, ctx);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "cycle_detected")).toBe(true);
    });

    it("erkennt einen längeren Zyklus über drei Knoten", () => {
      const plan = validPlan();
      plan.milestones[0]!.dependsOn = ["m3"];
      plan.milestones[1]!.dependsOn = ["m1"];
      plan.milestones[2]!.dependsOn = ["m2"];

      expect(validatePlan(plan, ctx).issues.some((i) => i.code === "cycle_detected")).toBe(true);
    });

    it("erkennt Selbstbezug", () => {
      const plan = validPlan();
      plan.milestones[2]!.dependsOn = ["m3"];
      expect(validatePlan(plan, ctx).issues.some((i) => i.code === "self_dependency")).toBe(true);
    });
  });

  describe("Regel 3 — Referenzen", () => {
    it("erkennt eine fehlende Abhängigkeit", () => {
      const plan = validPlan();
      plan.milestones[1]!.dependsOn = ["gibt-es-nicht"];

      const result = validatePlan(plan, ctx);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "missing_dependency")).toBe(true);
    });

    it("erkennt doppelte Kennungen", () => {
      const plan = validPlan();
      plan.milestones[4]!.ref = "m1";
      expect(validatePlan(plan, ctx).issues.some((i) => i.code === "duplicate_ref")).toBe(true);
    });
  });

  describe("Regel 4 — Zeitrahmen", () => {
    it("erkennt einen Plan, der über den Zieltermin hinausgeht", () => {
      const plan = validPlan();
      for (const m of plan.milestones) m.durationDays = 400;

      const result = validatePlan(plan, ctx);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "exceeds_timeframe")).toBe(true);
    });

    it("greift nicht ohne Zieltermin", () => {
      const plan = validPlan();
      for (const m of plan.milestones) m.durationDays = 400;

      const result = validatePlan(plan, { input: { ...input, targetDate: undefined } });
      expect(result.issues.some((i) => i.code === "exceeds_timeframe")).toBe(false);
    });

    it("rechnet parallele Meilensteine nicht doppelt", () => {
      const parallel = [
        milestone("a", { durationDays: 30 }),
        milestone("b", { durationDays: 30 }),
        milestone("c", { durationDays: 30, dependsOn: ["a", "b"] }),
      ];
      // a und b laufen parallel: kritischer Pfad ist 30 + 30 = 60, nicht 90.
      expect(criticalPathDays(parallel)).toBe(60);
    });
  });

  describe("Regel 5 — Wochenkapazität", () => {
    it("erkennt eine Überlastung", () => {
      const plan = validPlan();
      // 8 Aufgaben à 400 Minuten in 7 Tagen = 3200 Min/Woche bei 360 verfügbaren.
      plan.milestones[0]!.durationDays = 7;
      plan.milestones[0]!.tasks = Array.from({ length: 8 }, (_, i) => task(`A${i}`, 400));

      const result = validatePlan(plan, ctx);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "capacity_exceeded")).toBe(true);
    });

    it("erlaubt 20 Prozent Puffer nach oben", () => {
      const plan = validPlan();
      plan.milestones[0]!.durationDays = 7;
      // 420 Minuten in einer Woche = 360 × 1,17 → innerhalb der Toleranz.
      plan.milestones[0]!.tasks = [task("A", 210), task("B", 210)];

      expect(validatePlan(plan, ctx).valid).toBe(true);
    });

    it("berechnet die Wochenlast korrekt", () => {
      const m = milestone("x", {
        durationDays: 14,
        tasks: [task("A", 300), task("B", 300)],
      });
      // 600 Minuten auf 2 Wochen = 300 pro Woche
      expect(weeklyLoadMinutes(m)).toBe(300);
    });
  });

  describe("Regel 6 — Ergebnisdefinition", () => {
    it("erkennt eine zu schwache Definition", () => {
      const plan = validPlan();
      plan.milestones[0]!.definitionOfDone = "fertig";

      const result = validatePlan(plan, ctx);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "weak_definition_of_done")).toBe(true);
    });
  });

  describe("Regel 7 — Aufgabengröße", () => {
    it("erkennt eine zu große Aufgabe", () => {
      const plan = validPlan();
      plan.milestones[0]!.durationDays = 200;
      plan.milestones[0]!.tasks = [task("Riesig", 600), task("Klein", 30)];

      const result = validatePlan(plan, ctx);
      expect(result.issues.some((i) => i.code === "task_too_large")).toBe(true);
    });
  });

  describe("Regel 8 — Pflichtknoten", () => {
    it("erkennt einen fehlenden Pflichtknoten", () => {
      const result = validatePlan(validPlan(), {
        ...ctx,
        requiredPlaybookNodes: [{ id: "cafe.permits", title: "Anmeldungen und Erlaubnisse" }],
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.code === "missing_required_node")).toBe(true);
    });

    it("akzeptiert, wenn der Pflichtknoten zugeordnet ist", () => {
      const plan = validPlan();
      plan.milestones[3]!.playbookNodeId = "cafe.permits";

      const result = validatePlan(plan, {
        ...ctx,
        requiredPlaybookNodes: [{ id: "cafe.permits", title: "Anmeldungen und Erlaubnisse" }],
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("Regel 9 — unbelegte Angaben", () => {
    it("warnt bei einer erfundenen Gebührenangabe", () => {
      const plan = validPlan();
      plan.milestones[0]!.tasks[0]!.why = "Die Gewerbeanmeldung kostet 26,00 EUR.";

      const result = validatePlan(plan, ctx);
      expect(result.issues.some((i) => i.code === "specific_fee")).toBe(true);
      // Warnung, kein Fehler — der Plan bleibt gültig.
      expect(result.valid).toBe(true);
    });

    it("warnt bei einem Paragrafenverweis", () => {
      const plan = validPlan();
      plan.milestones[1]!.tasks[0]!.how = "Siehe § 14 der Verordnung.";
      expect(validatePlan(plan, ctx).issues.some((i) => i.code === "legal_reference")).toBe(true);
    });

    it("warnt bei einer konkreten Frist", () => {
      const plan = validPlan();
      plan.milestones[1]!.definitionOfDone =
        "Die Anmeldung ist innerhalb von 14 Tagen nach Aufnahme erfolgt.";
      expect(
        validatePlan(plan, ctx).issues.some((i) => i.code === "specific_deadline"),
      ).toBe(true);
    });
  });
});

describe("topologicalOrder", () => {
  it("liefert eine gültige Reihenfolge", () => {
    const order = topologicalOrder(validPlan().milestones);
    expect(order).toEqual(["m1", "m2", "m3", "m4", "m5"]);
  });

  it("liefert bei einem Zyklus eine kürzere Liste", () => {
    const cyclic = [
      milestone("a", { dependsOn: ["b"] }),
      milestone("b", { dependsOn: ["a"] }),
    ];
    expect(topologicalOrder(cyclic).length).toBeLessThan(2);
  });
});
