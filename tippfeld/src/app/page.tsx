import Link from "next/link";
import { DemoBand } from "@/components/DemoBand";
import { SpielKarte } from "@/components/SpielKarte";
import { Symbol } from "@/components/Symbol";
import { Wappen } from "@/components/Wappen";
import {
  aktuellerSpieltag,
  kiFuerSpiele,
  ligenVonNutzer,
  naechsteSpiele,
  nutzerBilanz,
  offeneTipps,
  spieltagSpiele,
} from "@/lib/abfragen";
import { nutzerErforderlich } from "@/lib/sitzung";
import { anstossKurz, verbleibend } from "@/lib/zeit";

export const dynamic = "force-dynamic";

export default async function StartSeite() {
  const nutzer = await nutzerErforderlich();
  const bilanz = nutzerBilanz(nutzer.id);
  const ligen = ligenVonNutzer(nutzer.id);
  const spieltag = aktuellerSpieltag();
  const kommende = naechsteSpiele(nutzer.id, 3);
  const offen = offeneTipps(nutzer.id, 3);
  const spieltagsSpiele = spieltagSpiele(spieltag, nutzer.id);
  const ki = kiFuerSpiele(kommende);

  const nochOffen = spieltagsSpiele.filter((s) => s.tippbar && !s.tipp).length;
  const stunde = new Date().getHours();
  const gruss = stunde < 5 ? "Gute Nacht" : stunde < 11 ? "Guten Morgen" : stunde < 18 ? "Hallo" : "Guten Abend";

  return (
    <>
      <header className="kopfleiste">
        <span className="marke-klein">
          <span className="marke-klein__zeichen" aria-hidden="true">
            <span className="marke-klein__punkt" />
          </span>
          <span>
            <span className="klein leise">{gruss},</span>
            <br />
            <strong>{nutzer.name}</strong>
          </span>
        </span>
        <Link href="/profil" className="kopfleiste__zurueck" aria-label="Profil öffnen">
          <Symbol name="profil" />
        </Link>
      </header>

      <main className="inhalt" id="inhalt">
        <DemoBand />

        <section>
          <div className="kacheln">
            <div className="kachel">
              <span className="tf-label">Punkte gesamt</span>
              <span className="kachel__wert tf-zahl">{bilanz.punkte}</span>
              <span className="winzig leise">aus {bilanz.tipps} gewerteten Tipps</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Exakte Ergebnisse</span>
              <span className="kachel__wert tf-zahl">{bilanz.exakte}</span>
              <span className="winzig leise">{bilanz.tendenzen + bilanz.differenzen} mal Tendenz richtig</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Offene Tipps</span>
              <span className="kachel__wert tf-zahl">{nochOffen}</span>
              <span className="winzig leise">an Spieltag {spieltag}</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Deine Ligen</span>
              <span className="kachel__wert tf-zahl">{ligen.length}</span>
              <span className="winzig leise">
                {ligen.length > 0 ? `beste Platzierung: ${Math.min(...ligen.map((l) => l.platz))}.` : "noch keine"}
              </span>
            </div>
          </div>
        </section>

        <nav aria-label="Schnellzugriff">
          <div className="schnellzugriff">
            <Link href="/spiele">
              <Symbol name="ball" />
              Spiele
            </Link>
            <Link href="/tipps">
              <Symbol name="prognose" />
              Meine Tipps
            </Link>
            <Link href="/ligen">
              <Symbol name="liga" />
              Ligen
            </Link>
            <Link href="/analyse">
              <Symbol name="ki-analyse" />
              KI-Analyse
            </Link>
          </div>
        </nav>

        {ligen.length > 0 ? (
          <section>
            <div className="abschnitt__kopf">
              <h2 className="abschnitt__titel">Deine Platzierungen</h2>
              <Link href="/ligen" className="abschnitt__mehr">
                Alle Ligen
              </Link>
            </div>
            <div className="stapel stapel--eng">
              {ligen.map((liga) => (
                <Link key={liga.id} href={`/ligen/${liga.id}`} className="spielkarte">
                  <article className="tf-karte">
                    <div className="reihe reihe--verteilt" style={{ flexWrap: "nowrap" }}>
                      <span className="reihe wachsen" style={{ flexWrap: "nowrap" }}>
                        <span className="tf-rangliste__platz">{liga.platz}.</span>
                        <span className="wachsen">
                          <strong>{liga.name}</strong>
                          <br />
                          <span className="winzig leise">
                            {liga.mitglieder} Mitglieder · {liga.oeffentlich ? "öffentlich" : "privat"}
                          </span>
                        </span>
                      </span>
                      <span className="tf-zahl" style={{ fontWeight: 600 }}>
                        {liga.punkte} Pkt
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section>
            <div className="leer">
              <strong>Noch keine Liga</strong>
              <p className="klein">Mit Freunden zu tippen macht mehr her als allein.</p>
              <div className="reihe">
                <Link href="/ligen/neu" className="tf-knopf">
                  Liga gründen
                </Link>
                <Link href="/ligen/beitreten" className="tf-knopf tf-knopf--zweit">
                  Code eingeben
                </Link>
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">
              {offen.length > 0 ? "Offene Tipps" : "Nächste Spiele"}
            </h2>
            <Link href={`/spiele?spieltag=${spieltag}`} className="abschnitt__mehr">
              Spieltag {spieltag}
            </Link>
          </div>
          <div className="stapel">
            {(offen.length > 0 ? offen : kommende).map((spiel) => (
              <SpielKarte key={spiel.id} spiel={spiel} />
            ))}
            {offen.length === 0 && kommende.length === 0 ? (
              <p className="leer">Zurzeit sind keine weiteren Spiele angesetzt.</p>
            ) : null}
          </div>
        </section>

        {kommende.length > 0 ? (
          <section>
            <div className="abschnitt__kopf">
              <h2 className="abschnitt__titel">KI-Einschätzung</h2>
              <Link href="/analyse" className="abschnitt__mehr">
                Alle ansehen
              </Link>
            </div>
            <article className="tf-karte">
              <p className="klein leise" style={{ margin: 0 }}>
                Statistische Prognose auf Basis von Form, Heim- und Auswärtsbilanz und Torstatistik.
                Keine Garantie für den Ausgang.
              </p>
              {kommende.map((spiel) => {
                const werte = ki.get(spiel.id);
                if (!werte) return null;
                const favorit =
                  werte.favorit === "heim"
                    ? spiel.heim
                    : werte.favorit === "gast"
                      ? spiel.gast
                      : null;
                const prozent =
                  werte.favorit === "heim"
                    ? werte.heimProzent
                    : werte.favorit === "gast"
                      ? werte.gastProzent
                      : werte.remisProzent;
                return (
                  <Link key={spiel.id} href={`/spiele/${spiel.id}`} className="tf-spieler spielkarte">
                    <Wappen kuerzel={favorit ? favorit.kuerzel : "X"} />
                    <span>
                      <span className="tf-spieler__name">
                        {spiel.heim.kuerzel} – {spiel.gast.kuerzel}
                      </span>
                      <br />
                      <span className="tf-spieler__rolle">
                        {favorit ? `leicht vorn: ${favorit.name}` : "ausgeglichen, Remis am häufigsten"}
                        {" · "}
                        {anstossKurz(spiel.anstoss)}
                      </span>
                    </span>
                    <span className="tf-spieler__wert">{prozent}&#8201;%</span>
                  </Link>
                );
              })}
            </article>
          </section>
        ) : null}

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Spieltag {spieltag}</h2>
            <Link href={`/spiele?spieltag=${spieltag}`} className="abschnitt__mehr">
              Alle {spieltagsSpiele.length} Spiele
            </Link>
          </div>
          <article className="tf-karte">
            <div className="reihe reihe--verteilt">
              <span className="klein">
                {spieltagsSpiele.filter((s) => s.status === "beendet").length} von{" "}
                {spieltagsSpiele.length} Spielen ausgewertet
              </span>
              <span className="tf-chip">
                {nochOffen > 0 ? `${nochOffen} Tipps offen` : "alles getippt"}
              </span>
            </div>
            {spieltagsSpiele[0] ? (
              <p className="winzig leise" style={{ margin: 0 }}>
                Erster Anpfiff: {anstossKurz(spieltagsSpiele[0].anstoss)}
                {spieltagsSpiele[0].tippbar
                  ? ` (${verbleibend(spieltagsSpiele[0].anstoss) ?? "gleich"})`
                  : ""}
              </p>
            ) : null}
          </article>
        </section>
      </main>
    </>
  );
}
