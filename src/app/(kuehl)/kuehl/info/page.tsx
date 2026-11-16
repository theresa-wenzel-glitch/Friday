import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Über die App" };

export default function InfoPage() {
  return (
    <section className="k-view">
      <h1 className="k-h1">Über die App</h1>
      <div className="k-card" style={{ display: "grid", gap: 10 }}>
        <p>
          <b>Kühl in Mülheim</b> hilft dir, an heißen Tagen schnell Schatten, Trinkwasser und Abkühlung in Mülheim an der
          Ruhr zu finden. Die App ist ein Bürgerprojekt und <b>kein offizielles Angebot der Stadt</b>.
        </p>
        <p>
          Tipp: Über das Teilen-Menü deines Browsers kannst du die App „Zum Startbildschirm hinzufügen“. Dann öffnet sie sich
          wie eine normale App.
        </p>
      </div>

      <h2 style={{ fontSize: 21 }}>Woher die Daten kommen</h2>
      <div className="k-card k-list-plain">
        <div>
          <span className="k-dot" style={{ background: "var(--k-c-wasser)" }} />
          <p>
            <b>Öffentliche Trinkbrunnen:</b> Hitze-Informationen der Stadt Mülheim an der Ruhr (Brunnen der RWW an der
            Realschule Stadtmitte, der Hölterschule und an der Aktienstraße 214, Ostern bis Oktober). Die genaue Lage ist
            noch nicht vor Ort geprüft; solche Punkte sind gestrichelt umrandet.
          </p>
        </div>
        <div>
          <span className="k-dot" style={{ background: "var(--k-c-kuehl)" }} />
          <p>
            <b>Parks, Wälder, Bäder, Bibliotheken, Toiletten, weitere Wasserstellen:</b>{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap-Mitwirkende
            </a>{" "}
            (Lizenz ODbL), abgerufen über die Overpass-API und täglich aktualisiert.
          </p>
        </div>
        <div>
          <span className="k-dot" style={{ background: "var(--k-l-warm)" }} />
          <p>
            <b>Wetter und Temperaturen je Stadtteil:</b>{" "}
            <a href="https://open-meteo.com" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            (Wettermodelle, u. a. des DWD, Lizenz CC BY 4.0). Falls nicht erreichbar: Messwerte und Vorhersage des
            Deutschen Wetterdienstes über{" "}
            <a href="https://brightsky.dev" target="_blank" rel="noreferrer">
              Bright Sky
            </a>
            .
          </p>
        </div>
        <div>
          <span className="k-dot" style={{ background: "var(--k-l-extrem)" }} />
          <p>
            <b>Unwetter- und Hitzewarnungen:</b> Deutscher Wetterdienst (DWD) über Bright Sky, für die Warnregion Stadt
            Mülheim an der Ruhr.
          </p>
        </div>
        <div>
          <span className="k-dot" style={{ background: "var(--k-c-meldung)" }} />
          <p>
            <b>Bürgermeldungen:</b> von Nutzerinnen und Nutzern der App, erst nach Prüfung sichtbar.
          </p>
        </div>
      </div>

      <h2 style={{ fontSize: 21 }}>Was die App nicht kann</h2>
      <div className="k-card">
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
          <li>Sie zeigt keine amtliche Hitzekarte. Die Stadtteil-Temperaturen sind Modellwerte.</li>
          <li>Sie prüft nicht, ob ein Brunnen gerade läuft oder ein Bad geöffnet hat.</li>
          <li>Der „Cool-Score“ ist eine grobe Einschätzung nach Art des Ortes, keine Messung.</li>
          <li>Eine echte Schattenroute braucht Baumdaten der Stadt und ist noch nicht eingebaut.</li>
        </ul>
      </div>

      <h2 style={{ fontSize: 21 }}>Datenschutz</h2>
      <div className="k-card" style={{ display: "grid", gap: 8 }}>
        <p>
          Dein Standort bleibt auf deinem Gerät. Die App fragt ihn nur, wenn du auf „Standort nutzen“ tippst, und schickt ihn
          nicht an unseren Server.
        </p>
        <p>
          Die Kartenbilder lädt dein Browser direkt von OpenStreetMap. Meldungen speichern keine persönlichen Daten. Alles
          Weitere steht in der <Link href="/kuehl/datenschutz">Datenschutzerklärung</Link>.
        </p>
      </div>
      <p className="k-small">
        <Link href="/kuehl/impressum">Impressum</Link> · Moderation:{" "}
        <Link href="/kuehl/moderation">Meldungen prüfen</Link>
      </p>
    </section>
  );
}
