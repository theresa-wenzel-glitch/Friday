"use client";

/*
 * "Meine Stimme".
 *
 * Aufnehmen, anhören, verändern - und dabei sehen, was gerade passiert. Die
 * Auswertung benennt nie etwas als falsch. Sie zeigt Tonhöhe, Timing und
 * Stabilität als das, was sie sind: Anhaltspunkte zum Weitermachen.
 */

import { useEffect, useRef, useState } from "react";
import {
  VOICE_PRESETS,
  playRecording,
  startRecording,
  type RecorderHandle,
  type VoicePresetId,
} from "@/lib/soundlab/voiceLab";
import { freqToMidi, midiToName, scaleDegree } from "@/lib/soundlab/theory";
import { useSoundLab } from "./SoundLabProvider";
import { Icon } from "./Icon";
import { Meter, Slider, Toggle } from "./ui";

function encouragement(value: number): string {
  if (value >= 80) return "Sitzt richtig gut.";
  if (value >= 60) return "Schon sehr solide.";
  if (value >= 35) return "Da ist schon was da - dranbleiben lohnt sich.";
  return "Ein Anfang. Beim nächsten Mal wird es ruhiger.";
}

export function VoiceStudio() {
  const {
    song,
    updateTrack,
    startAudio,
    voiceBuffer,
    voiceAnalysis,
    voiceSettings,
    setVoiceSettings,
    setRecording,
    clearRecording,
    reachMilestone,
    mode,
    metronome,
    setMetronome,
  } = useSoundLab();

  const [recorder, setRecorder] = useState<RecorderHandle | null>(null);
  const [live, setLive] = useState<{ level: number; freq: number | null }>({
    level: 0,
    freq: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [playingBack, setPlayingBack] = useState(false);
  const [targetIndex, setTargetIndex] = useState(0);
  const stopPlayback = useRef<(() => void) | null>(null);
  const frame = useRef<number | null>(null);

  const targetMidi = scaleDegree(targetIndex, song.keyRoot, song.scale, 4);

  useEffect(() => {
    if (!recorder) return;
    const tick = () => {
      setLive(recorder.peek());
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, [recorder]);

  useEffect(() => () => stopPlayback.current?.(), []);

  const begin = async () => {
    setError(null);
    startAudio();
    setBusy(true);
    try {
      const handle = await startRecording(song.bpm);
      setRecorder(handle);
    } catch {
      setError(
        "Das Mikrofon ist nicht erreichbar. Erlaube den Zugriff im Browser - ohne Mikrofon funktioniert alles andere weiterhin.",
      );
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!recorder) return;
    setBusy(true);
    try {
      const result = await recorder.stop();
      setRecording(result.buffer, result.analysis);
      updateTrack("voice", { enabled: true });
      reachMilestone("first-note");
    } catch {
      setError("Die Aufnahme konnte nicht verarbeitet werden. Versuch es noch einmal.");
    } finally {
      setRecorder(null);
      setBusy(false);
      setLive({ level: 0, freq: null });
    }
  };

  const liveMidi = live.freq ? freqToMidi(live.freq) : null;
  const deviation = liveMidi === null ? 0 : liveMidi - targetMidi;
  const close = Math.abs(deviation) < 0.6;

  const play = () => {
    if (!voiceBuffer) return;
    startAudio();
    stopPlayback.current?.();
    setPlayingBack(true);
    stopPlayback.current = playRecording(voiceBuffer, voiceSettings, () =>
      setPlayingBack(false),
    );
  };

  return (
    <div className="sl-accent-voice space-y-6">
      <div className="sl-card sl-halo p-6 sm:p-8">
        <div className="relative flex flex-col items-center text-center">
          <p className="sl-label mb-2">Entdecke deine Stimme</p>
          <h2 className="text-2xl sm:text-3xl mb-1">
            {recorder ? "Ich höre zu." : "Bereit, wenn du es bist."}
          </h2>
          <p className="sl-muted text-sm max-w-md">
            Summen reicht völlig. Es gibt hier kein Richtig und kein Falsch - nur
            deine Stimme und ein paar hilfreiche Anzeigen.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => (recorder ? finish() : begin())}
            className={`mt-6 sl-btn ${recorder ? "sl-btn-ghost" : "sl-btn-primary"} ${
              recorder ? "sl-pulse" : ""
            }`}
            style={{ width: 200, height: 64, borderRadius: 999 }}
          >
            <Icon name={recorder ? "stop" : "mic"} size={22} />
            {recorder ? "Aufnahme beenden" : "Aufnehmen"}
          </button>

          {/* Pegel während der Aufnahme */}
          <div className="mt-6 w-full max-w-md">
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--sl-surface-3)" }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-75"
                style={{
                  width: `${Math.min(100, live.level * 320)}%`,
                  background:
                    "linear-gradient(90deg, color-mix(in srgb, var(--sl-accent) 55%, transparent), var(--sl-accent))",
                }}
              />
            </div>

            {/* Zielton-Vergleich */}
            <div className="mt-5 sl-inset p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="sl-muted">Zielton</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="sl-icon-btn"
                    style={{ width: "1.9rem", height: "1.9rem" }}
                    onClick={() => setTargetIndex((value) => value - 1)}
                    aria-label="Zielton tiefer"
                  >
                    <Icon name="chevronLeft" size={14} />
                  </button>
                  <span className="w-12 font-semibold tabular-nums">
                    {midiToName(targetMidi)}
                  </span>
                  <button
                    type="button"
                    className="sl-icon-btn"
                    style={{ width: "1.9rem", height: "1.9rem" }}
                    onClick={() => setTargetIndex((value) => value + 1)}
                    aria-label="Zielton höher"
                  >
                    <Icon name="chevronRight" size={14} />
                  </button>
                </div>
              </div>

              <div className="relative mt-4 h-10">
                <div
                  className="absolute left-0 right-0 top-1/2 h-px"
                  style={{ backgroundColor: "var(--sl-line)" }}
                />
                <div
                  className="absolute top-1 bottom-1 w-px left-1/2"
                  style={{ backgroundColor: "var(--sl-accent)" }}
                />
                <div
                  className="absolute top-1/2 h-5 w-5 rounded-full transition-all duration-100"
                  style={{
                    left: `calc(50% + ${Math.max(-48, Math.min(48, deviation * 12))}% )`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: liveMidi === null ? "var(--sl-surface-3)" : "var(--sl-accent)",
                    boxShadow: close
                      ? "0 0 22px 2px color-mix(in srgb, var(--sl-accent) 70%, transparent)"
                      : "none",
                  }}
                />
              </div>
              <p className="sl-muted text-xs mt-1">
                {liveMidi === null
                  ? "Sing oder summe einen Ton - der Punkt zeigt, wo du gerade bist."
                  : close
                    ? `Treffer: ${midiToName(Math.round(liveMidi))}`
                    : `Du bist bei ${midiToName(Math.round(liveMidi))} - ${
                        deviation > 0 ? "etwas tiefer" : "etwas höher"
                      } wäre genau der Zielton.`}
              </p>
            </div>
          </div>

          {error ? (
            <p
              className="mt-5 text-sm px-4 py-3 rounded-xl"
              style={{
                backgroundColor: "color-mix(in srgb, var(--sl-accent) 12%, transparent)",
                color: "var(--sl-text)",
              }}
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6">
            <Toggle
              checked={metronome}
              onChange={setMetronome}
              label="Metronom beim Aufnehmen mitlaufen lassen"
            />
          </div>
        </div>
      </div>

      {voiceBuffer && voiceAnalysis ? (
        <>
          <div className="sl-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <p className="sl-label mb-1">Deine Aufnahme</p>
                <h3 className="text-xl">
                  {voiceAnalysis.duration.toFixed(1)} Sekunden
                  {voiceAnalysis.noteName ? ` · rund um ${voiceAnalysis.noteName}` : ""}
                </h3>
              </div>
              <div className="flex gap-2">
                <button type="button" className="sl-btn sl-btn-primary" onClick={play}>
                  <Icon name={playingBack ? "waveform" : "play"} size={18} />
                  {playingBack ? "Läuft" : "Anhören"}
                </button>
                <button
                  type="button"
                  className="sl-btn sl-btn-ghost"
                  onClick={() => {
                    stopPlayback.current?.();
                    setPlayingBack(false);
                    clearRecording();
                    updateTrack("voice", { enabled: false });
                  }}
                >
                  <Icon name="trash" size={16} /> Verwerfen
                </button>
              </div>
            </div>

            {/* Die Aufnahme als Wellenform */}
            <div className="sl-inset h-24 flex items-center gap-[2px] px-3 overflow-hidden">
              {voiceAnalysis.frames
                .filter((_, index) => index % 2 === 0)
                .map((item, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-full"
                    style={{
                      minWidth: 2,
                      height: `${Math.max(4, Math.min(100, item.level * 420))}%`,
                      backgroundColor:
                        item.freq === null
                          ? "var(--sl-surface-3)"
                          : "color-mix(in srgb, var(--sl-accent) 75%, transparent)",
                    }}
                  />
                ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
              <Meter
                label="Deine Tonhöhe"
                value={voiceAnalysis.medianMidi ? 100 : 0}
                hint={
                  voiceAnalysis.noteName
                    ? `Am häufigsten lagst du bei ${voiceAnalysis.noteName}${
                        voiceAnalysis.lowestMidi && voiceAnalysis.highestMidi
                          ? ` (${midiToName(voiceAnalysis.lowestMidi)} bis ${midiToName(
                              voiceAnalysis.highestMidi,
                            )})`
                          : ""
                      }.`
                    : "Noch kein klarer Ton erkannt - sing etwas länger."
                }
              />
              <Meter
                label="Timing"
                value={voiceAnalysis.timing}
                hint={encouragement(voiceAnalysis.timing)}
              />
              <Meter
                label="Stimmstabilität"
                value={voiceAnalysis.stability}
                hint={encouragement(voiceAnalysis.stability)}
              />
              <Meter
                label="Lautstärke"
                value={voiceAnalysis.loudness}
                hint={encouragement(voiceAnalysis.loudness)}
              />
            </div>
          </div>

          <div className="sl-card p-6">
            <p className="sl-label mb-3">Klangfarbe</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {VOICE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`sl-card sl-card-hover p-4 text-left ${
                    voiceSettings.preset === preset.id ? "sl-card-active" : ""
                  }`}
                  onClick={() =>
                    setVoiceSettings({
                      ...voiceSettings,
                      preset: preset.id as VoicePresetId,
                    })
                  }
                >
                  <span className="text-xl">{preset.emoji}</span>
                  <span className="block font-semibold mt-1">{preset.label}</span>
                  <span className="block sl-muted text-xs mt-1">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>

            {mode === "pro" ? (
              <div className="grid sm:grid-cols-2 gap-5 mt-6">
                <Slider
                  label="Pitch - tiefer / höher"
                  displayValue={`${voiceSettings.pitch > 0 ? "+" : ""}${voiceSettings.pitch} Halbtöne`}
                  value={voiceSettings.pitch}
                  min={-7}
                  max={7}
                  step={1}
                  onChange={(value) => setVoiceSettings({ ...voiceSettings, pitch: value })}
                />
                <Slider
                  label="Reverb - trocken / räumlich"
                  displayValue={`${Math.round(voiceSettings.reverb * 100)} %`}
                  value={voiceSettings.reverb}
                  onChange={(value) => setVoiceSettings({ ...voiceSettings, reverb: value })}
                />
                <Slider
                  label="Echo"
                  displayValue={`${Math.round(voiceSettings.echo * 100)} %`}
                  value={voiceSettings.echo}
                  onChange={(value) => setVoiceSettings({ ...voiceSettings, echo: value })}
                />
                <Slider
                  label="Brightness - warm / hell"
                  displayValue={
                    voiceSettings.brightness === 0
                      ? "neutral"
                      : voiceSettings.brightness > 0
                        ? "hell"
                        : "warm"
                  }
                  value={voiceSettings.brightness}
                  min={-1}
                  max={1}
                  onChange={(value) =>
                    setVoiceSettings({ ...voiceSettings, brightness: value })
                  }
                />
              </div>
            ) : (
              <p className="sl-muted text-sm mt-4">
                Im Pro Mode kannst du Tonhöhe, Hall, Echo und Klangfarbe einzeln
                einstellen.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
