"use client";

/*
 * "Begleitband dazu".
 *
 * Aus: man hört nur sich selbst. An: der Rest der Band spielt mit, und die
 * eigene Spur bleibt frei - so spielt man nicht gegen eine Aufnahme an.
 */

import { useEffect, useState } from "react";
import type { TrackId } from "@/lib/soundlab/engine";
import { TRACK_META } from "@/lib/soundlab/song";
import { STYLE_LIST } from "@/lib/soundlab/patterns";
import { useSoundLab } from "./SoundLabProvider";
import { Icon } from "./Icon";
import { Stepper, Toggle } from "./ui";

export function AccompanimentBar({ track }: { track: TrackId }) {
  const {
    song,
    setStyle,
    setBpm,
    playing,
    play,
    stop,
    setFocusTrack,
    setLiveTrack,
    updateTrack,
    reachMilestone,
  } = useSoundLab();
  const [withBand, setWithBand] = useState(false);
  // Beim Schlagzeug darf der Beat weiterlaufen - die Pads kommen obendrauf.
  const silencesOwnTrack = track !== "drums";

  useEffect(() => {
    if (withBand) {
      setFocusTrack(null);
      setLiveTrack(silencesOwnTrack ? track : null);
    } else {
      setFocusTrack(track);
      setLiveTrack(null);
    }
    return () => {
      setFocusTrack(null);
      setLiveTrack(null);
    };
  }, [withBand, track, silencesOwnTrack, setFocusTrack, setLiveTrack]);

  return (
    <div className="sl-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Toggle
          checked={withBand}
          onChange={(value) => {
            setWithBand(value);
            if (value) {
              ["drums", "bass", "piano"].forEach((id) => {
                if (!song.tracks[id as TrackId].enabled) {
                  updateTrack(id as TrackId, { enabled: true });
                }
              });
              reachMilestone("first-band");
            }
          }}
          label="Begleitband dazu"
        />

        <button
          type="button"
          className={`sl-btn sl-btn-sm ${playing ? "sl-btn-ghost" : "sl-btn-primary"}`}
          onClick={() => (playing ? stop() : play())}
        >
          <Icon name={playing ? "pause" : "play"} size={16} />
          {playing ? "Stopp" : withBand ? "Band starten" : `${TRACK_META[track].label} abspielen`}
        </button>

        <Stepper
          value={song.bpm}
          onChange={setBpm}
          min={50}
          max={200}
          step={2}
          unit="BPM"
          label="Tempo"
        />

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
    </div>
  );
}
