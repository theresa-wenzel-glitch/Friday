import type { IsoDateTime, Uuid } from "./common.js";

/**
 * Lebenszyklus einer Anfrage.
 *
 * DRAFT      - angelegt, noch nicht abgeschickt
 * ANALYZING  - die KI wertet Beschreibung und Fotos aus
 * OPEN       - abgeschickt, Rueckfragen beantwortet
 * MATCHING   - passende Unternehmen wurden ermittelt und benachrichtigt
 * OFFERED    - mindestens ein Angebot liegt vor
 * ACCEPTED   - der Kunde hat ein Angebot angenommen, daraus entsteht ein Job
 * COMPLETED  - der Auftrag ist abgeschlossen
 * CANCELLED  - vom Kunden zurueckgezogen
 */
export const REQUEST_STATUSES = [
  "DRAFT",
  "ANALYZING",
  "OPEN",
  "MATCHING",
  "OFFERED",
  "ACCEPTED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const URGENCIES = ["LOW", "NORMAL", "HIGH"] as const;
export type Urgency = (typeof URGENCIES)[number];

/** Die zentrale Entitaet der Plattform: das Problem eines Kunden. */
export interface ServiceRequest {
  id: Uuid;
  customerId: Uuid;
  /** Kann anfangs null sein - die KI schlaegt die Kategorie vor. */
  categoryId: Uuid | null;
  title: string | null;
  description: string;
  urgency: Urgency;
  latitude: number | null;
  longitude: number | null;
  /** Grobe Ortsangabe fuer die Anzeige, z. B. "45127 Essen". */
  locationLabel: string | null;
  /** Gewuenschter Zeitraum. */
  desiredFrom: IsoDateTime | null;
  desiredTo: IsoDateTime | null;
  status: RequestStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Foto zu einer Anfrage. Der Zugriff ist auf die Beteiligten beschraenkt. */
export interface RequestPhoto {
  id: Uuid;
  requestId: Uuid;
  /** Schluessel im Object Storage - niemals eine oeffentliche URL. */
  storageKey: string;
  contentType: string;
  byteSize: number;
  createdAt: IsoDateTime;
}

/** Eingabe zum Anlegen einer Anfrage. */
export interface CreateRequestInput {
  categoryId?: string | null;
  title?: string | null;
  description: string;
  urgency?: Urgency;
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  desiredFrom?: string | null;
  desiredTo?: string | null;
}

/** Anfrage inklusive der Daten, die die Detailansicht braucht. */
export interface ServiceRequestDetail extends ServiceRequest {
  photos: RequestPhoto[];
}
