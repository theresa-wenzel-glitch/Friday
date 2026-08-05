import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentAccount } from "@/lib/accounts";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/marktplatz/RegisterForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Konto anlegen - Marktplatz",
};

export default async function RegisterPage() {
  const account = await getCurrentAccount();
  if (account) redirect("/marktplatz/konto");

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="text-2xl mb-2">Konto anlegen</h1>
      <p className="muted text-sm mb-6">
        Mit einem Konto kannst du Hengste im Marktplatz inserieren, Anfragen
        erhalten und Decksprung-Auktionen anlegen.
      </p>

      <RegisterForm />

      <p className="text-sm muted mt-6">
        Schon ein Konto?{" "}
        <Link href="/marktplatz/konto/anmelden" className="underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
