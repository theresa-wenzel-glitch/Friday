import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "./actions/auth";

export const metadata: Metadata = {
  title: {
    default: "Reining Stallions — Hengstdatenbank für Reining",
    template: "%s · Reining Stallions",
  },
  description:
    "Die offene Übersicht über Reining-Hengste in Europa, den USA und weltweit: Daten, Fotos, Abstammung und direkter Kontakt zum Besitzer.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="de">
      <body>
        <header className="site-header">
          <div className="container bar">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true">
                ♞
              </span>
              <span>
                Reining Stallions
                <span
                  className="tiny muted"
                  style={{ display: "block", fontWeight: 500, lineHeight: 1.1 }}
                >
                  Hengstdatenbank
                </span>
              </span>
            </Link>

            <nav className="site-nav">
              <Link href="/hengste">Hengste</Link>
              <Link href="/ueber">Über die Datenbank</Link>
              {user ? (
                <>
                  <Link href="/mein-bereich">Mein Bereich</Link>
                  <form action={logoutAction}>
                    <button className="btn btn-sm" type="submit">
                      Abmelden
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login">Anmelden</Link>
                  <Link className="btn btn-primary btn-sm" href="/registrieren">
                    Hengst eintragen
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="container footer-inner">
            <div>
              <strong>Reining Stallions</strong> — Hengste aus Europa, den USA
              und weltweit an einem Ort.
            </div>
            <div className="row">
              <Link href="/ueber">Über die Datenbank</Link>
              <Link href="/hengste">Alle Hengste</Link>
              <a
                href="https://www.allbreedpedigree.com"
                target="_blank"
                rel="noreferrer noopener"
              >
                All Breed Pedigree
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
