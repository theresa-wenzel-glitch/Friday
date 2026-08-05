import Link from "next/link";
import type { Metadata } from "next";
import { isAdminConfigured, isLoggedIn } from "@/lib/auth";
import { AdminLogin } from "@/components/AdminLogin";
import {
  countByStatus,
  listCorrections,
  queryHorses,
} from "@/lib/db";
import {
  approveAction,
  deleteAction,
  handleCorrectionAction,
  logoutAction,
  rejectAction,
  verifyAction,
} from "./actions";
import { pedigreeLine, summaryLine } from "@/lib/labels";
import type { Horse } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isLoggedIn())) {
    return <AdminLogin configured={isAdminConfigured()} />;
  }

  const { horses: pending } = queryHorses({ status: "pending", limit: 100, sort: "newest" });
  const { horses: unverified } = queryHorses({
    status: "approved",
    limit: 100,
    sort: "newest",
  });
  const corrections = listCorrections(false);

  const stats = {
    approved: countByStatus("approved"),
    pending: countByStatus("pending"),
    rejected: countByStatus("rejected"),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
        <h1 className="text-3xl">Moderation</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/abstammung" className="btn btn-secondary no-underline">
            Abstammungen eintragen
          </Link>
          <Link href="/admin/marktplatz" className="btn btn-secondary no-underline">
            Marktplatz-Moderation
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-secondary">
              Abmelden
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 mb-10">
        <Stat label="Veröffentlicht" value={stats.approved} />
        <Stat label="Wartet auf Prüfung" value={stats.pending} />
        <Stat label="Abgelehnt" value={stats.rejected} />
        <Stat label="Offene Meldungen" value={corrections.length} />
      </div>

      {/* Neue Einsendungen */}
      <section className="mb-12">
        <h2 className="text-2xl mb-4">Neue Einsendungen</h2>

        {pending.length === 0 ? (
          <p className="muted text-sm">Nichts zu prüfen.</p>
        ) : (
          <ul className="space-y-4">
            {pending.map((horse) => (
              <li key={horse.id} className="surface rounded-xl p-5">
                <SubmissionDetails horse={horse} />

                <div className="flex flex-wrap gap-2 mt-4">
                  <form action={approveAction}>
                    <input type="hidden" name="id" value={horse.id} />
                    <button type="submit" className="btn btn-primary">
                      Freigeben
                    </button>
                  </form>
                  <form action={rejectAction}>
                    <input type="hidden" name="id" value={horse.id} />
                    <button type="submit" className="btn btn-secondary">
                      Ablehnen
                    </button>
                  </form>
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={horse.id} />
                    <button type="submit" className="btn btn-secondary">
                      Endgültig löschen
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Korrekturmeldungen */}
      <section className="mb-12">
        <h2 className="text-2xl mb-4">Korrekturmeldungen</h2>

        {corrections.length === 0 ? (
          <p className="muted text-sm">Keine offenen Meldungen.</p>
        ) : (
          <ul className="space-y-3">
            {corrections.map((c) => (
              <li key={c.id} className="surface rounded-xl p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
                  <Link href={`/hengste/${c.horseSlug}`} className="font-semibold underline">
                    {c.horseName}
                  </Link>
                  <span className="text-xs muted">
                    {new Date(c.createdAt).toLocaleString("de-DE")}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-line mb-3">{c.message}</p>
                {c.reporterEmail && (
                  <p className="text-xs muted mb-3">
                    Rückmeldung an: {c.reporterEmail}
                  </p>
                )}
                <form action={handleCorrectionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="btn btn-secondary">
                    Als erledigt markieren
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Prüfstatus der veröffentlichten Einträge */}
      <section>
        <h2 className="text-2xl mb-1">Veröffentlichte Einträge</h2>
        <p className="muted text-sm mb-4 max-w-2xl">
          Ein Eintrag gilt als geprüft, sobald die Angaben gegen Zuchtbuchpapiere
          bzw. eine belastbare Quelle abgeglichen wurden. Bis dahin sieht der
          Besucher den Hinweis „ungeprüft“.
        </p>

        <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
          {unverified.map((horse) => (
            <li
              key={horse.id}
              className="py-3 flex flex-wrap items-center gap-3"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <Link
                href={`/hengste/${horse.slug}`}
                className="font-medium underline min-w-40"
              >
                {horse.name}
              </Link>
              <span className="text-xs muted flex-1 min-w-40">
                {summaryLine(horse)}
              </span>
              <span className="chip">{horse.isVerified ? "geprüft" : "ungeprüft"}</span>
              <form action={verifyAction}>
                <input type="hidden" name="id" value={horse.id} />
                <input type="hidden" name="verified" value={horse.isVerified ? "0" : "1"} />
                <button type="submit" className="btn btn-secondary">
                  {horse.isVerified ? "auf ungeprüft setzen" : "als geprüft markieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface rounded-xl p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs muted">{label}</p>
    </div>
  );
}

function SubmissionDetails({ horse }: { horse: Horse }) {
  const rows: [string, string | null][] = [
    ["Abstammung", pedigreeLine(horse)],
    ["Papiernummer", horse.registryNo],
    ["Station", horse.studName],
    ["Ort", [horse.location, horse.country].filter(Boolean).join(", ") || null],
    ["Disziplinen", horse.disciplines.join(", ") || null],
    ["Besitzer", horse.ownerName],
    ["Kontakt", horse.contactEmail],
    ["Telefon", horse.contactPhone],
    ["Einsender", horse.submitterEmail],
    ["Website", horse.websiteUrl],
    ["Bild", horse.photoUrl],
  ];

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3 mb-1">
        <h3 className="text-xl">{horse.name}</h3>
        <span className="text-sm muted">{summaryLine(horse)}</span>
      </div>

      {horse.adminNote && (
        <p
          className="rounded-md px-3 py-2 text-sm my-3"
          style={{ backgroundColor: "#fff6e0", color: "#7a5300" }}
        >
          ⚠ {horse.adminNote}
        </p>
      )}

      <dl className="text-sm grid gap-1 sm:grid-cols-2 mt-3">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="muted min-w-28 shrink-0">{label}</dt>
              <dd className="break-all">{value}</dd>
            </div>
          ))}
      </dl>

      {horse.description && (
        <p className="text-sm mt-3 whitespace-pre-line">{horse.description}</p>
      )}
    </>
  );
}
