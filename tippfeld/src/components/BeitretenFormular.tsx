"use client";

import { useActionState, useState } from "react";
import { ligaBeitreten, type Zustand } from "@/lib/aktionen";
import { Meldung } from "./Meldung";
import { QrLeser } from "./QrLeser";

export function BeitretenFormular({ vorgabe = "" }: { vorgabe?: string }) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(ligaBeitreten, {});
  const [code, setCode] = useState(vorgabe);

  return (
    <div className="stapel stapel--weit">
      <form action={absenden} className="stapel">
        <div className="feld">
          <label htmlFor="code">Beitrittscode</label>
          <input
            id="code"
            name="code"
            className="eingabe tf-zahl"
            style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}
            maxLength={12}
            required
            autoCapitalize="characters"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC234"
          />
        </div>
        <div className="feld">
          <label htmlFor="passcode">Liga-Passwort, falls eines gesetzt ist</label>
          <input id="passcode" name="passcode" className="eingabe" autoComplete="off" />
        </div>
        <button type="submit" className="tf-knopf tf-knopf--breit" disabled={laeuft}>
          {laeuft ? "Einen Moment …" : "Liga beitreten"}
        </button>
        <Meldung zustand={zustand} />
      </form>

      <QrLeser beimLesen={(gelesen) => setCode(gelesen)} />
    </div>
  );
}
