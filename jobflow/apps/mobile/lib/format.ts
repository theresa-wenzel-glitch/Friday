/**
 * Anzeigeformate.
 *
 * Gerechnet wird überall in Cent - Gleitkommazahlen haben bei Geld nichts zu
 * suchen. Umgerechnet wird erst hier, unmittelbar vor der Anzeige.
 */
export function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function formatEuroShort(cents: number): string {
  return `${Math.round(cents / 100)} €`;
}

export function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
}

export function formatMinutes(minutes: number): string {
  return minutes < 60 ? `${Math.round(minutes)} Min.` : `${Math.round(minutes / 60)} Std.`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
