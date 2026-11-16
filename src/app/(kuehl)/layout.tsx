import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./kuehl.css";

export const metadata: Metadata = {
  title: {
    default: "Kühl in Mülheim - Hitzeschutz für Mülheim an der Ruhr",
    template: "%s | Kühl in Mülheim",
  },
  description:
    "Trinkbrunnen, kühle Orte, Schwimmbäder, aktuelle Temperaturen und Hitzewarnungen für Mülheim an der Ruhr auf einer Karte.",
  manifest: "/kuehl-manifest.webmanifest",
  icons: { icon: "/kuehl-icon.svg", apple: "/kuehl-icon-192.png" },
  appleWebApp: { capable: true, title: "Kühl in Mülheim", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#208C68",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function KuehlGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
