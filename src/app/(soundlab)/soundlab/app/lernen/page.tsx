"use client";

/*
 * "Musik entdecken": sechs kurze Lektionen.
 *
 * Jede besteht aus zwei, drei Sätzen, einem Bild aus Kästchen und einem Knopf,
 * der die Sache hörbar macht. Erklären durch Hinhören statt durch Text.
 */

import { useState } from "react";
import Link from "next/link";
import { engine } from "@/lib/soundlab/engine";
import { playBass, playDrum, playPiano } from "@/lib/soundlab/voices";
import { chordForDegree, chordNotes, midiToName, scaleDegree } from "@/lib/soundlab/theory";
import { Icon } from "@/components/soundlab/Icon";
import { useSoundLab } from "@/components/soundlab/SoundLabProvider";

type LessonId = "beat" | "chord" | "scale" | "note" | "bass" | "melody";

const LESSONS: {
  id: LessonId;
  title: string;
  text: string;
  accent: string;
  visual: "beat" | "stack" | "stairs" | "target" | "low" | "line";
}[] = [
  {
    id: "beat",
    title: "Was ist ein Beat?",
    text: "Ein Beat ist ein regelmäßiges Klopfen: 1 – 2 – 3 – 4. Alles andere in der Musik hängt sich daran auf.",
    accent: "drums",
    visual: "beat",
  },
  {
    id: "chord",
    title: "Was ist ein Akkord?",
    text: "Mehrere Töne gleichzeitig. Drei genügen schon - zusammen ergeben sie eine Stimmung.",
    accent: "piano",
    visual: "stack",
  },
  {
    id: "scale",
    title: "Wie funktioniert eine Tonleiter?",
    text: "Eine Auswahl von Tönen, die zusammen gut klingen. Wer darin bleibt, kann kaum danebenliegen.",
    accent: "synth",
    visual: "stairs",
  },
  {
    id: "note",
    title: "Wie finde ich den richtigen Ton?",
    text: "Der Grundton ist das Zuhause. Nach ihm klingt jede Melodie fertig - hör den Unterschied.",
    accent: "guitar",
    visual: "target",
  },
  {
    id: "bass",
    title: "Wie funktioniert ein Bass?",
    text: "Der Bass spielt tief und wenig. Meist nur den Grundton des Akkords - das reicht völlig.",
    accent: "bass",
    visual: "low",
  },
  {
    id: "melody",
    title: "Wie singe ich eine Melodie?",
    text: "Eine Melodie ist eine Reihe einzelner Töne. Summ sie erst, sing sie später.",
    accent: "voice",
    visual: "line",
  },
];

function Visual({ kind }: { kind: string }) {
  if (kind === "beat") {
    return (
      <div className="flex gap-2 mt-4">
        {[1, 2, 3, 4].map((beat) => (
          <span
            key={beat}
            className="flex-1 h-10 rounded-lg grid place-items-center text-xs font-bold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--sl-accent) 25%, var(--sl-surface))",
              border: "1px solid color-mix(in srgb, var(--sl-accent) 45%, transparent)",
            }}
          >
            {beat}
          </span>
        ))}
      </div>
    );
  }
  if (kind === "stack") {
    return (
      <div className="space-y-1.5 mt-4">
        {[70, 85, 100].map((width, index) => (
          <span
            key={index}
            className="block h-3 rounded-full"
            style={{
              width: `${width}%`,
              backgroundColor: "color-mix(in srgb, var(--sl-accent) 55%, transparent)",
            }}
          />
        ))}
      </div>
    );
  }
  if (kind === "stairs") {
    return (
      <div className="flex items-end gap-1.5 mt-4 h-14">
        {[20, 34, 48, 58, 72, 86, 100].map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t-md"
            style={{
              height: `${height}%`,
              backgroundColor: "color-mix(in srgb, var(--sl-accent) 55%, transparent)",
            }}
          />
        ))}
      </div>
    );
  }
  if (kind === "target") {
    return (
      <div className="mt-4 flex items-center gap-2">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className="h-10 flex-1 rounded-lg"
            style={{
              backgroundColor:
                index === 0
                  ? "color-mix(in srgb, var(--sl-accent) 70%, transparent)"
                  : "var(--sl-surface)",
              border: "1px solid var(--sl-line)",
            }}
          />
        ))}
      </div>
    );
  }
  if (kind === "low") {
    return (
      <div className="mt-4 h-14 flex items-end gap-1.5">
        {[100, 20, 20, 70, 20, 20, 90, 20].map((height, index) => (
          <span
            key={index}
            className="flex-1 rounded-t-md"
            style={{
              height: `${height}%`,
              backgroundColor:
                height > 50
                  ? "color-mix(in srgb, var(--sl-accent) 60%, transparent)"
                  : "var(--sl-surface-3)",
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="mt-4 h-14 flex items-center gap-1">
      {[40, 55, 70, 60, 80, 65, 50, 45].map((height, index) => (
        <span
          key={index}
          className="flex-1 rounded-full"
          style={{
            height: `${height}%`,
            backgroundColor: "color-mix(in srgb, var(--sl-accent) 55%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

export default function LearnPage() {
  const { song, startAudio } = useSoundLab();
  const [active, setActive] = useState<LessonId | null>(null);

  const demo = (id: LessonId) => {
    startAudio();
    const ctx = engine.ensure();
    const now = ctx.currentTime + 0.05;
    const beat = 60 / song.bpm;
    const chord = chordForDegree(0, song.keyRoot, song.scale, 3);
    setActive(id);
    window.setTimeout(() => setActive(null), 2600);

    switch (id) {
      case "beat":
        [0, 1, 2, 3].map((index) => {
          playDrum(index % 2 === 0 ? "kick" : "snare", { time: now + index * beat });
          playDrum("hihat", { time: now + index * beat + beat / 2, velocity: 0.6 });
          return null;
        });
        break;
      case "chord":
        playPiano({ track: "piano", midi: chord.root + 12, time: now, duration: 1 });
        chordNotes(chord, 1).forEach((midi) =>
          playPiano({ track: "piano", midi, time: now + beat * 1.2, duration: 2 }),
        );
        break;
      case "scale":
        Array.from({ length: 8 }).forEach((_, index) =>
          playPiano({
            track: "piano",
            midi: scaleDegree(index, song.keyRoot, song.scale, 4),
            time: now + index * (beat / 2),
            duration: 0.5,
          }),
        );
        break;
      case "note":
        chordNotes(chord, 1).forEach((midi) =>
          playPiano({ track: "piano", midi, time: now, duration: 1.6 }),
        );
        playPiano({
          track: "piano",
          midi: scaleDegree(4, song.keyRoot, song.scale, 4),
          time: now + beat * 1.4,
          duration: 0.8,
        });
        playPiano({
          track: "piano",
          midi: scaleDegree(0, song.keyRoot, song.scale, 4),
          time: now + beat * 2.2,
          duration: 1.6,
        });
        break;
      case "bass":
        chordNotes(chord, 1).forEach((midi) =>
          playPiano({ track: "piano", midi, time: now, duration: 2.4, velocity: 0.5 }),
        );
        [0, 1, 2, 3].forEach((index) =>
          playBass({
            track: "bass",
            midi: chord.root - 24,
            time: now + index * beat,
            duration: beat * 0.8,
          }),
        );
        break;
      case "melody":
        [0, 2, 4, 2, 0].forEach((degree, index) =>
          playPiano({
            track: "piano",
            midi: scaleDegree(degree, song.keyRoot, song.scale, 4),
            time: now + index * beat * 0.6,
            duration: 0.7,
          }),
        );
        break;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="sl-label mb-2">Musik entdecken</p>
        <h1 className="text-3xl sm:text-4xl">Kurz erklärt, sofort gehört.</h1>
        <p className="sl-muted mt-2 max-w-xl">
          Sechs kleine Lektionen. Keine Theorie zum Auswendiglernen - jede endet
          mit einem Knopf, der die Sache hörbar macht.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LESSONS.map((lesson) => (
          <article
            key={lesson.id}
            className={`sl-card p-6 sl-accent-${lesson.accent} ${
              active === lesson.id ? "sl-card-active" : ""
            }`}
          >
            <h2 className="text-lg">{lesson.title}</h2>
            <p className="sl-muted text-sm mt-2">{lesson.text}</p>
            <Visual kind={lesson.visual} />
            <button
              type="button"
              className="sl-btn sl-btn-sm sl-btn-ghost mt-5"
              onClick={() => demo(lesson.id)}
            >
              <Icon name="play" size={14} />
              {active === lesson.id ? "Läuft …" : "Hör es dir an"}
            </button>
          </article>
        ))}
      </div>

      <div className="sl-panel p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl">
            Aktuell in {midiToName(scaleDegree(0, song.keyRoot, song.scale, 4), false)}
          </h2>
          <p className="sl-muted text-sm mt-1">
            Alle Beispiele klingen in der Tonart deines Songs - du hörst also genau
            das, womit du gerade arbeitest.
          </p>
        </div>
        <Link href="/soundlab/app/instrumente/klavier" className="sl-btn sl-btn-primary">
          Selbst ausprobieren <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    </div>
  );
}
