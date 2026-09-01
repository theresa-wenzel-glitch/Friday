import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AuthResult, Business, Category, Entitlements, ServiceRequest, SubscriptionPlan } from "@jobflow/types";
import { expectOk, skipUnlessDatabase, startHarness, TestClient, uniqueEmail, type TestHarness } from "./helpers.js";

/**
 * Das Guthaben muss serverseitig greifen.
 *
 * Die App blendet den Knopf aus, wenn nichts mehr frei ist - das ist
 * Bequemlichkeit, keine Grenze. Wer die App verändert, ruft die Schnittstelle
 * direkt auf. Genau das wird hier getan.
 */
describe("Pakete und Guthaben", skipUnlessDatabase, () => {
  let harness: TestHarness;
  let kunde: TestClient;
  let betrieb: TestClient;
  let heizungId: string;

  before(async () => {
    harness = await startHarness();
    kunde = new TestClient(harness.baseUrl);
    betrieb = new TestClient(harness.baseUrl);

    const registriere = async (client: TestClient, prefix: string, role: "CUSTOMER" | "BUSINESS") => {
      const result = expectOk<AuthResult>(
        await client.post("/auth/register", {
          email: uniqueEmail(prefix), name: `${prefix} Test`,
          password: "ein-langes-passwort", role,
        }),
        `${prefix} registrieren`,
      );
      client.setToken(result.token);
    };
    await registriere(kunde, "kunde", "CUSTOMER");
    await registriere(betrieb, "betrieb", "BUSINESS");

    const kategorien = expectOk<Category[]>(await kunde.get("/categories"), "Kategorien");
    heizungId = kategorien.find((k) => k.slug === "heizung")?.id as string;

    expectOk(await betrieb.patch("/businesses/me", {
      name: "HeizPro", latitude: 51.45, longitude: 7.01, serviceRadiusKm: 50,
    }), "Profil");
    expectOk(await betrieb.post("/businesses/me/services", { categoryId: heizungId, name: "Heizung" }), "Leistung");
  });

  after(async () => {
    await harness.close();
  });

  /** Legt eine Anfrage an und vermittelt sie an den Betrieb. */
  async function anfrageMitMatching(): Promise<string> {
    const anfrage = expectOk<ServiceRequest>(
      await kunde.post("/requests", {
        description: "Meine Heizung wird nicht mehr richtig warm.",
        latitude: 51.4556, longitude: 7.0116,
      }),
      "Anfrage",
    );
    expectOk(await kunde.post(`/requests/${anfrage.id}/analyze`), "Analyse");
    expectOk(await kunde.post(`/requests/${anfrage.id}/matches`), "Matching");
    return anfrage.id;
  }

  async function angebotAbgeben(anfrageId: string) {
    return betrieb.post("/offers", {
      requestId: anfrageId,
      laborCents: 8000,
      description: "Prüfung und Reparatur der Heizungsanlage.",
      validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    });
  }

  it("nennt die Pakete öffentlich", async () => {
    const anonym = new TestClient(harness.baseUrl);
    const pakete = expectOk<SubscriptionPlan[]>(await anonym.get("/billing/plans"), "Pakete");
    assert.equal(pakete.length, 3);
    assert.deepEqual(pakete.map((p) => p.code), ["FREE", "PRO", "BUSINESS"]);
    assert.equal(pakete[0]?.priceCents, 0);
    assert.equal(pakete[1]?.priceCents, 2900);
    assert.equal(pakete[2]?.monthlyOfferLimit, null, "Business ist unbegrenzt");
  });

  it("startet jeder Betrieb im Paket Free", async () => {
    const stand = expectOk<Entitlements>(await betrieb.get("/billing/me"), "Guthaben");
    assert.equal(stand.plan.code, "FREE");
    assert.equal(stand.subscription, null);
    assert.equal(stand.usage.offersSent, 0);
    assert.equal(stand.usage.offersLeft, 5);
    assert.equal(stand.canSendOffer, true);
    assert.equal(stand.canUseAiAssistant, false, "Der KI-Assistent gehört zu Pro.");
  });

  it("zählt jedes Angebot auf das Guthaben", async () => {
    const anfrageId = await anfrageMitMatching();
    assert.equal((await angebotAbgeben(anfrageId)).status, 201);

    const stand = expectOk<Entitlements>(await betrieb.get("/billing/me"), "Guthaben");
    assert.equal(stand.usage.offersSent, 1);
    assert.equal(stand.usage.offersLeft, 4);
  });

  it("zählt ein überarbeitetes Angebot nicht erneut", async () => {
    const vorher = expectOk<Entitlements>(await betrieb.get("/billing/me"), "vorher");
    const anfragen = expectOk<{ items: ServiceRequest[] }>(await kunde.get("/requests"), "Anfragen");
    const erste = anfragen.items.at(-1) as ServiceRequest;

    // Dasselbe Angebot noch einmal, mit anderem Preis.
    const zweitesMal = await betrieb.post("/offers", {
      requestId: erste.id, laborCents: 9000,
      description: "Korrigierter Preis nach Rücksprache.",
      validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    });
    assert.equal(zweitesMal.status, 201);

    const nachher = expectOk<Entitlements>(await betrieb.get("/billing/me"), "nachher");
    assert.equal(nachher.usage.offersSent, vorher.usage.offersSent,
      "Eine Korrektur darf kein weiteres Kontingent kosten.");
  });

  it("verweigert das sechste Angebot mit 402 und nennt den Grund", async () => {
    // Bis zur Grenze auffüllen.
    let letzteAntwort;
    for (let i = 0; i < 10; i += 1) {
      const anfrageId = await anfrageMitMatching();
      letzteAntwort = await angebotAbgeben(anfrageId);
      if (letzteAntwort.status !== 201) break;
    }

    assert.equal(letzteAntwort?.status, 402, "Erwartet wurde 402 Payment Required.");
    assert.equal(letzteAntwort?.body.error?.code, "PLAN_LIMIT_REACHED");
    assert.match(letzteAntwort?.body.error?.message ?? "", /Free/);

    const stand = expectOk<Entitlements>(await betrieb.get("/billing/me"), "Guthaben");
    assert.equal(stand.usage.offersLeft, 0);
    assert.equal(stand.canSendOffer, false);
  });

  it("verweigert den KI-Textvorschlag im Paket Free", async () => {
    const antwort = await betrieb.post("/offers/suggest-text", { context: "Heizung wird nicht warm" });
    assert.equal(antwort.status, 402);
    assert.equal(antwort.body.error?.code, "PLAN_LIMIT_REACHED");
  });

  it("schaltet nach dem Wechsel auf Pro wieder frei", async () => {
    // Ohne verknüpftes Zahlungskonto lässt sich kein bezahltes Paket buchen -
    // die API sagt das ehrlich, statt es stillschweigend freizuschalten.
    const ueberCheckout = await betrieb.post("/billing/checkout", { planCode: "PRO" });
    assert.equal(ueberCheckout.status, 503);

    // Der Weg, den sonst der Webhook des Anbieters geht.
    const betriebsProfil = expectOk<Business>(await betrieb.get("/businesses/me"), "Profil");
    await harness.app.billing.setPlan(betriebsProfil.id, "PRO");

    const stand = expectOk<Entitlements>(await betrieb.get("/billing/me"), "Guthaben");
    assert.equal(stand.plan.code, "PRO");
    assert.equal(stand.usage.offerLimit, 50);
    assert.equal(stand.canSendOffer, true, "Der Verbrauch bleibt, die Grenze steigt.");
    assert.equal(stand.canUseAiAssistant, true);

    const anfrageId = await anfrageMitMatching();
    assert.equal((await angebotAbgeben(anfrageId)).status, 201);
    assert.equal((await betrieb.post("/offers/suggest-text", { context: "Heizung" })).status, 201);
  });

  it("lässt einen Kunden nicht an die Zahlungsdaten des Betriebs", async () => {
    assert.equal((await kunde.get("/billing/me")).status, 403);
    assert.equal((await kunde.post("/billing/checkout", { planCode: "PRO" })).status, 403);
  });

  it("weist einen Webhook ohne gültige Signatur ab", async () => {
    // Der gefährlichste Endpunkt der Anwendung: er ist öffentlich erreichbar.
    const anonym = new TestClient(harness.baseUrl);
    const antwort = await anonym.post("/webhooks/payments", {
      id: "evt_gefaelscht", type: "invoice.paid",
      data: { object: { metadata: { business_id: "egal", plan_code: "BUSINESS" } } },
    });
    assert.equal(antwort.status, 403);
  });
});
