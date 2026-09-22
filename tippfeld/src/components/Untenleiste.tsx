"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Symbol, type SymbolName } from "./Symbol";

const PUNKTE: Array<{ pfad: string; titel: string; symbol: SymbolName }> = [
  { pfad: "/", titel: "Start", symbol: "start" },
  { pfad: "/spiele", titel: "Spiele", symbol: "ball" },
  { pfad: "/tipps", titel: "Tipps", symbol: "prognose" },
  { pfad: "/ligen", titel: "Ligen", symbol: "liga" },
  { pfad: "/profil", titel: "Profil", symbol: "profil" },
];

export function Untenleiste() {
  const pfad = usePathname();

  return (
    <nav className="untenleiste" aria-label="Hauptbereiche">
      <div className="untenleiste__innen">
        {PUNKTE.map((punkt) => {
          const aktiv = punkt.pfad === "/" ? pfad === "/" : pfad.startsWith(punkt.pfad);
          return (
            <Link
              key={punkt.pfad}
              href={punkt.pfad}
              className="untenleiste__knopf"
              aria-current={aktiv ? "page" : undefined}
            >
              <Symbol name={punkt.symbol} />
              {punkt.titel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
