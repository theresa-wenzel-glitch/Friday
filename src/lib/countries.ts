/** Laender-Stammdaten inklusive Zuordnung zu einer Region (EU / US / WORLD). */

export type Region = "EU" | "US" | "WORLD";

export const EU_COUNTRIES: Record<string, string> = {
  AT: "Österreich",
  BE: "Belgien",
  BG: "Bulgarien",
  CH: "Schweiz",
  CZ: "Tschechien",
  DE: "Deutschland",
  DK: "Dänemark",
  EE: "Estland",
  ES: "Spanien",
  FI: "Finnland",
  FR: "Frankreich",
  GB: "Großbritannien",
  GR: "Griechenland",
  HR: "Kroatien",
  HU: "Ungarn",
  IE: "Irland",
  IS: "Island",
  IT: "Italien",
  LT: "Litauen",
  LU: "Luxemburg",
  LV: "Lettland",
  NL: "Niederlande",
  NO: "Norwegen",
  PL: "Polen",
  PT: "Portugal",
  RO: "Rumänien",
  SE: "Schweden",
  SI: "Slowenien",
  SK: "Slowakei",
};

export const US_COUNTRIES: Record<string, string> = {
  US: "USA",
  CA: "Kanada",
};

export const WORLD_COUNTRIES: Record<string, string> = {
  AR: "Argentinien",
  AU: "Australien",
  BR: "Brasilien",
  IL: "Israel",
  MX: "Mexiko",
  NZ: "Neuseeland",
  ZA: "Südafrika",
  AE: "Vereinigte Arabische Emirate",
};

export const COUNTRIES: Record<string, string> = {
  ...EU_COUNTRIES,
  ...US_COUNTRIES,
  ...WORLD_COUNTRIES,
};

/** Alphabetisch sortierte Liste fuer Auswahlfelder. */
export const COUNTRY_OPTIONS = Object.entries(COUNTRIES)
  .map(([code, label]) => ({ code, label }))
  .sort((a, b) => a.label.localeCompare(b.label, "de"));

export function regionForCountry(code: string): Region {
  if (code in EU_COUNTRIES) return "EU";
  if (code in US_COUNTRIES) return "US";
  return "WORLD";
}

export function countryLabel(code: string): string {
  return COUNTRIES[code] ?? code;
}

export const REGION_LABELS: Record<Region, string> = {
  EU: "Europa",
  US: "USA & Kanada",
  WORLD: "Weltweit",
};

/** Flaggen-Emoji aus dem ISO-Code (A = Regional Indicator U+1F1E6). */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
