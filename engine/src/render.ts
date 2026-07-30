/**
 * Textausgabe für die Kommandozeile. Bildet die Struktur von S-05
 * (Planbestätigung) und S-08 (Pfad) im Terminal ab.
 */
import { weeklyLoadMinutes } from "./validator.js";
import type { PipelineResult, ScheduledPlan, ValidationIssue } from "./types.js";

const RESET = "[0m";
const DIM = "[2m";
const BOLD = "[1m";
const GREEN = "[32m";
const YELLOW = "[33m";
const RED = "[31m";

export function renderResult(result: PipelineResult): string {
  const out: string[] = [];

  if (result.refusal) {
    out.push(
      "",
      `${YELLOW}Atlas erstellt für dieses Ziel keinen Plan.${RESET}`,
      "",
      result.refusal.reason,
      result.refusal.guidance,
      "",
    );
    return out.join("\n");
  }

  const c = result.classification;
  out.push(
    "",
    `${DIM}Domäne${RESET}      ${c.domain} · ${c.intentKey} (Konfidenz ${c.confidence.toFixed(2)})`,
    `${DIM}Machbarkeit${RESET} ${c.feasibility}`,
  );
  if (c.missingInfo.length > 0) {
    out.push(`${DIM}Offen${RESET}       ${c.missingInfo.join(", ")}`);
  }

  if (result.plan) out.push(renderPlan(result.plan));
  out.push(renderValidation(result.validation.issues, result.repairRounds));
  out.push(renderUsage(result));

  return out.join("\n");
}

export function renderPlan(plan: ScheduledPlan): string {
  const out: string[] = ["", `${BOLD}${plan.summary}${RESET}`, ""];

  const totalTasks = plan.milestones.reduce((n, m) => n + m.tasks.length, 0);
  out.push(
    `${DIM}${plan.milestones.length} Meilensteine · ${totalTasks} Aufgaben · ` +
      `${plan.startDate} bis ${plan.endDate}${RESET}`,
    "",
  );

  plan.milestones.forEach((m, i) => {
    const last = i === plan.milestones.length - 1;
    const marker = last ? "◆" : "●";
    const origin = m.origin === "playbook" ? `${DIM}[Playbook]${RESET}` : `${YELLOW}[generiert]${RESET}`;

    out.push(
      `${GREEN}${marker}${RESET} ${BOLD}${m.title}${RESET} ${origin}`,
      `${DIM}│${RESET}  ${m.windowStart} → ${m.windowEnd} · ${m.durationDays} Tage · ` +
        `${Math.round(weeklyLoadMinutes(m))} Min/Woche`,
      `${DIM}│  Fertig, wenn: ${m.definitionOfDone}${RESET}`,
    );

    if (m.dependsOn.length > 0) {
      out.push(`${DIM}│  Setzt voraus: ${m.dependsOn.join(", ")}${RESET}`);
    }

    for (const t of m.tasks) {
      const flag = t.blocking ? `${YELLOW}!${RESET}` : " ";
      out.push(`${DIM}│${RESET}  ${flag} ${t.dueAt}  ${t.title} ${DIM}(${t.estimatedMin} Min)${RESET}`);
    }
    out.push(`${DIM}│${RESET}`);
  });

  if (plan.assumptions.length > 0) {
    out.push(`${BOLD}Annahmen${RESET}`, ...plan.assumptions.map((a) => `  · ${a}`), "");
  }

  if (plan.risks.length > 0) {
    out.push(`${BOLD}Risiken${RESET}`);
    for (const r of plan.risks) {
      out.push(`  · [${r.milestoneRef}] ${r.risk}`, `    ${DIM}→ ${r.mitigation}${RESET}`);
    }
    out.push("");
  }

  return out.join("\n");
}

export function renderValidation(issues: ValidationIssue[], repairRounds: number): string {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const out: string[] = [`${BOLD}Validierung${RESET}`];

  if (errors.length === 0) {
    out.push(`  ${GREEN}✓${RESET} Alle neun Regeln erfüllt.`);
  } else {
    for (const e of errors) {
      out.push(`  ${RED}✗${RESET} [Regel ${e.rule}] ${e.message}`);
    }
  }

  for (const w of warnings) {
    out.push(`  ${YELLOW}!${RESET} [Regel ${w.rule}] ${w.message}`);
  }

  if (repairRounds > 0) {
    out.push(`  ${DIM}${repairRounds} Reparaturdurchlauf/-läufe${RESET}`);
  }

  return out.join("\n") + "\n";
}

export function renderUsage(result: PipelineResult): string {
  if (result.usage.length === 0) return "";

  const out: string[] = [`${BOLD}Modellnutzung${RESET}`];
  for (const u of result.usage) {
    out.push(
      `  ${u.model.padEnd(20)} ${String(u.inputTokens).padStart(7)} ein · ` +
        `${String(u.outputTokens).padStart(6)} aus · ` +
        `${String(u.cacheReadTokens).padStart(7)} Cache · ` +
        `${(u.latencyMs / 1000).toFixed(1).padStart(5)} s · ` +
        `${u.costEur.toFixed(4)} €`,
    );
  }
  out.push(`  ${DIM}Gesamt: ${result.totalCostEur.toFixed(4)} €${RESET}`);
  return out.join("\n") + "\n";
}

/** Export als Markdown — entspricht dem Nutzer-Export aus docs/09. */
export function planToMarkdown(plan: ScheduledPlan): string {
  const out = [`# Plan`, "", plan.summary, ""];

  for (const m of plan.milestones) {
    out.push(
      `## ${m.title}`,
      "",
      `*${m.windowStart} bis ${m.windowEnd}*`,
      "",
      `**Fertig, wenn:** ${m.definitionOfDone}`,
      "",
    );
    for (const t of m.tasks) {
      out.push(`- [ ] **${t.dueAt}** — ${t.title} (${t.estimatedMin} Min)`);
      out.push(`      ${t.why}`);
    }
    out.push("");
  }

  if (plan.assumptions.length > 0) {
    out.push("## Annahmen", "", ...plan.assumptions.map((a) => `- ${a}`), "");
  }

  return out.join("\n");
}
