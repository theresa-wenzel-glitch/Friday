import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/accounts";
import { listInquiriesForAccount, listListingsForAccount } from "@/lib/marketplace-db";
import { formatPrice } from "@/lib/marketplace-types";
import { accountLogoutAction, markInquiryHandledAction } from "./actions";

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
