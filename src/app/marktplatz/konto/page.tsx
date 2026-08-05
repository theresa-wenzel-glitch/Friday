import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/accounts";
import {
  getHighestBid,
  listAuctionsForAccount,
  listInquiriesForAccount,
  listListingsForAccount,
} from "@/lib/marketplace-db";
import { auctionPhase, formatPrice } from "@/lib/marketplace-types";
import { accountLogoutAction, cancelAuctionAction, markInquiryHandledAction } from "./actions";

const AUCTION_MODERATION_LABEL: Record<string, string> = {
  pending: "wartet auf Prüfung",
  approved: "online",
  rejected: "abgelehnt",
};

const AUCTION_PHASE_LABEL: Record<string, string> = {
  upcoming: "beginnt in Kürze",
  live: "läuft",
  ended: "beendet",
};

const FEE_STATUS_LABEL: Record<string, string> = {
  unpaid: "Gebühr unbezahlt",
  invoiced: "Rechnung gestellt",
  paid: "Gebühr bezahlt",
  waived: "Gebühr erlassen",
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mein Konto - Marktplatz",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  pending: "wartet auf Prüfung",
  approved: "online",
  rejected: "abgelehnt",
  archived: "archiviert",
};

export default async function AccountDashboardPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/marktplatz/konto/anmelden");

  const listings = listListingsForAccount(account.id);
  const inquiries = listInquiriesForAccount(account.id);
  const openInquiries = inquiries.filter((i) => !i.handled);
  const auctions = listAuctionsForAccount(account.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl">{account.displayName}</h1>
          <p className="muted text-sm">{account.email}</p>
        </div>
        <form action={accountLogoutAction}>
          <button type="submit" className="btn btn-secondary">
            Abmelden
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        <Link href="/marktplatz/inserieren" className="btn btn-primary no-underline">
          Neues Inserat
        </Link>
        <Link href="/marktplatz/auktionen/erstellen" className="btn btn-secondary no-underline">
          Neue Auktion
        </Link>
        <Link href="/marktplatz" className="btn btn-secondary no-underline">
          Zum Marktplatz
        </Link>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl mb-4">Meine Inserate</h2>
        {listings.length === 0 ? (
          <p className="muted text-sm">Noch kein Inserat eingestellt.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {listings.map((listing) => (
              <li
                key={listing.id}
                className="py-3 flex flex-wrap items-center gap-3"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                {listing.status === "approved" ? (
                  <Link
                    href={`/marktplatz/pferde/${listing.slug}`}
                    className="font-medium underline min-w-40"
                  >
                    {listing.name}
                  </Link>
                ) : (
                  <span className="font-medium min-w-40">{listing.name}</span>
                )}
                <span className="text-xs muted flex-1 min-w-32">
                  {formatPrice(listing.priceCents, listing.priceCurrency)}
                </span>
                <span className="chip">{STATUS_LABEL[listing.status] ?? listing.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-2xl mb-4">Meine Auktionen</h2>
        {auctions.length === 0 ? (
          <p className="muted text-sm">Noch keine Auktion angelegt.</p>
        ) : (
          <ul className="space-y-3">
            {auctions.map((auction) => {
              const phase = auctionPhase(auction);
              const canCancel =
                !auction.cancelledAt && phase === "upcoming" && auction.moderationStatus !== "rejected";

              return (
                <li key={auction.id} className="surface rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    {auction.moderationStatus === "approved" ? (
                      <Link href={`/marktplatz/auktionen/${auction.slug}`} className="font-medium underline">
                        {auction.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{auction.title}</span>
                    )}
                    <span className="chip">
                      {auction.cancelledAt
                        ? "abgesagt"
                        : AUCTION_MODERATION_LABEL[auction.moderationStatus] ?? auction.moderationStatus}
                    </span>
                    {auction.moderationStatus === "approved" && !auction.cancelledAt && (
                      <span className="chip">{AUCTION_PHASE_LABEL[phase]}</span>
                    )}
                    <span className="chip">{FEE_STATUS_LABEL[auction.feeStatus]}</span>
                  </div>
                  {canCancel && (
                    <form action={cancelAuctionAction}>
                      <input type="hidden" name="auctionId" value={auction.id} />
                      <button type="submit" className="btn btn-secondary">
                        Auktion absagen
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl mb-1">
          Anfragen {openInquiries.length > 0 && `(${openInquiries.length} neu)`}
        </h2>
        <p className="muted text-sm mb-4">
          Kontaktanfragen von Interessenten zu deinen Inseraten.
        </p>

        {inquiries.length === 0 ? (
          <p className="muted text-sm">Noch keine Anfragen.</p>
        ) : (
          <ul className="space-y-3">
            {inquiries.map((inquiry) => (
              <li key={inquiry.id} className="surface rounded-xl p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
                  <Link
                    href={`/marktplatz/pferde/${inquiry.listingSlug}`}
                    className="font-semibold underline"
                  >
                    {inquiry.listingName}
                  </Link>
                  <span className="text-xs muted">
                    {new Date(inquiry.createdAt).toLocaleString("de-DE")}
                  </span>
                </div>
                <p className="text-sm mb-1">
                  {inquiry.senderName} · {inquiry.senderEmail}
                  {inquiry.senderPhone && ` · ${inquiry.senderPhone}`}
                </p>
                <p className="text-sm whitespace-pre-line mb-3">{inquiry.message}</p>

                {inquiry.handled ? (
                  <span className="chip">erledigt</span>
                ) : (
                  <form action={markInquiryHandledAction}>
                    <input type="hidden" name="inquiryId" value={inquiry.id} />
                    <button type="submit" className="btn btn-secondary">
                      Als erledigt markieren
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
