import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanCode } from "@jobflow/types";
import {
  PaymentUnavailableError,
  WebhookVerificationError,
  type CheckoutInput,
  type PaymentProvider,
  type WebhookEffect,
  type WebhookEvent,
} from "./provider.js";

/**
 * Anbindung an Stripe über dessen REST-Schnittstelle.
 *
 * Bewusst ohne SDK: die drei benötigten Aufrufe sind einfache Formularposts,
 * und eine Abhängigkeit, die Zahlungsverkehr berührt, will man selten und
 * bewusst aktualisieren. Wer lieber Mollie, Adyen oder PayPal nimmt, schreibt
 * eine zweite Umsetzung derselben Schnittstelle - der Rest der Anwendung
 * bleibt unberührt.
 *
 * Stripes Bezahlseite beherrscht Karte, PayPal, SEPA-Lastschrift, Apple Pay,
 * Google Pay und Klarna. Welche davon erscheinen, wird im Stripe-Konto
 * eingestellt, nicht hier im Code.
 */
export interface StripeOptions {
  secretKey: string;
  webhookSecret: string;
  /** Preis-Kennungen aus dem Stripe-Konto, je Paket. */
  priceIds: Partial<Record<PlanCode, string>>;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

const STRIPE_API = "https://api.stripe.com/v1";

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";
  readonly ready = true;

  private readonly options: StripeOptions;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(options: StripeOptions) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl ?? STRIPE_API;
  }

  async createCheckout(input: CheckoutInput): Promise<{ url: string; externalId: string }> {
    const priceId = this.options.priceIds[input.plan.code];
    if (priceId === undefined) {
      throw new PaymentUnavailableError(
        `Für das Paket ${input.plan.code} ist keine Stripe-Preis-Kennung hinterlegt (STRIPE_PRICE_${input.plan.code}).`,
      );
    }

    const felder: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      // Über die Metadaten findet der Webhook später den Betrieb wieder.
      // Ohne sie wüsste JobFlow bei der Bestätigung nicht, wem sie gilt.
      "metadata[business_id]": input.businessId,
      "metadata[plan_code]": input.plan.code,
      "subscription_data[metadata][business_id]": input.businessId,
      "subscription_data[metadata][plan_code]": input.plan.code,
    };
    if (input.providerCustomerId !== null) felder["customer"] = input.providerCustomerId;
    else felder["customer_email"] = input.email;

    const antwort = await this.post("/checkout/sessions", felder);
    const url = (antwort as { url?: unknown }).url;
    const id = (antwort as { id?: unknown }).id;
    if (typeof url !== "string" || typeof id !== "string") {
      throw new PaymentUnavailableError("Stripe hat keine Bezahladresse geliefert.");
    }
    return { url, externalId: id };
  }

  async billingPortalUrl(providerCustomerId: string, returnUrl: string): Promise<string> {
    const antwort = await this.post("/billing_portal/sessions", {
      customer: providerCustomerId,
      return_url: returnUrl,
    });
    const url = (antwort as { url?: unknown }).url;
    if (typeof url !== "string") {
      throw new PaymentUnavailableError("Stripe hat keine Adresse für die Zahlungsverwaltung geliefert.");
    }
    return url;
  }

  /**
   * Prüft die Signatur eines Stripe-Webhooks.
   *
   * Stripe signiert den unveränderten Rumpf zusammen mit einem Zeitstempel.
   * Beides muss geprüft werden: die Signatur gegen Fälschung, der Zeitstempel
   * gegen das Wiedereinspielen eines alten, echten Ereignisses.
   */
  verifyWebhook(rohkoerper: string, signatur: string | undefined): WebhookEvent {
    if (signatur === undefined || signatur === "") {
      throw new WebhookVerificationError("Die Signatur fehlt.");
    }

    const teile = new Map(
      signatur.split(",").map((teil) => {
        const index = teil.indexOf("=");
        return [teil.slice(0, index).trim(), teil.slice(index + 1).trim()] as const;
      }),
    );
    const zeitstempel = teile.get("t");
    const erwartet = teile.get("v1");
    if (zeitstempel === undefined || erwartet === undefined) {
      throw new WebhookVerificationError("Die Signatur hat ein unbekanntes Format.");
    }

    const alterSekunden = Math.abs(Date.now() / 1000 - Number(zeitstempel));
    if (!Number.isFinite(alterSekunden) || alterSekunden > 300) {
      throw new WebhookVerificationError("Das Ereignis ist zu alt oder trägt keinen gültigen Zeitstempel.");
    }

    const berechnet = createHmac("sha256", this.options.webhookSecret)
      .update(`${zeitstempel}.${rohkoerper}`)
      .digest("hex");
    if (!zeitkonstantGleich(berechnet, erwartet)) {
      throw new WebhookVerificationError("Die Signatur stimmt nicht.");
    }

    return deuteStripeEreignis(JSON.parse(rohkoerper));
  }

  private async post(pfad: string, felder: Record<string, string>): Promise<unknown> {
    let antwort: Response;
    try {
      antwort = await this.fetchImpl(`${this.baseUrl}${pfad}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.secretKey}`,
          "content-type": "application/x-www-form-urlencoded",
          // Stripe empfiehlt, die Version festzuschreiben: sonst ändert sich
          // das Antwortformat, ohne dass jemand etwas angefasst hat.
          "stripe-version": "2024-06-20",
        },
        body: new URLSearchParams(felder).toString(),
      });
    } catch (fehler) {
      throw new PaymentUnavailableError("Stripe ist derzeit nicht erreichbar.", { cause: fehler });
    }

    const daten: unknown = await antwort.json().catch(() => ({}));
    if (!antwort.ok) {
      const meldung = (daten as { error?: { message?: string } }).error?.message ?? `Status ${antwort.status}`;
      throw new PaymentUnavailableError(`Stripe hat die Anfrage abgelehnt: ${meldung}`);
    }
    return daten;
  }
}

function zeitkonstantGleich(a: string, b: string): boolean {
  const pufferA = Buffer.from(a, "hex");
  const pufferB = Buffer.from(b, "hex");
  return pufferA.length === pufferB.length && timingSafeEqual(pufferA, pufferB);
}

/**
 * Übersetzt ein Stripe-Ereignis in das, was JobFlow davon braucht.
 *
 * Bewusst nur eine Handvoll Typen: alles Übrige wird protokolliert und
 * ignoriert. Ein Zahlungsanbieter sendet sehr viele Ereignisse, und auf jedes
 * zu reagieren wäre mehr Fehlerquelle als Nutzen.
 */
export function deuteStripeEreignis(ereignis: unknown): WebhookEvent {
  const e = ereignis as {
    id?: string;
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  const objekt = e.data?.object ?? {};
  const metadaten = (objekt["metadata"] ?? {}) as Record<string, unknown>;

  const alsText = (wert: unknown): string | null => (typeof wert === "string" && wert !== "" ? wert : null);
  const planCode = alsText(metadaten["plan_code"]);

  let effect: WebhookEffect = "IGNORE";
  switch (e.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "invoice.paid":
      effect = "ACTIVATE";
      break;
    case "invoice.payment_failed":
      effect = "PAST_DUE";
      break;
    case "customer.subscription.deleted":
      effect = "CANCEL";
      break;
    case "customer.subscription.updated": {
      // Bei einer Aktualisierung entscheidet der Status, was gilt.
      const status = alsText(objekt["status"]);
      effect = status === "active" || status === "trialing" ? "ACTIVATE"
        : status === "past_due" || status === "unpaid" ? "PAST_DUE"
        : status === "canceled" ? "CANCEL" : "IGNORE";
      break;
    }
    default:
      effect = "IGNORE";
  }

  const periodenEnde = objekt["current_period_end"];
  return {
    externalId: alsText(e.id) ?? "",
    type: e.type ?? "unbekannt",
    effect,
    businessId: alsText(metadaten["business_id"]),
    planCode: planCode === "FREE" || planCode === "PRO" || planCode === "BUSINESS" ? (planCode as PlanCode) : null,
    providerCustomerId: alsText(objekt["customer"]),
    providerSubscriptionId: alsText(objekt["subscription"]) ?? alsText(objekt["id"]),
    periodEnd: typeof periodenEnde === "number" ? new Date(periodenEnde * 1000) : null,
    raw: ereignis,
  };
}
