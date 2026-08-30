import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type {
  AiAnalysisDetail,
  AuthResult,
  Business,
  Category,
  Job,
  Match,
  MatchWithBusiness,
  Offer,
  Review,
  ServiceRequest,
} from "@jobflow/types";
import { expectOk, skipUnlessDatabase, startHarness, TestClient, uniqueEmail, type TestHarness } from "./helpers.js";

/**
 * Der komplette Weg durch die Plattform - einmal von vorne bis hinten.
 *
 * Genau dieser Ablauf ist JobFlow:
 *   Anfrage -> KI -> Rueckfragen -> Matching -> Angebot -> Termin -> Auftrag -> Bewertung
 *
 * Solange dieser Test durchlaeuft, funktioniert der Kern des Produkts.
 */
describe("Der Weg von der Anfrage zum Auftrag", skipUnlessDatabase, () => {
  let harness: TestHarness;
  let kunde: TestClient;
  let betrieb: TestClient;

  before(async () => {
    harness = await startHarness();
    kunde = new TestClient(harness.baseUrl);
    betrieb = new TestClient(harness.baseUrl);
  });

  after(async () => {
    await harness.close();
  });

  it("laeuft vollstaendig durch", async () => {
    // --- 1. Konten anlegen -------------------------------------------------
    const kundenKonto = expectOk<AuthResult>(
      await kunde.post("/auth/register", {
        email: uniqueEmail("max"),
        name: "Max Mustermann",
        password: "ein-langes-passwort",
        role: "CUSTOMER",
      }),
      "Kunde registrieren",
    );
    kunde.setToken(kundenKonto.token);
    assert.equal(kundenKonto.user.role, "CUSTOMER");

    const betriebsKonto = expectOk<AuthResult>(
      await betrieb.post("/auth/register", {
        email: uniqueEmail("heizpro"),
        name: "HeizPro",
        password: "ein-langes-passwort",
        role: "BUSINESS",
      }),
      "Unternehmen registrieren",
    );
    betrieb.setToken(betriebsKonto.token);

    // Zum Unternehmenskonto entsteht sofort ein Profil - sonst muesste jede
    // spaetere Abfrage den Sonderfall "Konto ohne Unternehmen" behandeln.
    const profil = expectOk<Business>(await betrieb.get("/businesses/me"), "Unternehmensprofil");
    assert.equal(profil.name, "HeizPro");

    // --- 2. Unternehmen einrichten ----------------------------------------
    const kategorien = expectOk<Category[]>(await kunde.get("/categories"), "Kategorien");
    const heizung = kategorien.find((category) => category.slug === "heizung");
    assert.ok(heizung, "Die Seed-Daten muessen die Kategorie Heizung enthalten.");

    expectOk<Business>(
      await betrieb.patch("/businesses/me", {
        name: "HeizPro",
        description: "Heizungsbau und Sanitaerinstallation im Ruhrgebiet.",
        latitude: 51.4508,
        longitude: 7.0131,
        serviceRadiusKm: 40,
      }),
      "Profil pflegen",
    );

    expectOk(
      await betrieb.post("/businesses/me/services", {
        categoryId: heizung.id,
        name: "Heizungsreparatur",
        description: "Stoerungssuche und Reparatur an Heizungsanlagen.",
        priceMinCents: 8000,
        priceMaxCents: 25000,
      }),
      "Leistung anlegen",
    );

    expectOk(
      await betrieb.post("/businesses/me/availability", {
        slots: [
          { weekday: 1, startTime: "08:00", endTime: "12:00" },
          { weekday: 1, startTime: "14:00", endTime: "18:00" },
          { weekday: 2, startTime: "09:00", endTime: "17:00" },
        ],
      }),
      "Verfuegbarkeit hinterlegen",
    );

    // --- 3. Anfrage: "Meine Heizung wird nicht warm." ----------------------
    const anfrage = expectOk<ServiceRequest>(
      await kunde.post("/requests", {
        description: "Meine Heizung wird nicht mehr richtig warm.",
        locationLabel: "45127 Essen",
        latitude: 51.4556,
        longitude: 7.0116,
      }),
      "Anfrage erstellen",
    );
    assert.equal(anfrage.status, "DRAFT");
    assert.equal(anfrage.urgency, "NORMAL");

    // Die Anfrage taucht sofort unter "Meine Anfragen" auf - das ist der
    // Meilenstein aus dem Konzept.
    const meineAnfragen = expectOk<{ items: ServiceRequest[]; total: number }>(
      await kunde.get("/requests"),
      "Meine Anfragen",
    );
    assert.equal(meineAnfragen.total, 1);
    assert.equal(meineAnfragen.items[0]?.id, anfrage.id);

    // --- 4. KI-Analyse ----------------------------------------------------
    const analyse = expectOk<AiAnalysisDetail>(
      await kunde.post(`/requests/${anfrage.id}/analyze`),
      "Analyse",
    );
    assert.equal(analyse.categoryId, heizung.id, "Die KI soll die Heizung erkennen.");
    assert.ok(analyse.questions.length > 0, "Es soll Rueckfragen geben.");
    assert.ok(analyse.confidence > 0 && analyse.confidence <= 1);

    // --- 5. Rueckfragen beantworten ---------------------------------------
    const ersteFrage = analyse.questions[0];
    assert.ok(ersteFrage);
    const beantwortet = expectOk<{ answer: string | null }>(
      await kunde.post(`/requests/${anfrage.id}/questions/${ersteFrage.id}`, {
        answer: "Alle Heizkoerper sind betroffen, seit gestern Abend.",
      }),
      "Rueckfrage beantworten",
    );
    assert.equal(beantwortet.answer, "Alle Heizkoerper sind betroffen, seit gestern Abend.");

    // --- 6. Matching ------------------------------------------------------
    const treffer = expectOk<MatchWithBusiness[]>(
      await kunde.post(`/requests/${anfrage.id}/matches`),
      "Matching",
    );
    assert.equal(treffer.length, 1, "HeizPro muss gefunden werden.");
    const treffer0 = treffer[0];
    assert.ok(treffer0);
    assert.equal(treffer0.business.id, profil.id);
    assert.ok(treffer0.score > 0 && treffer0.score <= 100);
    assert.ok(treffer0.reasons.length > 0, "Der Vorschlag muss begruendet sein.");
    assert.ok(
      treffer0.distanceKm !== null && treffer0.distanceKm < 5,
      "Essen liegt nur wenige Kilometer entfernt.",
    );

    // --- 7. Das Unternehmen sieht die Anfrage -----------------------------
    const anfragenDesBetriebs = expectOk<Match[]>(await betrieb.get("/businesses/me/matches"), "Anfragen im Dashboard");
    assert.equal(anfragenDesBetriebs.length, 1);
    assert.equal(anfragenDesBetriebs[0]?.requestId, anfrage.id);

    // Es darf die Anfrage lesen - inklusive der KI-Zusammenfassung.
    const gelesen = expectOk<ServiceRequest>(await betrieb.get(`/requests/${anfrage.id}`), "Anfrage oeffnen");
    assert.equal(gelesen.id, anfrage.id);
    const zusammenfassung = expectOk<AiAnalysisDetail>(
      await betrieb.get(`/requests/${anfrage.id}/analysis`),
      "KI-Zusammenfassung",
    );
    assert.ok(zusammenfassung.summary.length > 0);

    // --- 8. Textvorschlag und Angebot -------------------------------------
    const vorschlag = expectOk<{ text: string; isAiGenerated: boolean }>(
      await betrieb.post("/offers/suggest-text", { context: zusammenfassung.summary }),
      "Textvorschlag",
    );
    assert.ok(vorschlag.text.length > 20);
    // Der Vorschlag ist als KI-Text gekennzeichnet - der Betrieb entscheidet,
    // ob er ihn uebernimmt.
    assert.equal(vorschlag.isAiGenerated, true);

    const angebot = expectOk<Offer>(
      await betrieb.post("/offers", {
        requestId: anfrage.id,
        laborCents: 8000,
        materialCents: 2500,
        travelCents: 1500,
        description: vorschlag.text,
        validUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        descriptionAiAssisted: true,
      }),
      "Angebot erstellen",
    );
    // 80 EUR + 25 EUR + 15 EUR = 120 EUR, genau wie im Konzept.
    assert.equal(angebot.totalCents, 12000);
    assert.equal(angebot.status, "PENDING");

    // --- 9. Der Kunde sieht das Angebot -----------------------------------
    const angebote = expectOk<Offer[]>(await kunde.get(`/requests/${anfrage.id}/offers`), "Angebote");
    assert.equal(angebote.length, 1);
    assert.equal(angebote[0]?.totalCents, 12000);

    const nachAngebot = expectOk<ServiceRequest>(await kunde.get(`/requests/${anfrage.id}`), "Anfrage nach Angebot");
    assert.equal(nachAngebot.status, "OFFERED");

    // --- 10. Angebot annehmen -> Auftrag entsteht -------------------------
    const angenommen = expectOk<{ offer: Offer; job: Job }>(
      await kunde.post(`/offers/${angebot.id}/accept`),
      "Angebot annehmen",
    );
    assert.equal(angenommen.offer.status, "ACCEPTED");
    assert.equal(angenommen.job.status, "SCHEDULED");
    assert.equal(angenommen.job.businessId, profil.id);

    // --- 11. Termin -------------------------------------------------------
    const freieZeiten = expectOk<{ startTime: string; endTime: string }[]>(
      await kunde.get(`/businesses/${profil.id}/availability`),
      "Freie Zeiten",
    );
    assert.ok(freieZeiten.length > 0, "Aus dem Wochenplan muessen sich Zeitfenster ergeben.");

    const ersterSlot = freieZeiten[0];
    assert.ok(ersterSlot);
    const termin = expectOk<{ id: string; status: string }>(
      await kunde.post("/appointments", {
        offerId: angebot.id,
        startTime: ersterSlot.startTime,
        endTime: ersterSlot.endTime,
      }),
      "Termin buchen",
    );
    assert.equal(termin.status, "CONFIRMED");

    // --- 12. Chat ---------------------------------------------------------
    const gespraeche = expectOk<{ id: string }[]>(await kunde.get("/conversations"), "Gespraeche");
    assert.equal(gespraeche.length, 1, "Zum Angebot gehoert ein Gespraechsfaden.");
    const gespraech = gespraeche[0];
    assert.ok(gespraech);

    expectOk(
      await kunde.post(`/conversations/${gespraech.id}/messages`, { body: "Wann koennen Sie kommen?" }),
      "Nachricht senden",
    );
    const nachrichten = expectOk<{ body: string; isAiGenerated: boolean }[]>(
      await betrieb.get(`/conversations/${gespraech.id}/messages`),
      "Nachrichten lesen",
    );
    assert.equal(nachrichten.length, 1);
    assert.equal(nachrichten[0]?.isAiGenerated, false);

    // --- 13. Auftrag durchfuehren -----------------------------------------
    expectOk<Job>(
      await betrieb.patch(`/jobs/${angenommen.job.id}/status`, { status: "IN_PROGRESS" }),
      "Auftrag beginnen",
    );
    const fertig = expectOk<Job>(
      await betrieb.patch(`/jobs/${angenommen.job.id}/status`, { status: "COMPLETED" }),
      "Auftrag abschliessen",
    );
    assert.equal(fertig.status, "COMPLETED");
    assert.ok(fertig.completedAt !== null);

    const abgeschlossen = expectOk<ServiceRequest>(
      await kunde.get(`/requests/${anfrage.id}`),
      "Anfrage nach Abschluss",
    );
    assert.equal(abgeschlossen.status, "COMPLETED");

    // --- 14. Bewertung ----------------------------------------------------
    const bewertung = expectOk<Review>(
      await kunde.post("/reviews", {
        jobId: angenommen.job.id,
        rating: 5,
        text: "Sehr freundlicher und zuverlaessiger Service.",
      }),
      "Bewertung",
    );
    assert.equal(bewertung.rating, 5);

    // Der Durchschnitt wird am Unternehmen fortgeschrieben - sonst muesste das
    // Matching bei jeder Anfrage alle Bewertungen zusammenrechnen.
    const nachBewertung = expectOk<Business>(await betrieb.get("/businesses/me"), "Profil nach Bewertung");
    assert.equal(nachBewertung.rating, 5);
    assert.equal(nachBewertung.reviewCount, 1);
    assert.equal(nachBewertung.completedJobCount, 1);

    // --- 15. Kennzahlen ---------------------------------------------------
    const statistik = expectOk<{ matchCount: number; offerCount: number; jobCount: number; offerRate: number; winRate: number }>(
      await betrieb.get("/businesses/me/statistics"),
      "Statistik",
    );
    assert.deepEqual(
      { matchCount: statistik.matchCount, offerCount: statistik.offerCount, jobCount: statistik.jobCount },
      { matchCount: 1, offerCount: 1, jobCount: 1 },
    );
    assert.equal(statistik.offerRate, 100);
    assert.equal(statistik.winRate, 100);
  });

  it("zeichnet den Funnel als Ereignisse auf", async () => {
    // Downloads sind nicht die Kennzahl. Wir wollen wissen, wie viele Anfragen
    // tatsaechlich zu Auftraegen werden - dafuer braucht es diese Ereignisse.
    const result = await harness.app.db.query<{ name: string; count: string }>(
      "SELECT name, count(*)::text AS count FROM analytics_events GROUP BY name",
    );
    const events = new Map(result.rows.map((row) => [row.name, Number(row.count)] as const));

    for (const name of [
      "request_created",
      "ai_analysis_completed",
      "match_generated",
      "offer_created",
      "offer_accepted",
      "appointment_booked",
      "job_completed",
      "review_created",
    ]) {
      assert.equal(events.get(name), 1, `Ereignis ${name} fehlt.`);
    }
  });
});
