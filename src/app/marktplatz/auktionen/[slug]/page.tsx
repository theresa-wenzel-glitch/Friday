import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAuctionBySlug, getHighestBid, listBidsForAuction } from "@/lib/marketplace-db";
import { auctionPhase } from "@/lib/marketplace-types";
import { getCurrentAccount } from "@/lib/accounts";
import { AuctionCountdown } from "@/components/marktplatz/AuctionCountdown";
import { BidForm } from "@/components/marktplatz/BidForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const auction = getAuctionBySlug(slug);
  if (!auction || auction.moderationStatus !== "approved" || auction.cancelledAt) {
    return { title: "Nicht gefunden" };
  }
  return { title: auction.title };
}

const PHASE_LABEL = {
  upcoming: "Beginnt in Kürze",
  live: "Läuft",
  ended: "Beendet",
};

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const auction = getAuctionBySlug(slug);
  if (!auction || auction.moderationStatus !== "approved" || auction.cancelledAt) notFound();

  const phase = auctionPhase(auction);
  const highest = getHighestBid(auction.id);
  const bids = listBidsForAuction(auction.id, 20);
  const account = await getCurrentAccount();

  const minNextBid = highest
    ? highest.amountCents + auction.minIncrementCents
    : auction.startingPriceCents;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/marktplatz/auktionen" className="text-sm muted underline">
        ← Zurück zu den Auktionen
      </Link>

      <h1 className="text-3xl mt-4 mb-1">{auction.title}</h1>
      <p className="muted mb-6">
        {PHASE_LABEL[phase]}
        {phase !== "ended" && (
          <>
            {" · "}
            <AuctionCountdown endAt={auction.endAt} />
          </>
        )}
        {auction.seasonNote && ` · ${auction.seasonNote}`}
      </p>

      {auction.description && <p className="whitespace-pre-line mb-8">{auction.description}</p>}

      <div className="surface rounded-xl p-5 mb-8">
        <p className="text-2xl font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          {highest ? "Höchstgebot " : "Startgebot "}
          {((highest ? highest.amountCents : auction.startingPriceCents) / 100).toLocaleString(
            "de-DE",
          )}{" "}
          €
        </p>

        {phase === "live" ? (
          account ? (
            account.id === auction.accountId ? (
              <p className="text-sm muted">
                Das ist deine eigene Auktion - du kannst hier nicht mitbieten.
              </p>
            ) : (
              <BidForm slug={auction.slug} minAmountCents={minNextBid} />
            )
          ) : (
            <p className="text-sm">
              <Link href={`/marktplatz/konto/anmelden?next=/marktplatz/auktionen/${auction.slug}`} className="underline">
                Anmelden
              </Link>{" "}
              um zu bieten.
            </p>
          )
        ) : phase === "upcoming" ? (
          <p className="text-sm muted">Die Auktion hat noch nicht begonnen.</p>
        ) : (
          <p className="text-sm muted">Die Auktion ist beendet.</p>
        )}
      </div>

      {bids.length > 0 && (
        <section>
          <h2 className="text-xl mb-3">Gebote</h2>
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {bids.map((bid) => (
              <li
                key={bid.id}
                className="py-2 flex items-center justify-between text-sm"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <span>{bid.bidderName}</span>
                <span className="font-medium">{(bid.amountCents / 100).toLocaleString("de-DE")} €</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
