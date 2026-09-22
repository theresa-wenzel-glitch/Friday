"use client";

/*
 * Pro Mode.
 *
 * Dieselbe Band, dieselben Daten - nur sichtbar gemacht: Timeline, Mischpult,
 * Tonart, Effekte. Kein zweites Programm, sondern die nächste Stufe.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProTimeline } from "@/components/soundlab/SongTimeline";
import { TrackList } from "@/components/soundlab/TrackList";
import { Icon } from "@/components/soundlab/Icon";
import { SectionHeading, Slider } from "@/components/soundlab/ui";
import { useSoundLab } from "@/components/soundlab/SoundLabProvider";
import { engine } from "@/lib/soundlab/engine";
import { chordForBar } from "@/lib/soundlab/arranger";
import { BARS_PER_SECTION, SECTIONS, formatTime, songSeconds } from "@/lib/soundlab/song";
import {
  KEYS,
  SCALES,
  midiToName,
  scaleDegree,
  type ScaleId,
} from "@/lib/soundlab/theory";

const SCALE_IDS: ScaleId[] = ["major", "minor", "pentatonic", "blues", "dorian"];

export default function ProPage() {
  const { song, updateSong, mode, setMode, playing, toggle, masterVolume, setMasterVolume } =
    useSoundLab();
  const [compressor, setCompressor] = useState(0.35);
  const [delayTime, setDelayTime] = useState(0.34);
  const [feedback, setFeedback] = useState(0.32);

  useEffect(() => {
    if (!engine.ready) return;
    engine.setCompressor(compressor);
    engine.setDelayTime(delayTime);
    engine.setDelayFeedback(feedback);
  }, [compressor, delayTime, feedback]);

  const scaleNotes = Array.from({ length: SCALES[song.scale].steps.length + 1 }).map(
    (_, index) => scaleDegree(index, song.keyRoot, song.scale, 4),
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sl-label mb-2">Pro Mode</p>
          <h1 className="text-3xl sm:text-4xl">Dein Studio, ausgeklappt.</h1>
          <p className="sl-muted mt-2 max-w-xl">
            Mehrspur-Timeline, Mischpult, Tonleitern und Effekte. Alles, was du im
            Easy Mode gebaut hast, ist hier dasselbe Stück.
          </p>
        </div>
        <div className="flex gap-2">
          {mode === "easy" ? (
            <button type="button" className="sl-btn sl-btn-primary" onClick={() => setMode("pro")}>
              Pro Mode aktivieren
            </button>
          ) : (
            <button type="button" className="sl-btn sl-btn-ghost" onClick={() => setMode("easy")}>
              Zurück zu Easy
            </button>
          )}
          <button type="button" className="sl-btn sl-btn-ghost" onClick={toggle}>
            <Icon name={playing ? "pause" : "play"} size={18} />
            {playing ? "Pause" : "Abspielen"}
          </button>
        </div>
      </div>

      <section>
        <SectionHeading
          overline="Timeline"
          title="Alle Spuren über die ganze Länge"
          subtitle={`${songSeconds(song).toFixed(0)} Sekunden · ${
            song.sections.length * BARS_PER_SECTION
          } Takte · ${song.bpm} BPM`}
        />
        <ProTimeline />
      </section>

      <section>
        <SectionHeading
          overline="Mixer"
          title="Lautstärke, Panorama, Effekte"
          subtitle="Jede Spur hat denselben Signalweg: EQ, Panorama, Lautstärke, Hall- und Echo-Anteil."
        />
        <TrackList variant="pro" />
      </section>

      <section className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="sl-card p-6">
          <p className="sl-label mb-3">Tonart und Tonleiter</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {KEYS.map((key) => (
              <button
                key={key.root}
                type="button"
                className={`sl-btn sl-btn-sm ${
                  song.keyRoot === key.root ? "sl-btn-primary" : "sl-btn-quiet"
                }`}
                onClick={() => updateSong({ keyRoot: key.root })}
              >
                {key.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SCALE_IDS.map((scale) => (
              <button
                key={scale}
                type="button"
                className={`sl-btn sl-btn-sm ${
                  song.scale === scale ? "sl-btn-primary" : "sl-btn-quiet"
                }`}
                onClick={() => updateSong({ scale })}
              >
                {SCALES[scale].label}
              </button>
            ))}
          </div>
          <p className="sl-muted text-sm mt-4">{SCALES[song.scale].hint}</p>

          <div className="sl-inset p-4 mt-4">
            <p className="sl-label mb-2">Passende Töne</p>
            <div className="flex flex-wrap gap-1.5">
              {scaleNotes.map((midi) => (
                <span key={midi} className="sl-chip">
                  {midiToName(midi, false)}
                </span>
              ))}
            </div>
            <p className="sl-label mt-4 mb-2">Akkorde im Song</p>
            <div className="flex flex-wrap gap-1.5">
              {SECTIONS.map((section, sectionIndex) =>
                Array.from({ length: BARS_PER_SECTION }).map((_, bar) => {
                  const chord = chordForBar(song, sectionIndex * BARS_PER_SECTION + bar);
                  return (
                    <span
                      key={`${section.id}-${bar}`}
                      className="sl-chip sl-chip-quiet"
                      title={`${section.label}, Takt ${bar + 1}`}
                    >
                      {chord.name}
                    </span>
                  );
                }),
              )}
            </div>
          </div>
        </div>

        <div className="sl-card p-6">
          <p className="sl-label mb-3">Summe und Effekte</p>
          <div className="space-y-5">
            <Slider
              label="Gesamtlautstärke"
              displayValue={`${Math.round(masterVolume * 100)} %`}
              value={masterVolume}
              onChange={setMasterVolume}
              icon="volume"
            />
            <Slider
              label="Kompressor - locker / dicht"
              displayValue={`${Math.round(compressor * 100)} %`}
              value={compressor}
              onChange={setCompressor}
            />
            <Slider
              label="Delay-Zeit"
              displayValue={`${Math.round(delayTime * 1000)} ms`}
              value={delayTime}
              min={0.05}
              max={1}
              onChange={setDelayTime}
            />
            <Slider
              label="Delay-Wiederholungen"
              displayValue={`${Math.round(feedback * 100)} %`}
              value={feedback}
              max={0.85}
              onChange={setFeedback}
            />
            <Slider
              label="Quantisierung / Swing - streng / locker"
              displayValue={`${Math.round(song.swing * 100)} %`}
              value={song.swing}
              max={0.5}
              onChange={(value) => updateSong({ swing: value })}
            />
            <div className="flex gap-3">
              <button
                type="button"
                className="sl-btn sl-btn-sm sl-btn-ghost"
                onClick={() => {
                  setDelayTime((60 / song.bpm) * 0.5);
                }}
              >
                Delay an das Tempo koppeln
              </button>
            </div>
          </div>

          <div className="sl-inset p-4 mt-5">
            <p className="text-sm font-semibold">Voice Processing</p>
            <p className="sl-muted text-xs mt-1">
              Pitch, Hall, Echo und Klangfarbe deiner Aufnahme liegen im Bereich
              Stimme - im Pro Mode dort als einzelne Regler.
            </p>
            <Link href="/soundlab/app/voice" className="sl-btn sl-btn-sm sl-btn-ghost mt-3">
              Zur Stimme <Icon name="arrowRight" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="sl-panel p-6">
        <h2 className="text-xl mb-2">Songlänge</h2>
        <p className="sl-muted text-sm">
          Der Song läuft in der Schleife: {song.sections.length} Abschnitte à{" "}
          {BARS_PER_SECTION} Takte, zusammen {formatTime(songSeconds(song))}.
        </p>
      </section>
    </div>
  );
}
