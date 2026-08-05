import type { MarketStats } from "@/lib/marketplace-db";

/**
 * Statistik-Kopfzeile im DreamQuarters-Stil - aber alle Zahlen kommen live
 * aus COUNT(*)-Abfragen, keine erfundenen Marketingwerte. Kacheln mit 0
 * werden ausgeblendet, damit ein junger Bestand nicht leer/kaputt aussieht.
 */
export function MarketStatsBar({ stats }: { stats: MarketStats }) {
  const tiles: { label: string; value: number }[] = [
    { label: "Inserate online", value: stats.listingsOnline },
    { label: "Deckhengste", value: stats.studListings },
    { label: "Anbieter", value: stats.providers },
  ].filter((t) => t.value > 0);

  if (tiles.length === 0) return null;

  return (
    <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
      {tiles.map((t) => (
        <div key={t.label} className="stat-tile">
          <p className="stat-value">{t.value}</p>
          <p className="stat-label">{t.label}</p>
        </div>
      ))}
    </div>
  );
}
