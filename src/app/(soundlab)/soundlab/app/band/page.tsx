"use client";

/*
 * "Meine Band": Schritt für Schritt Mitspieler dazuholen.
 */

import Link from "next/link";
import { BandStage } from "@/components/soundlab/BandStage";
import { TrackList } from "@/components/soundlab/TrackList";
import { Icon } from "@/components/soundlab/Icon";
import { useSoundLab } from "@/components/soundlab/SoundLabProvider";
import { STYLE_LIST } from "@/lib/soundlab/patterns";
import { TRACK_IDS } from "@/lib/soundlab/engine";
import { Stepper } from "@/components/soundlab/ui";

export default function BandPage() {
  const { song, setStyle, setBpm, playing, toggle, mode, updateSong, saveProject, reachMilestone } =
    useSoundLab();
  const count = TRACK_IDS.filter((id) => song.tracks[id].enabled).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sl-label mb-2">Meine Band</p>
          <h1 className="text-3xl sm:text-4xl">
            {count === 0
              ? "Wer soll mitspielen?"
              : count === 1
                ? "Ein Mitspieler ist da."
                : `${count} Instrumente spielen zusammen.`}
          </h1>
          <p className="sl-muted mt-2 max-w-xl">
            Schalte Instrumente an und aus. Alle halten automatisch dasselbe
            Tempo und dieselbe Tonart.
          </p>
        </div>
        <button type="button" className="sl-btn sl-btn-primary" onClick={toggle}>
          <Icon name={playing ? "pause" : "play"} size={18} />
          {playing ? "Pause" : "Band spielen lassen"}
        </button>
      </div>

      <BandStage />

      <div className="sl-panel p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p className="sl-label mb-2">Tempo</p>
            <Stepper value={song.bpm} onChange={setBpm} min={50} max={200} step={2} unit="BPM" />
          </div>
          <div>
            <p className="sl-label mb-2">Stil</p>
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
          <div className="ml-auto">
            <p className="sl-label mb-2">Percussion dazu</p>
            <button
              type="button"
              className={`sl-btn sl-btn-sm ${
                song.percussion.enabled ? "sl-btn-primary" : "sl-btn-ghost"
              }`}
              onClick={() =>
                updateSong({
                  percussion: { ...song.percussion, enabled: !song.percussion.enabled },
                })
              }
            >
              <Icon name={song.percussion.enabled ? "check" : "plus"} size={15} />
              Shaker &amp; Claps
            </button>
          </div>
        </div>
      </div>

      <TrackList variant={mode === "pro" ? "pro" : "easy"} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="sl-btn sl-btn-ghost"
          onClick={() => {
            saveProject(song.name);
            reachMilestone("first-song");
          }}
        >
          <Icon name="save" size={16} /> Als Projekt speichern
        </button>
        <Link href="/soundlab/app/studio" className="sl-btn sl-btn-quiet">
          Weiter zum Song Builder
        </Link>
      </div>
    </div>
  );
}
