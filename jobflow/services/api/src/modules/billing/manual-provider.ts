import {
  PaymentUnavailableError,
  WebhookVerificationError,
  type CheckoutInput,
  type PaymentProvider,
  type WebhookEvent,
} from "./provider.js";

/**
 * Der Zustand, solange kein Zahlungskonto verknüpft ist.
 *
 * Er tut ausdrücklich nichts und sagt das auch. Die Alternative wäre ein
 * Provider, der so tut, als sei bezahlt worden - und damit Pakete
 * freischaltet, für die nie Geld geflossen ist. Lieber eine ehrliche
 * Fehlermeldung als eine stille Lüge in der Buchhaltung.
 *
 * Die Anwendung bleibt in diesem Zustand vollständig benutzbar: jeder Betrieb
 * arbeitet im Paket Free.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual";
  readonly ready = false;

  async createCheckout(_input: CheckoutInput): Promise<{ url: string; externalId: string }> {
    throw new PaymentUnavailableError(
      "Es ist noch kein Zahlungskonto verknüpft. Siehe docs/zahlungen.md.",
    );
  }

  async billingPortalUrl(_providerCustomerId: string, _returnUrl: string): Promise<string> {
    throw new PaymentUnavailableError(
      "Es ist noch kein Zahlungskonto verknüpft. Siehe docs/zahlungen.md.",
    );
  }

  verifyWebhook(_rohkoerper: string, _signatur: string | undefined): WebhookEvent {
    // Ohne Anbieter gibt es keine echten Webhooks. Ein eingehender Aufruf ist
    // also entweder ein Irrtum oder ein Versuch - beides wird abgewiesen.
    throw new WebhookVerificationError("Es ist kein Zahlungsanbieter eingerichtet.");
  }
}
