import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aiAnalysisResultSchema,
  createOfferSchema,
  createRequestSchema,
  paginationSchema,
  registerSchema,
  validate,
} from "../src/index.js";

describe("registerSchema", () => {
  it("setzt CUSTOMER als Standardrolle", () => {
    const result = validate(registerSchema, {
      email: "max@example.test",
      name: "Max Mustermann",
      password: "ein-langes-passwort",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.role, "CUSTOMER");
  });

  it("lässt ADMIN nicht als selbst gewählte Rolle zu", () => {
    const result = validate(registerSchema, {
      email: "max@example.test",
      name: "Max Mustermann",
      password: "ein-langes-passwort",
      role: "ADMIN",
    });
    assert.equal(result.ok, false);
  });

  it("weist zu kurze Passwörter zurück", () => {
    const result = validate(registerSchema, {
      email: "max@example.test",
      name: "Max Mustermann",
      password: "kurz",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok("password" in result.fields);
  });
});

describe("createRequestSchema", () => {
  const base = { description: "Meine Heizung wird nicht mehr richtig warm." };

  it("nimmt eine einfache Beschreibung an", () => {
    const result = validate(createRequestSchema, base);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.urgency, "NORMAL");
  });

  it("weist eine zu kurze Beschreibung zurück", () => {
    assert.equal(validate(createRequestSchema, { description: "kaputt" }).ok, false);
  });

  it("verlangt Breiten- und Längengrad gemeinsam", () => {
    const result = validate(createRequestSchema, { ...base, latitude: 51.45 });
    assert.equal(result.ok, false);
  });

  it("weist einen Zeitraum zurück, der rückwärts laeuft", () => {
    const result = validate(createRequestSchema, {
      ...base,
      desiredFrom: "2026-09-10T08:00:00Z",
      desiredTo: "2026-09-01T08:00:00Z",
    });
    assert.equal(result.ok, false);
  });
});

describe("createOfferSchema", () => {
  const base = {
    requestId: "6f2b1e4a-9c3d-4b1f-8e2a-0d4c5b6a7e8f",
    description: "Prüfung und Reparatur der Heizungsanlage.",
    validUntil: "2026-09-05T00:00:00Z",
  };

  it("berechnet keine Gesamtsumme, verlangt aber einen Betrag größer 0", () => {
    assert.equal(validate(createOfferSchema, { ...base, laborCents: 0 }).ok, false);
    assert.equal(validate(createOfferSchema, { ...base, laborCents: 8000 }).ok, true);
  });

  it("weist Nachkommastellen bei Centbeträgen zurück", () => {
    assert.equal(validate(createOfferSchema, { ...base, laborCents: 80.5 }).ok, false);
  });

  it("weist negative Beträge zurück", () => {
    assert.equal(validate(createOfferSchema, { ...base, laborCents: 8000, travelCents: -100 }).ok, false);
  });
});

describe("aiAnalysisResultSchema", () => {
  it("nimmt ein vollständiges Ergebnis an", () => {
    const result = validate(aiAnalysisResultSchema, {
      categorySlug: "heizung",
      summary: "Heizkörper wird nicht warm",
      urgency: "NORMAL",
      questions: ["Seit wann?"],
      confidence: 0.91,
    });
    assert.equal(result.ok, true);
  });

  it("weist eine Konfidenz außerhalb von 0 bis 1 zurück", () => {
    const result = validate(aiAnalysisResultSchema, {
      categorySlug: null,
      summary: "Etwas ist kaputt",
      confidence: 1.5,
    });
    assert.equal(result.ok, false);
  });

  it("weist einen Slug mit unerwarteten Zeichen zurück", () => {
    // Genau der Fall, gegen den die Prüfung schützt: ein Modell erfindet
    // einen Wert, der so nie in der Datenbank stehen darf.
    const result = validate(aiAnalysisResultSchema, {
      categorySlug: "'; DROP TABLE categories; --",
      summary: "Etwas ist kaputt",
      confidence: 0.5,
    });
    assert.equal(result.ok, false);
  });

  it("begrenzt die Zahl der Rückfragen", () => {
    const result = validate(aiAnalysisResultSchema, {
      categorySlug: null,
      summary: "Etwas ist kaputt",
      confidence: 0.5,
      questions: ["a?", "b?", "c?", "d?", "e?", "f?"],
    });
    assert.equal(result.ok, false);
  });
});

describe("paginationSchema", () => {
  it("hat sinnvolle Standardwerte", () => {
    assert.deepEqual(validate(paginationSchema, {}), { ok: true, value: { limit: 20, offset: 0 } });
  });

  it("begrenzt limit nach oben", () => {
    assert.equal(validate(paginationSchema, { limit: 5000 }).ok, false);
  });
});
