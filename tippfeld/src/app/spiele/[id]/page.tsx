import { notFound } from "next/navigation";
import { DemoBand } from "@/components/DemoBand";
import { FormReihe } from "@/components/FormReihe";
import { Kopfleiste } from "@/components/Kopfleiste";
import { SpielerTippFormular } from "@/components/SpielerTippFormular";
import { Symbol } from "@/components/Symbol";
import { TippFormular } from "@/components/TippFormular";
import { Wappen } from "@/components/Wappen";
import { spielDetail } from "@/lib/abfragen";
import { nutzerErforderlich } from "@/lib/sitzung";
import { anstossLang, verbleibend } from "@/lib/zeit";

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

export default async function SpielSeite({ params }: { params: Promise<{ id: string }> }) {
  const nutzer = await nutzerErforderlich();
  const { id } = await params;
  const detail = spielDetail(id, nutzer.id);
  if (!detail) notFound();

  const { spiel, heimForm, gastForm, ki, kader, spielerTipps, spielerBewertung, torschuetzen } = detail;
  const beendet = spiel.status === "beendet" && spiel.toreHeim !== null;
  const rest = verbleibend(spiel.anstoss);
  const spielerPunkte = spielerBewertung.reduce((s, b) => s + b.punkte, 0);

  return (
    <>
      <Kopfleiste titel={`${spiel.heim.kuerzel} – ${spiel.gast.kuerzel}`} zurueck={`/spiele?spieltag=${spiel.spieltag}`} />
      <main className="inhalt" id="inhalt">
        <DemoBand />

        {/* --- Kopf des Spiels --- */}
        <article className="tf-karte">
          <div className="tf-karte__kopf">
            <span className="tf-label">
              {spiel.wettbewerb.name} · Spieltag {spiel.spieltag}
            </span>
            <span
              className={`tf-chip ${
                beendet ? "" : spiel.status === "laeuft" ? "tf-chip--remis" : "tf-chip--akzent"
              }`}
            >
              {beendet
                ? "beendet"
                : spiel.status === "laeuft"
                  ? "läuft gerade"
                  : rest
                    ? `Anpfiff ${rest}`
                    : "Frist abgelaufen"}
            </span>
          </div>
          <p className="klein leise" style={{ margin: 0 }}>
            {anstossLang(spiel.anstoss)}
          </p>

          <div className="tf-spiel">
            <div className={`tf-spiel__zeile${beendet && spiel.toreHeim! > spiel.toreGast! ? " tf-spiel__zeile--vorn" : ""}`}>
              <Wappen kuerzel={spiel.heim.kuerzel} gross />
              <span className="tf-spiel__block">
                <span className="tf-mannschaft__name">{spiel.heim.name}</span>
                <FormReihe form={heimForm.letzte} titel={`Form ${spiel.heim.name}`} />
              </span>
              {beendet ? <span className="tf-spiel__tore">{spiel.toreHeim}</span> : <span className="tf-label">Heim</span>}
            </div>
            <div className={`tf-spiel__zeile${beendet && spiel.toreGast! > spiel.toreHeim! ? " tf-spiel__zeile--vorn" : ""}`}>
              <Wappen kuerzel={spiel.gast.kuerzel} gross />
              <span className="tf-spiel__block">
                <span className="tf-mannschaft__name">{spiel.gast.name}</span>
                <FormReihe form={gastForm.letzte} titel={`Form ${spiel.gast.name}`} />
              </span>
              {beendet ? <span className="tf-spiel__tore">{spiel.toreGast}</span> : <span className="tf-label">Gast</span>}
            </div>
          </div>

          {beendet && spiel.bewertung ? (
            <p
              className={`band ${
                spiel.bewertung.exakt ? "band--gut" : spiel.bewertung.tendenzRichtig ? "" : "band--fehler"
              }`}
            >
              <Symbol
                name={spiel.bewertung.tendenzRichtig ? "haken" : "kreuz"}
                className="tf-symbol tf-symbol--klein"
              />
              <span>
                Dein Tipp {spiel.tipp?.toreHeim}:{spiel.tipp?.toreGast} – {spiel.bewertung.begruendung}
                {spielerPunkte > 0 ? ` Dazu ${spielerPunkte} Punkte aus der Spielerauswahl.` : ""}
              </span>
            </p>
          ) : null}
        </article>

        {/* --- Torschützen --- */}
        {beendet && torschuetzen.length > 0 ? (
          <section>
            <div className="abschnitt__kopf">
              <h2 className="abschnitt__titel">Tore</h2>
            </div>
            <article className="tf-karte">
              <ul className="torliste" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {torschuetzen
                  .filter((t) => t.art === "tor")
                  .map((t, i) => (
                    <li key={i}>
                      <span className="minute">{t.minute}.</span>
                      <Symbol name="tor" className="tf-symbol tf-symbol--klein" />
                      <span>
                        {t.name}{" "}
                        <span className="leise winzig">
                          ({t.mannschaftId === spiel.heim.id ? spiel.heim.kuerzel : spiel.gast.kuerzel})
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            </article>
          </section>
        ) : null}

        {/* --- Dein Tipp --- */}
        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Dein Tipp</h2>
          </div>
          <article className="tf-karte">
            <TippFormular
              spielId={spiel.id}
              heimName={spiel.heim.name}
              gastName={spiel.gast.name}
              vorhanden={spiel.tipp}
              offen={spiel.tippbar}
            />
          </article>
        </section>

        {/* --- Spieler des Spiels --- */}
        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Spieler des Spiels</h2>
          </div>
          <article className="tf-karte">
            <p className="klein leise" style={{ margin: 0 }}>
              Je Position eine Person. Die Auswertung erfolgt nach dem Spiel anhand der Daten aus
              der angeschlossenen Datenquelle.
            </p>
            <SpielerTippFormular
              spielId={spiel.id}
              kader={kader}
              gewaehlt={spielerTipps}
              offen={spiel.tippbar}
              heim={{ id: spiel.heim.id, name: spiel.heim.name }}
              gast={{ id: spiel.gast.id, name: spiel.gast.name }}
              bewertung={spielerBewertung}
            />
          </article>
        </section>

        {/* --- KI-Analyse --- */}
        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">KI-Analyse</h2>
            <span className="tf-chip">Verlässlichkeit: {ki.verlaesslichkeit}</span>
          </div>
          <article className="tf-karte">
            <span className="reihe">
              <Symbol name="ki-analyse" />
              <strong>Statistische Prognose</strong>
            </span>

            <Balken titel="Heim" wert={ki.heimProzent} hervor={ki.heimProzent >= ki.gastProzent && ki.heimProzent >= ki.remisProzent} />
            <Balken titel="Remis" wert={ki.remisProzent} hervor={ki.remisProzent > ki.heimProzent && ki.remisProzent > ki.gastProzent} />
            <Balken titel="Gast" wert={ki.gastProzent} hervor={ki.gastProzent > ki.heimProzent && ki.gastProzent >= ki.remisProzent} />

            <p className="klein" style={{ margin: 0 }}>
              Erwartete Tore: <strong className="tf-zahl">{ki.erwarteteToreHeim.toFixed(2).replace(".", ",")}</strong>{" "}
              für {spiel.heim.kuerzel},{" "}
              <strong className="tf-zahl">{ki.erwarteteToreGast.toFixed(2).replace(".", ",")}</strong>{" "}
              für {spiel.gast.kuerzel}.
            </p>

            <div>
              <span className="tf-label">Häufigste Ergebnisse</span>
              <div className="reihe">
                {ki.haeufigsteErgebnisse.map((e) => (
                  <span key={`${e.toreHeim}-${e.toreGast}`} className="tf-chip">
                    {e.toreHeim}:{e.toreGast} · {String(e.prozent).replace(".", ",")}&#8201;%
                  </span>
                ))}
              </div>
            </div>

            <div className="vergleich">
              <span className="vergleich__heim">{spiel.heim.kuerzel}</span>
              <span className="vergleich__gast">{spiel.gast.kuerzel}</span>
              {ki.faktoren.map((f) => (
                <div key={f.titel} style={{ display: "contents" }}>
                  <span className="vergleich__titel">{f.titel}</span>
                  <span className="vergleich__hinweis">{f.hinweis}</span>
                  <span className="vergleich__heim klein">{f.heim}</span>
                  <span className="vergleich__gast klein">{f.gast}</span>
                </div>
              ))}
            </div>

            <div>
              <span className="tf-label">Mögliche Einflussfaktoren</span>
              <ul className="aufzaehlung">
                {ki.einflussfaktoren.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>

            <div>
              <span className="tf-label">Unsicherheiten</span>
              <ul className="aufzaehlung">
                {ki.unsicherheiten.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>

            <p className="band">
              <Symbol name="warnung" className="tf-symbol tf-symbol--klein" />
              <span>
                {ki.erklaerung} {ki.methode}
              </span>
            </p>
          </article>
        </section>

        {/* --- Mannschaftsdaten --- */}
        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Zahlen zur Saison</h2>
          </div>
          <article className="tf-karte">
            <div className="vergleich">
              <span className="vergleich__heim">{spiel.heim.name}</span>
              <span className="vergleich__gast">{spiel.gast.name}</span>

              <span className="vergleich__titel">Spiele · Siege / Unentschieden / Niederlagen</span>
              <span className="vergleich__heim klein tf-zahl">
                {heimForm.gesamt.spiele} · {heimForm.gesamt.siege}/{heimForm.gesamt.remis}/{heimForm.gesamt.niederlagen}
              </span>
              <span className="vergleich__gast klein tf-zahl">
                {gastForm.gesamt.spiele} · {gastForm.gesamt.siege}/{gastForm.gesamt.remis}/{gastForm.gesamt.niederlagen}
              </span>

              <span className="vergleich__titel">Erzielte Tore</span>
              <span className="vergleich__heim klein tf-zahl">{heimForm.gesamt.toreFuer}</span>
              <span className="vergleich__gast klein tf-zahl">{gastForm.gesamt.toreFuer}</span>

              <span className="vergleich__titel">Kassierte Tore</span>
              <span className="vergleich__heim klein tf-zahl">{heimForm.gesamt.toreGegen}</span>
              <span className="vergleich__gast klein tf-zahl">{gastForm.gesamt.toreGegen}</span>

              <span className="vergleich__titel">In dieser Rolle</span>
              <span className="vergleich__hinweis">Nur Heimspiele der Heimelf, nur Auswärtsspiele der Gäste.</span>
              <span className="vergleich__heim klein tf-zahl">
                {heimForm.heim.spiele} Heimspiele, {heimForm.heim.toreFuer}:{heimForm.heim.toreGegen}
              </span>
              <span className="vergleich__gast klein tf-zahl">
                {gastForm.auswaerts.spiele} auswärts, {gastForm.auswaerts.toreFuer}:{gastForm.auswaerts.toreGegen}
              </span>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}
