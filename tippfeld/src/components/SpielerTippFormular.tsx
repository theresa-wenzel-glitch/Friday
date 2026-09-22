"use client";

import { useActionState } from "react";
import { spielerTippSpeichern, type Zustand } from "@/lib/aktionen";
import { POSITION_NAME, POSITIONEN, type Position } from "@/lib/datenquelle/typen";
import type { KaderSpieler } from "@/lib/abfragen";
import type { SpielerBewertung } from "@/lib/punkte";
import { Meldung } from "./Meldung";

type Props = {
  spielId: string;
  kader: KaderSpieler[];
  gewaehlt: Record<Position, string | null>;
  offen: boolean;
  heim: { id: string; name: string };
  gast: { id: string; name: string };
  bewertung: SpielerBewertung[];
};

const KLASSE: Record<Position, string> = {
  TW: "tf-position--tw",
  ABW: "tf-position--abw",
  MIT: "tf-position--mit",
  ANG: "tf-position--ang",
};

export function SpielerTippFormular({
  spielId,
  kader,
  gewaehlt,
  offen,
  heim,
  gast,
  bewertung,
}: Props) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(spielerTippSpeichern, {});

  const nachName = new Map(kader.map((k) => [k.id, k]));

  if (!offen) {
    const gesetzt = POSITIONEN.filter((p) => gewaehlt[p]);
    return (
      <div className="stapel">
        <p className="band">
          <span>
            <strong>Die Tippfrist ist abgelaufen.</strong> Die Spielerauswahl lässt sich nicht mehr ändern.
          </span>
        </p>
        {gesetzt.length === 0 ? (
          <p className="klein leise">Für dieses Spiel hast du keine Spieler ausgewählt.</p>
        ) : (
          <ul className="spielerliste" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {gesetzt.map((position) => {
              const spieler = nachName.get(gewaehlt[position]!);
              const punkte = bewertung.find((b) => b.position === position);
              return (
                <li key={position} className="tf-spieler">
                  <span className={`tf-position ${KLASSE[position]}`}>{position}</span>
                  <span>
                    <span className="tf-spieler__name">{spieler?.name ?? "unbekannt"}</span>
                    <br />
                    <span className="tf-spieler__rolle">
                      {punkte ? punkte.begruendung : spieler?.mannschaftName}
                    </span>
                  </span>
                  <span className="tf-spieler__wert">{punkte ? `+${punkte.punkte}` : "–"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <form action={absenden} className="stapel">
      <input type="hidden" name="spielId" value={spielId} />
      {POSITIONEN.map((position) => {
        const auswahl = kader.filter((k) => k.position === position);
        const heimSpieler = auswahl.filter((k) => k.mannschaftId === heim.id);
        const gastSpieler = auswahl.filter((k) => k.mannschaftId === gast.id);
        return (
          <div className="feld" key={position}>
            <label htmlFor={`spieler-${position}`}>
              {POSITION_NAME[position]}
            </label>
            <select
              id={`spieler-${position}`}
              name={`spieler-${position}`}
              className="auswahl"
              defaultValue={gewaehlt[position] ?? ""}
              disabled={laeuft}
            >
              <option value="">Keine Auswahl</option>
              <optgroup label={heim.name}>
                {heimSpieler.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nummer} · {s.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label={gast.name}>
                {gastSpieler.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nummer} · {s.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        );
      })}
      <p className="hilfe">
        Je Position genau eine Person, aus einer der beiden Mannschaften. Du kannst die Auswahl bis
        zum Anpfiff ändern.
      </p>
      <button type="submit" className="tf-knopf tf-knopf--breit" disabled={laeuft}>
        {laeuft ? "Wird gespeichert …" : "Spielerauswahl speichern"}
      </button>
      <Meldung zustand={zustand} />
    </form>
  );
}
