import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { ManualPaymentProvider } from "../src/modules/billing/manual-provider.js";
import { deuteStripeEreignis, StripeProvider } from "../src/modules/billing/stripe-provider.js";
import { PaymentUnavailableError, WebhookVerificationError } from "../src/modules/billing/provider.js";

const GEHEIMNIS = "whsec_test_geheimnis";

function provider(): StripeProvider {
  return new StripeProvider({
    secretKey: "sk_test_x",
    webhookSecret: GEHEIMNIS,
    priceIds: { PRO: "price_pro", BUSINESS: "price_business" },
  });
}

/** Baut eine gültige Stripe-Signatur, so wie der Anbieter sie sendet. */
function signiere(koerper: string, sekunden = Math.floor(Date.now() / 1000)): string {
  const wert = createHmac("sha256", GEHEIMNIS).update(`${sekunden}.${koerper}`).digest("hex");
  return `t=${sekunden},v1=${wert}`;
}

const EREIGNIS = JSON.stringify({
  id: "evt_1",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_1",
      customer: "cus_1",
      subscription: "sub_1",
      metadata: { business_id: "b-1", plan_code: "PRO" },
    },
  },
});

/**
 * Die Signaturprüfung ist die Stelle, an der Geld und Vertrauen zusammenkommen.
 *
 * Wer sie umgeht, kann sich jedes Paket freischalten, ohne zu zahlen. Deshalb
 * steht sie hier auf dem Prüfstand - und zwar ohne echte Schlüssel und ohne
 * Netzzugriff, damit der Test überall läuft.
 */
describe("Webhook-Signatur", () => {
  it("nimmt ein korrekt signiertes Ereignis an", () => {
    const ergebnis = provider().verifyWebhook(EREIGNIS, signiere(EREIGNIS));
    assert.equal(ergebnis.externalId, "evt_1");
    assert.equal(ergebnis.effect, "ACTIVATE");
    assert.equal(ergebnis.businessId, "b-1");
    assert.equal(ergebnis.planCode, "PRO");
  });

  it("weist eine gefälschte Signatur ab", () => {
    const gefaelscht = `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}`;
    assert.throws(() => provider().verifyWebhook(EREIGNIS, gefaelscht),
      (fehler: unknown) => fehler instanceof WebhookVerificationError);
  });

  it("weist ein verändertes Ereignis ab, auch bei echter Signatur", () => {
    // Genau der Angriff, gegen den signiert wird: jemand fängt ein echtes
    // Ereignis ab und schreibt sein eigenes Paket hinein.
    const signatur = signiere(EREIGNIS);
    const manipuliert = EREIGNIS.replace('"PRO"', '"BUSINESS"');
    assert.throws(() => provider().verifyWebhook(manipuliert, signatur),
      (fehler: unknown) => fehler instanceof WebhookVerificationError);
  });

  it("weist ein altes Ereignis ab", () => {
    // Wiedereinspielen eines echten, alten Ereignisses.
    const alt = Math.floor(Date.now() / 1000) - 3600;
    assert.throws(() => provider().verifyWebhook(EREIGNIS, signiere(EREIGNIS, alt)),
      (fehler: unknown) => fehler instanceof WebhookVerificationError);
  });

  it("weist eine fehlende Signatur ab", () => {
    assert.throws(() => provider().verifyWebhook(EREIGNIS, undefined),
      (fehler: unknown) => fehler instanceof WebhookVerificationError);
    assert.throws(() => provider().verifyWebhook(EREIGNIS, "unsinn"),
      (fehler: unknown) => fehler instanceof WebhookVerificationError);
  });
});

describe("Deutung der Stripe-Ereignisse", () => {
  const grund = (typ: string, objekt: Record<string, unknown> = {}) =>
    deuteStripeEreignis({ id: "evt", type: typ, data: { object: objekt } });

  it("schaltet bei bezahlter Rechnung frei", () => {
    assert.equal(grund("invoice.paid").effect, "ACTIVATE");
  });

  it("setzt bei fehlgeschlagener Zahlung auf überfällig, nicht auf gekündigt", () => {
    // Eine geplatzte Abbuchung ist noch keine Kündigung - der Betrieb soll
    // nicht sofort seine Funktionen verlieren.
    assert.equal(grund("invoice.payment_failed").effect, "PAST_DUE");
  });

  it("beendet bei gelöschtem Abo", () => {
    assert.equal(grund("customer.subscription.deleted").effect, "CANCEL");
  });

  it("richtet sich bei einer Änderung nach dem Status", () => {
    assert.equal(grund("customer.subscription.updated", { status: "active" }).effect, "ACTIVATE");
    assert.equal(grund("customer.subscription.updated", { status: "past_due" }).effect, "PAST_DUE");
    assert.equal(grund("customer.subscription.updated", { status: "canceled" }).effect, "CANCEL");
  });

  it("ignoriert alles Übrige, statt daran zu scheitern", () => {
    // Stripe sendet sehr viele Ereignisse. Auf jedes zu reagieren wäre mehr
    // Fehlerquelle als Nutzen.
    assert.equal(grund("customer.created").effect, "IGNORE");
    assert.equal(grund("irgendwas.unbekanntes").effect, "IGNORE");
  });

  it("übernimmt kein erfundenes Paket", () => {
    const ereignis = grund("invoice.paid", { metadata: { plan_code: "GRATIS_FUER_IMMER" } });
    assert.equal(ereignis.planCode, null);
  });

  it("kommt mit fehlenden Feldern zurecht", () => {
    const ereignis = deuteStripeEreignis({});
    assert.equal(ereignis.effect, "IGNORE");
    assert.equal(ereignis.businessId, null);
  });
});

describe("Ohne verknüpftes Zahlungskonto", () => {
  const manuell = new ManualPaymentProvider();

  it("meldet ehrlich, dass nichts eingerichtet ist", async () => {
    assert.equal(manuell.ready, false);
    await assert.rejects(
      () => manuell.createCheckout({
        businessId: "b", plan: { code: "PRO" } as never, email: "a@b.de",
        providerCustomerId: null, successUrl: "x", cancelUrl: "y",
      }),
      (fehler: unknown) => fehler instanceof PaymentUnavailableError,
    );
  });

  it("nimmt keine Webhooks an", () => {
    // Ohne Anbieter gibt es keine echten Ereignisse - ein eingehender Aufruf
    // ist ein Irrtum oder ein Versuch.
    assert.throws(() => manuell.verifyWebhook("{}", "t=1,v1=abc"),
      (fehler: unknown) => fehler instanceof WebhookVerificationError);
  });
});
