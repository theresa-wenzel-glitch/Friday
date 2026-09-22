/* Automatisch erzeugt aus ../design-system - nicht von Hand ändern. */
import type { SVGProps } from "react";

export type SymbolName =
  | "abmelden"
  | "archiv"
  | "ball"
  | "datenquelle"
  | "einladen"
  | "einstellungen"
  | "filter"
  | "flutlicht"
  | "form"
  | "glocke"
  | "haken"
  | "kamera"
  | "karte"
  | "ki-analyse"
  | "kopieren"
  | "kreuz"
  | "liga"
  | "pfeil-rechts"
  | "pfiff"
  | "plus"
  | "pokal"
  | "profil"
  | "prognose"
  | "punkte"
  | "qr-code"
  | "rangliste"
  | "schloss"
  | "silhouette"
  | "spielfeld"
  | "spieltag"
  | "start"
  | "stern"
  | "suche"
  | "teilen"
  | "tor"
  | "trend-ab"
  | "trend-auf"
  | "trikot"
  | "uhr"
  | "wappen-platzhalter"
  | "warnung"
  | "zurueck";

/** Die Beschriftung aus dem Designsystem, für aria-label wenn ein Symbol allein steht. */
export const symbolTitel: Record<SymbolName, string> = {
  "abmelden": "Abmelden",
  "archiv": "Ergebnisarchiv",
  "ball": "Ball",
  "datenquelle": "Datenquelle",
  "einladen": "Einladen",
  "einstellungen": "Einstellungen",
  "filter": "Filter",
  "flutlicht": "Flutlicht",
  "form": "Formkurve",
  "glocke": "Benachrichtigung",
  "haken": "Richtig",
  "kamera": "Scannen",
  "karte": "Verwarnung",
  "ki-analyse": "KI-Analyse",
  "kopieren": "Kopieren",
  "kreuz": "Falsch",
  "liga": "Liga",
  "pfeil-rechts": "Weiter",
  "pfiff": "Anpfiff",
  "plus": "Hinzufügen",
  "pokal": "Pokal",
  "profil": "Profil",
  "prognose": "Prognose",
  "punkte": "Punkte",
  "qr-code": "QR-Code",
  "rangliste": "Rangliste",
  "schloss": "Gesperrt",
  "silhouette": "Spieler",
  "spielfeld": "Spielfeld",
  "spieltag": "Spieltag",
  "start": "Start",
  "stern": "Favorit",
  "suche": "Suchen",
  "teilen": "Teilen",
  "tor": "Tor",
  "trend-ab": "Form fallend",
  "trend-auf": "Form steigend",
  "trikot": "Spieler",
  "uhr": "Anstoßzeit",
  "wappen-platzhalter": "Vereinsplatzhalter",
  "warnung": "Hinweis",
  "zurueck": "Zurück",
};

const formen: Record<SymbolName, React.ReactNode> = {
  "abmelden": (
    <>
      <path d="M14.5 4.5h3.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5"/>
      <path d="M10 12h-6"/>
      <path d="m7.5 8.5-3.5 3.5 3.5 3.5"/>
    </>
  ),
  "archiv": (
    <>
      <rect x="3" y="4.5" width="18" height="4" rx="1.2"/>
      <path d="M5 8.5v10a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-10"/>
      <path d="M10 13h4"/>
    </>
  ),
  "ball": (
    <>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8 15.8 10.76 14.35 15.24 9.65 15.24 8.2 10.76Z"/>
      <path d="M12 8V3.5M15.8 10.76 20.08 9.37M14.35 15.24 17 18.88M9.65 15.24 7 18.88M8.2 10.76 3.92 9.37"/>
    </>
  ),
  "datenquelle": (
    <>
      <ellipse cx="12" cy="6" rx="7.5" ry="3"/>
      <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/>
      <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>
    </>
  ),
  "einladen": (
    <>
      <circle cx="18" cy="5.5" r="2.5"/>
      <circle cx="6" cy="12" r="2.5"/>
      <circle cx="18" cy="18.5" r="2.5"/>
      <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>
    </>
  ),
  "einstellungen": (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10"/>
      <circle cx="16" cy="7" r="2.4"/>
      <circle cx="8" cy="17" r="2.4"/>
    </>
  ),
  "filter": (
    <>
      <path d="M3.5 6h17M6.5 12h11M10 18h4"/>
    </>
  ),
  "flutlicht": (
    <>
      <path d="M7.5 4h9l1.2 5.5H6.3Z"/>
      <path d="M12 9.5V20M8.5 20h7"/>
      <path d="m4.2 2.8 1.6 1.6M19.8 2.8l-1.6 1.6"/>
    </>
  ),
  "form": (
    <>
      <path d="M4 20v-6.5M9.3 20V9.5M14.7 20v-4M20 20V4.5"/>
    </>
  ),
  "glocke": (
    <>
      <path d="M18 9.5a6 6 0 1 0-12 0c0 4.8-2 6.2-2 6.2h16s-2-1.4-2-6.2Z"/>
      <path d="M10.2 19a2 2 0 0 0 3.6 0"/>
    </>
  ),
  "haken": (
    <>
      <path d="m4.5 12.5 5 5 10-11"/>
    </>
  ),
  "kamera": (
    <>
      <path d="M3.5 8.5V6a2 2 0 0 1 2-2H8"/>
      <path d="M16 4h2.5a2 2 0 0 1 2 2v2.5"/>
      <path d="M20.5 15.5V18a2 2 0 0 1-2 2H16"/>
      <path d="M8 20H5.5a2 2 0 0 1-2-2v-2.5"/>
      <path d="M3.5 12h17"/>
    </>
  ),
  "karte": (
    <>
      <rect x="8" y="3.5" width="9.5" height="14" rx="1.6" transform="rotate(14 12.75 10.5)"/>
      <path d="M6.2 9.3 4.6 10a1.6 1.6 0 0 0-.9 2l3 8.4"/>
    </>
  ),
  "ki-analyse": (
    <>
      <path d="M12 3 13.7 7.6 18.3 9.3 13.7 11 12 15.6 10.3 11 5.7 9.3 10.3 7.6Z"/>
      <path d="M18.6 15.2 19.4 17.4 21.6 18.2 19.4 19 18.6 21.2 17.8 19 15.6 18.2 17.8 17.4Z"/>
    </>
  ),
  "kopieren": (
    <>
      <rect x="8.5" y="3.5" width="12" height="12" rx="2.2"/>
      <path d="M15.5 19.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1"/>
    </>
  ),
  "kreuz": (
    <>
      <path d="m6 6 12 12M18 6 6 18"/>
    </>
  ),
  "liga": (
    <>
      <circle cx="9" cy="8" r="3.2"/>
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/>
      <path d="M16 5.7a3.2 3.2 0 0 1 0 6.2"/>
      <path d="M17.3 14.7a5.5 5.5 0 0 1 3.2 4.8"/>
    </>
  ),
  "pfeil-rechts": (
    <>
      <path d="M5 12h13"/>
      <path d="m13 6.5 5.5 5.5L13 17.5"/>
    </>
  ),
  "pfiff": (
    <>
      <circle cx="14.5" cy="14" r="5.8"/>
      <circle cx="14.5" cy="14" r="1.8"/>
      <path d="M10.2 10.1 4.1 7.7a1.6 1.6 0 0 0-2.1 2l1.6 4a1.6 1.6 0 0 0 1.5 1h3.3"/>
    </>
  ),
  "plus": (
    <>
      <path d="M12 5v14M5 12h14"/>
    </>
  ),
  "pokal": (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0Z"/>
      <path d="M8 6H5.6a2.4 2.4 0 0 0 0 4.8H7"/>
      <path d="M16 6h2.4a2.4 2.4 0 0 1 0 4.8H17"/>
      <path d="M12 13v3.5"/>
      <path d="M8.5 20h7l-1-3.5h-5Z"/>
    </>
  ),
  "profil": (
    <>
      <circle cx="12" cy="8" r="3.6"/>
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>
    </>
  ),
  "prognose": (
    <>
      <circle cx="12" cy="12" r="8.5"/>
      <circle cx="12" cy="12" r="4.5"/>
      <path d="M12 12h.01"/>
    </>
  ),
  "punkte": (
    <>
      <circle cx="12" cy="15" r="6"/>
      <path d="M8.6 9.9 6 3.5h12l-2.6 6.4"/>
      <path d="M12 12.6v4.8"/>
    </>
  ),
  "qr-code": (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <path d="M14 14h3v3h-3Z"/>
      <path d="M20.5 14v.01M14 20.5h3M20.5 17.5v3.5"/>
    </>
  ),
  "rangliste": (
    <>
      <path d="M4.5 6h1.5M4.5 12h1.5M4.5 18h1.5"/>
      <path d="M10 6h10M10 12h10M10 18h6"/>
    </>
  ),
  "schloss": (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.4"/>
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>
      <path d="M12 14v2.5"/>
    </>
  ),
  "silhouette": (
    <>
      <circle cx="12" cy="6.5" r="3"/>
      <path d="M8.5 21v-5l-2.5-1.5 1.5-4.5a4.5 4.5 0 0 1 9 0L18 14.5 15.5 16v5"/>
    </>
  ),
  "spielfeld": (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2"/>
      <path d="M12 5v14"/>
      <circle cx="12" cy="12" r="3"/>
      <path d="M2.5 9h3v6h-3M21.5 9h-3v6h3"/>
    </>
  ),
  "spieltag": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5"/>
      <path d="M3 10h18M8 3v4M16 3v4"/>
      <path d="M8 14.5h2M14 14.5h2M8 18h2"/>
    </>
  ),
  "start": (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7"/>
      <path d="M5.5 12v7.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V12"/>
      <path d="M9.5 20.5V14h5v6.5"/>
    </>
  ),
  "stern": (
    <>
      <path d="M12 3.5 14.7 9.1 20.8 10 16.4 14.3 17.4 20.4 12 17.5 6.6 20.4 7.6 14.3 3.2 10 9.3 9.1Z"/>
    </>
  ),
  "suche": (
    <>
      <circle cx="10.8" cy="10.8" r="6.8"/>
      <path d="m15.8 15.8 4.2 4.2"/>
    </>
  ),
  "teilen": (
    <>
      <path d="M12 3.5v11"/>
      <path d="m8 7.5 4-4 4 4"/>
      <path d="M5.5 13v6a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-6"/>
    </>
  ),
  "tor": (
    <>
      <path d="M3 19.5V7h18v12.5"/>
      <path d="M3 19.5h18M8.5 7v12.5M15.5 7v12.5M3 13.2h18"/>
    </>
  ),
  "trend-ab": (
    <>
      <path d="M3 6.5 9 12.5l4-4 8 8"/>
      <path d="M16 16.5h5v-5"/>
    </>
  ),
  "trend-auf": (
    <>
      <path d="M3 17.5 9 11.5l4 4 8-8"/>
      <path d="M16 7.5h5v5"/>
    </>
  ),
  "trikot": (
    <>
      <path d="M8.5 3 4.8 5 3 9.2l3.2 1.5V21h11.6V10.7L21 9.2 19.2 5 15.5 3a3.5 3.5 0 0 1-7 0Z"/>
    </>
  ),
  "uhr": (
    <>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 6.8V12l3.3 2"/>
    </>
  ),
  "wappen-platzhalter": (
    <>
      <path d="M12 3 19.5 5.6v6.2c0 4.3-3 7.7-7.5 9.2-4.5-1.5-7.5-4.9-7.5-9.2V5.6Z"/>
    </>
  ),
  "warnung": (
    <>
      <path d="M12 4.5 21 19.5H3Z"/>
      <path d="M12 10v4M12 17v.01"/>
    </>
  ),
  "zurueck": (
    <>
      <path d="M19 12H6"/>
      <path d="m11 5.5-5.5 6.5 5.5 6.5"/>
    </>
  ),
};

type Props = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: SymbolName;
  /** Ohne Beschriftung gilt das Symbol als schmückend und wird vorgelesen übersprungen. */
  beschriftung?: string;
};

export function Symbol({ name, beschriftung, className, ...rest }: Props) {
  const beschriftet = Boolean(beschriftung);
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["tf-symbol", className].filter(Boolean).join(" ")}
      role={beschriftet ? "img" : undefined}
      aria-label={beschriftung}
      aria-hidden={beschriftet ? undefined : true}
      focusable="false"
      {...rest}
    >
      {formen[name]}
    </svg>
  );
}
