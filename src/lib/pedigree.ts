/**
 * Verknuepfung mit allbreedpedigree.com.
 *
 * Die Seite bietet keine oeffentliche API. Wir verlinken deshalb direkt auf die
 * Pferdesuche bzw. – wenn beim Hengst eine konkrete URL hinterlegt ist – auf
 * dessen Pedigree-Seite. So bleibt der Stammbaum immer aktuell und wir kopieren
 * keine fremden Daten.
 */

const ALL_BREED_BASE = "https://www.allbreedpedigree.com";

/** Suchlink auf allbreedpedigree.com fuer einen Pferdenamen. */
export function allBreedSearchUrl(horseName: string): string {
  const name = horseName.trim();
  return `${ALL_BREED_BASE}/index.php?query_type=check_name&search_bar=horse&h=${encodeURIComponent(
    name,
  )}&hb=&x=0&y=0`;
}

/**
 * Bevorzugt die beim Hengst gespeicherte Pedigree-URL, sonst ein Suchlink.
 * Fremde URLs werden auf http/https geprueft, damit keine `javascript:`-Links
 * in der Seite landen koennen.
 */
export function allBreedUrlFor(
  horseName: string,
  storedUrl?: string | null,
): string {
  if (storedUrl) {
    try {
      const url = new URL(storedUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.toString();
      }
    } catch {
      /* ungueltige URL -> Suchlink verwenden */
    }
  }
  return allBreedSearchUrl(horseName);
}

export type PedigreeInput = {
  name: string;
  sireName?: string | null;
  sireSireName?: string | null;
  sireDamName?: string | null;
  damName?: string | null;
  damSireName?: string | null;
  damDamName?: string | null;
};

export type PedigreeNode = { name: string; kind: "sire" | "dam" } | null;

/** Baut die drei Generationen als Spalten fuer die Stammbaum-Anzeige. */
export function pedigreeColumns(s: PedigreeInput): PedigreeNode[][] {
  const node = (name: string | null | undefined, kind: "sire" | "dam") =>
    name && name.trim() ? { name: name.trim(), kind } : null;

  return [
    [node(s.sireName, "sire"), node(s.damName, "dam")],
    [
      node(s.sireSireName, "sire"),
      node(s.sireDamName, "dam"),
      node(s.damSireName, "sire"),
      node(s.damDamName, "dam"),
    ],
  ];
}

export function hasPedigree(s: PedigreeInput): boolean {
  return Boolean(s.sireName || s.damName);
}
