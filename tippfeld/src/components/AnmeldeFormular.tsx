"use client";

import { useActionState } from "react";
import { anmeldenAktion, type Zustand } from "@/lib/aktionen";
import { Meldung } from "./Meldung";

export function AnmeldeFormular() {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(anmeldenAktion, {});

  return (
    <form action={absenden} className="stapel">
      <div className="feld">
        <label htmlFor="name">Dein Anzeigename</label>
        <input
          id="name"
          name="name"
          className="eingabe"
          autoComplete="nickname"
          maxLength={24}
          required
          placeholder="zum Beispiel Mira"
        />
        <p className="hilfe">
          Unter diesem Namen tauchst du in den Ranglisten auf. Gibst du einen Namen ein, der es
          schon gibt, landest du in dessen Spielstand.
        </p>
      </div>
      <button type="submit" className="tf-knopf tf-knopf--breit" disabled={laeuft}>
        {laeuft ? "Einen Moment …" : "Loslegen"}
      </button>
      <Meldung zustand={zustand} />
    </form>
  );
}
