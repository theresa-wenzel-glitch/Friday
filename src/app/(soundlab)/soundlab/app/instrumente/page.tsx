"use client";

import Link from "next/link";
import { Icon } from "@/components/soundlab/Icon";

/*
 * Die Instrumentenauswahl: sechs Karten, eine Frage, kein Menü.
 */

const INSTRUMENTS = [
  {
    slug: "klavier",
    emoji: "🎹",
    title: "Klavier",
    text: "Tasten zum Antippen, vier Klangfarben, Melodie-Hilfe.",
    accent: "piano",
  },
  {
    slug: "drums",
    emoji: "🥁",
    title: "Schlagzeug",
    text: "Sechs große Pads und fertige Beats in sechs Stilen.",
    accent: "drums",
  },
  {
    slug: "gitarre",
    emoji: "🎸",
    title: "Gitarre",
    text: "Vier Akkorde, ein Schlagbalken, Auto-Strum.",
    accent: "guitar",
  },
  {
    slug: "bass",
    emoji: "🎸",
    title: "Bass",
    text: "Tief, Mitte, Hoch - Basslinien ohne Noten.",
    accent: "bass",
  },
  {
    slug: "synth",
    emoji: "🎛️",
    title: "Synthesizer",
    text: "Ein Feld aus Klangflächen, von dunkel bis hell.",
    accent: "synth",
  },
  {
    slug: "stimme",
    emoji: "🎤",
    title: "Stimme",
    text: "Aufnehmen, anhören, Klangfarbe ändern.",
    accent: "voice",
  },
];

export default function InstrumentsPage() {
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl">Was möchtest du spielen?</h1>
      <p className="sl-muted mt-3 max-w-xl">
        Alles ist sofort spielbar - mit Maus, Finger oder Tastatur. Nichts davon
        kann kaputtgehen.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {INSTRUMENTS.map((instrument, index) => (
          <Link
            key={instrument.slug}
            href={`/soundlab/app/instrumente/${instrument.slug}`}
            className={`sl-card sl-card-hover sl-halo p-7 relative overflow-hidden sl-accent-${instrument.accent} sl-fade-up`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <span className="relative text-4xl block" aria-hidden>
              {instrument.emoji}
            </span>
            <h2 className="relative text-2xl mt-4">{instrument.title}</h2>
            <p className="relative sl-muted text-sm mt-2">{instrument.text}</p>
            <span className="relative inline-flex items-center gap-1.5 text-sm font-semibold mt-5 sl-accent-text">
              Spielen <Icon name="chevronRight" size={15} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
