import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Echtheit prüfen" };

export default async function Pruefen({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const { h } = await searchParams;
  const hash = (h ?? "").trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(hash)) redirect(`/bautagebuch/pruefen/${hash}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <Link href="/bautagebuch" className="mb-6 text-sm btb-muted no-underline">
        ← Bautagebuch-Automat
      </Link>
      <div className="btb-card p-6 space-y-4">
        <h1 className="text-2xl">Bautagebuch-Eintrag prüfen</h1>
        <p className="btb-muted text-sm">
          Unten auf jeder Seite eines abgeschlossenen Eintrags steht eine Prüfsumme (64 Zeichen). Hier eingeben, um zu
          prüfen, ob der Eintrag so existiert und seit dem Abschluss unverändert ist.
        </p>
        <form className="space-y-3">
          <input name="h" className="btb-field font-mono text-sm" placeholder="Prüfsumme (SHA-256)" defaultValue={h} />
          {h && <p className="btb-notice btb-notice-error text-sm">Das ist keine gültige Prüfsumme (64 Zeichen 0-9, a-f).</p>}
          <button type="submit" className="btb-btn btb-btn-primary w-full">
            Prüfen
          </button>
        </form>
      </div>
    </main>
  );
}
