/**
 * Ordnet eine Farbbeschreibung (deutsch oder englisch, frei eingegeben) einer
 * Füllfarbe für das Platzhalter-Portrait zu. Reine Annäherung, keine exakte
 * Farbwiedergabe - es geht nur darum, dass ein Fuchs nicht wie ein Schimmel
 * aussieht.
 *
 * Die Reihenfolge ist wichtig: zusammengesetzte Begriffe ("blue roan", "red
 * dun") müssen vor den allgemeinen Begriffen ("roan", "dun") geprüft werden.
 */
const RULES: [RegExp, string][] = [
  [/blue\s*roan|blau.?roan/i, "#64748b"],
  [/red\s*roan/i, "#a1615a"],
  [/rot.?schimmel/i, "#b08a86"],
  [/palomino/i, "#d3a53f"],
  [/buckskin/i, "#c39a63"],
  [/dunalino/i, "#c9a35f"],
  [/red\s*dun/i, "#a86b3e"],
  [/grullo|grulla|silber.?grullo/i, "#8c8070"],
  [/\bdun\b/i, "#a08a5c"],
  [/schimmel|grau|grey|gray/i, "#9c9690"],
  [/schwarz|black/i, "#2c2621"],
  [/braun|bay/i, "#5a3823"],
  [/fuchs|sorrel|chestnut|rot(?!schimmel)/i, "#a4552c"],
  [/roan/i, "#8a7a72"],
];

const DEFAULT_FILL = "#8d5a2c"; // var(--leather-600) - wenn keine Farbe bekannt ist

// Diese Füllfarben sind hell genug, dass dunkle statt cremefarbene Schrift
// besser lesbar ist.
const LIGHT_FILLS = new Set(["#d3a53f", "#c39a63", "#c9a35f", "#9c9690"]);

export function coatColorFill(color: string | null): { fill: string; ink: string } {
  const fill = color
    ? (RULES.find(([re]) => re.test(color))?.[1] ?? DEFAULT_FILL)
    : DEFAULT_FILL;

  return { fill, ink: LIGHT_FILLS.has(fill) ? "#241c16" : "#faf7f1" };
}

/** "Doc Bar" -> "DB", "King" -> "Ki" - für das Platzhalter-Monogramm. */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}
