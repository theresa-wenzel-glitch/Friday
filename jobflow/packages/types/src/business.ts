import type { IsoDateTime, Uuid } from "./common.js";

/** Ein Dienstleister. Gehört genau einem Benutzer mit der Rolle BUSINESS. */
export interface Business {
  id: Uuid;
  ownerId: Uuid;
  name: string;
  description: string | null;
  /** Von der Administration geprüft (Gewerbeanmeldung, Impressum ...). */
  verified: boolean;
  verifiedAt: IsoDateTime | null;
  /** Durchschnitt aller Bewertungen, 1.0 - 5.0, null solange keine vorliegt. */
  rating: number | null;
  reviewCount: number;
  /** Betriebssitz. Grundlage für die Entfernungsberechnung im Matching. */
  latitude: number | null;
  longitude: number | null;
  /** Wie weit das Unternehmen zu einem Auftrag fährt, in Kilometern. */
  serviceRadiusKm: number;
  /** Median der Antwortzeit auf neue Anfragen, in Minuten. Null = noch keine Daten. */
  avgResponseMinutes: number | null;
  /** Abgeschlossene Aufträge - fließt als "Erfahrung" ins Matching ein. */
  completedJobCount: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Eine konkrete Leistung, die ein Unternehmen anbietet. */
export interface BusinessService {
  id: Uuid;
  businessId: Uuid;
  categoryId: Uuid;
  name: string;
  description: string | null;
  /** Preisspanne in Cent. Null = keine Angabe. */
  priceMinCents: number | null;
  priceMaxCents: number | null;
  active: boolean;
  createdAt: IsoDateTime;
}

/**
 * Wöchentlich wiederkehrende Verfügbarkeit.
 * Der Kunde sieht später nur Zeitfenster, die hier freigegeben sind.
 */
export interface AvailabilitySlot {
  id: Uuid;
  businessId: Uuid;
  /** 0 = Sonntag ... 6 = Samstag (wie Date#getDay). */
  weekday: number;
  /** Ortszeit im Format "HH:MM". */
  startTime: string;
  endTime: string;
}

/** Mitarbeiter eines Unternehmens - darf Anfragen bearbeiten, aber nicht alles. */
export interface BusinessEmployee {
  id: Uuid;
  businessId: Uuid;
  userId: Uuid;
  /** OWNER darf das Unternehmen verwalten, MEMBER nur Anfragen bearbeiten. */
  role: BusinessMemberRole;
  createdAt: IsoDateTime;
}

export const BUSINESS_MEMBER_ROLES = ["OWNER", "MEMBER"] as const;
export type BusinessMemberRole = (typeof BUSINESS_MEMBER_ROLES)[number];
