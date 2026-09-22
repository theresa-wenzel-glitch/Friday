"use client";

/*
 * Die Songstruktur.
 *
 * Easy: vier Abschnitte nebeneinander, pro Abschnitt schaltet man Instrumente
 * an und aus. Pro: dieselben Daten als Raster über alle Takte, mit Abspielkopf
 * und zum Ziehen.
 */

import { useRef, useState } from "react";
import { TRACK_IDS, type TrackId } from "@/lib/soundlab/engine";
import {
  BARS_PER_SECTION,
  SECTIONS,
  TRACK_META,
  formatTime,
  songBars,
  type SectionId,
} from "@/lib/soundlab/song";
import { STEPS_PER_BAR } from "@/lib/soundlab/patterns";
import { useSoundLab } from "./SoundLabProvider";

export function EasySongTimeline() {
  const { song, updateTrack, playing, step } = useSoundLab();
  const currentBar = Math.floor(step / STEPS_PER_BAR) % songBars(song);
  const currentSection = SECTIONS[Math.floor(currentBar / BARS_PER_SECTION)]?.id;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {SECTIONS.map((section, index) => {
        const active = playing && currentSection === section.id;
        return (
          <div
            key={section.id}
            className={`sl-card p-5 ${active ? "sl-card-active" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="sl-label">Teil {index + 1}</span>
              {active ? <span className="sl-chip">läuft</span> : null}
            </div>
            <h3 className="text-lg mt-1">{section.label}</h3>
            <p className="sl-muted text-xs mt-1 min-h-[2.5rem]">{section.hint}</p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {TRACK_IDS.filter((id) => song.tracks[id].enabled).map((id) => {
                const on = song.tracks[id].sections[section.id];
                return (
                  <button
                    key={id}
                    type="button"
                    className={`sl-accent-${id} sl-btn sl-btn-sm ${
                      on ? "sl-btn-primary" : "sl-btn-quiet"
                    }`}
                    onClick={() =>
                      updateTrack(id, {
                        sections: {
                          ...song.tracks[id].sections,
                          [section.id]: !on,
                        },
                      })
                    }
                    title={`${TRACK_META[id].label} in ${section.label}`}
                  >
                    <span aria-hidden>{TRACK_META[id].emoji}</span>
                    {TRACK_META[id].label}
                  </button>
                );
              })}
              {TRACK_IDS.every((id) => !song.tracks[id].enabled) ? (
                <span className="sl-muted text-xs">Noch keine Instrumente.</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProTimeline() {
  const { song, updateTrack, playing, step } = useSoundLab();
  const bars = songBars(song);
  const currentBar = Math.floor(step / STEPS_PER_BAR) % bars;
  const paintValue = useRef<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const secondsPerBar = (4 * 60) / song.bpm;

  const sectionOfBar = (bar: number): SectionId =>
    SECTIONS[Math.floor(bar / BARS_PER_SECTION) % SECTIONS.length].id;

  const setCell = (id: TrackId, bar: number, value: boolean) => {
    const section = sectionOfBar(bar);
    if (song.tracks[id].sections[section] === value) return;
    updateTrack(id, {
      sections: { ...song.tracks[id].sections, [section]: value },
    });
  };

  return (
    <div
      className="sl-panel p-4 sm:p-5 select-none"
      onPointerUp={() => {
        setDragging(false);
        paintValue.current = null;
      }}
      onPointerLeave={() => {
        setDragging(false);
        paintValue.current = null;
      }}
    >
      <div className="sl-scroll-x">
        <div style={{ minWidth: 640 }}>
          {/* Zeitleiste */}
          <div className="flex items-end mb-2">
            <span className="w-24 shrink-0 sl-label">Time</span>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${bars}, 1fr)` }}>
              {Array.from({ length: bars }).map((_, bar) => (
                <span
                  key={bar}
                  className="text-[10px] sl-muted-2 tabular-nums"
                  style={{ opacity: bar % 2 === 0 ? 1 : 0.35 }}
                >
                  {bar % 2 === 0 ? formatTime(bar * secondsPerBar) : "·"}
                </span>
              ))}
            </div>
          </div>

          {/* Abschnittsleiste */}
          <div className="flex items-center mb-3">
            <span className="w-24 shrink-0 sl-label">Struktur</span>
            <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${SECTIONS.length}, 1fr)` }}>
              {SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className="text-center text-xs font-semibold py-1.5 rounded-lg"
                  style={{
                    backgroundColor:
                      sectionOfBar(currentBar) === section.id && playing
                        ? "color-mix(in srgb, var(--sl-violet) 32%, var(--sl-surface-2))"
                        : "var(--sl-surface-2)",
                    border: "1px solid var(--sl-line)",
                  }}
                >
                  {section.label}
                </div>
              ))}
            </div>
          </div>

          {/* Spuren */}
          <div className="space-y-1.5 relative">
            {playing ? (
              <div
                className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
                style={{
                  left: `calc(6rem + (100% - 6rem) * ${(currentBar + 0.5) / bars})`,
                  backgroundColor: "var(--sl-pink)",
                  boxShadow: "0 0 12px 1px var(--sl-pink)",
                }}
              />
            ) : null}

            {TRACK_IDS.map((id) => {
              const track = song.tracks[id];
              return (
                <div key={id} className={`flex items-center sl-accent-${id}`}>
                  <div className="w-24 shrink-0 flex items-center gap-2 pr-2">
                    <span aria-hidden>{TRACK_META[id].emoji}</span>
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wide truncate"
                      style={{ opacity: track.enabled ? 1 : 0.45 }}
                    >
                      {TRACK_META[id].label}
                    </span>
                  </div>
                  <div
                    className="flex-1 grid gap-[3px]"
                    style={{ gridTemplateColumns: `repeat(${bars}, 1fr)` }}
                  >
                    {Array.from({ length: bars }).map((_, bar) => {
                      const on = track.enabled && track.sections[sectionOfBar(bar)];
                      return (
                        <button
                          key={bar}
                          type="button"
                          className="h-8 rounded-md transition-colors"
                          style={{
                            backgroundColor: on
                              ? "color-mix(in srgb, var(--sl-accent) 62%, transparent)"
                              : "var(--sl-surface)",
                            border: `1px solid ${
                              on
                                ? "color-mix(in srgb, var(--sl-accent) 75%, transparent)"
                                : "var(--sl-line-soft)"
                            }`,
                            outline:
                              playing && bar === currentBar
                                ? "1px solid color-mix(in srgb, var(--sl-pink) 60%, transparent)"
                                : "none",
                          }}
                          onPointerDown={() => {
                            setDragging(true);
                            paintValue.current = !on;
                            if (!track.enabled) updateTrack(id, { enabled: true });
                            setCell(id, bar, !on);
                          }}
                          onPointerEnter={() => {
                            if (dragging && paintValue.current !== null) {
                              setCell(id, bar, paintValue.current);
                            }
                          }}
                          aria-label={`${TRACK_META[id].label}, Takt ${bar + 1}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="sl-muted text-xs mt-4">
        Klicken schaltet einen Abschnitt für diese Spur an oder aus, Ziehen malt
        über mehrere Takte. Der rosa Strich zeigt, wo gerade gespielt wird.
      </p>
    </div>
  );
}
