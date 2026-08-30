import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AuthResult, Business, Category, Offer, ServiceRequest } from "@jobflow/types";
import { expectOk, skipUnlessDatabase, startHarness, TestClient, uniqueEmail, type TestHarness } from "./helpers.js";

/**
 * Berechtigungen.
 *
 * Die App darf nicht einfach "GET /requests/123" sagen und damit die Anfrage
 * eines fremden Kunden bekommen. Geprueft wird das ausschliesslich im Backend,
 * und genau das steht hier auf dem Pruefstand.
 */
describe("Berechtigungen", skipUnlessDatabase, () => {
  let harness: TestHarness;
  let kundeA: TestClient;
  let kundeB: TestClient;
  let betriebA: TestClient;
  let betriebB: TestClient;
  let anonym: TestClient;

  let anfrageVonA: ServiceRequest;
  let heizungId: string;
  let betriebAId: string;

  before(async () => {
    harness = await startHarness();
    kundeA = new TestClient(harness.baseUrl);
    kundeB = new TestClient(harness.baseUrl);
    betriebA = new TestClient(harness.baseUrl);
    betriebB = new TestClient(harness.baseUrl);
    anonym = new TestClient(harness.baseUrl);

    const registriere = async (client: TestClient, prefix: string, role: "CUSTOMER" | "BUSINESS") => {
      const result = expectOk<AuthResult>(
        await client.post("/auth/register", {
          email: uniqueEmail(prefix),
          name: `${prefix} Test`,
          password: "ein-langes-passwort",
          role,
        }),
        `${prefix} registrieren`,
      );
      client.setToken(result.token);
      return result;
    };

    await registriere(kundeA, "kunde-a", "CUSTOMER");
    await registriere(kundeB, "kunde-b", "CUSTOMER");
    await registriere(betriebA, "betrieb-a", "BUSINESS");
    await registriere(betriebB, "betrieb-b", "BUSINESS");

    const kategorien = expectOk<Category[]>(await anonym.get("/categories"), "Kategorien");
    heizungId = kategorien.find((category) => category.slug === "heizung")?.id as string;

    betriebAId = expectOk<Business>(await betriebA.get("/businesses/me"), "Profil A").id;
    expectOk(
      await betriebA.patch("/businesses/me", { name: "Betrieb A", latitude: 51.45, longitude: 7.01, serviceRadiusKm: 40 }),
      "Profil A pflegen",
    );
    expectOk(
      await betriebA.post("/businesses/me/services", { categoryId: heizungId, name: "Heizung" }),
      "Leistung A",
    );

    anfrageVonA = expectOk<ServiceRequest>(
      await kundeA.post("/requests", {
        description: "Meine Heizung wird nicht mehr richtig warm.",
        latitude: 51.4556,
        longitude: 7.0116,
      }),
      "Anfrage von A",
    );
  });

  after(async () => {
    await harness.close();
  });

  it("weist Zugriffe ohne Anmeldung ab", async () => {
    const result = await anonym.get("/requests");
    assert.equal(result.status, 401);
    assert.equal(result.body.error?.code, "UNAUTHENTICATED");
  });

  it("weist ein erfundenes Token ab", async () => {
    const gefaelscht = new TestClient(harness.baseUrl);
    gefaelscht.setToken("voellig-erfundenes-token");
    assert.equal((await gefaelscht.get("/me")).status, 401);
  });

  it("laesst einen Kunden die Anfrage eines anderen Kunden nicht sehen", async () => {
    const result = await kundeB.get(`/requests/${anfrageVonA.id}`);
    // 404 statt 403: sonst liesse sich am Statuscode ablesen, welche
    // Anfrage-IDs es ueberhaupt gibt.
    assert.equal(result.status, 404);
  });

  it("laesst einen Kunden die Anfrage eines anderen nicht aendern", async () => {
    const result = await kundeB.patch(`/requests/${anfrageVonA.id}`, { description: "Ich uebernehme das jetzt mal." });
    assert.equal(result.status, 404);

    const unveraendert = expectOk<ServiceRequest>(await kundeA.get(`/requests/${anfrageVonA.id}`), "Anfrage von A");
    assert.equal(unveraendert.description, "Meine Heizung wird nicht mehr richtig warm.");
  });

  it("laesst einen Kunden die Anfrage eines anderen nicht zurueckziehen", async () => {
    assert.equal((await kundeB.delete(`/requests/${anfrageVonA.id}`)).status, 404);
  });

  it("laesst einen Kunden die Analyse eines anderen nicht ausloesen", async () => {
    assert.equal((await kundeB.post(`/requests/${anfrageVonA.id}/analyze`)).status, 404);
  });

  it("laesst ein Unternehmen keine Anfrage lesen, zu der es nicht vorgeschlagen wurde", async () => {
    // Betrieb A ist noch nicht zugeordnet - die Anfrage bleibt unsichtbar.
    assert.equal((await betriebA.get(`/requests/${anfrageVonA.id}`)).status, 404);
  });

  it("laesst ein Unternehmen kein Angebot zu einer fremden Anfrage abgeben", async () => {
    const result = await betriebB.post("/offers", {
      requestId: anfrageVonA.id,
      laborCents: 100,
      description: "Ich mache das guenstiger, ohne gefragt worden zu sein.",
      validUntil: new Date(Date.now() + 86_400_000).toISOString(),
    });
    assert.equal(result.status, 404);
  });

  it("laesst ein Unternehmen erst nach dem Matching lesen und anbieten", async () => {
    expectOk(await kundeA.post(`/requests/${anfrageVonA.id}/analyze`), "Analyse");
    const treffer = expectOk<unknown[]>(await kundeA.post(`/requests/${anfrageVonA.id}/matches`), "Matching");
    assert.equal(treffer.length, 1, "Nur Betrieb A bietet Heizung an.");

    // Jetzt darf Betrieb A lesen - Betrieb B weiterhin nicht.
    assert.equal((await betriebA.get(`/requests/${anfrageVonA.id}`)).status, 200);
    assert.equal((await betriebB.get(`/requests/${anfrageVonA.id}`)).status, 404);
  });

  it("laesst ein Unternehmen die Daten eines anderen Unternehmens nicht abrufen", async () => {
    // "/businesses/me" bezieht sich immer auf das eigene Unternehmen - eine
    // fremde ID laesst sich gar nicht erst uebergeben.
    const eigenes = expectOk<Business>(await betriebB.get("/businesses/me"), "Profil B");
    assert.notEqual(eigenes.id, betriebAId);

    // Das oeffentliche Profil ist sichtbar, die Statistik nicht.
    assert.equal((await betriebB.get(`/businesses/${betriebAId}`)).status, 200);
    const statistik = expectOk<{ matchCount: number }>(await betriebB.get("/businesses/me/statistics"), "Statistik B");
    assert.equal(statistik.matchCount, 0, "Betrieb B sieht nur die eigenen Kennzahlen.");
  });

  it("laesst einen Kunden keine Unternehmensfunktionen aufrufen", async () => {
    const result = await kundeA.get("/businesses/me");
    assert.equal(result.status, 403);
    assert.equal(result.body.error?.code, "FORBIDDEN");
  });

  it("laesst ein Unternehmen keine Anfrage stellen", async () => {
    const result = await betriebA.post("/requests", { description: "Ich haette gerne eine Heizung repariert." });
    assert.equal(result.status, 403);
  });

  it("laesst nur den Kunden ein Angebot annehmen", async () => {
    const angebot = expectOk<Offer>(
      await betriebA.post("/offers", {
        requestId: anfrageVonA.id,
        laborCents: 8000,
        materialCents: 2500,
        travelCents: 1500,
        description: "Pruefung und Reparatur der Heizungsanlage.",
        validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      }),
      "Angebot",
    );

    // Ein fremder Kunde darf es nicht annehmen ...
    assert.equal((await kundeB.post(`/offers/${angebot.id}/accept`)).status, 404);
    // ... und das Unternehmen sein eigenes Angebot auch nicht.
    assert.equal((await betriebA.post(`/offers/${angebot.id}/accept`)).status, 403);
    // Der Kunde schon.
    assert.equal((await kundeA.post(`/offers/${angebot.id}/accept`)).status, 201);
  });

  it("laesst ein Angebot kein zweites Mal annehmen", async () => {
    const angebote = expectOk<Offer[]>(await kundeA.get(`/requests/${anfrageVonA.id}/offers`), "Angebote");
    const angenommen = angebote.find((offer) => offer.status === "ACCEPTED");
    assert.ok(angenommen);
    const result = await kundeA.post(`/offers/${angenommen.id}/accept`);
    assert.equal(result.status, 409);
    assert.equal(result.body.error?.code, "CONFLICT");
  });

  it("meldet den Fortschritt eines Auftrags nur an das ausfuehrende Unternehmen", async () => {
    const jobs = expectOk<{ id: string }[]>(await kundeA.get("/jobs"), "Auftraege");
    const job = jobs[0];
    assert.ok(job);
    // Der Kunde soll einen Auftrag nicht selbst als erledigt melden koennen.
    const result = await kundeA.patch(`/jobs/${job.id}/status`, { status: "IN_PROGRESS" });
    assert.equal(result.status, 403);
    assert.equal((await betriebA.patch(`/jobs/${job.id}/status`, { status: "IN_PROGRESS" })).status, 200);
  });

  it("laesst nur den Auftraggeber bewerten und nur nach Abschluss", async () => {
    const jobs = expectOk<{ id: string; status: string }[]>(await kundeA.get("/jobs"), "Auftraege");
    const job = jobs[0];
    assert.ok(job);

    // Noch nicht abgeschlossen.
    assert.equal((await kundeA.post("/reviews", { jobId: job.id, rating: 5 })).status, 409);

    expectOk(await betriebA.patch(`/jobs/${job.id}/status`, { status: "COMPLETED" }), "Abschliessen");

    // Ein fremder Kunde darf nicht bewerten.
    assert.equal((await kundeB.post("/reviews", { jobId: job.id, rating: 1 })).status, 404);
    // Der Auftraggeber schon - aber nur einmal.
    assert.equal((await kundeA.post("/reviews", { jobId: job.id, rating: 5 })).status, 201);
    assert.equal((await kundeA.post("/reviews", { jobId: job.id, rating: 1 })).status, 409);
  });

  it("laesst niemanden in ein fremdes Gespraech schreiben", async () => {
    const gespraeche = expectOk<{ id: string }[]>(await kundeA.get("/conversations"), "Gespraeche");
    const gespraech = gespraeche[0];
    assert.ok(gespraech);

    assert.equal((await kundeB.get(`/conversations/${gespraech.id}/messages`)).status, 404);
    assert.equal(
      (await kundeB.post(`/conversations/${gespraech.id}/messages`, { body: "Hallo, ich gehoere hier nicht hin." })).status,
      404,
    );
    assert.equal((await betriebB.get(`/conversations/${gespraech.id}/messages`)).status, 404);
  });

  it("beendet eine Session beim Abmelden sofort", async () => {
    const kurz = new TestClient(harness.baseUrl);
    const konto = expectOk<AuthResult>(
      await kurz.post("/auth/register", {
        email: uniqueEmail("kurz"),
        name: "Kurz Test",
        password: "ein-langes-passwort",
      }),
      "Registrieren",
    );
    kurz.setToken(konto.token);
    assert.equal((await kurz.get("/me")).status, 200);

    expectOk(await kurz.post("/auth/logout"), "Abmelden");
    // Das Token ist sofort wertlos - deshalb liegen Sessions in der Datenbank
    // und nicht nur in einem signierten Token.
    assert.equal((await kurz.get("/me")).status, 401);
  });

  it("nennt bei falschem Passwort nicht, ob es die Adresse gibt", async () => {
    const client = new TestClient(harness.baseUrl);
    const unbekannt = await client.post("/auth/login", {
      email: "gibt-es-nicht@example.test",
      password: "irgendein-passwort",
    });
    const falsch = await client.post("/auth/login", {
      email: "gibt-es-nicht@example.test",
      password: "anderes-passwort",
    });
    assert.equal(unbekannt.status, 401);
    assert.equal(unbekannt.body.error?.message, falsch.body.error?.message);
  });

  it("gibt niemals den Passwort-Hash heraus", async () => {
    const result = await kundeA.get("/me");
    const serialized = JSON.stringify(result.body);
    assert.ok(!serialized.includes("password"), serialized);
    assert.ok(!serialized.includes("scrypt"));
  });
});
