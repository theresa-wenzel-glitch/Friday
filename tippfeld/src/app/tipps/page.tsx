import Link from "next/link";
import { DemoBand } from "@/components/DemoBand";
import { Kopfleiste } from "@/components/Kopfleiste";
import { Symbol } from "@/components/Symbol";
import { nutzerBilanz, tippHistorie } from "@/lib/abfragen";
import { nutzerErforderlich } from "@/lib/sitzung";
import { anstossKurz } from "@/lib/zeit";

export const dynamic = "force-dynamic";

function Haken({ erfuellt, titel }: { erfuellt: boolean; titel: string }) {
  return (
    <span className="reihe winzig" style={{ flexWrap: "nowrap", gap: 4 }}>
      <Symbol
        name={erfuellt ? "haken" : "kreuz"}
        className="tf-symbol tf-symbol--klein"
        style={{ color: erfuellt ? "var(--tf-sieg)" : "var(--tf-text-leise)" }}
      />
      <span className={erfuellt ? undefined : "leise"}>{titel}</span>
    </span>
  );
}

export default async function TippSeite() {
  const nutzer = await nutzerErforderlich();
  const bilanz = nutzerBilanz(nutzer.id);
  const historie = tippHistorie(nutzer.id, 60);

  const offen = historie.filter((h) => h.status !== "beendet");
  const gewertet = historie.filter((h) => h.status === "beendet");

  return (
    <>
      <Kopfleiste titel="Meine Tipps" />
      <main className="inhalt" id="inhalt">
        <DemoBand />

        <section>
          <div className="kacheln">
            <div className="kachel">
              <span className="tf-label">Punkte</span>
              <span className="kachel__wert tf-zahl">{bilanz.punkte}</span>
              <span className="winzig leise">davon {bilanz.spielerPunkte} aus Spielerauswahl</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Exakt</span>
              <span className="kachel__wert tf-zahl">{bilanz.exakte}</span>
              <span className="winzig leise">von {bilanz.tipps} gewerteten Tipps</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Tordifferenz</span>
              <span className="kachel__wert tf-zahl">{bilanz.differenzen}</span>
              <span className="winzig leise">Sieger und Differenz richtig</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Nur Tendenz</span>
              <span className="kachel__wert tf-zahl">{bilanz.tendenzen}</span>
              <span className="winzig leise">{bilanz.daneben} mal danebengelegen</span>
            </div>
          </div>
        </section>

        {offen.length > 0 ? (
          <section>
            <div className="abschnitt__kopf">
              <h2 className="abschnitt__titel">Läuft noch</h2>
            </div>
            <div className="stapel stapel--eng">
              {offen.map((eintrag) => (
                <Link key={eintrag.id} href={`/spiele/${eintrag.id}`} className="spielkarte">
                  <article className="tf-karte tf-karte--offen">
                    <div className="reihe reihe--verteilt">
                      <span className="klein">
                        {eintrag.heim.kuerzel} – {eintrag.gast.kuerzel}
                      </span>
                      <span className="tf-chip tf-chip--akzent tf-zahl">
                        {eintrag.tipp?.toreHeim}:{eintrag.tipp?.toreGast}
                      </span>
                    </div>
                    <span className="winzig leise">
                      Spieltag {eintrag.spieltag} · {anstossKurz(eintrag.anstoss)}
                    </span>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Ausgewertet</h2>
            <span className="klein leise">{gewertet.length} Spiele</span>
          </div>
          <div className="stapel stapel--eng">
            {gewertet.map((eintrag) => {
              const bewertung = eintrag.bewertung;
              const gesamt = (bewertung?.punkte ?? 0) + eintrag.spielerPunkte;
              return (
                <Link key={eintrag.id} href={`/spiele/${eintrag.id}`} className="spielkarte">
                  <article
                    className={`tf-karte ${
                      bewertung?.exakt
                        ? "tf-karte--sieg"
                        : bewertung?.tendenzRichtig
                          ? "tf-karte--remis"
                          : "tf-karte--niederlage"
                    }`}
                  >
                    <div className="reihe reihe--verteilt">
                      <span className="klein">
                        <strong>
                          {eintrag.heim.kuerzel} – {eintrag.gast.kuerzel}
                        </strong>
                        <br />
                        <span className="winzig leise">
                          Spieltag {eintrag.spieltag} · {anstossKurz(eintrag.anstoss)}
                        </span>
                      </span>
                      <span className="tf-chip tf-chip--sieg">
                        {gesamt === 1 ? "1 Punkt" : `${gesamt} Punkte`}
                      </span>
                    </div>

                    <div className="reihe reihe--verteilt klein tf-zahl">
                      <span>
                        Dein Tipp{" "}
                        <strong>
                          {eintrag.tipp?.toreHeim}:{eintrag.tipp?.toreGast}
                        </strong>
                      </span>
                      <span>
                        Ergebnis{" "}
                        <strong>
                          {eintrag.toreHeim}:{eintrag.toreGast}
                        </strong>
                      </span>
                    </div>

                    <div className="reihe">
                      <Haken erfuellt={Boolean(bewertung?.tendenzRichtig)} titel="Tendenz" />
                      <Haken erfuellt={Boolean(bewertung?.differenzRichtig)} titel="Tordifferenz" />
                      <Haken erfuellt={Boolean(bewertung?.exakt)} titel="Exakt" />
                      {eintrag.spielerPunkte > 0 ? (
                        <span className="tf-chip tf-chip--akzent">
                          +{eintrag.spielerPunkte} Spieler
                        </span>
                      ) : null}
                    </div>
                  </article>
                </Link>
              );
            })}
            {gewertet.length === 0 ? (
              <p className="leer">
                Noch nichts ausgewertet. Sobald die ersten getippten Spiele abgepfiffen sind,
                stehen die Punkte hier.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
