import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/accounts";
import { AccountLoginForm } from "@/components/marktplatz/AccountLoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anmelden - Marktplatz",
};

export default async function AccountLoginPage() {
  const account = await getCurrentAccount();
  if (account) redirect("/marktplatz/konto");

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="text-2xl mb-2">Anmelden</h1>
      <p className="muted text-sm mb-6">
        Für Anbieter im Marktplatz - nicht zu verwechseln mit der Moderation
        des Info-Verzeichnisses.
      </p>

      <AccountLoginForm />

      <p className="text-sm muted mt-6">
        Noch kein Konto?{" "}
        <Link href="/marktplatz/konto/registrieren" className="underline">
          Konto anlegen
        </Link>
      </p>
    </div>
  );
}
