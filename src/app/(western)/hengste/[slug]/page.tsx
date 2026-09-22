import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHorseById, getHorseBySlug, getOffspring, hasContact } from "@/lib/db";
import { buildPedigree, pedigreeCompleteness } from "@/lib/pedigree";
import { PedigreeChart } from "@/components/PedigreeChart";
import { ContactReveal } from "@/components/ContactReveal";
import { CorrectionForm } from "@/components/CorrectionForm";
import { allbreedUrlFor } from "@/lib/allbreed";
import {
  AVAILABILITY_LABEL,
  SEX_LABEL,
  countryLabel,
  summaryLine,
} from "@/lib/labels";
import { GENETIC_TESTS } from "@/lib/types";

export const dynamic = "force-dynamic";

const GENERATIONS = 4;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const horse = getHorseBySlug(slug);
  if (!horse || horse.status !== "approved") return { title: "Nicht gefunden" };

  const sire = horse.sireName ? ` ${horse.sireName} x ${horse.damName ?? "?"}.` : "";
  return {
    title: horse.name,
    description: `${horse.name} - ${summaryLine(horse)}.${sire}`.slice(0, 300),
  };
}

export default async function HorsePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const horse = getHorseBySlug(slug);

  if (!horse || horse.status !== "approved") notFound();

  const pedigree = buildPedigree(horse, GENERATIONS);
  const { filled, total } = pedigreeCompleteness(pedigree, GENERATIONS);
  const offspring = getOffspring(horse.id);
  const geneticEntries = GENETIC_TESTS.filter((t) => horse.genetics[t]);

  const facts: [string, string | null][] = [
    ["Geschlecht", SEX_LABEL[horse.sex]],
    ["Rasse", horse.breed],
    ["Papiernummer", horse.registryNo],
    [
      "Jahrgang",
      horse.yearOfBirth
        ? horse.yearOfDeath
          ? `${horse.yearOfBirth} – ${horse.yearOfDeath}`
          : String(horse.yearOfBirth)
        : null,
    ],
    ["Farbe", horse.color],
    ["Stockmaß", horse.heightCm ? `${horse.heightCm} cm` : null],
    ["Land", countryLabel(horse.country)],
    ["Station", horse.studName],
    ["Ort", horse.location],
    [
      "Verfügbarkeit",
      horse.availability === "unknown"
        ? null
        : AVAILABILITY_LABEL[horse.availability],
    ],
  ];

  const visibleFacts = facts.filter(([, value]) => value);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <Link href="/hengste" className="text-sm underline muted no-underline">
        ← zurück zur Übersicht
      </Link>

      {/* Kopf */}
      <header className="mt-4 mb-8">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-4xl">{horse.name}</h1>
          {horse.isHistoric && <span className="chip mt-3">historisch</span>}
          {horse.isVerified ? (
            <span className="chip mt-3" title="Angaben wurden gegen Papiere geprüft">
              geprüft
            </span>
          ) : (
            <span className="chip mt-3" title="Angaben wurden noch nicht gegengeprüft">
              ungeprüft
            </span>
          )}
        </div>
        {horse.aka && <p className="text-lg muted mt-1">genannt „{horse.aka}“</p>}
        <p className="muted mt-2">{summaryLine(horse)}</p>

        {(horse.sireName || horse.damName) && (
          <p
            className="mt-3 text-xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <ParentLink id={horse.sireId} name={horse.sireName} />
            <span className="muted"> x </span>
            <ParentLink id={horse.damId} name={horse.damName} />
          </p>
        )}
      </header>

      {!horse.isVerified && (
        <p
          className="rounded-lg px-4 py-3 mb-8 text-sm"
          style={{
            backgroundColor: "var(--surface-muted)",
            border: "1px solid var(--line)",
          }}
        >
          <strong>Angaben noch nicht geprüft.</strong> Sie stammen aus
          Einsendungen bzw. allgemein zugänglicher Literatur und wurden nicht
          gegen Zuchtbuchpapiere abgeglichen. Für verbindliche Auskünfte bitte
          die Papiere bzw. den Zuchtverband heranziehen.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] items-start">
        <div className="min-w-0 space-y-10">
          {/* Foto */}
          {horse.photoUrl && (
            <figure>
              {/* Bewusst ein einfaches img-Element: die Bilder liegen auf fremden
                  Servern und sollen nicht über diesen Server geleitet werden. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={horse.photoUrl}
                alt={horse.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full rounded-xl"
                style={{ border: "1px solid var(--line)" }}
              />
              {horse.photoCredit && (
                <figcaption className="text-xs muted mt-2">
                  Foto: {horse.photoCredit}
                </figcaption>
              )}
            </figure>
          )}

          {horse.description && (
            <section>
              <h2 className="text-2xl mb-3">Zum Pferd</h2>
              <Paragraphs text={horse.description} />
            </section>
          )}

          {/* Stammbaum */}
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
              <h2 className="text-2xl">Abstammung</h2>
              <a
                href={allbreedUrlFor(horse)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-sm underline"
              >
                bei All Breed Pedigree ansehen ↗
              </a>
            </div>
            <p className="text-sm muted mb-4">
              {filled} von {total} Ahnenplätzen über {GENERATIONS} Generationen
              erfasst. Angeklickt werden können alle Vorfahren, die selbst einen
              Eintrag haben.
            </p>

            {filled === 0 ? (
              <div className="surface rounded-xl p-6 text-sm muted">
                Zu diesem Pferd ist noch keine Abstammung hinterlegt.
              </div>
            ) : (
              <PedigreeChart root={pedigree} generations={GENERATIONS} />
            )}

            {horse.bloodlineNote && (
              <p className="text-sm muted mt-4">{horse.bloodlineNote}</p>
            )}
          </section>

          {horse.showRecord && (
            <section>
              <h2 className="text-2xl mb-3">Turniererfolge</h2>
              <Paragraphs text={horse.showRecord} />
            </section>
          )}

          {horse.offspring && (
            <section>
              <h2 className="text-2xl mb-3">Nachkommen</h2>
              <Paragraphs text={horse.offspring} />
            </section>
          )}

          {/* Im Verzeichnis erfasste Nachkommen */}
          {offspring.length > 0 && (
            <section>
              <h2 className="text-2xl mb-1">Nachkommen im Verzeichnis</h2>
              <p className="text-sm muted mb-4">
                {offspring.length}{" "}
                {offspring.length === 1 ? "Eintrag verweist" : "Einträge verweisen"}{" "}
                auf {horse.name} als Elternteil.
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {offspring.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/hengste/${child.slug}`}
                      className="surface rounded-lg px-3 py-2 flex items-baseline justify-between gap-2 no-underline hover:shadow-sm"
                    >
                      <span className="font-medium">{child.name}</span>
                      <span className="text-xs muted shrink-0">
                        {child.yearOfBirth ?? ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {horse.videoUrl && (
            <section>
              <h2 className="text-2xl mb-3">Video</h2>
              <a
                href={horse.videoUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline break-all"
              >
                {horse.videoUrl}
              </a>
            </section>
          )}

          <section style={{ borderTop: "1px solid var(--line)" }} className="pt-6">
            <CorrectionForm slug={horse.slug} />
          </section>
        </div>

        {/* Seitenspalte */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          {visibleFacts.length > 0 && (
            <div className="surface rounded-xl p-5">
              <h2 className="text-lg mb-3">Steckbrief</h2>
              <dl className="text-sm space-y-2">
                {visibleFacts.map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <dt className="muted min-w-28 shrink-0">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {horse.disciplines.length > 0 && (
            <div className="surface rounded-xl p-5">
              <h2 className="text-lg mb-3">Disziplinen</h2>
              <div className="flex flex-wrap gap-1.5">
                {horse.disciplines.map((d) => (
                  <Link
                    key={d}
                    href={`/hengste?discipline=${encodeURIComponent(d)}`}
                    className="chip no-underline"
                  >
                    {d}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {geneticEntries.length > 0 && (
            <div className="surface rounded-xl p-5">
              <h2 className="text-lg mb-3">Gentests</h2>
              <dl className="text-sm space-y-2">
                {geneticEntries.map((test) => (
                  <div key={test} className="flex gap-3">
                    <dt className="muted min-w-28 shrink-0">{test}</dt>
                    <dd className="font-medium">{horse.genetics[test]}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs muted mt-3">
                Angaben des Einsenders, ohne Vorlage der Laborbefunde.
              </p>
            </div>
          )}

          {hasContact(horse) ? (
            <ContactReveal
              slug={horse.slug}
              horseName={horse.name}
              ownerName={horse.ownerName}
              phone={horse.contactPhone}
              websiteUrl={horse.websiteUrl}
            />
          ) : (
            <div className="surface rounded-xl p-5">
              <h2 className="text-lg mb-2">Kontakt</h2>
              <p className="text-sm muted">
                {horse.isHistoric
                  ? "Historischer Eintrag - es gibt keinen Ansprechpartner."
                  : "Zu diesem Pferd ist keine Kontaktadresse hinterlegt."}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Vater bzw. Mutter - verlinkt, sofern der Vorfahr selbst einen Eintrag hat. */
function ParentLink({ id, name }: { id: number | null; name: string | null }) {
  const label = name ?? "unbekannt";
  const parent = id !== null ? getHorseById(id) : null;

  if (!parent) return <>{label}</>;

  return (
    <Link href={`/hengste/${parent.slug}`} className="underline">
      {label}
    </Link>
  );
}

/** Absätze aus Freitext - Zeilenumbrüche des Einsenders bleiben erhalten. */
function Paragraphs({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className="space-y-3 max-w-2xl">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p.trim()}
        </p>
      ))}
    </div>
  );
}
