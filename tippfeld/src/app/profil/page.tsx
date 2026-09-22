import Image from "next/image";
import Link from "next/link";
import { DemoBand } from "@/components/DemoBand";
import { Kopfleiste } from "@/components/Kopfleiste";
import { ProfilFormular } from "@/components/ProfilFormular";
import { Symbol } from "@/components/Symbol";
import { abmeldenAktion } from "@/lib/aktionen";
import { ligenVonNutzer, nutzerBilanz } from "@/lib/abfragen";
import { aktiveQuelle } from "@/lib/datenquelle";
import { nutzerErforderlich } from "@/lib/sitzung";
import { datum } from "@/lib/zeit";

export const dynamic = "force-dynamic";

export default async function ProfilSeite() {
  const nutzer = await nutzerErforderlich();
  const bilanz = nutzerBilanz(nutzer.id);
  const ligen = ligenVonNutzer(nutzer.id);
  const quelle = aktiveQuelle();
  const treffer = bilanz.tipps > 0 ? Math.round(((bilanz.tipps - bilanz.daneben) / bilanz.tipps) * 100) : 0;

  return (
    <>
      <Kopfleiste titel="Profil" />
      <main className="inhalt" id="inhalt">
        <DemoBand />

        <article className="tf-karte">
          <div className="reihe">
            <Image src={`/grafik/${nutzer.zeichen}.svg`} alt="" width={56} height={56} />
            <span className="wachsen">
              <strong style={{ fontSize: "var(--tf-size-l)" }}>{nutzer.name}</strong>
              <br />
              <span className="winzig leise">dabei seit {datum(nutzer.erstellt)}</span>
            </span>
          </div>
          <div className="kacheln">
            <div className="kachel">
              <span className="tf-label">Punkte</span>
              <span className="kachel__wert tf-zahl">{bilanz.punkte}</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Exakte Tipps</span>
              <span className="kachel__wert tf-zahl">{bilanz.exakte}</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Tendenz getroffen</span>
              <span className="kachel__wert tf-zahl">{treffer}&#8201;%</span>
              <span className="winzig leise">aus {bilanz.tipps} Tipps</span>
            </div>
            <div className="kachel">
              <span className="tf-label">Ligen</span>
              <span className="kachel__wert tf-zahl">{ligen.length}</span>
            </div>
          </div>
        </article>

        {ligen.length > 0 ? (
          <section>
            <div className="abschnitt__kopf">
              <h2 className="abschnitt__titel">Aktuelle Ligen</h2>
            </div>
            <div className="stapel stapel--eng">
              {ligen.map((liga) => (
                <Link key={liga.id} href={`/ligen/${liga.id}`} className="spielkarte">
                  <article className="tf-karte">
                    <div className="reihe reihe--verteilt">
                      <span className="klein">
                        <strong>{liga.name}</strong>
                        <br />
                        <span className="winzig leise">Platz {liga.platz} von {liga.mitglieder}</span>
                      </span>
                      <span className="tf-zahl">{liga.punkte} Pkt</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Einstellungen</h2>
          </div>
          <article className="tf-karte">
            <ProfilFormular nutzer={nutzer} />
          </article>
        </section>

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Daten und Datenschutz</h2>
          </div>
          <article className="tf-karte">
            <p className="klein" style={{ margin: 0 }}>
              <strong>Datenquelle:</strong> {quelle.name}
            </p>
            <p className="klein leise" style={{ margin: 0 }}>
              {quelle.lizenzhinweis}
            </p>
            <p className="klein leise" style={{ margin: 0 }}>
              <strong>Gespeichert werden</strong> dein Anzeigename, dein gewähltes Zeichen, deine
              Tipps und deine Ligamitgliedschaften. Es gibt keine Werbung, kein Tracking und keine
              Weitergabe an Dritte. In öffentlichen Ligen sehen andere nur deinen Anzeigenamen und
              deine Punkte.
            </p>
            <Link href="/admin" className="tf-knopf tf-knopf--leise">
              <Symbol name="einstellungen" className="tf-symbol tf-symbol--klein" />
              Adminbereich
            </Link>
          </article>
        </section>

        <form action={abmeldenAktion}>
          <button type="submit" className="tf-knopf tf-knopf--zweit tf-knopf--breit">
            <Symbol name="abmelden" className="tf-symbol tf-symbol--klein" />
            Abmelden
          </button>
        </form>
      </main>
    </>
  );
}
