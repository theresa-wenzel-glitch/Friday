import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { countryLabel } from "@/lib/countries";
import { formatDate, formatFee } from "@/lib/format";

export const metadata: Metadata = { title: "Mein Bereich" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [stallions, inquiries] = await Promise.all([
    prisma.stallion.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        country: true,
        studFee: true,
        currency: true,
        feeOnRequest: true,
        published: true,
        _count: { select: { photos: true, inquiries: true } },
      },
    }),
    prisma.inquiry.findMany({
      where: { stallion: { ownerId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        fromName: true,
        fromEmail: true,
        message: true,
        createdAt: true,
        stallion: { select: { name: true, slug: true } },
      },
    }),
  ]);

  return (
    <div className="container page stack">
      <div className="section-title">
        <div>
          <h1 style={{ marginBottom: 4 }}>Mein Bereich</h1>
          <p className="muted" style={{ margin: 0 }}>
            Angemeldet als {user.name} ({user.email})
          </p>
        </div>
        <Link className="btn btn-primary" href="/mein-bereich/hengst/neu">
          Hengst eintragen
        </Link>
      </div>

      <section className="stack" style={{ gap: 12 }}>
        <h2 style={{ margin: 0 }}>Meine Hengste</h2>

        {stallions.length === 0 ? (
          <div className="empty">
            <h3>Noch kein Hengst eingetragen</h3>
            <p>
              Trag deinen ersten Hengst ein — mit Daten, Fotos und Abstammung.
            </p>
            <Link className="btn btn-primary" href="/mein-bereich/hengst/neu">
              Jetzt eintragen
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hengst</th>
                  <th>Land</th>
                  <th>Decktaxe</th>
                  <th>Fotos</th>
                  <th>Anfragen</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stallions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                    </td>
                    <td>{countryLabel(s.country)}</td>
                    <td>{formatFee(s.studFee, s.currency, s.feeOnRequest)}</td>
                    <td>{s._count.photos}</td>
                    <td>{s._count.inquiries}</td>
                    <td>
                      {s.published ? (
                        <span className="badge badge-good">Öffentlich</span>
                      ) : (
                        <span className="badge">Entwurf</span>
                      )}
                    </td>
                    <td>
                      <div className="row row-end">
                        <Link className="btn btn-sm" href={`/mein-bereich/hengst/${s.id}`}>
                          Bearbeiten
                        </Link>
                        <Link className="btn btn-sm" href={`/hengste/${s.slug}`}>
                          Ansehen
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <h2 style={{ margin: 0 }}>Anfragen</h2>

        {inquiries.length === 0 ? (
          <div className="panel muted small">
            Noch keine Anfragen. Interessenten können dich über den Hengst-Eintrag
            direkt per E-Mail erreichen oder das Formular nutzen — Nachrichten aus
            dem Formular erscheinen hier.
          </div>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {inquiries.map((i) => (
              <div key={i.id} className="panel">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>
                    {i.fromName} · zu{" "}
                    <Link href={`/hengste/${i.stallion.slug}`}>{i.stallion.name}</Link>
                  </strong>
                  <span className="tiny muted">{formatDate(i.createdAt)}</span>
                </div>
                <p className="small" style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>
                  {i.message}
                </p>
                <a
                  className="btn btn-sm"
                  href={`mailto:${i.fromEmail}?subject=${encodeURIComponent(
                    `Ihre Anfrage zu ${i.stallion.name}`,
                  )}`}
                >
                  Antworten an {i.fromEmail}
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
