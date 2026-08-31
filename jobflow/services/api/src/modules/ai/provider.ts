import type { AiAnalysisResult } from "@jobflow/types";

/**
 * Die Schnittstelle zur KI.
 *
 * Der springende Punkt: die KI redet nie direkt mit der Datenbank. Sie bekommt
 * einen Text und liefert ein Ergebnis in dieser Form zurück. Das Backend
 * validiert es und entscheidet, was gespeichert wird.
 *
 * Dadurch lässt sich das konkrete Modell austauschen, ohne die Anwendung
 * umzubaün - und ein Fehlverhalten der KI kann nichts kaputt machen, was das
 * Backend nicht ohnehin erlauben würde.
 */
export interface AiProvider {
  /** Name inklusive Version, wird zur Analyse gespeichert, z. B. "rules@1". */
  readonly name: string;
  analyze(input: AiAnalysisInput): Promise<AiAnalysisResult>;
  /** Formuliert einen Vorschlagstext - für Angebote und Chatantworten. */
  suggestText(input: AiSuggestionInput): Promise<string>;
}

export interface AiAnalysisInput {
  description: string;
  /** Slugs aller Kategorien, die die Plattform kennt. */
  knownCategorySlugs: string[];
  /** Bereits beantwortete Rückfragen, falls die Analyse wiederholt wird. */
  answeredQuestions?: { question: string; answer: string }[];
  photoCount: number;
}

export type AiSuggestionKind = "OFFER_DESCRIPTION" | "CHAT_REPLY";

export interface AiSuggestionInput {
  kind: AiSuggestionKind;
  /** Zusammenfassung der Anfrage - nicht der komplette Verlauf. */
  context: string;
  hint?: string;
}

/** Die KI ist nicht erreichbar oder liefert Unbrauchbares. */
export class AiUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiUnavailableError";
  }
}
