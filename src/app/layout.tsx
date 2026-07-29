import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Westernhengste - offenes Hengstverzeichnis",
    template: "%s | Westernhengste",
  },
  description:
    "Offenes Verzeichnis für Hengste der Westernpferdezucht: Abstammung, Papiere, Disziplinen und Kontakt zum Besitzer. Ohne Preise, ohne Verkauf - reine Information.",
};

const NAV = [
  { href: "/hengste", label: "Hengste" },
  { href: "/eintragen", label: "Hengst eintragen" },
  { href: "/info", label: "Über das Projekt" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="min-h-screen flex flex-col">
        <header
          className="sticky top-0 z-20 backdrop-blur"
          style={{
            backgroundColor: "color-mix(in srgb, var(--page-bg) 88%, transparent)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/" className="flex items-baseline gap-2 no-underline">
              <span
                className="text-xl font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Westernhengste
              </span>
              <span className="hidden sm:inline text-xs muted">
                Hengstverzeichnis
              </span>
            </Link>

            <nav className="flex items-center gap-1 text-sm ml-auto">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-md no-underline hover:bg-[var(--surface-muted)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 w-full">{children}</main>

        <footer
          className="mt-16"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm muted flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <p className="max-w-md">
              Ein offenes, nicht kommerzielles Verzeichnis. Alle Angaben stammen
              von Einsendern und sind ohne Gewähr.
            </p>
            <nav className="flex flex-wrap gap-4">
              <Link href="/info" className="no-underline hover:underline">
                Über das Projekt
              </Link>
              <Link href="/info#datenschutz" className="no-underline hover:underline">
                Datenschutz
              </Link>
              <Link href="/admin" className="no-underline hover:underline">
                Moderation
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
