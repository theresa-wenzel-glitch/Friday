/*
 * Reine Hilfsfunktionen ohne Netz und ohne Browser: Entfernungen, Saison der
 * Trinkbrunnen, Hitzestufen. Dadurch lassen sie sich direkt testen.
 */

/** Mittelpunkt und grober Rahmen des Stadtgebiets. */
export const CITY_CENTER: [number, number] = [51.4275, 6.8825];
export const CITY_BOUNDS: [[number, number], [number, number]] = [
  [51.355, 6.79],
  [51.485, 7.0],
];

export function inCityBounds(lat: number, lon: number): boolean {
  const [[s, w], [n, e]] = CITY_BOUNDS;
  return lat >= s && lat <= n && lon >= w && lon <= e;
}

/** Luftlinie in Kilometern (Haversine). */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

/** Gehzeit bei 4,5 km/h, auf volle Minuten gerundet. */
export function walkingMinutes(km: number): number {
  return Math.max(1, Math.round((km / 4.5) * 60));
}

/** Ostersonntag nach der Gaußschen Osterformel (gregorianisch). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export interface FountainSeason {
  inSeason: boolean;
  /** Beginn der laufenden oder nächsten Saison. */
  start: Date;
  /** Ende der laufenden oder nächsten Saison (31. Oktober). */
  end: Date;
}

/** Die öffentlichen Trinkbrunnen laufen von Ostern bis Ende Oktober. */
export function fountainSeason(now: Date): FountainSeason {
  const year = now.getFullYear();
  const start = easterSunday(year);
  const end = new Date(year, 9, 31, 23, 59, 59);
  if (now < start) return { inSeason: false, start, end };
  if (now <= end) return { inSeason: true, start, end };
  return {
    inSeason: false,
    start: easterSunday(year + 1),
    end: new Date(year + 1, 9, 31, 23, 59, 59),
  };
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

export type HeatLevelKey = "kuehl" | "angenehm" | "warm" | "heiss" | "extrem";

export interface HeatLevel {
  key: HeatLevelKey;
  label: string;
  advice: string;
}

export const HEAT_LEVELS: Record<HeatLevelKey, HeatLevel> = {
  kuehl: {
    key: "kuehl",
    label: "Kühl",
    advice: "Heute ist keine Hitze zu erwarten.",
  },
  angenehm: {
    key: "angenehm",
    label: "Angenehm",
    advice: "Gute Bedingungen. Eine Wasserflasche dabeizuhaben schadet trotzdem nie.",
  },
  warm: {
    key: "warm",
    label: "Warm",
    advice:
      "Auf Schatten und ausreichend Wasser achten. Anstrengende Wege möglichst nicht in die Mittagszeit legen.",
  },
  heiss: {
    key: "heiss",
    label: "Heiß",
    advice:
      "Heute wird es in Mülheim heiß. Such dir schattige Orte, trink regelmäßig und meide körperliche Anstrengung zwischen 11 und 17 Uhr.",
  },
  extrem: {
    key: "extrem",
    label: "Starke Hitze",
    advice:
      "Starke Hitzebelastung. Bleib möglichst in kühlen Räumen, trink viel und achte auf ältere Menschen, Kinder und Kranke in deiner Nähe.",
  },
};

/**
 * Hitzestufe aus der gefühlten Temperatur. Die Schwellen lehnen sich an die
 * DWD-Warnstufen an (gefühlt ab 32 °C "starke", ab 38 °C "extreme" Wärmebelastung),
 * sind hier aber bewusst etwas früher gesetzt, weil die App vorsorgen will.
 */
export function heatLevel(apparentTemperature: number, heatAlert = false): HeatLevel {
  if (heatAlert || apparentTemperature >= 35) return HEAT_LEVELS.extrem;
  if (apparentTemperature >= 30) return HEAT_LEVELS.heiss;
  if (apparentTemperature >= 25) return HEAT_LEVELS.warm;
  if (apparentTemperature >= 15) return HEAT_LEVELS.angenehm;
  return HEAT_LEVELS.kuehl;
}

/** Farbstufe für einzelne Temperaturwerte auf der Karte. */
export function tempLevel(t: number): HeatLevelKey {
  if (t >= 35) return "extrem";
  if (t >= 30) return "heiss";
  if (t >= 25) return "warm";
  if (t >= 15) return "angenehm";
  return "kuehl";
}

/** Wettercodes nach WMO, wie Open-Meteo sie liefert. */
export function weatherText(code: number): string {
  if (code === 0) return "Klar";
  if (code === 1) return "Überwiegend klar";
  if (code === 2) return "Teilweise bewölkt";
  if (code === 3) return "Bedeckt";
  if (code === 45 || code === 48) return "Nebel";
  if (code >= 51 && code <= 57) return "Nieselregen";
  if (code >= 61 && code <= 67) return "Regen";
  if (code >= 71 && code <= 77) return "Schnee";
  if (code >= 80 && code <= 82) return "Regenschauer";
  if (code === 85 || code === 86) return "Schneeschauer";
  if (code >= 95) return "Gewitter";
  return "Unbekannt";
}

/** Stadtteile, für die die App Modelltemperaturen abfragt. */
export const DISTRICTS: { name: string; lat: number; lon: number }[] = [
  { name: "Stadtmitte", lat: 51.4275, lon: 6.8835 },
  { name: "Styrum", lat: 51.4545, lon: 6.8655 },
  { name: "Dümpten", lat: 51.4565, lon: 6.9055 },
  { name: "Eppinghofen", lat: 51.4395, lon: 6.8975 },
  { name: "Heißen", lat: 51.4335, lon: 6.9405 },
  { name: "Holthausen", lat: 51.4105, lon: 6.9155 },
  { name: "Menden", lat: 51.3965, lon: 6.9005 },
  { name: "Saarn", lat: 51.4035, lon: 6.8705 },
  { name: "Broich", lat: 51.4245, lon: 6.8595 },
  { name: "Speldorf", lat: 51.4255, lon: 6.8355 },
  { name: "Selbeck", lat: 51.3785, lon: 6.8705 },
  { name: "Mintard", lat: 51.3815, lon: 6.9055 },
];

/** Startpunkte, falls jemand den GPS-Standort nicht freigeben möchte. */
export const START_POINTS: { id: string; name: string; lat: number; lon: number }[] = [
  { id: "hbf", name: "Hauptbahnhof", lat: 51.4312, lon: 6.8849 },
  { id: "rathaus", name: "Rathaus / Stadtmitte", lat: 51.4272, lon: 6.8830 },
  { id: "styrum", name: "Bahnhof Styrum", lat: 51.4517, lon: 6.8670 },
  { id: "duempten", name: "Dümpten", lat: 51.4560, lon: 6.9050 },
  { id: "heissen", name: "Heißen, Mitte", lat: 51.4320, lon: 6.9340 },
  { id: "saarn", name: "Saarn, Markt", lat: 51.4035, lon: 6.8735 },
  { id: "speldorf", name: "Speldorf", lat: 51.4225, lon: 6.8440 },
];
