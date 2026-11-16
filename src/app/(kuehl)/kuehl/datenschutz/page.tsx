import type { Metadata } from "next";
import { getOperator } from "@/lib/kuehl/operator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Datenschutz" };

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="k-card" style={{ display: "grid", gap: 8 }}>
      <h2 style={{ fontSize: 18 }}>{title}</h2>
      {children}
    </div>
  );
}

export default function DatenschutzPage() {
  const o = getOperator();
  return (
    <section className="k-view">
      <h1 className="k-h1">Datenschutz</h1>
      <p className="k-muted">
        Kurz gesagt: Die App braucht keine Anmeldung, setzt für normale Nutzer keine Cookies und speichert keine Namen oder
        Kontaktdaten. Hier steht im Einzelnen, welche Daten wo anfallen.
      </p>

      <Block title="Verantwortlich">
        <p>
          {o.name ?? "Noch nicht eingetragen"}
          {o.address.map((l) => (
            <span key={l}>
              <br />
              {l}
            </span>
          ))}
          {o.email && (
            <>
              <br />
              E-Mail: {o.email}
            </>
          )}
        </p>
      </Block>

      <Block title="Aufruf der App und Server">
        <p>
          Die App läuft bei Render Services, Inc. (USA) in einem Rechenzentrum in Frankfurt am Main. Beim Aufruf verarbeitet
          der Server technisch nötige Daten wie IP-Adresse, Zeitpunkt und aufgerufene Seite, um die App auszuliefern und vor
          Missbrauch zu schützen. Rechtsgrundlage ist unser berechtigtes Interesse am sicheren Betrieb (Art. 6 Abs. 1 lit. f
          DSGVO). Weil der Anbieter ein US-Unternehmen ist, kann eine Übermittlung in die USA nicht ausgeschlossen werden.
        </p>
      </Block>

      <Block title="Kartenbilder von OpenStreetMap">
        <p>
          Die Kartenbilder lädt dein Browser direkt von der OpenStreetMap Foundation (Vereinigtes Königreich). Dabei wird deine
          IP-Adresse an OpenStreetMap übermittelt, wie bei jedem Aufruf einer Webseite. Mehr dazu in der{" "}
          <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer">
            Datenschutzerklärung der OSM Foundation
          </a>
          .
        </p>
      </Block>

      <Block title="Dein Standort">
        <p>
          Die App fragt deinen Standort nur ab, wenn du auf „Standort nutzen“ tippst, und nur mit deiner Erlaubnis. Er wird
          ausschließlich auf deinem Gerät verwendet, um Entfernungen zu berechnen, und nicht an unseren Server geschickt. Der
          zuletzt gewählte Standort wird im Speicher deines Browsers (localStorage) abgelegt. Du kannst ihn jederzeit über die
          Browser-Einstellungen löschen.
        </p>
      </Block>

      <Block title="Wetter und Orte">
        <p>
          Wetterdaten (Open-Meteo, Deutscher Wetterdienst über Bright Sky) und Ortsdaten (OpenStreetMap) ruft unser Server
          ab. Dabei werden keine Daten über dich weitergegeben.
        </p>
      </Block>

      <Block title="Meldungen">
        <p>
          Bei einer Meldung speichern wir nur Kategorie, Position und deine Beschreibung. Bitte schreib keine Namen oder
          Kontaktdaten hinein. Zum Schutz vor massenhaften Meldungen merkt sich der Server deine IP-Adresse höchstens eine
          Stunde lang im Arbeitsspeicher; sie wird nicht dauerhaft gespeichert. Abgelehnte Meldungen können gelöscht werden.
        </p>
      </Block>

      <Block title="Cookies">
        <p>
          Für normale Nutzerinnen und Nutzer setzt die App keine Cookies. Nur wer sich als Moderator anmeldet, erhält ein
          technisch notwendiges Anmelde-Cookie.
        </p>
      </Block>

      <Block title="Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung sowie auf Widerspruch
          (Art. 15 bis 21 DSGVO). Wende dich dafür an die oben genannte Adresse. Außerdem kannst du dich bei einer
          Datenschutz-Aufsichtsbehörde beschweren, in Nordrhein-Westfalen bei der Landesbeauftragten für Datenschutz und
          Informationsfreiheit NRW.
        </p>
      </Block>
    </section>
  );
}
