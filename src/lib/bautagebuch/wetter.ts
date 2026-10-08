import type { Wetter } from "./types";

/*
 * Echtes Wetter statt geschätztem: Open-Meteo liefert kostenlos und ohne
 * Schlüssel die Messwerte für den Standort der Baustelle. Das ist im
 * Streitfall belastbarer als "sieht auf dem Foto nach Regen aus".
 */

const API = () => process.env.OPEN_METEO_API ?? "https://api.open-meteo.com";
const GEO_API = () =>
  process.env.OPEN_METEO_GEO_API ?? "https://geocoding-api.open-meteo.com";

// WMO-Wettercodes, wie Open-Meteo sie liefert.
const CODES: Record<number, string> = {
  0: "Klar",
  1: "Überwiegend klar",
  2: "Teilweise bewölkt",
  3: "Bedeckt",
  45: "Nebel",
  48: "Nebel mit Reif",
  51: "Leichter Nieselregen",
  53: "Nieselregen",
  55: "Starker Nieselregen",
  56: "Gefrierender Nieselregen",
  57: "Gefrierender Nieselregen",
  61: "Leichter Regen",
  63: "Regen",
  65: "Starker Regen",
  66: "Gefrierender Regen",
  67: "Gefrierender Regen",
  71: "Leichter Schneefall",
  73: "Schneefall",
  75: "Starker Schneefall",
  77: "Schneegriesel",
  80: "Leichte Regenschauer",
  81: "Regenschauer",
  82: "Heftige Regenschauer",
  85: "Schneeschauer",
  86: "Starke Schneeschauer",
  95: "Gewitter",
  96: "Gewitter mit Hagel",
  99: "Gewitter mit starkem Hagel",
};

export function wetterText(code: number | null | undefined): string {
  if (code === null || code === undefined) return "unbekannt";
  return CODES[code] ?? `Wettercode ${code}`;
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Wetter für einen Tag am Standort. Gibt `null` zurück, wenn der Dienst nicht erreichbar ist. */
export async function holeWetter(lat: number, lon: number, datum: string): Promise<Wetter | null> {
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const mitAktuell = datum === heute;
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
    timezone: "Europe/Berlin",
    start_date: datum,
    end_date: datum,
  });
  if (mitAktuell) params.set("current", "temperature_2m,weather_code,wind_speed_10m");

  try {
    const data = (await getJson(`${API()}/v1/forecast?${params}`)) as {
      current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number };
      daily?: {
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        wind_speed_10m_max?: number[];
      };
    };
    const d = data.daily ?? {};
    const code = data.current?.weather_code ?? d.weather_code?.[0];
    return {
      beschreibung: wetterText(code),
      temperatur: data.current?.temperature_2m ?? null,
      tempMin: d.temperature_2m_min?.[0] ?? null,
      tempMax: d.temperature_2m_max?.[0] ?? null,
      niederschlagMm: d.precipitation_sum?.[0] ?? null,
      windKmh: data.current?.wind_speed_10m ?? d.wind_speed_10m_max?.[0] ?? null,
      quelle: "Open-Meteo.com (Wettermodell, CC BY 4.0)",
      abgerufenAm: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[bautagebuch] Wetter nicht abrufbar:", (err as Error).message);
    return null;
  }
}

/** Ort oder Postleitzahl -> Koordinaten. Nur für Deutschland, Österreich, Schweiz. */
export async function sucheOrt(ort: string): Promise<{ lat: number; lon: number } | null> {
  const q = ort.trim();
  if (!q) return null;
  try {
    const data = (await getJson(
      `${GEO_API()}/v1/search?${new URLSearchParams({ name: q, count: "10", language: "de" })}`,
    )) as { results?: { latitude: number; longitude: number; country_code?: string }[] };
    const treffer =
      data.results?.find((r) => ["DE", "AT", "CH"].includes(r.country_code ?? "")) ??
      data.results?.[0];
    return treffer ? { lat: treffer.latitude, lon: treffer.longitude } : null;
  } catch (err) {
    console.warn("[bautagebuch] Ortssuche nicht möglich:", (err as Error).message);
    return null;
  }
}

export function wetterZeile(w: Wetter | null): string {
  if (!w) return "Wetterdaten nicht abrufbar";
  const teile = [w.beschreibung];
  if (w.tempMin !== null && w.tempMax !== null) {
    teile.push(`${Math.round(w.tempMin)} bis ${Math.round(w.tempMax)} °C`);
  } else if (w.temperatur !== null) {
    teile.push(`${Math.round(w.temperatur)} °C`);
  }
  if (w.niederschlagMm !== null) {
    teile.push(`Niederschlag ${w.niederschlagMm.toFixed(1).replace(".", ",")} mm`);
  }
  if (w.windKmh !== null) teile.push(`Wind bis ${Math.round(w.windKmh)} km/h`);
  return teile.join(", ");
}
