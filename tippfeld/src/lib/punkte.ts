import type { Position } from "./datenquelle/typen";

/*
 * Punktevergabe.
 *
 * Eine reine Rechnung ohne Datenbank und ohne Zufall: dieselben Eingaben
 * ergeben immer dieselben Punkte. Das ist Absicht - jede Punktzahl in der
 * Rangliste lässt sich damit jederzeit nachrechnen.
 */

export interface Punktesystem {
  /** Tipp und Ergebnis stimmen genau überein. */
  exakt: number;
  /** Sieger richtig und Tordifferenz richtig, aber anderes Ergebnis. */
  differenz: number;
  /** Nur Sieger beziehungsweise Unentschieden richtig. */
  tendenz: number;
  /** Sieger falsch. */
  falsch: number;
  /** Getippter Feldspieler hat getroffen. */
  spielerTor: number;
  /** Getippter Feldspieler hat vorbereitet. */
  spielerVorlage: number;
  /** Getippter Torwart blieb ohne Gegentor. */
  torwartZuNull: number;
}

export const STANDARD_PUNKTESYSTEM: Punktesystem = {
  exakt: 5,
  differenz: 3,
  tendenz: 2,
  falsch: 0,
  spielerTor: 2,
  spielerVorlage: 1,
  torwartZuNull: 2,
};

export function punktesystemLesen(roh: string | null | undefined): Punktesystem {
  if (!roh) return STANDARD_PUNKTESYSTEM;
  try {
    const gelesen = JSON.parse(roh) as Partial<Punktesystem>;
    return { ...STANDARD_PUNKTESYSTEM, ...gelesen };
  } catch {
    return STANDARD_PUNKTESYSTEM;
  }
}

export type Tendenz = "heim" | "remis" | "gast";

export function tendenz(heim: number, gast: number): Tendenz {
  if (heim > gast) return "heim";
  if (heim < gast) return "gast";
  return "remis";
}

export interface Ergebnis {
  toreHeim: number;
  toreGast: number;
}

export interface TippBewertung {
  punkte: number;
  exakt: boolean;
  differenzRichtig: boolean;
  tendenzRichtig: boolean;
  /** Ein Satz, der erklärt, wie die Punkte zustande kommen. */
  begruendung: string;
}

/**
 * Bewertet einen Ergebnistipp.
 *
 * Die Stufen zählen nicht zusammen, es gilt immer nur die beste erreichte:
 * exaktes Ergebnis, sonst richtige Tordifferenz, sonst richtige Tendenz.
 *
 * Bei einem Unentschieden ist die Tordifferenz immer null. Ein Tipp auf 1:1
 * bei 0:0 hat die Tendenz richtig getroffen, das Ergebnis aber verfehlt, und
 * bekommt deshalb die Tendenzpunkte - nicht die Differenzpunkte.
 */
export function bewerteTipp(
  tipp: Ergebnis,
  ergebnis: Ergebnis,
  system: Punktesystem = STANDARD_PUNKTESYSTEM,
): TippBewertung {
  const exakt = tipp.toreHeim === ergebnis.toreHeim && tipp.toreGast === ergebnis.toreGast;
  const tippTendenz = tendenz(tipp.toreHeim, tipp.toreGast);
  const echteTendenz = tendenz(ergebnis.toreHeim, ergebnis.toreGast);
  const tendenzRichtig = tippTendenz === echteTendenz;
  const unentschieden = echteTendenz === "remis";
  const differenzRichtig =
    tendenzRichtig &&
    !unentschieden &&
    tipp.toreHeim - tipp.toreGast === ergebnis.toreHeim - ergebnis.toreGast;

  if (exakt) {
    return {
      punkte: system.exakt,
      exakt: true,
      differenzRichtig: true,
      tendenzRichtig: true,
      begruendung: `Exaktes Ergebnis getroffen: ${system.exakt} Punkte.`,
    };
  }
  if (differenzRichtig) {
    return {
      punkte: system.differenz,
      exakt: false,
      differenzRichtig: true,
      tendenzRichtig: true,
      begruendung: `Sieger und Tordifferenz richtig, Ergebnis verfehlt: ${system.differenz} Punkte.`,
    };
  }
  if (tendenzRichtig) {
    return {
      punkte: system.tendenz,
      exakt: false,
      differenzRichtig: false,
      tendenzRichtig: true,
      begruendung: unentschieden
        ? `Unentschieden richtig, Ergebnis verfehlt: ${system.tendenz} Punkte.`
        : `Sieger richtig, Tordifferenz verfehlt: ${system.tendenz} Punkte.`,
    };
  }
  return {
    punkte: system.falsch,
    exakt: false,
    differenzRichtig: false,
    tendenzRichtig: false,
    begruendung: `Sieger nicht getroffen: ${system.falsch} Punkte.`,
  };
}

export interface SpielerTippEingabe {
  position: Position;
  spielerId: string;
  spielerName: string;
  /** Mannschaft des getippten Spielers - nötig für die Zu-Null-Wertung. */
  mannschaftId: string;
}

export interface SpielerEreignis {
  spielerId: string;
  art: "tor" | "vorlage";
}

export interface SpielerBewertung {
  position: Position;
  spielerName: string;
  punkte: number;
  begruendung: string;
}

/** Bewertet die vier Spieler-Tipps eines Spiels. */
export function bewerteSpielerTipps(
  tipps: SpielerTippEingabe[],
  ereignisse: SpielerEreignis[],
  spiel: { heimId: string; gastId: string; toreHeim: number; toreGast: number },
  system: Punktesystem = STANDARD_PUNKTESYSTEM,
): SpielerBewertung[] {
  return tipps.map((tipp) => {
    if (tipp.position === "TW") {
      const gegentore = tipp.mannschaftId === spiel.heimId ? spiel.toreGast : spiel.toreHeim;
      const zuNull = gegentore === 0;
      return {
        position: tipp.position,
        spielerName: tipp.spielerName,
        punkte: zuNull ? system.torwartZuNull : 0,
        begruendung: zuNull
          ? `Ohne Gegentor geblieben: ${system.torwartZuNull} Punkte.`
          : `${gegentore} Gegentor${gegentore === 1 ? "" : "e"} kassiert: 0 Punkte.`,
      };
    }

    const eigene = ereignisse.filter((e) => e.spielerId === tipp.spielerId);
    const tore = eigene.filter((e) => e.art === "tor").length;
    const vorlagen = eigene.filter((e) => e.art === "vorlage").length;
    const punkte = tore * system.spielerTor + vorlagen * system.spielerVorlage;

    const teile: string[] = [];
    if (tore > 0) teile.push(`${tore} Tor${tore === 1 ? "" : "e"}`);
    if (vorlagen > 0) teile.push(`${vorlagen} Vorlage${vorlagen === 1 ? "" : "n"}`);

    return {
      position: tipp.position,
      spielerName: tipp.spielerName,
      punkte,
      begruendung:
        teile.length > 0
          ? `${teile.join(" und ")}: ${punkte} Punkte.`
          : "Weder Tor noch Vorlage: 0 Punkte.",
    };
  });
}
