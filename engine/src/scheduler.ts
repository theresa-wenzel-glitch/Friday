/**
 * Schritt 6 der Pipeline — Terminierung. Reine Berechnung, kein Modell.
 *
 * Rückwärtsterminierung vom Zieldatum, Aufgaben in freie Arbeitstage verteilt,
 * unter Berücksichtigung von Kapazität, Wochenenden, Feiertagen und
 * blockierten Tagen. Siehe docs/10-ki-planungs-engine.md, Schritt 6.
 */
import { topologicalOrder } from "./validator.js";
import type {
  GeneratedMilestone,
  GeneratedPlan,
  GoalInput,
  ScheduledMilestone,
  ScheduledPlan,
  ScheduledTask,
} from "./types.js";

const MS_PER_DAY = 86_400_000;

/** Anteil der Kapazität, der als Puffer frei bleibt. */
export const BUFFER_RATIO = 0.2;

export function schedulePlan(
  plan: GeneratedPlan,
  input: GoalInput,
  startDate: Date = new Date(),
): ScheduledPlan {
  const start = atMidnight(startDate);
  // blockedDates kommen bereits als ISO-Strings — nicht erneut konvertieren.
  const blocked = new Set(input.blockedDates ?? []);
  const holidays = germanHolidays(
    start.getFullYear(),
    start.getFullYear() + 4,
    input.state,
  );

  const byRef = new Map(plan.milestones.map((m) => [m.ref, m]));
  const windows = new Map<string, { start: Date; end: Date }>();

  // Vorwärtsplanung entlang der topologischen Ordnung: Ein Meilenstein
  // beginnt, sobald alle Vorbedingungen abgeschlossen sind.
  for (const ref of topologicalOrder(plan.milestones)) {
    const m = byRef.get(ref)!;
    const earliest = m.dependsOn
      .map((d) => windows.get(d)?.end)
      .filter((d): d is Date => !!d)
      .reduce((latest, d) => (d > latest ? d : latest), start);

    const msStart = addDays(earliest, m.dependsOn.length > 0 ? 1 : 0);
    windows.set(ref, { start: msStart, end: addDays(msStart, m.durationDays) });
  }

  const milestones: ScheduledMilestone[] = plan.milestones.map((m) => {
    const w = windows.get(m.ref)!;
    return {
      ...m,
      windowStart: isoDate(w.start),
      windowEnd: isoDate(w.end),
      tasks: distributeTasks(m, w.start, w.end, input, blocked, holidays),
    };
  });

  const end = milestones.reduce(
    (latest, m) => (m.windowEnd > latest ? m.windowEnd : latest),
    isoDate(start),
  );

  return {
    summary: plan.summary,
    assumptions: plan.assumptions,
    risks: plan.risks,
    milestones,
    startDate: isoDate(start),
    endDate: end,
  };
}

/**
 * Verteilt die Aufgaben eines Meilensteins auf Arbeitstage im Zeitfenster.
 * Die Tageskapazität ergibt sich aus der Wochenkapazität abzüglich Puffer.
 */
function distributeTasks(
  milestone: GeneratedMilestone,
  windowStart: Date,
  windowEnd: Date,
  input: GoalInput,
  blocked: Set<string>,
  holidays: Set<string>,
): ScheduledTask[] {
  const workdays = workdaysBetween(windowStart, windowEnd, input, blocked, holidays);
  if (workdays.length === 0) {
    return milestone.tasks.map((t) => ({ ...t, dueAt: isoDate(windowEnd) }));
  }

  const usableWeekly = input.weeklyCapacityMin * (1 - BUFFER_RATIO);
  const workdaysPerWeek = input.includeWeekends ? 7 : 5;
  const dailyCapacity = Math.max(30, usableWeekly / workdaysPerWeek);

  const scheduled: ScheduledTask[] = [];
  let dayIndex = 0;
  let usedToday = 0;

  // Blockierende Aufgaben zuerst — sie halten den Meilenstein auf.
  const ordered = [...milestone.tasks].sort(
    (a, b) => Number(b.blocking) - Number(a.blocking),
  );

  for (const task of ordered) {
    if (usedToday > 0 && usedToday + task.estimatedMin > dailyCapacity) {
      dayIndex = Math.min(dayIndex + 1, workdays.length - 1);
      usedToday = 0;
    }
    scheduled.push({ ...task, dueAt: isoDate(workdays[dayIndex]!) });
    usedToday += task.estimatedMin;

    if (usedToday >= dailyCapacity) {
      dayIndex = Math.min(dayIndex + 1, workdays.length - 1);
      usedToday = 0;
    }
  }

  // Ursprüngliche Reihenfolge wiederherstellen, Termine bleiben zugeordnet.
  return milestone.tasks.map(
    (t) => scheduled.find((s) => s.title === t.title) ?? { ...t, dueAt: isoDate(windowEnd) },
  );
}

export function workdaysBetween(
  from: Date,
  to: Date,
  input: GoalInput,
  blocked: Set<string>,
  holidays: Set<string>,
): Date[] {
  const days: Date[] = [];
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
    const iso = isoDate(d);
    const weekday = d.getDay();
    const isWeekend = weekday === 0 || weekday === 6;

    if (isWeekend && !input.includeWeekends) continue;
    if (blocked.has(iso) || holidays.has(iso)) continue;
    days.push(new Date(d));
  }
  return days;
}

/* -------------------------------------------------------------------------- */
/* Datumshilfen                                                               */
/* -------------------------------------------------------------------------- */

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function atMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Gesetzliche Feiertage in Deutschland. Bundesweit plus die verbreitetsten
 * landesspezifischen Tage. Bewusst schlank gehalten — für V1 ausreichend,
 * für den Produktivbetrieb später gegen eine gepflegte Quelle austauschen.
 */
export function germanHolidays(
  fromYear: number,
  toYear: number,
  state?: string,
): Set<string> {
  const days = new Set<string>();

  for (let year = fromYear; year <= toYear; year++) {
    const easter = easterSunday(year);
    const fixed: [number, number][] = [
      [0, 1], // Neujahr
      [4, 1], // Tag der Arbeit
      [9, 3], // Tag der Deutschen Einheit
      [11, 25], // 1. Weihnachtstag
      [11, 26], // 2. Weihnachtstag
    ];

    for (const [month, day] of fixed) {
      days.add(isoDate(new Date(Date.UTC(year, month, day))));
    }

    // Bewegliche Feiertage, relativ zum Ostersonntag
    for (const offset of [-2, 1, 39, 50]) {
      days.add(isoDate(addDays(easter, offset)));
    }

    const catholic = ["BY", "BW", "NW", "RP", "SL", "HE", "SN", "TH"];
    if (state && catholic.includes(state)) {
      days.add(isoDate(addDays(easter, 60))); // Fronleichnam
    }
    if (state && ["BY", "SL"].includes(state)) {
      days.add(isoDate(new Date(Date.UTC(year, 7, 15)))); // Mariä Himmelfahrt
    }
    if (state && ["BB", "MV", "SN", "ST", "TH", "HH", "HB", "NI", "SH"].includes(state)) {
      days.add(isoDate(new Date(Date.UTC(year, 9, 31)))); // Reformationstag
    }
    if (state && ["BW", "BY", "ST"].includes(state)) {
      days.add(isoDate(new Date(Date.UTC(year, 0, 6)))); // Heilige Drei Könige
    }
  }

  return days;
}

/** Osterformel nach Gauss (anonyme gregorianische Variante). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
