/*
 * Angaben zur verantwortlichen Person für Impressum und Datenschutz.
 * Sie kommen aus Umgebungsvariablen, damit sie beim Anbieter eingetragen
 * werden können, ohne den Code zu ändern.
 */
export interface Operator {
  name: string | null;
  /** Anschrift; Zeilen in der Variable mit "|" trennen. */
  address: string[];
  email: string | null;
}

export function getOperator(): Operator {
  const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
  return {
    name: clean(process.env.IMPRESSUM_NAME),
    address: (process.env.IMPRESSUM_ANSCHRIFT ?? "")
      .split("|")
      .map((l) => l.trim())
      .filter(Boolean),
    email: clean(process.env.IMPRESSUM_EMAIL),
  };
}

export function isOperatorComplete(o: Operator): boolean {
  return Boolean(o.name && o.address.length && o.email);
}
