import Link from "next/link";
import { DemoBand } from "@/components/DemoBand";
import { Kopfleiste } from "@/components/Kopfleiste";
import { SpielKarte } from "@/components/SpielKarte";
import { aktuellerSpieltag, spieltage, spieltagSpiele } from "@/lib/abfragen";
import { nutzerErforderlich } from "@/lib/sitzung";
import { datum } from "@/lib/zeit";

export const dynamic = "force-dynamic";

export default async function SpieleSeite({
  searchParams,
}: {
  searchParams: Promise<{ spieltag?: string }>;
}) {
  const nutzer = await nutzerErforderlich();
  const parameter = await searchParams;
  const alle = spieltage();
  const gewuenscht = Number(parameter.spieltag);
  const spieltag =
    alle.some((s) => s.spieltag === gewuenscht) && Number.isFinite(gewuenscht)
      ? gewuenscht
      : aktuellerSpieltag();

  const spiele = spieltagSpiele(spieltag, nutzer.id);
  const info = alle.find((s) => s.spieltag === spieltag);
  const offen = spiele.filter((s) => s.tippbar && !s.tipp).length;
  const punkte = spiele.reduce((summe, s) => summe + (s.bewertung?.punkte ?? 0), 0);

  return (
    <>
      <Kopfleiste titel={`Spieltag ${spieltag}`} />
      <main className="inhalt" id="inhalt">
        <DemoBand />

        <nav aria-label="Spieltag wählen" className="tabellenrahmen">
          <div className="reihe" style={{ flexWrap: "nowrap", paddingBottom: 4 }}>
            {alle.map((s) => (
              <Link
                key={s.spieltag}
                href={`/spiele?spieltag=${s.spieltag}`}
                className="tf-chip"
                style={
                  s.spieltag === spieltag
                    ? {
                        background: "var(--tf-akzent)",
                        color: "var(--tf-text-auf-akzent)",
                        minWidth: 44,
                        height: 36,
                      }
                    : { minWidth: 44, height: 36 }
                }
                aria-current={s.spieltag === spieltag ? "page" : undefined}
              >
                {s.spieltag}
              </Link>
            ))}
          </div>
        </nav>

        <article className="tf-karte">
          <div className="reihe reihe--verteilt">
            <span className="klein">
              {info ? `${datum(info.erster)} bis ${datum(info.letzter)}` : ""}
            </span>
            <span className="tf-chip">{spiele.length} Spiele</span>
          </div>
          <div className="reihe">
            <span className="tf-chip tf-chip--sieg">{punkte} Punkte geholt</span>
            {offen > 0 ? (
              <span className="tf-chip tf-chip--akzent">{offen} Tipps offen</span>
            ) : (
              <span className="tf-chip">alles getippt</span>
            )}
          </div>
        </article>

        <div className="stapel">
          {spiele.map((spiel) => (
            <SpielKarte key={spiel.id} spiel={spiel} />
          ))}
          {spiele.length === 0 ? <p className="leer">Für diesen Spieltag liegen keine Spiele vor.</p> : null}
        </div>
      </main>
    </>
  );
}
