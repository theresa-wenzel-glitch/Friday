import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aiAnalysisResultSchema, validate } from "@jobflow/validation";
import { RulesAiProvider } from "../src/modules/ai/rules-provider.js";

const ALL_SLUGS = [
  "heizung", "sanitaer", "elektrik", "maler", "dach", "schluessel",
  "kfz-reparatur", "kfz-reifen", "reinigung", "umzug", "montage",
  "gartenpflege", "baumpflege", "nachhilfe", "fotografie",
];

const provider = new RulesAiProvider();

async function analyze(description: string, overrides: Partial<Parameters<typeof provider.analyze>[0]> = {}) {
  return provider.analyze({
    description,
    knownCategorySlugs: ALL_SLUGS,
    photoCount: 0,
    ...overrides,
  });
}

describe("Regelbasierte Analyse", () => {
  it("erkennt die Heizung aus dem Beispiel des Konzepts", async () => {
    const result = await analyze("Meine Heizung wird nicht mehr richtig warm.");
    assert.equal(result.categorySlug, "heizung");
    assert.ok(result.questions.length > 0);
  });

  it("erkennt das tropfende Waschbecken aus dem Beispiel des Konzepts", async () => {
    const result = await analyze("Mein Waschbecken tropft.");
    assert.equal(result.categorySlug, "sanitaer");
  });

  it("liefert immer ein Ergebnis, das das Schema besteht", async () => {
    const beschreibungen = [
      "Meine Heizung wird nicht warm.",
      "Ich brauche jemanden, der meinen Rasen maeht.",
      "Das Auto macht komische Geräusche beim Bremsen.",
      "Völlig unklares Anliegen ohne erkennbare Kategorie.",
      "🙂",
    ];
    for (const beschreibung of beschreibungen) {
      const result = await analyze(beschreibung);
      const parsed = validate(aiAnalysisResultSchema, result);
      assert.equal(parsed.ok, true, `Schema verletzt für: ${beschreibung}`);
    }
  });

  it("gibt zu, wenn es die Kategorie nicht erkennt - statt zu raten", async () => {
    const result = await analyze("Ich hätte gerne etwas, das ich nicht näher beschreiben kann.");
    assert.equal(result.categorySlug, null);
    assert.ok(result.confidence <= 0.3, `confidence=${result.confidence}`);
  });

  it("schlägt nie eine Kategorie vor, die die Plattform nicht kennt", async () => {
    // Wenn "heizung" nicht existiert, darf sie auch nicht vorgeschlagen werden.
    const result = await analyze("Meine Heizung wird nicht warm.", {
      knownCategorySlugs: ["sanitaer", "elektrik"],
    });
    assert.notEqual(result.categorySlug, "heizung");
  });

  it("erkennt Dringlichkeit an den Formulierungen", async () => {
    const notfall = await analyze("Notfall: Wasserschaden, es laeuft aus dem Heizkörper!");
    assert.equal(notfall.urgency, "HIGH");

    const entspannt = await analyze("Die Heizung tropft leicht, hat aber keine Eile.");
    assert.equal(entspannt.urgency, "LOW");

    const normal = await analyze("Die Heizung wird nicht richtig warm.");
    assert.equal(normal.urgency, "NORMAL");
  });

  it("stellt weniger Rückfragen, wenn Fotos vorliegen", async () => {
    const ohne = await analyze("Meine Heizung wird nicht warm.", { photoCount: 0 });
    const mit = await analyze("Meine Heizung wird nicht warm.", { photoCount: 2 });
    assert.ok(mit.questions.length <= ohne.questions.length);
  });

  it("wiederholt keine bereits beantworteten Rückfragen", async () => {
    const erste = await analyze("Meine Heizung wird nicht warm.");
    const beantwortet = erste.questions.slice(0, 1).map((question) => ({ question, answer: "Seit gestern." }));
    const zweite = await analyze("Meine Heizung wird nicht warm.", { answeredQuestions: beantwortet });
    for (const question of beantwortet) {
      assert.ok(!zweite.questions.includes(question.question));
    }
  });

  it("bleibt bei der Konfidenz unter 1 - ein Regelwerk kann nicht sicher sein", async () => {
    const result = await analyze("Heizung Heizkörper Thermostat Warmwasser Therme Kessel");
    assert.ok(result.confidence < 1);
  });

  it("liefert einen Textvorschlag für ein Angebot", async () => {
    const text = await provider.suggestText({
      kind: "OFFER_DESCRIPTION",
      context: "Heizkörper wird nicht warm",
    });
    assert.ok(text.length > 20);
  });
});
