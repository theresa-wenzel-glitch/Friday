"use client";

/*
 * Bass für Menschen, die noch nie einen Bass in der Hand hatten.
 *
 * Statt Griffbrett gibt es drei Lagen - TIEF, MITTE, HOCH - und darin nur Töne,
 * die zur Tonart passen. Damit klingt jede Reihenfolge nach Basslinie.
 */

import { useCallback, useState } from "react";
import { playBass } from "@/lib/soundlab/voices";
import { midiToName, scaleDegree } from "@/lib/soundlab/theory";
import { useSoundLab } from "./SoundLabProvider";
import { Slider } from "./ui";

const ZONES = [
  { id: "low", label: "Tief", hint: "Der Boden. Ruhig und schwer.", base: 0 },
  { id: "mid", label: "Mitte", hint: "Die Bewegung dazwischen.", base: 3 },
  { id: "high", label: "Hoch", hint: "Kleine Melodien im Bass.", base: 6 },
];

export function BassPads() {
  const { song, updateTrack, startAudio, reachMilestone } = useSoundLab();
  const [active, setActive] = useState<string | null>(null);

  const play = useCallback(
    (midi: number, id: string) => {
      startAudio();
      playBass({ track: "bass", midi, duration: 0.9, velocity: 0.95 });
      setActive(id);
      window.setTimeout(() => setActive(null), 220);
      reachMilestone("first-note");
    },
    [reachMilestone, startAudio],
  );

  return (
    <div className="sl-accent-bass">
      <div className="space-y-4">
        {ZONES.map((zone) => (
          <div key={zone.id}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="sl-label">{zone.label}</span>
              <span className="sl-muted-2 text-xs">{zone.hint}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              {Array.from({ length: 6 }).map((_, index) => {
                const midi =
                  scaleDegree(zone.base + index, song.keyRoot, song.scale, 2) - 12;
                const id = `${zone.id}-${index}`;
                return (
                  <button
                    key={id}
                    type="button"
                    className="sl-pad py-6 sm:py-8 flex flex-col items-center justify-center"
                    data-hit={active === id}
                    onPointerDown={() => play(midi, id)}
                  >
                    <span className="sl-pad-ring" />
                    <span className="text-base font-semibold">
                      {midiToName(midi, false)}
                    </span>
                    <span className="sl-muted-2 text-[10px] mt-1">
                      {index === 0 ? "Grundton" : `Stufe ${index + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <Slider
          icon="volume"
          label="Lautstärke Bass"
          value={song.tracks.bass.volume}
          max={1.2}
          onChange={(value) => updateTrack("bass", { volume: value })}
        />
        <p className="sl-muted text-sm self-center">
          Tipp: Bleib oft auf dem Grundton links. Ein einziger tiefer Ton pro Takt
          trägt einen ganzen Song.
        </p>
      </div>
    </div>
  );
}
