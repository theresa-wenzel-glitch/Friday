import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Westernhengste - offenes Hengstverzeichnis",
    template: "%s | Westernhengste",
  },
  description:
    "Offenes Verzeichnis für Hengste der Westernpferdezucht: Abstammung, Papiere, Disziplinen und Kontakt zum Besitzer. Ohne Preise, ohne Verkauf - reine Information.",
};

/*
 * Der Wurzel-Layout hält nur <html> und <body>. Die sichtbare Hülle - Kopfzeile,
 * Fußzeile, Farbwelt - liegt in den Gruppen (western) und (soundlab), damit die
 * beiden Anwendungen im selben Projekt nebeneinander wohnen können.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
