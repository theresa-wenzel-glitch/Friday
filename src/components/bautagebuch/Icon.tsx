/* Einfache Strich-Icons, damit keine Icon-Bibliothek nötig ist. */

const PFADE: Record<string, string> = {
  kamera:
    "M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  mikro: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z M5 11a7 7 0 0 0 14 0 M12 18v3",
  stopp: "M7 7h10v10H7Z",
  plus: "M12 5v14 M5 12h14",
  haus: "M3 11 12 4l9 7 M5 10v10h14V10",
  kran: "M4 21h6 M7 21V4 M7 4h13 M7 8l4-4 M18 4v5 M16 9h4v3h-4Z",
  team: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M3 20a6 6 0 0 1 12 0 M16 5a3 3 0 0 1 0 6 M17 14a5 5 0 0 1 4 6",
  pdf: "M7 3h7l5 5v13H7Z M14 3v5h5 M9.5 13h5 M9.5 16.5h5",
  schloss: "M6 11h12v10H6Z M8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  haken: "M5 12.5 10 17l9-10",
  warnung: "M12 4 2.5 20h19Z M12 10v4.5 M12 17.2v.3",
  wolke: "M7 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 .5 9Z",
  telegram: "M21 4 3 11l6 2.5L18 7l-7 8 7 5Z",
  stift: "M4 20h4L19 9l-4-4L4 16Z M13.5 6.5l4 4",
  muell: "M5 7h14 M10 7V4h4v3 M7 7l1 13h8l1-13",
  pfeil: "M5 12h14 M13 6l6 6-6 6",
  zurueck: "M19 12H5 M11 6l-6 6 6 6",
  text: "M5 6h14 M5 10h14 M5 14h9",
  standort: "M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21Z M12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  x: "M6 6l12 12 M18 6 6 18",
};

export function Icon({ name, size = 22, className }: { name: keyof typeof PFADE | string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PFADE[name] ?? ""} />
    </svg>
  );
}
