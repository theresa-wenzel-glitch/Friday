"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { AccompanimentBar } from "@/components/soundlab/AccompanimentBar";
import { BassPads } from "@/components/soundlab/BassPads";
import { DrumKit } from "@/components/soundlab/DrumKit";
import { GuitarChords } from "@/components/soundlab/GuitarChords";
import { Piano } from "@/components/soundlab/Piano";
import { SynthPad } from "@/components/soundlab/SynthPad";
import { VoiceStudio } from "@/components/soundlab/VoiceStudio";
import { Icon } from "@/components/soundlab/Icon";
import type { TrackId } from "@/lib/soundlab/engine";

/*
 * Eine Seite für alle Instrumente. Oben immer dasselbe Gerüst, unten das
 * jeweilige Instrument - so fühlt sich der Wechsel nie wie ein anderer Ort an.
 */

const INSTRUMENTS: Record<
  string,
  { title: string; emoji: string; track: TrackId; hint: string; accent: string }
> = {
  klavier: {
    title: "Klavier",
    emoji: "🎹",
    track: "piano",
    accent: "piano",
    hint: "Tippe irgendeine Taste. Mit „Easy Play“ klingt jede davon passend.",
  },
  drums: {
    title: "Schlagzeug",
    emoji: "🥁",
    track: "drums",
    accent: "drums",
    hint: "Hau auf die Pads oder starte unten einen fertigen Beat.",
  },
  gitarre: {
    title: "Gitarre",
    emoji: "🎸",
    track: "guitar",
    accent: "guitar",
    hint: "Akkord wählen, über den Balken ziehen - fertig ist die Begleitung.",
  },
  bass: {
    title: "Bass",
    emoji: "🎸",
    track: "bass",
    accent: "bass",
    hint: "Drei Lagen, sechs Töne. Alle passen zur Tonart.",
  },
  synth: {
    title: "Synthesizer",
    emoji: "🎛️",
    track: "synth",
    accent: "synth",
    hint: "Unten dunkel, oben hell. Halten und ziehen erlaubt.",
  },
  stimme: {
    title: "Stimme",
    emoji: "🎤",
    track: "voice",
    accent: "voice",
    hint: "Aufnehmen, anhören, verändern. Ohne Bewertung.",
  },
};

export default function InstrumentPage() {
  const params = useParams<{ id: string }>();
  const instrument = INSTRUMENTS[params.id];
  if (!instrument) notFound();

  return (
    <div className={`sl-accent-${instrument.accent} space-y-6`}>
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/soundlab/app/instrumente" className="sl-icon-btn" aria-label="Zurück">
          <Icon name="chevronLeft" size={18} />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl flex items-center gap-3">
            <span aria-hidden>{instrument.emoji}</span> {instrument.title}
          </h1>
          <p className="sl-muted text-sm mt-1">{instrument.hint}</p>
        </div>
      </div>

      {instrument.track !== "voice" ? (
        <AccompanimentBar track={instrument.track} />
      ) : null}

      <div className="sl-card p-5 sm:p-7">
        {params.id === "klavier" ? <Piano /> : null}
        {params.id === "drums" ? <DrumKit /> : null}
        {params.id === "gitarre" ? <GuitarChords /> : null}
        {params.id === "bass" ? <BassPads /> : null}
        {params.id === "synth" ? <SynthPad /> : null}
        {params.id === "stimme" ? <VoiceStudio /> : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/soundlab/app/band" className="sl-btn sl-btn-ghost">
          Instrument zur Band hinzufügen
        </Link>
        <Link href="/soundlab/app/studio" className="sl-btn sl-btn-quiet">
          Daraus einen Song bauen
        </Link>
      </div>
    </div>
  );
}
