/*
 * Ein kleiner, einheitlicher Icon-Satz. Alles Linien, 24er Raster - dadurch
 * wirken die Symbole überall gleich schwer.
 */

export type IconName =
  | "play"
  | "pause"
  | "stop"
  | "mic"
  | "metronome"
  | "volume"
  | "volumeOff"
  | "settings"
  | "user"
  | "plus"
  | "trash"
  | "chevronRight"
  | "chevronLeft"
  | "sparkle"
  | "repeat"
  | "check"
  | "save"
  | "arrowRight"
  | "waveform";

const PATHS: Record<IconName, React.ReactNode> = {
  play: <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
    </>
  ),
  metronome: (
    <>
      <path d="M9.5 3.5h5l3.5 17h-12l3.5-17z" />
      <path d="M7 14.5h10" />
      <path d="M12 20 16 7" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M18 7a7 7 0 0 1 0 10" />
    </>
  ),
  volumeOff: (
    <>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      <path d="m16 9.5 4 5M20 9.5l-4 5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6.5V4.8h5v1.7" />
      <path d="M6.5 6.5 7.6 20h8.8l1.1-13.5" />
    </>
  ),
  chevronRight: <path d="m9.5 5 7 7-7 7" />,
  chevronLeft: <path d="m14.5 5-7 7 7 7" />,
  sparkle: (
    <path d="M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5L10.1 13 4.5 11l5.6-2L12 3.5z" />
  ),
  repeat: (
    <>
      <path d="M4.5 10.5V9a3 3 0 0 1 3-3h12" />
      <path d="m16.5 3 3 3-3 3" />
      <path d="M19.5 13.5V15a3 3 0 0 1-3 3h-12" />
      <path d="m7.5 21-3-3 3-3" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  save: (
    <>
      <path d="M5 5.5h11L19 8.5V19H5z" />
      <path d="M8.5 5.5v5h7v-5M8.5 19v-5h7v5" />
    </>
  ),
  arrowRight: <path d="M4.5 12h15m-6-6 6 6-6 6" />,
  waveform: <path d="M3 12h2.5l2-6 3 13 3-16 2.5 9H21" />,
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
