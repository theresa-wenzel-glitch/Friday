"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Logo } from "./icons";

const NAV = [
  { href: "/kuehl", label: "Start", icon: "home" },
  { href: "/kuehl/karte", label: "Karte", icon: "map" },
  { href: "/kuehl/entdecken", label: "Entdecken", icon: "compass" },
  { href: "/kuehl/hitzeschutz", label: "Hitzeschutz", icon: "shield" },
  { href: "/kuehl/melden", label: "Melden", icon: "pin" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/kuehl" ? pathname === "/kuehl" : pathname.startsWith(href);

  return (
    <div className="kuehl">
      <div className="k-app">
        <header className="k-top">
          <Link href="/kuehl" className="k-logo" aria-label="Kühl in Mülheim, Startseite">
            <Logo />
            <span>
              <b>KÜHL IN MÜLHEIM</b>
              <small>Deine Stadt. Dein Schatten.</small>
            </span>
          </Link>
          <Link href="/kuehl/info" className="k-top-link">
            Über die App
          </Link>
        </header>
        <main>{children}</main>
        <footer className="k-foot">
          Kartendaten © OpenStreetMap-Mitwirkende (ODbL). Wetter: Open-Meteo bzw. Deutscher
          Wetterdienst über Bright Sky. Trinkbrunnen nach Angaben der Stadt Mülheim an der Ruhr.
          Kein offizielles Angebot der Stadt.{" "}
          <Link href="/kuehl/info">Datenquellen</Link> · <Link href="/kuehl/impressum">Impressum</Link> ·{" "}
          <Link href="/kuehl/datenschutz">Datenschutz</Link>
        </footer>
      </div>
      <nav className="k-nav" aria-label="Hauptnavigation">
        <div className="k-nav-in">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>
              <span className="k-pill">
                <Icon name={n.icon} size={22} />
              </span>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
