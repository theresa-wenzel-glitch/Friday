import type { IsoDateTime, Uuid } from "./common.js";

/**
 * Die drei Pakete.
 *
 * Der Code ist der Schlüssel, die Preise stehen in der Datenbank. So lässt
 * sich ein Preis ändern, ohne die Anwendung neu auszuliefern - und die
 * Preise sind ausdrücklich Hypothesen, solange keine echten Nutzer gezahlt
 * haben.
 */
export const PLAN_CODES = ["FREE", "PRO", "BUSINESS"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export interface SubscriptionPlan {
  code: PlanCode;
  name: string;
  /** Preis je Monat in Cent. */
  priceCents: number;
  currency: string;
  /** Angebote je Abrechnungsmonat. null bedeutet unbegrenzt. */
  monthlyOfferLimit: number | null;
  aiAssistant: boolean;
  calendar: boolean;
  statistics: boolean;
  multiUser: boolean;
  position: number;
}

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAST_DUE", "CANCELLED", "INCOMPLETE"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface Subscription {
  id: Uuid;
  businessId: Uuid;
  planCode: PlanCode;
  status: SubscriptionStatus;
  /** Name des Zahlungsanbieters, z. B. "stripe". Null, solange nichts angebunden ist. */
  provider: string | null;
  periodStart: IsoDateTime;
  periodEnd: IsoDateTime;
  cancelAtPeriodEnd: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Verbrauch im laufenden Abrechnungsmonat. */
export interface UsageSummary {
  periodStart: IsoDateTime;
  offersSent: number;
  /** null bedeutet unbegrenzt. */
  offerLimit: number | null;
  /** Wie viele Angebote noch möglich sind; null bei unbegrenzt. */
  offersLeft: number | null;
  aiCalls: number;
}

/**
 * Was ein Betrieb gerade darf.
 *
 * Diese Auskunft ist die einzige Wahrheit für die Oberfläche. Die App darf
 * damit Knöpfe ausblenden - verbindlich prüft aber immer das Backend, sonst
 * genügte ein manipulierter Client, um das Guthaben zu umgehen.
 */
export interface Entitlements {
  plan: SubscriptionPlan;
  subscription: Subscription | null;
  usage: UsageSummary;
  /** Darf gerade ein Angebot abgegeben werden? */
  canSendOffer: boolean;
  /** Darf der KI-Textvorschlag genutzt werden? */
  canUseAiAssistant: boolean;
}

/** Warum eine Aktion abgelehnt wurde - damit die App den richtigen Hinweis zeigt. */
export const BILLING_BLOCK_REASONS = ["OFFER_LIMIT_REACHED", "PLAN_REQUIRED"] as const;
export type BillingBlockReason = (typeof BILLING_BLOCK_REASONS)[number];

/** Antwort beim Wechsel eines Pakets. */
export interface CheckoutSession {
  /** Adresse der Bezahlseite des Anbieters. Null, wenn kein Anbieter angebunden ist. */
  url: string | null;
  /** Wurde das Paket ohne Zahlung gesetzt (Wechsel auf Free oder kein Anbieter)? */
  appliedDirectly: boolean;
  subscription: Subscription;
}
