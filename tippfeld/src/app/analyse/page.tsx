import Link from "next/link";
import { DemoBand } from "@/components/DemoBand";
import { Kopfleiste } from "@/components/Kopfleiste";
import { Symbol } from "@/components/Symbol";
import { kiFuerSpiele, naechsteSpiele } from "@/lib/abfragen";
import { nutzerErforderlich } from "@/lib/sitzung";
import { anstossKurz } from "@/lib/zeit";

export const dynamic = "force-dynamic";

function Balken({ titel, wert, hervor }: { titel: string; wert: number; hervor: boolean }) {
  return (
    <div className="tf-balken">
      <span className="tf-label">{titel}</span>
      <span className="tf-balken__spur">
        <span
          className={`tf-balken__fuellung${hervor ? "" : " tf-balken__fuellung--leise"}`}
          style={{ width: `${wert}%` }}
        />
      </span>
      <span className="tf-balken__wert tf-zahl">{wert}&#8201;%</span>
    </div>
  );
}

export default async function AnalyseSeite() {
  const nutzer = await nutzerErforderlich();
  const spiele = naechsteSpiele(nutzer.id, 9);
  const ki = kiFuerSpiele(spiele);

  return (
    <>
      <Kopfleiste titel="KI-Analyse" zurueck="/" />
      <main className="inhalt" id="inhalt">
        <DemoBand />

        <article className="tf-karte">
          <div className="tf-karte__kopf">
            <span className="reihe">
              <Symbol name="ki-analyse" />
              <strong>So entsteht die Einschätzung</strong>
            </span>
          </div>
          <p className="klein" style={{ margin: 0 }}>
            Aus Tor- und Gegentorschnitt beider Mannschaften wird eine erwartete Torzahl geschätzt
            und über eine Poisson-Verteilung in Wahrscheinlichkeiten umgerechnet. Die Einschätzung
            beruht auf der aktuellen Form, der Heim- und Auswärtsbilanz und den vorliegenden
            Torstatistiken.
          </p>
          <p className="klein leise" style={{ margin: 0 }}>
            Es ist eine statistische Prognose, keine Vorhersage. Ausfälle, Aufstellungen und
            Tagesform stecken nicht in den Daten.
          </p>
        </article>

        <div className="stapel">
          {spiele.map((spiel) => {
            const werte = ki.get(spiel.id);
            if (!werte) return null;
            return (
              <Link key={spiel.id} href={`/spiele/${spiel.id}`} className="spielkarte">
                <article className="tf-karte">
                  <div className="tf-karte__kopf">
                    <span className="tf-label">
                      Spieltag {spiel.spieltag} · {anstossKurz(spiel.anstoss)}
                    </span>
                    <span className="tf-chip">Verlässlichkeit: {werte.verlaesslichkeit}</span>
                  </div>
                  <strong>
                    {spiel.heim.name} – {spiel.gast.name}
                  </strong>
                  <Balken titel="Heim" wert={werte.heimProzent} hervor={werte.favorit === "heim"} />
                  <Balken titel="Remis" wert={werte.remisProzent} hervor={werte.favorit === "remis"} />
                  <Balken titel="Gast" wert={werte.gastProzent} hervor={werte.favorit === "gast"} />
                </article>
              </Link>
            );
          })}
          {spiele.length === 0 ? (
            <p className="leer">Zurzeit stehen keine kommenden Spiele zur Analyse an.</p>
          ) : null}
        </div>
      </main>
    </>
  );
}
