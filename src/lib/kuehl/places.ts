import type { Place } from "./types";

/*
 * Grundliste, die immer angezeigt wird - auch wenn OpenStreetMap gerade nicht
 * erreichbar ist.
 *
 * - Die drei Trinkbrunnen stammen aus den Hitze-Informationen der Stadt
 *   Mülheim an der Ruhr (Betreiber: RWW). Ihre Positionen sind nur ungefähr
 *   eingetragen, bis sie vor Ort oder über die Stadt bestätigt sind.
 * - Die Grünflächen sind eine redaktionelle Auswahl bekannter Orte. Findet die
 *   App den gleichnamigen Ort in OpenStreetMap, übernimmt sie dessen genaue
 *   Position (siehe mergePlaces in osm.ts).
 */
export const BASE_PLACES: Place[] = [
  {
    id: "stadt-brunnen-realschule-stadtmitte",
    category: "wasser",
    name: "Trinkbrunnen Realschule Stadtmitte",
    kind: "Öffentlicher Trinkbrunnen",
    lat: 51.4242,
    lon: 6.8878,
    positionExact: false,
    source: "stadt",
    address: "Schulhof der Realschule Stadtmitte",
    description: "Öffentlicher Trinkwasserbrunnen der RWW auf dem Schulhof.",
    fee: false,
    seasonal: "ostern-oktober",
  },
  {
    id: "stadt-brunnen-hoelterschule",
    category: "wasser",
    name: "Trinkbrunnen Hölterschule",
    kind: "Öffentlicher Trinkbrunnen",
    lat: 51.4335,
    lon: 6.8932,
    positionExact: false,
    source: "stadt",
    address: "Schulhof der Hölterschule",
    description: "Öffentlicher Trinkwasserbrunnen der RWW auf dem Schulhof.",
    fee: false,
    seasonal: "ostern-oktober",
  },
  {
    id: "stadt-brunnen-aktienstrasse",
    category: "wasser",
    name: "Trinkbrunnen Aktienstraße",
    kind: "Öffentlicher Trinkbrunnen",
    lat: 51.4478,
    lon: 6.8975,
    positionExact: false,
    source: "stadt",
    address: "Aktienstraße 214",
    description: "Öffentlicher Trinkwasserbrunnen der RWW.",
    fee: false,
    seasonal: "ostern-oktober",
  },
  {
    id: "auswahl-muega",
    category: "kuehl",
    name: "MüGa-Park",
    kind: "Park",
    lat: 51.432,
    lon: 6.8762,
    positionExact: false,
    source: "auswahl",
    description: "Großer Park an der Ruhr mit Wiesen, Bäumen und Wegen am Wasser.",
    fee: false,
    shade: "teils",
    coolScore: 4,
  },
  {
    id: "auswahl-schloss-broich",
    category: "kuehl",
    name: "Park am Schloss Broich",
    kind: "Park",
    lat: 51.4272,
    lon: 6.869,
    positionExact: false,
    source: "auswahl",
    description: "Grünanlage rund um das historische Schloss, direkt neben der MüGa.",
    fee: false,
    shade: "teils",
    coolScore: 3,
  },
  {
    id: "auswahl-ruhrpromenade",
    category: "kuehl",
    name: "Ruhrpromenade",
    kind: "Uferweg",
    lat: 51.4262,
    lon: 6.88,
    positionExact: false,
    source: "auswahl",
    description: "Uferweg an der Ruhr in der Innenstadt. Wassernähe, Schatten je nach Abschnitt.",
    fee: false,
    shade: "wenig",
    coolScore: 2,
  },
  {
    id: "auswahl-broich-speldorfer-wald",
    category: "kuehl",
    name: "Broich-Speldorfer Wald",
    kind: "Wald",
    lat: 51.4165,
    lon: 6.836,
    positionExact: false,
    source: "auswahl",
    description:
      "Großes Waldgebiet im Westen. Wälder bleiben an heißen Tagen meist deutlich kühler als bebaute Flächen.",
    fee: false,
    shade: "viel",
    coolScore: 5,
  },
  {
    id: "auswahl-witthausbusch",
    category: "kuehl",
    name: "Witthausbusch",
    kind: "Wald",
    lat: 51.4155,
    lon: 6.9065,
    positionExact: false,
    source: "auswahl",
    description: "Stadtwald und Erholungsgebiet südöstlich der Innenstadt.",
    fee: false,
    shade: "viel",
    coolScore: 5,
  },
  {
    id: "auswahl-rumbachtal",
    category: "kuehl",
    name: "Rumbachtal",
    kind: "Bachtal",
    lat: 51.4205,
    lon: 6.923,
    positionExact: false,
    source: "auswahl",
    description: "Grünzug entlang des Rumbachs mit Wegen und Bäumen.",
    fee: false,
    shade: "viel",
    coolScore: 4,
  },
  {
    id: "auswahl-auberg",
    category: "kuehl",
    name: "Auberg",
    kind: "Wald",
    lat: 51.3985,
    lon: 6.858,
    positionExact: false,
    source: "auswahl",
    description: "Wald- und Erholungsgebiet im Süden der Stadt.",
    fee: false,
    shade: "viel",
    coolScore: 5,
  },
  {
    id: "auswahl-schlosspark-styrum",
    category: "kuehl",
    name: "Schlosspark Styrum",
    kind: "Park",
    lat: 51.4505,
    lon: 6.8655,
    positionExact: false,
    source: "auswahl",
    description: "Park am Schloss Styrum mit altem Baumbestand.",
    fee: false,
    shade: "teils",
    coolScore: 4,
  },
  {
    id: "auswahl-hexbachtal",
    category: "kuehl",
    name: "Hexbachtal",
    kind: "Bachtal",
    lat: 51.4475,
    lon: 6.93,
    positionExact: false,
    source: "auswahl",
    description: "Bachtal mit Wald und Wegen im Nordosten.",
    fee: false,
    shade: "viel",
    coolScore: 4,
  },
];

/** Kühlungs-Einschätzung nach Art des Ortes. Bewusst grob und erklärt. */
export function coolScoreForKind(kind: string): number | undefined {
  switch (kind) {
    case "Wald":
    case "Bachtal":
      return 5;
    case "Park":
      return 3;
    case "Uferweg":
      return 2;
    default:
      return undefined;
  }
}

export function shadeForKind(kind: string): Place["shade"] {
  switch (kind) {
    case "Wald":
    case "Bachtal":
      return "viel";
    case "Park":
      return "teils";
    default:
      return undefined;
  }
}
