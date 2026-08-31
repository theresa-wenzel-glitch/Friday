import type { IsoDateTime, Uuid } from "./common.js";
import type { Urgency } from "./request.js";

/**
 * Das Ergebnis, das ein KI-Provider liefern MUSS.
 *
 * Der Provider ist austauschbar (Regelwerk, externes Modell ...). Das Backend
 * validiert dieses Objekt, bevor irgendetwas gespeichert wird - die KI schreibt
 * nie direkt in die Datenbank.
 */
export interface AiAnalysisResult {
  /** Slug einer bekannten Kategorie, oder null wenn unklar. */
  categorySlug: string | null;
  /** Kurze Zusammenfassung des Problems in einem Satz. */
  summary: string;
  urgency: Urgency;
  /** Nur die wirklich nötigen Rückfragen - kein 30-Felder-Formular. */
  questions: string[];
  /** Selbsteinschätzung des Providers, 0.0 - 1.0. */
  confidence: number;
}

/** Gespeicherte Analyse zu einer Anfrage. */
export interface AiAnalysis {
  id: Uuid;
  requestId: Uuid;
  categoryId: Uuid | null;
  summary: string;
  urgency: Urgency;
  confidence: number;
  /** Welcher Provider das Ergebnis erzeugt hat, z. B. "rules@1". */
  provider: string;
  createdAt: IsoDateTime;
}

/** Eine Rückfrage der KI und - sobald vorhanden - die Antwort des Kunden. */
export interface AiQuestion {
  id: Uuid;
  analysisId: Uuid;
  position: number;
  question: string;
  answer: string | null;
  answeredAt: IsoDateTime | null;
}

/** Analyse mit Rückfragen, so wie die App sie anzeigt. */
export interface AiAnalysisDetail extends AiAnalysis {
  questions: AiQuestion[];
}
