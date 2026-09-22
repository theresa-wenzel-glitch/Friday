/*
 * Kleine Musiktheorie-Werkzeugkiste.
 *
 * Alles rechnet mit MIDI-Notennummern (C4 = 60). Das ist die einfachste
 * gemeinsame Sprache: Tonleitern sind Abstände, Akkorde sind Abstände, und
 * die Frequenz ist eine einzige Formel entfernt.
 */

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const SOLFEGE: Record<string, string> = {
  C: "Do",
  D: "Re",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};

/** Frequenz einer MIDI-Note in Hertz (A4 = 440 Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Umgekehrt: Frequenz zur nächstgelegenen (gebrochenen) MIDI-Note. */
export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

export function midiToName(midi: number, withOctave = true): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return withOctave ? `${name}${Math.floor(midi / 12) - 1}` : name;
}

export function isBlackKey(midi: number): boolean {
  return NOTE_NAMES[((midi % 12) + 12) % 12].includes("#");
}

export type ScaleId = "major" | "minor" | "pentatonic" | "blues" | "dorian";

export const SCALES: Record<
  ScaleId,
  { label: string; steps: number[]; hint: string }
> = {
  major: {
    label: "Dur",
    steps: [0, 2, 4, 5, 7, 9, 11],
    hint: "Fröhlich, offen, der Klassiker im Pop.",
  },
  minor: {
    label: "Moll",
    steps: [0, 2, 3, 5, 7, 8, 10],
    hint: "Nachdenklich und warm - viele Balladen leben davon.",
  },
  pentatonic: {
    label: "Pentatonik",
    steps: [0, 2, 4, 7, 9],
    hint: "Fünf Töne, die fast immer zusammenpassen. Ideal zum Loslegen.",
  },
  blues: {
    label: "Blues",
    steps: [0, 3, 5, 6, 7, 10],
    hint: "Rau und bluesig durch den zusätzlichen „blue note“-Ton.",
  },
  dorian: {
    label: "Dorisch",
    steps: [0, 2, 3, 5, 7, 9, 10],
    hint: "Moll mit einem hellen Ton extra - klingt nach Funk und Jazz.",
  },
};

export const KEYS = [
  { root: 0, label: "C" },
  { root: 1, label: "C#" },
  { root: 2, label: "D" },
  { root: 3, label: "D#" },
  { root: 4, label: "E" },
  { root: 5, label: "F" },
  { root: 6, label: "F#" },
  { root: 7, label: "G" },
  { root: 8, label: "G#" },
  { root: 9, label: "A" },
  { root: 10, label: "A#" },
  { root: 11, label: "B" },
] as const;

/** Gehört die Note zur Tonleiter? */
export function inScale(midi: number, root: number, scale: ScaleId): boolean {
  const steps = SCALES[scale].steps;
  const rel = ((midi - root) % 12 + 12) % 12;
  return steps.includes(rel);
}

/** Die n-te Stufe einer Tonleiter, über Oktaven hinaus fortgesetzt. */
export function scaleDegree(
  index: number,
  root: number,
  scale: ScaleId,
  baseOctave = 4,
): number {
  const steps = SCALES[scale].steps;
  const len = steps.length;
  const octave = Math.floor(index / len);
  const within = ((index % len) + len) % len;
  return 12 * (baseOctave + 1) + root + steps[within] + 12 * octave;
}

export type ChordQuality = "major" | "minor" | "dim" | "sus4" | "maj7" | "min7" | "dom7";

const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  sus4: [0, 5, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
};

export type Chord = {
  /** z.B. "Am" */
  name: string;
  /** Grundton als MIDI-Note */
  root: number;
  quality: ChordQuality;
};

export function chordNotes(chord: Chord, octaveShift = 0): number[] {
  return CHORD_INTERVALS[chord.quality].map(
    (i) => chord.root + i + octaveShift * 12,
  );
}

export function chordLabel(root: number, quality: ChordQuality): string {
  const base = midiToName(root, false);
  switch (quality) {
    case "minor":
      return `${base}m`;
    case "dim":
      return `${base}dim`;
    case "sus4":
      return `${base}sus4`;
    case "maj7":
      return `${base}maj7`;
    case "min7":
      return `${base}m7`;
    case "dom7":
      return `${base}7`;
    default:
      return base;
  }
}

/** Die üblichen Stufenakkorde einer Dur- bzw. Molltonart. */
const MAJOR_DEGREE_QUALITY: ChordQuality[] = [
  "major",
  "minor",
  "minor",
  "major",
  "major",
  "minor",
  "dim",
];
const MINOR_DEGREE_QUALITY: ChordQuality[] = [
  "minor",
  "dim",
  "major",
  "minor",
  "minor",
  "major",
  "major",
];

/**
 * Baut den Akkord auf der Stufe `degree` (0 = Grundstufe) der Tonart.
 * Für Tonleitern ohne sieben Stufen (Pentatonik, Blues) wird auf Dur bzw.
 * Moll zurückgegriffen, damit immer ein brauchbarer Akkord herauskommt.
 */
export function chordForDegree(
  degree: number,
  root: number,
  scale: ScaleId,
  octave = 3,
): Chord {
  const minorish = scale === "minor" || scale === "blues" || scale === "dorian";
  const steps = minorish ? SCALES.minor.steps : SCALES.major.steps;
  const qualities = minorish ? MINOR_DEGREE_QUALITY : MAJOR_DEGREE_QUALITY;
  const idx = ((degree % 7) + 7) % 7;
  const midi = 12 * (octave + 1) + root + steps[idx];
  const quality = qualities[idx];
  return { name: chordLabel(midi, quality), root: midi, quality };
}
