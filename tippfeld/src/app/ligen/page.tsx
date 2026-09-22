import Image from "next/image";
import Link from "next/link";
import { DemoBand } from "@/components/DemoBand";
import { Kopfleiste } from "@/components/Kopfleiste";
import { Symbol } from "@/components/Symbol";
import { ligenVonNutzer } from "@/lib/abfragen";
import { nutzerErforderlich } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

export default async function LigenSeite() {
  const nutzer = await nutzerErforderlich();
  const ligen = ligenVonNutzer(nutzer.id);

  return (
    <>
      <Kopfleiste titel="Ligen" />
      <main className="inhalt" id="inhalt">
        <DemoBand />

        <div className="reihe">
          <Link href="/ligen/neu" className="tf-knopf wachsen">
            <Symbol name="plus" className="tf-symbol tf-symbol--klein" />
            Liga gründen
          </Link>
          <Link href="/ligen/beitreten" className="tf-knopf tf-knopf--zweit wachsen">
            <Symbol name="qr-code" className="tf-symbol tf-symbol--klein" />
            Beitreten
          </Link>
        </div>

        <Link href="/ligen/entdecken" className="tf-knopf tf-knopf--zweit tf-knopf--breit">
          <Symbol name="suche" className="tf-symbol tf-symbol--klein" />
          Öffentliche Ligen entdecken
        </Link>

        <section>
          <div className="abschnitt__kopf">
            <h2 className="abschnitt__titel">Deine Ligen</h2>
            <span className="klein leise">{ligen.length}</span>
          </div>
          <div className="stapel">
            {ligen.map((liga) => (
              <Link key={liga.id} href={`/ligen/${liga.id}`} className="spielkarte">
                <article className="tf-karte">
                  <div className="reihe" style={{ flexWrap: "nowrap" }}>
                    <Image src={`/grafik/${liga.zeichen}.svg`} alt="" width={44} height={44} />
                    <span className="wachsen">
                      <strong>{liga.name}</strong>
                      <br />
                      <span className="winzig leise">
                        {liga.mitglieder} Mitglieder · {liga.oeffentlich ? "öffentlich" : "privat"} ·{" "}
                        {liga.wettbewerbName}
                      </span>
                    </span>
                    <Symbol name="pfeil-rechts" className="tf-symbol tf-symbol--klein" />
                  </div>
                  <div className="reihe reihe--verteilt">
                    <span className="tf-chip tf-chip--akzent">Platz {liga.platz}</span>
                    <span className="tf-zahl klein">{liga.punkte} Punkte</span>
                  </div>
                </article>
              </Link>
            ))}
            {ligen.length === 0 ? (
              <div className="leer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <Image src="/grafik/leerzustand-liga.svg" alt="" width={200} height={138} />
                <strong>Noch keine Liga</strong>
                <p className="klein">
                  Gründe eine eigene Liga oder tritt mit einem Code bei. Deine Tipps zählen dann in
                  jeder Liga, in der du Mitglied bist.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
