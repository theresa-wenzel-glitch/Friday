"use client";

/*
 * Die Bühne: für jedes aktive Instrument steht jemand da.
 *
 * Die Figuren wippen im Takt - die Bewegung kommt aus dem echten Pegel der
 * jeweiligen Spur, nicht aus einer festen Animation.
 */

import { useEffect, useRef, useState } from "react";
import { engine, TRACK_IDS } from "@/lib/soundlab/engine";
import { TRACK_META } from "@/lib/soundlab/song";
import { useSoundLab } from "./SoundLabProvider";

export function BandStage({ compact = false }: { compact?: boolean }) {
  const { song, playing, voiceBuffer } = useSoundLab();
  const [levels, setLevels] = useState<Record<string, number>>({});
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      setLevels({});
      return;
    }
    const tick = () => {
      const next: Record<string, number> = {};
      TRACK_IDS.forEach((id) => {
        next[id] = engine.level(id);
      });
      setLevels(next);
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, [playing]);

  const members = TRACK_IDS.filter((id) => song.tracks[id].enabled);

  return (
    <div
      className="sl-panel relative overflow-hidden"
      style={{ padding: compact ? "1.25rem" : "2rem 1.5rem" }}
    >
      <span
        className="sl-aurora"
        style={{
          width: 260,
          height: 260,
          left: "-60px",
          top: "-90px",
          background: "var(--sl-violet)",
        }}
      />
      <span
        className="sl-aurora"
        style={{
          width: 240,
          height: 240,
          right: "-70px",
          bottom: "-120px",
          background: "var(--sl-cyan)",
          animationDelay: "-6s",
        }}
      />

      <div className="relative flex items-end justify-center gap-4 sm:gap-8 flex-wrap">
        {members.length === 0 ? (
          <p className="sl-muted text-sm py-6">
            Noch ist die Bühne leer. Schalte unten ein Instrument ein.
          </p>
        ) : (
          members.map((id) => {
            const meta = TRACK_META[id];
            const level = levels[id] ?? 0;
            const muted = song.tracks[id].muted;
            return (
              <div
                key={id}
                className={`sl-accent-${id} flex flex-col items-center`}
                style={{
                  transform: `translateY(${-level * 10}px)`,
                  transition: "transform 110ms ease-out",
                  opacity: muted ? 0.35 : 1,
                }}
              >
                <div
                  className="grid place-items-center rounded-full"
                  style={{
                    width: compact ? 52 : 68,
                    height: compact ? 52 : 68,
                    fontSize: compact ? 24 : 30,
                    backgroundColor:
                      "color-mix(in srgb, var(--sl-accent) 18%, var(--sl-surface-2))",
                    border: "1px solid color-mix(in srgb, var(--sl-accent) 45%, transparent)",
                    boxShadow:
                      playing && level > 0.04
                        ? `0 0 ${16 + level * 44}px -6px color-mix(in srgb, var(--sl-accent) 90%, transparent)`
                        : "none",
                  }}
                >
                  <span aria-hidden>{meta.emoji}</span>
                </div>
                <span className="mt-2 text-xs font-semibold uppercase tracking-wide">
                  {meta.label}
                </span>
                {id === "voice" && !voiceBuffer ? (
                  <span className="sl-muted-2 text-[10px]">keine Aufnahme</span>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
