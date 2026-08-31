import type { IsoDateTime, Uuid } from "./common.js";
import type { Business } from "./business.js";

/**
 * Gewichte des Matching-Scores. Summe: 100.
 *
 * Das ist ein Startmodell. Sobald echte Daten vorliegen, gehören die Gewichte
 * anhand der Frage nachjustiert, welche Faktoren tatsächlich zu Aufträgen führen.
 */
export interface MatchWeights {
  service: number;
  distance: number;
  availability: number;
  rating: number;
  price: number;
  experience: number;
  responseTime: number;
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  service: 35,
  distance: 20,
  availability: 15,
  rating: 10,
  price: 10,
  experience: 5,
  responseTime: 5,
};

/** Warum ein Unternehmen vorgeschlagen wird - für die Anzeige in der App. */
export interface MatchReason {
  /** Welcher Faktor, z. B. "distance". */
  factor: keyof MatchWeights;
  /** Erklärung in einem kurzen Satz, z. B. "3,2 km entfernt". */
  label: string;
  /** Beitrag dieses Faktors zum Gesamtscore, 0 - Gewicht des Faktors. */
  points: number;
}

export const MATCH_STATUSES = ["PENDING", "NOTIFIED", "ACCEPTED", "DECLINED", "EXPIRED"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/** Zuordnung Anfrage <-> Unternehmen mit Bewertung. */
export interface Match {
  id: Uuid;
  requestId: Uuid;
  businessId: Uuid;
  /** 0 - 100. */
  score: number;
  reasons: MatchReason[];
  status: MatchStatus;
  distanceKm: number | null;
  createdAt: IsoDateTime;
}

/** Match inklusive Unternehmensdaten - das sieht der Kunde. */
export interface MatchWithBusiness extends Match {
  business: Business;
}
