const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  CHF: "CHF",
  GBP: "£",
};

/** Decktaxe als lesbarer Text, z. B. "2.500 €" oder "Auf Anfrage". */
export function formatFee(
  studFee: number | null | undefined,
  currency: string,
  feeOnRequest: boolean,
): string {
  if (feeOnRequest || studFee == null) return "Decktaxe auf Anfrage";
  if (studFee === 0) return "Decktaxe auf Anfrage";

  const amount = new Intl.NumberFormat("de-DE").format(studFee);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return symbol.length === 1 ? `${amount} ${symbol}` : `${amount} ${symbol}`;
}

/** Stockmaß in Zentimetern und Hands, z. B. "155 cm (15.1 hh)". */
export function formatHeight(heightCm: number | null | undefined): string | null {
  if (!heightCm) return null;
  const totalInches = heightCm / 2.54;
  const hands = Math.floor(totalInches / 4);
  const remainder = Math.round(totalInches - hands * 4);
  // 4 Zoll Rest wuerden eine Hand mehr bedeuten.
  const [h, r] = remainder === 4 ? [hands + 1, 0] : [hands, remainder];
  return `${heightCm} cm (${h}.${r} hh)`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
