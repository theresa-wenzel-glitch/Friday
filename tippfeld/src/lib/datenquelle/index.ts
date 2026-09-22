import { demoQuelle } from "./demo";
import type { Datenquelle } from "./typen";

/*
 * Register aller verfügbaren Datenquellen. Eine lizenzierte Fußball-API wird
 * hier eingetragen und über die Umgebungsvariable DATENQUELLE ausgewählt.
 */
const quellen: Record<string, Datenquelle> = {
  [demoQuelle.kennung]: demoQuelle,
};

export function aktiveQuelle(): Datenquelle {
  const gewuenscht = process.env.DATENQUELLE?.trim() || "demo";
  const quelle = quellen[gewuenscht];
  if (!quelle) {
    throw new Error(
      `Unbekannte Datenquelle "${gewuenscht}". Verfügbar: ${Object.keys(quellen).join(", ")}`,
    );
  }
  return quelle;
}

export { demoQuelle };
export * from "./typen";
