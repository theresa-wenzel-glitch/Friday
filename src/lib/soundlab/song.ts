/*
 * Das Datenmodell eines Stücks.
 *
 * Ein Song ist bewusst klein gehalten: Stil, Tempo, Tonart und sechs Spuren.
 * Easy Mode zeigt davon nur einen Teil, Pro Mode alles - es sind dieselben Daten.
 */

import type { TrackId } from "./engine";
import { STYLES, type LoopCategory, type StyleId } from "./patterns";
import type { ScaleId } from "./theory";

export type SectionId = "intro" | "verse" | "chorus" | "outro";

export const BARS_PER_SECTION = 4;

export const SECTIONS: {
  id: SectionId;
  label: string;
  hint: string;
}[] = [
  { id: "intro", label: "Intro", hint: "Der Anfang. Wenig Instrumente, Neugier wecken." },
  { id: "verse", label: "Strophe", hint: "Hier passiert die Geschichte." },
  { id: "chorus", label: "Refrain", hint: "Alles rein. Der Teil, den man mitsingt." },
  { id: "outro", label: "Outro", hint: "Ausklingen lassen." },
];

export type TrackState = {
  id: TrackId;
  label: string;
  enabled: boolean;
  volume: number;
  muted: boolean;
  solo: boolean;
  pan: number;
  loopId: string;
  /** In welchen Abschnitten spielt die Spur? */
  sections: Record<SectionId, boolean>;
  preset?: string;
  eq: { low: number; mid: number; high: number };
  reverb: number;
  delay: number;
};

export type SongState = {
  id: string;
  name: string;
  styleId: StyleId;
  bpm: number;
  keyRoot: number;
  scale: ScaleId;
  swing: number;
  sections: SectionId[];
  tracks: Record<TrackId, TrackState>;
  percussion: { enabled: boolean; loopId: string };
  createdAt: string;
};

export const TRACK_META: Record<
  TrackId,
  { label: string; emoji: string; accent: string; category: LoopCategory }
> = {
  drums: { label: "Drums", emoji: "🥁", accent: "orange", category: "drums" },
  bass: { label: "Bass", emoji: "🎸", accent: "blue", category: "bass" },
  piano: { label: "Piano", emoji: "🎹", accent: "violet", category: "piano" },
  guitar: { label: "Gitarre", emoji: "🎸", accent: "green", category: "guitar" },
  synth: { label: "Synth", emoji: "🎛️", accent: "cyan", category: "synth" },
  voice: { label: "Stimme", emoji: "🎤", accent: "pink", category: "piano" },
};

const DEFAULT_SECTION_MAP: Record<TrackId, Record<SectionId, boolean>> = {
  drums: { intro: false, verse: true, chorus: true, outro: false },
  bass: { intro: false, verse: true, chorus: true, outro: true },
  piano: { intro: true, verse: true, chorus: true, outro: true },
  guitar: { intro: false, verse: false, chorus: true, outro: false },
  synth: { intro: true, verse: false, chorus: true, outro: true },
  voice: { intro: false, verse: true, chorus: true, outro: false },
};

const DEFAULT_ENABLED: Record<TrackId, boolean> = {
  drums: true,
  bass: true,
  piano: true,
  guitar: false,
  synth: false,
  voice: false,
};

export function createSong(styleId: StyleId = "pop", name = "Neuer Song"): SongState {
  const style = STYLES[styleId];
  const tracks = {} as Record<TrackId, TrackState>;
  (Object.keys(TRACK_META) as TrackId[]).forEach((id) => {
    tracks[id] = {
      id,
      label: TRACK_META[id].label,
      enabled: DEFAULT_ENABLED[id],
      volume: id === "drums" ? 0.85 : 0.7,
      muted: false,
      solo: false,
      pan: id === "guitar" ? -0.25 : id === "synth" ? 0.25 : 0,
      loopId: style.defaults[TRACK_META[id].category],
      sections: { ...DEFAULT_SECTION_MAP[id] },
      preset: id === "piano" ? "piano" : id === "synth" ? "pad" : undefined,
      eq: { low: 0, mid: 0, high: 0 },
      reverb: id === "voice" ? 0.25 : 0.12,
      delay: 0,
    };
  });

  return {
    id: `song-${Date.now().toString(36)}`,
    name,
    styleId,
    bpm: style.bpm,
    keyRoot: 0,
    scale: style.scale,
    swing: 0,
    sections: ["intro", "verse", "chorus", "outro"],
    tracks,
    percussion: { enabled: false, loopId: style.defaults.percussion },
    createdAt: new Date().toISOString(),
  };
}

export function songBars(song: SongState): number {
  return song.sections.length * BARS_PER_SECTION;
}

export function sectionAtBar(song: SongState, bar: number): SectionId {
  const index = Math.floor(bar / BARS_PER_SECTION) % song.sections.length;
  return song.sections[index];
}

export function songSeconds(song: SongState): number {
  return (songBars(song) * 4 * 60) / song.bpm;
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function activeTrackIds(song: SongState): TrackId[] {
  return (Object.keys(song.tracks) as TrackId[]).filter(
    (id) => song.tracks[id].enabled,
  );
}
