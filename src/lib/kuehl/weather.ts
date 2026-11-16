import type { DistrictTemp, WeatherAlert, WeatherResponse } from "./types";
import { weatherText } from "./geo";

/*
 * Zerlegt die Antworten von Open-Meteo (Wettermodelle, u. a. vom DWD) und
 * Bright Sky (amtliche Warnungen des Deutschen Wetterdienstes). Rein und ohne
 * Netz, damit sie getestet werden können.
 */

type Json = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const first = (v: unknown): number | null => (Array.isArray(v) ? num(v[0]) : null);

export function parseOpenMeteo(
  raw: unknown,
): Pick<WeatherResponse, "current" | "today"> | null {
  const j = raw as Json;
  const c = j?.current as Json | undefined;
  const d = j?.daily as Json | undefined;
  const t = num(c?.temperature_2m);
  if (!c || t === null) return null;

  const max = first(d?.temperature_2m_max);
  const min = first(d?.temperature_2m_min);
  return {
    current: {
      time: String(c.time ?? ""),
      temperature: t,
      apparentTemperature: num(c.apparent_temperature),
      humidity: num(c.relative_humidity_2m),
      conditionText: weatherText(num(c.weather_code) ?? -1),
    },
    today:
      max !== null && min !== null
        ? { max, min, uvIndexMax: first(d?.uv_index_max) }
        : null,
  };
}

/** Open-Meteo antwortet bei mehreren Koordinaten mit einer Liste in gleicher Reihenfolge. */
export function parseDistricts(
  raw: unknown,
  districts: { name: string; lat: number; lon: number }[],
): DistrictTemp[] {
  const list = Array.isArray(raw) ? raw : [raw];
  const out: DistrictTemp[] = [];
  districts.forEach((d, i) => {
    const t = num(((list[i] as Json)?.current as Json | undefined)?.temperature_2m);
    if (t !== null) out.push({ ...d, temperature: t });
  });
  return out;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");

const BRIGHTSKY_ICONS: Record<string, string> = {
  "clear-day": "Klar",
  "clear-night": "Klar",
  "partly-cloudy-day": "Teilweise bewölkt",
  "partly-cloudy-night": "Teilweise bewölkt",
  cloudy: "Bedeckt",
  fog: "Nebel",
  wind: "Windig",
  rain: "Regen",
  sleet: "Schneeregen",
  snow: "Schnee",
  hail: "Hagel",
  thunderstorm: "Gewitter",
};

/**
 * Ersatzquelle: Messwerte der nächstgelegenen DWD-Station (current_weather)
 * und die DWD-Vorhersage des Tages (weather) über Bright Sky.
 */
export function parseBrightSkyWeather(
  currentRaw: unknown,
  dayRaw: unknown,
): (Pick<WeatherResponse, "current" | "today"> & { station: string | null }) | null {
  const w = (currentRaw as Json)?.weather as Json | undefined;
  const t = num(w?.temperature);
  if (!w || t === null) return null;
  const sources = (currentRaw as Json)?.sources;
  const station = Array.isArray(sources) ? s((sources[0] as Json)?.station_name) || null : null;

  const hours = (dayRaw as Json)?.weather;
  const temps = Array.isArray(hours)
    ? hours.map((h: Json) => num(h.temperature)).filter((x): x is number => x !== null)
    : [];

  return {
    station,
    current: {
      time: s(w.timestamp),
      temperature: t,
      apparentTemperature: null,
      humidity: num(w.relative_humidity),
      conditionText: BRIGHTSKY_ICONS[s(w.icon)] ?? "Unbekannt",
    },
    today: temps.length
      ? { max: Math.max(...temps), min: Math.min(...temps), uvIndexMax: null }
      : null,
  };
}

export function parseBrightSkyAlerts(raw: unknown): WeatherAlert[] {
  const alerts = (raw as Json)?.alerts;
  if (!Array.isArray(alerts)) return [];
  return alerts
    .map((a: Json) => {
      const event = s(a.event_de) || s(a.event_en);
      const headline = s(a.headline_de) || s(a.headline_en) || event;
      return {
        event,
        headline,
        description: s(a.description_de) || s(a.description_en),
        instruction: s(a.instruction_de) || s(a.instruction_en),
        severity: s(a.severity),
        onset: s(a.onset) || null,
        expires: s(a.expires) || null,
        isHeat: /hitze|wärmebelastung|heat/i.test(`${event} ${headline}`),
      };
    })
    .filter((a) => a.headline);
}
