"use client";

/*
 * Der gemeinsame Zustand von SoundLab.
 *
 * Hier hängt alles zusammen: der Song, das Mischpult, die Uhr, die Aufnahme und
 * der Fortschritt. Die Seiten selbst bleiben dadurch schlank - sie zeigen an und
 * lösen aus, gerechnet wird hier.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { engine, TRACK_IDS, type TrackId } from "@/lib/soundlab/engine";
import { transport } from "@/lib/soundlab/transport";
import { scheduleSongStep } from "@/lib/soundlab/arranger";
import { STEPS_PER_BAR, STYLES, type StyleId } from "@/lib/soundlab/patterns";
import {
  createSong,
  songBars,
  type SongState,
  type TrackState,
} from "@/lib/soundlab/song";
import { playClick } from "@/lib/soundlab/voices";
import {
  DEFAULT_VOICE_SETTINGS,
  type VoiceAnalysis,
  type VoiceSettings,
} from "@/lib/soundlab/voiceLab";

export type Mode = "easy" | "pro";

export type Milestone =
  | "first-note"
  | "first-beat"
  | "first-band"
  | "first-song"
  | "studio";

export type Project = {
  id: string;
  name: string;
  savedAt: string;
  song: SongState;
};

const STORAGE_KEY = "soundlab.state.v1";

type Persisted = {
  mode: Mode;
  projects: Project[];
  milestones: Milestone[];
  song: SongState | null;
};

type SoundLabContextValue = {
  ready: boolean;
  audioReady: boolean;
  startAudio: () => void;

  mode: Mode;
  setMode: (mode: Mode) => void;

  song: SongState;
  setSong: (song: SongState) => void;
  updateSong: (patch: Partial<SongState>) => void;
  updateTrack: (id: TrackId, patch: Partial<TrackState>) => void;
  setStyle: (styleId: StyleId) => void;
  newSong: (styleId?: StyleId) => void;

  playing: boolean;
  bpm: number;
  step: number;
  bar: number;
  play: () => void;
  stop: () => void;
  toggle: () => void;
  setBpm: (bpm: number) => void;

  /** Nur diese Spur klingt (Vorschau auf den Instrumentenseiten). */
  focusTrack: TrackId | null;
  setFocusTrack: (id: TrackId | null) => void;
  /** Spur, die der Mensch gerade selbst spielt - die Begleitung lässt sie aus. */
  liveTrack: TrackId | null;
  setLiveTrack: (id: TrackId | null) => void;

  metronome: boolean;
  setMetronome: (on: boolean) => void;
  masterVolume: number;
  setMasterVolume: (value: number) => void;

  voiceBuffer: AudioBuffer | null;
  voiceAnalysis: VoiceAnalysis | null;
  voiceSettings: VoiceSettings;
  setVoiceSettings: (settings: VoiceSettings) => void;
  setRecording: (buffer: AudioBuffer, analysis: VoiceAnalysis) => void;
  clearRecording: () => void;

  projects: Project[];
  saveProject: (name?: string) => Project;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;

  milestones: Milestone[];
  reachMilestone: (milestone: Milestone) => void;
};

const SoundLabContext = createContext<SoundLabContextValue | null>(null);

const SERVER_SNAPSHOT = { playing: false, bpm: 100, step: 0 };

export function SoundLabProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [mode, setModeState] = useState<Mode>("easy");
  const [song, setSongState] = useState<SongState>(() => createSong("pop"));
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [metronome, setMetronome] = useState(false);
  const [focusTrack, setFocusTrack] = useState<TrackId | null>(null);
  const [liveTrack, setLiveTrack] = useState<TrackId | null>(null);
  const [masterVolume, setMasterVolumeState] = useState(0.8);
  const [voiceBuffer, setVoiceBuffer] = useState<AudioBuffer | null>(null);
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(
    DEFAULT_VOICE_SETTINGS,
  );

  // Der Sequencer liest den Song aus einer Referenz - so hört er auch dann die
  // aktuellen Einstellungen, wenn sich mitten im Takt etwas ändert.
  const songRef = useRef(song);
  songRef.current = song;
  const voiceRef = useRef<AudioBuffer | null>(null);
  voiceRef.current = voiceBuffer;
  const metronomeRef = useRef(metronome);
  metronomeRef.current = metronome;
  const focusRef = useRef<TrackId | null>(focusTrack);
  focusRef.current = focusTrack;
  const liveRef = useRef<TrackId | null>(liveTrack);
  liveRef.current = liveTrack;

  const clock = useSyncExternalStore(
    useCallback((listener: () => void) => transport.subscribeState(listener), []),
    () => transport.getSnapshot(),
    () => SERVER_SNAPSHOT,
  );

  /* ------------------------------------------------- Laden und Speichern */

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        if (parsed.mode === "easy" || parsed.mode === "pro") setModeState(parsed.mode);
        if (Array.isArray(parsed.projects)) setProjects(parsed.projects);
        if (Array.isArray(parsed.milestones)) setMilestones(parsed.milestones);
        if (parsed.song && parsed.song.tracks) setSongState(parsed.song);
      }
    } catch {
      /* Kein gespeicherter Stand - dann eben frisch anfangen. */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload: Persisted = { mode, projects, milestones, song };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* Speicher voll oder gesperrt - nicht schlimm. */
    }
  }, [ready, mode, projects, milestones, song]);

  /* ------------------------------------------------------------- Audio */

  const startAudio = useCallback(() => {
    engine.ensure();
    if (!audioReady) setAudioReady(true);
  }, [audioReady]);

  // Mischpult an den Song angleichen.
  useEffect(() => {
    if (!audioReady) return;
    const soloed = TRACK_IDS.filter((id) => song.tracks[id]?.solo);
    engine.setSolo(soloed);
    TRACK_IDS.forEach((id) => {
      const track = song.tracks[id];
      if (!track) return;
      engine.setTrackVolume(id, track.volume);
      engine.setTrackMuted(id, track.muted || !track.enabled);
      engine.setPan(id, track.pan);
      engine.setEq(id, "low", track.eq.low);
      engine.setEq(id, "mid", track.eq.mid);
      engine.setEq(id, "high", track.eq.high);
      engine.setSend(id, "reverb", track.reverb);
      engine.setSend(id, "delay", track.delay);
    });
  }, [audioReady, song]);

  useEffect(() => {
    if (!audioReady) return;
    engine.setMasterVolume(masterVolume);
  }, [audioReady, masterVolume]);

  // Uhr an den Sequencer koppeln.
  useEffect(() => {
    const unsubscribe = transport.subscribe((step, time) => {
      scheduleSongStep(songRef.current, step, time, {
        voiceBuffer: voiceRef.current,
        only: focusRef.current,
        skip: liveRef.current,
      });
      if (metronomeRef.current && step % 4 === 0) {
        playClick(step % STEPS_PER_BAR === 0, time, 0.6);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    transport.setBpm(song.bpm);
    transport.setSwing(song.swing);
    transport.loopLength = songBars(song) * STEPS_PER_BAR;
  }, [song.bpm, song.swing, song.sections.length, song]);

  /* ------------------------------------------------------------ Aktionen */

  const reachMilestone = useCallback((milestone: Milestone) => {
    setMilestones((current) =>
      current.includes(milestone) ? current : [...current, milestone],
    );
  }, []);

  const updateSong = useCallback((patch: Partial<SongState>) => {
    setSongState((current) => ({ ...current, ...patch }));
  }, []);

  const updateTrack = useCallback((id: TrackId, patch: Partial<TrackState>) => {
    setSongState((current) => ({
      ...current,
      tracks: { ...current.tracks, [id]: { ...current.tracks[id], ...patch } },
    }));
  }, []);

  const setStyle = useCallback((styleId: StyleId) => {
    const style = STYLES[styleId];
    setSongState((current) => {
      const tracks = { ...current.tracks };
      (Object.keys(tracks) as TrackId[]).forEach((id) => {
        const category = id === "voice" ? null : trackCategory(id);
        if (category) {
          tracks[id] = { ...tracks[id], loopId: style.defaults[category] };
        }
      });
      return {
        ...current,
        styleId,
        bpm: style.bpm,
        scale: style.scale,
        swing: styleId === "lofi" ? 0.2 : styleId === "hiphop" ? 0.12 : 0,
        tracks,
        percussion: { ...current.percussion, loopId: style.defaults.percussion },
      };
    });
  }, []);

  const play = useCallback(() => {
    engine.ensure();
    setAudioReady(true);
    transport.start();
  }, []);

  const stop = useCallback(() => {
    transport.stop();
  }, []);

  const toggle = useCallback(() => {
    engine.ensure();
    setAudioReady(true);
    if (transport.playing) transport.stop();
    else transport.start();
  }, []);

  const setBpm = useCallback((bpm: number) => {
    setSongState((current) => ({
      ...current,
      bpm: Math.max(40, Math.min(200, Math.round(bpm))),
    }));
  }, []);

  const newSong = useCallback((styleId: StyleId = "pop") => {
    transport.stop();
    setSongState(createSong(styleId));
  }, []);

  const saveProject = useCallback(
    (name?: string) => {
      const project: Project = {
        id: `p-${Date.now().toString(36)}`,
        name: name?.trim() || song.name || "Ohne Titel",
        savedAt: new Date().toISOString(),
        song: { ...song, name: name?.trim() || song.name },
      };
      setProjects((current) => [project, ...current].slice(0, 40));
      setSongState((current) => ({ ...current, name: project.name }));
      return project;
    },
    [song],
  );

  const loadProject = useCallback((id: string) => {
    transport.stop();
    setProjects((current) => {
      const found = current.find((project) => project.id === id);
      if (found) setSongState(found.song);
      return current;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((current) => current.filter((project) => project.id !== id));
  }, []);

  const setRecording = useCallback(
    (buffer: AudioBuffer, analysis: VoiceAnalysis) => {
      setVoiceBuffer(buffer);
      setVoiceAnalysis(analysis);
    },
    [],
  );

  const clearRecording = useCallback(() => {
    setVoiceBuffer(null);
    setVoiceAnalysis(null);
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    if (next === "pro") {
      setMilestones((current) =>
        current.includes("studio") ? current : [...current, "studio"],
      );
    }
  }, []);

  const setMasterVolume = useCallback((value: number) => {
    setMasterVolumeState(Math.max(0, Math.min(1, value)));
  }, []);

  const value = useMemo<SoundLabContextValue>(
    () => ({
      ready,
      audioReady,
      startAudio,
      mode,
      setMode,
      song,
      setSong: setSongState,
      updateSong,
      updateTrack,
      setStyle,
      newSong,
      playing: clock.playing,
      bpm: song.bpm,
      step: clock.step,
      bar: Math.floor(
        (clock.step % (songBars(song) * STEPS_PER_BAR)) / STEPS_PER_BAR,
      ),
      play,
      stop,
      toggle,
      setBpm,
      focusTrack,
      setFocusTrack,
      liveTrack,
      setLiveTrack,
      metronome,
      setMetronome,
      masterVolume,
      setMasterVolume,
      voiceBuffer,
      voiceAnalysis,
      voiceSettings,
      setVoiceSettings,
      setRecording,
      clearRecording,
      projects,
      saveProject,
      loadProject,
      deleteProject,
      milestones,
      reachMilestone,
    }),
    [
      ready,
      audioReady,
      startAudio,
      mode,
      setMode,
      song,
      updateSong,
      updateTrack,
      setStyle,
      newSong,
      clock.playing,
      clock.step,
      play,
      stop,
      toggle,
      setBpm,
      focusTrack,
      liveTrack,
      metronome,
      masterVolume,
      setMasterVolume,
      voiceBuffer,
      voiceAnalysis,
      voiceSettings,
      setRecording,
      clearRecording,
      projects,
      saveProject,
      loadProject,
      deleteProject,
      milestones,
      reachMilestone,
    ],
  );

  return (
    <SoundLabContext.Provider value={value}>{children}</SoundLabContext.Provider>
  );
}

function trackCategory(id: TrackId) {
  switch (id) {
    case "drums":
      return "drums" as const;
    case "bass":
      return "bass" as const;
    case "piano":
      return "piano" as const;
    case "guitar":
      return "guitar" as const;
    case "synth":
      return "synth" as const;
    default:
      return null;
  }
}

export function useSoundLab(): SoundLabContextValue {
  const context = useContext(SoundLabContext);
  if (!context) {
    throw new Error("useSoundLab muss innerhalb von <SoundLabProvider> stehen.");
  }
  return context;
}
