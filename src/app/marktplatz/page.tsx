import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentAccount } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marktplatz",
  description:
    "Marktplatz für Deckhengste und Verkaufspferde - Inserate, Kontaktanfragen und Decksprung-Auktionen.",
};

export default async function MarketplacePage() {
  const account = await getCurrentAccount();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl mb-3">Marktplatz</h1>
      <p className="muted mb-8 max-w-xl">
        Hier entstehen als Nächstes Inserate für Deckhengste und
        Verkaufspferde, Kontaktanfragen und Decksprung-Auktionen. Dieser
        Bereich ist getrennt vom Info-Verzeichnis und im Aufbau.
      </p>

      {account ? (
        <Link href="/marktplatz/konto" className="btn btn-primary no-underline">
          Zu meinem Konto
        </Link>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Link
            href="/marktplatz/konto/registrieren"
            className="btn btn-primary no-underline"
          >
            Konto anlegen
          </Link>
          <Link
            href="/marktplatz/konto/anmelden"
            className="btn btn-secondary no-underline"
          >
            Anmelden
          </Link>
        </div>
      )}
    </div>
  );
}
