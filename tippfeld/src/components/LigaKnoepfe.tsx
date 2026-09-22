"use client";

import { useActionState } from "react";
import { ligaMelden, ligaSichtbarkeit, ligaVerlassen, type Zustand } from "@/lib/aktionen";
import { Meldung } from "./Meldung";
import { Symbol } from "./Symbol";

export function SichtbarkeitKnopf({ ligaId, oeffentlich }: { ligaId: number; oeffentlich: boolean }) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(ligaSichtbarkeit, {});
  return (
    <div className="stapel stapel--eng">
      <form action={absenden}>
        <input type="hidden" name="ligaId" value={ligaId} />
        <button type="submit" className="tf-knopf tf-knopf--zweit" disabled={laeuft}>
          {oeffentlich ? "Liga wieder privat stellen" : "Liga öffentlich machen"}
        </button>
      </form>
      <Meldung zustand={zustand} />
    </div>
  );
}

export function VerlassenKnopf({ ligaId, istGruender }: { ligaId: number; istGruender: boolean }) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(ligaVerlassen, {});
  return (
    <details className="tf-karte">
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>Liga verlassen</summary>
      <p className="klein leise">
        Deine Tipps bleiben erhalten, sie zählen in dieser Liga aber nicht mehr.
        {istGruender
          ? " Da du die Liga gegründet hast, übernimmt das dienstälteste verbliebene Mitglied. Bist du allein, wird die Liga aufgelöst."
          : ""}
      </p>
      <form action={absenden}>
        <input type="hidden" name="ligaId" value={ligaId} />
        <button type="submit" className="tf-knopf tf-knopf--zweit" disabled={laeuft}>
          Ja, Liga verlassen
        </button>
      </form>
      <Meldung zustand={zustand} />
    </details>
  );
}

export function MeldeFormular({ ligaId }: { ligaId: number }) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(ligaMelden, {});
  return (
    <details className="tf-karte">
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>
        <Symbol name="warnung" className="tf-symbol tf-symbol--klein" /> Liga melden
      </summary>
      <p className="klein leise">
        Beleidigende Namen, Werbung oder Ähnliches kannst du hier der Moderation melden.
      </p>
      <form action={absenden} className="stapel">
        <input type="hidden" name="ligaId" value={ligaId} />
        <div className="feld">
          <label htmlFor={`grund-${ligaId}`}>Was stimmt nicht?</label>
          <textarea id={`grund-${ligaId}`} name="grund" className="textfeld" maxLength={500} required />
        </div>
        <button type="submit" className="tf-knopf tf-knopf--zweit" disabled={laeuft}>
          Meldung abschicken
        </button>
        <Meldung zustand={zustand} />
      </form>
    </details>
  );
}
