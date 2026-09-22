/*
 * Der Arrangeur: übersetzt einen Song in einzelne Töne.
 *
 * Er bekommt von der Uhr einen Schritt und einen Zeitpunkt und entscheidet, was
 * in diesem Moment klingt - welcher Akkord, welche Spur, welcher Rhythmus.
 */

import { engine, type TrackId } from "./engine";
import {
  DRUM_LOOPS,
  MELODY_LOOPS,
  STEPS_PER_BAR,
  STYLES,
  hitVelocity,
  type MelodyLoop,
} from "./patterns";
import {
  BARS_PER_SECTION,
  sectionAtBar,
  songBars,
  type SongState,
} from "./song";
import { chordForDegree, chordNotes, type Chord } from "./theory";
import {
  playBass,
  playDrum,
  playPiano,
  playSynth,
  strumChord,
  type DrumId,
  type PianoPreset,
  type SynthPreset,
} from "./voices";

const drumById = new Map(DRUM_LOOPS.map((loop) => [loop.id, loop]));
const melodyById = new Map(MELODY_LOOPS.map((loop) => [loop.id, loop]));

/** Der Akkord, der in diesem Takt gilt. */
export function chordForBar(song: SongState, bar: number): Chord {
  const progression = STYLES[song.styleId].progression;
  const section = sectionAtBar(song, bar);
  const barInSection = bar % BARS_PER_SECTION;
  let degree = progression[barInSection % progression.length];
  // Der Refrain startet auf der Grundstufe - das macht ihn als Höhepunkt hörbar.
  if (section === "chorus" && barInSection === 0) degree = 0;
  return chordForDegree(degree, song.keyRoot, song.scale, 3);
}

function noteFromChord(chord: Chord, tone: number, octave = 0): number {
  const notes = chordNotes(chord);
  const index = ((tone % notes.length) + notes.length) % notes.length;
  const wrap = Math.floor(tone / notes.length);
  return notes[index] + 12 * (octave + wrap);
}

function playMelodyLoop(
  loop: MelodyLoop,
  track: TrackId,
  song: SongState,
  chord: Chord,
  stepInBar: number,
  time: number,
  stepDuration: number,
) {
  loop.notes
    .filter((note) => note.step === stepInBar)
    .forEach((note) => {
      const duration = Math.max(0.08, note.len * stepDuration);
      const velocity = note.velocity ?? 0.8;
      const octave = note.octave ?? 0;

      if (track === "bass") {
        playBass({
          track,
          midi: noteFromChord(chord, note.tone, octave) - 24,
          time,
          duration,
          velocity,
        });
        return;
      }

      if (track === "guitar") {
        strumChord(chordNotes(chord, octave), {
          track,
          time,
          velocity,
          duration: Math.max(0.5, duration),
          direction: note.step % 8 >= 4 ? "up" : "down",
        });
        return;
      }

      const notes =
        loop.mode === "chord"
          ? chordNotes(chord, octave + (track === "synth" ? 1 : 0))
          : [noteFromChord(chord, note.tone, octave + (track === "synth" ? 1 : 0))];

      notes.forEach((midi, index) => {
        if (track === "synth") {
          playSynth({
            track,
            midi: midi + 12,
            time,
            duration,
            velocity: velocity * 0.9,
            preset: (song.tracks.synth.preset as SynthPreset) ?? "pad",
          });
        } else {
          playPiano({
            track,
            midi: midi + 12,
            time: time + index * 0.004,
            duration,
            velocity,
            preset: (song.tracks.piano.preset as PianoPreset) ?? "piano",
          });
        }
      });
    });
}

export type ArrangerExtras = {
  /** Aufgenommene Stimme, wird zu Beginn jedes Durchlaufs gestartet. */
  voiceBuffer?: AudioBuffer | null;
  /**
   * Vorschau einer einzelnen Spur. Die Instrumentenseiten setzen das, damit man
   * beim Üben nur das eigene Instrument hört - die Band bleibt dabei erhalten.
   */
  only?: TrackId | null;
  /**
   * Spur, die gerade jemand selbst spielt. Der Arrangeur lässt sie frei, damit
   * die Begleitung läuft, ohne dem Menschen ins Wort zu fallen.
   */
  skip?: TrackId | null;
  onStep?: (step: number, bar: number) => void;
};

export function scheduleSongStep(
  song: SongState,
  step: number,
  time: number,
  extras: ArrangerExtras = {},
) {
  const totalBars = songBars(song);
  const bar = Math.floor(step / STEPS_PER_BAR) % totalBars;
  const stepInBar = step % STEPS_PER_BAR;
  const section = sectionAtBar(song, bar);
  const chord = chordForBar(song, bar);
  const stepDuration = 60 / song.bpm / 4;

  extras.onStep?.(step, bar);

  (Object.keys(song.tracks) as TrackId[]).forEach((id) => {
    const track = song.tracks[id];
    if (extras.only && id !== extras.only) return;
    if (extras.skip && id === extras.skip) return;
    if (!track.enabled) return;
    // In der Einzelvorschau läuft die Spur durchgehend - wer ein Instrument übt,
    // wartet nicht erst das Intro ab.
    if (!extras.only && !track.sections[section]) return;

    if (id === "drums") {
      const loop = drumById.get(track.loopId);
      if (loop) {
        (Object.keys(loop.steps) as DrumId[]).forEach((drum) => {
          const row = loop.steps[drum];
          if (!row) return;
          const velocity = hitVelocity(row[stepInBar] ?? "-");
          if (velocity > 0) playDrum(drum, { time, velocity });
        });
      }
      return;
    }

    if (id === "voice") {
      if (step === 0 && extras.voiceBuffer) {
        const ctx = engine.ensure();
        const source = ctx.createBufferSource();
        source.buffer = extras.voiceBuffer;
        source.connect(engine.bus("voice"));
        source.start(time);
      }
      return;
    }

    const loop = melodyById.get(track.loopId);
    if (loop) {
      playMelodyLoop(loop, id, song, chord, stepInBar, time, stepDuration);
    }
  });

  if (
    song.percussion.enabled &&
    song.tracks.drums.enabled &&
    (!extras.only || extras.only === "drums")
  ) {
    const loop = drumById.get(song.percussion.loopId);
    if (loop && (extras.only === "drums" || song.tracks.drums.sections[section])) {
      (Object.keys(loop.steps) as DrumId[]).forEach((drum) => {
        const row = loop.steps[drum];
        if (!row) return;
        const velocity = hitVelocity(row[stepInBar] ?? "-") * 0.7;
        if (velocity > 0) playDrum(drum, { time, velocity });
      });
    }
  }
}
