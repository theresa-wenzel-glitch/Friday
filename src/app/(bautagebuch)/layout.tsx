import type { Metadata, Viewport } from "next";
import "./bautagebuch.css";

export const metadata: Metadata = {
  title: {
    default: "Bautagebuch-Automat - Foto + Sprachnachricht = Bautagebuch",
    template: "%s | Bautagebuch-Automat",
  },
  description:
    "Ein Foto und 15 Sekunden Sprachnachricht von der Baustelle - daraus wird ein sauberes Bautagebuch als PDF, mit Zeitstempel, gemessenem Wetter und Prüfsumme.",
  manifest: "/bautagebuch.webmanifest",
  icons: { icon: "/bautagebuch-icon.svg", apple: "/bautagebuch-icon.svg" },
  appleWebApp: { capable: true, title: "Bautagebuch", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1f2328",
};

export default function BautagebuchGroupLayout({ children }: { children: React.ReactNode }) {
  return <div className="btb">{children}</div>;
}
