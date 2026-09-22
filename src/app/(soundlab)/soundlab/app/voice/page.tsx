"use client";

import Link from "next/link";
import { VoiceStudio } from "@/components/soundlab/VoiceStudio";

export default function VoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="sl-label mb-2">Meine Stimme</p>
        <h1 className="text-3xl sm:text-4xl">Entdecke deine Stimme.</h1>
        <p className="sl-muted mt-2 max-w-xl">
          Aufnehmen, anhören, verändern. Die Anzeigen helfen dir beim Zuhören -
          bewertet wird hier nichts.
        </p>
      </div>

      <VoiceStudio />

      <p className="sl-muted text-sm">
        Deine Aufnahme kannst du in <Link href="/soundlab/app/band" className="underline">Meine Band</Link>{" "}
        als eigene Spur mitlaufen lassen.
      </p>
    </div>
  );
}
