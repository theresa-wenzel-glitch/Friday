import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginFormular } from "@/components/bautagebuch/Formulare";
import { aktuelleSitzung } from "@/lib/bautagebuch/sitzung";

export const metadata = { title: "Anmelden" };

export default async function Login({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  if (await aktuelleSitzung()) redirect("/bautagebuch/app");
  const { code } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/bautagebuch" className="mb-6 text-sm btb-muted no-underline">
        ← Bautagebuch-Automat
      </Link>
      <div className="btb-card p-6 space-y-5">
        <div>
          <h1 className="text-2xl">Anmelden</h1>
          <p className="btb-muted text-sm">Den Zugangscode bekommen Sie von Ihrem Chef oder Bauleiter.</p>
        </div>
        <LoginFormular code={code} />
      </div>
      <p className="mt-6 text-center text-sm btb-muted">
        Noch kein Konto?{" "}
        <Link href="/bautagebuch/start" className="font-semibold" style={{ color: "var(--btb-accent)" }}>
          14 Tage kostenlos testen
        </Link>
      </p>
    </main>
  );
}
