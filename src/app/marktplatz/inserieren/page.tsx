import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/accounts";
import { ListingForm } from "@/components/marktplatz/ListingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inserat einstellen - Marktplatz",
};

export default async function CreateListingPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/marktplatz/konto/anmelden?next=/marktplatz/inserieren");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl mb-2">Inserat einstellen</h1>
      <p className="muted mb-8 max-w-2xl">
        Für {account.displayName}. Nur Name und Kontaktadresse sind Pflicht -
        alles andere kann später ergänzt werden.
      </p>

      <ListingForm />
    </div>
  );
}
