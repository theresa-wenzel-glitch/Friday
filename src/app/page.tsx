import Link from "next/link";
import { prisma } from "@/lib/db";
import { StallionCard } from "@/components/StallionCard";
import { stallionCardSelect } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [total, euCount, usCount, worldCount, featured, newest] = await Promise.all([
    prisma.stallion.count({ where: { published: true } }),
    prisma.stallion.count({ where: { published: true, region: "EU" } }),
    prisma.stallion.count({ where: { published: true, region: "US" } }),
    prisma.stallion.count({ where: { published: true, region: "WORLD" } }),
    prisma.stallion.findMany({
      where: { published: true, source: "SEED" },
      orderBy: { name: "asc" },
      select: stallionCardSelect,
      take: 8,
    }),
    // Nur von Mitgliedern eingetragene Hengste – die Grunddaten stehen schon oben.
    prisma.stallion.findMany({
      where: { published: true, source: "USER" },
      orderBy: { createdAt: "desc" },
      select: stallionCardSelect,
      take: 4,
    }),
  ]);

  return (
    <div className="container page stack">
      <section className="hero">
        <h1>Alle Reining-Hengste an einem Ort</h1>
        <p>
          Europa, USA und nach und nach die ganze Welt: Daten, Fotos, Abstammung
          und – ganz wichtig – der direkte Draht zum Besitzer. Kein Verkaufs­portal,
          sondern ein Nachschlagewerk für Züchterinnen und Züchter.
        </p>

        <div className="row" style={{ marginTop: 22 }}>
          <Link className="btn btn-primary" href="/hengste">
            Hengste durchsuchen
          </Link>
          <Link className="btn" href="/registrieren">
            Eigenen Hengst eintragen
          </Link>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <b>{total}</b>
            <span>Hengste gesamt</span>
          </div>
          <div className="stat">
            <b>{euCount}</b>
            <span>in Europa</span>
          </div>
          <div className="stat">
            <b>{usCount}</b>
            <span>in USA & Kanada</span>
          </div>
          <div className="stat">
            <b>{worldCount}</b>
            <span>übrige Welt</span>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="stack" style={{ gap: 14 }}>
          <div className="section-title">
            <h2 style={{ margin: 0 }}>Bekannte Vererber</h2>
            <Link className="small" href="/hengste">
              Alle ansehen →
            </Link>
          </div>
          <div className="grid">
            {featured.map((stallion) => (
              <StallionCard key={stallion.slug} stallion={stallion} />
            ))}
          </div>
        </section>
      )}

      {newest.length > 0 && (
        <section className="stack" style={{ gap: 14 }}>
          <div className="section-title">
            <h2 style={{ margin: 0 }}>Neu von Mitgliedern</h2>
            <Link className="small" href="/hengste?sort=newest">
              Mehr →
            </Link>
          </div>
          <div className="grid">
            {newest.map((stallion) => (
              <StallionCard key={stallion.slug} stallion={stallion} />
            ))}
          </div>
        </section>
      )}

      <section className="card card-pad">
        <h2>Du hast selbst einen Hengst?</h2>
        <p className="muted" style={{ maxWidth: "65ch" }}>
          Mit einer E-Mail-Adresse anmelden, Hengst eintragen, Fotos und
          Abstammung ergänzen – fertig. Deine Kontaktdaten stehen direkt am
          Hengst, Interessenten schreiben dich also ohne Umweg an.
        </p>
        <div className="row">
          <Link className="btn btn-primary" href="/registrieren">
            Kostenlos anmelden
          </Link>
          <Link className="btn" href="/ueber">
            Wie die Datenbank funktioniert
          </Link>
        </div>
      </section>
    </div>
  );
}
