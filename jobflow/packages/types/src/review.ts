import type { IsoDateTime, Uuid } from "./common.js";

/** Bewertung eines abgeschlossenen Auftrags. Nur der Kunde darf bewerten. */
export interface Review {
  id: Uuid;
  jobId: Uuid;
  customerId: Uuid;
  businessId: Uuid;
  /** Ganzzahl 1 - 5. */
  rating: number;
  text: string | null;
  createdAt: IsoDateTime;
}

export interface CreateReviewInput {
  jobId: string;
  rating: number;
  text?: string | null;
}
