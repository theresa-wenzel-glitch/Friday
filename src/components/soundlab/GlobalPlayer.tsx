"use client";

/*
 * Der Player am unteren Rand. Er ist auf jeder Seite da und zeigt immer
 * dasselbe: Was läuft gerade, wie weit ist es, wie laut ist es.
 *
 * Pro Mode blendet zusätzlich Metronom, Tempo und Tonart ein.
 */

import { useEffect, useRef, useState } from "react";
import { engine } from "@/lib/soundlab/engine";
import { transport } from "@/lib/soundlab/transport";
import { formatTime, songSeconds } from "@/lib/soundlab/song";
import { KEYS } from "@/lib/soundlab/theory";
import { STYLES } from "@/lib/soundlab/patterns";
import { useSoundLab } from "./SoundLabProvider";
import { Icon } from "./Icon";
import { Slider } from "./ui";

export function GlobalPlayer() {
  const {
    song,
    playing,
    toggle,
    stop,
    setBpm,
    metronome,
    setMetronome,
    masterVolume,
    setMasterVolume,
    mode,
    updateSong,
  } = useSoundLab();
  const [progress, setProgress] = useState(0);
  const [wave, setWave] = useState<number[]>([]);
  const frame = useRef<number | null>(null);
  const buffer = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(new ArrayBuffer(256)));

  useEffect(() => {
    if (!playing) {
      setProgress(0);
      setWave([]);
      return;
    }
    const tick = () => {
      setProgress(transport.progress());
      const data = engine.waveform(buffer.current);
      const points: number[] = [];
      for (let i = 0; i < 48; i += 1) {
        points.push(Math.abs(data[Math.floor((i / 48) * data.length)] - 128) / 128);
      }
      setWave(points);
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, [playing]);

  const total = songSeconds(song);

  return (
    <div className="sl-player fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="sl-btn sl-btn-primary"
              style={{ width: 48, height: 48, padding: 0 }}
              onClick={toggle}
              aria-label={playing ? "Pause" : "Abspielen"}
            >
              <Icon name={playing ? "pause" : "play"} size={20} />
            </button>
            <button
              type="button"
              className="sl-icon-btn hidden sm:inline-flex"
              onClick={stop}
              aria-label="Stopp"
              title="Stopp"
            >
              <Icon name="stop" size={16} />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold">
                {song.name}
                <span className="sl-muted-2 font-normal">
                  {" "}
                  · {STYLES[song.styleId].label} · {song.bpm} BPM
                </span>
              </span>
              <span className="sl-muted-2 text-xs tabular-nums shrink-0">
                {formatTime(progress * total)} / {formatTime(total)}
              </span>
            </div>

            <div className="relative mt-1.5 h-6 flex items-center">
              {/* Wellenform als Hintergrund des Fortschritts */}
              <div className="absolute inset-0 flex items-center gap-[2px] opacity-45">
                {(wave.length ? wave : new Array(48).fill(0)).map((value, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-full"
                    style={{
                      height: `${Math.max(8, value * 100)}%`,
                      backgroundColor: "var(--sl-violet)",
                      transition: "height 80ms linear",
                    }}
                  />
                ))}
              </div>
              <div
                className="relative h-1.5 w-full rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--sl-surface-3)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: "linear-gradient(90deg, var(--sl-violet), var(--sl-pink))",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 w-40">
            <Icon name="volume" size={16} />
            <Slider value={masterVolume} onChange={setMasterVolume} label="Summe" />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="sl-icon-btn"
              data-on={metronome}
              onClick={() => setMetronome(!metronome)}
              aria-label="Metronom"
              title="Metronom"
            >
              <Icon name="metronome" size={16} />
            </button>
            <span
              className="sl-icon-btn cursor-default"
              data-on
              title="Der Song läuft in der Schleife"
              aria-label="Schleife aktiv"
            >
              <Icon name="repeat" size={16} />
            </span>
          </div>
        </div>

        {mode === "pro" ? (
          <div className="flex flex-wrap items-center gap-3 mt-2 pt-2" style={{ borderTop: "1px solid var(--sl-line-soft)" }}>
            <label className="flex items-center gap-2 text-xs sl-muted">
              Tempo
              <input
                type="number"
                min={40}
                max={200}
                value={song.bpm}
                onChange={(event) => setBpm(Number(event.target.value))}
                className="w-16 rounded-lg px-2 py-1 text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--sl-surface-2)",
                  border: "1px solid var(--sl-line)",
                  color: "var(--sl-text)",
                }}
              />
              BPM
            </label>
            <div className="w-40">
              <Slider
                value={song.bpm}
                min={40}
                max={200}
                step={1}
                onChange={setBpm}
                label="Tempo fein"
              />
            </div>
            <label className="flex items-center gap-2 text-xs sl-muted">
              Tonart
              <select
                value={song.keyRoot}
                onChange={(event) => updateSong({ keyRoot: Number(event.target.value) })}
                className="rounded-lg px-2 py-1 text-sm"
                style={{
                  backgroundColor: "var(--sl-surface-2)",
                  border: "1px solid var(--sl-line)",
                  color: "var(--sl-text)",
                }}
              >
                {KEYS.map((key) => (
                  <option key={key.root} value={key.root}>
                    {key.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="md:hidden w-32">
              <Slider value={masterVolume} onChange={setMasterVolume} label="Summe" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
