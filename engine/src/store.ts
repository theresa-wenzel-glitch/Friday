/**
 * Persistenz für Konten, Sitzungen und Ziele.
 *
 * Bewusst eine JSON-Datei, keine Datenbank: Dieser Stand ist zum
 * Selbstbetreiben gedacht. Das Schema entspricht aber bereits
 * docs/09-datenmodell.md, sodass der Umstieg auf Postgres ein Austausch
 * dieser Datei ist und keine Umstellung des Produkts.
 *
 * Ablage: $ATLAS_DATA oder ~/.atlas/atlas.json
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Classification, GoalInput, ScheduledPlan } from "./types.js";

export type TaskStatus = "open" | "done" | "deferred";

export interface User {
  id: string;
  email: string;
  displayName: string;
  /** `scrypt$salt$hash` — nie im Klartext. */
  passwordHash: string;
  createdAt: string;
  /** Einwilligungen einzeln und versioniert (docs/14). */
  consents: { key: string; version: string; grantedAt: string }[];
}

export interface Session {
  /** SHA-256 des Tokens. Das Token selbst wird nie gespeichert. */
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface StoredGoal {
  id: string;
  userId: string;
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
  users: User[];
  sessions: Session[];
  goals: StoredGoal[];
}

const EMPTY: Database = { version: 2, users: [], sessions: [], goals: [] };

export function dataPath(): string {
  return process.env.ATLAS_DATA ?? join(homedir(), ".atlas", "atlas.json");
}

function read(): Database {
  const path = dataPath();
  if (!existsSync(path)) return structuredClone(EMPTY);

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<Database>;
    return {
      version: parsed.version ?? 1,
      users: parsed.users ?? [],
      sessions: parsed.sessions ?? [],
      goals: parsed.goals ?? [],
    };
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
  writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
  renameSync(tmp, path);
}

/* -------------------------------------------------------------------------- */
/* Konten                                                                     */
/* -------------------------------------------------------------------------- */

export function findUserByEmail(email: string): User | undefined {
  return read().users.find((u) => u.email === email);
}

export function findUserById(id: string): User | undefined {
  return read().users.find((u) => u.id === id);
}

export function createUser(user: User): User {
  const db = read();
  if (db.users.some((u) => u.email === user.email)) {
    throw new Error("Diese E-Mail-Adresse ist bereits registriert.");
  }

  db.users.push(user);
  write(db);
  return user;
}

/** Löscht Konto, Sitzungen und alle Ziele — Art. 17 DSGVO. */
export function deleteUser(userId: string): boolean {
  const db = read();
  const before = db.users.length;

  db.users = db.users.filter((u) => u.id !== userId);
  db.sessions = db.sessions.filter((s) => s.userId !== userId);
  db.goals = db.goals.filter((g) => g.userId !== userId);

  if (db.users.length === before) return false;
  write(db);
  return true;
}

/* -------------------------------------------------------------------------- */
/* Sitzungen                                                                  */
/* -------------------------------------------------------------------------- */

export function createSession(session: Session): void {
  const db = read();
  db.sessions = pruneExpired(db.sessions);
  db.sessions.push(session);
  write(db);
}

/** Gibt den angemeldeten Nutzer zurück, oder undefined. */
export function userForToken(tokenHash: string): User | undefined {
  const db = read();
  const session = db.sessions.find((s) => s.tokenHash === tokenHash);

  if (!session) return undefined;
  if (new Date(session.expiresAt) < new Date()) {
    deleteSession(tokenHash);
    return undefined;
  }

  return db.users.find((u) => u.id === session.userId);
}

export function deleteSession(tokenHash: string): void {
  const db = read();
  db.sessions = pruneExpired(db.sessions).filter((s) => s.tokenHash !== tokenHash);
  write(db);
}

/** Meldet alle Geräte ab — z. B. nach einem Passwortwechsel. */
export function deleteAllSessions(userId: string): void {
  const db = read();
  db.sessions = pruneExpired(db.sessions).filter((s) => s.userId !== userId);
  write(db);
}

function pruneExpired(sessions: Session[]): Session[] {
  const now = new Date();
  return sessions.filter((s) => new Date(s.expiresAt) > now);
}

/* -------------------------------------------------------------------------- */
/* Ziele — immer nutzergebunden                                               */
/* -------------------------------------------------------------------------- */

export function listGoals(userId: string): StoredGoal[] {
  return read()
    .goals.filter((g) => g.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Gibt nur zurück, was diesem Nutzer gehört. */
export function getGoal(userId: string, id: string): StoredGoal | undefined {
  return read().goals.find((g) => g.id === id && g.userId === userId);
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
  userId: string,
  goalId: string,
  key: string,
  status: TaskStatus,
): StoredGoal | undefined {
  const db = read();
  const goal = db.goals.find((g) => g.id === goalId && g.userId === userId);
  if (!goal) return undefined;

  if (status === "open") delete goal.taskStatus[key];
  else goal.taskStatus[key] = status;

  goal.updatedAt = new Date().toISOString();
  write(db);
  return goal;
}

export function deleteGoal(userId: string, id: string): boolean {
  const db = read();
  const before = db.goals.length;
  db.goals = db.goals.filter((g) => !(g.id === id && g.userId === userId));

  if (db.goals.length === before) return false;
  write(db);
  return true;
}

export function taskKey(milestoneRef: string, taskTitle: string): string {
  return `${milestoneRef}::${taskTitle}`;
}

/** Vollständiger Datenexport — Art. 20 DSGVO, ohne Nachfrage, jederzeit. */
export function exportUserData(userId: string): {
  exportedAt: string;
  account: Omit<User, "passwordHash">;
  goals: StoredGoal[];
} | undefined {
  const user = findUserById(userId);
  if (!user) return undefined;

  const { passwordHash: _omitted, ...account } = user;
  return { exportedAt: new Date().toISOString(), account, goals: listGoals(userId) };
}

/* -------------------------------------------------------------------------- */
/* Fortschritt                                                                */
/* -------------------------------------------------------------------------- */

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
