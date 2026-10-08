"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const PUNKTE = [
  { href: "/bautagebuch/app", label: "Übersicht", icon: "haus" },
  { href: "/bautagebuch/app/neu", label: "Neuer Eintrag", icon: "plus", gross: true },
  { href: "/bautagebuch/app/baustellen", label: "Baustellen", icon: "kran" },
  { href: "/bautagebuch/app/team", label: "Team", icon: "team" },
];

function aktiv(pfad: string, href: string) {
  return href === "/bautagebuch/app" ? pfad === href || pfad.startsWith("/bautagebuch/app/eintrag") : pfad.startsWith(href);
}

/** Oben auf großen Bildschirmen, unten als Tab-Leiste auf dem Handy. */
export function Navigation() {
  const pfad = usePathname();
  return (
    <>
      <nav className="hidden sm:flex items-center gap-1" aria-label="Hauptnavigation">
        {PUNKTE.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            aria-current={aktiv(pfad, p.href) ? "page" : undefined}
            className={
              p.gross
                ? "btb-btn btb-btn-primary ml-2 min-h-0 py-2"
                : "rounded-lg px-3 py-2 text-sm font-semibold no-underline aria-[current=page]:bg-white/15"
            }
          >
            {p.gross && <Icon name="plus" size={18} />}
            {p.label}
          </Link>
        ))}
      </nav>

      <nav className="btb-tabbar sm:hidden" aria-label="Hauptnavigation">
        <div className="grid grid-cols-4">
          {PUNKTE.map((p) => (
            <Link key={p.href} href={p.href} className="btb-tab" aria-current={aktiv(pfad, p.href) ? "page" : undefined}>
              {p.gross ? (
                <span
                  className="-mt-5 grid h-12 w-12 place-items-center rounded-full shadow-lg"
                  style={{ background: "var(--btb-accent)", color: "var(--btb-accent-fg)" }}
                >
                  <Icon name="plus" size={26} />
                </span>
              ) : (
                <Icon name={p.icon} />
              )}
              {p.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
