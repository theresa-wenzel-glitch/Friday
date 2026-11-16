"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { CITY_BOUNDS, CITY_CENTER, tempLevel } from "@/lib/kuehl/geo";
import type { DistrictTemp, Place } from "@/lib/kuehl/types";
import { CATEGORY, iconSvg } from "./icons";

/*
 * Leaflet-Karte mit OpenStreetMap-Kacheln. Leaflet greift beim Laden auf
 * `window` zu und wird deshalb erst im Browser importiert.
 */

interface Props {
  places: Place[];
  user?: { lat: number; lon: number; mode: string };
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  districts?: DistrictTemp[];
  pick?: { pos: [number, number] | null; onPick: (lat: number, lon: number) => void };
  focus?: [number, number] | null;
  small?: boolean;
  label: string;
}

export function MapView({ places, user, selectedId, onSelect, districts, pick, focus, small, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const placeLayer = useRef<Leaflet.LayerGroup | null>(null);
  const extraLayer = useRef<Leaflet.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(pick?.onPick);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  onSelectRef.current = onSelect;
  onPickRef.current = pick?.onPick;

  useEffect(() => {
    let cancelled = false;
    import("leaflet")
      .then((mod) => {
        if (cancelled || !box.current || map.current) return;
        const lib = (mod.default ?? mod) as typeof Leaflet;
        L.current = lib;
        const m = lib.map(box.current, {
          center: CITY_CENTER,
          zoom: small ? 14 : 13,
          minZoom: 11,
          maxZoom: 19,
          maxBounds: lib.latLngBounds(
            [CITY_BOUNDS[0][0] - 0.05, CITY_BOUNDS[0][1] - 0.08],
            [CITY_BOUNDS[1][0] + 0.05, CITY_BOUNDS[1][1] + 0.08],
          ),
          zoomControl: !small,
        });
        lib
          .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>-Mitwirkende',
          })
          .addTo(m);
        m.attributionControl.setPrefix(false);
        placeLayer.current = lib.layerGroup().addTo(m);
        extraLayer.current = lib.layerGroup().addTo(m);
        m.on("click", (e: Leaflet.LeafletMouseEvent) => onPickRef.current?.(e.latlng.lat, e.latlng.lng));
        map.current = m;
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [small]);

  // Orte
  useEffect(() => {
    const lib = L.current;
    const layer = placeLayer.current;
    if (!ready || !lib || !layer) return;
    layer.clearLayers();
    for (const p of places) {
      const c = CATEGORY[p.category];
      const sel = p.id === selectedId;
      const icon = lib.divIcon({
        className: "",
        html: `<div class="k-marker${p.positionExact ? "" : " is-approx"}${sel ? " is-sel" : ""}" style="background:${c.color}">${iconSvg(c.icon, 15)}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      lib
        .marker([p.lat, p.lon], {
          icon,
          title: p.name,
          alt: p.name,
          keyboard: true,
          zIndexOffset: sel ? 1000 : p.category === "wasser" ? 200 : 0,
        })
        .on("click", () => onSelectRef.current?.(p.id))
        .addTo(layer);
    }
  }, [ready, places, selectedId]);

  // Standort, Temperaturen der Stadtteile, gewählter Meldeort
  useEffect(() => {
    const lib = L.current;
    const layer = extraLayer.current;
    if (!ready || !lib || !layer) return;
    layer.clearLayers();
    for (const d of districts ?? []) {
      const lvl = tempLevel(d.temperature);
      lib
        .marker([d.lat, d.lon], {
          icon: lib.divIcon({
            className: "",
            html: `<div class="k-temp-badge" style="background:var(--k-l-${lvl})">${d.name} ${d.temperature.toFixed(0)}°</div>`,
            iconSize: [110, 22],
            iconAnchor: [55, 11],
          }),
          interactive: false,
          keyboard: false,
        })
        .addTo(layer);
    }
    if (user) {
      lib
        .marker([user.lat, user.lon], {
          icon: lib.divIcon({ className: "", html: '<div class="k-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
          title: user.mode === "gps" ? "Mein Standort" : "Startpunkt",
          keyboard: false,
          zIndexOffset: 500,
        })
        .addTo(layer);
    }
    if (pick?.pos) {
      lib
        .marker(pick.pos, {
          icon: lib.divIcon({ className: "", html: '<div class="k-pick"></div>', iconSize: [26, 26], iconAnchor: [13, 26] }),
          title: "Gewählter Ort",
          keyboard: false,
          zIndexOffset: 1500,
        })
        .addTo(layer);
    }
  }, [ready, districts, user, pick?.pos]);

  useEffect(() => {
    if (ready && focus) map.current?.setView(focus, Math.max(map.current.getZoom(), 15), { animate: true });
  }, [ready, focus]);

  return (
    <div className={`k-map${small ? " is-small" : ""}`}>
      <div ref={box} role="application" aria-label={label} style={{ width: "100%", height: "100%" }} />
      {!ready && !failed && <div className="k-map-hint">Karte wird geladen …</div>}
      {failed && <div className="k-map-hint">Die Karte konnte nicht geladen werden.</div>}
      {pick && ready && !pick.pos && <div className="k-map-hint">Tippe auf die Stelle, die du melden möchtest</div>}
    </div>
  );
}
