import type { IsoDateTime, Uuid } from "./common.js";

/**
 * PENDING   - vom Unternehmen abgeschickt, der Kunde hat noch nicht entschieden
 * ACCEPTED  - der Kunde hat angenommen
 * DECLINED  - der Kunde hat abgelehnt
 * WITHDRAWN - das Unternehmen hat zurueckgezogen
 * EXPIRED   - validUntil ist verstrichen
 */
export const OFFER_STATUSES = ["PENDING", "ACCEPTED", "DECLINED", "WITHDRAWN", "EXPIRED"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

/**
 * Ein Angebot. Alle Betraege in Cent - Gleitkommazahlen haben bei Geld
 * nichts zu suchen.
 *
 * Ueber Preis und Inhalt entscheidet immer das Unternehmen. Die KI darf
 * hoechstens einen Textvorschlag liefern.
 */
export interface Offer {
  id: Uuid;
  requestId: Uuid;
  businessId: Uuid;
  laborCents: number;
  materialCents: number;
  travelCents: number;
  /** Summe der drei Positionen. Wird serverseitig berechnet. */
  totalCents: number;
  description: string;
  /** true, wenn der Beschreibungstext aus einem KI-Vorschlag stammt. */
  descriptionAiAssisted: boolean;
  validUntil: IsoDateTime;
  status: OfferStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreateOfferInput {
  requestId: string;
  laborCents: number;
  materialCents: number;
  travelCents: number;
  description: string;
  validUntil: string;
  descriptionAiAssisted?: boolean;
}
