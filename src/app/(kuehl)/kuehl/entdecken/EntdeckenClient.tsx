"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { distanceKm, formatDate } from "@/lib/kuehl/geo";
import type { Place } from "@/lib/kuehl/types";
import { useKuehl } from "@/components/kuehl/KuehlProvider";
import { LocationPicker, PlaceRow, useSeason } from "@/components/kuehl/places-ui";

type Tab = "kuehl" | "wasser" | "bad";
const TABS: { id: Tab; label: string; title: string }[] = [
  { id: "kuehl", label: "Kühle Orte", title: "Hier kannst du dich abkühlen" },
  { id: "wasser", label: "Trinkwasser", title: "Trinkwasser in deiner Nähe" },
  { id: "bad", label: "Baden", title: "Schwimmbäder und Wasserspaß" },
];
const PAGE = 25;

export function EntdeckenClient() {
  const params = useSearchParams();
  const router = useRouter();
  const tabParam = params.get("tab");
  const tab: Tab = tabParam === "wasser" || tabParam === "bad" ? tabParam : "kuehl";
  const { places, placesState, distanceTo } = useKuehl();
  const season = useSeason();
  const [shade, setShade] = useState(false);
  const [water, setWater] = useState(false);
  const [access, setAccess] = useState(false);
  const [buildings, setBuildings] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const fountains = useMemo(() => places.filter((p) => p.category === "wasser"), [places]);

  const items = useMemo(() => {
    let list: Place[] = places.filter((p) =>
      tab === "kuehl" ? p.category === "kuehl" || (buildings && p.category === "haus") : p.category === tab,
    );
    if (tab === "kuehl") {
      if (shade) list = list.filter((p) => p.shade === "viel");
      if (water)
        list = list.filter((p) => fountains.some((f) => distanceKm([f.lat, f.lon], [p.lat, p.lon]) < 0.5));
    }
    if (access) list = list.filter((p) => p.wheelchair === "yes" || p.wheelchair === "limited");
    return list.sort((a, b) => distanceTo(a) - distanceTo(b));
  }, [places, tab, shade, water, access, buildings, fountains, distanceTo]);

  const current = TABS.find((t) => t.id === tab)!;
  const open = (id: string) => router.push(`/kuehl/karte?ort=${id}`);

  return (
    <section className="k-view">
      <h1 className="k-h1">Entdecken</h1>
      <div className="k-tabs" role="tablist" aria-label="Kategorie">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab}
            onClick={() => {
              setLimit(PAGE);
              router.replace(`/kuehl/entdecken?tab=${t.id}`, { scroll: false });
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <h2 style={{ fontSize: 21 }}>{current.title}</h2>
      <LocationPicker id="loc-list" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
        {tab === "kuehl" && (
          <>
            <label className="k-check">
              <input type="checkbox" checked={shade} onChange={(e) => setShade(e.target.checked)} />
              Viel Schatten
            </label>
            <label className="k-check">
              <input type="checkbox" checked={water} onChange={(e) => setWater(e.target.checked)} />
              Trinkwasser in der Nähe
            </label>
            <label className="k-check">
              <input type="checkbox" checked={buildings} onChange={(e) => setBuildings(e.target.checked)} />
              Auch Gebäude zeigen
            </label>
          </>
        )}
        <label className="k-check">
          <input type="checkbox" checked={access} onChange={(e) => setAccess(e.target.checked)} />
          Barrierefrei (laut OpenStreetMap)
        </label>
      </div>

      {tab === "wasser" && season && (
        <div className="k-card" style={{ background: season.inSeason ? "var(--k-water)" : "var(--k-heat-bg)", padding: 14 }}>
          <b>{season.inSeason ? "Die öffentlichen Trinkbrunnen sind in Saison." : "Winterpause bei den Trinkbrunnen."}</b>{" "}
          Die drei Brunnen der RWW laufen von Ostern bis Oktober.
          {!season.inSeason && ` Nächster Start voraussichtlich am ${formatDate(season.start)}.`} Weitere Wasserstellen
          stammen aus OpenStreetMap und sind nicht von der Stadt bestätigt.
        </div>
      )}

      <div className="k-list">
        {placesState === "loading" && <p className="k-empty">Orte werden geladen …</p>}
        {placesState !== "loading" && items.length === 0 && (
          <p className="k-empty">Kein Ort passt zu diesen Filtern. Nimm einen Haken heraus.</p>
        )}
        {items.slice(0, limit).map((p) => (
          <PlaceRow key={p.id} place={p} onOpen={open} />
        ))}
      </div>
      {items.length > limit && (
        <button type="button" className="k-btn2" style={{ justifyContent: "center" }} onClick={() => setLimit((l) => l + PAGE)}>
          Weitere {Math.min(PAGE, items.length - limit)} von {items.length - limit} zeigen
        </button>
      )}

      {tab === "kuehl" && (
        <p className="k-small">
          Die Blätter (1 bis 5) sind eine grobe Einschätzung nach Art des Ortes: Wald und Bachtal hoch, Parks mittel,
          offene Uferwege niedriger. Das ist keine Messung und keine medizinische Bewertung.
        </p>
      )}
      {tab === "bad" && (
        <p className="k-small">
          Öffnungszeiten und Preise ändern sich oft. Bitte prüf sie vor dem Besuch beim Betreiber.
        </p>
      )}
    </section>
  );
}
