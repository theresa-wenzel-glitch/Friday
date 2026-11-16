"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { inCityBounds } from "@/lib/kuehl/geo";
import { REPORT_CATEGORIES } from "@/lib/kuehl/types";
import { MapView } from "@/components/kuehl/MapView";
import { Icon } from "@/components/kuehl/icons";
import { useKuehl } from "@/components/kuehl/KuehlProvider";

const MAX = 600;

export function MeldenClient() {
  const params = useSearchParams();
  const { location, places } = useKuehl();
  const initLat = Number(params.get("lat"));
  const initLon = Number(params.get("lon"));
  const [pos, setPos] = useState<[number, number] | null>(
    Number.isFinite(initLat) && Number.isFinite(initLon) && inCityBounds(initLat, initLon) ? [initLat, initLon] : null,
  );
  const [category, setCategory] = useState<string>(params.get("lat") ? "Fehler in der Karte" : REPORT_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const pick = (lat: number, lon: number) => {
    setError(null);
    if (!inCityBounds(lat, lon)) return setError("Diese Stelle liegt außerhalb von Mülheim an der Ruhr.");
    setPos([lat, lon]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pos) return setError("Bitte tippe auf der Karte an, wo der Ort ist.");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/kuehl/meldungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description, lat: pos[0], lon: pos[1] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Die Meldung konnte nicht gespeichert werden.");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <section className="k-view">
        <h1 className="k-h1">Danke!</h1>
        <div className="k-success" role="status">
          <b>Deine Meldung ist angekommen.</b>
          <p style={{ marginTop: 6 }}>
            Sie wird geprüft und erscheint danach auf der Karte. Es wurden keine persönlichen Daten gespeichert.
          </p>
        </div>
        <button
          type="button"
          className="k-cta"
          onClick={() => {
            setDone(false);
            setPos(null);
            setDescription("");
          }}
        >
          Noch etwas melden
        </button>
      </section>
    );
  }

  return (
    <section className="k-view">
      <h1 className="k-h1">Ort melden</h1>
      <p className="k-muted">
        Fehlt ein Trinkbrunnen, ist einer kaputt oder kennst du einen schattigen Platz? Jede Meldung wird geprüft, bevor
        sie öffentlich auf der Karte erscheint.
      </p>
      <form className="k-card k-form" onSubmit={submit} noValidate>
        <div className="k-field">
          <label htmlFor="r-cat">Was möchtest du melden?</label>
          <select id="r-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            {REPORT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="k-field">
          <span className="k-label">Wo ist das?</span>
          <MapView
            small
            label="Karte zum Auswählen des gemeldeten Ortes"
            places={places.filter((p) => p.category === "wasser")}
            user={location}
            pick={{ pos, onPick: pick }}
            focus={pos}
          />
          <span className="k-small">
            {pos
              ? `Gewählt: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}. Zum Ändern einfach woanders tippen.`
              : "Tippe auf die Karte. Du kannst vorher hineinzoomen."}
          </span>
        </div>
        <div className="k-field">
          <label htmlFor="r-desc">Beschreibung (freiwillig)</label>
          <textarea
            id="r-desc"
            maxLength={MAX}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Was ist dir aufgefallen? Bitte keine Namen oder Kontaktdaten."
          />
          <span className="k-small">
            {description.length} von {MAX} Zeichen
          </span>
        </div>
        {error && (
          <p className="k-error" role="alert">
            {error}
          </p>
        )}
        <button className="k-cta" type="submit" disabled={sending}>
          <Icon name="pin" size={20} /> {sending ? "Wird gesendet …" : "Meldung absenden"}
        </button>
        <p className="k-small">
          Gespeichert werden nur Kategorie, Position und deine Beschreibung. Kein Name, keine E-Mail, keine IP-Adresse.
        </p>
      </form>
    </section>
  );
}
