/**
 * Design-Tokens von JobFlow.
 *
 * Alle Farben, Abstände und Schriftgrößen stehen hier - und nur hier.
 * Sonst lässt sich das Branding später nicht mehr ändern, ohne hundert
 * Dateien anzufassen.
 */

export const colors = {
  /** Primärfarbe: Violett/Blau. Buttons, aktive Zustände, Akzente. */
  primary: "#5B4CF0",
  primaryDark: "#4438C7",
  primaryLight: "#EDEBFE",

  /** Hintergrund der App: sehr helles Grau. */
  background: "#F6F7FB",
  /** Karten und Eingabefelder liegen hell darauf. */
  surface: "#FFFFFF",
  surfaceMuted: "#F0F1F7",

  /** Text: dunkles Navy statt reinem Schwarz - ruhiger zu lesen. */
  text: "#131A34",
  textMuted: "#5A6284",
  textInverted: "#FFFFFF",

  border: "#E3E5EF",

  success: "#1FA971",
  successLight: "#E4F7EF",
  warning: "#E08A1E",
  warningLight: "#FDF2E1",
  error: "#D8464F",
  errorLight: "#FCEAEB",

  /**
   * Eigene Farbe für alles, was von der KI kommt. KI-Inhalte müssen optisch
   * erkennbar sein und dürfen nicht wie gesicherte Fakten aussehen.
   */
  ai: "#7A5AF8",
  aiLight: "#F1EDFE",
} as const;

/** Abstandsskala in Punkten. Vielfache von 4. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Große, weiche Radien - das prägt den Charakter der Oberfläche. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  /** Inter als Grundschrift, mit Systemschrift als Rückfallebene. */
  fontFamily: "Inter",
  sizes: {
    caption: 12,
    small: 14,
    body: 16,
    title: 20,
    heading: 24,
    display: 32,
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

/** Dezente Schatten. Karten sollen schweben, nicht schreien. */
export const shadows = {
  card: {
    shadowColor: "#131A34",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

export const theme = { colors, spacing, radii, typography, shadows } as const;

export type Theme = typeof theme;
