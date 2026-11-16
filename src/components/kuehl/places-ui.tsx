"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  distanceKm,
  formatDate,
  formatDistance,
  fountainSeason,
  START_POINTS,
  walkingMinutes,
} from "@/lib/kuehl/geo";
import type { Place } from "@/lib/kuehl/types";
import { CATEGORY, Icon, Leaves } from "./icons";
import { useKuehl } from "./KuehlProvider";

const NOT_YET = "Noch nicht erfasst";

export function useSeason() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now ? fountainSeason(now) : null;
}

const SOURCE_LABEL: Record<Place["source"], string> = {
  stadt: "Stadt Mülheim an der Ruhr (Hitze-Informationen)",
  osm: "OpenStreetMap-Mitwirkende",
  auswahl: "Redaktionelle Auswahl der App",
  meldung: "Bürgermeldung, von der Moderation geprüft",
};

const WHEELCHAIR: Record<NonNullable<Place["wheelchair"]>, string> = {
  yes: "Ja, laut OpenStreetMap",
  limited: "Eingeschränkt, laut OpenStreetMap",
  no: "Nein, laut OpenStreetMap",
};

function SeasonTag({ place }: { place: Place }) {
  const season = useSeason();
  if (place.seasonal !== "ostern-oktober" || !season) return null;
  return season.inSeason ? (
    <span className="k-tag w">In Saison</span>
  ) : (
    <span className="k-tag warn">Winterpause</span>
  );
}

export function PlaceRow({ place, onOpen }: { place: Place; onOpen: (id: string) => void }) {
  const { distanceTo } = useKuehl();
  const c = CATEGORY[place.category];
  const km = distanceTo(place);
  return (
    <button type="button" className="k-place" onClick={() => onOpen(place.id)}>
      <span className="k-place-ic" style={{ background: c.color }}>
        <Icon name={c.icon} size={24} />
      </span>
      <span style={{ minWidth: 0 }}>
        <h3>{place.name}</h3>
        <span className="k-meta">
          {place.kind}
          {place.coolScore ? (
            <>
              {" · "}
              <Leaves score={place.coolScore} />
            </>
          ) : null}
        </span>
        <span className="k-tags">
          <SeasonTag place={place} />
          {place.shade === "viel" && <span className="k-tag">Viel Schatten</span>}
          {place.fee === false && <span className="k-tag">Kostenlos</span>}
          {place.wheelchair === "yes" && <span className="k-tag w">Rollstuhlgerecht</span>}
          {place.source === "stadt" && <span className="k-tag w">Angabe der Stadt</span>}
        </span>
      </span>
      <span className="k-dist">
        {formatDistance(km)}
        <br />
        <span className="k-small">{walkingMinutes(km)} Min.</span>
      </span>
    </button>
  );
}

function Fact({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="k-fact">
      <dt>{label}</dt>
      <dd>{children ?? <span className="k-unk">{NOT_YET}</span>}</dd>
    </div>
  );
}

export function PlaceSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const { distanceTo, location, places } = useKuehl();
  const season = useSeason();
  const closeRef = useRef<HTMLButtonElement>(null);
  const c = CATEGORY[place.category];
  const km = distanceTo(place);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nearestWater =
    place.category !== "wasser"
      ? places
          .filter((p) => p.category === "wasser")
          .map((p) => ({ p, d: distanceKm([p.lat, p.lon], [place.lat, place.lon]) }))
          .sort((a, b) => a.d - b.d)[0]
      : undefined;

  const route = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${location.lat.toFixed(5)}%2C${location.lon.toFixed(5)}%3B${place.lat.toFixed(5)}%2C${place.lon.toFixed(5)}`;

  return (
    <>
      <div className="k-scrim" onClick={onClose} />
      <div className="k-sheet" role="dialog" aria-modal="true" aria-labelledby="k-sheet-title">
        <button ref={closeRef} type="button" className="k-close" onClick={onClose} aria-label="Schließen">
          ×
        </button>
        <div className="k-grab" />
        <div className="k-sheet-head">
          <span className="k-place-ic" style={{ background: c.color }}>
            <Icon name={c.icon} size={26} />
          </span>
          <div style={{ minWidth: 0 }}>
            <span className="k-eyebrow">{place.kind}</span>
            <h2 id="k-sheet-title" style={{ fontSize: 23 }}>
              {place.name}
            </h2>
          </div>
        </div>
        {place.description && <p style={{ marginTop: 12 }}>{place.description}</p>}

        <dl className="k-facts">
          {place.address && <Fact label="Adresse">{place.address}</Fact>}
          <Fact label="Entfernung">
            {formatDistance(km)} Luftlinie, zu Fuß etwa {walkingMinutes(km)} Min. ab {location.label}
          </Fact>

          {place.category === "wasser" && (
            <>
              <Fact label="Trinkwasser">Ja</Fact>
              {place.seasonal === "ostern-oktober" && season && (
                <Fact label="Saison">
                  Ostern bis Oktober.{" "}
                  {season.inSeason
                    ? "Der Brunnen ist jetzt in Saison."
                    : `Gerade Winterpause. Nächster Start voraussichtlich am ${formatDate(season.start)}.`}
                </Fact>
              )}
              {place.source === "stadt" && (
                <Fact label="Zugang">Auf einem Schulhof. Ob er jederzeit zugänglich ist, ist noch nicht geprüft.</Fact>
              )}
            </>
          )}

          {place.category === "kuehl" && (
            <>
              {place.coolScore && (
                <Fact label="Cool-Score">
                  <Leaves score={place.coolScore} /> <span className="k-unk">Einschätzung nach Art des Ortes</span>
                </Fact>
              )}
              <Fact label="Schatten">
                {place.shade === "viel"
                  ? "Viel (Wald oder dichter Baumbestand)"
                  : place.shade === "teils"
                    ? "Teilweise"
                    : place.shade === "wenig"
                      ? "Wenig, je nach Abschnitt"
                      : undefined}
              </Fact>
              <Fact label="Eintritt">{place.fee === false ? "Kostenlos" : place.fee ? "Kostenpflichtig" : undefined}</Fact>
              {nearestWater && (
                <Fact label="Trinkwasser in der Nähe">
                  {nearestWater.p.name}, etwa {formatDistance(nearestWater.d)}
                  {nearestWater.p.seasonal && season && !season.inSeason ? " (Winterpause)" : ""}
                </Fact>
              )}
            </>
          )}

          {(place.category === "bad" || place.category === "haus" || place.category === "wc") && (
            <Fact label="Öffnungszeiten">{place.openingHours}</Fact>
          )}
          {place.category === "bad" && (
            <Fact label="Eintritt">{place.fee === false ? "Kostenlos" : place.fee ? "Kostenpflichtig" : undefined}</Fact>
          )}
          {place.category === "haus" && (
            <Fact label="Als kühler Ort">
              <span className="k-unk">Nicht bestätigt. Bitte vorher erkundigen.</span>
            </Fact>
          )}
          {place.category !== "meldung" && (
            <Fact label="Barrierefrei">{place.wheelchair ? WHEELCHAIR[place.wheelchair] : undefined}</Fact>
          )}
          <Fact label="Quelle">
            {SOURCE_LABEL[place.source]}
            {!place.positionExact && <span className="k-unk"> · Position ungefähr</span>}
          </Fact>
        </dl>

        <div className="k-actions">
          <a className="k-cta" style={{ width: "auto", flex: 1 }} href={route} target="_blank" rel="noreferrer">
            <Icon name="walk" size={20} /> Fußweg anzeigen
          </a>
          {place.website && (
            <a className="k-btn2" href={place.website} target="_blank" rel="noreferrer">
              Website
            </a>
          )}
        </div>
        <p className="k-small" style={{ marginTop: 12 }}>
          Stimmt etwas nicht? <Link href={`/kuehl/melden?lat=${place.lat}&lon=${place.lon}`}>Fehler melden</Link>
          {place.osmUrl && (
            <>
              {" · "}
              <a href={place.osmUrl} target="_blank" rel="noreferrer">
                In OpenStreetMap ansehen
              </a>
            </>
          )}
        </p>
      </div>
    </>
  );
}

export function LocationPicker({ id }: { id: string }) {
  const { location, setStartPoint, locate, locating } = useKuehl();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="k-loc">
        <label htmlFor={id} className="k-small" style={{ fontSize: 14 }}>
          Ich bin hier:
        </label>
        <select
          id={id}
          value={location.mode}
          onChange={(e) => {
            setMsg(null);
            if (e.target.value !== "gps") setStartPoint(e.target.value);
          }}
        >
          {location.mode === "gps" && <option value="gps">Mein Standort</option>}
          {START_POINTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="k-btn2"
          disabled={locating}
          onClick={async () => setMsg(await locate())}
        >
          <Icon name="locate" size={18} /> {locating ? "Suche …" : "Standort nutzen"}
        </button>
      </div>
      {msg && (
        <p className="k-small" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
