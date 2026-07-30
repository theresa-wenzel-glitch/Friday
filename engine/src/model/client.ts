/**
 * Modell-Abstraktion.
 *
 * Die Engine spricht nur mit diesem Interface, nie direkt mit einem Anbieter-SDK.
 * Ein Modellwechsel darf keine Produktänderung erfordern — siehe
 * docs/08-technische-architektur.md, Leitentscheidung 5.
 *
 * Modell-Routing nach Aufgabenklasse (docs/08):
 *   heavy → claude-opus-5   Erstplan, komplexes Replanning
 *   mid   → claude-sonnet-5 Standard-Replanning, Zuschnitt
 *   light → claude-haiku-4-5 Klassifikation, Extraktion, Tagging
 */
import Anthropic from "@anthropic-ai/sdk";
import type { ModelUsage } from "../types.js";

export type ModelTier = "heavy" | "mid" | "light";

export const MODELS: Record<ModelTier, string> = {
  heavy: "claude-opus-5",
  mid: "claude-sonnet-5",
  light: "claude-haiku-4-5",
};

/** Preise in USD je 1 Mio. Token. Stand: Konzepterstellung. */
export const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** Umrechnungskurs für die Kostenausweisung. Siehe docs/11. */
export const USD_TO_EUR = 0.92;

/** Wird geworfen, wenn die Sicherheitsklassifikation die Anfrage ablehnt. */
export class ModelRefusalError extends Error {
  constructor(
    readonly category: string | null,
    readonly explanation: string | null,
  ) {
    super(`Die Anfrage wurde abgelehnt (Kategorie: ${category ?? "unbekannt"}).`);
    this.name = "ModelRefusalError";
  }
}

export interface CallOptions {
  tier: ModelTier;
  /** Stabiler Prompt-Anteil. Wird zwischengespeichert (docs/08, Prompt-Caching). */
  cachedSystem: string;
  /** Volatiler Prompt-Anteil. Steht bewusst NACH dem Cache-Breakpoint. */
  volatileSystem?: string;
  userMessage: string;
  /** JSON-Schema für die erzwungene Ausgabe. */
  format: unknown;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
}

export interface CallResult<T> {
  data: T;
  usage: ModelUsage;
  /** Modell, das die Antwort tatsächlich erzeugt hat (kann ein Fallback sein). */
  servedBy: string;
}

export interface PlanningModel {
  call<T>(opts: CallOptions): Promise<CallResult<T>>;
}

export class AnthropicPlanningModel implements PlanningModel {
  private readonly client: Anthropic;

  constructor(client?: Anthropic) {
    // Zero-Arg-Konstruktor löst Zugangsdaten aus der Umgebung auf
    // (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN oder ein `ant auth login`-Profil).
    this.client = client ?? new Anthropic();
  }

  async call<T>(opts: CallOptions): Promise<CallResult<T>> {
    const model = MODELS[opts.tier];
    const started = Date.now();

    const system: Anthropic.TextBlockParam[] = [
      // Cache-Breakpoint auf dem letzten stabilen Block: Systemanweisung und
      // Playbook-Kontext werden wiederverwendet, das Nutzerprofil nicht.
      { type: "text", text: opts.cachedSystem, cache_control: { type: "ephemeral" } },
    ];
    if (opts.volatileSystem) {
      system.push({ type: "text", text: opts.volatileSystem });
    }

    const response = await this.client.beta.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 16000,
      // Refusal-Fallback: Wird die Anfrage von den Sicherheitsklassifikatoren
      // abgelehnt, bedient ein anderes Modell dieselbe Anfrage im selben Aufruf.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      output_config: {
        format: opts.format as never,
        effort: opts.effort ?? "high",
      },
      messages: [{ role: "user", content: opts.userMessage }],
    } as never);

    const latencyMs = Date.now() - started;

    // `stop_details` ist in der installierten SDK-Fassung noch nicht typisiert.
    const message = response as unknown as {
      stop_reason: string | null;
      stop_details?: { category?: string | null; explanation?: string | null } | null;
      content: { type: string; text?: string }[];
      model?: string;
      usage: RawUsage;
    };

    // Vor dem Lesen von content immer stop_reason prüfen — bei einer Ablehnung
    // ist content leer oder unvollständig.
    if (message.stop_reason === "refusal") {
      throw new ModelRefusalError(
        message.stop_details?.category ?? null,
        message.stop_details?.explanation ?? null,
      );
    }

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    if (!text.trim()) {
      throw new Error(
        `Das Modell ${model} hat keinen Text geliefert (stop_reason: ${message.stop_reason}).`,
      );
    }

    return {
      data: JSON.parse(text) as T,
      servedBy: message.model ?? model,
      usage: buildUsage(message.model ?? model, message.usage, latencyMs),
    };
  }
}

interface RawUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function buildUsage(model: string, usage: RawUsage, latencyMs: number): ModelUsage {
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;

  return {
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    latencyMs,
    costEur: estimateCostEur(model, {
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheCreationTokens,
    }),
  };
}

/**
 * Kostenschätzung eines Aufrufs in Euro.
 * Cache-Lesen kostet ~0,1×, Cache-Schreiben ~1,25× des Eingabepreises.
 */
export function estimateCostEur(
  model: string,
  t: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  },
): number {
  const price = PRICING[model] ?? PRICING["claude-opus-5"]!;
  const usd =
    (t.inputTokens * price.input +
      t.cacheReadTokens * price.input * 0.1 +
      t.cacheCreationTokens * price.input * 1.25 +
      t.outputTokens * price.output) /
    1_000_000;

  return usd * USD_TO_EUR;
}

/** Prüft, ob Zugangsdaten vorhanden sind, ohne einen Aufruf zu machen. */
export function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
