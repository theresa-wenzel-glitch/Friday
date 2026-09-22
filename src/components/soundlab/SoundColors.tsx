"use client";

/*
 * Tonveränderung für den Easy Mode.
 *
 * Statt Reglern gibt es sechs Karten. Jede setzt im Hintergrund dieselben
 * Werte, die im Pro Mode einzeln sichtbar sind - man lernt sie also schon
 * kennen, ohne sie bedienen zu müssen.
 */

import { engine, TRACK_IDS } from "@/lib/soundlab/engine";
import { KEYS } from "@/lib/soundlab/theory";
import { useSoundLab } from "./SoundLabProvider";
import { Stepper } from "./ui";

type ColorId = "dry" | "room" | "dream" | "warm" | "bright" | "punch";

const COLORS: {
  id: ColorId;
  label: string;
  emoji: string;
  text: string;
}[] = [
  { id: "dry", label: "Trocken", emoji: "🎯", text: "Direkt und nah, ohne Raum." },
  { id: "room", label: "Weiter Raum", emoji: "🏛️", text: "Klingt wie in einer großen Halle." },
  { id: "dream", label: "Traum-Echo", emoji: "🌙", text: "Töne hallen sanft nach." },
  { id: "warm", label: "Warm", emoji: "🔥", text: "Mehr Bauch, weniger Schärfe." },
  { id: "bright", label: "Hell", emoji: "💎", text: "Frisch und offen obenrum." },
  { id: "punch", label: "Kräftig", emoji: "💪", text: "Alles rückt enger zusammen." },
];

export function SoundColors() {
  const { song, updateTrack, updateSong, setBpm, startAudio } = useSoundLab();

  const apply = (id: ColorId) => {
    startAudio();
    TRACK_IDS.forEach((track) => {
      const current = song.tracks[track];
      switch (id) {
        case "dry":
          updateTrack(track, { reverb: 0.04, delay: 0, eq: { low: 0, mid: 0, high: 0 } });
          break;
        case "room":
          updateTrack(track, { reverb: track === "drums" ? 0.22 : 0.45, delay: 0.05 });
          break;
        case "dream":
          updateTrack(track, { reverb: 0.35, delay: track === "drums" ? 0.1 : 0.4 });
          break;
        case "warm":
          updateTrack(track, { eq: { ...current.eq, low: 4.5, high: -3 } });
          break;
        case "bright":
          updateTrack(track, { eq: { ...current.eq, low: -1.5, high: 5 } });
          break;
        case "punch":
          updateTrack(track, { eq: { ...current.eq, low: 2, mid: 1.5 } });
          break;
      }
    });
    if (id === "punch") engine.setCompressor(0.8);
    if (id === "dry") engine.setCompressor(0.15);
    if (id === "dream") engine.setDelayTime((60 / song.bpm) * 0.75);
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            className="sl-card sl-card-hover p-4 text-left"
            onClick={() => apply(color.id)}
          >
            <span className="text-xl" aria-hidden>
              {color.emoji}
            </span>
            <span className="block font-semibold mt-1.5">{color.label}</span>
            <span className="block sl-muted text-xs mt-1">{color.text}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-8 mt-6">
        <div>
          <p className="sl-label mb-2">Tempo · langsamer / schneller</p>
          <Stepper value={song.bpm} onChange={setBpm} min={50} max={200} step={2} unit="BPM" />
        </div>
        <div>
          <p className="sl-label mb-2">Tonhöhe · tiefer / höher</p>
          <div className="inline-flex items-center gap-1 sl-inset px-1.5 py-1.5">
            <button
              type="button"
              className="sl-icon-btn"
              style={{ width: "2.1rem", height: "2.1rem" }}
              onClick={() => updateSong({ keyRoot: (song.keyRoot + 11) % 12 })}
              aria-label="Tonart tiefer"
            >
              −
            </button>
            <span className="min-w-[5.5rem] text-center text-sm font-semibold">
              {KEYS[song.keyRoot].label}
            </span>
            <button
              type="button"
              className="sl-icon-btn"
              style={{ width: "2.1rem", height: "2.1rem" }}
              onClick={() => updateSong({ keyRoot: (song.keyRoot + 1) % 12 })}
              aria-label="Tonart höher"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
