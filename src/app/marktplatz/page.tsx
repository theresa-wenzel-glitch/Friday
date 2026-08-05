import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentAccount } from "@/lib/accounts";
import { getMarketStats, queryListings } from "@/lib/marketplace-db";
import { MarketStatsBar } from "@/components/marktplatz/MarketStatsBar";
import { ListingCard } from "@/components/marktplatz/ListingCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marktplatz",
  description:
    "Marktplatz für Deckhengste und Verkaufspferde - Inserate, Kontaktanfragen und Decksprung-Auktionen.",
};

export default async function MarketplacePage() {
  const account = await getCurrentAccount();
  const stats = getMarketStats();
  const { listings: recent } = queryListings({ sort: "newest", limit: 6 });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="max-w-2xl mb-8">
        <p className="text-xs uppercase tracking-wide muted mb-2">
          Marktplatz für Westernpferde
        </p>
        <h1 className="text-4xl mb-3">Finde dein Westernpferd.</h1>
        <p className="muted">
          Deckhengste und Verkaufspferde von Anbietern - getrennt vom
          Info-Verzeichnis. Hier sind Preise sichtbar, weil hier tatsächlich
          inseriert und angefragt wird.
        </p>
      </div>

      <MarketStatsBar stats={stats} />

      <div className="flex flex-wrap gap-3 mb-12">
        <Link href="/marktplatz/pferde" className="btn btn-primary no-underline">
          Alle Inserate ansehen
        </Link>
        {account ? (
          <>
            <Link href="/marktplatz/inserieren" className="btn btn-secondary no-underline">
              Inserat einstellen
            </Link>
            <Link href="/marktplatz/konto" className="btn btn-secondary no-underline">
              Zu meinem Konto
            </Link>
          </>
        ) : (
          <>
            <Link href="/marktplatz/konto/registrieren" className="btn btn-secondary no-underline">
              Konto anlegen
            </Link>
            <Link href="/marktplatz/konto/anmelden" className="btn btn-secondary no-underline">
              Anmelden
            </Link>
          </>
        )}
      </div>

      {recent.length > 0 && (
        <section>
          <h2 className="text-2xl mb-4">Zuletzt eingestellt</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
