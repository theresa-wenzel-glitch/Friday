#!/usr/bin/env node
/**
 * Atlas — Server mit Konten.
 *
 *   npm start → http://localhost:4173
 *
 * Ohne ANTHROPIC_API_KEY läuft der Server im Demonstrationsbetrieb: Der Plan
 * kommt dann direkt aus dem Playbook statt aus dem Modell, klar gekennzeichnet.
 *
 * Sicherheitslage, ehrlich: Anmeldung, Passwort-Hashing, Sitzungen und
 * Mandantentrennung sind korrekt gebaut. Was für einen öffentlichen Betrieb
 * fehlt, steht in der README unter „Was noch fehlt".
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SESSION_COOKIE,
  allowAttempt,
  attemptsRemaining,
  checkPasswordStrength,
  clearAttempts,
  clearCookie,
  hashPassword,
  hashToken,
  isPlausibleEmail,
  issueSession,
  newUserId,
  normalizeEmail,
  parseCookies,
  sessionCookie,
  verifyPassword,
} from "./auth.js";
import { AnthropicPlanningModel, hasCredentials } from "./model/client.js";
import { findSimilar } from "./playbooks/index.js";
import { planFromPlaybook } from "./fallback.js";
import { runPipeline } from "./pipeline.js";
import { schedulePlan } from "./scheduler.js";
import {
  createGoal,
  createSession,
  createUser,
  dataPath,
  deleteAllSessions,
  deleteGoal,
  deleteSession,
  deleteUser,
  exportUserData,
  findUserByEmail,
  listGoals,
  progressOf,
  setTaskStatus,
  userForToken,
  type StoredGoal,
  type User,
} from "./store.js";
import type { Classification, GoalInput } from "./types.js";

const PORT = Number(process.env.PORT ?? 4173);
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const DEMO = !hasCredentials();
/** Hinter HTTPS setzen, damit das Sitzungs-Cookie nur verschlüsselt reist. */
const SECURE_COOKIES = process.env.ATLAS_SECURE_COOKIES === "1";

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    // Erwartete Eingabefehler nicht als Serverfehler protokollieren.
    if (!(err instanceof HttpError)) console.error(err);
    json(res, err instanceof HttpError ? err.status : 500, { error: message });
  });
});

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (path === "/" || path === "/index.html") {
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin",
    });
    res.end(readFileSync(join(APP_DIR, "index.html")));
    return;
  }

  /* --- offen ------------------------------------------------------------ */

  if (path === "/api/status") {
    const user = currentUser(req);
    return json(res, 200, {
      demo: DEMO,
      signedIn: !!user,
      user: user ? publicUser(user) : null,
    });
  }

  if (path === "/api/auth/register" && method === "POST") {
    return register(req, res, await readBody(req));
  }

  if (path === "/api/auth/login" && method === "POST") {
    return login(req, res, await readBody(req));
  }

  if (path === "/api/auth/logout" && method === "POST") {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) deleteSession(hashToken(token));
    res.setHeader("set-cookie", clearCookie());
    return json(res, 200, { ok: true });
  }

  /* --- ab hier nur angemeldet ------------------------------------------- */

  const user = currentUser(req);
  if (!user) throw new HttpError(401, "Bitte melde dich an.");

  if (path === "/api/goals" && method === "GET") {
    return json(res, 200, listGoals(user.id).map(withProgress));
  }

  if (path === "/api/goals" && method === "POST") {
    const body = await readBody(req);
    return json(res, 201, withProgress(await planGoal(user.id, body)));
  }

  const taskMatch = /^\/api\/goals\/([^/]+)\/task$/.exec(path);
  if (taskMatch && method === "POST") {
    const body = await readBody(req);
    const status = body.status === "deferred" || body.status === "open" ? body.status : "done";
    const goal = setTaskStatus(user.id, taskMatch[1]!, String(body.key), status);
    if (!goal) throw new HttpError(404, "Ziel nicht gefunden.");
    return json(res, 200, withProgress(goal));
  }

  const goalMatch = /^\/api\/goals\/([^/]+)$/.exec(path);
  if (goalMatch && method === "DELETE") {
    if (!deleteGoal(user.id, goalMatch[1]!)) throw new HttpError(404, "Ziel nicht gefunden.");
    return json(res, 200, { ok: true });
  }

  if (path === "/api/me/export" && method === "GET") {
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="atlas-export.json"`,
    });
    return void res.end(JSON.stringify(exportUserData(user.id), null, 2));
  }

  if (path === "/api/me" && method === "DELETE") {
    deleteUser(user.id);
    res.setHeader("set-cookie", clearCookie());
    return json(res, 200, { ok: true });
  }

  throw new HttpError(404, "Unbekannter Pfad.");
}

/* -------------------------------------------------------------------------- */
/* Anmeldung                                                                  */
/* -------------------------------------------------------------------------- */

function register(req: IncomingMessage, res: ServerResponse, body: Record<string, unknown>): void {
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const displayName = String(body.displayName ?? "").trim();

  if (!isPlausibleEmail(email)) throw new HttpError(400, "Bitte gib eine gültige E-Mail-Adresse an.");

  const weak = checkPasswordStrength(password);
  if (weak) throw new HttpError(400, weak);

  if (!body.consent) {
    throw new HttpError(400, "Ohne Einwilligung in die Datenverarbeitung geht es nicht.");
  }

  if (findUserByEmail(email)) {
    throw new HttpError(409, "Diese E-Mail-Adresse ist bereits registriert.");
  }

  const user: User = {
    id: newUserId(),
    email,
    displayName: displayName || email.split("@")[0]!,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    consents: [{ key: "processing", version: "1.0", grantedAt: new Date().toISOString() }],
  };

  createUser(user);
  startSession(res, user.id);
  json(res, 201, { user: publicUser(user) });
}

function login(req: IncomingMessage, res: ServerResponse, body: Record<string, unknown>): void {
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const key = `${clientKey(req)}:${email}`;

  if (!allowAttempt(key)) {
    throw new HttpError(
      429,
      "Zu viele Anmeldeversuche. Warte 15 Minuten und versuch es dann noch einmal.",
    );
  }

  const user = findUserByEmail(email);

  // Gleiche Meldung für unbekannte Adresse und falsches Passwort — sonst
  // verrät die Anmeldung, welche Adressen registriert sind.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    const left = attemptsRemaining(key);
    throw new HttpError(
      401,
      `E-Mail-Adresse oder Passwort stimmt nicht.` +
        (left <= 3 ? ` Noch ${left} Versuch${left === 1 ? "" : "e"}.` : ""),
    );
  }

  clearAttempts(key);
  startSession(res, user.id);
  json(res, 200, { user: publicUser(user) });
}

function startSession(res: ServerResponse, userId: string): void {
  const { token, tokenHash, expiresAt } = issueSession();
  createSession({ tokenHash, userId, createdAt: new Date().toISOString(), expiresAt });
  res.setHeader("set-cookie", sessionCookie(token, expiresAt, SECURE_COOKIES));
}

function currentUser(req: IncomingMessage): User | undefined {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  return token ? userForToken(hashToken(token)) : undefined;
}

function publicUser(user: User) {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

function clientKey(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? "unbekannt";
}

/* -------------------------------------------------------------------------- */
/* Planung                                                                    */
/* -------------------------------------------------------------------------- */

async function planGoal(userId: string, body: Record<string, unknown>): Promise<StoredGoal> {
  const input = toGoalInput(body);

  if (!input.rawInput || input.rawInput.trim().length < 10) {
    throw new HttpError(400, "Beschreibe dein Ziel in einem ganzen Satz.");
  }

  if (DEMO) {
    const match = findSimilar(input.rawInput, { limit: 1 })[0];
    if (!match) {
      throw new HttpError(
        400,
        "Im Demonstrationsbetrieb gibt es nur Pläne zu den drei hinterlegten " +
          "Playbooks (Café, Freelance, Onlineshop). Für beliebige Ziele wird ein " +
          "API-Key gebraucht.",
      );
    }

    const plan = planFromPlaybook(match.template, input);
    return createGoal({
      userId,
      input,
      classification: demoClassification(match.template.intentKey, input),
      plan: schedulePlan(plan, input),
      demo: true,
      costEur: 0,
    });
  }

  const result = await runPipeline(input, { model: new AnthropicPlanningModel() });

  if (result.refusal || !result.plan) {
    throw new HttpError(
      422,
      `${result.refusal?.reason ?? "Für dieses Ziel wurde kein Plan erstellt."} ` +
        `${result.refusal?.guidance ?? ""}`.trim(),
    );
  }

  return createGoal({
    userId,
    input,
    classification: result.classification,
    plan: result.plan,
    demo: false,
    costEur: result.totalCostEur,
  });
}

function toGoalInput(body: Record<string, unknown>): GoalInput {
  const hours = Number(body.hours ?? 6);
  return {
    rawInput: String(body.rawInput ?? ""),
    weeklyCapacityMin: Math.max(30, Math.round(hours * 60)),
    targetDate: body.targetDate ? String(body.targetDate) : undefined,
    budgetEur: body.budgetEur ? Number(body.budgetEur) : undefined,
    postalPrefix: body.postalPrefix ? String(body.postalPrefix).slice(0, 3) : undefined,
    state: body.state ? String(body.state) : undefined,
    experience: body.experience as GoalInput["experience"],
    biggestWorry: body.biggestWorry ? String(body.biggestWorry) : undefined,
    includeWeekends: Boolean(body.includeWeekends),
  };
}

function demoClassification(intentKey: string, input: GoalInput): Classification {
  return {
    domain: "founding",
    intentKey,
    confidence: 0.5,
    region: input.state ?? null,
    feasibility: "plausible",
    missingInfo: [],
    safetyFlag: null,
  };
}

function withProgress(goal: StoredGoal) {
  return { ...goal, progress: progressOf(goal) };
}

/* -------------------------------------------------------------------------- */

function json(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 512 * 1024) throw new HttpError(413, "Anfrage zu groß.");
    chunks.push(chunk as Buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

// `deleteAllSessions` steht für den Passwortwechsel bereit (alle Geräte abmelden).
void deleteAllSessions;

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  Atlas läuft auf http://localhost:${PORT}`);
  console.log(`  Daten: ${dataPath()}`);
  console.log(
    DEMO
      ? `  \x1b[33mDemonstrationsbetrieb\x1b[0m — kein ANTHROPIC_API_KEY gesetzt.\n` +
          `  Pläne kommen direkt aus den Playbooks, nicht aus dem Modell.\n`
      : `  \x1b[32mMit Modell\x1b[0m — Pläne werden erzeugt (Kosten je Plan ca. 0,15–0,20 €).\n`,
  );
});
