import type { Availability, Horse, Sex } from "./types";

export const SEX_LABEL: Record<Sex, string> = {
  stallion: "Hengst",
  mare: "Stute",
  gelding: "Wallach",
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  unknown: "Keine Angabe",
  frozen: "Gefriersamen",
  fresh: "Frischsamen",
  both: "Frisch- und Gefriersamen",
  live_cover: "Natursprung",
  none: "Steht nicht zur Verfügung",
};

/** Länder, die im Westernsport regelmässig vorkommen. Andere Codes werden roh angezeigt. */
const COUNTRY_NAME: Record<string, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
  NL: "Niederlande",
  BE: "Belgien",
  LU: "Luxemburg",
  FR: "Frankreich",
  IT: "Italien",
  ES: "Spanien",
  PT: "Portugal",
  DK: "Dänemark",
  SE: "Schweden",
  NO: "Norwegen",
  FI: "Finnland",
  PL: "Polen",
  CZ: "Tschechien",
  SK: "Slowakei",
  HU: "Ungarn",
  SI: "Slowenien",
  HR: "Kroatien",
  GB: "Grossbritannien",
  IE: "Irland",
  US: "USA",
  CA: "Kanada",
  MX: "Mexiko",
  BR: "Brasilien",
  AR: "Argentinien",
  AU: "Australien",
  NZ: "Neuseeland",
  ZA: "Südafrika",
};

export function countryLabel(code: string | null): string | null {
  if (!code) return null;
  return COUNTRY_NAME[code.toUpperCase()] ?? code.toUpperCase();
}

/** Kurzzeile unter dem Namen: "Hengst · 1979 · Fuchs · Quarter Horse". */
export function summaryLine(horse: Horse): string {
  const parts: (string | null)[] = [
    SEX_LABEL[horse.sex],
    horse.yearOfBirth
      ? horse.yearOfDeath
        ? `${horse.yearOfBirth}–${horse.yearOfDeath}`
        : String(horse.yearOfBirth)
      : null,
    horse.color,
    horse.breed,
  ];
  return parts.filter(Boolean).join(" · ");
}

/** "Doc Bar x Poco Lena" - die übliche Kurzform der Abstammung. */
export function pedigreeLine(horse: Horse): string | null {
  if (!horse.sireName && !horse.damName) return null;
  return `${horse.sireName ?? "unbekannt"} x ${horse.damName ?? "unbekannt"}`;
}
