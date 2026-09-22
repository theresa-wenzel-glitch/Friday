"use client";

import { useActionState } from "react";
import Image from "next/image";
import { kontoLoeschen, profilSpeichern, type Zustand } from "@/lib/aktionen";
import { Meldung } from "./Meldung";
import type { Nutzer } from "@/lib/sitzung";

const ZEICHEN = ["zeichen-1", "zeichen-2", "zeichen-3", "zeichen-4", "zeichen-5", "zeichen-6"];

export function ProfilFormular({ nutzer }: { nutzer: Nutzer }) {
  const [zustand, absenden, laeuft] = useActionState<Zustand, FormData>(profilSpeichern, {});
  const [loeschZustand, loeschen, loeschtGerade] = useActionState<Zustand, FormData>(
    kontoLoeschen,
    {},
  );

  return (
    <div className="stapel stapel--weit">
      <form action={absenden} className="stapel stapel--weit">
        <div className="feld">
          <label htmlFor="name">Anzeigename</label>
          <input
            id="name"
            name="name"
            className="eingabe"
            defaultValue={nutzer.name}
            maxLength={24}
            required
          />
        </div>

        <fieldset className="feldgruppe">
          <legend>Profilbild</legend>
          <div className="zeichenwahl">
            {ZEICHEN.map((z, i) => (
              <label key={z}>
                <input type="radio" name="zeichen" value={z} defaultChecked={nutzer.zeichen === z} />
                <Image src={`/grafik/${z}.svg`} alt={`Zeichen ${i + 1}`} width={52} height={52} />
              </label>
            ))}
          </div>
          <p className="hilfe">Eigene geometrische Zeichen statt Fotos.</p>
        </fieldset>

        <fieldset className="feldgruppe">
          <legend>Darstellung</legend>
          <div className="wahlreihe">
            <label className="wahl">
              <input type="radio" name="thema" value="dunkel" defaultChecked={nutzer.thema === "dunkel"} />
              Dunkel
            </label>
            <label className="wahl">
              <input type="radio" name="thema" value="hell" defaultChecked={nutzer.thema === "hell"} />
              Hell
            </label>
            <label className="wahl">
              <input type="radio" name="thema" value="system" defaultChecked={nutzer.thema === "system"} />
              Wie das Gerät
            </label>
          </div>
        </fieldset>

        <div className="feld">
          <label htmlFor="sprache">Sprache</label>
          <select id="sprache" name="sprache" className="auswahl" defaultValue={nutzer.sprache}>
            <option value="de">Deutsch</option>
          </select>
          <p className="hilfe">
            Weitere Sprachen sind vorbereitet, aber noch nicht übersetzt. Die Auswahl steht hier
            erst, wenn es auch Texte dafür gibt.
          </p>
        </div>

        <fieldset className="feldgruppe">
          <legend>Benachrichtigungen</legend>
          <label className="wahl">
            <input
              type="checkbox"
              name="hinweise"
              value="an"
              defaultChecked={nutzer.hinweise === 1}
            />
            Erinnerung, wenn eine Tippfrist ausläuft
          </label>
          <p className="hilfe">
            Die Einstellung wird gespeichert. Versendet wird noch nichts - dafür fehlt der
            Versanddienst (siehe README).
          </p>
        </fieldset>

        <button type="submit" className="tf-knopf tf-knopf--breit" disabled={laeuft}>
          {laeuft ? "Wird gespeichert …" : "Einstellungen speichern"}
        </button>
        <Meldung zustand={zustand} />
      </form>

      <details className="tf-karte">
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Konto löschen</summary>
        <p className="klein leise">
          Dabei werden dein Konto, deine Tipps und deine Mitgliedschaften endgültig entfernt. Ligen,
          die du gegründet hast, gehen an ein verbliebenes Mitglied über oder werden aufgelöst.
        </p>
        <form action={loeschen} className="stapel">
          <div className="feld">
            <label htmlFor="bestaetigung">Tippe zur Bestätigung „{nutzer.name}“</label>
            <input id="bestaetigung" name="bestaetigung" className="eingabe" autoComplete="off" required />
          </div>
          <button type="submit" className="tf-knopf tf-knopf--zweit" disabled={loeschtGerade}>
            Konto endgültig löschen
          </button>
          <Meldung zustand={loeschZustand} />
        </form>
      </details>
    </div>
  );
}
