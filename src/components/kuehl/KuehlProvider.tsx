"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { distanceKm, START_POINTS } from "@/lib/kuehl/geo";
import type { Place, PlacesResponse, WeatherResponse } from "@/lib/kuehl/types";

/*
 * Gemeinsamer Zustand aller Seiten: Orte, Wetter und "wo bin ich".
 * Der Standort bleibt im Gerät (localStorage) und wird nie an den Server
 * geschickt; Entfernungen rechnet der Browser selbst aus.
 */

export interface UserLocation {
  lat: number;
  lon: number;
  label: string;
  /** "gps" = echter Gerätestandort, sonst die ID eines Startpunkts. */
  mode: "gps" | string;
}

type LoadState = "loading" | "ready" | "error";

interface KuehlContextValue {
  places: Place[];
  placesState: LoadState;
  osmFetchedAt: string | null;
  placesNotice?: string;
  weather: WeatherResponse | null;
  weatherState: LoadState;
  location: UserLocation;
  setStartPoint: (id: string) => void;
  locate: () => Promise<string | null>;
  locating: boolean;
  distanceTo: (p: { lat: number; lon: number }) => number;
  byId: (id: string) => Place | undefined;
}

const KuehlContext = createContext<KuehlContextValue | null>(null);

const STORAGE_KEY = "kuehl-standort";
const fallback = START_POINTS[0];
const defaultLocation: UserLocation = {
  lat: fallback.lat,
  lon: fallback.lon,
  label: fallback.name,
  mode: fallback.id,
};

export function KuehlProvider({ children }: { children: React.ReactNode }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesState, setPlacesState] = useState<LoadState>("loading");
  const [osmFetchedAt, setOsmFetchedAt] = useState<string | null>(null);
  const [placesNotice, setPlacesNotice] = useState<string | undefined>();
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherState, setWeatherState] = useState<LoadState>("loading");
  const [location, setLocation] = useState<UserLocation>(defaultLocation);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as UserLocation | null;
      if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lon)) setLocation(saved);
    } catch {
      // Ohne gespeicherten Standort bleibt es beim Hauptbahnhof.
    }
  }, []);

  const loadPlaces = useCallback(async () => {
    try {
      const res = await fetch("/api/kuehl/orte");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as PlacesResponse;
      setPlaces(data.places);
      setOsmFetchedAt(data.osmFetchedAt);
      setPlacesNotice(data.notice);
      setPlacesState("ready");
      return data;
    } catch {
      setPlacesState("error");
      return null;
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    loadPlaces().then((data) => {
      // Lief OpenStreetMap beim ersten Aufruf noch, einmal später nachladen.
      if (data && !data.osmFetchedAt) timer = setTimeout(loadPlaces, 45_000);
    });
    fetch("/api/kuehl/wetter")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((w: WeatherResponse) => {
        setWeather(w);
        setWeatherState(w.ok ? "ready" : "error");
      })
      .catch(() => setWeatherState("error"));
    return () => clearTimeout(timer);
  }, [loadPlaces]);

  const save = (loc: UserLocation) => {
    setLocation(loc);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      // Privater Modus: dann gilt der Standort nur bis zum Neuladen.
    }
  };

  const setStartPoint = useCallback((id: string) => {
    const p = START_POINTS.find((s) => s.id === id);
    if (p) save({ lat: p.lat, lon: p.lon, label: p.name, mode: p.id });
  }, []);

  /** Fragt den Gerätestandort ab. Gibt bei Erfolg null, sonst eine Fehlermeldung zurück. */
  const locate = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        if (!("geolocation" in navigator)) {
          resolve("Dein Gerät kann den Standort nicht bestimmen. Wähle einen Startpunkt aus der Liste.");
          return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocating(false);
            save({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              label: "Mein Standort",
              mode: "gps",
            });
            resolve(null);
          },
          (err) => {
            setLocating(false);
            resolve(
              err.code === err.PERMISSION_DENIED
                ? "Du hast den Standort nicht freigegeben. Du kannst stattdessen einen Startpunkt wählen."
                : "Der Standort konnte gerade nicht bestimmt werden. Versuch es draußen noch einmal oder wähle einen Startpunkt.",
            );
          },
          { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
        );
      }),
    [],
  );

  const value = useMemo<KuehlContextValue>(
    () => ({
      places,
      placesState,
      osmFetchedAt,
      placesNotice,
      weather,
      weatherState,
      location,
      setStartPoint,
      locate,
      locating,
      distanceTo: (p) => distanceKm([location.lat, location.lon], [p.lat, p.lon]),
      byId: (id) => places.find((p) => p.id === id),
    }),
    [places, placesState, osmFetchedAt, placesNotice, weather, weatherState, location, setStartPoint, locate, locating],
  );

  return <KuehlContext.Provider value={value}>{children}</KuehlContext.Provider>;
}

export function useKuehl(): KuehlContextValue {
  const ctx = useContext(KuehlContext);
  if (!ctx) throw new Error("useKuehl außerhalb von KuehlProvider");
  return ctx;
}
