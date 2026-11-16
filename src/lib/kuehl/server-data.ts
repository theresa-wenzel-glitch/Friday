import fs from "node:fs";
import path from "node:path";
import { BASE_PLACES } from "./places";
import { mergePlaces, OVERPASS_QUERY, OVERPASS_URL, parseOverpass } from "./osm";
import type { Place, PlacesResponse, WeatherResponse } from "./types";
import {
  parseBrightSkyAlerts,
  parseBrightSkyWeather,
  parseDistricts,
  parseOpenMeteo,
} from "./weather";
import { CITY_CENTER, DISTRICTS } from "./geo";

/*
 * Serverseitiger Abruf mit Zwischenspeicher. OpenStreetMap-Daten werden
 * zusätzlich in eine Datei neben der Datenbank geschrieben, damit ein
 * Neustart nicht sofort wieder Overpass abfragen muss.
 */

const USER_AGENT = "KuehlInMuelheim/1.0 (Hitzeschutz-App fuer Muelheim an der Ruhr)";
const OSM_TTL_MS = 24 * 60 * 60 * 1000;
const OSM_RETRY_MS = 15 * 60 * 1000;
const WEATHER_TTL_MS = 10 * 60 * 1000;

function cacheFile(): string {
  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), "data", "westernhengste.db");
  return path.join(path.dirname(dbPath), "kuehl-osm-cache.json");
}

interface OsmCache {
  fetchedAt: string;
  places: Place[];
}

let osmCache: OsmCache | null = null;
let osmLastAttempt = 0;
let osmInFlight: Promise<void> | null = null;

function readOsmFile(): OsmCache | null {
  try {
    const raw = JSON.parse(fs.readFileSync(cacheFile(), "utf8")) as OsmCache;
    if (Array.isArray(raw.places) && typeof raw.fetchedAt === "string") return raw;
  } catch {
    // Keine Datei oder kaputt: dann eben neu abrufen.
  }
  return null;
}

async function refreshOsm(): Promise<void> {
  osmLastAttempt = Date.now();
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ data: OVERPASS_QUERY }).toString(),
    signal: AbortSignal.timeout(100_000),
  });
  if (!res.ok) throw new Error(`Overpass antwortet mit ${res.status}`);
  const places = parseOverpass(await res.json());
  if (places.length === 0) throw new Error("Overpass lieferte keine Orte");
  osmCache = { fetchedAt: new Date().toISOString(), places };
  try {
    fs.mkdirSync(path.dirname(cacheFile()), { recursive: true });
    fs.writeFileSync(cacheFile(), JSON.stringify(osmCache));
  } catch {
    // Ohne Schreibrecht bleibt es beim Arbeitsspeicher.
  }
}

/**
 * Liefert alle Orte. Wartet beim allerersten Abruf bis zu `waitMs` auf
 * OpenStreetMap und antwortet sonst sofort mit dem, was vorliegt.
 */
export async function getPlaces(waitMs = 8000): Promise<PlacesResponse> {
  if (!osmCache) osmCache = readOsmFile();

  const stale = !osmCache || Date.now() - Date.parse(osmCache.fetchedAt) > OSM_TTL_MS;
  const mayRetry = Date.now() - osmLastAttempt > OSM_RETRY_MS;
  if (stale && mayRetry && !osmInFlight && process.env.KUEHL_OFFLINE !== "1") {
    osmInFlight = refreshOsm()
      .catch((err) => console.warn("[kuehl] OpenStreetMap-Abruf fehlgeschlagen:", err.message))
      .finally(() => {
        osmInFlight = null;
      });
  }
  if (!osmCache && osmInFlight) {
    await Promise.race([osmInFlight, new Promise((r) => setTimeout(r, waitMs))]);
  }

  if (!osmCache) {
    return {
      places: BASE_PLACES,
      osmFetchedAt: null,
      notice:
        "Die Daten aus OpenStreetMap werden gerade geladen oder sind nicht erreichbar. Bis dahin siehst du die Grundliste.",
    };
  }
  return { places: mergePlaces(BASE_PLACES, osmCache.places), osmFetchedAt: osmCache.fetchedAt };
}

let weatherCache: { at: number; data: WeatherResponse } | null = null;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} antwortet mit ${res.status}`);
  return res.json();
}

export async function getWeather(): Promise<WeatherResponse> {
  if (weatherCache && Date.now() - weatherCache.at < WEATHER_TTL_MS) return weatherCache.data;

  const [lat, lon] = CITY_CENTER;
  const main = new URL("https://api.open-meteo.com/v1/forecast");
  main.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day",
    daily: "temperature_2m_max,temperature_2m_min,uv_index_max",
    timezone: "Europe/Berlin",
    forecast_days: "1",
  }).toString();

  const districts = new URL("https://api.open-meteo.com/v1/forecast");
  districts.search = new URLSearchParams({
    latitude: DISTRICTS.map((d) => d.lat).join(","),
    longitude: DISTRICTS.map((d) => d.lon).join(","),
    current: "temperature_2m",
    timezone: "Europe/Berlin",
  }).toString();

  const alerts = `https://api.brightsky.dev/alerts?lat=${lat}&lon=${lon}`;

  const [m, d, a] = await Promise.allSettled([
    getJson(main.toString()),
    getJson(districts.toString()),
    getJson(alerts),
  ]);

  let parsed = m.status === "fulfilled" ? parseOpenMeteo(m.value) : null;
  let sourceLabel: string | null = parsed ? "Wettermodell über Open-Meteo" : null;

  if (!parsed) {
    // Ersatz: DWD-Messstation und DWD-Vorhersage über Bright Sky.
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
    const [c, day] = await Promise.allSettled([
      getJson(`https://api.brightsky.dev/current_weather?lat=${lat}&lon=${lon}`),
      getJson(`https://api.brightsky.dev/weather?lat=${lat}&lon=${lon}&date=${today}&tz=Europe/Berlin`),
    ]);
    const bs =
      c.status === "fulfilled"
        ? parseBrightSkyWeather(c.value, day.status === "fulfilled" ? day.value : null)
        : null;
    if (bs) {
      parsed = bs;
      sourceLabel = bs.station
        ? `DWD-Messstation ${bs.station} über Bright Sky`
        : "Deutscher Wetterdienst über Bright Sky";
    }
  }

  const data: WeatherResponse = {
    ok: parsed !== null,
    current: parsed?.current ?? null,
    today: parsed?.today ?? null,
    sourceLabel,
    districts: d.status === "fulfilled" ? parseDistricts(d.value, DISTRICTS) : [],
    alerts: a.status === "fulfilled" ? parseBrightSkyAlerts(a.value) : [],
    alertsOk: a.status === "fulfilled",
    fetchedAt: new Date().toISOString(),
  };
  for (const r of [m, d, a]) {
    if (r.status === "rejected") console.warn("[kuehl] Wetterabruf fehlgeschlagen:", String(r.reason));
  }
  // Fehlschläge nur kurz merken, damit es bald erneut versucht wird.
  weatherCache = { at: data.ok ? Date.now() : Date.now() - WEATHER_TTL_MS + 60_000, data };
  return data;
}
