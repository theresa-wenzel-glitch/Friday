/*
 * Die Uhr. Sie zählt Sechzehntelschritte und sagt allen Beteiligten rechtzeitig
 * Bescheid.
 *
 * Wichtig für sauberes Timing: Töne werden nicht "jetzt" gespielt, sondern ein
 * kleines Stück in der Zukunft geplant. Ein Timer schaut alle 25 ms nach, was in
 * den nächsten 120 ms ansteht, und übergibt das der Audio-Hardware. Ruckelt die
 * Oberfläche, bleibt der Takt trotzdem exakt.
 */

import { engine } from "./engine";

export type StepListener = (step: number, time: number) => void;

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

class Transport {
  private stepListeners = new Set<StepListener>();
  private stateListeners = new Set<() => void>();
  private timer: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  private startTime = 0;

  bpm = 100;
  swing = 0;
  playing = false;
  /** Länge des Arrangements in Schritten. 0 = endlos weiterzählen. */
  loopLength = 0;

  private snapshot = { playing: false, bpm: 100, step: 0 };

  subscribe(listener: StepListener): () => void {
    this.stepListeners.add(listener);
    return () => this.stepListeners.delete(listener);
  }

  subscribeState(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  getSnapshot() {
    return this.snapshot;
  }

  private emitState() {
    this.snapshot = { playing: this.playing, bpm: this.bpm, step: this.step };
    this.stateListeners.forEach((listener) => listener());
  }

  get stepDuration(): number {
    return 60 / this.bpm / 4;
  }

  /** Position in Schritten seit dem Start (bereits an der Schleife gespiegelt). */
  get currentStep(): number {
    return this.loopLength > 0 ? this.step % this.loopLength : this.step;
  }

  /** Wie weit ist der laufende Durchgang? 0..1 - für den Fortschrittsbalken. */
  progress(): number {
    if (!this.playing || this.loopLength === 0) return 0;
    const ctx = engine.ensure();
    const elapsed = ctx.currentTime - this.startTime;
    const loopSeconds = this.loopLength * this.stepDuration;
    return (elapsed % loopSeconds) / loopSeconds;
  }

  /** Aktuelle Uhrzeit der Audio-Hardware. */
  currentTime(): number {
    return engine.ensure().currentTime;
  }

  elapsedSeconds(): number {
    if (!this.playing) return 0;
    return engine.ensure().currentTime - this.startTime;
  }

  setBpm(bpm: number) {
    this.bpm = Math.max(40, Math.min(200, Math.round(bpm)));
    this.emitState();
  }

  setSwing(swing: number) {
    this.swing = Math.max(0, Math.min(0.5, swing));
  }

  start(fromStep = 0) {
    const ctx = engine.ensure();
    if (this.playing) return;
    this.playing = true;
    this.step = fromStep;
    this.nextStepTime = ctx.currentTime + 0.06;
    this.startTime = this.nextStepTime;
    this.emitState();
    this.tick();
    this.timer = window.setInterval(() => this.tick(), LOOKAHEAD_MS);
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.playing = false;
    this.step = 0;
    engine.panic();
    this.emitState();
  }

  toggle() {
    if (this.playing) this.stop();
    else this.start();
  }

  private tick() {
    const ctx = engine.ensure();
    while (this.nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
      const position =
        this.loopLength > 0 ? this.step % this.loopLength : this.step;
      // Swing verschiebt jeden zweiten Sechzehntel nach hinten.
      const offset =
        this.step % 2 === 1 ? this.swing * this.stepDuration : 0;
      this.stepListeners.forEach((listener) =>
        listener(position, this.nextStepTime + offset),
      );
      this.nextStepTime += this.stepDuration;
      this.step += 1;
      if (this.step % 2 === 0) this.emitState();
    }
  }
}

export const transport = new Transport();
