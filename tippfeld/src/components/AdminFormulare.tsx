"use client";

import { useActionState } from "react";
import {
  abgleichStarten,
  adminAnmeldenAktion,
  ergebnisSpeichern,
  ligaSperren,
  meldungErledigen,
  standardPunktesystemSpeichern,
  type Zustand,
} from "@/lib/aktionen";
import type { Punktesystem } from "@/lib/punkte";
import { Meldung } from "./Meldung";
import { Symbol } from "./Symbol";

export function AdminAnmeldung() {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(adminAnmeldenAktion, {});
  return (
    <form action={absenden} className="stapel">
      <div className="feld">
        <label htmlFor="passwort">Admin-Passwort</label>
        <input
          id="passwort"
          name="passwort"
          type="password"
          className="eingabe"
          autoComplete="current-password"
          required
        />
        <p className="hilfe">Steht in der Datei .env.local unter ADMIN_PASSWORT.</p>
      </div>
      <button type="submit" className="tf-knopf tf-knopf--breit" disabled={laeuft}>
        Anmelden
      </button>
      <Meldung zustand={zustand} />
    </form>
  );
}

export function AbgleichKnopf() {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(async () => abgleichStarten(), {});
  return (
    <div className="stapel stapel--eng">
      <form action={absenden}>
        <button type="submit" className="tf-knopf tf-knopf--zweit" disabled={laeuft}>
          <Symbol name="datenquelle" className="tf-symbol tf-symbol--klein" />
          {laeuft ? "Läuft …" : "Jetzt mit der Datenquelle abgleichen"}
        </button>
      </form>
      <Meldung zustand={zustand} />
    </div>
  );
}

export function ErgebnisFormular({
  spielId,
  heim,
  gast,
  status,
  toreHeim,
  toreGast,
  korrigiert,
}: {
  spielId: string;
  heim: string;
  gast: string;
  status: string;
  toreHeim: number | null;
  toreGast: number | null;
  korrigiert: boolean;
}) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(ergebnisSpeichern, {});
  return (
    <form action={absenden} className="stapel stapel--eng">
      <input type="hidden" name="spielId" value={spielId} />
      <div className="reihe reihe--verteilt">
        <span className="klein wachsen">
          {heim} – {gast}
          {korrigiert ? <span className="tf-chip tf-chip--akzent">von Hand gesetzt</span> : null}
        </span>
      </div>
      <div className="reihe" style={{ flexWrap: "nowrap" }}>
        <label className="versteckt" htmlFor={`h-${spielId}`}>
          Tore {heim}
        </label>
        <input
          id={`h-${spielId}`}
          name="toreHeim"
          type="number"
          min={0}
          max={20}
          className="tf-tipp__feld tf-zahl"
          defaultValue={toreHeim ?? ""}
        />
        <span aria-hidden="true">:</span>
        <label className="versteckt" htmlFor={`g-${spielId}`}>
          Tore {gast}
        </label>
        <input
          id={`g-${spielId}`}
          name="toreGast"
          type="number"
          min={0}
          max={20}
          className="tf-tipp__feld tf-zahl"
          defaultValue={toreGast ?? ""}
        />
        <label className="versteckt" htmlFor={`s-${spielId}`}>
          Status
        </label>
        <select id={`s-${spielId}`} name="status" className="auswahl" defaultValue={status}>
          <option value="geplant">geplant</option>
          <option value="laeuft">läuft</option>
          <option value="beendet">beendet</option>
          <option value="abgesagt">abgesagt</option>
        </select>
        <button type="submit" className="tf-knopf tf-knopf--zweit" disabled={laeuft}>
          Sichern
        </button>
      </div>
      <Meldung zustand={zustand} />
    </form>
  );
}

const PUNKTFELDER: Array<{ feld: string; schluessel: keyof Punktesystem; titel: string }> = [
  { feld: "p-exakt", schluessel: "exakt", titel: "Exaktes Ergebnis" },
  { feld: "p-differenz", schluessel: "differenz", titel: "Richtige Tordifferenz" },
  { feld: "p-tendenz", schluessel: "tendenz", titel: "Richtige Tendenz" },
  { feld: "p-falsch", schluessel: "falsch", titel: "Danebengelegen" },
  { feld: "p-spieler-tor", schluessel: "spielerTor", titel: "Spieler trifft" },
  { feld: "p-spieler-vorlage", schluessel: "spielerVorlage", titel: "Spieler legt auf" },
  { feld: "p-torwart", schluessel: "torwartZuNull", titel: "Torwart ohne Gegentor" },
];

export function PunktesystemFormular({ standard }: { standard: Punktesystem }) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(
    standardPunktesystemSpeichern,
    {},
  );
  return (
    <form action={absenden} className="stapel">
      <div className="kacheln">
        {PUNKTFELDER.map((p) => (
          <div className="feld" key={p.feld}>
            <label htmlFor={`admin-${p.feld}`}>{p.titel}</label>
            <input
              id={`admin-${p.feld}`}
              name={p.feld}
              type="number"
              min={0}
              max={50}
              className="eingabe tf-zahl"
              defaultValue={standard[p.schluessel]}
            />
          </div>
        ))}
      </div>
      <p className="hilfe">
        Gilt für neu gegründete Ligen. Bestehende Ligen behalten das System, mit dem sie angelegt
        wurden - sonst würden sich ihre Ranglisten rückwirkend ändern.
      </p>
      <button type="submit" className="tf-knopf tf-knopf--zweit" disabled={laeuft}>
        Standard speichern
      </button>
      <Meldung zustand={zustand} />
    </form>
  );
}

export function SperrFormular({
  ligaId,
  gesperrt,
  name,
}: {
  ligaId: number;
  gesperrt: boolean;
  name: string;
}) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(ligaSperren, {});
  return (
    <form action={absenden} className="stapel stapel--eng">
      <input type="hidden" name="ligaId" value={ligaId} />
      <div className="reihe" style={{ flexWrap: "nowrap" }}>
        <label className="versteckt" htmlFor={`grund-${ligaId}`}>
          Grund für die Sperre von {name}
        </label>
        <input
          id={`grund-${ligaId}`}
          name="grund"
          className="eingabe"
          placeholder={gesperrt ? "" : "Grund"}
          disabled={gesperrt}
        />
        <button type="submit" className="tf-knopf tf-knopf--zweit" disabled={laeuft}>
          {gesperrt ? "Entsperren" : "Sperren"}
        </button>
      </div>
      <Meldung zustand={zustand} />
    </form>
  );
}

export function MeldungKnopf({ meldungId }: { meldungId: number }) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(meldungErledigen, {});
  return (
    <form action={absenden}>
      <input type="hidden" name="meldungId" value={meldungId} />
      <button type="submit" className="tf-knopf tf-knopf--leise" disabled={laeuft}>
        <Symbol name="haken" className="tf-symbol tf-symbol--klein" />
        Erledigt
      </button>
      <Meldung zustand={zustand} />
    </form>
  );
}
