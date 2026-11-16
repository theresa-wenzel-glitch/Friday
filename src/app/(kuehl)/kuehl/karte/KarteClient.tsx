"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistance } from "@/lib/kuehl/geo";
import type { PlaceCategory } from "@/lib/kuehl/types";
import { MapView } from "@/components/kuehl/MapView";
import { CATEGORY, Icon } from "@/components/kuehl/icons";
import { useKuehl } from "@/components/kuehl/KuehlProvider";
import { LocationPicker, PlaceSheet } from "@/components/kuehl/places-ui";

const LAYERS: PlaceCategory[] = ["wasser", "kuehl", "bad", "haus", "wc", "meldung"];
const DEFAULT_ON: PlaceCategory[] = ["wasser", "kuehl", "bad", "haus", "meldung"];

export function KarteClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { places, placesState, placesNotice, osmFetchedAt, location, distanceTo, byId, weather } = useKuehl();
  const [layers, setLayers] = useState<Set<PlaceCategory>>(new Set(DEFAULT_ON));
  const [heat, setHeat] = useState(params.get("hitze") === "1");
  const [toast, setToast] = useState<string | null>(null);
  const selectedId = params.get("ort");
  const selected = selectedId ? byId(selectedId) : undefined;

  const select = useCallback(
    (id: string | null) => {
      const q = new URLSearchParams(params.toString());
      if (id) q.set("ort", id);
      else q.delete("ort");
      router.replace(`/kuehl/karte${q.size ? `?${q}` : ""}`, { scroll: false });
    },
    [params, router],
  );

  // Ein ausgewählter Ort soll sichtbar sein, auch wenn seine Ebene aus war.
  const selectedCategory = selected?.category;
  useEffect(() => {
    if (selectedCategory) setLayers((l) => (l.has(selectedCategory) ? l : new Set(l).add(selectedCategory)));
  }, [selectedId, selectedCategory]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => places.filter((p) => layers.has(p.category)), [places, layers]);
  const counts = useMemo(() => {
    const c: Partial<Record<PlaceCategory, number>> = {};
    for (const p of places) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [places]);

  const toggle = (k: PlaceCategory) =>
    setLayers((l) => {
      const n = new Set(l);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const nearestWater = () => {
    const w = places.filter((p) => p.category === "wasser").sort((a, b) => distanceTo(a) - distanceTo(b))[0];
    if (!w) return setToast("Noch keine Trinkwasserstellen geladen.");
    setLayers((l) => new Set(l).add("wasser"));
    select(w.id);
    setToast(`Nächstes Trinkwasser: ${w.name}, ${formatDistance(distanceTo(w))}`);
  };

  return (
    <section className="k-view">
      <div className="k-row">
        <h1 className="k-h1">Stadtkarte</h1>
        <span className="k-small">
          {placesState === "loading" ? "Orte werden geladen …" : `${visible.length} Orte sichtbar`}
        </span>
      </div>

      <div className="k-chips" role="group" aria-label="Kartenebenen">
        {LAYERS.filter((k) => k !== "meldung" || counts.meldung).map((k) => (
          <button key={k} type="button" className="k-chip" aria-pressed={layers.has(k)} onClick={() => toggle(k)}>
            <i style={{ background: CATEGORY[k].color }} />
            {CATEGORY[k].label}
            {counts[k] ? <span style={{ opacity: 0.7, fontWeight: 400 }}>{counts[k]}</span> : null}
          </button>
        ))}
        <button type="button" className="k-chip" aria-pressed={heat} onClick={() => setHeat((h) => !h)}>
          <i style={{ background: "linear-gradient(90deg,#3B8FD0,#D9A514,#D2453A)" }} />
          Hitze
        </button>
      </div>

      <MapView
        label="Karte von Mülheim an der Ruhr mit kühlen Orten und Trinkwasser"
        places={visible}
        user={location}
        selectedId={selectedId}
        onSelect={(id) => select(id)}
        districts={heat ? weather?.districts : undefined}
        focus={selected ? [selected.lat, selected.lon] : null}
      />

      {heat && (
        <div className="k-card" style={{ padding: 14, display: "grid", gap: 8 }}>
          <div className="k-heatkey">
            {(["kuehl", "angenehm", "warm", "heiss", "extrem"] as const).map((k, i) => (
              <span key={k}>
                <b style={{ background: `var(--k-l-${k})` }} />
                {["unter 15°", "15–24°", "25–29°", "30–34°", "ab 35°"][i]}
              </span>
            ))}
          </div>
          <p className="k-small">
            {weather?.districts.length
              ? "Aktuelle Lufttemperatur je Stadtteil aus dem Wettermodell (Open-Meteo, u. a. mit Daten des DWD). Das sind Modellwerte, keine Messungen vor Ort."
              : "Die Temperaturen je Stadtteil sind gerade nicht verfügbar."}{" "}
            Wo sich Mülheim im Sommer besonders aufheizt, zeigen die Klimatopkarte und die Hitzevulnerabilitätsanalyse der
            Stadt auf{" "}
            <a href="https://www.muelheim-ruhr.de" target="_blank" rel="noreferrer">
              muelheim-ruhr.de
            </a>
            .
          </p>
        </div>
      )}

      <div className="k-legend">
        <span>
          <i style={{ background: "#1f6e9e" }} />
          {location.mode === "gps" ? "Mein Standort" : `Startpunkt: ${location.label}`}
        </span>
        <span>
          <i style={{ border: "2px dashed var(--k-muted)" }} />
          gestrichelt = Position ungefähr
        </span>
      </div>

      <div className="k-card" style={{ display: "grid", gap: 12 }}>
        <LocationPicker id="loc-map" />
        <button type="button" className="k-btn2" style={{ justifyContent: "center" }} onClick={nearestWater}>
          <Icon name="drop" size={18} /> Nächstes Trinkwasser finden
        </button>
      </div>

      {placesNotice && <p className="k-small">{placesNotice}</p>}
      {osmFetchedAt && (
        <p className="k-small">
          OpenStreetMap-Daten vom{" "}
          {new Date(osmFetchedAt).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      )}
      {placesState === "error" && <p className="k-error">Die Orte konnten nicht geladen werden. Bitte lade die Seite neu.</p>}

      {selected && <PlaceSheet place={selected} onClose={() => select(null)} />}
      {toast && (
        <div className="k-toast" role="status">
          {toast}
        </div>
      )}
    </section>
  );
}
