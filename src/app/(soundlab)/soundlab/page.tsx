import Link from "next/link";
import { LandingDemo } from "@/components/soundlab/LandingDemo";
import { Icon } from "@/components/soundlab/Icon";

/*
 * Die Landing Page. Sie muss eine einzige Sache schaffen: klarmachen, dass man
 * hier ohne Vorkenntnisse Musik machen kann - und zwar sofort.
 */

const STEPS = [
  {
    number: "1",
    title: "Instrument auswählen",
    text: "Klavier, Schlagzeug, Bass, Gitarre, Synth oder deine Stimme. Ein Klick genügt.",
    accent: "piano",
    emoji: "🎹",
  },
  {
    number: "2",
    title: "Sounds kombinieren",
    text: "Schalte mehrere Instrumente dazu. Tempo und Tonart teilen sie sich automatisch.",
    accent: "drums",
    emoji: "🥁",
  },
  {
    number: "3",
    title: "Stimme aufnehmen",
    text: "Nimm auf, hör dich an, probier Klangfarben aus. Ganz ohne Bewertung.",
    accent: "voice",
    emoji: "🎤",
  },
  {
    number: "4",
    title: "Deinen Song bauen",
    text: "Intro, Strophe, Refrain, Outro - vier Karten, ein fertiges Stück.",
    accent: "guitar",
    emoji: "🎧",
  },
];

const EASY = [
  "Virtuelle Instrumente zum Antippen",
  "Einfache Akkorde statt Griffbrett",
  "Fertige Beats in sechs Stilen",
  "Loops, die immer zusammenpassen",
  "Stimme aufnehmen und anhören",
  "Effekte als große Presets",
  "Song Builder mit vier Abschnitten",
];

const PRO = [
  "Mehrspur-Timeline über alle Takte",
  "Lautstärke, Panorama und EQ pro Spur",
  "Tonart und Tonleitern frei wählbar",
  "Akkordstufen und Fortschreitungen",
  "Reverb, Delay, Kompressor",
  "Detaillierte Stimmbearbeitung",
  "Erweiterte Songstruktur",
];

export default function SoundLabLanding() {
  return (
    <div className="soundlab">
      <header className="mx-auto max-w-7xl px-4 sm:px-6 h-20 flex items-center gap-4">
        <span className="flex items-center gap-2.5">
          <span
            className="grid place-items-center rounded-xl"
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(140deg, var(--sl-violet), var(--sl-cyan))",
              color: "#07090f",
            }}
          >
            <Icon name="waveform" size={20} />
          </span>
          <span className="font-semibold text-xl tracking-tight">SoundLab</span>
        </span>
        <nav className="ml-auto flex items-center gap-2">
          <Link href="/soundlab/app/lernen" className="sl-nav-link hidden sm:block">
            Musik entdecken
          </Link>
          <Link href="/soundlab/app/pro" className="sl-nav-link hidden sm:block">
            Pro
          </Link>
          <Link href="/soundlab/app" className="sl-btn sl-btn-primary sl-btn-sm">
            Studio öffnen
          </Link>
        </nav>
      </header>

      {/* ------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <span
          className="sl-aurora"
          style={{ width: 460, height: 460, left: "-10%", top: "-160px", background: "var(--sl-violet)" }}
        />
        <span
          className="sl-aurora"
          style={{ width: 420, height: 420, right: "-8%", top: "-60px", background: "var(--sl-cyan)", animationDelay: "-8s" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-16 sm:pt-20 sm:pb-24">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div className="sl-fade-up">
              <span className="sl-chip">Für alle, die „ich kann kein Instrument“ sagen</span>
              <h1 className="text-4xl sm:text-6xl mt-5 leading-[1.05]">
                Musik machen.
                <br />
                <span
                  style={{
                    background: "linear-gradient(100deg, var(--sl-violet), var(--sl-pink) 55%, var(--sl-cyan))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Ohne Instrument zu können.
                </span>
              </h1>
              <p className="sl-muted text-lg mt-5 max-w-xl">
                Spiele Instrumente, baue deine eigene Band und entdecke deinen
                eigenen Sound. Alles läuft direkt im Browser - kein Download,
                keine Vorkenntnisse.
              </p>

              <div className="flex flex-wrap gap-3 mt-8">
                <Link href="/soundlab/app" className="sl-btn sl-btn-primary">
                  Jetzt ausprobieren <Icon name="arrowRight" size={18} />
                </Link>
                <Link href="/soundlab/app/pro" className="sl-btn sl-btn-ghost">
                  Pro entdecken
                </Link>
              </div>

              <div className="mt-10">
                <p className="sl-label mb-3">Hör sofort rein - tippe etwas an</p>
                <LandingDemo />
              </div>
            </div>

            {/* Studio-Vorschau */}
            <div className="sl-card sl-halo p-5 sm:p-6 sl-fade-up" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="sl-label">Dein Studio</span>
                <span className="sl-chip sl-chip-quiet">104 BPM · C Dur</span>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: "DRUMS", accent: "drums", bars: [1, 1, 1, 1, 1, 1, 0, 0] },
                  { label: "BASS", accent: "bass", bars: [0, 1, 1, 1, 1, 1, 1, 0] },
                  { label: "PIANO", accent: "piano", bars: [1, 1, 1, 1, 1, 1, 1, 1] },
                  { label: "GUITAR", accent: "guitar", bars: [0, 0, 1, 1, 1, 1, 0, 0] },
                  { label: "VOICE", accent: "voice", bars: [0, 0, 0, 1, 1, 1, 1, 0] },
                ].map((row) => (
                  <div key={row.label} className={`flex items-center gap-3 sl-accent-${row.accent}`}>
                    <span className="w-16 shrink-0 text-[11px] font-semibold tracking-wider sl-muted">
                      {row.label}
                    </span>
                    <div className="flex-1 grid grid-cols-8 gap-1">
                      {row.bars.map((on, index) => (
                        <span
                          key={index}
                          className="h-7 rounded-md"
                          style={{
                            backgroundColor: on
                              ? "color-mix(in srgb, var(--sl-accent) 62%, transparent)"
                              : "var(--sl-surface)",
                            border: `1px solid ${
                              on
                                ? "color-mix(in srgb, var(--sl-accent) 70%, transparent)"
                                : "var(--sl-line-soft)"
                            }`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sl-inset mt-5 p-4 flex items-center gap-4">
                <span
                  className="grid place-items-center rounded-full shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    background: "linear-gradient(140deg, var(--sl-violet), var(--sl-pink))",
                    color: "#07090f",
                  }}
                >
                  <Icon name="play" size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Mein erster Song</p>
                  <div
                    className="mt-2 h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--sl-surface-3)" }}
                  >
                    <div
                      className="h-full w-2/5 rounded-full"
                      style={{ background: "linear-gradient(90deg, var(--sl-violet), var(--sl-pink))" }}
                    />
                  </div>
                </div>
                <span className="sl-muted-2 text-xs tabular-nums">0:14 / 0:37</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- So funktioniert's */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl text-center">So funktioniert&apos;s</h2>
        <p className="sl-muted text-center mt-3 max-w-xl mx-auto">
          Vier Schritte vom leeren Bildschirm zum eigenen Stück. Jeder davon
          funktioniert auch allein.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {STEPS.map((step) => (
            <div key={step.number} className={`sl-card sl-card-hover p-6 sl-accent-${step.accent}`}>
              <div className="flex items-center justify-between">
                <span className="text-3xl" aria-hidden>
                  {step.emoji}
                </span>
                <span
                  className="grid place-items-center rounded-full text-sm font-bold"
                  style={{
                    width: 30,
                    height: 30,
                    backgroundColor: "color-mix(in srgb, var(--sl-accent) 22%, transparent)",
                    color: "var(--sl-accent)",
                  }}
                >
                  {step.number}
                </span>
              </div>
              <h3 className="text-lg mt-4">{step.title}</h3>
              <p className="sl-muted text-sm mt-2">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- Easy vs Pro */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="sl-card p-7 sl-accent-guitar">
            <span className="sl-chip">Easy Mode</span>
            <h3 className="text-2xl mt-4">Für Anfänger gemacht.</h3>
            <p className="sl-muted mt-2">
              Wenige, große Elemente. Falsche Töne gibt es praktisch nicht - die
              App hält dich in der Tonart.
            </p>
            <ul className="mt-5 space-y-2">
              {EASY.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 shrink-0 text-[var(--sl-accent)]">
                    <Icon name="check" size={16} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/soundlab/app" className="sl-btn sl-btn-primary mt-6">
              Einfach losspielen
            </Link>
          </div>

          <div className="sl-card p-7 sl-accent-synth">
            <span className="sl-chip">Pro Mode</span>
            <h3 className="text-2xl mt-4">Für Musiker erweiterbar.</h3>
            <p className="sl-muted mt-2">
              Dieselbe App, mehr Kontrolle. Nichts wird ersetzt - es kommt nur
              dazu, wenn du es brauchst.
            </p>
            <ul className="mt-5 space-y-2">
              {PRO.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 shrink-0 text-[var(--sl-accent)]">
                    <Icon name="check" size={16} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/soundlab/app/pro" className="sl-btn sl-btn-ghost mt-6">
              Pro entdecken
            </Link>
          </div>
        </div>

        <div className="sl-panel mt-5 p-7 text-center">
          <p className="text-lg sm:text-xl max-w-2xl mx-auto">
            „Du musst kein Instrument spielen können, um Musik zu machen.“
          </p>
          <p className="sl-muted text-sm mt-2">
            Easy und Pro sind nicht zwei Apps. Pro ist einfach das, was Easy
            später wird.
          </p>
          <Link href="/soundlab/app" className="sl-btn sl-btn-primary mt-6">
            Studio öffnen <Icon name="arrowRight" size={18} />
          </Link>
        </div>
      </section>

      <footer
        className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-wrap gap-4 items-center justify-between"
        style={{ borderTop: "1px solid var(--sl-line-soft)" }}
      >
        <p className="sl-muted-2 text-sm">
          SoundLab - Prototyp. Alle Klänge entstehen live im Browser.
        </p>
        <nav className="flex gap-4 text-sm sl-muted">
          <Link href="/soundlab/app">Studio</Link>
          <Link href="/soundlab/app/lernen">Musik entdecken</Link>
          <Link href="/soundlab/app/projekte">Projekte</Link>
        </nav>
      </footer>
    </div>
  );
}
