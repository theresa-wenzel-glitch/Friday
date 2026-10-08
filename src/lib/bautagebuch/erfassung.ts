import crypto from "node:crypto";
import {
  createEintrag,
  getEintrag,
  leseMedium,
  updateBaustelleKoordinaten,
} from "./db";
import { kiAktiv, strukturiereDemo, strukturiereMitKi, transkribiere } from "./ki";
import type { Baustelle, EintragDaten, EintragMitBaustelle, Medium, Quelle } from "./types";
import { holeWetter, sucheOrt } from "./wetter";

/*
 * Der eigentliche Automat: aus Foto(s) + Sprachnachricht/Text wird ein
 * Eintrag. Wird von der Web-App und vom Telegram-Bot gleichermaßen benutzt.
 */

export function heuteIso(): string {
  // Schwedisches Format ist JJJJ-MM-TT - genau das, was wir speichern.
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

export async function erstelleEintrag(input: {
  betriebId: number;
  baustelle: Baustelle;
  person: string;
  quelle: Quelle;
  fotos: Medium[];
  audios: Medium[];
  text: string;
  lat: number | null;
  lon: number | null;
}): Promise<{ eintrag: EintragMitBaustelle; hinweis: string | null }> {
  const erfasstAm = new Date().toISOString();
  const datum = heuteIso();
  let hinweis: string | null = null;

  // 1. Sprachnachricht(en) abtippen
  const transkripte: string[] = [];
  if (input.audios.length > 0 && kiAktiv()) {
    for (const audio of input.audios) {
      try {
        transkripte.push(await transkribiere(leseMedium(audio), audio.mime));
      } catch (err) {
        console.error("[bautagebuch]", err);
        hinweis =
          "Eine Sprachnachricht konnte nicht abgetippt werden. Sie ist gespeichert - bitte den Text kurz von Hand ergänzen.";
      }
    }
  } else if (input.audios.length > 0) {
    hinweis =
      "Demo-Modus: Die Sprachnachricht ist gespeichert, wird aber erst mit hinterlegtem KI-Schlüssel abgetippt.";
  }
  const transkript = transkripte.filter(Boolean).join("\n\n");
  const gesamtText = [transkript, input.text.trim()].filter(Boolean).join("\n\n");

  // 2. Wetter am Standort - GPS vom Handy, sonst der Ort der Baustelle
  let lat = input.lat ?? input.baustelle.lat;
  let lon = input.lon ?? input.baustelle.lon;
  if ((lat === null || lon === null) && input.baustelle.ort) {
    const ort = await sucheOrt(input.baustelle.ort);
    if (ort) {
      updateBaustelleKoordinaten(input.baustelle.id, ort.lat, ort.lon);
      ({ lat, lon } = ort);
    }
  }
  const wetter = lat !== null && lon !== null ? await holeWetter(lat, lon, datum) : null;

  // 3. Felder füllen
  let daten: EintragDaten;
  let kiModus: "ki" | "demo" = "demo";
  if (kiAktiv() && gesamtText) {
    try {
      daten = await strukturiereMitKi({
        text: gesamtText,
        datum,
        baustelle: input.baustelle.name,
        fotos: input.fotos.map((f) => ({ bytes: leseMedium(f), mime: f.mime })),
      });
      kiModus = "ki";
    } catch (err) {
      console.error("[bautagebuch]", err);
      daten = strukturiereDemo(gesamtText, input.fotos.length > 0);
      hinweis =
        "Die KI war gerade nicht erreichbar - der Text wurde vereinfacht einsortiert. Bitte kurz prüfen.";
    }
  } else {
    daten = strukturiereDemo(gesamtText, input.fotos.length > 0);
  }

  const id = createEintrag({
    betriebId: input.betriebId,
    baustelleId: input.baustelle.id,
    datum,
    erfasstAm,
    erfasstVon: input.person,
    quelle: input.quelle,
    transkript: gesamtText,
    daten,
    wetter,
    lat: input.lat,
    lon: input.lon,
    kiModus,
    medienIds: [...input.fotos, ...input.audios].map((m) => m.id),
  });

  return { eintrag: getEintrag(input.betriebId, id)!, hinweis };
}

/**
 * Prüfsumme über alle Inhalte eines abgeschlossenen Eintrags, einschließlich
 * der Prüfsummen der Originalfotos und -sprachnachricht und der Prüfsumme des
 * vorigen Eintrags derselben Baustelle. Ändert jemand nachträglich auch nur ein
 * Zeichen in der Datenbank oder tauscht ein Foto aus, passt sie nicht mehr.
 */
export function berechneHash(e: EintragMitBaustelle, medien: Medium[]): string {
  const inhalt = {
    v: 1,
    eintrag: e.id,
    betrieb: e.betriebId,
    baustelle: e.baustelleId,
    nr: e.nr,
    datum: e.datum,
    erfasstAm: e.erfasstAm,
    erfasstVon: e.erfasstVon,
    quelle: e.quelle,
    transkript: e.transkript,
    daten: e.daten,
    wetter: e.wetter,
    lat: e.lat,
    lon: e.lon,
    abgeschlossenAm: e.abgeschlossenAm,
    abgeschlossenVon: e.abgeschlossenVon,
    vorherigerHash: e.vorherigerHash,
    medien: medien.map((m) => m.sha256).sort(),
  };
  return crypto.createHash("sha256").update(stabilesJson(inhalt)).digest("hex");
}

/** JSON mit sortierten Schlüsseln, damit dieselben Daten immer dieselbe Prüfsumme ergeben. */
function stabilesJson(wert: unknown): string {
  if (Array.isArray(wert)) return `[${wert.map(stabilesJson).join(",")}]`;
  if (wert && typeof wert === "object") {
    return `{${Object.keys(wert)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stabilesJson((wert as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(wert ?? null);
}
