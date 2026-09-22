"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { ligaErstellen, type Zustand } from "@/lib/aktionen";
import { STANDARD_PUNKTESYSTEM, type Punktesystem } from "@/lib/punkte";
import { Meldung } from "./Meldung";

const ZEICHEN = ["zeichen-1", "zeichen-2", "zeichen-3", "zeichen-4", "zeichen-5", "zeichen-6"];

const PUNKTFELDER: Array<{ feld: string; schluessel: keyof Punktesystem; titel: string }> = [
  { feld: "p-exakt", schluessel: "exakt", titel: "Exaktes Ergebnis" },
  { feld: "p-differenz", schluessel: "differenz", titel: "Richtige Tordifferenz" },
  { feld: "p-tendenz", schluessel: "tendenz", titel: "Richtige Tendenz" },
  { feld: "p-falsch", schluessel: "falsch", titel: "Danebengelegen" },
  { feld: "p-spieler-tor", schluessel: "spielerTor", titel: "Getippter Spieler trifft" },
  { feld: "p-spieler-vorlage", schluessel: "spielerVorlage", titel: "Getippter Spieler legt auf" },
  { feld: "p-torwart", schluessel: "torwartZuNull", titel: "Torwart ohne Gegentor" },
];

export function LigaFormular({
  wettbewerbe,
  standard = STANDARD_PUNKTESYSTEM,
}: {
  wettbewerbe: Array<{ id: string; name: string; saison: string }>;
  standard?: Punktesystem;
}) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(ligaErstellen, {});
  const [oeffentlich, setOeffentlich] = useState(false);

  return (
    <form action={absenden} className="stapel stapel--weit">
      <div className="feld">
        <label htmlFor="name">Name der Liga</label>
        <input id="name" name="name" className="eingabe" maxLength={40} required placeholder="Büro-Tippliga" />
      </div>

      <div className="feld">
        <label htmlFor="beschreibung">Beschreibung</label>
        <textarea
          id="beschreibung"
          name="beschreibung"
          className="textfeld"
          maxLength={280}
          placeholder="Wer mitmacht, worum es geht, ab wann gezählt wird."
        />
      </div>

      <fieldset className="feldgruppe">
        <legend>Zeichen der Liga</legend>
        <div className="zeichenwahl">
          {ZEICHEN.map((z, i) => (
            <label key={z}>
              <input type="radio" name="zeichen" value={z} defaultChecked={i === 0} />
              <Image src={`/grafik/${z}.svg`} alt={`Zeichen ${i + 1}`} width={52} height={52} />
            </label>
          ))}
        </div>
        <p className="hilfe">Eigene, generische Grafiken. Vereinswappen sind bewusst nicht dabei.</p>
      </fieldset>

      <fieldset className="feldgruppe">
        <legend>Sichtbarkeit</legend>
        <div className="wahlreihe">
          <label className="wahl">
            <input
              type="radio"
              name="sichtbarkeit"
              value="privat"
              defaultChecked
              onChange={() => setOeffentlich(false)}
            />
            Privat, nur mit Code
          </label>
          <label className="wahl">
            <input
              type="radio"
              name="sichtbarkeit"
              value="oeffentlich"
              onChange={() => setOeffentlich(true)}
            />
            Öffentlich, für alle auffindbar
          </label>
        </div>
        <p className="hilfe">
          {oeffentlich
            ? "In der öffentlichen Übersicht erscheinen nur Liganame, Beschreibung, Wettbewerb und die Zahl der Mitglieder."
            : "Private Ligen findet nur, wer den Beitrittscode oder den QR-Code hat."}
        </p>
      </fieldset>

      <div className="feld">
        <label htmlFor="passcode">Zusätzliches Liga-Passwort (freiwillig)</label>
        <input
          id="passcode"
          name="passcode"
          className="eingabe"
          minLength={4}
          maxLength={40}
          autoComplete="off"
          placeholder="leer lassen, wenn der Code reicht"
        />
      </div>

      <div className="feld">
        <label htmlFor="wettbewerb">Wettbewerb</label>
        <select id="wettbewerb" name="wettbewerb" className="auswahl" required>
          {wettbewerbe.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} · {w.saison}
            </option>
          ))}
        </select>
      </div>

      <div className="feld">
        <label htmlFor="sprache">Sprache der Liga</label>
        <select id="sprache" name="sprache" className="auswahl" defaultValue="de">
          <option value="de">Deutsch</option>
          <option value="en">Englisch</option>
          <option value="tr">Türkisch</option>
          <option value="pl">Polnisch</option>
        </select>
      </div>

      <details className="tf-karte">
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Punktesystem anpassen</summary>
        <p className="hilfe">
          Die Ergebnisstufen zählen nicht zusammen: Es gilt immer nur die beste erreichte Stufe.
          Spielerpunkte kommen obendrauf.
        </p>
        <div className="kacheln">
          {PUNKTFELDER.map((p) => (
            <div className="feld" key={p.feld}>
              <label htmlFor={p.feld}>{p.titel}</label>
              <input
                id={p.feld}
                name={p.feld}
                className="eingabe tf-zahl"
                type="number"
                min={0}
                max={50}
                defaultValue={standard[p.schluessel]}
              />
            </div>
          ))}
        </div>
      </details>

      <button type="submit" className="tf-knopf tf-knopf--breit" disabled={laeuft}>
        {laeuft ? "Wird angelegt …" : "Liga gründen"}
      </button>
      <Meldung zustand={zustand} />
    </form>
  );
}
