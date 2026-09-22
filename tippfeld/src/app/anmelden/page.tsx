import Image from "next/image";
import { redirect } from "next/navigation";
import { AnmeldeFormular } from "@/components/AnmeldeFormular";
import { aktiveQuelle } from "@/lib/datenquelle";
import { aktuellerNutzer } from "@/lib/sitzung";

export default async function AnmeldeSeite() {
  if (await aktuellerNutzer()) redirect("/");
  const quelle = aktiveQuelle();

  return (
    <main className="inhalt" id="inhalt" style={{ justifyContent: "center", minHeight: "100dvh" }}>
      <div className="stapel stapel--weit" style={{ alignItems: "center", textAlign: "center" }}>
        <Image src="/grafik/app-icon.svg" alt="" width={96} height={96} priority />
        <div className="stapel stapel--eng">
          <h1 className="seitentitel" style={{ letterSpacing: "0.08em" }}>
            TIPPFELD
          </h1>
          <p className="leise klein">Tippen · Analysieren · Aufsteigen</p>
        </div>
      </div>

      <AnmeldeFormular />

      {quelle.istDemo ? (
        <p className="band band--demo">
          <span>
            <strong>Übungsbetrieb.</strong> Spielpläne, Ergebnisse und Spielernamen sind ausgedacht.
            Es wird kein Geld eingesetzt und es werden keine Quoten angezeigt.
          </span>
        </p>
      ) : null}

      <p className="winzig leise" style={{ textAlign: "center" }}>
        Diese Anmeldung dient dem Testbetrieb: Es gibt noch kein Passwort. Vor einer
        Veröffentlichung gehört hier eine richtige Anmeldung hin.
      </p>
    </main>
  );
}
