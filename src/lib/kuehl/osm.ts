import type { Place, PlaceCategory } from "./types";
import { coolScoreForKind, shadeForKind } from "./places";
import { distanceKm } from "./geo";

/*
 * OpenStreetMap über die Overpass-API. Die Abfrage läuft auf dem Server, wird
 * einen Tag lang zwischengespeichert und von allen Nutzern geteilt, damit der
 * öffentliche Overpass-Dienst nicht für jeden Seitenaufruf belastet wird.
 */

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export const OVERPASS_QUERY = `[out:json][timeout:90];
area["name"="Mülheim an der Ruhr"]["boundary"="administrative"]["admin_level"="6"]->.a;
(
  node["amenity"="drinking_water"](area.a);
  nwr["leisure"="park"]["name"](area.a);
  nwr["landuse"="forest"]["name"](area.a);
  nwr["natural"="wood"]["name"](area.a);
  nwr["leisure"="water_park"](area.a);
  nwr["leisure"="swimming_pool"]["name"]["access"!~"^(private|customers|no)$"](area.a);
  nwr["leisure"="sports_centre"]["sport"~"swimming"](area.a);
  nwr["playground"~"splash|water"](area.a);
  nwr["amenity"="library"](area.a);
  node["amenity"="toilets"]["access"!~"^(private|customers|no)$"](area.a);
);
out center tags;`;

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function classify(tags: Record<string, string>): { category: PlaceCategory; kind: string } | null {
  if (tags.amenity === "drinking_water") return { category: "wasser", kind: "Trinkwasserstelle" };
  if (tags.leisure === "water_park") return { category: "bad", kind: "Wasserpark" };
  if (tags.playground && /splash|water/.test(tags.playground))
    return { category: "bad", kind: "Wasserspielplatz" };
  if (tags.leisure === "swimming_pool" || tags.leisure === "sports_centre") {
    const outdoor = tags.location === "outdoor" || /freibad|naturbad/i.test(tags.name ?? "");
    return { category: "bad", kind: outdoor ? "Freibad" : "Schwimmbad" };
  }
  if (tags.amenity === "library") return { category: "haus", kind: "Bibliothek" };
  if (tags.amenity === "toilets") return { category: "wc", kind: "Öffentliche Toilette" };
  if (tags.leisure === "park") return { category: "kuehl", kind: "Park" };
  if (tags.landuse === "forest" || tags.natural === "wood") return { category: "kuehl", kind: "Wald" };
  return null;
}

function defaultName(kind: string): string {
  return kind === "Öffentliche Toilette" ? "Öffentliche Toilette" : kind;
}

function address(tags: Record<string, string>): string | undefined {
  const street = tags["addr:street"];
  if (!street) return undefined;
  return [street, tags["addr:housenumber"]].filter(Boolean).join(" ");
}

/** Wandelt die Overpass-Antwort in Orte um. Unbrauchbare Elemente fallen weg. */
export function parseOverpass(json: { elements?: OverpassElement[] }): Place[] {
  const out: Place[] = [];
  const seen = new Set<string>();

  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const c = classify(tags);
    if (!c) continue;
    // Schwimmbecken in Privatgärten oder Hotels sind nicht öffentlich.
    if (c.category === "bad" && tags.access && /private|customers|no/.test(tags.access)) continue;

    const id = `osm-${el.type}-${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const wheelchair = tags.wheelchair;
    const place: Place = {
      id,
      category: c.category,
      kind: c.kind,
      name: tags.name?.trim() || defaultName(c.kind),
      lat,
      lon,
      positionExact: true,
      source: "osm",
      address: address(tags),
      openingHours: tags.opening_hours,
      wheelchair:
        wheelchair === "yes" || wheelchair === "limited" || wheelchair === "no"
          ? wheelchair
          : undefined,
      fee: tags.fee === "yes" ? true : tags.fee === "no" ? false : undefined,
      website: tags.website ?? tags["contact:website"],
      shade: shadeForKind(c.kind),
      coolScore: coolScoreForKind(c.kind),
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    };
    if (c.category === "kuehl" && place.fee === undefined) place.fee = false;
    out.push(place);
  }
  return out;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Namen, die zu allgemein sind, um daran einen bestimmten Ort zu erkennen. */
const GENERIC_NAMES = new Set(["park", "wald", "stadtpark", "schlosspark", "spielplatz"]);

/**
 * Führt die Grundliste mit den OpenStreetMap-Daten zusammen.
 *
 * - Ein gleichnamiger OSM-Ort liefert der Grundlisten-Eintrag seine genaue
 *   Position; Beschreibung und Einschätzung der Grundliste bleiben erhalten.
 * - Eine OSM-Trinkwasserstelle näher als 80 m an einem städtischen Brunnen gilt
 *   als derselbe Brunnen.
 */
export function mergePlaces(base: Place[], osm: Place[]): Place[] {
  const used = new Set<string>();
  const merged = base.map((b) => {
    const key = normalizeName(b.name);
    const match =
      b.category === "wasser"
        ? osm.find(
            (o) => o.category === "wasser" && distanceKm([b.lat, b.lon], [o.lat, o.lon]) < 0.08,
          )
        : osm.find((o) => {
            if (o.category !== b.category || used.has(o.id)) return false;
            const n = normalizeName(o.name);
            if (n === key || n.includes(key)) return true;
            return n.length >= 4 && !GENERIC_NAMES.has(n) && key.includes(n);
          });
    if (!match) return b;
    used.add(match.id);
    return {
      ...match,
      ...b,
      lat: match.lat,
      lon: match.lon,
      positionExact: true,
      openingHours: b.openingHours ?? match.openingHours,
      wheelchair: b.wheelchair ?? match.wheelchair,
      osmUrl: match.osmUrl,
    };
  });
  return [...merged, ...osm.filter((o) => !used.has(o.id))];
}
