/*
 * Statistische Einschätzung ("KI-Analyse").
 *
 * Das Verfahren ist offengelegt und enthält keinen Zufall: Aus Torstatistik,
 * Heim- und Auswärtsbilanz wird für beide Mannschaften eine erwartete Torzahl
 * geschätzt und daraus über eine Poisson-Verteilung die Wahrscheinlichkeit
 * jedes Ergebnisses berechnet.
 *
 * Es ist eine Schätzung auf Basis vergangener Spiele, keine Vorhersage. Wo
 * wenig Daten vorliegen, zieht die Rechnung bewusst zur Ligamitte hin und die
 * App weist die geringere Verlässlichkeit aus.
 */

export interface Bilanz {
  spiele: number;
  siege: number;
  remis: number;
  niederlagen: number;
  toreFuer: number;
  toreGegen: number;
}

export const LEERE_BILANZ: Bilanz = {
  spiele: 0,
  siege: 0,
  remis: 0,
  niederlagen: 0,
  toreFuer: 0,
  toreGegen: 0,
};

export type FormZeichen = "S" | "U" | "N";

export interface MannschaftsForm {
  id: string;
  name: string;
  kuerzel: string;
  gesamt: Bilanz;
  heim: Bilanz;
  auswaerts: Bilanz;
  /** Neuestes Spiel zuerst, höchstens fünf. */
  letzte: FormZeichen[];
}

export interface Direktduelle {
  spiele: number;
  heimSiege: number;
  remis: number;
  gastSiege: number;
}

export interface LigaMittel {
  toreHeimProSpiel: number;
  toreGastProSpiel: number;
  ausgewerteteSpiele: number;
}

export interface Faktor {
  titel: string;
  heim: string;
  gast: string;
  hinweis: string;
}

export interface ErgebnisWahrscheinlichkeit {
  toreHeim: number;
  toreGast: number;
  prozent: number;
}

export type Verlaesslichkeit = "niedrig" | "mittel" | "hoch";

export interface KiEinschaetzung {
  heimProzent: number;
  remisProzent: number;
  gastProzent: number;
  erwarteteToreHeim: number;
  erwarteteToreGast: number;
  haeufigsteErgebnisse: ErgebnisWahrscheinlichkeit[];
  faktoren: Faktor[];
  einflussfaktoren: string[];
  unsicherheiten: string[];
  verlaesslichkeit: Verlaesslichkeit;
  /** Ein Satz für die Oberfläche: worauf die Einschätzung beruht. */
  erklaerung: string;
  /** Die Rechenmethode in einem Satz. */
  methode: string;
  datenbasis: { spieleHeim: number; spieleGast: number; direkteDuelle: number };
}

const MAX_TORE = 8;

function fakultaet(n: number): number {
  let raus = 1;
  for (let i = 2; i <= n; i++) raus *= i;
  return raus;
}

function poisson(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / fakultaet(k);
}

/**
 * Stärkefaktor einer Mannschaft gegenüber dem Ligamittel. Bei wenigen Spielen
 * wird das Ergebnis zur 1 hin gezogen, damit einzelne Ausreißer die Schätzung
 * nicht übernehmen.
 */
function staerke(tore: number, spiele: number, mittel: number): number {
  if (spiele === 0 || mittel <= 0) return 1;
  const roh = tore / spiele / mittel;
  const gewicht = spiele / (spiele + 3);
  return 1 + (roh - 1) * gewicht;
}

function begrenzen(wert: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, wert));
}

/** Rundet drei Prozentwerte so, dass sie zusammen genau 100 ergeben. */
function aufHundert(werte: number[]): number[] {
  const roh = werte.map((w) => w * 100);
  const abgerundet = roh.map(Math.floor);
  let rest = 100 - abgerundet.reduce((a, b) => a + b, 0);
  const reihenfolge = roh
    .map((w, i) => ({ i, nachkomma: w - Math.floor(w) }))
    .sort((a, b) => b.nachkomma - a.nachkomma);
  for (const { i } of reihenfolge) {
    if (rest <= 0) break;
    abgerundet[i]++;
    rest--;
  }
  return abgerundet;
}

function formText(letzte: FormZeichen[]): string {
  if (letzte.length === 0) return "keine ausgewerteten Spiele";
  const punkte = letzte.reduce((s, z) => s + (z === "S" ? 3 : z === "U" ? 1 : 0), 0);
  return `${letzte.join(" ")} (${punkte} von ${letzte.length * 3} Punkten)`;
}

function schnitt(wert: number, spiele: number): string {
  if (spiele === 0) return "–";
  return (wert / spiele).toFixed(2).replace(".", ",");
}

export function einschaetzen(
  heim: MannschaftsForm,
  gast: MannschaftsForm,
  liga: LigaMittel,
  duelle: Direktduelle,
): KiEinschaetzung {
  const mittelHeim = liga.toreHeimProSpiel > 0 ? liga.toreHeimProSpiel : 1.5;
  const mittelGast = liga.toreGastProSpiel > 0 ? liga.toreGastProSpiel : 1.25;

  const angriffHeim = staerke(heim.heim.toreFuer, heim.heim.spiele, mittelHeim);
  const abwehrGast = staerke(gast.auswaerts.toreGegen, gast.auswaerts.spiele, mittelHeim);
  const angriffGast = staerke(gast.auswaerts.toreFuer, gast.auswaerts.spiele, mittelGast);
  const abwehrHeim = staerke(heim.heim.toreGegen, heim.heim.spiele, mittelGast);

  const lambdaHeim = begrenzen(mittelHeim * angriffHeim * abwehrGast, 0.2, 4.5);
  const lambdaGast = begrenzen(mittelGast * angriffGast * abwehrHeim, 0.2, 4.5);

  let heimSieg = 0;
  let remis = 0;
  let gastSieg = 0;
  const alleErgebnisse: ErgebnisWahrscheinlichkeit[] = [];

  for (let h = 0; h <= MAX_TORE; h++) {
    for (let g = 0; g <= MAX_TORE; g++) {
      const p = poisson(h, lambdaHeim) * poisson(g, lambdaGast);
      if (h > g) heimSieg += p;
      else if (h < g) gastSieg += p;
      else remis += p;
      alleErgebnisse.push({ toreHeim: h, toreGast: g, prozent: p });
    }
  }

  const summe = heimSieg + remis + gastSieg;
  const [heimProzent, remisProzent, gastProzent] = aufHundert([
    heimSieg / summe,
    remis / summe,
    gastSieg / summe,
  ]);

  const haeufigsteErgebnisse = alleErgebnisse
    .sort((a, b) => b.prozent - a.prozent)
    .slice(0, 3)
    .map((e) => ({ ...e, prozent: Math.round((e.prozent / summe) * 1000) / 10 }));

  const datenbasis = {
    spieleHeim: heim.gesamt.spiele,
    spieleGast: gast.gesamt.spiele,
    direkteDuelle: duelle.spiele,
  };
  const wenigste = Math.min(heim.gesamt.spiele, gast.gesamt.spiele);
  const verlaesslichkeit: Verlaesslichkeit =
    wenigste >= 8 ? "hoch" : wenigste >= 3 ? "mittel" : "niedrig";

  const faktoren: Faktor[] = [
    {
      titel: "Form der letzten Spiele",
      heim: formText(heim.letzte),
      gast: formText(gast.letzte),
      hinweis: "Neuestes Spiel zuerst.",
    },
    {
      titel: "Tore pro Spiel",
      heim: schnitt(heim.gesamt.toreFuer, heim.gesamt.spiele),
      gast: schnitt(gast.gesamt.toreFuer, gast.gesamt.spiele),
      hinweis: "Über alle ausgewerteten Spiele dieser Saison.",
    },
    {
      titel: "Gegentore pro Spiel",
      heim: schnitt(heim.gesamt.toreGegen, heim.gesamt.spiele),
      gast: schnitt(gast.gesamt.toreGegen, gast.gesamt.spiele),
      hinweis: "Niedriger ist besser.",
    },
    {
      titel: "Heim- beziehungsweise Auswärtsbilanz",
      heim: `${heim.heim.siege}S ${heim.heim.remis}U ${heim.heim.niederlagen}N zu Hause`,
      gast: `${gast.auswaerts.siege}S ${gast.auswaerts.remis}U ${gast.auswaerts.niederlagen}N auswärts`,
      hinweis: "Nur die Spiele in der jeweiligen Rolle.",
    },
    {
      titel: "Erwartete Tore in diesem Spiel",
      heim: lambdaHeim.toFixed(2).replace(".", ","),
      gast: lambdaGast.toFixed(2).replace(".", ","),
      hinweis: "Ergebnis der Rechnung, nicht ein gemessener Wert.",
    },
  ];

  const einflussfaktoren: string[] = [
    `Heimvorteil: in dieser Datenbasis fallen zu Hause im Schnitt ${mittelHeim
      .toFixed(2)
      .replace(".", ",")} Tore gegenüber ${mittelGast.toFixed(2).replace(".", ",")} auswärts.`,
  ];
  if (duelle.spiele > 0) {
    einflussfaktoren.push(
      `Direkte Duelle in den vorliegenden Daten: ${duelle.heimSiege} Siege ${heim.kuerzel}, ` +
        `${duelle.remis} Unentschieden, ${duelle.gastSiege} Siege ${gast.kuerzel}. ` +
        "Sie fließen nicht in die Rechnung ein und dienen nur der Einordnung.",
    );
  }
  if (heim.letzte[0] === "S" && heim.letzte[1] === "S") {
    einflussfaktoren.push(`${heim.name} hat die letzten beiden Spiele gewonnen.`);
  }
  if (gast.letzte[0] === "N" && gast.letzte[1] === "N") {
    einflussfaktoren.push(`${gast.name} hat die letzten beiden Spiele verloren.`);
  }

  const unsicherheiten: string[] = [
    "Aufstellungen, Sperren, Verletzungen und Wechsel sind in den vorliegenden Daten nicht enthalten.",
    `Die Rechnung stützt sich auf ${heim.gesamt.spiele} Spiele von ${heim.name} und ` +
      `${gast.gesamt.spiele} Spiele von ${gast.name}. Je weniger Spiele, desto gröber die Schätzung.`,
    "Spielplanbelastung, Wetter, Platzverhältnisse und Schiedsrichterentscheidungen fließen nicht ein.",
    "Tore werden als voneinander unabhängig angenommen. In echten Spielen ist das nur näherungsweise so.",
  ];
  if (verlaesslichkeit === "niedrig") {
    unsicherheiten.unshift(
      "Sehr dünne Datenbasis: diese Einschätzung ist kaum aussagekräftig und dient nur der Orientierung.",
    );
  }

  return {
    heimProzent,
    remisProzent,
    gastProzent,
    erwarteteToreHeim: Math.round(lambdaHeim * 100) / 100,
    erwarteteToreGast: Math.round(lambdaGast * 100) / 100,
    haeufigsteErgebnisse,
    faktoren,
    einflussfaktoren,
    unsicherheiten,
    verlaesslichkeit,
    erklaerung:
      "Die Einschätzung beruht auf der aktuellen Form, der Heim- und Auswärtsbilanz sowie den " +
      "vorliegenden Torstatistiken beider Mannschaften. Sie sagt nicht voraus, wie das Spiel " +
      "ausgeht, sondern wie häufig ein solcher Ausgang bei dieser Datenlage zu erwarten wäre.",
    methode:
      "Aus Tor- und Gegentorschnitt wird je Mannschaft eine erwartete Torzahl geschätzt und " +
      "über eine Poisson-Verteilung in Wahrscheinlichkeiten umgerechnet.",
    datenbasis,
  };
}
