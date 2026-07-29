import Link from "next/link";
import type { Metadata } from "next";
import { isAdminConfigured, isLoggedIn } from "@/lib/auth";
import { AdminLogin } from "@/components/AdminLogin";
import { PedigreeImport } from "@/components/PedigreeImport";
import { countByStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Abstammungen eintragen",
  robots: { index: false, follow: false },
};

export default async function ImportPage() {
  if (!(await isLoggedIn())) {
    return <AdminLogin configured={isAdminConfigured()} />;
  }

  const total = countByStatus("approved");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href="/admin" className="text-sm underline muted no-underline">
        ← zurück zur Moderation
      </Link>

      <h1 className="text-3xl mt-4 mb-3">Abstammungen eintragen</h1>

      <p className="muted max-w-2xl mb-6">
        Für den Fall, dass eine Abstammung vorliegt - aus dem Zuchtbuchpapier,
        aus einer Pedigree-Datenbank wie allbreedpedigree.com oder aus einem
        Katalog - und mehrere Pferde auf einmal nachgetragen werden sollen.
        Aktuell sind {total} Pferde erfasst.
      </p>

      <div
        className="rounded-lg px-4 py-3 mb-8 text-sm space-y-2"
        style={{
          backgroundColor: "var(--surface-muted)",
          border: "1px solid var(--line)",
        }}
      >
        <p>
          <strong>So funktioniert es:</strong> Je Zeile ein Pferd, getrennt
          durch einen senkrechten Strich:
        </p>
        <pre
          className="scroll-x text-xs px-3 py-2 rounded"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--line)" }}
        >
{`Colonels Smoking Gun | Colonelfourfreckle | Katie Gun
Colonelfourfreckle   | Colonel Freckles    | Miss Solano`}
        </pre>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Unbekannter Elternteil: einen Bindestrich setzen. Es wird nichts
            geraten.
          </li>
          <li>
            Jahrgang und Farbe dürfen hinten dran:{" "}
            <code>Name | Vater | Mutter | 1993 | Fuchs</code>
          </li>
          <li>
            Genannte Vorfahren werden gleich mit angelegt, damit der Stammbaum
            weiterwächst. Ob Hengst oder Stute, ergibt sich aus der Spalte.
          </li>
          <li>
            Vorhandene Einträge werden <strong>nur ergänzt, nie
            überschrieben</strong>. Die Vorschau zeigt vorher genau, was
            passiert.
          </li>
          <li>
            Auch Tabulatoren und Semikolon gelten als Trenner - Zeilen aus einer
            Tabelle lassen sich also direkt einfügen.
          </li>
        </ul>
        <p className="muted">
          Neu angelegte Pferde gelten als ungeprüft, bis ihr sie in der
          Moderation freigebt.
        </p>
      </div>

      <PedigreeImport />
    </div>
  );
}
