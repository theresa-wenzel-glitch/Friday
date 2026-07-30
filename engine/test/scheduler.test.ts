import { describe, expect, it } from "vitest";
import {
  addDays,
  easterSunday,
  germanHolidays,
  isoDate,
  schedulePlan,
  workdaysBetween,
} from "../src/scheduler.js";
import { input, milestone, task, validPlan } from "./fixtures.js";

const START = new Date("2026-01-05T00:00:00Z"); // ein Montag

describe("Terminierung", () => {
  it("legt jedem Meilenstein ein Zeitfenster zu", () => {
    const scheduled = schedulePlan(validPlan(), input, START);

    expect(scheduled.milestones).toHaveLength(5);
    for (const m of scheduled.milestones) {
      expect(m.windowStart <= m.windowEnd).toBe(true);
      expect(m.windowStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("respektiert Abhängigkeiten: ein Nachfolger startet nach dem Vorgänger", () => {
    const scheduled = schedulePlan(validPlan(), input, START);
    const [m1, m2] = scheduled.milestones;

    expect(m2!.windowStart > m1!.windowEnd).toBe(true);
  });

  it("plant unabhängige Meilensteine parallel", () => {
    const plan = validPlan();
    plan.milestones[1]!.dependsOn = [];

    const scheduled = schedulePlan(plan, input, START);
    expect(scheduled.milestones[0]!.windowStart).toBe(scheduled.milestones[1]!.windowStart);
  });

  it("gibt jeder Aufgabe ein Fälligkeitsdatum im Zeitfenster", () => {
    const scheduled = schedulePlan(validPlan(), input, START);

    for (const m of scheduled.milestones) {
      for (const t of m.tasks) {
        expect(t.dueAt >= m.windowStart).toBe(true);
        expect(t.dueAt <= m.windowEnd).toBe(true);
      }
    }
  });

  it("legt ohne --weekends keine Termine auf Samstag oder Sonntag", () => {
    const scheduled = schedulePlan(validPlan(), input, START);

    for (const m of scheduled.milestones) {
      for (const t of m.tasks) {
        const day = new Date(`${t.dueAt}T00:00:00Z`).getUTCDay();
        expect(day).not.toBe(0);
        expect(day).not.toBe(6);
      }
    }
  });

  it("nutzt Wochenenden, wenn sie freigegeben sind", () => {
    const weekendInput = { ...input, weeklyCapacityMin: 120, includeWeekends: true };
    const plan = validPlan();
    plan.milestones[0]!.durationDays = 14;
    plan.milestones[0]!.tasks = Array.from({ length: 10 }, (_, i) => task(`A${i}`, 60));

    const scheduled = schedulePlan(plan, weekendInput, START);
    const days = scheduled.milestones[0]!.tasks.map((t) =>
      new Date(`${t.dueAt}T00:00:00Z`).getUTCDay(),
    );
    expect(days.some((d) => d === 0 || d === 6)).toBe(true);
  });

  it("überspringt blockierte Tage", () => {
    const blocked = ["2026-01-05", "2026-01-06", "2026-01-07"];
    const scheduled = schedulePlan(validPlan(), { ...input, blockedDates: blocked }, START);

    const firstTasks = scheduled.milestones[0]!.tasks.map((t) => t.dueAt);
    for (const b of blocked) expect(firstTasks).not.toContain(b);
  });

  it("verteilt Aufgaben über mehrere Tage, wenn die Tageskapazität erschöpft ist", () => {
    const plan = validPlan();
    plan.milestones[0]!.durationDays = 21;
    plan.milestones[0]!.tasks = Array.from({ length: 6 }, (_, i) => task(`A${i}`, 120));

    const scheduled = schedulePlan(plan, input, START);
    const distinct = new Set(scheduled.milestones[0]!.tasks.map((t) => t.dueAt));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it("bewahrt die ursprüngliche Aufgabenreihenfolge", () => {
    const plan = validPlan();
    const before = plan.milestones[0]!.tasks.map((t) => t.title);

    const scheduled = schedulePlan(plan, input, START);
    expect(scheduled.milestones[0]!.tasks.map((t) => t.title)).toEqual(before);
  });
});

describe("Feiertage", () => {
  it("berechnet Ostersonntag korrekt", () => {
    expect(isoDate(easterSunday(2026))).toBe("2026-04-05");
    expect(isoDate(easterSunday(2027))).toBe("2027-03-28");
    expect(isoDate(easterSunday(2024))).toBe("2024-03-31");
  });

  it("enthält die bundesweiten Feiertage", () => {
    const days = germanHolidays(2026, 2026);
    expect(days.has("2026-01-01")).toBe(true); // Neujahr
    expect(days.has("2026-05-01")).toBe(true); // Tag der Arbeit
    expect(days.has("2026-10-03")).toBe(true); // Deutsche Einheit
    expect(days.has("2026-12-25")).toBe(true);
    expect(days.has("2026-04-03")).toBe(true); // Karfreitag
    expect(days.has("2026-04-06")).toBe(true); // Ostermontag
  });

  it("berücksichtigt landesspezifische Feiertage", () => {
    expect(germanHolidays(2026, 2026, "SN").has("2026-10-31")).toBe(true); // Reformationstag
    expect(germanHolidays(2026, 2026, "HE").has("2026-10-31")).toBe(false);
    expect(germanHolidays(2026, 2026, "BY").has("2026-08-15")).toBe(true); // Mariä Himmelfahrt
  });

  it("schließt Feiertage aus den Arbeitstagen aus", () => {
    const days = workdaysBetween(
      new Date("2026-04-30T00:00:00Z"),
      new Date("2026-05-04T00:00:00Z"),
      input,
      new Set(),
      germanHolidays(2026, 2026, "SN"),
    ).map(isoDate);

    expect(days).toContain("2026-04-30");
    expect(days).not.toContain("2026-05-01"); // Tag der Arbeit
    expect(days).not.toContain("2026-05-02"); // Samstag
  });
});

describe("Datumshilfen", () => {
  it("addDays überschreitet Monatsgrenzen korrekt", () => {
    expect(isoDate(addDays(new Date("2026-01-30T00:00:00Z"), 3))).toBe("2026-02-02");
  });

  it("addDays behandelt Schaltjahre", () => {
    expect(isoDate(addDays(new Date("2028-02-28T00:00:00Z"), 1))).toBe("2028-02-29");
  });
});

describe("Zusammenspiel mit dem Validator", () => {
  it("ein terminierter Plan endet nicht vor seinem Start", () => {
    const scheduled = schedulePlan(validPlan(), input, START);
    expect(scheduled.endDate >= scheduled.startDate).toBe(true);
  });

  it("übernimmt Zusammenfassung, Annahmen und Risiken unverändert", () => {
    const plan = validPlan();
    const scheduled = schedulePlan(plan, input, START);

    expect(scheduled.summary).toBe(plan.summary);
    expect(scheduled.assumptions).toEqual(plan.assumptions);
    expect(scheduled.risks).toEqual(plan.risks);
  });

  it("kommt mit einem Meilenstein ohne Aufgaben zurecht", () => {
    const plan = validPlan();
    plan.milestones[0]!.tasks = [];
    expect(() => schedulePlan(plan, input, START)).not.toThrow();
  });
});
