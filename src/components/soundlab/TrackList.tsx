"use client";

/*
 * Die Spuren der Band.
 *
 * Easy Mode zeigt: An/Aus, Lautstärke, Stumm. Pro Mode ergänzt Solo, Panorama
 * und die Klangfarbe - dieselbe Liste, nur mehr davon.
 */

import { useEffect, useRef, useState } from "react";
import { engine, TRACK_IDS, type TrackId } from "@/lib/soundlab/engine";
import { TRACK_META } from "@/lib/soundlab/song";
import { loopsFor } from "@/lib/soundlab/patterns";
import { useSoundLab } from "./SoundLabProvider";
import { Icon } from "./Icon";
import { Slider } from "./ui";

function useLevels(active: boolean) {
  const [levels, setLevels] = useState<Record<string, number>>({});
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
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
  }, [active]);

  return levels;
}

export function TrackList({ variant = "easy" }: { variant?: "easy" | "pro" }) {
  const { song, updateTrack, playing, startAudio, reachMilestone } = useSoundLab();
  const levels = useLevels(playing);
  const tracks = TRACK_IDS.map((id) => song.tracks[id]);
  const activeCount = tracks.filter((track) => track.enabled).length;

  return (
    <div className="space-y-3">
      {tracks.map((track) => {
        const meta = TRACK_META[track.id];
        const level = levels[track.id] ?? 0;
        const loops = track.id === "voice" ? [] : loopsFor(meta.category);
        return (
          <div
            key={track.id}
            className={`sl-card p-4 sm:p-5 sl-accent-${track.id} ${
              track.enabled ? "sl-card-active" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  startAudio();
                  updateTrack(track.id, { enabled: !track.enabled });
                  if (!track.enabled && activeCount >= 2) reachMilestone("first-band");
                }}
                className="relative shrink-0 grid place-items-center rounded-2xl"
                style={{
                  width: 52,
                  height: 52,
                  backgroundColor: track.enabled
                    ? "color-mix(in srgb, var(--sl-accent) 22%, var(--sl-surface-2))"
                    : "var(--sl-surface-2)",
                  border: `1px solid ${
                    track.enabled
                      ? "color-mix(in srgb, var(--sl-accent) 55%, transparent)"
                      : "var(--sl-line)"
                  }`,
                  transform: playing && track.enabled ? `scale(${1 + level * 0.12})` : undefined,
                  transition: "transform 90ms ease-out",
                }}
                aria-pressed={track.enabled}
                aria-label={`${meta.label} ${track.enabled ? "ausschalten" : "einschalten"}`}
              >
                <span className="text-2xl" aria-hidden>
                  {meta.emoji}
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-wide text-sm">
                    {meta.label}
                  </span>
                  {track.enabled ? (
                    <span className="sl-chip">an</span>
                  ) : (
                    <span className="sl-chip sl-chip-quiet">aus</span>
                  )}
                </div>

                {track.enabled ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div className="w-36 sm:w-44">
                      <Slider
                        value={track.volume}
                        max={1.2}
                        onChange={(value) => updateTrack(track.id, { volume: value })}
                        label="Lautstärke"
                        displayValue={`${Math.round(track.volume * 100)}`}
                      />
                    </div>
                    {loops.length ? (
                      <select
                        className="text-xs rounded-lg px-2 py-1.5"
                        style={{
                          backgroundColor: "var(--sl-surface-2)",
                          border: "1px solid var(--sl-line)",
                          color: "var(--sl-text)",
                        }}
                        value={track.loopId}
                        onChange={(event) =>
                          updateTrack(track.id, { loopId: event.target.value })
                        }
                        aria-label={`Spielweise für ${meta.label}`}
                      >
                        {loops.map((loop) => (
                          <option key={loop.id} value={loop.id}>
                            {loop.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ) : (
                  <p className="sl-muted text-xs mt-1">
                    {track.id === "voice"
                      ? "Nimm im Bereich Stimme etwas auf - dann läuft es hier mit."
                      : "Antippen und die Spur ist Teil deiner Band."}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  className="sl-icon-btn"
                  data-on={track.muted}
                  onClick={() => updateTrack(track.id, { muted: !track.muted })}
                  aria-label={`${meta.label} ${track.muted ? "laut" : "stumm"} schalten`}
                  title="Stumm"
                >
                  <Icon name={track.muted ? "volumeOff" : "volume"} size={16} />
                </button>
                {variant === "pro" ? (
                  <button
                    type="button"
                    className="sl-icon-btn text-xs font-bold"
                    data-on={track.solo}
                    onClick={() => updateTrack(track.id, { solo: !track.solo })}
                    title="Solo"
                    aria-label={`${meta.label} solo schalten`}
                  >
                    S
                  </button>
                ) : null}
                {track.enabled ? (
                  <button
                    type="button"
                    className="sl-icon-btn"
                    onClick={() => updateTrack(track.id, { enabled: false })}
                    title="Aus der Band nehmen"
                    aria-label={`${meta.label} entfernen`}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                ) : null}
              </div>
            </div>

            {variant === "pro" && track.enabled ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--sl-line-soft)" }}>
                <Slider
                  label="Panorama"
                  displayValue={
                    track.pan === 0
                      ? "Mitte"
                      : track.pan < 0
                        ? `${Math.round(-track.pan * 100)} links`
                        : `${Math.round(track.pan * 100)} rechts`
                  }
                  value={track.pan}
                  min={-1}
                  max={1}
                  onChange={(value) => updateTrack(track.id, { pan: value })}
                />
                <Slider
                  label="Reverb"
                  displayValue={`${Math.round(track.reverb * 100)} %`}
                  value={track.reverb}
                  onChange={(value) => updateTrack(track.id, { reverb: value })}
                />
                <Slider
                  label="Delay"
                  displayValue={`${Math.round(track.delay * 100)} %`}
                  value={track.delay}
                  onChange={(value) => updateTrack(track.id, { delay: value })}
                />
                <Slider
                  label="Höhen"
                  displayValue={`${track.eq.high > 0 ? "+" : ""}${track.eq.high.toFixed(0)} dB`}
                  value={track.eq.high}
                  min={-12}
                  max={12}
                  step={0.5}
                  onChange={(value) =>
                    updateTrack(track.id, { eq: { ...track.eq, high: value } })
                  }
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function trackIdsInBand(song: { tracks: Record<TrackId, { enabled: boolean }> }) {
  return TRACK_IDS.filter((id) => song.tracks[id].enabled);
}
