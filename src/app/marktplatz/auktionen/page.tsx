import Link from "next/link";
import type { Metadata } from "next";
import { getHighestBid, queryAuctions } from "@/lib/marketplace-db";
import { auctionPhase } from "@/lib/marketplace-types";
import { AuctionCountdown } from "@/components/marktplatz/AuctionCountdown";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Auktionen",
  description: "Decksprung-Auktionen im Marktplatz - ein einzelner Decktermin wird versteigert.",
};

const PHASE_LABEL = {
  upcoming: "beginnt in Kürze",
  live: "läuft",
  ended: "beendet",
};

export default async function AuctionsPage() {
  const { auctions } = queryAuctions({ limit: 100 });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-2">
        <h1 className="text-3xl">Auktionen</h1>
        <Link href="/marktplatz/auktionen/erstellen" className="btn btn-secondary no-underline">
          Auktion anlegen
        </Link>
      </div>
      <p className="muted mb-8 max-w-2xl">
        Versteigert wird jeweils ein einzelner Decktermin eines Hengstes -
        nicht der Hengst selbst. Das höchste Gebot nach Ablauf gewinnt den
        Platz.
      </p>

      {auctions.length === 0 ? (
        <div className="surface rounded-xl p-8 text-center">
          <p className="mb-4">Noch keine Auktion eingestellt.</p>
          <Link href="/marktplatz/auktionen/erstellen" className="btn btn-primary no-underline">
            Erste Auktion anlegen
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {auctions.map((auction) => {
            const phase = auctionPhase(auction);
            const highest = getHighestBid(auction.id);
            const current = highest ? highest.amountCents : auction.startingPriceCents;

            return (
              <li key={auction.id}>
                <Link
                  href={`/marktplatz/auktionen/${auction.slug}`}
                  className="surface rounded-xl p-5 no-underline flex flex-wrap items-center justify-between gap-3 hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                      {auction.title}
                    </p>
                    {auction.seasonNote && (
                      <p className="text-sm muted">{auction.seasonNote}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {highest ? "Höchstgebot " : "Startgebot "}
                      {(current / 100).toLocaleString("de-DE")} €
                    </p>
                    <p className="text-xs muted">
                      {PHASE_LABEL[phase]}
                      {phase !== "ended" && (
                        <>
                          {" · "}
                          <AuctionCountdown endAt={auction.endAt} />
                        </>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
