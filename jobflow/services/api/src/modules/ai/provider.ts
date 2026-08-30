import type { AiAnalysisResult } from "@jobflow/types";

/**
 * Die Schnittstelle zur KI.
 *
 * Der springende Punkt: die KI redet nie direkt mit der Datenbank. Sie bekommt
 * einen Text und liefert ein Ergebnis in dieser Form zurueck. Das Backend
 * validiert es und entscheidet, was gespeichert wird.
 *
 * Dadurch laesst sich das konkrete Modell austauschen, ohne die Anwendung
 * umzubauen - und ein Fehlverhalten der KI kann nichts kaputt machen, was das
 * Backend nicht ohnehin erlauben wuerde.
 */
export interface AiProvider {
  /** Name inklusive Version, wird zur Analyse gespeichert, z. B. "rules@1". */
  readonly name: string;
  analyze(input: AiAnalysisInput): Promise<AiAnalysisResult>;
  /** Formuliert einen Vorschlagstext - fuer Angebote und Chatantworten. */
  suggestText(input: AiSuggestionInput): Promise<string>;
}

export interface AiAnalysisInput {
  description: string;
  /** Slugs aller Kategorien, die die Plattform kennt. */
  knownCategorySlugs: string[];
  /** Bereits beantwortete Rueckfragen, falls die Analyse wiederholt wird. */
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
