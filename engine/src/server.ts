#!/usr/bin/env node
/**
 * Lokaler Einzelplatz-Server. `npm start` → http://localhost:4173
 *
 * Bewusst ohne Framework und ohne Konto: Das hier ist die Oberfläche zum
 * Selbstausprobieren, nicht das Produkt. Es gibt keine Anmeldung, weil es
 * keine zweite Person gibt — alles liegt in einer JSON-Datei auf dieser
 * Maschine (siehe store.ts).
 *
 * Ohne ANTHROPIC_API_KEY läuft der Server im Demonstrationsbetrieb: Der Plan
 * kommt dann direkt aus dem Playbook statt aus dem Modell, klar gekennzeichnet.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AnthropicPlanningModel, hasCredentials } from "./model/client.js";
import { findSimilar } from "./playbooks/index.js";
import { planFromPlaybook } from "./fallback.js";
import { runPipeline } from "./pipeline.js";
import { schedulePlan } from "./scheduler.js";
import {
  createGoal,
  dataPath,
  deleteGoal,
  getGoal,
  listGoals,
  progressOf,
  setTaskStatus,
  type StoredGoal,
} from "./store.js";
import type { Classification, GoalInput } from "./types.js";

const PORT = Number(process.env.PORT ?? 4173);
const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const DEMO = !hasCredentials();

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    json(res, 500, { error: String(err instanceof Error ? err.message : err) });
  });
});

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === "/" || path === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(readFileSync(join(APP_DIR, "index.html")));
    return;
  }

  if (path === "/api/status") {
    return json(res, 200, { demo: DEMO, dataPath: dataPath() });
  }

  if (path === "/api/goals" && req.method === "GET") {
    return json(res, 200, listGoals().map(withProgress));
  }

  if (path === "/api/goals" && req.method === "POST") {
    const body = await readBody(req);
    return json(res, 201, withProgress(await planGoal(body)));
  }

  const taskMatch = /^\/api\/goals\/([^/]+)\/task$/.exec(path);
  if (taskMatch && req.method === "POST") {
    const body = await readBody(req);
    const status = body.status === "deferred" || body.status === "open" ? body.status : "done";
    const goal = setTaskStatus(taskMatch[1]!, String(body.key), status);
    return goal
      ? json(res, 200, withProgress(goal))
      : json(res, 404, { error: "Ziel nicht gefunden." });
  }

  const goalMatch = /^\/api\/goals\/([^/]+)$/.exec(path);
  if (goalMatch && req.method === "DELETE") {
    return deleteGoal(goalMatch[1]!)
      ? json(res, 200, { ok: true })
      : json(res, 404, { error: "Ziel nicht gefunden." });
  }

  json(res, 404, { error: "Unbekannter Pfad." });
}

/** Schritt 1–6 der Pipeline, oder der Playbook-Direktplan im Demobetrieb. */
async function planGoal(body: Record<string, unknown>): Promise<StoredGoal> {
  const input = toGoalInput(body);

  if (!input.rawInput || input.rawInput.trim().length < 10) {
    throw new Error("Beschreibe dein Ziel in einem ganzen Satz.");
  }

  if (DEMO) {
    const match = findSimilar(input.rawInput, { limit: 1 })[0];
    if (!match) {
      throw new Error(
        "Im Demonstrationsbetrieb gibt es nur Pläne zu den drei hinterlegten " +
          "Playbooks (Café, Freelance, Onlineshop). Für beliebige Ziele wird " +
          "ein API-Key gebraucht.",
      );
    }

    const plan = planFromPlaybook(match.template, input);
    return createGoal({
      input,
      classification: demoClassification(match.template.intentKey, input),
      plan: schedulePlan(plan, input),
      demo: true,
      costEur: 0,
    });
  }

  const result = await runPipeline(input, { model: new AnthropicPlanningModel() });

  if (result.refusal || !result.plan) {
    throw new Error(
      `${result.refusal?.reason ?? "Für dieses Ziel wurde kein Plan erstellt."} ` +
        `${result.refusal?.guidance ?? ""}`.trim(),
    );
  }

  return createGoal({
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
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 512 * 1024) throw new Error("Anfrage zu groß.");
    chunks.push(chunk as Buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

server.listen(PORT, () => {
  console.log(`\n  Atlas läuft auf http://localhost:${PORT}`);
  console.log(`  Daten: ${dataPath()}`);
  console.log(
    DEMO
      ? `  \x1b[33mDemonstrationsbetrieb\x1b[0m — kein ANTHROPIC_API_KEY gesetzt.\n` +
          `  Pläne kommen direkt aus den Playbooks, nicht aus dem Modell.\n`
      : `  \x1b[32mMit Modell\x1b[0m — Pläne werden erzeugt (Kosten je Plan ca. 0,15–0,20 €).\n`,
  );
});
