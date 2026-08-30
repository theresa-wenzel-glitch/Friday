import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_MATCH_WEIGHTS } from "@jobflow/types";
import { scoreCandidate, type CandidateInput } from "../src/modules/matching/engine.js";

/** Ein durchschnittlicher Betrieb ohne Auffaelligkeiten. */
function candidate(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    businessId: "b1",
    matchesCategory: true,
    matchesParentCategory: false,
    distanceKm: 5,
    serviceRadiusKm: 30,
    hasAvailability: true,
    rating: 4.5,
    reviewCount: 40,
    completedJobCount: 25,
    avgResponseMinutes: 30,
    priceMinCents: 9000,
    priceMaxCents: 13000,
    verified: true,
    ...overrides,
  };
}

describe("Matching-Score", () => {
  it("bleibt zwischen 0 und 100", () => {
    const best = scoreCandidate(candidate({ distanceKm: 0, rating: 5, reviewCount: 500, completedJobCount: 900, avgResponseMinutes: 1 }));
    const worst = scoreCandidate(
      candidate({
        matchesCategory: false,
        matchesParentCategory: false,
        distanceKm: 999,
        hasAvailability: false,
        rating: 1,
        reviewCount: 200,
        completedJobCount: 0,
        avgResponseMinutes: 5000,
      }),
    );
    assert.ok(best.score <= 100 && best.score >= 0, `best=${best.score}`);
    assert.ok(worst.score <= 100 && worst.score >= 0, `worst=${worst.score}`);
    assert.ok(best.score > worst.score);
  });

  it("gewichtet die passende Leistung am staerksten", () => {
    const exact = scoreCandidate(candidate({ matchesCategory: true, matchesParentCategory: false }));
    const parentOnly = scoreCandidate(candidate({ matchesCategory: false, matchesParentCategory: true }));
    const neither = scoreCandidate(candidate({ matchesCategory: false, matchesParentCategory: false }));

    assert.ok(exact.score > parentOnly.score);
    assert.ok(parentOnly.score > neither.score);
    // Der Abstand zwischen "genau passend" und "gar nicht passend" entspricht
    // dem vollen Gewicht des Faktors.
    assert.equal(exact.score - neither.score, DEFAULT_MATCH_WEIGHTS.service);
  });

  it("schliesst Betriebe ausserhalb ihres Einsatzradius vom Entfernungspunkt aus", () => {
    const inside = scoreCandidate(candidate({ distanceKm: 29, serviceRadiusKm: 30 }));
    const outside = scoreCandidate(candidate({ distanceKm: 31, serviceRadiusKm: 30 }));
    assert.ok(inside.score > outside.score);
    assert.ok(!outside.reasons.some((reason) => reason.factor === "distance" && reason.points > 0));
  });

  it("bevorzugt den naeheren Betrieb bei sonst gleichen Daten", () => {
    const near = scoreCandidate(candidate({ distanceKm: 2 }));
    const far = scoreCandidate(candidate({ distanceKm: 25 }));
    assert.ok(near.score > far.score);
  });

  it("laesst wenige Bestbewertungen nicht viele gute Bewertungen ueberholen", () => {
    // Genau der Fall, den ein ungedaempfter Durchschnitt falsch macht:
    // 5,0 aus einer einzigen Bewertung sagt fast nichts aus.
    const oneFiveStar = scoreCandidate(candidate({ rating: 5, reviewCount: 1 }));
    const manyGood = scoreCandidate(candidate({ rating: 4.7, reviewCount: 200 }));
    assert.ok(manyGood.score >= oneFiveStar.score);
  });

  it("benachteiligt einen neuen Betrieb ohne Bewertungen nicht uebermaessig", () => {
    const fresh = scoreCandidate(candidate({ rating: null, reviewCount: 0, completedJobCount: 0, avgResponseMinutes: null }));
    const bad = scoreCandidate(candidate({ rating: 1.2, reviewCount: 80, completedJobCount: 0, avgResponseMinutes: 2000 }));
    assert.ok(fresh.score > bad.score, `fresh=${fresh.score} bad=${bad.score}`);
  });

  it("wertet fehlende Koordinaten neutral, nicht als Ausschluss", () => {
    const unknown = scoreCandidate(candidate({ distanceKm: null }));
    const veryFar = scoreCandidate(candidate({ distanceKm: 40, serviceRadiusKm: 30 }));
    assert.ok(unknown.score > veryFar.score);
    assert.equal(unknown.distanceKm, null);
  });

  it("belohnt den guenstigeren Anbieter gegenueber dem Referenzpreis", () => {
    const cheap = scoreCandidate(candidate({ priceMinCents: 6000, priceMaxCents: 8000 }), {
      referencePriceCents: 12000,
    });
    const expensive = scoreCandidate(candidate({ priceMinCents: 18000, priceMaxCents: 22000 }), {
      referencePriceCents: 12000,
    });
    assert.ok(cheap.score > expensive.score);
  });

  it("liefert nachvollziehbare Gruende, absteigend nach Gewicht", () => {
    const scored = scoreCandidate(candidate());
    assert.ok(scored.reasons.length > 0);
    for (let i = 1; i < scored.reasons.length; i += 1) {
      assert.ok((scored.reasons[i - 1] as { points: number }).points >= (scored.reasons[i] as { points: number }).points);
    }
    const distance = scored.reasons.find((reason) => reason.factor === "distance");
    assert.equal(distance?.label, "5,0 km entfernt");
  });

  it("nennt keinen Grund fuer einen Faktor, zu dem nichts bekannt ist", () => {
    const scored = scoreCandidate(candidate({ rating: null, reviewCount: 0, avgResponseMinutes: null, completedJobCount: 0 }));
    assert.ok(!scored.reasons.some((reason) => reason.factor === "rating"));
    assert.ok(!scored.reasons.some((reason) => reason.factor === "responseTime"));
    assert.ok(!scored.reasons.some((reason) => reason.factor === "experience"));
  });

  it("summiert die Gewichte auf 100", () => {
    const total = Object.values(DEFAULT_MATCH_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    assert.equal(total, 100);
  });
});
