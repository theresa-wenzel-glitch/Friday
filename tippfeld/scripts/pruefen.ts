/*
 * Selbsttest der Punktevergabe. Prüft genau die Beispiele aus der Spezifikation.
 * Aufruf: npm run pruefen
 */
import { bewerteTipp, bewerteSpielerTipps, STANDARD_PUNKTESYSTEM } from "../src/lib/punkte";

let fehler = 0;

function pruefe(beschreibung: string, ist: unknown, soll: unknown) {
  const gleich = JSON.stringify(ist) === JSON.stringify(soll);
  if (!gleich) {
    fehler++;
    console.error(`FEHLER  ${beschreibung}\n        erwartet ${JSON.stringify(soll)}, war ${JSON.stringify(ist)}`);
  } else {
    console.log(`ok      ${beschreibung}`);
  }
}

// --- Beispiele aus der Spezifikation ---------------------------------------
pruefe("Tipp 1:1, Ergebnis 0:0 -> 2 Punkte (Tendenz)",
  bewerteTipp({ toreHeim: 1, toreGast: 1 }, { toreHeim: 0, toreGast: 0 }).punkte, 2);

pruefe("Tipp 2:0, Ergebnis 3:1 -> 3 Punkte (Tordifferenz)",
  bewerteTipp({ toreHeim: 2, toreGast: 0 }, { toreHeim: 3, toreGast: 1 }).punkte, 3);

pruefe("Tipp 2:1, Ergebnis 2:1 -> 5 Punkte (exakt)",
  bewerteTipp({ toreHeim: 2, toreGast: 1 }, { toreHeim: 2, toreGast: 1 }).punkte, 5);

pruefe("Tipp 2:1, Ergebnis 0:2 -> 0 Punkte",
  bewerteTipp({ toreHeim: 2, toreGast: 1 }, { toreHeim: 0, toreGast: 2 }).punkte, 0);

// --- Randfälle --------------------------------------------------------------
pruefe("Unentschieden exakt getroffen zählt als exakt",
  bewerteTipp({ toreHeim: 2, toreGast: 2 }, { toreHeim: 2, toreGast: 2 }).exakt, true);

pruefe("Auswärtssieg mit richtiger Differenz -> 3 Punkte",
  bewerteTipp({ toreHeim: 0, toreGast: 2 }, { toreHeim: 1, toreGast: 3 }).punkte, 3);

pruefe("Differenz stimmt, Sieger nicht -> 0 Punkte",
  bewerteTipp({ toreHeim: 3, toreGast: 1 }, { toreHeim: 1, toreGast: 3 }).punkte, 0);

const flags = bewerteTipp({ toreHeim: 1, toreGast: 1 }, { toreHeim: 0, toreGast: 0 });
pruefe("Bei Unentschieden gilt die Differenz nicht als getroffen", flags.differenzRichtig, false);
pruefe("Tendenz ist dabei trotzdem richtig", flags.tendenzRichtig, true);

// --- Spieler-Tipps ----------------------------------------------------------
const spielerPunkte = bewerteSpielerTipps(
  [
    { position: "TW", spielerId: "tw1", spielerName: "R. Sandberg", mannschaftId: "heim" },
    { position: "ANG", spielerId: "st1", spielerName: "L. Brandt", mannschaftId: "heim" },
    { position: "MIT", spielerId: "mf1", spielerName: "J. Kilic", mannschaftId: "heim" },
    { position: "ABW", spielerId: "av1", spielerName: "M. Okoro", mannschaftId: "gast" },
  ],
  [
    { spielerId: "st1", art: "tor" },
    { spielerId: "st1", art: "tor" },
    { spielerId: "mf1", art: "vorlage" },
  ],
  { heimId: "heim", gastId: "gast", toreHeim: 2, toreGast: 0 },
);

pruefe("Torwart ohne Gegentor -> 2 Punkte", spielerPunkte[0].punkte, 2);
pruefe("Stürmer mit zwei Toren -> 4 Punkte", spielerPunkte[1].punkte, 4);
pruefe("Mittelfeld mit einer Vorlage -> 1 Punkt", spielerPunkte[2].punkte, 1);
pruefe("Verteidiger ohne Beteiligung -> 0 Punkte", spielerPunkte[3].punkte, 0);

pruefe("Standardsystem unverändert", STANDARD_PUNKTESYSTEM.exakt, 5);

console.log(fehler === 0 ? "\nAlle Prüfungen bestanden." : `\n${fehler} Prüfung(en) fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
