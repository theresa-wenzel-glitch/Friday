"use client";

/*
 * Der Probierkasten auf der Startseite.
 *
 * Bewusst ohne Anmeldung, ohne Erklärung, ohne App-Zustand: antippen, Ton hören.
 * Das ist das Versprechen der App in fünf Sekunden.
 */

import { useState } from "react";
import { engine } from "@/lib/soundlab/engine";
import { playBass, playDrum, playPiano, playSynth, strumChord } from "@/lib/soundlab/voices";
import { chordForDegree, chordNotes, scaleDegree } from "@/lib/soundlab/theory";

type DemoId = "drums" | "bass" | "piano" | "guitar" | "synth";

const ITEMS: { id: DemoId; label: string; emoji: string; hint: string }[] = [
  { id: "piano", label: "Piano", emoji: "🎹", hint: "Ein heller Akkord" },
  { id: "drums", label: "Drums", emoji: "🥁", hint: "Kick, Snare, Hi-Hat" },
  { id: "bass", label: "Bass", emoji: "🎸", hint: "Zwei tiefe Töne" },
  { id: "guitar", label: "Gitarre", emoji: "🎸", hint: "Ein Schlag über die Saiten" },
  { id: "synth", label: "Synth", emoji: "🎛️", hint: "Eine weite Fläche" },
];

export function LandingDemo() {
  const [hit, setHit] = useState<DemoId | null>(null);

  const trigger = (id: DemoId) => {
    const ctx = engine.ensure();
    const now = ctx.currentTime;
    const chord = chordForDegree(0, 0, "major", 3);
    setHit(id);
    window.setTimeout(() => setHit(null), 320);

    switch (id) {
      case "piano":
        chordNotes(chord, 1).forEach((midi, index) =>
          playPiano({ track: "piano", midi, time: now + index * 0.05, duration: 1.8 }),
        );
        break;
      case "drums":
        playDrum("kick", { time: now });
        playDrum("hihat", { time: now + 0.25 });
        playDrum("snare", { time: now + 0.5 });
        playDrum("hihat", { time: now + 0.75 });
        break;
      case "bass":
        playBass({ track: "bass", midi: 36, time: now, duration: 0.5 });
        playBass({ track: "bass", midi: 43, time: now + 0.4, duration: 0.7 });
        break;
      case "guitar":
        strumChord(chordNotes(chord, 0), { track: "guitar", time: now });
        break;
      case "synth":
        chordNotes(chord, 2).forEach((midi) =>
          playSynth({ track: "synth", midi, time: now, duration: 2.2, preset: "pad" }),
        );
        break;
    }

    if (id === "synth") {
      playSynth({
        track: "synth",
        midi: scaleDegree(4, 0, "major", 5),
        time: now + 0.4,
        duration: 1.6,
        preset: "bell",
      });
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`sl-pad sl-accent-${item.id} p-4 sm:p-5 text-left`}
          data-hit={hit === item.id}
          onPointerDown={() => trigger(item.id)}
        >
          <span className="sl-pad-ring" />
          <span className="text-2xl block" aria-hidden>
            {item.emoji}
          </span>
          <span className="block font-semibold mt-2">{item.label}</span>
          <span className="block sl-muted text-xs mt-0.5">{item.hint}</span>
        </button>
      ))}
    </div>
  );
}
