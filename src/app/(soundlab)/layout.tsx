import type { Metadata } from "next";
import "../globals.css";
import "./soundlab.css";

export const metadata: Metadata = {
  title: {
    default: "SoundLab - Musik machen ohne Instrument",
    template: "%s | SoundLab",
  },
  description:
    "Spiele virtuelle Instrumente, baue deine eigene Band, nimm deine Stimme auf und bau daraus einen Song. Für Anfänger gemacht, für Musiker erweiterbar.",
};

export default function SoundLabGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
