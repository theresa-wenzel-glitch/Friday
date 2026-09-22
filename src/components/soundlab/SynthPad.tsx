"use client";

/*
 * Synthesizer: ein Feld aus Tonflächen statt Tasten.
 *
 * Waagerecht die Töne der Tonleiter, senkrecht die Klangfarbe - von weich und
 * dunkel unten bis hell und offen oben. Ziehen erlaubt.
 */

import { useCallback, useState } from "react";
import { playSynth, type SynthPreset } from "@/lib/soundlab/voices";
import { midiToName, scaleDegree } from "@/lib/soundlab/theory";
import { useSoundLab } from "./SoundLabProvider";
import { Segmented, Slider } from "./ui";

const PRESETS: { id: SynthPreset; label: string }[] = [
  { id: "pad", label: "Fläche" },
  { id: "pluck", label: "Pluck" },
  { id: "lead", label: "Lead" },
  { id: "bell", label: "Glocke" },
];

const ROWS = 3;
const COLUMNS = 8;

export function SynthPad() {
  const { song, updateTrack, startAudio, reachMilestone } = useSoundLab();
  const [active, setActive] = useState<string | null>(null);
  const preset = (song.tracks.synth.preset as SynthPreset) ?? "pad";

  const trigger = useCallback(
    (row: number, column: number) => {
      startAudio();
      const midi = scaleDegree(column, song.keyRoot, song.scale, 4 + (ROWS - 1 - row));
      playSynth({
        track: "synth",
        midi,
        preset,
        duration: preset === "pad" ? 2.4 : 0.8,
        cutoff: 700 + (ROWS - row) * 1400,
        velocity: 0.85,
      });
      setActive(`${row}-${column}`);
      window.setTimeout(() => setActive(null), 240);
      reachMilestone("first-note");
    },
    [preset, reachMilestone, song.keyRoot, song.scale, startAudio],
  );

  return (
    <div className="sl-accent-synth">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Segmented
          size="sm"
          options={PRESETS.map((item) => ({ value: item.id, label: item.label }))}
          value={preset}
          onChange={(value) => updateTrack("synth", { preset: value })}
        />
        <div className="w-40">
          <Slider
            icon="volume"
            label="Lautstärke"
            value={song.tracks.synth.volume}
            max={1.2}
            onChange={(value) => updateTrack("synth", { volume: value })}
          />
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>
        {Array.from({ length: ROWS }).map((_, row) => (
          <div
            key={row}
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: COLUMNS }).map((_, column) => {
              const midi = scaleDegree(
                column,
                song.keyRoot,
                song.scale,
                4 + (ROWS - 1 - row),
              );
              const id = `${row}-${column}`;
              return (
                <button
                  key={id}
                  type="button"
                  className="sl-pad py-6 sm:py-7 flex items-center justify-center"
                  data-hit={active === id}
                  style={{
                    background: `linear-gradient(160deg,
                      color-mix(in srgb, var(--sl-accent) ${6 + (ROWS - row) * 7}%, var(--sl-surface-2)),
                      var(--sl-surface))`,
                  }}
                  onPointerDown={() => trigger(row, column)}
                  onPointerEnter={(event) => {
                    if (event.buttons === 1) trigger(row, column);
                  }}
                >
                  <span className="sl-pad-ring" />
                  <span className="text-xs font-semibold opacity-80">
                    {midiToName(midi, false)}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="sl-muted text-sm mt-4">
        Untere Reihe klingt dunkel und weich, obere hell und offen. Halte die Maus
        gedrückt und fahre über das Feld.
      </p>
    </div>
  );
}
