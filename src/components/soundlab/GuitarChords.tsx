"use client";

/*
 * Gitarre ohne Griffbrett.
 *
 * Vier große Akkorde, die zur Tonart passen, und ein breiter Schlagbalken. Wer
 * darüberzieht, schrummt - runter und rauf, mit leicht versetzten Saiten wie bei
 * einer echten Gitarre. Auto-Strum übernimmt den Rhythmus auf Wunsch selbst.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { strumChord } from "@/lib/soundlab/voices";
import { chordForDegree, chordNotes } from "@/lib/soundlab/theory";
import { transport } from "@/lib/soundlab/transport";
import { MELODY_LOOPS } from "@/lib/soundlab/patterns";
import { useSoundLab } from "./SoundLabProvider";
import { Icon } from "./Icon";
import { Slider, Toggle } from "./ui";

const DEGREES = [0, 4, 5, 3];

export function GuitarChords() {
  const {
    song,
    updateTrack,
    startAudio,
    reachMilestone,
    playing,
    play,
    stop,
    setLiveTrack,
  } = useSoundLab();
  const [selected, setSelected] = useState(0);
  const [autoStrum, setAutoStrum] = useState(false);
  const [flash, setFlash] = useState(false);
  const [direction, setDirection] = useState<"down" | "up">("down");
  const lastStrum = useRef(0);

  const chords = useMemo(
    () => DEGREES.map((degree) => chordForDegree(degree, song.keyRoot, song.scale, 3)),
    [song.keyRoot, song.scale],
  );
  const chord = chords[selected];

  useEffect(() => {
    setLiveTrack("guitar");
    return () => setLiveTrack(null);
  }, [setLiveTrack]);

  const strum = useCallback(
    (dir: "down" | "up") => {
      startAudio();
      const now = Date.now();
      if (now - lastStrum.current < 90) return;
      lastStrum.current = now;
      strumChord(chordNotes(chord, 0).concat(chordNotes(chord, 1).slice(0, 2)), {
        track: "guitar",
        direction: dir,
        velocity: 0.85,
      });
      setDirection(dir);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 220);
      reachMilestone("first-note");
    },
    [chord, reachMilestone, startAudio],
  );

  // Auto-Strum hängt sich an die Uhr und spielt das Schlagmuster des Stils.
  useEffect(() => {
    if (!autoStrum) return;
    const pattern =
      MELODY_LOOPS.find((loop) => loop.id === song.tracks.guitar.loopId) ??
      MELODY_LOOPS.find((loop) => loop.id === "guitar-strum")!;
    const unsubscribe = transport.subscribe((step, time) => {
      const stepInBar = step % 16;
      pattern.notes
        .filter((note) => note.step === stepInBar)
        .forEach((note) => {
          strumChord(chordNotes(chord, 0), {
            track: "guitar",
            time,
            velocity: (note.velocity ?? 0.8) * 0.9,
            direction: note.step % 8 >= 4 ? "up" : "down",
          });
        });
      if (pattern.notes.some((note) => note.step === stepInBar)) {
        // Der Schlagbalken blinkt im Takt mit, damit man das Muster sieht.
        window.setTimeout(
          () => {
            setFlash(true);
            window.setTimeout(() => setFlash(false), 140);
          },
          Math.max(0, (time - transport.currentTime()) * 1000),
        );
      }
    });
    return unsubscribe;
  }, [autoStrum, chord, song.tracks.guitar.loopId]);

  return (
    <div className="sl-accent-guitar">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {chords.map((item, index) => (
          <button
            key={item.name}
            type="button"
            className={`sl-pad py-7 flex flex-col items-center justify-center ${
              index === selected ? "sl-card-active" : ""
            }`}
            data-hit={index === selected && flash}
            onPointerDown={() => {
              setSelected(index);
              startAudio();
              strumChord(chordNotes(item, 0), { track: "guitar", velocity: 0.8 });
              reachMilestone("first-note");
            }}
          >
            <span className="sl-pad-ring" />
            <span className="text-2xl font-semibold">{item.name}</span>
            <span className="sl-muted-2 text-[11px] mt-1">
              {index === 0
                ? "Zuhause"
                : index === 1
                  ? "Spannung"
                  : index === 2
                    ? "Nachdenklich"
                    : "Weich"}
            </span>
          </button>
        ))}
      </div>

      {/* Der Schlagbalken: darüberziehen genügt. */}
      <button
        type="button"
        className="sl-pad mt-5 w-full py-10 flex flex-col items-center justify-center"
        data-hit={flash}
        onPointerDown={() => strum("down")}
        onPointerEnter={(event) => {
          if (event.buttons === 1) strum(direction === "down" ? "up" : "down");
        }}
        onPointerUp={() => strum("up")}
      >
        <span className="sl-pad-ring" />
        {/* Sechs Saiten, damit sofort klar ist, was der Balken ist. */}
        <span className="absolute inset-x-6 inset-y-3 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4, 5].map((string) => (
            <span
              key={string}
              className="block rounded-full"
              style={{
                height: `${1 + string * 0.35}px`,
                backgroundColor: "color-mix(in srgb, var(--sl-accent) 35%, transparent)",
                opacity: flash ? 0.9 : 0.45,
                transition: "opacity 140ms ease",
              }}
            />
          ))}
        </span>
        <span className="relative text-lg font-semibold flex items-center gap-2">
          <Icon name="waveform" size={20} /> Strummen
        </span>
        <span className="relative sl-muted text-sm mt-1">
          Drücken und halten - runter und rauf, wie bei einer echten Gitarre.
        </span>
      </button>

      <div className="mt-5 sl-inset p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Toggle
          checked={autoStrum}
          onChange={(value) => {
            setAutoStrum(value);
            if (value) {
              startAudio();
              if (!playing) play();
            }
          }}
          label="Auto-Strum - der Rhythmus kommt von allein"
        />
        {autoStrum ? (
          <button
            type="button"
            className="sl-btn sl-btn-sm sl-btn-ghost"
            onClick={() => (playing ? stop() : play())}
          >
            <Icon name={playing ? "pause" : "play"} size={14} />
            {playing ? "Pause" : "Los"}
          </button>
        ) : null}
        <div className="w-44">
          <Slider
            icon="volume"
            label="Lautstärke Gitarre"
            value={song.tracks.guitar.volume}
            max={1.2}
            onChange={(value) => updateTrack("guitar", { volume: value })}
          />
        </div>
      </div>

      <p className="sl-muted text-sm mt-4">
        Diese vier Akkorde passen immer zusammen. Wechsle alle vier Schläge einen
        Akkord weiter - schon klingt es nach einem Lied.
      </p>
    </div>
  );
}
