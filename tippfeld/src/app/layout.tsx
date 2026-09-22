import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Oswald, Source_Sans_3 } from "next/font/google";
import { Untenleiste } from "@/components/Untenleiste";
import { aktuellerNutzer } from "@/lib/sitzung";
import "./globals.css";

/*
 * Die Schriften werden beim Bauen heruntergeladen und mit der App ausgeliefert.
 * Dadurch stellt der Browser der Nutzerinnen und Nutzer keine Anfrage an
 * Google, wenn die App geöffnet wird.
 */
const display = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--schrift-display",
  display: "swap",
});

const flieszend = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--schrift-text",
  display: "swap",
});

const daten = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--schrift-daten",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tippfeld",
  description:
    "Fußballprognosen und Tippligen. Statistische Einschätzungen, Tipps mit Freunden, " +
    "ohne Echtgeld und ohne Quoten.",
  icons: { icon: "/grafik/app-icon.svg" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#101A2B" },
    { media: "(prefers-color-scheme: light)", color: "#F5F7F2" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nutzer = await aktuellerNutzer();
  // "system" lässt das Attribut weg, dann entscheidet die Einstellung des Geräts.
  const thema = nutzer?.thema === "hell" ? "light" : nutzer?.thema === "system" ? undefined : "dark";

  return (
    <html
      lang="de"
      data-theme={thema}
      className={`${display.variable} ${flieszend.variable} ${daten.variable}`}
    >
      <body>
        <a className="sprungmarke" href="#inhalt">
          Zum Inhalt springen
        </a>
        <div className="huelle">{children}</div>
        {nutzer ? <Untenleiste /> : null}
      </body>
    </html>
  );
}
