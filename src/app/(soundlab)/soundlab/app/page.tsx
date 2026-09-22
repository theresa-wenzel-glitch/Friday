"use client";

/*
 * Das Dashboard. Erste Frage an den Nutzer ist keine Einstellung, sondern eine
 * Absicht: Was möchtest du heute machen?
 */

import Link from "next/link";
import { BandStage } from "@/components/soundlab/BandStage";
import { Icon } from "@/components/soundlab/Icon";
import { LEVELS } from "@/components/soundlab/AppShell";
import { useSoundLab } from "@/components/soundlab/SoundLabProvider";
import { TRACK_META } from "@/lib/soundlab/song";
import { TRACK_IDS } from "@/lib/soundlab/engine";
import { STYLES } from "@/lib/soundlab/patterns";

const CARDS = [
  {
    href: "/soundlab/app/instrumente",
    emoji: "🎹",
    title: "Instrumente",
    text: "Klavier, Drums, Bass, Gitarre, Synth - direkt spielbar.",
    accent: "piano",
  },
  {
    href: "/soundlab/app/instrumente/drums",
    emoji: "🥁",
    title: "Beats",
    text: "Fertige Rhythmen starten oder selbst auf die Pads hauen.",
    accent: "drums",
  },
  {
    href: "/soundlab/app/voice",
    emoji: "🎤",
    title: "Stimme",
    text: "Aufnehmen, anhören, Klangfarbe ändern.",
    accent: "voice",
  },
  {
    href: "/soundlab/app/band",
    emoji: "🎸",
    title: "Meine Band",
    text: "Instrumente zusammenstellen und gemeinsam laufen lassen.",
    accent: "guitar",
  },
  {
    href: "/soundlab/app/projekte",
    emoji: "🎧",
    title: "Meine Projekte",
    text: "Gespeicherte Songs wieder öffnen.",
    accent: "synth",
  },
];

const INTENTS = [
  {
    href: "/soundlab/app/instrumente",
    title: "Einfach losspielen",
    text: "Ein Instrument, ein Klick, ein Ton.",
    accent: "piano",
    icon: "play" as const,
  },
  {
    href: "/soundlab/app/band",
    title: "Eine Band erstellen",
    text: "Mehrere Instrumente gleichzeitig.",
    accent: "guitar",
    icon: "user" as const,
  },
  {
    href: "/soundlab/app/studio",
    title: "Meinen Song verbessern",
    text: "Struktur, Loops, Feinschliff.",
    accent: "cyan",
    icon: "sparkle" as const,
  },
];

export default function DashboardPage() {
  const { song, milestones, projects, playing, toggle, mode } = useSoundLab();
  const active = TRACK_IDS.filter((id) => song.tracks[id].enabled);
  const reached = LEVELS.filter((level) => milestones.includes(level.id)).length;

  return (
    <div className="space-y-10">
      <section className="sl-fade-up">
        <p className="sl-label mb-3">Willkommen zurück</p>
        <h1 className="text-3xl sm:text-5xl leading-tight">
          Mach Musik. Ohne Vorkenntnisse.
        </h1>
        <p className="sl-muted text-base sm:text-lg mt-3 max-w-2xl">
          Spiele Instrumente, baue deine eigene Band und entdecke deinen Sound.
        </p>
      </section>

      <section>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`sl-card sl-card-hover sl-halo p-6 sl-accent-${card.accent} relative overflow-hidden`}
            >
              <span className="relative text-3xl block" aria-hidden>
                {card.emoji}
              </span>
              <h2 className="relative text-xl mt-4">{card.title}</h2>
              <p className="relative sl-muted text-sm mt-1.5">{card.text}</p>
              <span className="relative inline-flex items-center gap-1.5 text-sm font-semibold mt-4 sl-accent-text">
                Öffnen <Icon name="chevronRight" size={15} />
              </span>
            </Link>
          ))}

          <div className="sl-card p-6 flex flex-col justify-between">
            <div>
              <p className="sl-label">Aktuelle Band</p>
              <p className="text-xl mt-3 flex flex-wrap gap-1.5">
                {active.length ? (
                  active.map((id) => (
                    <span key={id} title={TRACK_META[id].label} aria-hidden>
                      {TRACK_META[id].emoji}
                    </span>
                  ))
                ) : (
                  <span className="sl-muted text-sm">Noch niemand auf der Bühne.</span>
                )}
              </p>
              <p className="sl-muted text-sm mt-2">
                {song.name} · {STYLES[song.styleId].label} · {song.bpm} BPM
              </p>
            </div>
            <button type="button" className="sl-btn sl-btn-primary mt-5" onClick={toggle}>
              <Icon name={playing ? "pause" : "play"} size={18} />
              {playing ? "Pause" : "Anhören"}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl mb-4">Was möchtest du heute machen?</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {INTENTS.map((intent) => (
            <Link
              key={intent.href}
              href={intent.href}
              className={`sl-card sl-card-hover p-7 sl-accent-${intent.accent === "cyan" ? "synth" : intent.accent}`}
            >
              <span
                className="grid place-items-center rounded-2xl"
                style={{
                  width: 46,
                  height: 46,
                  backgroundColor: "color-mix(in srgb, var(--sl-accent) 20%, transparent)",
                  color: "var(--sl-accent)",
                }}
              >
                <Icon name={intent.icon} size={22} />
              </span>
              <h3 className="text-xl mt-4">{intent.title}</h3>
              <p className="sl-muted text-sm mt-1.5">{intent.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <h2 className="text-2xl">Deine Bühne</h2>
          <Link href="/soundlab/app/band" className="sl-btn sl-btn-sm sl-btn-ghost">
            Band bearbeiten
          </Link>
        </div>
        <BandStage />
      </section>

      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <div className="sl-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">Dein Weg</h2>
            <span className="sl-chip sl-chip-quiet">
              {reached} von {LEVELS.length} entdeckt
            </span>
          </div>
          <ol className="space-y-2">
            {LEVELS.map((level) => {
              const done = milestones.includes(level.id);
              return (
                <li key={level.id} className="flex items-center gap-3 sl-inset p-3">
                  <span
                    className="grid place-items-center rounded-full shrink-0 text-xs font-bold"
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: done
                        ? "color-mix(in srgb, var(--sl-green) 70%, transparent)"
                        : "var(--sl-surface-3)",
                      color: done ? "#07090f" : "var(--sl-muted)",
                    }}
                  >
                    {done ? <Icon name="check" size={14} /> : level.level}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{level.label}</span>
                    <span className="block sl-muted text-xs">{level.hint}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-4">
          <Link href="/soundlab/app/lernen" className="sl-card sl-card-hover p-6 block sl-accent-synth">
            <span className="text-3xl block" aria-hidden>
              💡
            </span>
            <h3 className="text-xl mt-3">Musik entdecken</h3>
            <p className="sl-muted text-sm mt-1.5">
              Kurze Erklärungen zum Mitspielen: Beat, Akkord, Tonleiter, Melodie.
            </p>
          </Link>

          <div className="sl-card p-6">
            <p className="sl-label mb-2">Zuletzt gespeichert</p>
            {projects.length ? (
              <ul className="space-y-2">
                {projects.slice(0, 3).map((project) => (
                  <li key={project.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm truncate">{project.name}</span>
                    <span className="sl-muted-2 text-xs shrink-0">
                      {new Date(project.savedAt).toLocaleDateString("de-DE")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sl-muted text-sm">
                Noch nichts gespeichert. Im Studio wird aus deiner Band ein Projekt.
              </p>
            )}
            <Link href="/soundlab/app/projekte" className="sl-btn sl-btn-sm sl-btn-ghost mt-4">
              Alle Projekte
            </Link>
          </div>

          {mode === "easy" ? (
            <Link href="/soundlab/app/pro" className="sl-card sl-card-hover p-6 block sl-accent-bass">
              <h3 className="text-lg">Mehr Kontrolle?</h3>
              <p className="sl-muted text-sm mt-1.5">
                Der Pro Mode zeigt Timeline, Mischpult und Effekte - dieselbe Band,
                mehr Regler.
              </p>
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
