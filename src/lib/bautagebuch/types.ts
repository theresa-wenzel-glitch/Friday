/**
 * Datentypen des Bautagebuch-Automaten.
 */

export interface Betrieb {
  id: number;
  name: string;
  inhaber: string;
  email: string | null;
  zugangscode: string;
  sitzungVersion: number;
  createdAt: string;
}

export interface Baustelle {
  id: number;
  betriebId: number;
  name: string;
  adresse: string | null;
  ort: string | null;
  auftraggeber: string | null;
  lat: number | null;
  lon: number | null;
  aktiv: boolean;
  createdAt: string;
}

/** Wetter zum Zeitpunkt der Erfassung, von Open-Meteo abgerufen. */
export interface Wetter {
  beschreibung: string;
  temperatur: number | null;
  tempMin: number | null;
  tempMax: number | null;
  niederschlagMm: number | null;
  windKmh: number | null;
  quelle: string;
  abgerufenAm: string;
}

/** Die Felder eines Bautagebuch-Eintrags, wie sie im PDF stehen. */
export interface EintragDaten {
  anwesende: string;
  arbeitszeit: string;
  leistungen: string;
  material: string;
  behinderungen: string;
  anordnungen: string;
  wetterNotiz: string;
  fotoBeschreibung: string;
  /** Was in der Sprachnachricht nicht vorkam - wird als Hinweis angezeigt. */
  fehlend: string[];
}

export type EintragStatus = "entwurf" | "abgeschlossen";
export type Quelle = "web" | "telegram";

export interface Medium {
  id: number;
  eintragId: number | null;
  art: "foto" | "audio";
  datei: string;
  mime: string;
  sha256: string;
  groesse: number;
  createdAt: string;
}

export interface Nachtrag {
  id: number;
  eintragId: number;
  text: string;
  von: string;
  createdAt: string;
}

export interface Eintrag {
  id: number;
  betriebId: number;
  baustelleId: number;
  nr: number;
  datum: string;
  erfasstAm: string;
  erfasstVon: string;
  quelle: Quelle;
  transkript: string;
  daten: EintragDaten;
  wetter: Wetter | null;
  lat: number | null;
  lon: number | null;
  kiModus: "ki" | "demo";
  status: EintragStatus;
  abgeschlossenAm: string | null;
  abgeschlossenVon: string | null;
  hash: string | null;
  vorherigerHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EintragMitBaustelle extends Eintrag {
  baustelleName: string;
}

export const LEERE_DATEN: EintragDaten = {
  anwesende: "",
  arbeitszeit: "",
  leistungen: "",
  material: "",
  behinderungen: "",
  anordnungen: "",
  wetterNotiz: "",
  fotoBeschreibung: "",
  fehlend: [],
};

/** Reihenfolge und Beschriftung der Felder - gemeinsam für Web und PDF. */
export const FELDER: { key: Exclude<keyof EintragDaten, "fehlend">; label: string }[] = [
  { key: "anwesende", label: "Anwesende / Personal" },
  { key: "arbeitszeit", label: "Arbeitszeit" },
  { key: "leistungen", label: "Ausgeführte Leistungen" },
  { key: "material", label: "Material / Lieferungen / Geräte" },
  { key: "behinderungen", label: "Behinderungen, Verzögerungen, Mängel" },
  { key: "anordnungen", label: "Anordnungen, Besuche, Besonderes" },
  { key: "wetterNotiz", label: "Wetter (lt. Angabe vor Ort)" },
  { key: "fotoBeschreibung", label: "Fotodokumentation" },
];
