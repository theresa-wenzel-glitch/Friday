// Kombinierende Akzente (nach NFD-Zerlegung) und die diversen Apostroph-Varianten,
// die in amerikanischen Pferdenamen vorkommen: Doc O'Lena, Doc O´Lena, Doc O’Lena.
const COMBINING_MARKS = /[̀-ͯ]/g;
const APOSTROPHES = /['‘’`´]/g;

/** Erzeugt einen URL-tauglichen Bezeichner aus einem Pferdenamen. */
export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "pferd";
}

/**
 * Normalisierte Form eines Pferdenamens für den Abgleich von Abstammungen.
 * "Doc O'Lena", "doc o lena" und "DOC O´LENA" ergeben denselben Schlüssel.
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
