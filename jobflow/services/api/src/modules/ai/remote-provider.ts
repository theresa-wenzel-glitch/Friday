import type { AiAnalysisResult } from "@jobflow/types";
import { aiAnalysisResultSchema, validate } from "@jobflow/validation";
import { AiUnavailableError, type AiAnalysisInput, type AiProvider, type AiSuggestionInput } from "./provider.js";

/**
 * Anbindung an einen externen KI-Dienst.
 *
 * Was hier passiert, ist wichtiger als es aussieht: die Antwort des Dienstes
 * wird gegen dasselbe Schema geprüft wie eine Eingabe aus der App. Ein Modell
 * ist keine vertraünswürdige Quelle - es kann halluzinieren, Felder
 * weglassen oder eine Kategorie erfinden, die es nicht gibt.
 */
export interface RemoteAiProviderOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  /** Nur für Tests: eigene fetch-Implementierung. */
  fetchImpl?: typeof fetch;
}

export class RemoteAiProvider implements AiProvider {
  readonly name = "remote@1";

  private readonly options: RemoteAiProviderOptions;
  private readonly fetchImpl: typeof fetch;

  constructor(options: RemoteAiProviderOptions) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async analyze(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    const payload = await this.post("/analyze", {
      description: input.description,
      knownCategorySlugs: input.knownCategorySlugs,
      answeredQuestions: input.answeredQuestions ?? [],
      photoCount: input.photoCount,
    });

    const result = validate(aiAnalysisResultSchema, payload);
    if (!result.ok) {
      throw new AiUnavailableError(
        `Die KI hat ein unbrauchbares Ergebnis geliefert: ${JSON.stringify(result.fields)}`,
      );
    }

    // Auch eine formal gültige Antwort kann eine Kategorie nennen, die es
    // nicht gibt. Dann wird sie verworfen statt übernommen.
    if (result.value.categorySlug !== null && !input.knownCategorySlugs.includes(result.value.categorySlug)) {
      return { ...result.value, categorySlug: null, confidence: Math.min(result.value.confidence, 0.3) };
    }
    return result.value;
  }

  async suggestText(input: AiSuggestionInput): Promise<string> {
    const payload = await this.post("/suggest", { kind: input.kind, context: input.context, hint: input.hint ?? null });
    const text = (payload as { text?: unknown }).text;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new AiUnavailableError("Die KI hat keinen verwertbaren Text geliefert.");
    }
    // Der Vorschlag geht als Entwurf an das Unternehmen, nicht direkt an den
    // Kunden - deshalb reicht eine Längenbegrenzung.
    return text.trim().slice(0, 3000);
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.options.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new AiUnavailableError(`Die KI antwortete mit Status ${response.status}.`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof AiUnavailableError) throw error;
      throw new AiUnavailableError("Die KI ist derzeit nicht erreichbar.", { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }
}
