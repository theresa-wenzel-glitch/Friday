import Link from "next/link";
import { RegistrierenFormular } from "@/components/bautagebuch/Formulare";

export const metadata = { title: "Kostenlos testen" };

export default function Start() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/bautagebuch" className="mb-6 text-sm btb-muted no-underline">
        ← Bautagebuch-Automat
      </Link>
      <div className="btb-card p-6 space-y-5">
        <div>
          <h1 className="text-2xl">14 Tage kostenlos testen</h1>
          <p className="btb-muted text-sm">Keine Zahlungsdaten nötig. In einer Minute startklar.</p>
        </div>
        <RegistrierenFormular />
      </div>
      <p className="mt-6 text-center text-sm btb-muted">
        Schon dabei?{" "}
        <Link href="/bautagebuch/login" className="font-semibold" style={{ color: "var(--btb-accent)" }}>
          Mit Zugangscode anmelden
        </Link>
      </p>
    </main>
  );
}
