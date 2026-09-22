/*
 * Die Schnittstelle zwischen App und Fußball-Daten.
 *
 * Alles, was die App über Wettbewerbe, Mannschaften, Spieler und Spiele weiß,
 * kommt durch dieses eine Tor. Wer später eine lizenzierte Fußball-API
 * anschließt, schreibt eine zweite Datei, die `Datenquelle` erfüllt - an der
 * App selbst muss dafür nichts geändert werden.
 */

export type Position = "TW" | "ABW" | "MIT" | "ANG";

export const POSITIONEN: Position[] = ["TW", "ABW", "MIT", "ANG"];

export const POSITION_NAME: Record<Position, string> = {
  TW: "Torwart",
  ABW: "Abwehr",
  MIT: "Mittelfeld",
  ANG: "Sturm",
};

export type SpielStatus = "geplant" | "laeuft" | "beendet" | "abgesagt";

export interface Wettbewerb {
  id: string;
  name: string;
  kuerzel: string;
  land: string;
  saison: string;
}

export interface Mannschaft {
  id: string;
  wettbewerbId: string;
  name: string;
  kuerzel: string;
}

export interface Spieler {
  id: string;
  mannschaftId: string;
  name: string;
  position: Position;
  nummer: number;
}

export interface Spiel {
  id: string;
  wettbewerbId: string;
  spieltag: number;
  anstoss: string; // ISO-8601, immer UTC
  heimId: string;
  gastId: string;
  status: SpielStatus;
  toreHeim: number | null;
  toreGast: number | null;
}

/** Was in einem beendeten Spiel passiert ist - Grundlage der Spieler-Tipps. */
export interface Ereignis {
  spielId: string;
  spielerId: string;
  art: "tor" | "vorlage";
  minute: number;
}

export interface Datenbestand {
  wettbewerbe: Wettbewerb[];
  mannschaften: Mannschaft[];
  spieler: Spieler[];
  spiele: Spiel[];
  ereignisse: Ereignis[];
}

export interface Datenquelle {
  /** Kurzkennung, steht in der Umgebungsvariable DATENQUELLE. */
  kennung: string;
  /** Anzeigename im Adminbereich. */
  name: string;
  /**
   * true bedeutet: das sind Übungsdaten. Die App weist Nutzer sichtbar darauf
   * hin und darf sie niemals als Live-Daten ausgeben.
   */
  istDemo: boolean;
  /** Woher die Daten stammen und was rechtlich noch zu klären ist. */
  lizenzhinweis: string;
  /** Holt den kompletten Bestand. Bei echten APIs hier seitenweise nachladen. */
  laden(): Promise<Datenbestand>;
}
