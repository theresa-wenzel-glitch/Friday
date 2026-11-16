"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, formatDistance, heatLevel, type HeatLevelKey } from "@/lib/kuehl/geo";
import { Icon } from "@/components/kuehl/icons";
import { useKuehl } from "@/components/kuehl/KuehlProvider";
import { useSeason } from "@/components/kuehl/places-ui";

const SCALE: HeatLevelKey[] = ["kuehl", "angenehm", "warm", "heiss", "extrem"];
const SCALE_LABEL: Record<HeatLevelKey, string> = {
  kuehl: "kühl",
  angenehm: "angenehm",
  warm: "warm",
  heiss: "heiß",
  extrem: "sehr heiß",
};

const fmt = (n: number) => n.toFixed(0);
const time = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" });

function WeatherCard() {
  const { weather, weatherState } = useKuehl();

  if (weatherState === "loading") {
    return (
      <div className="k-card k-weather">
        <span className="k-eyebrow">Wetter in Mülheim</span>
        <p className="k-muted">Aktuelle Werte werden geladen …</p>
      </div>
    );
  }
  if (!weather?.current) {
    return (
      <div className="k-card k-weather">
        <span className="k-eyebrow">Wetter in Mülheim</span>
        <p>Die Wetterdaten sind gerade nicht erreichbar. Bitte versuch es in ein paar Minuten noch einmal.</p>
      </div>
    );
  }

  const c = weather.current;
  const heatAlert = weather.alerts.some((a) => a.isHeat);
  const feel = c.apparentTemperature ?? c.temperature;
  const level = heatLevel(feel, heatAlert);
  const active = SCALE.indexOf(level.key);

  return (
    <div className={`k-card k-weather${active <= 1 ? " is-cool" : ""}`} aria-live="polite">
      <div className="k-row">
        <span className="k-eyebrow">Wetter in Mülheim · jetzt</span>
        <span className="k-small">Stand {time(c.time)}</span>
      </div>
      <div className="k-w-main">
        <div className="k-temp">
          {fmt(c.temperature)}
          <sup>°C</sup>
        </div>
        <div>
          <span className="k-level" style={{ background: `var(--k-l-${level.key})` }}>
            <Icon name="sun" size={14} /> {level.label}
          </span>
          <p className="k-muted" style={{ fontSize: 14, marginTop: 6 }}>
            {c.conditionText}
          </p>
        </div>
      </div>
      <div>
        <div className="k-scale">
          {SCALE.map((k, i) => (
            <span key={k} className={i === active ? "on" : ""} style={{ background: `var(--k-l-${k})` }} />
          ))}
        </div>
        <div className="k-scale-l">
          {SCALE.map((k) => (
            <span key={k}>{SCALE_LABEL[k]}</span>
          ))}
        </div>
      </div>
      <div className="k-stats">
        <div>
          <b>{c.apparentTemperature !== null ? `${fmt(c.apparentTemperature)} °C` : "–"}</b>
          <span>gefühlt</span>
        </div>
        <div>
          <b>{weather.today ? `${fmt(weather.today.max)} °C` : "–"}</b>
          <span>Höchstwert heute</span>
        </div>
        <div>
          <b>
            {weather.today?.uvIndexMax != null
              ? fmt(weather.today.uvIndexMax)
              : c.humidity != null
                ? `${fmt(c.humidity)} %`
                : "–"}
          </b>
          <span>{weather.today?.uvIndexMax != null ? "UV-Index max." : "Luftfeuchte"}</span>
        </div>
      </div>
      <p>{level.advice}</p>
      <p className="k-small">Quelle: {weather.sourceLabel}</p>
    </div>
  );
}

function Alerts() {
  const { weather } = useKuehl();
  if (!weather) return null;
  if (!weather.alertsOk) {
    return (
      <p className="k-small">
        Die amtlichen Warnungen des Deutschen Wetterdienstes sind gerade nicht abrufbar. Aktuelle Warnungen findest du auch
        auf <a href="https://www.dwd.de/DE/wetter/warnungen/warnWetter_node.html" target="_blank" rel="noreferrer">dwd.de</a>.
      </p>
    );
  }
  return (
    <>
      {weather.alerts.map((a, i) => (
        <div key={i} className={`k-alert${a.isHeat ? " is-heat" : ""}`} role="alert">
          <span className="k-eyebrow">Amtliche Warnung des DWD</span>
          <b>{a.headline}</b>
          {a.onset && a.expires && (
            <span className="k-small">
              {time(a.onset)} bis {time(a.expires)}
            </span>
          )}
          {a.description && <p>{a.description}</p>}
          {a.instruction && <p className="k-small">{a.instruction}</p>}
        </div>
      ))}
    </>
  );
}

export default function StartPage() {
  const router = useRouter();
  const { places, placesState, distanceTo, location, weather } = useKuehl();
  const season = useSeason();

  const cool = places
    .filter((p) => p.category === "kuehl" && (p.coolScore ?? 0) >= 3)
    .sort((a, b) => distanceTo(a) - distanceTo(b))
    .slice(0, 3);
  const fountains = places.filter((p) => p.category === "wasser");
  const warmest = [...(weather?.districts ?? [])].sort((a, b) => b.temperature - a.temperature)[0];

  return (
    <section className="k-view">
      <div className="k-hello">
        <h1>Hallo! Bleib cool in Mülheim.</h1>
        <p>Finde kühle Orte, Trinkwasser und Schatten in deiner Nähe.</p>
      </div>

      <Alerts />
      <WeatherCard />

      <Link href="/kuehl/karte" className="k-cta">
        <Icon name="map" size={22} /> Kühle Orte in meiner Nähe
      </Link>

      <div className="k-quick">
        <Link href="/kuehl/entdecken?tab=wasser" className="k-q k-q-water">
          <span className="k-ic" style={{ color: "var(--k-c-wasser)" }}>
            <Icon name="drop" size={22} />
          </span>
          Trinkwasser finden
        </Link>
        <Link href="/kuehl/entdecken?tab=kuehl" className="k-q k-q-cool">
          <span className="k-ic" style={{ color: "var(--k-c-kuehl)" }}>
            <Icon name="tree" size={22} />
          </span>
          Kühle Orte finden
        </Link>
        <Link href="/kuehl/karte?hitze=1" className="k-q k-q-heat">
          <span className="k-ic" style={{ color: "var(--k-l-heiss)" }}>
            <Icon name="sun" size={22} />
          </span>
          Hitze-Radar öffnen
        </Link>
        <Link href="/kuehl/entdecken?tab=bad" className="k-q k-q-water">
          <span className="k-ic" style={{ color: "var(--k-c-bad)" }}>
            <Icon name="wave" size={22} />
          </span>
          Schwimmbäder entdecken
        </Link>
      </div>

      <div className="k-card">
        <h2 style={{ fontSize: 21 }}>Heute in Mülheim</h2>
        <div className="k-list-plain" style={{ marginTop: 6 }}>
          <div>
            <span className="k-dot" style={{ background: "var(--k-c-wasser)" }} />
            <p>
              <b>Trinkwasser:</b> {fountains.length || "Mehrere"} Wasserstellen auf der Karte, darunter 3 öffentliche
              Trinkbrunnen der RWW.{" "}
              {season &&
                (season.inSeason
                  ? "Die Brunnen sind jetzt in Saison."
                  : `Sie haben gerade Winterpause und laufen wieder ab ${formatDate(season.start)}.`)}
            </p>
          </div>
          <div>
            <span className="k-dot" style={{ background: "var(--k-c-kuehl)" }} />
            <p>
              <b>Kühl in deiner Nähe</b> (ab {location.label}):{" "}
              {placesState === "loading"
                ? "wird geladen …"
                : cool.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && ", "}
                      <button type="button" className="k-link-btn" onClick={() => router.push(`/kuehl/karte?ort=${p.id}`)}>
                        {p.name}
                      </button>{" "}
                      ({formatDistance(distanceTo(p))})
                    </span>
                  ))}
            </p>
          </div>
          <div>
            <span className="k-dot" style={{ background: "var(--k-l-heiss)" }} />
            <p>
              <b>Wärmster Stadtteil gerade:</b>{" "}
              {warmest
                ? `${warmest.name} mit ${fmt(warmest.temperature)} °C (Wettermodell).`
                : "Die Werte je Stadtteil sind gerade nicht verfügbar."}{" "}
              Dicht bebaute Gebiete wie die Innenstadt heizen sich an Sommertagen stärker auf als Wald und Ruhrauen.
            </p>
          </div>
        </div>
      </div>

      <div className="k-card" style={{ background: "var(--k-water)" }}>
        <span className="k-eyebrow" style={{ color: "var(--k-water-ink)" }}>
          Unterwegs
        </span>
        <h2 style={{ fontSize: 20, marginTop: 4 }}>Fußweg zum kühlen Ort</h2>
        <p style={{ marginTop: 6 }}>
          Tippe auf der Karte einen Ort an und wähle „Fußweg anzeigen“. Die Route öffnet sich in OpenStreetMap. Eine Route,
          die gezielt Schatten sucht, braucht Baumdaten der Stadt und kommt in einer späteren Version.
        </p>
      </div>
    </section>
  );
}
