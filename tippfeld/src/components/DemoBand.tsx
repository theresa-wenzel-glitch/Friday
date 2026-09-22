import { aktiveQuelle } from "@/lib/datenquelle";
import { Symbol } from "./Symbol";

/**
 * Steht auf jeder Hauptseite, solange keine lizenzierte Datenquelle
 * angeschlossen ist. Die App gibt Übungsdaten nie als echte Daten aus.
 */
export function DemoBand() {
  const quelle = aktiveQuelle();
  if (!quelle.istDemo) return null;
  return (
    <p className="band band--demo">
      <Symbol name="warnung" className="tf-symbol tf-symbol--klein" />
      <span>
        <strong>Demo-Daten.</strong> Spielpläne, Ergebnisse und Spielernamen sind ausgedacht und
        keine Live-Daten.
      </span>
    </p>
  );
}
