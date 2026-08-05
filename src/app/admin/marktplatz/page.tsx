import Link from "next/link";
import type { Metadata } from "next";
import { isAdminConfigured, isLoggedIn } from "@/lib/auth";
import { AdminLogin } from "@/components/AdminLogin";
import {
  countAuctionsByStatus,
  countListingsByStatus,
  getHighestBid,
  queryAuctions,
  queryListings,
} from "@/lib/marketplace-db";
import { formatPrice } from "@/lib/marketplace-types";
import { SEX_LABEL } from "@/lib/labels";
import {
  approveAuctionAction,
  approveListingAction,
  archiveListingAction,
  rejectAuctionAction,
  rejectListingAction,
  setAuctionFeeStatusAction,
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

  const { auctions: pendingAuctions } = queryAuctions({ moderationStatus: "pending", limit: 100 });
  const { auctions: approvedAuctions } = queryAuctions({ moderationStatus: "approved", limit: 100 });

  const auctionStats = {
    approved: countAuctionsByStatus("approved"),
    pending: countAuctionsByStatus("pending"),
    rejected: countAuctionsByStatus("rejected"),
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

      <hr className="my-12" style={{ borderColor: "var(--line)" }} />

      <h2 className="text-3xl mb-2">Auktionen</h2>
      <p className="muted text-sm mb-8">
        Die Auktionsgebühr wird derzeit nicht automatisch kassiert - den
        Zahlstatus hier nach Zahlungseingang (z. B. per Überweisung) manuell
        setzen.
      </p>

      <div className="grid gap-3 sm:grid-cols-3 mb-10">
        <Stat label="Online" value={auctionStats.approved} />
        <Stat label="Wartet auf Prüfung" value={auctionStats.pending} />
        <Stat label="Abgelehnt" value={auctionStats.rejected} />
      </div>

      <section className="mb-12">
        <h3 className="text-2xl mb-4">Neue Auktionen</h3>

        {pendingAuctions.length === 0 ? (
          <p className="muted text-sm">Nichts zu prüfen.</p>
        ) : (
          <ul className="space-y-4">
            {pendingAuctions.map((auction) => (
              <li key={auction.id} className="surface rounded-xl p-5">
                <h4 className="text-xl mb-1">{auction.title}</h4>
                <p className="text-sm muted mb-3">
                  {new Date(auction.startAt).toLocaleString("de-DE")} –{" "}
                  {new Date(auction.endAt).toLocaleString("de-DE")} · Start{" "}
                  {(auction.startingPriceCents / 100).toLocaleString("de-DE")} €
                </p>
                {auction.description && (
                  <p className="text-sm whitespace-pre-line mb-3">{auction.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <form action={approveAuctionAction}>
                    <input type="hidden" name="id" value={auction.id} />
                    <button type="submit" className="btn btn-primary">
                      Freigeben
                    </button>
                  </form>
                  <form action={rejectAuctionAction}>
                    <input type="hidden" name="id" value={auction.id} />
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
        <h3 className="text-2xl mb-4">Veröffentlichte Auktionen</h3>

        {approvedAuctions.length === 0 ? (
          <p className="muted text-sm">Noch keine Auktion online.</p>
        ) : (
          <ul className="space-y-3">
            {approvedAuctions.map((auction) => {
              const highest = getHighestBid(auction.id);
              return (
                <li
                  key={auction.id}
                  className="surface rounded-xl p-4 flex flex-wrap items-center gap-3"
                >
                  <Link
                    href={`/marktplatz/auktionen/${auction.slug}`}
                    className="font-medium underline min-w-40"
                  >
                    {auction.title}
                  </Link>
                  <span className="text-xs muted flex-1 min-w-32">
                    {highest
                      ? `Höchstgebot ${(highest.amountCents / 100).toLocaleString("de-DE")} €`
                      : "noch kein Gebot"}
                  </span>
                  <span className="chip">Gebühr: {auction.feeStatus}</span>
                  <form action={setAuctionFeeStatusAction} className="flex gap-2">
                    <input type="hidden" name="id" value={auction.id} />
                    <select name="feeStatus" defaultValue={auction.feeStatus} className="field">
                      <option value="unpaid">unbezahlt</option>
                      <option value="invoiced">Rechnung gestellt</option>
                      <option value="paid">bezahlt</option>
                      <option value="waived">erlassen</option>
                    </select>
                    <button type="submit" className="btn btn-secondary">
                      Speichern
                    </button>
                  </form>
                </li>
              );
            })}
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
