import type { PlanCode, SubscriptionPlan } from "@jobflow/types";

/**
 * Die Schnittstelle zum Zahlungsanbieter.
 *
 * Genau wie bei der KI steckt der Anbieter hinter einem festen Vertrag. Das
 * ist hier noch wichtiger: welcher Anbieter am Ende genutzt wird, hängt von
 * Konditionen, Ländern und Zahlungsarten ab - und diese Entscheidung soll
 * nicht die halbe Anwendung umschreiben.
 *
 * Zwei Regeln gelten für jede Umsetzung:
 *
 *   1. JobFlow sieht niemals Kartennummern, IBANs oder PayPal-Zugangsdaten.
 *      Der Zahlungsvorgang läuft auf den Seiten des Anbieters. Gespeichert
 *      werden nur dessen Kennungen.
 *   2. Was bezahlt wurde, glaubt JobFlow ausschließlich dem signierten
 *      Webhook - niemals dem zurückkehrenden Browser. Eine Rückleitung lässt
 *      sich fälschen, indem jemand die Adresse von Hand aufruft.
 */
export interface PaymentProvider {
  /** Name, wie er in der Datenbank steht, z. B. "stripe". */
  readonly name: string;
  /** Ob echte Zahlungen möglich sind. Ohne Schlüssel: false. */
  readonly ready: boolean;

  /**
   * Startet einen Bezahlvorgang und liefert die Adresse der Bezahlseite.
   * Dort wählt der Zahlende die Zahlungsart - Karte, PayPal, Lastschrift.
   */
  createCheckout(input: CheckoutInput): Promise<{ url: string; externalId: string }>;

  /**
   * Adresse, unter der ein Betrieb Zahlungsart, Rechnungen und Kündigung
   * selbst verwaltet. Das spart JobFlow eine eigene Verwaltungsoberfläche
   * und hält Zahlungsdaten dort, wo sie hingehören.
   */
  billingPortalUrl(providerCustomerId: string, returnUrl: string): Promise<string>;

  /**
   * Prüft die Signatur eines eingehenden Webhooks und liefert das Ereignis.
   * Schlägt die Prüfung fehl, wird geworfen - ein ungeprüftes Ereignis darf
   * niemals etwas freischalten.
   */
  verifyWebhook(rohkoerper: string, signatur: string | undefined): WebhookEvent;
}

export interface CheckoutInput {
  businessId: string;
  plan: SubscriptionPlan;
  /** E-Mail des Betriebs - der Anbieter legt darüber seinen Kunden an. */
  email: string;
  /** Bereits vorhandene Kundenkennung beim Anbieter, falls vorhanden. */
  providerCustomerId: string | null;
  successUrl: string;
  cancelUrl: string;
}

/** Ein Ereignis des Anbieters, auf das JobFlow reagiert. */
export interface WebhookEvent {
  /** Kennung beim Anbieter - macht die Verarbeitung wiederholbar. */
  externalId: string;
  type: string;
  /** Was JobFlow daraus macht. "IGNORE" für alles Übrige. */
  effect: WebhookEffect;
  businessId: string | null;
  planCode: PlanCode | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  periodEnd: Date | null;
  raw: unknown;
}

export const WEBHOOK_EFFECTS = ["ACTIVATE", "PAST_DUE", "CANCEL", "IGNORE"] as const;
export type WebhookEffect = (typeof WEBHOOK_EFFECTS)[number];

/** Die Signatur des Webhooks stimmt nicht - das Ereignis wird verworfen. */
export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

/** Der Anbieter ist nicht erreichbar oder nicht eingerichtet. */
export class PaymentUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PaymentUnavailableError";
  }
}
