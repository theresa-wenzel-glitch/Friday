/*
 * Tests für die reinen Hilfsfunktionen von "Kühl in Mülheim".
 *
 *   npm run test:kuehl
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distanceKm,
  easterSunday,
  formatDistance,
  fountainSeason,
  heatLevel,
  inCityBounds,
  walkingMinutes,
  weatherText,
} from "./geo";
import { mergePlaces, normalizeName, parseOverpass } from "./osm";
import { BASE_PLACES } from "./places";
import { parseBrightSkyAlerts, parseBrightSkyWeather, parseDistricts, parseOpenMeteo } from "./weather";

test("Ostersonntag stimmt für bekannte Jahre", () => {
  const iso = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  assert.equal(iso(easterSunday(2024)), "2024-3-31");
  assert.equal(iso(easterSunday(2025)), "2025-4-20");
  assert.equal(iso(easterSunday(2026)), "2026-4-5");
  assert.equal(iso(easterSunday(2027)), "2027-3-28");
});

test("Brunnensaison: Ostern bis Ende Oktober", () => {
  assert.equal(fountainSeason(new Date(2026, 3, 4)).inSeason, false); // Tag vor Ostern
  assert.equal(fountainSeason(new Date(2026, 3, 5, 9)).inSeason, true);
  assert.equal(fountainSeason(new Date(2026, 9, 31, 12)).inSeason, true);
  const nov = fountainSeason(new Date(2026, 10, 16));
  assert.equal(nov.inSeason, false);
  assert.equal(nov.start.getFullYear(), 2027); // nächste Saison
  assert.equal(nov.start.getMonth(), 2);
  assert.equal(nov.start.getDate(), 28);
});

test("Entfernung Hauptbahnhof - MüGa liegt im erwarteten Bereich", () => {
  const km = distanceKm([51.4312, 6.8849], [51.432, 6.8762]);
  assert.ok(km > 0.5 && km < 0.7, String(km));
  assert.equal(formatDistance(0.6123), "610 m");
  assert.equal(formatDistance(2.345), "2,3 km");
  assert.equal(walkingMinutes(1.5), 20);
});

test("Stadtgrenzen-Rahmen", () => {
  assert.ok(inCityBounds(51.4275, 6.8825));
  assert.ok(!inCityBounds(51.45, 7.01)); // Essen
});

test("Hitzestufen nach gefühlter Temperatur", () => {
  assert.equal(heatLevel(8).key, "kuehl");
  assert.equal(heatLevel(22).key, "angenehm");
  assert.equal(heatLevel(27).key, "warm");
  assert.equal(heatLevel(31).key, "heiss");
  assert.equal(heatLevel(36).key, "extrem");
  assert.equal(heatLevel(20, true).key, "extrem"); // DWD-Hitzewarnung geht vor
  assert.equal(weatherText(3), "Bedeckt");
});

const overpassSample = {
  elements: [
    { type: "node", id: 1, lat: 51.4243, lon: 6.8879, tags: { amenity: "drinking_water" } },
    { type: "node", id: 2, lat: 51.44, lon: 6.9, tags: { amenity: "drinking_water", wheelchair: "yes" } },
    { type: "way", id: 3, center: { lat: 51.4305, lon: 6.8755 }, tags: { leisure: "park", name: "MüGa-Park" } },
    { type: "way", id: 4, center: { lat: 51.41, lon: 6.83 }, tags: { landuse: "forest", name: "Uhlenhorst" } },
    { type: "way", id: 5, center: { lat: 51.45, lon: 6.86 }, tags: { leisure: "swimming_pool", name: "Hotelpool", access: "customers" } },
    { type: "way", id: 6, center: { lat: 51.453, lon: 6.861 }, tags: { leisure: "sports_centre", sport: "swimming", name: "Naturbad Styrum", opening_hours: "Mo-Su 10:00-19:00" } },
    { type: "node", id: 7, lat: 51.43, lon: 6.88, tags: { amenity: "library", name: "Stadtbibliothek" } },
    { type: "node", id: 8, lat: 51.43, lon: 6.88, tags: { shop: "bakery" } },
    { type: "way", id: 9, tags: { leisure: "park", name: "ohne Position" } },
    { type: "way", id: 10, center: { lat: 51.42, lon: 6.87 }, tags: { leisure: "park", name: "Park" } },
  ],
};

test("Overpass-Antwort wird in Orte übersetzt", () => {
  const places = parseOverpass(overpassSample as never);
  const byId = Object.fromEntries(places.map((p) => [p.id, p]));
  assert.equal(places.length, 7); // Bäckerei, Hotelpool und Element ohne Position fallen weg
  assert.equal(byId["osm-node-2"].wheelchair, "yes");
  assert.equal(byId["osm-way-4"].kind, "Wald");
  assert.equal(byId["osm-way-4"].coolScore, 5);
  assert.equal(byId["osm-way-6"].kind, "Freibad");
  assert.equal(byId["osm-way-6"].openingHours, "Mo-Su 10:00-19:00");
  assert.equal(byId["osm-node-7"].category, "haus");
  assert.equal(byId["osm-node-1"].name, "Trinkwasserstelle");
});

test("Grundliste und OSM werden zusammengeführt", () => {
  const merged = mergePlaces(BASE_PLACES, parseOverpass(overpassSample as never));
  const muega = merged.find((p) => p.id === "auswahl-muega")!;
  assert.equal(muega.positionExact, true);
  assert.equal(muega.lat, 51.4305);
  assert.equal(muega.coolScore, 4); // Einschätzung der Grundliste bleibt
  // OSM-Brunnen direkt am städtischen Brunnen wird nicht doppelt gezeigt.
  assert.ok(!merged.some((p) => p.id === "osm-node-1"));
  const rs = merged.find((p) => p.id === "stadt-brunnen-realschule-stadtmitte")!;
  assert.equal(rs.positionExact, true);
  assert.equal(rs.source, "stadt");
  // Der allgemeine Name "Park" darf keinem bestimmten Park zugeordnet werden.
  assert.ok(merged.some((p) => p.id === "osm-way-10"));
  assert.equal(normalizeName("Broich-Speldorfer Wald"), "broich speldorfer wald");
  assert.equal(normalizeName("Heißen"), "heissen");
});

test("Open-Meteo-Antwort", () => {
  const r = parseOpenMeteo({
    current: { time: "2026-07-01T14:00", temperature_2m: 31.2, apparent_temperature: 33.5, relative_humidity_2m: 40, weather_code: 1, is_day: 1 },
    daily: { temperature_2m_max: [33.1], temperature_2m_min: [19.4], uv_index_max: [7.2] },
  });
  assert.ok(r);
  assert.equal(r!.current!.apparentTemperature, 33.5);
  assert.equal(r!.today!.uvIndexMax, 7.2);
  assert.equal(r!.current!.conditionText, "Überwiegend klar");
  assert.equal(parseOpenMeteo({ error: true }), null);

  const d = parseDistricts(
    [{ current: { temperature_2m: 20 } }, { current: {} }, { current: { temperature_2m: 19.5 } }],
    [
      { name: "A", lat: 1, lon: 1 },
      { name: "B", lat: 2, lon: 2 },
      { name: "C", lat: 3, lon: 3 },
    ],
  );
  assert.deepEqual(d.map((x) => x.name), ["A", "C"]);
});

test("DWD-Warnungen über Bright Sky", () => {
  const alerts = parseBrightSkyAlerts({
    alerts: [
      { event_de: "STARKE HITZE", headline_de: "Amtliche WARNUNG vor HITZE", description_de: "Es tritt eine starke Wärmebelastung auf.", severity: "moderate", onset: "2026-07-01T11:00:00+00:00", expires: "2026-07-01T19:00:00+00:00" },
      { event_de: "WINDBÖEN", headline_de: "Amtliche WARNUNG vor WINDBÖEN", severity: "minor" },
    ],
  });
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].isHeat, true);
  assert.equal(alerts[1].isHeat, false);
  assert.deepEqual(parseBrightSkyAlerts({ alerts: [] }), []);
  assert.deepEqual(parseBrightSkyAlerts(null), []);
});

test("DWD-Messwerte über Bright Sky als Ersatzquelle", () => {
  const r = parseBrightSkyWeather(
    {
      weather: { timestamp: "2026-11-16T12:30:00+00:00", temperature: 8.4, relative_humidity: 78, icon: "cloudy" },
      sources: [{ station_name: "Essen-Bredeney" }],
    },
    { weather: [{ temperature: 9.2 }, { temperature: 3.2 }, { temperature: null }] },
  );
  assert.ok(r);
  assert.equal(r!.station, "Essen-Bredeney");
  assert.equal(r!.current!.apparentTemperature, null);
  assert.equal(r!.current!.conditionText, "Bedeckt");
  assert.deepEqual(r!.today, { max: 9.2, min: 3.2, uvIndexMax: null });
  assert.equal(parseBrightSkyWeather({ weather: {} }, null), null);
});
