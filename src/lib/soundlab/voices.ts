/*
 * Klangerzeugung. Alles wird live berechnet - keine Sample-Dateien, damit die
 * App sofort lädt und auch offline Töne macht.
 *
 * Jede Funktion baut ihre Oszillatoren, plant sie auf einen Zeitpunkt und räumt
 * sich selbst wieder ab. Ziel ist immer ein Knoten aus dem Mischpult (engine.bus).
 */

import { engine, type TrackId } from "./engine";
import { midiToFreq } from "./theory";

export type PianoPreset = "piano" | "electric" | "soft" | "synth";
export type DrumId = "kick" | "snare" | "hihat" | "openhat" | "tom" | "crash" | "clap";
export type SynthPreset = "pad" | "pluck" | "lead" | "bell";

let noiseBuffer: AudioBuffer | null = null;
let noiseCtx: AudioContext | null = null;

function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseCtx === ctx) return noiseBuffer;
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  noiseCtx = ctx;
  return buffer;
}

type NoteOptions = {
  track: TrackId;
  midi: number;
  time?: number;
  duration?: number;
  velocity?: number;
  detune?: number;
  destination?: AudioNode;
};

function out(options: { track: TrackId; destination?: AudioNode }): AudioNode {
  return options.destination ?? engine.bus(options.track);
}

/* ------------------------------------------------------------------ Klavier */

export function playPiano(
  options: NoteOptions & { preset?: PianoPreset },
): void {
  const ctx = engine.ensure();
  const t = options.time ?? ctx.currentTime;
  const dur = options.duration ?? 1.4;
  const vel = options.velocity ?? 0.8;
  const preset = options.preset ?? "piano";
  const freq = midiToFreq(options.midi);
  const target = out(options);

  const amp = ctx.createGain();
  amp.gain.value = 0;
  amp.connect(target);

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.connect(amp);

  const partials: { ratio: number; gain: number; type: OscillatorType }[] =
    preset === "piano"
      ? [
          { ratio: 1, gain: 1, type: "triangle" },
          { ratio: 2, gain: 0.3, type: "sine" },
          { ratio: 3, gain: 0.12, type: "sine" },
          { ratio: 5.02, gain: 0.05, type: "sine" },
        ]
      : preset === "electric"
        ? [
            { ratio: 1, gain: 1, type: "sine" },
            { ratio: 2.01, gain: 0.45, type: "sine" },
            { ratio: 4.02, gain: 0.14, type: "sine" },
          ]
        : preset === "soft"
          ? [
              { ratio: 1, gain: 1, type: "triangle" },
              { ratio: 2, gain: 0.16, type: "sine" },
            ]
          : [
              { ratio: 1, gain: 0.8, type: "sawtooth" },
              { ratio: 1.005, gain: 0.5, type: "sawtooth" },
              { ratio: 2, gain: 0.2, type: "square" },
            ];

  const attack = preset === "soft" ? 0.05 : preset === "synth" ? 0.01 : 0.004;
  const peak = vel * (preset === "synth" ? 0.22 : 0.28);
  const release = preset === "soft" ? dur * 1.5 : dur;

  tone.frequency.setValueAtTime(preset === "synth" ? 900 : 5200, t);
  tone.frequency.exponentialRampToValueAtTime(
    preset === "synth" ? 2600 : 1400,
    t + Math.min(0.5, dur),
  );
  tone.Q.value = preset === "synth" ? 6 : 0.7;

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + attack);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.25), t + release * 0.45);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + release);

  const oscillators = partials.map((partial) => {
    const osc = ctx.createOscillator();
    osc.type = partial.type;
    osc.frequency.value = freq * partial.ratio;
    if (options.detune) osc.detune.value = options.detune;
    const g = ctx.createGain();
    g.gain.value = partial.gain;
    osc.connect(g);
    g.connect(tone);
    osc.start(t);
    osc.stop(t + release + 0.1);
    return osc;
  });

  if (preset === "electric") {
    // Leichtes Tremolo gibt dem E-Piano seinen typischen Schimmer.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.06 * vel;
    lfo.connect(lfoGain);
    lfoGain.connect(amp.gain);
    lfo.start(t);
    lfo.stop(t + release + 0.1);
  }

  oscillators[oscillators.length - 1].onended = () => {
    amp.disconnect();
    tone.disconnect();
  };
}

/* -------------------------------------------------------------- Zupfklänge */

/**
 * Karplus-Strong: ein kurzer Rauschimpuls kreist in einer sehr kurzen
 * Verzögerung. Klingt überraschend nah an einer gezupften Saite.
 */
export function playPluck(
  options: NoteOptions & { damping?: number; body?: number },
): void {
  const ctx = engine.ensure();
  const t = options.time ?? ctx.currentTime;
  const vel = options.velocity ?? 0.8;
  const dur = options.duration ?? 2.2;
  const freq = midiToFreq(options.midi);
  const target = out(options);

  const amp = ctx.createGain();
  amp.gain.value = vel * 0.5;
  amp.connect(target);

  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = 1 / freq;
  const feedback = ctx.createGain();
  feedback.gain.value = options.damping ?? 0.965;
  const loopFilter = ctx.createBiquadFilter();
  loopFilter.type = "lowpass";
  loopFilter.frequency.value = Math.min(9000, freq * (options.body ?? 14));

  delay.connect(loopFilter);
  loopFilter.connect(feedback);
  feedback.connect(delay);
  delay.connect(amp);

  const burst = ctx.createBufferSource();
  burst.buffer = noise(ctx);
  burst.loop = true;
  const burstGain = ctx.createGain();
  burstGain.gain.setValueAtTime(1, t);
  burstGain.gain.setValueAtTime(1, t + 0.006);
  burstGain.gain.linearRampToValueAtTime(0, t + 0.012);
  burst.connect(burstGain);
  burstGain.connect(delay);
  burst.start(t);
  burst.stop(t + 0.05);

  amp.gain.setValueAtTime(vel * 0.5, t);
  amp.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.2);
  window.setTimeout(
    () => {
      amp.disconnect();
      delay.disconnect();
      feedback.disconnect();
      loopFilter.disconnect();
    },
    Math.max(200, (t - ctx.currentTime + dur + 0.4) * 1000),
  );
}

/* ------------------------------------------------------------------- Bass */

export function playBass(options: NoteOptions & { tone?: number }): void {
  const ctx = engine.ensure();
  const t = options.time ?? ctx.currentTime;
  const dur = options.duration ?? 0.5;
  const vel = options.velocity ?? 0.9;
  const freq = midiToFreq(options.midi);
  const target = out(options);

  const amp = ctx.createGain();
  amp.gain.value = 0;
  amp.connect(target);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 8;
  filter.frequency.setValueAtTime(freq * (options.tone ?? 7) + 120, t);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(90, freq * 2),
    t + Math.min(0.4, dur),
  );
  filter.connect(amp);

  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.value = freq;
  const subGain = ctx.createGain();
  subGain.gain.value = 0.9;
  sub.connect(subGain);
  subGain.connect(filter);

  const saw = ctx.createOscillator();
  saw.type = "sawtooth";
  saw.frequency.value = freq;
  saw.detune.value = 6;
  const sawGain = ctx.createGain();
  sawGain.gain.value = 0.35;
  saw.connect(sawGain);
  sawGain.connect(filter);

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(vel * 0.42, t + 0.012);
  amp.gain.setTargetAtTime(0.0001, t + dur * 0.7, 0.08);

  sub.start(t);
  saw.start(t);
  sub.stop(t + dur + 0.3);
  saw.stop(t + dur + 0.3);
  sub.onended = () => {
    amp.disconnect();
    filter.disconnect();
  };
}

/* ------------------------------------------------------------------ Synth */

export function playSynth(
  options: NoteOptions & { preset?: SynthPreset; cutoff?: number },
): void {
  const ctx = engine.ensure();
  const t = options.time ?? ctx.currentTime;
  const preset = options.preset ?? "pad";
  const dur = options.duration ?? (preset === "pad" ? 2 : 0.6);
  const vel = options.velocity ?? 0.8;
  const freq = midiToFreq(options.midi);
  const target = out(options);

  const amp = ctx.createGain();
  amp.gain.value = 0;
  amp.connect(target);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = preset === "lead" ? 9 : 3;
  filter.connect(amp);

  const base = options.cutoff ?? (preset === "bell" ? 5200 : 1800);
  filter.frequency.setValueAtTime(preset === "pad" ? 500 : base, t);
  filter.frequency.linearRampToValueAtTime(
    base,
    t + (preset === "pad" ? Math.min(1.2, dur * 0.6) : 0.12),
  );

  const shapes: { type: OscillatorType; detune: number; gain: number }[] =
    preset === "bell"
      ? [
          { type: "sine", detune: 0, gain: 0.8 },
          { type: "sine", detune: 1200 + 700, gain: 0.25 },
        ]
      : preset === "pluck"
        ? [
            { type: "square", detune: 0, gain: 0.5 },
            { type: "sawtooth", detune: -8, gain: 0.4 },
          ]
        : [
            { type: "sawtooth", detune: -9, gain: 0.45 },
            { type: "sawtooth", detune: 9, gain: 0.45 },
            { type: "triangle", detune: 0, gain: 0.35 },
          ];

  const attack = preset === "pad" ? 0.35 : preset === "lead" ? 0.02 : 0.005;
  const peak = vel * (preset === "pad" ? 0.16 : 0.2);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + attack);
  amp.gain.setTargetAtTime(0.0001, t + dur, preset === "pad" ? 0.5 : 0.12);

  const oscs = shapes.map((shape) => {
    const osc = ctx.createOscillator();
    osc.type = shape.type;
    osc.frequency.value = freq;
    osc.detune.value = shape.detune + (options.detune ?? 0);
    const g = ctx.createGain();
    g.gain.value = shape.gain;
    osc.connect(g);
    g.connect(filter);
    osc.start(t);
    osc.stop(t + dur + (preset === "pad" ? 2 : 0.6));
    return osc;
  });

  oscs[0].onended = () => {
    amp.disconnect();
    filter.disconnect();
  };
}

/* --------------------------------------------------------------- Schlagzeug */

export function playDrum(
  drum: DrumId,
  options: { time?: number; velocity?: number; destination?: AudioNode } = {},
): void {
  const ctx = engine.ensure();
  const t = options.time ?? ctx.currentTime;
  const vel = options.velocity ?? 1;
  const target = options.destination ?? engine.bus("drums");

  const amp = ctx.createGain();
  amp.connect(target);

  const hit = (frequency: number, decay: number, type: OscillatorType, drop = 0) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    if (drop > 0) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, frequency - drop),
        t + decay * 0.8,
      );
    }
    osc.connect(amp);
    osc.start(t);
    osc.stop(t + decay + 0.05);
    return osc;
  };

  const noiseHit = (
    filterType: BiquadFilterType,
    frequency: number,
    decay: number,
    q = 1,
  ) => {
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    src.connect(filter);
    filter.connect(amp);
    src.start(t);
    src.stop(t + decay + 0.05);
    return src;
  };

  switch (drum) {
    case "kick": {
      amp.gain.setValueAtTime(vel * 1.1, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      hit(150, 0.45, "sine", 110);
      const click = ctx.createGain();
      click.gain.setValueAtTime(vel * 0.35, t);
      click.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      click.connect(target);
      const clickSrc = ctx.createBufferSource();
      clickSrc.buffer = noise(ctx);
      clickSrc.connect(click);
      clickSrc.start(t);
      clickSrc.stop(t + 0.04);
      break;
    }
    case "snare": {
      amp.gain.setValueAtTime(vel * 0.7, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      noiseHit("highpass", 1400, 0.22);
      const body = ctx.createGain();
      body.gain.setValueAtTime(vel * 0.4, t);
      body.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      body.connect(target);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.1);
      osc.connect(body);
      osc.start(t);
      osc.stop(t + 0.14);
      break;
    }
    case "hihat": {
      amp.gain.setValueAtTime(vel * 0.32, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      noiseHit("highpass", 8200, 0.07);
      break;
    }
    case "openhat": {
      amp.gain.setValueAtTime(vel * 0.3, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      noiseHit("highpass", 7200, 0.36);
      break;
    }
    case "tom": {
      amp.gain.setValueAtTime(vel * 0.8, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      hit(200, 0.4, "sine", 90);
      break;
    }
    case "crash": {
      amp.gain.setValueAtTime(vel * 0.3, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      noiseHit("highpass", 5200, 1.4, 0.4);
      noiseHit("bandpass", 9000, 1.2, 0.6);
      break;
    }
    case "clap": {
      amp.gain.setValueAtTime(0.0001, t);
      // Drei kurze Schläge hintereinander - so klingt ein Klatschen echt.
      [0, 0.012, 0.026].forEach((offset, index) => {
        amp.gain.setValueAtTime(vel * (0.5 - index * 0.1), t + offset);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.04);
      });
      amp.gain.setValueAtTime(vel * 0.4, t + 0.04);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      noiseHit("bandpass", 1600, 0.25, 1.4);
      break;
    }
  }

  window.setTimeout(
    () => amp.disconnect(),
    Math.max(200, (t - ctx.currentTime + 2) * 1000),
  );
}

/* -------------------------------------------------------------- Metronom */

export function playClick(accent: boolean, time?: number, volume = 0.5): void {
  const ctx = engine.ensure();
  const t = time ?? ctx.currentTime;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(volume * (accent ? 0.5 : 0.28), t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  amp.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = accent ? 1600 : 1100;
  osc.connect(amp);
  osc.start(t);
  osc.stop(t + 0.06);
  osc.onended = () => amp.disconnect();
}

/** Ein Akkord, leicht versetzt angeschlagen - wie ein echter Gitarrenschlag. */
export function strumChord(
  notes: number[],
  options: {
    track?: TrackId;
    time?: number;
    velocity?: number;
    spread?: number;
    direction?: "down" | "up";
    duration?: number;
  } = {},
): void {
  const ctx = engine.ensure();
  const t = options.time ?? ctx.currentTime;
  const spread = options.spread ?? 0.022;
  const ordered = options.direction === "up" ? [...notes].reverse() : notes;
  ordered.forEach((midi, index) => {
    playPluck({
      track: options.track ?? "guitar",
      midi,
      time: t + index * spread,
      velocity: (options.velocity ?? 0.8) * (1 - index * 0.06),
      duration: options.duration ?? 2.4,
    });
  });
}
