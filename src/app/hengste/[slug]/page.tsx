import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PedigreeTree } from "@/components/PedigreeTree";
import { PhotoGallery } from "@/components/PhotoGallery";
import { InquiryForm } from "./InquiryForm";
import { countryLabel, flagEmoji } from "@/lib/countries";
import { allBreedUrlFor, hasPedigree } from "@/lib/pedigree";
import { formatFee, formatHeight } from "@/lib/format";

export const dynamic = "force-dynamic";

async function loadStallion(slug: string) {
  return prisma.stallion.findUnique({
    where: { slug },
    include: {
      photos: {
        select: { id: true, externalUrl: true, mimeType: true, caption: true },
        orderBy: { sortOrder: "asc" },
      },
      owner: { select: { name: true, farm: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stallion = await loadStallion(slug);
  if (!stallion) return { title: "Hengst nicht gefunden" };

  const parts = [
    stallion.yearOfBirth ? String(stallion.yearOfBirth) : null,
    stallion.color,
    stallion.sireName ? `v. ${stallion.sireName}` : null,
  ].filter(Boolean);

  return {
    title: stallion.name,
    description:
      stallion.description?.slice(0, 160) ||
      `${stallion.name} — ${parts.join(", ")}. Reining-Hengst in ${countryLabel(stallion.country)}.`,
  };
}

/** Zeigt eine Zeile nur an, wenn ein Wert vorhanden ist. */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function StallionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stallion = await loadStallion(slug);

  if (!stallion || !stallion.published) notFound();

  const panel = [
    ["HYPP", stallion.panelHypp],
    ["HERDA", stallion.panelHerda],
    ["GBED", stallion.panelGbed],
    ["PSSM1", stallion.panelPssm1],
    ["MH", stallion.panelMh],
    ["IMM (IMA)", stallion.panelIma],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  const contactMail = stallion.contactEmail
    ? `mailto:${stallion.contactEmail}?subject=${encodeURIComponent(
        `Anfrage zu ${stallion.name}`,
      )}&body=${encodeURIComponent(
        `Hallo,\n\nich interessiere mich für ${stallion.name} und hätte ein paar Fragen zur Decksaison.\n\nViele Grüße\n`,
      )}`
    : null;

  return (
    <div className="container page stack">
      <div className="small muted">
        <Link href="/hengste">← Zurück zur Übersicht</Link>
      </div>

      <div className="detail-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>{stallion.name}</h1>
          <p className="muted" style={{ marginBottom: 8 }}>
            {[
              stallion.yearOfBirth ? String(stallion.yearOfBirth) : null,
              stallion.color,
              stallion.breed,
              stallion.discipline,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="badges">
            {stallion.verified && <span className="badge badge-good">Geprüfter Eintrag</span>}
            {stallion.frozenSemen && <span className="badge">Gefrorenes Sperma</span>}
            {stallion.shippedSemen && <span className="badge">Frischsamen-Versand</span>}
            {stallion.liveCover && <span className="badge">Natursprung</span>}
            {stallion.availableInEu && <span className="badge badge-accent">In der EU verfügbar</span>}
            {stallion.availableInUs && <span className="badge badge-accent">In den USA verfügbar</span>}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 650 }}>
            {formatFee(stallion.studFee, stallion.currency, stallion.feeOnRequest)}
          </div>
          <div className="small muted">
            {flagEmoji(stallion.country)}{" "}
            {[stallion.standingAt, stallion.city, countryLabel(stallion.country)]
              .filter(Boolean)
              .join(", ")}
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div className="stack">
          <PhotoGallery photos={stallion.photos} alt={stallion.name} />

          <section>
            <h2>Steckbrief</h2>
            <dl className="facts">
              <Fact label="Name" value={stallion.name} />
              <Fact label="Stallname" value={stallion.barnName} />
              <Fact label="Geburtsjahr" value={stallion.yearOfBirth} />
              <Fact label="Farbe" value={stallion.color} />
              <Fact label="Stockmaß" value={formatHeight(stallion.heightCm)} />
              <Fact label="Rasse" value={stallion.breed} />
              <Fact label="Zuchtverband" value={stallion.registry} />
              <Fact label="Reg.-Nummer" value={stallion.registrationNo} />
              <Fact label="Disziplin" value={stallion.discipline} />
              <Fact label="Erfolge / LTE" value={stallion.earnings} />
              <Fact label="Station" value={stallion.standingAt} />
              <Fact
                label="Standort"
                value={[stallion.city, countryLabel(stallion.country)].filter(Boolean).join(", ")}
              />
            </dl>
          </section>

          {hasPedigree(stallion) && (
            <section>
              <div className="section-title">
                <h2 style={{ margin: 0 }}>Abstammung</h2>
                <a
                  className="small"
                  href={allBreedUrlFor(stallion.name, stallion.allBreedUrl)}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Vollständiger Stammbaum bei All Breed Pedigree →
                </a>
              </div>
              <p className="tiny muted">
                Jeder Vorfahre führt direkt zu allbreedpedigree.com.
              </p>
              <PedigreeTree stallion={stallion} />
            </section>
          )}

          {stallion.description && (
            <section>
              <h2>Über den Hengst</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{stallion.description}</p>
            </section>
          )}

          {stallion.achievements && (
            <section>
              <h2>Erfolge</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{stallion.achievements}</p>
            </section>
          )}

          {stallion.offspring && (
            <section>
              <h2>Nachkommen</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>{stallion.offspring}</p>
            </section>
          )}

          {panel.length > 0 && (
            <section>
              <h2>Gentest (5-/6-Panel)</h2>
              <dl className="facts">
                {panel.map(([label, value]) => (
                  <Fact key={label} label={label} value={value} />
                ))}
              </dl>
            </section>
          )}
        </div>

        <aside className="detail-side stack" style={{ gap: 16 }}>
          <div className="panel">
            <h3 style={{ marginBottom: 10 }}>Besitzer kontaktieren</h3>

            {stallion.contactName && (
              <p className="small" style={{ marginBottom: 4 }}>
                <strong>{stallion.contactName}</strong>
              </p>
            )}
            {stallion.standingAt && (
              <p className="small muted" style={{ marginBottom: 10 }}>
                {stallion.standingAt}
              </p>
            )}

            {contactMail ? (
              <>
                <a className="btn btn-primary" href={contactMail} style={{ width: "100%" }}>
                  E-Mail schreiben
                </a>
                <p className="tiny muted" style={{ marginTop: 8, marginBottom: 0 }}>
                  {stallion.contactEmail}
                </p>
              </>
            ) : (
              <p className="small muted" style={{ marginBottom: 0 }}>
                Für diesen Hengst ist noch keine Kontaktadresse hinterlegt. Wenn
                er dir gehört:{" "}
                <Link href="/registrieren">anmelden und Eintrag übernehmen</Link>.
              </p>
            )}

            {stallion.contactPhone && (
              <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>
                Telefon: {stallion.contactPhone}
              </p>
            )}
            {stallion.website && (
              <p className="small" style={{ marginTop: 6, marginBottom: 0 }}>
                <a href={stallion.website} target="_blank" rel="noreferrer noopener">
                  Website der Station
                </a>
              </p>
            )}
          </div>

          {stallion.contactEmail && (
            <div className="panel">
              <h3 style={{ marginBottom: 4 }}>Anfrage über die Datenbank</h3>
              <p className="tiny muted">
                Deine Nachricht landet im Bereich des Besitzers.
              </p>
              <InquiryForm stallionId={stallion.id} />
            </div>
          )}

          <div className="panel tiny muted">
            {stallion.source === "SEED"
              ? "Referenzeintrag aus der Grunddatenbank. Angaben ohne Gewähr — der Besitzer kann den Eintrag übernehmen und ergänzen."
              : `Eingetragen von ${stallion.owner?.farm || stallion.owner?.name || "einem Mitglied"}. Für die Angaben ist der Einsteller verantwortlich.`}
          </div>
        </aside>
      </div>
    </div>
  );
}
