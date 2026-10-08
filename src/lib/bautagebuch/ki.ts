import type { EintragDaten } from "./types";
import { audioEndung } from "./db";

/*
 * Die KI-Schritte: Sprachnachricht abtippen und daraus einen sauberen
 * Bautagebuch-Eintrag machen.
 *
 * Ohne OPENAI_API_KEY läuft alles im Demo-Modus: Sprachnachrichten werden nur
 * gespeichert, und getippter Text wird mit einfachen Regeln auf die Felder
 * verteilt. So lässt sich die App ausprobieren, ohne etwas zu bezahlen.
 */

const API = () => (process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1").replace(/\/$/, "");
const TRANSKRIPT_MODELL = () => process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1";
const TEXT_MODELL = () => process.env.OPENAI_MODEL ?? "gpt-4o";

export function kiAktiv(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

// Fachwörter helfen der Spracherkennung, Baubegriffe richtig zu schreiben.
const FACHWORTE =
  "Bautagebuch, Baustelle, Schalung, Bewehrung, Fundament, Bodenplatte, Estrich, " +
  "Abdichtung, Dämmung, Dachlattung, Unterspannbahn, Kehle, Ortgang, Pflaster, " +
  "Randsteine, Frostschutz, Schotter, Rohbau, Trockenbau, Unterverteilung, " +
  "Leerrohr, Grundleitung, Fallrohr, Gerüst, Bagger, Radlader, Betonpumpe, Fertigteile.";

export async function transkribiere(audio: Buffer, mime: string): Promise<string> {
  const form = new FormData();
  const typ = mime.split(";")[0] || "audio/webm";
  form.append(
    "file",
    new Blob([new Uint8Array(audio)], { type: typ }),
    `sprachnachricht.${audioEndung(typ)}`,
  );
  form.append("model", TRANSKRIPT_MODELL());
  form.append("language", "de");
  form.append("prompt", FACHWORTE);
  form.append("response_format", "json");

  const res = await fetch(`${API()}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    throw new Error(`Spracherkennung fehlgeschlagen (HTTP ${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

const FEHLEND_WERTE = [
  "Anwesende",
  "Arbeitszeit",
  "Ausgeführte Leistungen",
  "Material",
  "Behinderungen",
] as const;

const SYSTEM_PROMPT = `Du schreibst Einträge für ein Bautagebuch eines Handwerksbetriebs in Deutschland.
Du bekommst die Sprachnachricht (abgetippt) oder Notiz eines Mitarbeiters von der Baustelle, Datum und Baustelle und ggf. Fotos.

Regeln - sehr wichtig, das Bautagebuch kann vor Gericht als Beweismittel dienen:
1. Übernimm ausschließlich Tatsachen, die in der Nachricht stehen. Erfinde nichts, ergänze nichts, schätze nichts.
   Keine Mengen, Uhrzeiten, Namen oder Ursachen, die nicht genannt wurden.
2. Was nicht genannt wurde, bleibt ein leerer Text "". Trage es dann in "fehlend" ein.
3. Formuliere sachlich, knapp und in vollständigen Sätzen im Präteritum oder als Stichpunkte, wie im Bauwesen üblich.
   Fachbegriffe korrekt schreiben. Umgangssprache neutral umformulieren, Inhalt nicht verändern.
4. Behinderungen, Verzögerungen und Mängel genau so festhalten, wie sie genannt wurden (was, wie lange, Ursache - soweit genannt).
   Keine rechtliche Bewertung, keine Schuldzuweisung, die nicht ausdrücklich gesagt wurde.
5. "wetterNotiz" nur füllen, wenn das Wetter in der Nachricht erwähnt wurde. Das gemessene Wetter wird separat ergänzt.
6. "fotoBeschreibung": nur wenn Fotos dabei sind - ein neutraler Satz, was sichtbar ist (z. B. "Foto zeigt geschalte Streifenfundamente."). Keine Vermutungen.
7. "anwesende": Anzahl und/oder Namen bzw. Gewerke, wie genannt (z. B. "2 Mitarbeiter, Fa. Müller (Beton)").`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "anwesende",
    "arbeitszeit",
    "leistungen",
    "material",
    "behinderungen",
    "anordnungen",
    "wetterNotiz",
    "fotoBeschreibung",
    "fehlend",
  ],
  properties: {
    anwesende: { type: "string" },
    arbeitszeit: { type: "string" },
    leistungen: { type: "string" },
    material: { type: "string" },
    behinderungen: { type: "string" },
    anordnungen: { type: "string" },
    wetterNotiz: { type: "string" },
    fotoBeschreibung: { type: "string" },
    fehlend: { type: "array", items: { type: "string", enum: [...FEHLEND_WERTE] } },
  },
};

export async function strukturiereMitKi(input: {
  text: string;
  datum: string;
  baustelle: string;
  fotos: { bytes: Buffer; mime: string }[];
}): Promise<EintragDaten> {
  const inhalt: unknown[] = [
    {
      type: "text",
      text: `Datum: ${input.datum}\nBaustelle: ${input.baustelle}\n\nNachricht von der Baustelle:\n"""${input.text}"""`,
    },
  ];
  // Höchstens drei Fotos an die KI - reicht für die Beschreibung und spart Kosten.
  for (const foto of input.fotos.slice(0, 3)) {
    inhalt.push({
      type: "image_url",
      image_url: {
        url: `data:${foto.mime};base64,${foto.bytes.toString("base64")}`,
        detail: "low",
      },
    });
  }

  const res = await fetch(`${API()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TEXT_MODELL(),
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: inhalt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "bautagebuch_eintrag", strict: true, schema: SCHEMA },
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    throw new Error(`KI-Auswertung fehlgeschlagen (HTTP ${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string; refusal?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("KI hat keinen Eintrag geliefert.");
  return JSON.parse(content) as EintragDaten;
}

/* ------------------------------------------------------------------ */
/* Demo-Modus: einfache Regeln statt KI                                 */
/* ------------------------------------------------------------------ */

const ZAHLWORTE: Record<string, number> = {
  ein: 1, eine: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8,
};

const REGELN: { feld: keyof EintragDaten; muster: RegExp }[] = [
  {
    feld: "behinderungen",
    muster: /(verspät|zu spät|gewartet|warten|ausgefallen|fehlt|fehlte|mangel|mängel|schaden|beschädig|behinder|stillstand|nicht geliefert|unterbroch|problem|verzöger)/i,
  },
  {
    feld: "anordnungen",
    muster: /(architekt|bauherr|auftraggeber|bauleit|abnahme|angeordnet|anordnung|besuch|besprechung|prüfer|statiker)/i,
  },
  {
    feld: "material",
    muster: /(geliefert|lieferung|material|bagger|kran|container|beton kam|kubik|m³|paletten|gerüst)/i,
  },
  { feld: "wetterNotiz", muster: /(regen|geregnet|sonne|sonnig|frost|schnee|wind|sturm|kalt|heiß|hitze|gewitter|nass)/i },
];

function satzAnfang(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

export function strukturiereDemo(text: string, hatFotos: boolean): EintragDaten {
  const daten: EintragDaten = {
    anwesende: "",
    arbeitszeit: "",
    leistungen: "",
    material: "",
    behinderungen: "",
    anordnungen: "",
    wetterNotiz: "",
    fotoBeschreibung: hatFotos ? "Siehe Foto(s) im Anhang." : "",
    fehlend: [],
  };

  const personal = text.match(
    /\b(\d+|ein|eine|zwei|drei|vier|fünf|sechs|sieben|acht)\s*(mann|leute|mitarbeiter|kollegen|gesellen|monteure)\b/i,
  );
  if (personal) {
    const n = ZAHLWORTE[personal[1].toLowerCase()] ?? Number(personal[1]);
    daten.anwesende = `${n} Mitarbeiter`;
  }

  const zeit = text.match(
    /\b(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?\s*(?:bis|-)\s*(\d{1,2})(?:[:.](\d{2}))?\s*uhr/i,
  );
  if (zeit) {
    daten.arbeitszeit = `${zeit[1].padStart(2, "0")}:${zeit[2] ?? "00"} bis ${zeit[3].padStart(2, "0")}:${zeit[4] ?? "00"} Uhr`;
  }

  const teile = text
    .split(/[.;,\n]+|\bund dann\b/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);

  const sammeln: Partial<Record<keyof EintragDaten, string[]>> = {};
  for (const teil of teile) {
    if (personal && teil.includes(personal[0]) && teil.length < personal[0].length + 25) continue;
    if (zeit && teil.includes(zeit[0])) continue;
    if (/^(heute|hier)?\s*(bei|auf der baustelle|baustelle)\b/i.test(teil) && teil.split(" ").length <= 4) {
      continue;
    }
    const regel = REGELN.find((r) => r.muster.test(teil));
    const feld = regel?.feld ?? "leistungen";
    (sammeln[feld] ??= []).push(satzAnfang(teil));
  }
  for (const [feld, saetze] of Object.entries(sammeln)) {
    (daten as unknown as Record<string, string>)[feld] = saetze!.join(". ") + ".";
  }

  if (!daten.anwesende) daten.fehlend.push("Anwesende");
  if (!daten.arbeitszeit) daten.fehlend.push("Arbeitszeit");
  if (!daten.leistungen) daten.fehlend.push("Ausgeführte Leistungen");
  return daten;
}
