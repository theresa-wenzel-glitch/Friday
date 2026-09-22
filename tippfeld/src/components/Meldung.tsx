import { Symbol } from "./Symbol";
import type { Zustand } from "@/lib/aktionen";

/** Rückmeldung nach einer Aktion - immer im Klartext, nie nur als Farbe. */
export function Meldung({ zustand }: { zustand: Zustand }) {
  if (zustand.fehler) {
    return (
      <p className="band band--fehler" role="alert">
        <Symbol name="warnung" className="tf-symbol tf-symbol--klein" />
        <span>{zustand.fehler}</span>
      </p>
    );
  }
  if (zustand.ok) {
    return (
      <p className="band band--gut" role="status">
        <Symbol name="haken" className="tf-symbol tf-symbol--klein" />
        <span>{zustand.ok}</span>
      </p>
    );
  }
  return null;
}
