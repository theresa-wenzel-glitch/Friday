import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Über die Datenbank",
  description:
    "Wofür es Reining Stallions gibt, wie Einträge entstehen und wie der Kontakt zum Besitzer funktioniert.",
};

export default function AboutPage() {
  return (
    <div className="container page stack">
      <div style={{ maxWidth: "70ch" }}>
        <h1>Über die Datenbank</h1>

        <p>
          Reining Stallions ist ein Nachschlagewerk, kein Verkaufsportal. Auf
          bestehenden Plattformen steht meist der Verkauf der Decktaxe im
          Vordergrund — hier geht es zuerst um die Übersicht: Welche Hengste gibt
          es überhaupt, wie sind sie gezogen, wo stehen sie, und wen frage ich?
        </p>

        <h2>Was drinsteht</h2>
        <ul>
          <li>
            <strong>Grunddaten:</strong> Name, Jahrgang, Farbe, Stockmaß, Rasse,
            Papiere, Disziplin.
          </li>
          <li>
            <strong>Abstammung über drei Generationen</strong> — jeder Vorfahre
            ist mit{" "}
            <a
              href="https://www.allbreedpedigree.com"
              target="_blank"
              rel="noreferrer noopener"
            >
              allbreedpedigree.com
            </a>{" "}
            verknüpft, wo der vollständige Stammbaum liegt.
          </li>
          <li>
            <strong>Fotos</strong> — hochgeladen oder verlinkt.
          </li>
          <li>
            <strong>Decktaxe und Verfügbarkeit:</strong> Frischsamen, gefrorenes
            Sperma, Natursprung, EU- oder US-Verfügbarkeit.
          </li>
          <li>
            <strong>Gentest-Ergebnisse</strong> (HYPP, HERDA, GBED, PSSM1, MH, IMM).
          </li>
          <li>
            <strong>Kontakt zum Besitzer</strong> — E-Mail, Telefon, Website.
          </li>
        </ul>

        <h2>Woher die Einträge kommen</h2>
        <p>
          Ein Grundstock bekannter Vererber ist bereits hinterlegt, damit die
          Datenbank vom ersten Tag an brauchbar ist. Diese Referenzeinträge sind
          als solche gekennzeichnet; sie enthalten bewusst keine fremden
          Kontaktdaten. Wem ein solcher Hengst gehört, kann den Eintrag
          übernehmen und ergänzen.
        </p>
        <p>
          Alle weiteren Hengste tragen die Besitzerinnen und Besitzer selbst ein.
          Dafür reicht eine{" "}
          <Link href="/registrieren">Anmeldung mit E-Mail-Adresse</Link>. Für die
          Richtigkeit der Angaben ist der jeweilige Einsteller verantwortlich.
        </p>

        <h2>Kontakt zum Besitzer</h2>
        <p>
          Bei jedem Hengst steht eine Kontakt-E-Mail. Interessenten können direkt
          schreiben oder das Anfrageformular nutzen — Anfragen aus dem Formular
          erscheinen im Bereich des Besitzers.
        </p>

        <h2>Reichweite</h2>
        <p>
          Start sind Europa und die USA/Kanada. Hengste aus dem Rest der Welt
          können ebenfalls eingetragen werden und lassen sich über den Filter
          „Übrige Welt“ finden.
        </p>

        <div className="row" style={{ marginTop: 24 }}>
          <Link className="btn btn-primary" href="/hengste">
            Hengste ansehen
          </Link>
          <Link className="btn" href="/registrieren">
            Hengst eintragen
          </Link>
        </div>
      </div>
    </div>
  );
}
