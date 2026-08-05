import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/accounts";
import { listListingsForAccount } from "@/lib/marketplace-db";
import { AuctionForm } from "@/components/marktplatz/AuctionForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Auktion anlegen - Marktplatz",
};

export default async function CreateAuctionPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/marktplatz/konto/anmelden?next=/marktplatz/auktionen/erstellen");

  const listings = listListingsForAccount(account.id).filter(
    (l) => l.status === "approved",
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl mb-2">Auktion für einen Decktermin anlegen</h1>
      <p className="muted mb-8 max-w-2xl">
        Versteigert wird ein einzelner Decktermin - nicht der Hengst selbst.
        Das höchste Gebot nach Ablauf gewinnt den Platz.
      </p>

      <AuctionForm listings={listings} />
    </div>
  );
}
