"use client";

/*
 * Meine Projekte: gespeicherte Stände wieder öffnen.
 */

import { useState } from "react";
import { Icon } from "@/components/soundlab/Icon";
import { EmptyState } from "@/components/soundlab/ui";
import { useSoundLab } from "@/components/soundlab/SoundLabProvider";
import { TRACK_IDS } from "@/lib/soundlab/engine";
import { TRACK_META, formatTime, songSeconds } from "@/lib/soundlab/song";
import { STYLES } from "@/lib/soundlab/patterns";

export default function ProjectsPage() {
  const { projects, song, saveProject, loadProject, deleteProject, play, playing, stop, reachMilestone } =
    useSoundLab();
  const [name, setName] = useState(song.name);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sl-label mb-2">Meine Projekte</p>
          <h1 className="text-3xl sm:text-4xl">Deine Songs.</h1>
          <p className="sl-muted mt-2 max-w-xl">
            Gespeichert wird in diesem Browser - ohne Konto, ohne Upload.
          </p>
        </div>
      </div>

      <div className="sl-panel p-5 flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name für den aktuellen Stand"
          className="flex-1 min-w-[12rem] rounded-xl px-3 py-2.5 text-sm"
          style={{
            backgroundColor: "var(--sl-surface-2)",
            border: "1px solid var(--sl-line)",
            color: "var(--sl-text)",
          }}
          aria-label="Projektname"
        />
        <button
          type="button"
          className="sl-btn sl-btn-primary"
          onClick={() => {
            saveProject(name);
            reachMilestone("first-song");
          }}
        >
          <Icon name="save" size={16} /> Aktuellen Song speichern
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          emoji="🎧"
          title="Noch keine Projekte"
          description="Sobald du etwas speicherst, findest du es hier wieder - mit Instrumenten, Tempo und Struktur."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const active = TRACK_IDS.filter((id) => project.song.tracks[id]?.enabled);
            return (
              <article key={project.id} className="sl-card sl-card-hover p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg truncate">{project.name}</h2>
                    <p className="sl-muted-2 text-xs mt-1">
                      {new Date(project.savedAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="sl-icon-btn shrink-0"
                    onClick={() => deleteProject(project.id)}
                    aria-label={`${project.name} löschen`}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-4">
                  {active.map((id) => (
                    <span key={id} className={`sl-chip sl-accent-${id}`}>
                      <span aria-hidden>{TRACK_META[id].emoji}</span> {TRACK_META[id].label}
                    </span>
                  ))}
                  {active.length === 0 ? (
                    <span className="sl-muted text-xs">Keine Instrumente</span>
                  ) : null}
                </div>

                <p className="sl-muted text-xs mt-4">
                  {STYLES[project.song.styleId]?.label} · {project.song.bpm} BPM ·{" "}
                  {formatTime(songSeconds(project.song))}
                </p>

                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    className="sl-btn sl-btn-sm sl-btn-primary"
                    onClick={() => {
                      if (playing) stop();
                      loadProject(project.id);
                      window.setTimeout(() => play(), 120);
                    }}
                  >
                    <Icon name="play" size={15} /> Abspielen
                  </button>
                  <button
                    type="button"
                    className="sl-btn sl-btn-sm sl-btn-ghost"
                    onClick={() => loadProject(project.id)}
                  >
                    Öffnen
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
