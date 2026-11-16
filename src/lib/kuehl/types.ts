/** Kartenebene, zu der ein Ort gehört. */
export type PlaceCategory = "wasser" | "kuehl" | "bad" | "haus" | "wc" | "meldung";

/** Woher ein Datensatz stammt - wird in der App immer mit angezeigt. */
export type PlaceSource = "stadt" | "osm" | "auswahl" | "meldung";

export interface Place {
  id: string;
  category: PlaceCategory;
  name: string;
  /** Art des Ortes in Alltagssprache, z. B. "Wald", "Park", "Freibad". */
  kind: string;
  lat: number;
  lon: number;
  /** false, wenn die Position nur ungefähr bekannt ist. */
  positionExact: boolean;
  source: PlaceSource;
  description?: string;
  address?: string;
  /** Öffnungszeiten im OpenStreetMap-Format, unverändert. */
  openingHours?: string;
  wheelchair?: "yes" | "limited" | "no";
  fee?: boolean;
  website?: string;
  /** Öffentliche Trinkbrunnen der RWW laufen von Ostern bis Oktober. */
  seasonal?: "ostern-oktober";
  shade?: "viel" | "teils" | "wenig";
  /** Kühlungs-Einschätzung 1-5 nach Art des Ortes; keine Messung. */
  coolScore?: number;
  osmUrl?: string;
}

export interface PlacesResponse {
  places: Place[];
  /** Zeitpunkt des letzten erfolgreichen OpenStreetMap-Abrufs (ISO), sonst null. */
  osmFetchedAt: string | null;
  /** Hinweis, falls OpenStreetMap gerade nicht erreichbar war. */
  notice?: string;
}

export interface WeatherAlert {
  event: string;
  headline: string;
  description: string;
  instruction: string;
  severity: string;
  onset: string | null;
  expires: string | null;
  isHeat: boolean;
}

export interface DistrictTemp {
  name: string;
  lat: number;
  lon: number;
  temperature: number;
}

export interface WeatherResponse {
  ok: boolean;
  current: {
    time: string;
    temperature: number;
    /** Gefühlte Temperatur, nur wenn die Quelle sie liefert. */
    apparentTemperature: number | null;
    humidity: number | null;
    conditionText: string;
  } | null;
  today: {
    max: number;
    min: number;
    uvIndexMax: number | null;
  } | null;
  /** Woher die aktuellen Werte stammen, z. B. "Wettermodell (Open-Meteo)". */
  sourceLabel: string | null;
  districts: DistrictTemp[];
  alerts: WeatherAlert[];
  /** Ob die DWD-Warnungen abgerufen werden konnten. */
  alertsOk: boolean;
  fetchedAt: string;
}

export const REPORT_CATEGORIES = [
  "Fehlender Trinkbrunnen",
  "Defekter Trinkbrunnen",
  "Neuer Schattenplatz",
  "Neue Sitzmöglichkeit",
  "Hier fehlen Bäume",
  "Neuer Abkühlungsort",
  "Fehler in der Karte",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportStatus = "pending" | "approved" | "rejected";

export interface Report {
  id: number;
  category: ReportCategory;
  description: string;
  lat: number;
  lon: number;
  status: ReportStatus;
  createdAt: string;
}
