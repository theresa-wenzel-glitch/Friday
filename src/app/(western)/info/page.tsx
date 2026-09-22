import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Über das Projekt",
  description:
    "Wozu dieses Hengstverzeichnis da ist, woher die Daten stammen und wie mit Kontaktadressen umgegangen wird.",
};

export default function InfoPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 space-y-10">
      <header>
        <h1 className="text-3xl mb-3">Über das Projekt</h1>
        <p className="muted">
          Ein offenes Verzeichnis für Hengste der Westernpferdezucht - gemacht,
          weil bestehende Kataloge immer nur einen Ausschnitt zeigen.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl">Die Idee</h2>
        <p>
          Wer einen Hengst sucht, klappert heute mehrere Anbieterseiten ab - und
          findet trotzdem längst nicht alle. Viele Hengste stehen bei kleinen
          Betrieben oder Privatleuten und tauchen in keinem Katalog auf. Hier
          soll deshalb ein Verzeichnis entstehen, in das jeder seinen Hengst
          eintragen kann, unabhängig von Station, Verband oder Land.
        </p>
        <p>
          Bewusst <strong>ohne Decktaxen und ohne Verkauf</strong>. Es geht um
          das Pferd: Abstammung, Papiere, Gentests, Erfolge, Nachkommen. Wer
          Interesse hat, schreibt den Besitzer direkt an - alles Weitere klären
          die beiden untereinander. Dieses Verzeichnis vermittelt nicht und
          verdient an keiner Anfrage mit.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Woher die Daten kommen</h2>
        <p>
          Den Anfang machen die grossen Gründer- und Vererberhengste der
          Westernpferdezucht. Diese Einträge sind in eigenen Worten verfasst und
          stützen sich auf allgemein zugängliche Rassegeschichte - es wurden
          keine Texte aus fremden Hengstkatalogen übernommen. Wo die Quellenlage
          unklar war, ist das Feld bewusst leer geblieben statt geraten.
        </p>
        <p>
          Alle Einträge tragen deshalb zunächst den Hinweis{" "}
          <em>„ungeprüft“</em>. Erst wenn die Angaben gegen Zuchtbuchpapiere
          abgeglichen wurden, wird ein Eintrag als geprüft markiert. Wenn dir
          etwas auffällt: Auf jeder Pferdeseite gibt es unten die Möglichkeit,
          eine Korrektur zu melden.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Stammbaum und All Breed Pedigree</h2>
        <p>
          Jede Pferdeseite zeigt eine Abstammung über vier Generationen. Sie
          entsteht automatisch: Trägt jemand einen bisher fehlenden Vorfahren
          ein, verbinden sich die Einträge über den Namen - der Baum wächst also
          mit dem Verzeichnis mit. Vorfahren ohne eigenen Eintrag stehen als
          reiner Name im Raster.
        </p>
        <p>
          Zusätzlich führt zu jedem Pferd ein Direktlink zu{" "}
          <a
            href="https://www.allbreedpedigree.com/"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline"
          >
            allbreedpedigree.com
          </a>
          , wo sich die Abstammung über deutlich mehr Generationen nachschlagen
          lässt. Dort werden keine Daten ausgelesen oder gespiegelt, es ist ein
          normaler Verweis.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Mitmachen</h2>
        <p>
          Jeder kann einen Hengst{" "}
          <Link href="/eintragen" className="underline">
            eintragen
          </Link>
          . Neue Einträge werden vor der Veröffentlichung gesichtet, damit keine
          Werbung und keine offensichtlich falschen Angaben durchrutschen. Auch
          Stuten dürfen eingetragen werden - sie erscheinen nicht als Deckhengste,
          machen aber die Stammbäume vollständiger.
        </p>
      </section>

      <section className="space-y-3" id="datenschutz">
        <h2 className="text-2xl">Datenschutz und Kontaktadressen</h2>
        <p>
          Die hinterlegte E-Mail-Adresse ist der Zweck des Eintrags - ohne sie
          kann niemand nachfragen. Damit sie trotzdem nicht automatisiert
          eingesammelt wird, steht sie nicht im Seitenquelltext: Sie wird erst
          nachgeladen, wenn jemand auf „E-Mail-Adresse anzeigen“ klickt, und die
          Zahl der Abrufe pro Anschluss ist begrenzt.
        </p>
        <p>
          Wer eingetragen ist und wieder gelöscht werden möchte, meldet das über
          die Korrekturfunktion auf der jeweiligen Pferdeseite. Eine E-Mail für
          Rückfragen an den Einsender wird nie veröffentlicht.
        </p>
        <p className="muted text-sm">
          Hinweis für den Betrieb: Vor einer öffentlichen Veröffentlichung
          gehören hier noch ein Impressum und eine vollständige
          Datenschutzerklärung nach DSGVO hinein - inklusive Angaben zum
          Hosting, zur Speicherdauer und zu den Betroffenenrechten.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Haftung</h2>
        <p className="muted">
          Alle Angaben stammen von Einsendern und sind ohne Gewähr. Für
          verbindliche Auskünfte zu Abstammung, Gentests oder Papieren sind die
          Unterlagen des jeweiligen Zuchtverbands massgeblich.
        </p>
      </section>
    </div>
  );
}
