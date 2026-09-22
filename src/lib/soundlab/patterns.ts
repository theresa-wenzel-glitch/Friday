/*
 * Stile, Rhythmen und Loops.
 *
 * Ein Rhythmus ist eine Zeichenkette aus 16 Zeichen - ein Takt in
 * Sechzehntelschritten:
 *
 *   "X---x---X---x---"   X = betont, x = normal, . = leise, - = Pause
 *
 * Diese Schreibweise liest sich wie ein Notenblatt für Nichtmusiker und lässt
 * sich vom Sequencer direkt abspielen.
 */

import type { DrumId } from "./voices";
import type { ScaleId } from "./theory";

export type StyleId = "pop" | "rock" | "hiphop" | "lofi" | "electronic" | "funk";
export type LoopCategory =
  | "drums"
  | "bass"
  | "piano"
  | "guitar"
  | "synth"
  | "percussion";

export const STEPS_PER_BAR = 16;

export type Style = {
  id: StyleId;
  label: string;
  emoji: string;
  bpm: number;
  scale: ScaleId;
  description: string;
  /** Akkordfolge in Stufen, ein Eintrag pro Takt. */
  progression: number[];
  defaults: Record<LoopCategory, string>;
};

export const STYLES: Record<StyleId, Style> = {
  pop: {
    id: "pop",
    label: "Pop",
    emoji: "✨",
    bpm: 104,
    scale: "major",
    description: "Klar, hell, mitsingbar. Die vier Akkorde, die fast jeder kennt.",
    progression: [0, 4, 5, 3],
    defaults: {
      drums: "drums-pop",
      bass: "bass-root",
      piano: "piano-pad",
      guitar: "guitar-strum",
      synth: "synth-air",
      percussion: "perc-shaker",
    },
  },
  rock: {
    id: "rock",
    label: "Rock",
    emoji: "🤘",
    bpm: 124,
    scale: "minor",
    description: "Gerade Achtel, kräftige Snare, viel Energie.",
    progression: [0, 5, 3, 4],
    defaults: {
      drums: "drums-rock",
      bass: "bass-eighths",
      piano: "piano-stab",
      guitar: "guitar-power",
      synth: "synth-air",
      percussion: "perc-tamb",
    },
  },
  hiphop: {
    id: "hiphop",
    label: "Hip-Hop",
    emoji: "🎤",
    bpm: 88,
    scale: "minor",
    description: "Langsam, tief, viel Platz zwischen den Schlägen.",
    progression: [5, 3, 0, 4],
    defaults: {
      drums: "drums-boombap",
      bass: "bass-sub",
      piano: "piano-chops",
      guitar: "guitar-mute",
      synth: "synth-pluck",
      percussion: "perc-clap",
    },
  },
  lofi: {
    id: "lofi",
    label: "Lo-Fi",
    emoji: "🌙",
    bpm: 76,
    scale: "dorian",
    description: "Verträumt und weich - gut zum Lernen und Chillen.",
    progression: [1, 4, 0, 0],
    defaults: {
      drums: "drums-lofi",
      bass: "bass-walk",
      piano: "piano-dreams",
      guitar: "guitar-mute",
      synth: "synth-air",
      percussion: "perc-shaker",
    },
  },
  electronic: {
    id: "electronic",
    label: "Electronic",
    emoji: "⚡",
    bpm: 126,
    scale: "minor",
    description: "Durchgehender Puls, treibende Flächen.",
    progression: [0, 0, 5, 3],
    defaults: {
      drums: "drums-house",
      bass: "bass-offbeat",
      piano: "piano-arp",
      guitar: "guitar-mute",
      synth: "synth-arp",
      percussion: "perc-hats",
    },
  },
  funk: {
    id: "funk",
    label: "Funk",
    emoji: "🕺",
    bpm: 108,
    scale: "dorian",
    description: "Alles tanzt um die Eins. Viel Groove, viele kleine Töne.",
    progression: [0, 0, 3, 3],
    defaults: {
      drums: "drums-funk",
      bass: "bass-funk",
      piano: "piano-stab",
      guitar: "guitar-funk",
      synth: "synth-pluck",
      percussion: "perc-clap",
    },
  },
};

export const STYLE_LIST = Object.values(STYLES);

/* ----------------------------------------------------------------- Loops */

export type DrumLoop = {
  id: string;
  label: string;
  category: "drums" | "percussion";
  hint: string;
  steps: Partial<Record<DrumId, string>>;
  swing?: number;
};

export type NoteEvent = {
  /** Schritt im Takt (0-15) */
  step: number;
  /** Stufe relativ zum aktuellen Akkord (0 = Grundton, 1 = Terz, 2 = Quinte) */
  tone: number;
  /** Oktavversatz */
  octave?: number;
  /** Länge in Schritten */
  len: number;
  velocity?: number;
};

export type MelodyLoop = {
  id: string;
  label: string;
  category: "bass" | "piano" | "guitar" | "synth";
  hint: string;
  /** "chord" spielt den ganzen Akkord, "note" einzelne Töne. */
  mode: "chord" | "note" | "strum";
  notes: NoteEvent[];
};

export type Loop = DrumLoop | MelodyLoop;

export const DRUM_LOOPS: DrumLoop[] = [
  {
    id: "drums-pop",
    label: "Pop Basis",
    category: "drums",
    hint: "Der Klassiker: Bass auf 1 und 3, Snare auf 2 und 4.",
    steps: {
      kick: "X-------X-------",
      snare: "----X-------X---",
      hihat: "x-x-x-x-x-x-x-x-",
    },
  },
  {
    id: "drums-rock",
    label: "Rock Beat",
    category: "drums",
    hint: "Geradeaus, laut, mit durchgehenden Achteln.",
    steps: {
      kick: "X---X--X-X------",
      snare: "----X-------X---",
      hihat: "x-x-x-x-x-x-x-x-",
      crash: "X---------------",
    },
  },
  {
    id: "drums-boombap",
    label: "Boom Bap",
    category: "drums",
    hint: "Hip-Hop mit dickem Bass und knackiger Snare.",
    steps: {
      kick: "X-----X---X-----",
      snare: "----X-------X---",
      hihat: "x-x-x-x-x-x-x-xx",
    },
    swing: 0.16,
  },
  {
    id: "drums-lofi",
    label: "Lo-Fi Groove",
    category: "drums",
    hint: "Leicht hinkend - das macht den verträumten Charme.",
    steps: {
      kick: "X-------X---X---",
      snare: "----X-------X---",
      hihat: "x--x--x--x--x--x",
    },
    swing: 0.24,
  },
  {
    id: "drums-house",
    label: "Four on the Floor",
    category: "drums",
    hint: "Bassdrum auf jedem Schlag - der Tanzflächen-Puls.",
    steps: {
      kick: "X---X---X---X---",
      clap: "----X-------X---",
      openhat: "--x---x---x---x-",
      hihat: "x-x-x-x-x-x-x-x-",
    },
  },
  {
    id: "drums-funk",
    label: "Funk Groove",
    category: "drums",
    hint: "Viele kleine Schläge zwischen den Zählzeiten.",
    steps: {
      kick: "X--x--X---x-X---",
      snare: "----X--.--..X--.",
      hihat: "x.x.x.x.x.x.x.x.",
    },
    swing: 0.1,
  },
  {
    id: "perc-shaker",
    label: "Shaker",
    category: "percussion",
    hint: "Feines Rascheln, hält alles zusammen.",
    steps: { hihat: ".x.x.x.x.x.x.x.x" },
  },
  {
    id: "perc-clap",
    label: "Claps",
    category: "percussion",
    hint: "Klatschen auf 2 und 4 - sofort mehr Party.",
    steps: { clap: "----X-------X---" },
  },
  {
    id: "perc-tamb",
    label: "Tamburin",
    category: "percussion",
    hint: "Offene Hi-Hats auf den Zwischenschlägen.",
    steps: { openhat: "--x---x---x---x-" },
  },
  {
    id: "perc-hats",
    label: "Rolling Hats",
    category: "percussion",
    hint: "Treibende Sechzehntel für elektronische Stücke.",
    steps: { hihat: "xxxxxxxxxxxxxxxx" },
  },
  {
    id: "perc-toms",
    label: "Tom-Welle",
    category: "percussion",
    hint: "Toms als kleine Welle am Taktende.",
    steps: { tom: "------------x-x-" },
  },
];

export const MELODY_LOOPS: MelodyLoop[] = [
  /* ---------------------------------------------------------------- Bass */
  {
    id: "bass-root",
    label: "Grundton",
    category: "bass",
    hint: "Ein Ton pro Takt - ruhig und sicher.",
    mode: "note",
    notes: [
      { step: 0, tone: 0, len: 6 },
      { step: 8, tone: 0, len: 6 },
    ],
  },
  {
    id: "bass-eighths",
    label: "Achtel",
    category: "bass",
    hint: "Treibende Achtel wie im Rock.",
    mode: "note",
    notes: [0, 2, 4, 6, 8, 10, 12, 14].map((step) => ({
      step,
      tone: 0,
      len: 2,
    })),
  },
  {
    id: "bass-sub",
    label: "Sub",
    category: "bass",
    hint: "Tief und sparsam - lässt viel Platz für die Stimme.",
    mode: "note",
    notes: [
      { step: 0, tone: 0, octave: -1, len: 8 },
      { step: 10, tone: 2, octave: -1, len: 4 },
    ],
  },
  {
    id: "bass-walk",
    label: "Walking",
    category: "bass",
    hint: "Läuft die Akkordtöne entlang, wie im Jazz.",
    mode: "note",
    notes: [
      { step: 0, tone: 0, len: 3 },
      { step: 4, tone: 1, len: 3 },
      { step: 8, tone: 2, len: 3 },
      { step: 12, tone: 1, len: 3 },
    ],
  },
  {
    id: "bass-offbeat",
    label: "Offbeat",
    category: "bass",
    hint: "Spielt zwischen den Schlägen - typisch elektronisch.",
    mode: "note",
    notes: [2, 6, 10, 14].map((step) => ({ step, tone: 0, len: 2 })),
  },
  {
    id: "bass-funk",
    label: "Funk Line",
    category: "bass",
    hint: "Kurze, tanzende Töne mit einem Sprung nach oben.",
    mode: "note",
    notes: [
      { step: 0, tone: 0, len: 1 },
      { step: 3, tone: 0, len: 1 },
      { step: 6, tone: 2, len: 1 },
      { step: 8, tone: 0, len: 1 },
      { step: 11, tone: 1, len: 1 },
      { step: 14, tone: 0, octave: 1, len: 1 },
    ],
  },

  /* -------------------------------------------------------------- Klavier */
  {
    id: "piano-pad",
    label: "Flächen",
    category: "piano",
    hint: "Ganze Akkorde, liegend - der weiche Teppich.",
    mode: "chord",
    notes: [{ step: 0, tone: 0, len: 16 }],
  },
  {
    id: "piano-stab",
    label: "Stabs",
    category: "piano",
    hint: "Kurze Akkordschläge auf den Zwischenschlägen.",
    mode: "chord",
    notes: [
      { step: 2, tone: 0, len: 2 },
      { step: 6, tone: 0, len: 2 },
      { step: 10, tone: 0, len: 2 },
      { step: 14, tone: 0, len: 2 },
    ],
  },
  {
    id: "piano-arp",
    label: "Arpeggio",
    category: "piano",
    hint: "Die Akkordtöne nacheinander - klingt sofort nach Können.",
    mode: "note",
    notes: [
      { step: 0, tone: 0, len: 2 },
      { step: 2, tone: 1, len: 2 },
      { step: 4, tone: 2, len: 2 },
      { step: 6, tone: 1, octave: 1, len: 2 },
      { step: 8, tone: 0, octave: 1, len: 2 },
      { step: 10, tone: 2, len: 2 },
      { step: 12, tone: 1, len: 2 },
      { step: 14, tone: 0, len: 2 },
    ],
  },
  {
    id: "piano-chops",
    label: "Chops",
    category: "piano",
    hint: "Zwei betonte Akkorde pro Takt, sonst Stille.",
    mode: "chord",
    notes: [
      { step: 0, tone: 0, len: 3 },
      { step: 7, tone: 0, len: 5 },
    ],
  },
  {
    id: "piano-dreams",
    label: "Traum",
    category: "piano",
    hint: "Weiche, weit auseinanderliegende Töne.",
    mode: "note",
    notes: [
      { step: 0, tone: 0, octave: 1, len: 6 },
      { step: 6, tone: 2, len: 6 },
      { step: 12, tone: 1, octave: 1, len: 4 },
    ],
  },

  /* -------------------------------------------------------------- Gitarre */
  {
    id: "guitar-strum",
    label: "Schrummen",
    category: "guitar",
    hint: "Runter, runter-rauf - das Lagerfeuer-Muster.",
    mode: "strum",
    notes: [
      { step: 0, tone: 0, len: 4 },
      { step: 4, tone: 0, len: 2 },
      { step: 6, tone: 0, len: 2, velocity: 0.6 },
      { step: 10, tone: 0, len: 2 },
      { step: 14, tone: 0, len: 2, velocity: 0.6 },
    ],
  },
  {
    id: "guitar-power",
    label: "Powerchords",
    category: "guitar",
    hint: "Harte Achtel - der Rock-Sound.",
    mode: "strum",
    notes: [0, 4, 8, 12].map((step) => ({ step, tone: 0, len: 3 })),
  },
  {
    id: "guitar-mute",
    label: "Gedämpft",
    category: "guitar",
    hint: "Kurz angetippt, sehr dezent im Hintergrund.",
    mode: "strum",
    notes: [2, 6, 10, 14].map((step) => ({
      step,
      tone: 0,
      len: 1,
      velocity: 0.5,
    })),
  },
  {
    id: "guitar-funk",
    label: "Funk Skank",
    category: "guitar",
    hint: "Kratzige Sechzehntel, die den Groove kitzeln.",
    mode: "strum",
    notes: [
      { step: 2, tone: 0, len: 1, velocity: 0.7 },
      { step: 3, tone: 0, len: 1, velocity: 0.4 },
      { step: 6, tone: 0, len: 1, velocity: 0.8 },
      { step: 10, tone: 0, len: 1, velocity: 0.6 },
      { step: 11, tone: 0, len: 1, velocity: 0.4 },
      { step: 15, tone: 0, len: 1, velocity: 0.7 },
    ],
  },

  /* ---------------------------------------------------------------- Synth */
  {
    id: "synth-air",
    label: "Luft",
    category: "synth",
    hint: "Eine liegende Fläche weit oben. Füllt Lücken.",
    mode: "chord",
    notes: [{ step: 0, tone: 0, octave: 1, len: 16 }],
  },
  {
    id: "synth-arp",
    label: "Arp",
    category: "synth",
    hint: "Schnelle Tonfolge - treibt das Stück nach vorn.",
    mode: "note",
    notes: [0, 2, 4, 6, 8, 10, 12, 14].map((step, index) => ({
      step,
      tone: index % 3,
      octave: index > 4 ? 1 : 0,
      len: 2,
    })),
  },
  {
    id: "synth-pluck",
    label: "Pluck",
    category: "synth",
    hint: "Kurze, perlende Töne auf den Zwischenschlägen.",
    mode: "note",
    notes: [
      { step: 4, tone: 2, octave: 1, len: 2 },
      { step: 12, tone: 1, octave: 1, len: 2 },
    ],
  },
  {
    id: "synth-bell",
    label: "Glocken",
    category: "synth",
    hint: "Helle Glocken, sparsam gesetzt.",
    mode: "note",
    notes: [{ step: 8, tone: 0, octave: 2, len: 6 }],
  },
];

export const ALL_LOOPS: Loop[] = [...DRUM_LOOPS, ...MELODY_LOOPS];

export function loopById(id: string): Loop | undefined {
  return ALL_LOOPS.find((loop) => loop.id === id);
}

export function loopsFor(category: LoopCategory): Loop[] {
  return ALL_LOOPS.filter((loop) => loop.category === category);
}

/** Wandelt ein Rhythmus-Zeichen in eine Anschlagstärke um. */
export function hitVelocity(char: string): number {
  switch (char) {
    case "X":
      return 1;
    case "x":
      return 0.75;
    case ".":
      return 0.4;
    default:
      return 0;
  }
}
