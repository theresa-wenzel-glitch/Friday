import Link from "next/link";
import { countByStatus, queryHorses } from "@/lib/db";
import { HorseCard } from "@/components/HorseCard";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const total = countByStatus("approved");
  const { horses: newest } = queryHorses({ sort: "newest", limit: 6 });
  const { horses: legends } = queryHorses({ historic: "only", limit: 6 });

  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      {/* Kopfbereich */}
      <section className="py-12 sm:py-16 max-w-3xl">
        <p className="chip mb-4">Offenes Verzeichnis · keine Preise · kein Verkauf</p>
        <h1 className="text-4xl sm:text-5xl leading-tight mb-4">
          Westernhengste an einem Ort.
        </h1>
        <p className="text-lg muted mb-8">
          Ein Verzeichnis für Hengste der Westernpferdezucht - mit Abstammung,
          Papieren, Disziplinen und dem direkten Draht zum Besitzer. Angefangen
          bei den grossen Vererbern der Rassegeschichte, erweitert um jeden
          Hengst, den ihr selbst eintragt: aus Europa, den USA und überall sonst.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/hengste" className="btn btn-primary no-underline">
            Hengste durchsuchen
          </Link>
          <Link href="/eintragen" className="btn btn-secondary no-underline">
            Eigenen Hengst eintragen
          </Link>
        </div>

        <p className="text-sm muted mt-6">
          Aktuell {total} {total === 1 ? "Eintrag" : "Einträge"} im Verzeichnis.
        </p>
      </section>

      {/* Was die Seite ausmacht */}
      <section className="grid gap-4 sm:grid-cols-3 pb-14">
        {[
          {
            title: "Abstammung, die zusammenwächst",
            body: "Jeder Eintrag zeigt einen Stammbaum über vier Generationen. Trägt jemand einen fehlenden Vorfahren nach, verbindet sich der Baum automatisch - und zusätzlich gibt es zu jedem Pferd einen Direktlink zu All Breed Pedigree.",
          },
          {
            title: "Information statt Verkauf",
            body: "Bewusst ohne Decktaxen, Preise und Buchungsfunktion. Hier steht, was ein Pferd ausmacht: Papiere, Gentests, Erfolge, Nachkommen. Wer Interesse hat, schreibt den Besitzer direkt an.",
          },
          {
            title: "Von der Szene gepflegt",
            body: "Jeder kann seinen Hengst eintragen und falsche Angaben melden. Neue Einträge werden vor der Veröffentlichung kurz geprüft, damit die Datenqualität stimmt.",
          },
        ].map((item) => (
          <div key={item.title} className="surface rounded-xl p-5">
            <h2 className="text-lg mb-2">{item.title}</h2>
            <p className="text-sm muted">{item.body}</p>
          </div>
        ))}
      </section>

      {/* Neu eingetragen */}
      {newest.length > 0 && (
        <section className="pb-14">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="text-2xl">Zuletzt eingetragen</h2>
            <Link href="/hengste?sort=newest" className="text-sm underline">
              alle ansehen
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {newest.map((horse) => (
              <HorseCard key={horse.id} horse={horse} />
            ))}
          </div>
        </section>
      )}

      {/* Legenden */}
      {legends.length > 0 && (
        <section className="pb-14">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="text-2xl">Die grossen Vererber</h2>
            <Link href="/hengste?historic=only" className="text-sm underline">
              alle ansehen
            </Link>
          </div>
          <p className="muted text-sm mb-4 max-w-2xl">
            Gründerhengste und prägende Vererber der Westernpferdezucht. Sie
            bilden das Gerüst, an das sich die Abstammungen der heutigen Hengste
            anhängen.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {legends.map((horse) => (
              <HorseCard key={horse.id} horse={horse} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
