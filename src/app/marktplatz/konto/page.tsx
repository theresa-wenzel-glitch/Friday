import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/accounts";
import { accountLogoutAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mein Konto - Marktplatz",
  robots: { index: false, follow: false },
};

export default async function AccountDashboardPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/marktplatz/konto/anmelden");

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

      <div className="surface rounded-xl p-5">
        <p className="text-sm muted">
          Hier entstehen als Nächstes deine Inserate, eingehenden Anfragen und
          Auktionen. Noch nichts angelegt.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link href="/marktplatz" className="btn btn-secondary no-underline">
            Zum Marktplatz
          </Link>
        </div>
      </div>
    </div>
  );
}
