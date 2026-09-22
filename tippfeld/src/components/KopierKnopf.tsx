"use client";

import { useState } from "react";
import { Symbol } from "./Symbol";

/** Kopiert Text in die Zwischenablage. Ohne Zwischenablage bleibt der Text markierbar. */
export function KopierKnopf({ text, beschriftung }: { text: string; beschriftung: string }) {
  const [kopiert, setKopiert] = useState(false);
  const [fehler, setFehler] = useState(false);

  return (
    <button
      type="button"
      className="tf-knopf tf-knopf--zweit"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setKopiert(true);
          setFehler(false);
          setTimeout(() => setKopiert(false), 2500);
        } catch {
          setFehler(true);
        }
      }}
    >
      <Symbol name={kopiert ? "haken" : "kopieren"} className="tf-symbol tf-symbol--klein" />
      {fehler ? "Bitte von Hand kopieren" : kopiert ? "Kopiert" : beschriftung}
    </button>
  );
}
