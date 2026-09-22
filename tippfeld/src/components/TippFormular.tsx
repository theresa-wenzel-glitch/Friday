"use client";

import { useActionState, useState } from "react";
import { tippSpeichern, type Zustand } from "@/lib/aktionen";
import { Meldung } from "./Meldung";

type Props = {
  spielId: string;
  heimName: string;
  gastName: string;
  vorhanden: { toreHeim: number; toreGast: number } | null;
  offen: boolean;
};

function Zaehler({
  id,
  name,
  beschriftung,
  wert,
  setzen,
  gesperrt,
}: {
  id: string;
  name: string;
  beschriftung: string;
  wert: number;
  setzen: (n: number) => void;
  gesperrt: boolean;
}) {
  return (
    <div className="stapel stapel--eng" style={{ alignItems: "center" }}>
      <label htmlFor={id} className="tf-label">
        {beschriftung}
      </label>
      <div className="reihe" style={{ flexWrap: "nowrap" }}>
        <button
          type="button"
          className="tf-knopf tf-knopf--zweit"
          style={{ minWidth: 44, paddingInline: 0 }}
          onClick={() => setzen(Math.max(0, wert - 1))}
          disabled={gesperrt || wert <= 0}
          aria-label={`${beschriftung}: ein Tor weniger`}
        >
          −
        </button>
        <input
          id={id}
          name={name}
          className="tf-tipp__feld tf-zahl"
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          value={wert}
          disabled={gesperrt}
          onChange={(e) => {
            const n = Number(e.target.value);
            setzen(Number.isFinite(n) ? Math.min(20, Math.max(0, Math.trunc(n))) : 0);
          }}
        />
        <button
          type="button"
          className="tf-knopf tf-knopf--zweit"
          style={{ minWidth: 44, paddingInline: 0 }}
          onClick={() => setzen(Math.min(20, wert + 1))}
          disabled={gesperrt || wert >= 20}
          aria-label={`${beschriftung}: ein Tor mehr`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function TippFormular({ spielId, heimName, gastName, vorhanden, offen }: Props) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(tippSpeichern, {});
  const [heim, setHeim] = useState(vorhanden?.toreHeim ?? 1);
  const [gast, setGast] = useState(vorhanden?.toreGast ?? 1);

  if (!offen) {
    return (
      <div className="stapel">
        <p className="band">
          <span>
            <strong>Die Tippfrist ist abgelaufen.</strong>{" "}
            {vorhanden
              ? `Dein Tipp steht bei ${vorhanden.toreHeim}:${vorhanden.toreGast} und zählt so.`
              : "Für dieses Spiel liegt kein Tipp von dir vor."}
          </span>
        </p>
      </div>
    );
  }

  return (
    <form action={absenden} className="stapel">
      <input type="hidden" name="spielId" value={spielId} />
      <div className="reihe" style={{ justifyContent: "center", gap: "var(--tf-raum-5)" }}>
        <Zaehler
          id="toreHeim"
          name="toreHeim"
          beschriftung={`Tore ${heimName}`}
          wert={heim}
          setzen={setHeim}
          gesperrt={laeuft}
        />
        <Zaehler
          id="toreGast"
          name="toreGast"
          beschriftung={`Tore ${gastName}`}
          wert={gast}
          setzen={setGast}
          gesperrt={laeuft}
        />
      </div>
      <button type="submit" className="tf-knopf tf-knopf--breit" disabled={laeuft}>
        {laeuft ? "Wird gespeichert …" : vorhanden ? "Tipp ändern" : "Tipp abgeben"}
      </button>
      <Meldung zustand={zustand} />
    </form>
  );
}
