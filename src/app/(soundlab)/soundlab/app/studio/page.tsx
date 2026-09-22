"use client";

/*
 * Der Song Builder.
 *
 * Drei Entscheidungen - Tempo, Stil, Instrumente - und es klingt. Danach kommt
 * alles Weitere freiwillig: Struktur, Loops, Klangfarbe.
 */

import { useState } from "react";
import Link from "next/link";
import { EasySongTimeline, ProTimeline } from "@/components/soundlab/SongTimeline";
import { LoopBrowser } from "@/components/soundlab/LoopBrowser";
import { SoundColors } from "@/components/soundlab/SoundColors";
import { Icon } from "@/components/soundlab/Icon";
import { SectionHeading, Stepper } from "@/components/soundlab/ui";
import { useSoundLab } from "@/components/soundlab/SoundLabProvider";
import { STYLE_LIST } from "@/lib/soundlab/patterns";
import { TRACK_IDS } from "@/lib/soundlab/engine";
import { TRACK_META, formatTime, songSeconds } from "@/lib/soundlab/song";

export default function StudioPage() {
  const {
    song,
    setStyle,
    setBpm,
    updateTrack,
    playing,
    toggle,
    mode,
    saveProject,
    updateSong,
    reachMilestone,
    startAudio,
  } = useSoundLab();
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <div>
        <p className="sl-label mb-2">Song Builder</p>
        <h1 className="text-3xl sm:text-4xl">Bau deinen Song.</h1>
        <p className="sl-muted mt-2 max-w-xl">
          Drei Einstellungen genügen für eine fertige Grundlage. Alles danach ist
          Feinschliff.
        </p>
      </div>

      {/* Schritt 1-3 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="sl-card p-6">
          <span className="sl-chip">Schritt 1</span>
          <h2 className="text-xl mt-3">Tempo</h2>
          <p className="sl-muted text-sm mt-1 mb-4">
            Langsam wirkt ruhig, schnell wirkt treibend.
          </p>
          <Stepper value={song.bpm} onChange={setBpm} min={50} max={200} step={2} unit="BPM" />
        </div>

        <div className="sl-card p-6">
          <span className="sl-chip">Schritt 2</span>
          <h2 className="text-xl mt-3">Stil</h2>
          <p className="sl-muted text-sm mt-1 mb-4">
            {STYLE_LIST.find((style) => style.id === song.styleId)?.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_LIST.map((style) => (
              <button
                key={style.id}
                type="button"
                className={`sl-btn sl-btn-sm ${
                  song.styleId === style.id ? "sl-btn-primary" : "sl-btn-quiet"
                }`}
                onClick={() => setStyle(style.id)}
              >
                <span aria-hidden>{style.emoji}</span> {style.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sl-card p-6">
          <span className="sl-chip">Schritt 3</span>
          <h2 className="text-xl mt-3">Instrumente</h2>
          <p className="sl-muted text-sm mt-1 mb-4">
            Tippe an, was mitspielen soll.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TRACK_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`sl-accent-${id} sl-btn sl-btn-sm ${
                  song.tracks[id].enabled ? "sl-btn-primary" : "sl-btn-quiet"
                }`}
                onClick={() => {
                  startAudio();
                  updateTrack(id, { enabled: !song.tracks[id].enabled });
                  reachMilestone("first-band");
                }}
              >
                <span aria-hidden>{TRACK_META[id].emoji}</span> {TRACK_META[id].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sl-panel p-5 flex flex-wrap items-center gap-4">
        <button type="button" className="sl-btn sl-btn-primary" onClick={toggle}>
          <Icon name={playing ? "pause" : "play"} size={18} />
          {playing ? "Pause" : "Grundlage anhören"}
        </button>
        <span className="sl-muted text-sm">
          Länge: {formatTime(songSeconds(song))} · {song.sections.length} Abschnitte
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            value={song.name}
            onChange={(event) => updateSong({ name: event.target.value })}
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--sl-surface-2)",
              border: "1px solid var(--sl-line)",
              color: "var(--sl-text)",
            }}
            aria-label="Songname"
          />
          <button
            type="button"
            className="sl-btn sl-btn-ghost sl-btn-sm"
            onClick={() => {
              const project = saveProject(song.name);
              reachMilestone("first-song");
              setSaved(project.name);
              window.setTimeout(() => setSaved(null), 2500);
            }}
          >
            <Icon name="save" size={15} /> Speichern
          </button>
          {saved ? <span className="sl-chip">„{saved}“ gespeichert</span> : null}
        </div>
      </div>

      <section>
        <SectionHeading
          overline="Struktur"
          title="Intro → Strophe → Refrain → Outro"
          subtitle="Tippe ein Instrument in einem Abschnitt an, um es dort ein- oder auszublenden. So entsteht Spannung ganz von selbst."
        />
        {mode === "pro" ? <ProTimeline /> : <EasySongTimeline />}
      </section>

      <section>
        <SectionHeading
          overline="Loops"
          title="Bausteine stapeln"
          subtitle="Jeder Loop gehört zu einer Spur. Mehrere laufen gleichzeitig und passen immer zusammen."
        />
        <LoopBrowser />
      </section>

      <section>
        <SectionHeading
          overline="Klang verändern"
          title="Wie soll es sich anfühlen?"
          subtitle="Im Pro Mode stehen dieselben Werte als einzelne Regler zur Verfügung."
        />
        <SoundColors />
      </section>

      {mode === "easy" ? (
        <div className="sl-panel p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg">Mehr Kontrolle gefällig?</h3>
            <p className="sl-muted text-sm mt-1">
              Im Pro Mode wird aus der Struktur eine echte Timeline, aus den Karten
              werden Regler.
            </p>
          </div>
          <Link href="/soundlab/app/pro" className="sl-btn sl-btn-ghost">
            Pro Mode ansehen <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
