/*
 * Das Herz von SoundLab: ein einziger AudioContext mit einem festen Mischpult.
 *
 * Aufbau (von links nach rechts):
 *
 *   Instrument -> Spur-Eingang -> EQ -> Panorama -> Spur-Lautstärke -+-> Summe
 *                                                                    |
 *                                                    Hall / Echo ----+
 *
 * Jede Spur hat denselben Weg. Easy Mode stellt nur Lautstärke und Mute,
 * Pro Mode dieselben Knoten mit mehr Reglern - es bleibt dieselbe Maschine.
 */

export type TrackId = "drums" | "bass" | "piano" | "guitar" | "synth" | "voice";

export const TRACK_IDS: TrackId[] = [
  "drums",
  "bass",
  "piano",
  "guitar",
  "synth",
  "voice",
];

type Bus = {
  input: GainNode;
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
  pan: StereoPannerNode;
  gain: GainNode;
  reverbSend: GainNode;
  delaySend: GainNode;
  analyser: AnalyserNode;
  volume: number;
  muted: boolean;
};

function makeImpulse(ctx: AudioContext, seconds: number, decay: number) {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

class SoundLabEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbReturn: GainNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayReturn: GainNode | null = null;
  private busses = new Map<TrackId, Bus>();
  private masterVolume = 0.8;
  private soloed = new Set<TrackId>();

  get ready() {
    return this.ctx !== null && this.ctx.state === "running";
  }

  /**
   * Muss aus einer Nutzeraktion heraus aufgerufen werden (Klick, Touch).
   * Browser starten Audio sonst nicht.
   */
  ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.build(ctx);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private build(ctx: AudioContext) {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;

    const master = ctx.createGain();
    master.gain.value = this.masterVolume;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;

    master.connect(limiter);
    limiter.connect(analyser);
    limiter.connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 2.6, 2.4);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 1;
    reverb.connect(reverbReturn);
    reverbReturn.connect(master);

    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.34;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const delayReturn = ctx.createGain();
    delayReturn.gain.value = 1;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayReturn);
    delayReturn.connect(master);

    this.master = master;
    this.limiter = limiter;
    this.masterAnalyser = analyser;
    this.reverb = reverb;
    this.reverbReturn = reverbReturn;
    this.delay = delay;
    this.delayFeedback = feedback;
    this.delayReturn = delayReturn;
  }

  now(): number {
    return this.ensure().currentTime;
  }

  /** Eingang einer Spur. Instrumente hängen sich hier ein. */
  bus(track: TrackId): GainNode {
    const ctx = this.ensure();
    const existing = this.busses.get(track);
    if (existing) return existing.input;

    const input = ctx.createGain();
    const low = ctx.createBiquadFilter();
    low.type = "lowshelf";
    low.frequency.value = 240;
    const mid = ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1100;
    mid.Q.value = 0.8;
    const high = ctx.createBiquadFilter();
    high.type = "highshelf";
    high.frequency.value = 3600;
    const pan = ctx.createStereoPanner();
    const gain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0;
    const delaySend = ctx.createGain();
    delaySend.gain.value = 0;

    input.connect(low);
    low.connect(mid);
    mid.connect(high);
    high.connect(pan);
    pan.connect(gain);
    gain.connect(analyser);
    if (this.master) gain.connect(this.master);
    gain.connect(reverbSend);
    gain.connect(delaySend);
    if (this.reverb) reverbSend.connect(this.reverb);
    if (this.delay) delaySend.connect(this.delay);

    const bus: Bus = {
      input,
      low,
      mid,
      high,
      pan,
      gain,
      reverbSend,
      delaySend,
      analyser,
      volume: 0.8,
      muted: false,
    };
    this.busses.set(track, bus);
    this.applyGain(track);
    return input;
  }

  private applyGain(track: TrackId) {
    const bus = this.busses.get(track);
    if (!bus || !this.ctx) return;
    const silencedBySolo = this.soloed.size > 0 && !this.soloed.has(track);
    const target = bus.muted || silencedBySolo ? 0 : bus.volume;
    bus.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
  }

  setTrackVolume(track: TrackId, volume: number) {
    this.bus(track);
    const bus = this.busses.get(track);
    if (!bus) return;
    bus.volume = Math.max(0, Math.min(1.4, volume));
    this.applyGain(track);
  }

  setTrackMuted(track: TrackId, muted: boolean) {
    this.bus(track);
    const bus = this.busses.get(track);
    if (!bus) return;
    bus.muted = muted;
    this.applyGain(track);
  }

  setSolo(tracks: TrackId[]) {
    this.soloed = new Set(tracks);
    this.busses.forEach((_, id) => this.applyGain(id));
  }

  setPan(track: TrackId, value: number) {
    this.bus(track);
    const bus = this.busses.get(track);
    if (!bus || !this.ctx) return;
    bus.pan.pan.setTargetAtTime(
      Math.max(-1, Math.min(1, value)),
      this.ctx.currentTime,
      0.02,
    );
  }

  setEq(track: TrackId, band: "low" | "mid" | "high", db: number) {
    this.bus(track);
    const bus = this.busses.get(track);
    if (!bus || !this.ctx) return;
    bus[band].gain.setTargetAtTime(db, this.ctx.currentTime, 0.03);
  }

  setSend(track: TrackId, kind: "reverb" | "delay", amount: number) {
    this.bus(track);
    const bus = this.busses.get(track);
    if (!bus || !this.ctx) return;
    const node = kind === "reverb" ? bus.reverbSend : bus.delaySend;
    node.gain.setTargetAtTime(
      Math.max(0, Math.min(1, amount)),
      this.ctx.currentTime,
      0.03,
    );
  }

  setDelayTime(seconds: number) {
    if (!this.delay || !this.ctx) return;
    this.delay.delayTime.setTargetAtTime(
      Math.max(0.02, Math.min(1.5, seconds)),
      this.ctx.currentTime,
      0.05,
    );
  }

  setDelayFeedback(amount: number) {
    if (!this.delayFeedback || !this.ctx) return;
    this.delayFeedback.gain.setTargetAtTime(
      Math.max(0, Math.min(0.85, amount)),
      this.ctx.currentTime,
      0.05,
    );
  }

  setCompressor(amount: number) {
    if (!this.limiter || !this.ctx) return;
    // amount 0..1 -> sanfter Grenzwert bis kräftige Kompression
    this.limiter.threshold.setTargetAtTime(
      -4 - amount * 26,
      this.ctx.currentTime,
      0.05,
    );
    this.limiter.ratio.setTargetAtTime(2 + amount * 14, this.ctx.currentTime, 0.05);
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        this.masterVolume,
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  getMasterVolume() {
    return this.masterVolume;
  }

  /** Aktuelle Lautstärke einer Spur (0..1) - für Pegelanzeigen und Avatare. */
  level(track: TrackId): number {
    const bus = this.busses.get(track);
    if (!bus) return 0;
    const data = new Uint8Array(bus.analyser.fftSize);
    bus.analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) {
      peak = Math.max(peak, Math.abs(data[i] - 128) / 128);
    }
    return peak;
  }

  /** Wellenform der Summe - für die Anzeige im Player. */
  waveform(target: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
    if (!this.masterAnalyser) {
      target.fill(128);
      return target;
    }
    this.masterAnalyser.getByteTimeDomainData(target);
    return target;
  }

  masterLevel(): number {
    if (!this.masterAnalyser) return 0;
    const data = new Uint8Array(this.masterAnalyser.fftSize);
    this.masterAnalyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  }

  /** Alle Spuren kurz stummschalten - beim harten Stopp. */
  panic() {
    if (!this.ctx) return;
    this.busses.forEach((bus) => {
      bus.gain.gain.cancelScheduledValues(this.ctx!.currentTime);
      bus.gain.gain.setValueAtTime(0, this.ctx!.currentTime);
    });
    window.setTimeout(() => {
      this.busses.forEach((_, id) => this.applyGain(id));
    }, 60);
  }
}

export const engine = new SoundLabEngine();
