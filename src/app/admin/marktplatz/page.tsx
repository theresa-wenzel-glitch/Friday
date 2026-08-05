import Link from "next/link";
import type { Metadata } from "next";
import { isAdminConfigured, isLoggedIn } from "@/lib/auth";
import { AdminLogin } from "@/components/AdminLogin";
import { countListingsByStatus, queryListings } from "@/lib/marketplace-db";
import { formatPrice } from "@/lib/marketplace-types";
import { SEX_LABEL } from "@/lib/labels";
import {
  approveListingAction,
  archiveListingAction,
  rejectListingAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marktplatz-Moderation",
  robots: { index: false, follow: false },
};

export default async function MarketAdminPage() {
  if (!(await isLoggedIn())) {
    return <AdminLogin configured={isAdminConfigured()} />;
  }

  const { listings: pending } = queryListings({ status: "pending", limit: 100, sort: "newest" });
  const { listings: approved } = queryListings({ status: "approved", limit: 100, sort: "newest" });

  const stats = {
    approved: countListingsByStatus("approved"),
    pending: countListingsByStatus("pending"),
    rejected: countListingsByStatus("rejected"),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
        <h1 className="text-3xl">Marktplatz-Moderation</h1>
        <Link href="/admin" className="btn btn-secondary no-underline">
          Zurück zur Moderation
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-10">
        <Stat label="Online" value={stats.approved} />
        <Stat label="Wartet auf Prüfung" value={stats.pending} />
        <Stat label="Abgelehnt" value={stats.rejected} />
      </div>

      <section className="mb-12">
        <h2 className="text-2xl mb-4">Neue Inserate</h2>

        {pending.length === 0 ? (
          <p className="muted text-sm">Nichts zu prüfen.</p>
        ) : (
          <ul className="space-y-4">
            {pending.map((listing) => (
              <li key={listing.id} className="surface rounded-xl p-5">
                <div className="flex flex-wrap items-baseline gap-3 mb-1">
                  <h3 className="text-xl">{listing.name}</h3>
                  <span className="chip">{listing.kind === "stud" ? "Deckhengst" : "Verkaufspferd"}</span>
                  <span className="text-sm muted">
                    {[SEX_LABEL[listing.sex], listing.yearOfBirth, listing.color, listing.breed]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <p className="text-sm muted mb-2">
                  {listing.kind === "stud" ? "Decktaxe " : "Preis "}
                  {formatPrice(listing.priceCents, listing.priceCurrency)}
                  {listing.contactEmail && ` · Kontakt: ${listing.contactEmail}`}
                </p>
                {listing.description && (
                  <p className="text-sm whitespace-pre-line mb-3">{listing.description}</p>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                  <form action={approveListingAction}>
                    <input type="hidden" name="id" value={listing.id} />
                    <button type="submit" className="btn btn-primary">
                      Freigeben
                    </button>
                  </form>
                  <form action={rejectListingAction}>
                    <input type="hidden" name="id" value={listing.id} />
                    <button type="submit" className="btn btn-secondary">
                      Ablehnen
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl mb-4">Veröffentlichte Inserate</h2>

        {approved.length === 0 ? (
          <p className="muted text-sm">Noch keine Inserate online.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {approved.map((listing) => (
              <li
                key={listing.id}
                className="py-3 flex flex-wrap items-center gap-3"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <Link
                  href={`/marktplatz/pferde/${listing.slug}`}
                  className="font-medium underline min-w-40"
                >
                  {listing.name}
                </Link>
                <span className="text-xs muted flex-1 min-w-40">
                  {formatPrice(listing.priceCents, listing.priceCurrency)}
                </span>
                <form action={archiveListingAction}>
                  <input type="hidden" name="id" value={listing.id} />
                  <button type="submit" className="btn btn-secondary">
                    Archivieren
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
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
