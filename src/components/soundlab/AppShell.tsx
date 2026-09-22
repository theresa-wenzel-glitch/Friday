"use client";

/*
 * Die Hülle der App: Kopfzeile, Navigation, Player.
 *
 * Auf dem Desktop steht die Navigation oben, auf dem Handy unten als Leiste
 * über dem Player. Der Modusschalter Easy/Pro ist immer sichtbar - er ist der
 * wichtigste Schalter der ganzen App.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GlobalPlayer } from "./GlobalPlayer";
import { Icon, type IconName } from "./Icon";
import { useSoundLab, type Milestone } from "./SoundLabProvider";
import { Segmented, Slider, Toggle } from "./ui";

const BASE = "/soundlab/app";

const DESKTOP_NAV = [
  { href: BASE, label: "Dashboard" },
  { href: `${BASE}/instrumente`, label: "Instrumente" },
  { href: `${BASE}/band`, label: "Meine Band" },
  { href: `${BASE}/voice`, label: "Voice" },
  { href: `${BASE}/studio`, label: "Studio" },
  { href: `${BASE}/pro`, label: "Pro" },
  { href: `${BASE}/projekte`, label: "Meine Projekte" },
];

const MOBILE_NAV: { href: string; label: string; icon: IconName }[] = [
  { href: BASE, label: "Home", icon: "sparkle" },
  { href: `${BASE}/instrumente`, label: "Play", icon: "play" },
  { href: `${BASE}/band`, label: "Band", icon: "user" },
  { href: `${BASE}/voice`, label: "Voice", icon: "mic" },
  { href: `${BASE}/studio`, label: "Studio", icon: "waveform" },
];

export const LEVELS: { id: Milestone; level: number; label: string; hint: string }[] = [
  { id: "first-note", level: 1, label: "Erste Töne", hint: "Ein Instrument angespielt." },
  { id: "first-beat", level: 2, label: "Mein erster Beat", hint: "Einen Rhythmus gestartet." },
  { id: "first-band", level: 3, label: "Meine erste Band", hint: "Mehrere Instrumente zusammen." },
  { id: "first-song", level: 4, label: "Mein erster Song", hint: "Ein Projekt gespeichert." },
  { id: "studio", level: 5, label: "Studio Mode", hint: "Den Pro Mode ausprobiert." },
];

function isActive(pathname: string, href: string) {
  if (href === BASE) return pathname === BASE;
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    mode,
    setMode,
    masterVolume,
    setMasterVolume,
    metronome,
    setMetronome,
    milestones,
    projects,
    song,
    updateSong,
  } = useSoundLab();
  const [panel, setPanel] = useState<null | "profile" | "settings">(null);

  return (
    <div className="soundlab min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-30"
        style={{
          backgroundColor: "color-mix(in srgb, #070912 88%, transparent)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--sl-line-soft)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center gap-2 sm:gap-4">
          <Link href="/soundlab" className="flex items-center gap-2.5 shrink-0">
            <span
              className="grid place-items-center rounded-xl"
              style={{
                width: 34,
                height: 34,
                background: "linear-gradient(140deg, var(--sl-violet), var(--sl-cyan))",
                color: "#07090f",
              }}
            >
              <Icon name="waveform" size={18} />
            </span>
            <span className="hidden sm:inline font-semibold text-lg tracking-tight">
              SoundLab
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 ml-2">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="sl-nav-link"
                data-active={isActive(pathname, item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Segmented
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: "easy", label: "Easy" },
                { value: "pro", label: "Pro" },
              ]}
            />
            <button
              type="button"
              className="sl-icon-btn"
              onClick={() => setPanel(panel === "profile" ? null : "profile")}
              aria-label="Profil"
              title="Profil"
            >
              <Icon name="user" size={18} />
            </button>
            <button
              type="button"
              className="sl-icon-btn"
              onClick={() => setPanel(panel === "settings" ? null : "settings")}
              aria-label="Einstellungen"
              title="Einstellungen"
            >
              <Icon name="settings" size={18} />
            </button>
          </div>
        </div>

        {/* Zweite Zeile auf mittleren Bildschirmen */}
        <div className="lg:hidden sl-scroll-x border-t" style={{ borderColor: "var(--sl-line-soft)" }}>
          <div className="flex gap-1 px-4 py-2 min-w-max">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="sl-nav-link whitespace-nowrap"
                data-active={isActive(pathname, item.href)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-10 pb-44 sm:pb-40">
        {children}
      </main>

      {/* Schublade für Profil und Einstellungen */}
      {panel ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(4,6,14,0.6)" }}
            onClick={() => setPanel(null)}
            aria-label="Schließen"
          />
          <aside
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 p-6 overflow-y-auto sl-fade-up"
            style={{
              backgroundColor: "var(--sl-bg-soft)",
              borderLeft: "1px solid var(--sl-line)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl">
                {panel === "profile" ? "Dein Profil" : "Einstellungen"}
              </h2>
              <button
                type="button"
                className="sl-icon-btn"
                onClick={() => setPanel(null)}
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>

            {panel === "profile" ? (
              <div className="space-y-5">
                <div className="sl-card p-5">
                  <p className="sl-label mb-1">Bisher entdeckt</p>
                  <p className="text-3xl font-semibold">
                    {milestones.length}
                    <span className="sl-muted text-base font-normal"> / {LEVELS.length}</span>
                  </p>
                  <p className="sl-muted text-sm mt-1">
                    {projects.length} gespeicherte{projects.length === 1 ? "s" : ""} Projekt
                    {projects.length === 1 ? "" : "e"}
                  </p>
                </div>
                <ul className="space-y-2">
                  {LEVELS.map((level) => {
                    const done = milestones.includes(level.id);
                    return (
                      <li
                        key={level.id}
                        className="sl-inset p-3 flex items-center gap-3"
                        style={{ opacity: done ? 1 : 0.6 }}
                      >
                        <span
                          className="grid place-items-center rounded-full shrink-0"
                          style={{
                            width: 30,
                            height: 30,
                            backgroundColor: done
                              ? "color-mix(in srgb, var(--sl-green) 75%, transparent)"
                              : "var(--sl-surface-3)",
                            color: done ? "#07090f" : "var(--sl-muted)",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {done ? <Icon name="check" size={15} /> : level.level}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">{level.label}</span>
                          <span className="block sl-muted text-xs">{level.hint}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="sl-muted text-xs">
                  Das ist kein Wettbewerb. Die Liste zeigt nur, was du in SoundLab
                  schon gefunden hast.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <label className="block">
                  <span className="sl-label block mb-2">Songname</span>
                  <input
                    value={song.name}
                    onChange={(event) => updateSong({ name: event.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{
                      backgroundColor: "var(--sl-surface-2)",
                      border: "1px solid var(--sl-line)",
                      color: "var(--sl-text)",
                    }}
                  />
                </label>
                <Slider
                  icon="volume"
                  label="Gesamtlautstärke"
                  displayValue={`${Math.round(masterVolume * 100)} %`}
                  value={masterVolume}
                  onChange={setMasterVolume}
                />
                <Toggle checked={metronome} onChange={setMetronome} label="Metronom" />
                <div>
                  <span className="sl-label block mb-2">Modus</span>
                  <Segmented
                    value={mode}
                    onChange={setMode}
                    options={[
                      { value: "easy", label: "Easy Mode" },
                      { value: "pro", label: "Pro Mode" },
                    ]}
                  />
                  <p className="sl-muted text-xs mt-2">
                    Easy zeigt wenige, große Bedienelemente. Pro blendet Timeline,
                    Mischpult und Effekte ein.
                  </p>
                </div>
                <div className="sl-inset p-4">
                  <p className="text-sm font-semibold mb-1">Alles zurücksetzen</p>
                  <p className="sl-muted text-xs mb-3">
                    Löscht gespeicherte Projekte und den aktuellen Song aus diesem
                    Browser.
                  </p>
                  <button
                    type="button"
                    className="sl-btn sl-btn-sm sl-btn-ghost"
                    onClick={() => {
                      window.localStorage.removeItem("soundlab.state.v1");
                      window.location.reload();
                    }}
                  >
                    <Icon name="trash" size={14} /> Zurücksetzen
                  </button>
                </div>
              </div>
            )}
          </aside>
        </>
      ) : null}

      {/* Mobile Navigation direkt über dem Player */}
      <nav
        className="sm:hidden fixed left-0 right-0 z-40"
        style={{
          bottom: "calc(4.4rem + env(safe-area-inset-bottom))",
          backgroundColor: "color-mix(in srgb, #070912 92%, transparent)",
          backdropFilter: "blur(14px)",
          borderTop: "1px solid var(--sl-line-soft)",
        }}
      >
        <div className="flex">
          {MOBILE_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center gap-1 py-2"
                style={{ color: active ? "var(--sl-text)" : "var(--sl-muted-2)" }}
              >
                <Icon name={item.icon} size={18} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <GlobalPlayer />
    </div>
  );
}
