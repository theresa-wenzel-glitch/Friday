/**
 * Kerntypen der Planungs-Engine.
 *
 * Begriffe wie in docs/09-datenmodell.md und docs/10-ki-planungs-engine.md.
 */

/** Zieldomänen. V1 bedient ausschliesslich `founding`. */
export type Domain =
  | "founding"
  | "health"
  | "learning"
  | "career"
  | "finance"
  | "other";

export type Difficulty = "micro" | "small" | "medium" | "large";

/** Herkunft eines Schritts — siehe docs/10, Feld `origin`. */
export type Origin = "playbook" | "generated" | "user";

/** Ergebnis der Machbarkeitsprüfung aus Schritt 1 der Pipeline. */
export type Feasibility = "plausible" | "ambitious" | "unrealistic";

/** Eingabe des Nutzers: Ziel plus Interviewantworten (S-02/S-03). */
export interface GoalInput {
  /** Originalformulierung des Nutzers. */
  rawInput: string;
  /** Zieltermin (ISO-Datum), falls genannt. */
  targetDate?: string;
  /** Verfügbare Minuten pro Woche. Bestimmt Aufgabenzuschnitt und Regel 5. */
  weeklyCapacityMin: number;
  /** Budget in Euro, falls genannt. */
  budgetEur?: number;
  /** Nur die ersten drei Stellen der PLZ — siehe docs/09. */
  postalPrefix?: string;
  /** Bundesland-Kürzel, z. B. "SN". Steuert Feiertage und Behördenpfade. */
  state?: string;
  experience?: "none" | "some" | "professional";
  alreadyStarted?: string;
  biggestWorry?: string;
  /** Tage, an denen nicht gearbeitet werden kann (ISO-Daten). */
  blockedDates?: string[];
  /** Arbeitet der Nutzer am Wochenende am Ziel? */
  includeWeekends?: boolean;
}

/** Ergebnis von Schritt 1 (Klassifikation, Haiku). */
export interface Classification {
  domain: Domain;
  intentKey: string;
  confidence: number;
  region: string | null;
  feasibility: Feasibility;
  missingInfo: string[];
  /** Gesetzt, wenn das Ziel ausserhalb des Produktbereichs liegt (docs/14). */
  safetyFlag: SafetyFlag | null;
}

export type SafetyFlag =
  | "mental_health_crisis"
  | "over_indebtedness"
  | "eating_disorder"
  | "illegal"
  | "medical_risk";

/** Eine Aufgabe, wie sie das Modell liefert (noch ohne Termin). */
export interface GeneratedTask {
  title: string;
  why: string;
  how: string | null;
  estimatedMin: number;
  difficulty: Difficulty;
  blocking: boolean;
  resourceHints: string[];
}

/** Ein Meilenstein, wie ihn das Modell liefert (noch ohne Termin). */
export interface GeneratedMilestone {
  ref: string;
  title: string;
  definitionOfDone: string;
  durationDays: number;
  dependsOn: string[];
  origin: Origin;
  playbookNodeId: string | null;
  tasks: GeneratedTask[];
}

export interface PlanRisk {
  milestoneRef: string;
  risk: string;
  mitigation: string;
}

/** Die vollständige Modellausgabe (Schritt 3). */
export interface GeneratedPlan {
  summary: string;
  assumptions: string[];
  risks: PlanRisk[];
  milestones: GeneratedMilestone[];
}

/** Terminierter Meilenstein (nach Schritt 6). */
export interface ScheduledMilestone extends GeneratedMilestone {
  windowStart: string;
  windowEnd: string;
  tasks: ScheduledTask[];
}

export interface ScheduledTask extends GeneratedTask {
  dueAt: string;
}

export interface ScheduledPlan extends Omit<GeneratedPlan, "milestones"> {
  milestones: ScheduledMilestone[];
  startDate: string;
  endDate: string;
}

/** Ein Befund des Validators. */
export interface ValidationIssue {
  /** Regelnummer 1–9 aus docs/10. */
  rule: number;
  severity: "error" | "warning";
  /** Maschinenlesbarer Code, z. B. "cycle_detected". */
  code: string;
  /** Für Menschen — und als Eingabe für die Reparaturschleife. */
  message: string;
  milestoneRef?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/** Kontext, den der Validator zur Prüfung braucht. */
export interface ValidationContext {
  input: GoalInput;
  /** Knoten-IDs, die im gewählten Playbook als Pflicht markiert sind (Regel 8). */
  requiredPlaybookNodes?: { id: string; title: string }[];
  /** Startdatum der Planung, Standard: heute. */
  startDate?: Date;
}

/** Playbook-Knoten (docs/09). */
export interface PlaybookNode {
  id: string;
  title: string;
  definitionOfDone: string;
  typicalDurationDays: number;
  p10DurationDays: number;
  p90DurationDays: number;
  /** Anteil der Nutzer, die hier abbrechen. Die wertvollste Kennzahl im System. */
  dropoutRate: number;
  commonBlockers: string[];
  successCorrelates: string[];
  requiredBefore: string[];
  /** Pflichtknoten dürfen aus einem Plan nicht entfernt werden (Regel 8). */
  mandatory: boolean;
}

export interface PlaybookEdge {
  from: string;
  to: string;
  frequency: number;
  medianGapDays: number;
  /** Differenz der Abschlusswahrscheinlichkeit bei dieser Reihenfolge. */
  successDelta: number;
}

export interface PlaybookTemplate {
  intentKey: string;
  version: number;
  region: string;
  title: string;
  /** Anzahl realer Verläufe, auf denen das Playbook beruht. 0 = rein redaktionell. */
  sampleSize: number;
  confidence: number;
  source: "expert" | "derived" | "hybrid";
  /**
   * Fachliche Freigabe. `unreviewed_draft` bedeutet: inhaltlich noch NICHT von
   * einer fachkundigen Person geprüft und nicht produktionstauglich.
   * Siehe docs/15-team-organisation.md, Rolle C.
   */
  reviewStatus: "unreviewed_draft" | "expert_reviewed";
  reviewedBy?: string;
  reviewedAt?: string;
  nodes: PlaybookNode[];
  edges: PlaybookEdge[];
  /** Hinweise, die nur für diese Domäne gelten (z. B. Konzessionsreihenfolge). */
  domainNotes: string[];
}

/** Kostenerfassung eines Modellaufrufs — Grundlage für docs/11. */
export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  latencyMs: number;
  costEur: number;
}

export interface PipelineResult {
  classification: Classification;
  plan: ScheduledPlan | null;
  validation: ValidationResult;
  /** Anzahl der Reparaturdurchläufe (max. 2). */
  repairRounds: number;
  usage: ModelUsage[];
  totalCostEur: number;
  /** Gesetzt, wenn die Pipeline bewusst keinen Plan erzeugt hat. */
  refusal: { reason: string; guidance: string } | null;
}
