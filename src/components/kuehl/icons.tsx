import type { PlaceCategory } from "@/lib/kuehl/types";

type IconName =
  | "drop"
  | "tree"
  | "sun"
  | "wave"
  | "house"
  | "wc"
  | "flag"
  | "map"
  | "home"
  | "compass"
  | "shield"
  | "pin"
  | "locate"
  | "walk"
  | "alert";

const PATHS: Record<IconName, React.ReactNode> = {
  drop: <path d="M12 3c4 5 6.5 8.4 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 11.4 8 8 12 3z" fill="currentColor" />,
  tree: (
    <path
      d="M12 2a6 6 0 0 0-5.6 8.2A5 5 0 0 0 9 19h2v3h2v-3h2a5 5 0 0 0 2.6-8.8A6 6 0 0 0 12 2z"
      fill="currentColor"
    />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <path
        d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  wave: (
    <path
      d="M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"
      stroke="currentColor"
      strokeWidth="2.2"
      fill="none"
      strokeLinecap="round"
    />
  ),
  house: <path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" fill="currentColor" />,
  wc: (
    <>
      <circle cx="7" cy="5" r="2" fill="currentColor" />
      <circle cx="17" cy="5" r="2" fill="currentColor" />
      <path d="M5 9h4l1 7H8v5H6v-5H4zM15 9h4l2 7h-2.5v5h-3v-5H13z" fill="currentColor" />
    </>
  ),
  flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinejoin="round" />,
  map: (
    <path
      d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinejoin="round"
    />
  ),
  home: <path d="M4 11 12 4l8 7v9h-5v-5H9v5H4z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <path d="M12 8v5m0 3v.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  pin: (
    <>
      <path d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 7v6m-3-3h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  locate: (
    <>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2" fill="none" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="4" r="2" fill="currentColor" />
      <path d="m9 21 2-6 3 2v5m-6-9 2-4 4 1 2 3 3 1M10 8l-2 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2 20h20z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <path d="M12 9v5m0 3v.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export const CATEGORY: Record<PlaceCategory, { label: string; color: string; icon: IconName }> = {
  wasser: { label: "Trinkwasser", color: "var(--k-c-wasser)", icon: "drop" },
  kuehl: { label: "Kühle Orte", color: "var(--k-c-kuehl)", icon: "tree" },
  bad: { label: "Baden", color: "var(--k-c-bad)", icon: "wave" },
  haus: { label: "Gebäude", color: "var(--k-c-haus)", icon: "house" },
  wc: { label: "Toiletten", color: "var(--k-c-wc)", icon: "wc" },
  meldung: { label: "Bürgermeldungen", color: "var(--k-c-meldung)", icon: "flag" },
};

/** Rohes SVG für Leaflet-Marker (die außerhalb von React gerendert werden). */
export function iconSvg(name: IconName, size = 16): string {
  const raw: Record<string, string> = {
    drop: '<path d="M12 3c4 5 6.5 8.4 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 11.4 8 8 12 3z" fill="currentColor"/>',
    tree: '<path d="M12 2a6 6 0 0 0-5.6 8.2A5 5 0 0 0 9 19h2v3h2v-3h2a5 5 0 0 0 2.6-8.8A6 6 0 0 0 12 2z" fill="currentColor"/>',
    wave: '<path d="M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    house: '<path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" fill="currentColor"/>',
    wc: '<circle cx="7" cy="5" r="2" fill="currentColor"/><circle cx="17" cy="5" r="2" fill="currentColor"/><path d="M5 9h4l1 7H8v5H6v-5H4zM15 9h4l2 7h-2.5v5h-3v-5H13z" fill="currentColor"/>',
    flag: '<path d="M5 21V4m0 0h11l-2 4 2 4H5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linejoin="round"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${raw[name] ?? ""}</svg>`;
}

export function Leaves({ score }: { score: number }) {
  return (
    <span className="k-leaves" role="img" aria-label={`${score} von 5 Blättern`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M20 4C9 4 4 9 4 16c0 1.4.3 2.7.8 4C7 14 11 10 16 8c-4 3-7.5 7-9 12 1 .3 2 .5 3 .5C17 20.5 20 13 20 4z"
            fill={i <= score ? "var(--k-forest)" : "var(--k-line)"}
          />
        </svg>
      ))}
    </span>
  );
}

export function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#208C68" />
      <path d="M20 8c6 6 9 10.5 9 15a9 9 0 0 1-18 0c0-4.5 3-9 9-15z" fill="#DDF3E7" />
      <path d="M20 30V18m0 5 4-4m-4 8-4-4" stroke="#208C68" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
