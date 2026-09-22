"use client";

/*
 * Das virtuelle Klavier.
 *
 * Bedienbar mit Maus, Finger und Computertastatur. Im Modus "Nur passende Töne"
 * rutscht jeder Anschlag automatisch auf den nächsten Ton der Tonleiter - dann
 * kann man nichts Falsches spielen. Genau das ist der Punkt: erst spielen,
 * später verstehen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { engine } from "@/lib/soundlab/engine";
import { playPiano, type PianoPreset } from "@/lib/soundlab/voices";
import {
  SCALES,
  inScale,
  isBlackKey,
  midiToName,
  scaleDegree,
  type ScaleId,
} from "@/lib/soundlab/theory";
import { useSoundLab } from "./SoundLabProvider";
import { Segmented, Slider, Toggle } from "./ui";
import { Icon } from "./Icon";

const PRESETS: { id: PianoPreset; label: string }[] = [
  { id: "piano", label: "Piano" },
  { id: "electric", label: "E-Piano" },
  { id: "soft", label: "Soft" },
  { id: "synth", label: "Synth" },
];

/* Tastenbelegung nach Position auf der Tastatur - unabhängig vom Layout. */
const WHITE_KEYS = [
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyG",
  "KeyH",
  "KeyJ",
  "KeyK",
  "KeyL",
  "Semicolon",
];
const BLACK_KEYS: Record<string, number> = {
  KeyW: 1,
  KeyE: 3,
  KeyT: 6,
  KeyY: 8,
  KeyU: 10,
  KeyO: 13,
  KeyP: 15,
};

const MELODIES: { id: string; label: string; degrees: number[] }[] = [
  {
    id: "entchen",
    label: "Alle meine Entchen",
    degrees: [0, 1, 2, 3, 4, 4, 5, 5, 5, 5, 4],
  },
  {
    id: "ode",
    label: "Ode an die Freude",
    degrees: [2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 2, 1, 1],
  },
  {
    id: "welle",
    label: "Sanfte Welle",
    degrees: [0, 2, 4, 2, 0, 2, 4, 6, 4, 2],
  },
];

const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];

function buildKeys(startOctave: number, octaves: number) {
  const keys: { midi: number; white: boolean; whiteIndex: number }[] = [];
  let whiteIndex = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    for (let semitone = 0; semitone < 12; semitone += 1) {
      const midi = 12 * (startOctave + octave + 1) + semitone;
      const white = !isBlackKey(midi);
      keys.push({ midi, white, whiteIndex: white ? whiteIndex : whiteIndex - 1 });
      if (white) whiteIndex += 1;
    }
  }
  // Abschließendes C, damit die Tastatur nicht mitten in der Oktave endet.
  const lastMidi = 12 * (startOctave + octaves + 1);
  keys.push({ midi: lastMidi, white: true, whiteIndex });
  return { keys, whiteCount: whiteIndex + 1 };
}

/** Der nächstgelegene Ton der Tonleiter - so klingt jeder Anschlag passend. */
function snapToScale(midi: number, root: number, scale: ScaleId): number {
  if (inScale(midi, root, scale)) return midi;
  for (let distance = 1; distance <= 6; distance += 1) {
    if (inScale(midi - distance, root, scale)) return midi - distance;
    if (inScale(midi + distance, root, scale)) return midi + distance;
  }
  return midi;
}

export function Piano({ compact = false }: { compact?: boolean }) {
  const { song, updateTrack, startAudio, reachMilestone, mode } = useSoundLab();
  const [octave, setOctave] = useState(4);
  const [easyPlay, setEasyPlay] = useState(true);
  const [showNames, setShowNames] = useState(true);
  const [melodyId, setMelodyId] = useState<string | null>(null);
  const [melodyIndex, setMelodyIndex] = useState(0);
  const [down, setDown] = useState<number[]>([]);
  const pointerNotes = useRef(new Map<number, number>());

  const preset = (song.tracks.piano.preset as PianoPreset) ?? "piano";
  const octaves = compact ? 1 : 2;
  const { keys, whiteCount } = useMemo(
    () => buildKeys(octave, octaves),
    [octave, octaves],
  );

  const melody = MELODIES.find((item) => item.id === melodyId) ?? null;
  const melodyNotes = useMemo(() => {
    if (!melody) return [];
    return melody.degrees.map((degree) =>
      scaleDegree(degree, song.keyRoot, song.scale, octave),
    );
  }, [melody, song.keyRoot, song.scale, octave]);

  const nextMelodyNote = melody ? melodyNotes[melodyIndex] : null;

  const press = useCallback(
    (midi: number) => {
      startAudio();
      const target = easyPlay ? snapToScale(midi, song.keyRoot, song.scale) : midi;
      playPiano({
        track: "piano",
        midi: target,
        preset,
        velocity: 0.85,
        duration: preset === "soft" ? 2.2 : 1.6,
      });
      setDown((current) => [...current, target]);
      window.setTimeout(
        () => setDown((current) => current.filter((note, index) => index !== current.indexOf(target))),
        260,
      );
      reachMilestone("first-note");
      if (nextMelodyNote !== null && target === nextMelodyNote) {
        setMelodyIndex((index) => (index + 1) % melodyNotes.length);
      }
      return target;
    },
    [
      easyPlay,
      melodyNotes.length,
      nextMelodyNote,
      preset,
      reachMilestone,
      song.keyRoot,
      song.scale,
      startAudio,
    ],
  );

  /* ------------------------------------------------- Computertastatur */
  useEffect(() => {
    const held = new Set<string>();
    const midiForCode = (code: string): number | null => {
      const whiteIndex = WHITE_KEYS.indexOf(code);
      if (whiteIndex >= 0) {
        const octaveOffset = Math.floor(whiteIndex / 7);
        return (
          12 * (octave + 1 + octaveOffset) + WHITE_OFFSETS[whiteIndex % 7]
        );
      }
      const black = BLACK_KEYS[code];
      if (black !== undefined) return 12 * (octave + 1) + black;
      return null;
    };

    const onDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      if (event.code === "ArrowLeft") {
        setOctave((value) => Math.max(2, value - 1));
        return;
      }
      if (event.code === "ArrowRight") {
        setOctave((value) => Math.min(6, value + 1));
        return;
      }
      const midi = midiForCode(event.code);
      if (midi === null || held.has(event.code)) return;
      held.add(event.code);
      event.preventDefault();
      press(midi);
    };
    const onUp = (event: KeyboardEvent) => held.delete(event.code);

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [octave, press]);

  const playMelody = () => {
    startAudio();
    const ctx = engine.ensure();
    melodyNotes.forEach((midi, index) => {
      playPiano({
        track: "piano",
        midi,
        preset,
        time: ctx.currentTime + index * 0.42,
        duration: 0.9,
      });
      window.setTimeout(() => setMelodyIndex(index), index * 420);
    });
    window.setTimeout(() => setMelodyIndex(0), melodyNotes.length * 420);
  };

  const keyWidth = 100 / whiteCount;

  return (
    <div className="sl-accent-piano">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="sl-label">Oktave</span>
          <div className="inline-flex items-center gap-1 sl-inset p-1">
            <button
              type="button"
              className="sl-icon-btn"
              style={{ width: "2rem", height: "2rem" }}
              onClick={() => setOctave((value) => Math.max(2, value - 1))}
              aria-label="Eine Oktave tiefer"
            >
              <Icon name="chevronLeft" size={16} />
            </button>
            <span className="w-8 text-center text-sm font-semibold tabular-nums">
              {octave}
            </span>
            <button
              type="button"
              className="sl-icon-btn"
              style={{ width: "2rem", height: "2rem" }}
              onClick={() => setOctave((value) => Math.min(6, value + 1))}
              aria-label="Eine Oktave höher"
            >
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
        </div>

        <Segmented
          size="sm"
          options={PRESETS.map((item) => ({ value: item.id, label: item.label }))}
          value={preset}
          onChange={(value) => updateTrack("piano", { preset: value })}
        />

        <div className="w-40">
          <Slider
            icon="volume"
            label="Lautstärke"
            value={song.tracks.piano.volume}
            max={1.2}
            onChange={(value) => updateTrack("piano", { volume: value })}
          />
        </div>
      </div>

      {/* Die Klaviatur */}
      <div className="sl-scroll-x -mx-1 px-1 pb-2">
        <div
          className="relative select-none"
          style={{
            minWidth: compact ? 360 : 620,
            height: compact ? 132 : 172,
          }}
          onPointerLeave={() => setDown([])}
        >
          {/* Weiße Tasten */}
          <div className="absolute inset-0 flex gap-[2px]">
            {keys
              .filter((key) => key.white)
              .map((key) => {
                const fits = inScale(key.midi, song.keyRoot, song.scale);
                return (
                  <button
                    key={key.midi}
                    type="button"
                    className="sl-key sl-key-white flex-1 flex items-end justify-center pb-2"
                    data-down={down.includes(key.midi)}
                    data-dim={easyPlay && !fits}
                    data-hint={nextMelodyNote === key.midi}
                    aria-label={midiToName(key.midi)}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      const played = press(key.midi);
                      pointerNotes.current.set(event.pointerId, played);
                    }}
                    onPointerUp={(event) =>
                      pointerNotes.current.delete(event.pointerId)
                    }
                  >
                    {showNames ? (
                      <span className="text-[10px] font-semibold opacity-70">
                        {midiToName(key.midi, false)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
          </div>

          {/* Schwarze Tasten liegen darüber */}
          {keys
            .filter((key) => !key.white)
            .map((key) => {
              const fits = inScale(key.midi, song.keyRoot, song.scale);
              const left = (key.whiteIndex + 1) * keyWidth;
              return (
                <button
                  key={key.midi}
                  type="button"
                  className="sl-key sl-key-black absolute top-0"
                  style={{
                    left: `calc(${left}% - ${keyWidth * 0.3}%)`,
                    width: `${keyWidth * 0.6}%`,
                    height: "62%",
                  }}
                  data-down={down.includes(key.midi)}
                  data-dim={easyPlay && !fits}
                  data-hint={nextMelodyNote === key.midi}
                  aria-label={midiToName(key.midi)}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    press(key.midi);
                  }}
                />
              );
            })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Toggle
          checked={easyPlay}
          onChange={setEasyPlay}
          label="Easy Play - nur passende Töne"
        />
        <Toggle checked={showNames} onChange={setShowNames} label="Notennamen" />
        {mode === "pro" ? (
          <span className="sl-chip sl-chip-quiet">
            Tonleiter: {SCALES[song.scale].label}
          </span>
        ) : null}
      </div>

      <div className="mt-5 sl-inset p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Icon name="sparkle" size={16} /> Zeig mir eine einfache Melodie
          </span>
          <div className="flex flex-wrap gap-2">
            {MELODIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sl-btn sl-btn-sm ${
                  melodyId === item.id ? "sl-btn-primary" : "sl-btn-ghost"
                }`}
                onClick={() => {
                  setMelodyId(melodyId === item.id ? null : item.id);
                  setMelodyIndex(0);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          {melody ? (
            <button type="button" className="sl-btn sl-btn-sm sl-btn-ghost" onClick={playMelody}>
              <Icon name="play" size={14} /> Vorspielen
            </button>
          ) : null}
        </div>
        {melody ? (
          <p className="sl-muted text-sm mt-3">
            Die leuchtende Taste ist als Nächstes dran - Ton {melodyIndex + 1} von{" "}
            {melodyNotes.length}. Kein Zeitdruck, die Melodie wartet auf dich.
          </p>
        ) : (
          <p className="sl-muted text-sm mt-3">
            Am Computer kannst du auch die Tasten A–L spielen, W/E/T/Z/U sind die
            schwarzen. Pfeiltasten wechseln die Oktave.
          </p>
        )}
      </div>
    </div>
  );
}
