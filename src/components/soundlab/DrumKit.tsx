"use client";

/*
 * Schlagzeug: sechs große Pads und eine Auswahl fertiger Beats.
 *
 * Die Pads reagieren sofort - Anschlag, Ring, Glühen. Wer lieber zuhört, wählt
 * einen Beat und drückt Play; der laufende Beat leuchtet Schritt für Schritt mit.
 */

import { useCallback, useEffect, useState } from "react";
import { playDrum, type DrumId } from "@/lib/soundlab/voices";
import { DRUM_LOOPS, STEPS_PER_BAR, hitVelocity } from "@/lib/soundlab/patterns";
import { useSoundLab } from "./SoundLabProvider";
import { Icon } from "./Icon";
import { Slider } from "./ui";

const PADS: { id: DrumId; label: string; hint: string; code: string }[] = [
  { id: "kick", label: "Kick", hint: "Der tiefe Puls", code: "KeyZ" },
  { id: "snare", label: "Snare", hint: "Der Knall auf 2 und 4", code: "KeyX" },
  { id: "hihat", label: "Hi-Hat", hint: "Das feine Ticken", code: "KeyC" },
  { id: "tom", label: "Tom", hint: "Rund und dumpf", code: "KeyV" },
  { id: "crash", label: "Crash", hint: "Der große Moment", code: "KeyB" },
  { id: "clap", label: "Clap", hint: "Klatschen", code: "KeyN" },
];

export function DrumKit() {
  const { song, updateTrack, updateSong, startAudio, reachMilestone, playing, toggle, step } =
    useSoundLab();
  const [hits, setHits] = useState<Record<string, number>>({});

  const hit = useCallback(
    (id: DrumId) => {
      startAudio();
      playDrum(id, { velocity: 1 });
      setHits((current) => ({ ...current, [id]: Date.now() }));
      window.setTimeout(
        () => setHits((current) => ({ ...current, [id]: 0 })),
        180,
      );
      reachMilestone("first-note");
    },
    [reachMilestone, startAudio],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      const pad = PADS.find((item) => item.code === event.code);
      if (!pad || event.repeat) return;
      event.preventDefault();
      hit(pad.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hit]);

  const beats = DRUM_LOOPS.filter((loop) => loop.category === "drums");
  const selected = beats.find((loop) => loop.id === song.tracks.drums.loopId) ?? beats[0];
  const cursor = playing ? step % STEPS_PER_BAR : -1;

  return (
    <div className="sl-accent-drums">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {PADS.map((pad) => (
          <button
            key={pad.id}
            type="button"
            className="sl-pad p-5 sm:p-6 text-left"
            data-hit={Boolean(hits[pad.id])}
            onPointerDown={() => hit(pad.id)}
          >
            <span className="sl-pad-ring" />
            {/* Schlagfläche - leuchtet beim Anschlag mit. */}
            <span
              className="absolute right-4 top-4 rounded-full"
              style={{
                width: 44,
                height: 44,
                background: hits[pad.id]
                  ? "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--sl-accent) 90%, white), color-mix(in srgb, var(--sl-accent) 55%, transparent))"
                  : "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--sl-accent) 26%, transparent), transparent 70%)",
                border: "1px solid color-mix(in srgb, var(--sl-accent) 35%, transparent)",
                transition: "background 120ms ease",
              }}
            />
            <span className="relative block text-lg sm:text-xl font-semibold">{pad.label}</span>
            <span className="relative block sl-muted text-xs mt-1">{pad.hint}</span>
            <span className="sl-muted-2 text-[10px] mt-3 block uppercase tracking-wider">
              Taste {pad.code.replace("Key", "")}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 sl-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="sl-label mb-1">Beat auswählen</p>
            <h3 className="text-lg font-semibold">{selected.label}</h3>
            <p className="sl-muted text-sm">{selected.hint}</p>
          </div>
          <button
            type="button"
            className="sl-btn sl-btn-primary"
            onClick={() => {
              startAudio();
              if (!song.tracks.drums.enabled) {
                updateTrack("drums", { enabled: true });
              }
              reachMilestone("first-beat");
              toggle();
            }}
          >
            <Icon name={playing ? "pause" : "play"} size={18} />
            {playing ? "Stopp" : "Beat starten"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {beats.map((loop) => (
            <button
              key={loop.id}
              type="button"
              className={`sl-btn sl-btn-sm ${
                loop.id === selected.id ? "sl-btn-primary" : "sl-btn-ghost"
              }`}
              onClick={() => {
                updateTrack("drums", { loopId: loop.id });
                reachMilestone("first-beat");
              }}
            >
              {loop.label}
            </button>
          ))}
        </div>

        {/* Der Beat als Raster - man sieht, was man hört. */}
        <div className="mt-5 space-y-2">
          {(Object.keys(selected.steps) as DrumId[]).map((drum) => (
            <div key={drum} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs sl-muted uppercase tracking-wide">
                {drum}
              </span>
              <div className="sl-step-grid flex-1">
                {Array.from({ length: STEPS_PER_BAR }).map((_, index) => (
                  <div
                    key={index}
                    className="sl-step"
                    data-on={hitVelocity(selected.steps[drum]?.[index] ?? "-") > 0}
                    data-cursor={cursor === index}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <Slider
            icon="volume"
            label="Lautstärke Drums"
            value={song.tracks.drums.volume}
            max={1.2}
            onChange={(value) => updateTrack("drums", { volume: value })}
          />
          <Slider
            label="Swing - wie locker der Beat schwingt"
            displayValue={`${Math.round(song.swing * 100)} %`}
            value={song.swing}
            max={0.5}
            onChange={(value) => updateSong({ swing: value })}
          />
        </div>
      </div>
    </div>
  );
}
