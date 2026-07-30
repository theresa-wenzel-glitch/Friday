/**
 * Persistenz für den lokalen Einzelplatzbetrieb.
 *
 * Bewusst eine JSON-Datei, keine Datenbank: Dieser Stand ist zum
 * Selbstausprobieren gedacht, nicht für mehrere Nutzer. Das Schema entspricht
 * aber bereits docs/09-datenmodell.md, sodass der Umstieg auf Postgres später
 * ein Austausch dieser Datei ist und keine Umstellung des Produkts.
 *
 * Ablage: $ATLAS_DATA oder ~/.atlas/atlas.json
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Classification, GoalInput, ScheduledPlan } from "./types.js";

export type TaskStatus = "open" | "done" | "deferred";

export interface StoredGoal {
  id: string;
  createdAt: string;
  updatedAt: string;
  input: GoalInput;
  classification: Classification;
  plan: ScheduledPlan;
  /** Schlüssel: `${milestoneRef}::${taskTitle}` */
  taskStatus: Record<string, TaskStatus>;
  /** Ohne Modellaufruf erzeugt (Playbook-Direktplan). */
  demo: boolean;
  costEur: number;
}

interface Database {
  version: number;
  goals: StoredGoal[];
}

const EMPTY: Database = { version: 1, goals: [] };

export function dataPath(): string {
  return process.env.ATLAS_DATA ?? join(homedir(), ".atlas", "atlas.json");
}

function read(): Database {
  const path = dataPath();
  if (!existsSync(path)) return structuredClone(EMPTY);

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Database;
    return Array.isArray(parsed.goals) ? parsed : structuredClone(EMPTY);
  } catch {
    // Kaputte Datei nicht stillschweigend überschreiben — beiseitelegen.
    renameSync(path, `${path}.broken-${Date.now()}`);
    return structuredClone(EMPTY);
  }
}

function write(db: Database): void {
  const path = dataPath();
  mkdirSync(dirname(path), { recursive: true });

  // Erst daneben schreiben, dann umbenennen: kein halb geschriebener Stand.
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, path);
}

export function listGoals(): StoredGoal[] {
  return read().goals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getGoal(id: string): StoredGoal | undefined {
  return read().goals.find((g) => g.id === id);
}

export function createGoal(
  goal: Omit<StoredGoal, "id" | "createdAt" | "updatedAt" | "taskStatus">,
): StoredGoal {
  const db = read();
  const now = new Date().toISOString();
  const stored: StoredGoal = {
    ...goal,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    taskStatus: {},
  };

  db.goals.push(stored);
  write(db);
  return stored;
}

export function setTaskStatus(
  goalId: string,
  key: string,
  status: TaskStatus,
): StoredGoal | undefined {
  const db = read();
  const goal = db.goals.find((g) => g.id === goalId);
  if (!goal) return undefined;

  if (status === "open") delete goal.taskStatus[key];
  else goal.taskStatus[key] = status;

  goal.updatedAt = new Date().toISOString();
  write(db);
  return goal;
}

export function deleteGoal(id: string): boolean {
  const db = read();
  const before = db.goals.length;
  db.goals = db.goals.filter((g) => g.id !== id);

  if (db.goals.length === before) return false;
  write(db);
  return true;
}

export function taskKey(milestoneRef: string, taskTitle: string): string {
  return `${milestoneRef}::${taskTitle}`;
}

/** Fortschritt eines Ziels — Grundlage für Pfadanzeige und Nordstern-Kennzahl. */
export function progressOf(goal: StoredGoal): {
  tasksDone: number;
  tasksTotal: number;
  milestonesDone: number;
  milestonesTotal: number;
  nextTask: { milestoneRef: string; title: string; dueAt: string; estimatedMin: number } | null;
} {
  let tasksDone = 0;
  let tasksTotal = 0;
  let milestonesDone = 0;
  let nextTask: ReturnType<typeof progressOf>["nextTask"] = null;

  for (const m of goal.plan.milestones) {
    let doneInMilestone = 0;

    for (const t of m.tasks) {
      tasksTotal++;
      const status = goal.taskStatus[taskKey(m.ref, t.title)];
      if (status === "done") {
        tasksDone++;
        doneInMilestone++;
      } else if (status !== "deferred" && !nextTask) {
        nextTask = {
          milestoneRef: m.ref,
          title: t.title,
          dueAt: t.dueAt,
          estimatedMin: t.estimatedMin,
        };
      }
    }

    if (m.tasks.length > 0 && doneInMilestone === m.tasks.length) milestonesDone++;
  }

  return {
    tasksDone,
    tasksTotal,
    milestonesDone,
    milestonesTotal: goal.plan.milestones.length,
    nextTask,
  };
}
