import Link from "next/link";
import type { SpielAnsicht } from "@/lib/abfragen";
import { anstossKurz, verbleibend } from "@/lib/zeit";
import { FormReihe } from "./FormReihe";
import { Symbol } from "./Symbol";
import { Wappen } from "./Wappen";
import type { FormZeichen } from "@/lib/ki";

type Props = {
  spiel: SpielAnsicht;
  /** Optionale Formreihen, wenn die Seite sie ohnehin geladen hat. */
  form?: { heim: FormZeichen[]; gast: FormZeichen[] };
};

function randKlasse(spiel: SpielAnsicht): string {
  if (spiel.status !== "beendet") return "tf-karte--offen";
  if (!spiel.bewertung) return "";
  if (spiel.bewertung.exakt) return "tf-karte--sieg";
  if (spiel.bewertung.tendenzRichtig) return "tf-karte--remis";
  return "tf-karte--niederlage";
}

export function SpielKarte({ spiel, form }: Props) {
  const rest = spiel.tippbar ? verbleibend(spiel.anstoss) : null;
  const beendet = spiel.status === "beendet" && spiel.toreHeim !== null;

  return (
    <Link href={`/spiele/${spiel.id}`} className="spielkarte">
      <article className={`tf-karte ${randKlasse(spiel)}`}>
        <div className="tf-karte__kopf">
          <span className="tf-label">
            Spieltag {spiel.spieltag} · {anstossKurz(spiel.anstoss)}
          </span>
          {beendet ? (
            spiel.bewertung ? (
              <span
                className={`tf-chip ${
                  spiel.bewertung.exakt
                    ? "tf-chip--sieg"
                    : spiel.bewertung.tendenzRichtig
                      ? "tf-chip--remis"
                      : "tf-chip--niederlage"
                }`}
              >
                {spiel.bewertung.punkte === 1 ? "1 Punkt" : `${spiel.bewertung.punkte} Punkte`}
              </span>
            ) : (
              <span className="tf-chip">nicht getippt</span>
            )
          ) : spiel.status === "laeuft" ? (
            <span className="tf-chip tf-chip--remis">läuft gerade</span>
          ) : spiel.tippbar ? (
            <span className={`tf-chip ${spiel.tipp ? "" : "tf-chip--akzent"}`}>
              {spiel.tipp ? `Dein Tipp ${spiel.tipp.toreHeim}:${spiel.tipp.toreGast}` : rest ?? "offen"}
            </span>
          ) : (
            <span className="tf-chip">Frist abgelaufen</span>
          )}
        </div>

        <div className="tf-spiel">
          <div className={`tf-spiel__zeile${beendet && spiel.toreHeim! > spiel.toreGast! ? " tf-spiel__zeile--vorn" : ""}`}>
            <Wappen kuerzel={spiel.heim.kuerzel} />
            <span className="tf-spiel__block">
              <span className="tf-mannschaft__name">{spiel.heim.name}</span>
              {form ? <FormReihe form={form.heim} titel={`Form ${spiel.heim.name}`} /> : null}
            </span>
            {beendet ? (
              <span className="tf-spiel__tore">{spiel.toreHeim}</span>
            ) : (
              <span className="tf-label">Heim</span>
            )}
          </div>
          <div className={`tf-spiel__zeile${beendet && spiel.toreGast! > spiel.toreHeim! ? " tf-spiel__zeile--vorn" : ""}`}>
            <Wappen kuerzel={spiel.gast.kuerzel} />
            <span className="tf-spiel__block">
              <span className="tf-mannschaft__name">{spiel.gast.name}</span>
              {form ? <FormReihe form={form.gast} titel={`Form ${spiel.gast.name}`} /> : null}
            </span>
            {beendet ? (
              <span className="tf-spiel__tore">{spiel.toreGast}</span>
            ) : (
              <span className="tf-label">Gast</span>
            )}
          </div>
        </div>

        <div className="reihe reihe--verteilt">
          <span className="winzig leise">
            {beendet && spiel.tipp
              ? `Dein Tipp: ${spiel.tipp.toreHeim}:${spiel.tipp.toreGast}`
              : spiel.spielerTipps > 0
                ? `${spiel.spielerTipps} von 4 Spielern gewählt`
                : spiel.wettbewerb.name}
          </span>
          <span className="reihe winzig" style={{ color: "var(--tf-akzent)", fontWeight: 600 }}>
            {spiel.tippbar ? (spiel.tipp ? "Tipp ändern" : "Spiel tippen") : "Spiel ansehen"}
            <Symbol name="pfeil-rechts" className="tf-symbol tf-symbol--klein" />
          </span>
        </div>
      </article>
    </Link>
  );
}
