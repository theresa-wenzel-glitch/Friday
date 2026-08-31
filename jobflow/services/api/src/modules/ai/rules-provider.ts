import type { AiAnalysisResult } from "@jobflow/types";
import type { AiAnalysisInput, AiProvider, AiSuggestionInput } from "./provider.js";

/**
 * Ein regelbasierter Provider ohne externen Dienst.
 *
 * Er ist kein Ersatz für ein Sprachmodell, aber er erfüllt genau denselben
 * Vertrag. Damit lässt sich die gesamte Plattform - Anfrage, Rückfragen,
 * Matching, Angebot - entwickeln und testen, ohne von einem Modell und dessen
 * Kosten abzuhängen. Der Austausch gegen ein echtes Modell ist später eine
 * Zeile in der Konfiguration.
 */

interface Rule {
  slug: string;
  /** Wörter, die auf diese Kategorie hindeuten. */
  keywords: string[];
  summary: string;
  questions: string[];
}

const RULES: Rule[] = [
  {
    slug: "heizung",
    keywords: ["heizung", "heizkörper", "heizkoerper", "thermostat", "warmwasser", "therme", "kessel"],
    summary: "Die Heizung arbeitet nicht wie erwartet.",
    questions: [
      "Sind mehrere Heizkörper betroffen oder nur einer?",
      "Seit wann besteht das Problem?",
      "Welche Heizungsanlage ist verbaut?",
    ],
  },
  {
    slug: "sanitaer",
    keywords: ["waschbecken", "wasserhahn", "abfluss", "toilette", "wc", "dusche", "rohr", "tropft", "undicht", "verstopft", "spülkasten", "spuelkasten"],
    summary: "An der Sanitärinstallation tritt ein Defekt auf.",
    questions: [
      "Wo genau tritt das Wasser aus?",
      "Seit wann besteht das Problem?",
      "Lässt sich das Wasser abstellen?",
    ],
  },
  {
    slug: "elektrik",
    keywords: ["strom", "steckdose", "sicherung", "lichtschalter", "kabel", "fi", "kurzschluss", "lampe"],
    summary: "Es liegt eine Störung an der Elektroinstallation vor.",
    questions: [
      "Ist nur ein Raum betroffen oder die ganze Wohnung?",
      "Hat die Sicherung ausgelöst?",
    ],
  },
  {
    slug: "maler",
    keywords: ["streichen", "malern", "tapete", "wand", "anstrich", "lackieren", "farbe"],
    summary: "Es werden Malerarbeiten benötigt.",
    questions: ["Wie viele Quadratmeter sind es ungefähr?", "Sind die Wände vorbereitet?"],
  },
  {
    slug: "dach",
    keywords: ["dach", "ziegel", "dachrinne", "regenrinne", "dachfenster", "undichtes dach"],
    summary: "Am Dach besteht ein Schaden.",
    questions: ["Tritt bereits Wasser ins Gebäude ein?", "Wie viele Geschosse hat das Gebäude?"],
  },
  {
    slug: "schluessel",
    keywords: ["ausgesperrt", "schlüssel", "schluessel", "schloss", "tür klemmt", "tuer klemmt"],
    summary: "Es besteht ein Problem mit Schloss oder Zugang.",
    questions: ["Befindet sich jemand in der Wohnung?", "Um welche Art von Tuer handelt es sich?"],
  },
  {
    slug: "kfz-reparatur",
    keywords: ["auto", "motor", "bremse", "kupplung", "auspuff", "werkstatt", "fahrzeug", "pkw"],
    summary: "Am Fahrzeug ist eine Reparatur nötig.",
    questions: ["Welches Fahrzeugmodell und Baujahr?", "Ist das Fahrzeug noch fahrbereit?"],
  },
  {
    slug: "kfz-reifen",
    keywords: ["reifen", "felge", "reifenwechsel", "platten", "winterreifen", "sommerreifen"],
    summary: "Es geht um Reifen oder einen Reifenwechsel.",
    questions: ["Welche Reifengröße wird benötigt?", "Sind die Reifen bereits vorhanden?"],
  },
  {
    slug: "reinigung",
    keywords: ["putzen", "reinigung", "sauber", "fenster putzen", "grundreinigung", "haushalt"],
    summary: "Es werden Reinigungsarbeiten benötigt.",
    questions: ["Wie groß ist die zu reinigende Fläche?", "Einmalig oder regelmäßig?"],
  },
  {
    slug: "umzug",
    keywords: ["umzug", "umziehen", "transport", "möbel transportieren", "moebel transportieren", "kisten"],
    summary: "Es steht ein Umzug oder Transport an.",
    questions: ["Von welchem in welches Stockwerk?", "Wie viele Zimmer sind es?"],
  },
  {
    slug: "montage",
    keywords: ["aufbauen", "montage", "schrank", "regal", "küche montieren", "kueche montieren", "möbel aufbauen"],
    summary: "Es sollen Moebel montiert werden.",
    questions: ["Um welche Möbelstücke geht es?", "Liegt eine Aufbauanleitung vor?"],
  },
  {
    slug: "gartenpflege",
    keywords: ["rasen", "hecke", "unkraut", "garten", "mähen", "maehen", "beet"],
    summary: "Der Garten soll gepflegt werden.",
    questions: ["Wie groß ist die Fläche ungefähr?", "Einmalig oder regelmäßig?"],
  },
  {
    slug: "baumpflege",
    keywords: ["baum", "baumfällung", "baumfaellung", "äste", "aeste", "stubben"],
    summary: "An Bäumen sind Arbeiten nötig.",
    questions: ["Wie hoch ist der Baum ungefähr?", "Steht er frei zugänglich?"],
  },
  {
    slug: "nachhilfe",
    keywords: ["nachhilfe", "mathe", "lernen", "schule", "hausaufgaben", "abitur"],
    summary: "Es wird Unterstützung beim Lernen gesucht.",
    questions: ["Um welches Fach und welche Klassenstufe geht es?", "Präsenz oder online?"],
  },
  {
    slug: "fotografie",
    keywords: ["foto", "fotograf", "shooting", "hochzeit", "portrait", "bilder"],
    summary: "Es wird ein Fotograf gesucht.",
    questions: ["Um welchen Anlass geht es?", "Wann soll der Termin stattfinden?"],
  },
];

/** Wörter, die auf hohe Dringlichkeit hindeuten. */
const URGENT_KEYWORDS = [
  "notfall", "dringend", "sofort", "läuft aus", "laeuft aus", "überschwemmt", "überschwemmt",
  "wasserschaden", "kein strom", "ausgesperrt", "gasgeruch", "brennt", "friert",
];

const RELAXED_KEYWORDS = ["irgendwann", "keine eile", "gelegentlich", "in den nächsten wochen", "in den nächsten wochen"];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

export class RulesAiProvider implements AiProvider {
  readonly name = "rules@1";

  async analyze(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    const haystack = normalize(
      [input.description, ...(input.answeredQuestions ?? []).map((q) => `${q.question} ${q.answer}`)].join(" "),
    );

    let best: { rule: Rule; hits: number } | null = null;
    for (const rule of RULES) {
      if (!input.knownCategorySlugs.includes(rule.slug)) continue;
      const hits = rule.keywords.filter((keyword) => haystack.includes(keyword)).length;
      if (hits > 0 && (best === null || hits > best.hits)) best = { rule, hits };
    }

    const urgency = URGENT_KEYWORDS.some((word) => haystack.includes(word))
      ? "HIGH"
      : RELAXED_KEYWORDS.some((word) => haystack.includes(word))
        ? "LOW"
        : "NORMAL";

    if (best === null) {
      // Keine Regel greift. Dann sagt der Provider das ehrlich - eine geratene
      // Kategorie mit hoher Konfidenz wäre schlimmer als gar keine.
      return {
        categorySlug: null,
        summary: summarizeUnknown(input.description),
        urgency,
        questions: [
          "Um welche Art von Leistung geht es genau?",
          "Wo soll die Arbeit ausgeführt werden?",
        ],
        confidence: 0.2,
      };
    }

    // Bereits beantwortete Fragen nicht erneut stellen.
    const asked = new Set((input.answeredQuestions ?? []).map((q) => q.question));
    const open = best.rule.questions.filter((question) => !asked.has(question));

    // Ein Foto ersetzt oft eine Rückfrage.
    const questions = input.photoCount > 0 ? open.slice(0, 2) : open.slice(0, 3);

    return {
      categorySlug: best.rule.slug,
      summary: best.rule.summary,
      urgency,
      questions,
      // Mehrere passende Stichwörter erhöhen die Zuversicht, aber nie auf 1:
      // ein Regelwerk kann sich nicht sicher sein.
      confidence: Math.min(0.9, 0.55 + best.hits * 0.1),
    };
  }

  async suggestText(input: AiSuggestionInput): Promise<string> {
    if (input.kind === "OFFER_DESCRIPTION") {
      return [
        "Vielen Dank für Ihre Anfrage.",
        `Wir kümmern uns um folgendes Anliegen: ${input.context}`,
        "Das Angebot umfasst Anfahrt, Arbeitszeit und das benötigte Material.",
        "Sollte sich vor Ort ein größerer Aufwand zeigen, stimmen wir uns vorher mit Ihnen ab.",
      ].join(" ");
    }
    return [
      "Hallo, vielen Dank für Ihre Nachricht.",
      input.hint ? `${input.hint}` : "Wir melden uns zeitnah mit einem konkreten Vorschlag.",
    ].join(" ");
  }
}

/**
 * Zusammenfassung, wenn keine Regel greift.
 *
 * Aus einer sehr kurzen Beschreibung lässt sich keine Zusammenfassung bilden.
 * Dann sagt der Provider das ausdrücklich, statt den Text durchzureichen - ein
 * Ergebnis, das der eigene Vertrag nicht erfüllt, wäre schlimmer als eine
 * ehrliche Auskunft.
 */
function summarizeUnknown(description: string): string {
  const clean = description.trim().replace(/\s+/g, " ");
  if (clean.length < 10) {
    return "Die Beschreibung reicht noch nicht aus, um das Anliegen einzuordnen.";
  }
  return shorten(clean);
}

function shorten(text: string, maxLength = 160): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}
