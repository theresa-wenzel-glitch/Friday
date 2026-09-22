/*
 * Stimme: aufnehmen, anhören, verstehen.
 *
 * Die Auswertung ist bewusst freundlich gedacht. Sie misst, was messbar ist -
 * Tonhöhe, Lautstärke, Timing, Stabilität - und sagt nie, dass etwas "falsch"
 * war. Aus den Zahlen werden im UI Hinweise, keine Noten.
 */

import { engine } from "./engine";
import { freqToMidi, midiToName } from "./theory";

export type VoicePresetId =
  | "clean"
  | "warm"
  | "bright"
  | "echo"
  | "room"
  | "studio";

export const VOICE_PRESETS: {
  id: VoicePresetId;
  label: string;
  description: string;
  emoji: string;
}[] = [
  { id: "clean", label: "Clean", description: "Deine Stimme, unverändert.", emoji: "🎙️" },
  { id: "warm", label: "Warm", description: "Weicher und runder, weniger Schärfe.", emoji: "🔥" },
  { id: "bright", label: "Bright", description: "Frischer und präsenter.", emoji: "💎" },
  { id: "echo", label: "Echo", description: "Kurze Wiederholungen, wie in einer Halle.", emoji: "🔁" },
  { id: "room", label: "Room", description: "Als würdest du in einem Raum stehen.", emoji: "🏛️" },
  { id: "studio", label: "Studio", description: "Gleichmäßig und gesetzt, wie auf einer Aufnahme.", emoji: "🎚️" },
];

export type VoiceFrame = { time: number; freq: number | null; level: number };

export type VoiceAnalysis = {
  duration: number;
  /** Mittlere Tonhöhe als MIDI-Note, null wenn nichts Klingendes gefunden wurde. */
  medianMidi: number | null;
  noteName: string | null;
  lowestMidi: number | null;
  highestMidi: number | null;
  /** 0..100 - wie ruhig die Tonhöhe gehalten wurde. */
  stability: number;
  /** 0..100 - wie gleichmäßig laut. */
  loudness: number;
  /** 0..100 - wie nah die Einsätze am Takt lagen. */
  timing: number;
  averageLevel: number;
  frames: VoiceFrame[];
};

/** Autokorrelation: sucht die Periode, die sich im Signal am stärksten wiederholt. */
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const size = buffer.length;
  let rms = 0;
  for (let i = 0; i < size; i += 1) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return null;

  let start = 0;
  let end = size - 1;
  const threshold = 0.2;
  while (start < size / 2 && Math.abs(buffer[start]) < threshold) start += 1;
  while (end > size / 2 && Math.abs(buffer[end]) < threshold) end -= 1;

  const trimmed = buffer.slice(start, end);
  const length = trimmed.length;
  if (length < 256) return null;

  const correlations = new Float32Array(length).fill(0);
  for (let lag = 0; lag < length; lag += 1) {
    let sum = 0;
    for (let i = 0; i < length - lag; i += 1) sum += trimmed[i] * trimmed[i + lag];
    correlations[lag] = sum;
  }

  let d = 0;
  while (d < length - 1 && correlations[d] > correlations[d + 1]) d += 1;

  let maxValue = -1;
  let maxLag = -1;
  for (let lag = d; lag < length; lag += 1) {
    if (correlations[lag] > maxValue) {
      maxValue = correlations[lag];
      maxLag = lag;
    }
  }
  if (maxLag <= 0) return null;

  // Parabel durch die drei Punkte um das Maximum - das verfeinert die Schätzung.
  const y1 = correlations[maxLag - 1] ?? 0;
  const y2 = correlations[maxLag];
  const y3 = correlations[maxLag + 1] ?? 0;
  const a = (y1 + y3 - 2 * y2) / 2;
  const b = (y3 - y1) / 2;
  const shift = a ? -b / (2 * a) : 0;
  const freq = sampleRate / (maxLag + shift);
  if (freq < 60 || freq > 1400) return null;
  return freq;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function analyseFrames(
  frames: VoiceFrame[],
  duration: number,
  bpm: number,
): VoiceAnalysis {
  const voiced = frames.filter((f) => f.freq !== null && f.level > 0.02);
  const midis = voiced.map((f) => freqToMidi(f.freq as number));
  const med = median(midis);

  // Stabilität: wie stark schwankt die Tonhöhe um den Mittelwert?
  let stability = 0;
  if (midis.length > 4 && med !== null) {
    const deviation =
      midis.reduce((sum, m) => sum + Math.abs(m - med), 0) / midis.length;
    stability = Math.round(Math.max(0, Math.min(100, 100 - deviation * 22)));
  }

  // Lautstärke: gleichmäßig ist besser als schwankend.
  const levels = frames.map((f) => f.level);
  const avgLevel = levels.length
    ? levels.reduce((a, b) => a + b, 0) / levels.length
    : 0;
  const levelDeviation = levels.length
    ? levels.reduce((sum, l) => sum + Math.abs(l - avgLevel), 0) / levels.length
    : 0;
  const loudness = Math.round(
    Math.max(0, Math.min(100, 100 - (levelDeviation / Math.max(0.02, avgLevel)) * 45)),
  );

  // Timing: Einsätze (deutliche Lautstärkesprünge) mit dem Raster vergleichen.
  const beat = 60 / bpm;
  const onsets: number[] = [];
  for (let i = 1; i < frames.length; i += 1) {
    const rise = frames[i].level - frames[i - 1].level;
    if (rise > 0.045 && frames[i].level > 0.05) {
      if (!onsets.length || frames[i].time - onsets[onsets.length - 1] > 0.12) {
        onsets.push(frames[i].time);
      }
    }
  }
  let timing = 0;
  if (onsets.length) {
    const offsets = onsets.map((t) => {
      const nearest = Math.round(t / (beat / 2)) * (beat / 2);
      return Math.abs(t - nearest);
    });
    const avgOffset = offsets.reduce((a, b) => a + b, 0) / offsets.length;
    timing = Math.round(
      Math.max(0, Math.min(100, 100 - (avgOffset / (beat / 4)) * 100)),
    );
  }

  return {
    duration,
    medianMidi: med,
    noteName: med === null ? null : midiToName(Math.round(med)),
    lowestMidi: midis.length ? Math.round(Math.min(...midis)) : null,
    highestMidi: midis.length ? Math.round(Math.max(...midis)) : null,
    stability,
    loudness,
    timing,
    averageLevel: avgLevel,
    frames,
  };
}

export type RecorderHandle = {
  stop: () => Promise<{ blob: Blob; buffer: AudioBuffer; analysis: VoiceAnalysis }>;
  cancel: () => void;
  /** Live-Werte für die Anzeige während der Aufnahme. */
  peek: () => { level: number; freq: number | null };
};

export async function startRecording(bpm: number): Promise<RecorderHandle> {
  const ctx = engine.ensure();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
    },
  });

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const recorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(100);

  const frames: VoiceFrame[] = [];
  const startedAt = ctx.currentTime;
  const sample = new Float32Array(analyser.fftSize);
  let live: { level: number; freq: number | null } = { level: 0, freq: null };

  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(sample);
    let sum = 0;
    for (let i = 0; i < sample.length; i += 1) sum += sample[i] * sample[i];
    const level = Math.sqrt(sum / sample.length);
    const freq = detectPitch(sample, ctx.sampleRate);
    live = { level, freq };
    frames.push({ time: ctx.currentTime - startedAt, freq, level });
  }, 50);

  const cleanup = () => {
    window.clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
    source.disconnect();
  };

  return {
    peek: () => live,
    cancel: () => {
      if (recorder.state !== "inactive") recorder.stop();
      cleanup();
    },
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onstop = async () => {
          cleanup();
          try {
            const blob = new Blob(chunks, {
              type: recorder.mimeType || "audio/webm",
            });
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = await ctx.decodeAudioData(arrayBuffer);
            resolve({
              blob,
              buffer,
              analysis: analyseFrames(frames, buffer.duration, bpm),
            });
          } catch (error) {
            reject(error);
          }
        };
        if (recorder.state !== "inactive") recorder.stop();
      }),
  };
}

/* ------------------------------------------------------------- Effekte */

export type VoiceSettings = {
  preset: VoicePresetId;
  pitch: number; // Halbtöne
  reverb: number; // 0..1
  echo: number; // 0..1
  brightness: number; // -1..1
};

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  preset: "clean",
  pitch: 0,
  reverb: 0.2,
  echo: 0,
  brightness: 0,
};

const PRESET_SHAPE: Record<
  VoicePresetId,
  { low: number; high: number; reverb: number; echo: number; comp: boolean }
> = {
  clean: { low: 0, high: 0, reverb: 0.05, echo: 0, comp: false },
  warm: { low: 4, high: -3, reverb: 0.12, echo: 0, comp: false },
  bright: { low: -2, high: 5, reverb: 0.1, echo: 0, comp: false },
  echo: { low: 0, high: 1, reverb: 0.15, echo: 0.45, comp: false },
  room: { low: 1, high: 1, reverb: 0.45, echo: 0.08, comp: false },
  studio: { low: 2, high: 3, reverb: 0.2, echo: 0.05, comp: true },
};

/**
 * Spielt eine Aufnahme mit den gewählten Effekten ab.
 * Gibt eine Funktion zum Stoppen zurück.
 */
export function playRecording(
  buffer: AudioBuffer,
  settings: VoiceSettings,
  onEnded?: () => void,
): () => void {
  const ctx = engine.ensure();
  const shape = PRESET_SHAPE[settings.preset];

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  // Tonhöhe verändern: schneller abspielen klingt höher.
  source.playbackRate.value = Math.pow(2, settings.pitch / 12);

  const low = ctx.createBiquadFilter();
  low.type = "lowshelf";
  low.frequency.value = 220;
  low.gain.value = shape.low;

  const high = ctx.createBiquadFilter();
  high.type = "highshelf";
  high.frequency.value = 3400;
  high.gain.value = shape.high + settings.brightness * 8;

  const dry = ctx.createGain();
  dry.gain.value = 1;

  source.connect(low);
  low.connect(high);

  let tail: AudioNode = high;
  if (shape.comp) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.ratio.value = 4;
    comp.attack.value = 0.006;
    comp.release.value = 0.2;
    high.connect(comp);
    tail = comp;
  }

  const target = engine.bus("voice");
  tail.connect(dry);
  dry.connect(target);

  const reverbAmount = Math.min(1, shape.reverb + settings.reverb);
  const echoAmount = Math.min(1, shape.echo + settings.echo);
  engine.setSend("voice", "reverb", reverbAmount);
  engine.setSend("voice", "delay", echoAmount);

  source.onended = () => {
    dry.disconnect();
    onEnded?.();
  };
  source.start();

  return () => {
    try {
      source.stop();
    } catch {
      /* schon gestoppt */
    }
  };
}
