"use client";

/*
 * Loops: kleine musikalische Bausteine zum Stapeln.
 *
 * Jeder Loop gehört zu einer Spur. Angetippt wird er sofort aktiv - Tempo,
 * Tonart und Taktraster kommen vom Song, deshalb passt alles automatisch
 * zusammen, egal was man kombiniert.
 */

import { useState } from "react";
import {
  loopsFor,
  type LoopCategory,
  type DrumLoop,
  type MelodyLoop,
} from "@/lib/soundlab/patterns";
import type { TrackId } from "@/lib/soundlab/engine";
import { hitVelocity, STEPS_PER_BAR } from "@/lib/soundlab/patterns";
import { useSoundLab } from "./SoundLabProvider";
import { Icon } from "./Icon";

const CATEGORIES: { id: LoopCategory; label: string; emoji: string; track: TrackId | null }[] = [
  { id: "drums", label: "Drums", emoji: "🥁", track: "drums" },
  { id: "bass", label: "Bass", emoji: "🎸", track: "bass" },
  { id: "piano", label: "Piano", emoji: "🎹", track: "piano" },
  { id: "guitar", label: "Guitar", emoji: "🎸", track: "guitar" },
  { id: "synth", label: "Synth", emoji: "🎛️", track: "synth" },
  { id: "percussion", label: "Percussion", emoji: "🪘", track: null },
];

function LoopPreview({ loop }: { loop: DrumLoop | MelodyLoop }) {
  const cells: boolean[] = Array.from({ length: STEPS_PER_BAR }).map(() => false);
  if ("steps" in loop) {
    Object.values(loop.steps).forEach((row) => {
      if (!row) return;
      for (let i = 0; i < STEPS_PER_BAR; i += 1) {
        if (hitVelocity(row[i] ?? "-") > 0) cells[i] = true;
      }
    });
  } else {
    loop.notes.forEach((note) => {
      if (note.step < STEPS_PER_BAR) cells[note.step] = true;
    });
  }

  return (
    <div className="sl-step-grid mt-3">
      {cells.map((on, index) => (
        <span key={index} className="sl-step" data-on={on} />
      ))}
    </div>
  );
}

export function LoopBrowser() {
  const { song, updateTrack, updateSong, startAudio, reachMilestone } = useSoundLab();
  const [category, setCategory] = useState<LoopCategory>("drums");
  const loops = loopsFor(category);
  const entry = CATEGORIES.find((item) => item.id === category)!;
  const activeId =
    entry.track === null
      ? song.percussion.loopId
      : song.tracks[entry.track].loopId;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sl-btn sl-btn-sm ${
              category === item.id ? "sl-btn-primary" : "sl-btn-ghost"
            }`}
            onClick={() => setCategory(item.id)}
          >
            <span aria-hidden>{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loops.map((loop) => {
          const active =
            activeId === loop.id &&
            (entry.track === null
              ? song.percussion.enabled
              : song.tracks[entry.track].enabled);
          return (
            <button
              key={loop.id}
              type="button"
              className={`sl-card sl-card-hover p-5 text-left sl-accent-${
                entry.track ?? "drums"
              } ${active ? "sl-card-active" : ""}`}
              onClick={() => {
                startAudio();
                if (entry.track === null) {
                  updateSong({
                    percussion: {
                      loopId: loop.id,
                      enabled: !(song.percussion.enabled && activeId === loop.id),
                    },
                  });
                } else {
                  const track = song.tracks[entry.track];
                  const turningOff = track.enabled && track.loopId === loop.id;
                  updateTrack(entry.track, {
                    loopId: loop.id,
                    enabled: !turningOff,
                  });
                  if (!turningOff) reachMilestone("first-band");
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="block font-semibold">{loop.label}</span>
                  <span className="block sl-muted text-xs mt-1">{loop.hint}</span>
                </div>
                <span
                  className="shrink-0 grid place-items-center rounded-full"
                  style={{
                    width: 34,
                    height: 34,
                    backgroundColor: active
                      ? "color-mix(in srgb, var(--sl-accent) 80%, transparent)"
                      : "var(--sl-surface-3)",
                    color: active ? "#0a0c15" : "var(--sl-muted)",
                  }}
                >
                  <Icon name={active ? "check" : "plus"} size={16} />
                </span>
              </div>
              <LoopPreview loop={loop} />
            </button>
          );
        })}
      </div>

      <p className="sl-muted text-sm mt-5">
        Mehrere Loops laufen gleichzeitig. Sie teilen sich Tempo und Tonart des
        Songs - deshalb passt jede Kombination zusammen.
      </p>
    </div>
  );
}
