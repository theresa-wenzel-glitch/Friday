/**
 * Verlinkung zu allbreedpedigree.com.
 *
 * Die Seite hat keine offizielle Schnittstelle, deshalb wird bewusst nur ein
 * Suchlink erzeugt statt Daten zu importieren. Wer einen Datensatz einträgt,
 * kann alternativ die konkrete Pferdeseite als `allbreedUrl` hinterlegen -
 * die hat dann Vorrang.
 */
const SEARCH_BASE = "https://www.allbreedpedigree.com/index.php";

export function allbreedSearchUrl(name: string): string {
  const params = new URLSearchParams({ rk: "0", hn: name, h: "", inbred: "" });
  return `${SEARCH_BASE}?${params.toString()}`;
}

export function allbreedUrlFor(horse: {
  name: string;
  allbreedUrl: string | null;
}): string {
  return horse.allbreedUrl?.trim() || allbreedSearchUrl(horse.name);
}

/** Nur https-Links auf allbreedpedigree.com werden als Direktlink akzeptiert. */
export function isValidAllbreedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "allbreedpedigree.com" ||
        url.hostname.endsWith(".allbreedpedigree.com"))
    );
  } catch {
    return false;
  }
}
