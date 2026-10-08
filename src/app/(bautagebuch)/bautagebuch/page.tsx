import Link from "next/link";
import { Icon } from "@/components/bautagebuch/Icon";

export const metadata = {
  title: { absolute: "Bautagebuch-Automat - Foto + Sprachnachricht = fertiges Bautagebuch" },
};

const SCHRITTE = [
  {
    icon: "kamera",
    titel: "Foto machen",
    text: "Ein Bild vom Stand der Arbeiten. Mehrere gehen auch.",
  },
  {
    icon: "mikro",
    titel: "15 Sekunden reinsprechen",
    text: "„Heute bei Müller, 2 Mann, Fundament geschalt, Beton kam 2 Stunden zu spät, ab Mittag Regen.“",
  },
  {
    icon: "pdf",
    titel: "Fertiges PDF",
    text: "Sauber formuliert, nach Feldern sortiert, mit Wetter und Foto. Prüfen, abschließen, fertig.",
  },
];

const VORTEILE = [
  ["Zeitstempel & GPS", "Wann und wo erfasst wurde, steht automatisch drin - nicht abends im Büro nachgetragen."],
  ["Echtes Wetter", "Temperatur, Niederschlag und Wind vom Wetterdienst für den Standort - nicht geschätzt."],
  ["Nichts dazuerfunden", "Die KI sortiert und formuliert nur, was gesagt wurde. Fehlt etwas, wird nachgefragt."],
  ["Festgeschrieben", "Abgeschlossene Einträge sind nicht mehr änderbar. Korrekturen kommen als Nachtrag mit Datum dazu."],
  ["Prüfsumme", "Jeder Eintrag bekommt einen digitalen Fingerabdruck. Spätere Änderungen fallen sofort auf."],
  ["Original bleibt", "Foto und Sprachnachricht werden unverändert archiviert - falls es mal genau darauf ankommt."],
  ["Wochenbericht", "Alle Einträge eines Zeitraums als ein PDF - für Bauherrn, Architekt oder den Ordner."],
  ["Ganzes Team", "Jeder Mitarbeiter erfasst selbst - per Handy-Browser oder Telegram. Keine App-Installation."],
];

const PREISE = [
  {
    name: "Starter",
    preis: "29 €",
    zusatz: "pro Monat",
    punkte: ["1 Baustelle gleichzeitig", "40 Einträge im Monat", "PDF-Export", "Telegram-Bot"],
  },
  {
    name: "Pro",
    preis: "79 €",
    zusatz: "pro Monat",
    hervorgehoben: true,
    punkte: ["Unbegrenzt Baustellen", "Ganzes Team", "Wochenbericht für Bauherrn/Architekt", "Telegram-Bot"],
  },
  {
    name: "Pro Jahr",
    preis: "790 €",
    zusatz: "pro Jahr - 2 Monate geschenkt",
    punkte: ["Alles aus Pro", "Langzeit-Archivierung", "Bevorzugter Support"],
  },
];

const FRAGEN = [
  [
    "Ist das Bautagebuch damit „rechtssicher“?",
    "Kein Programm kann das versprechen - was vor Gericht zählt, entscheidet am Ende das Gericht. Was die App liefert: zeitnah erfasste, vollständige und nachträglich nicht unbemerkt änderbare Einträge mit Originalfotos, Uhrzeit, Standort und Wetterdaten. Genau das macht ein Bautagebuch als Beweismittel stark. Die Einträge bitte vor dem Abschließen kurz gegenlesen.",
  ],
  [
    "Muss ich eine App installieren?",
    "Nein. Es läuft im Browser auf jedem Handy - oder ganz ohne App über Telegram.",
  ],
  [
    "Was ist mit Datenschutz?",
    "Die Einträge liegen auf unserem Server. Für das Abtippen der Sprachnachricht und das Formulieren wird ein KI-Dienst genutzt - Einzelheiten stehen in der Datenschutzerklärung. Tipp: Personen nicht in den Mittelpunkt der Fotos stellen.",
  ],
  [
    "Was passiert nach den 14 Tagen?",
    "Sie entscheiden. Ohne Abo können Sie alle Einträge weiterhin als PDF herunterladen.",
  ],
];

export default function Startseite() {
  return (
    <div>
      <div className="btb-stripes h-2" aria-hidden />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--btb-accent)", color: "var(--btb-accent-fg)" }}>
            <Icon name="kran" size={20} />
          </span>
          Bautagebuch-Automat
        </span>
        <Link href="/bautagebuch/login" className="btb-btn btb-btn-ghost min-h-0 py-2 text-sm">
          Anmelden
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <p className="btb-chip btb-chip-neutral">Für Bauleiter, Dachdecker, GaLaBau, Elektro, SHK</p>
          <h1 className="text-4xl leading-tight sm:text-5xl">
            Das Bautagebuch schreibt sich <span style={{ color: "var(--btb-accent)" }}>auf der Baustelle.</span>
          </h1>
          <p className="text-lg btb-muted">
            Foto machen, 15 Sekunden reinsprechen - fertig ist der Eintrag als PDF. Mit Uhrzeit, gemessenem Wetter,
            Standort und Prüfsumme. Statt abends um 21 Uhr aus dem Gedächtnis.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/bautagebuch/start" className="btb-btn btb-btn-primary btb-btn-lg">
              14 Tage kostenlos testen <Icon name="pfeil" />
            </Link>
            <a href="/bautagebuch/beispiel.pdf" target="_blank" rel="noopener" className="btb-btn btb-btn-secondary btb-btn-lg">
              <Icon name="pdf" /> Beispiel-PDF
            </a>
          </div>
          <p className="text-sm btb-muted">Keine Zahlungsdaten nötig · Läuft im Browser und über Telegram</p>
        </div>

        {/* Chat-Vorschau */}
        <div className="mx-auto w-full max-w-sm rounded-[2rem] p-3 shadow-2xl" style={{ background: "var(--btb-asphalt)" }} aria-hidden>
          <div className="space-y-3 rounded-[1.5rem] p-4" style={{ background: "var(--btb-surface-2)" }}>
            <div className="ml-auto w-3/4 rounded-2xl rounded-br-sm p-2" style={{ background: "#d8f5c6", color: "#1b1d20" }}>
              <div className="mb-1 grid h-28 place-items-center rounded-xl" style={{ background: "#9aa3ab" }}>
                <Icon name="kamera" size={36} className="opacity-70" />
              </div>
              <span className="text-xs">📷 Foto</span>
            </div>
            <div className="ml-auto flex w-3/4 items-center gap-2 rounded-2xl rounded-br-sm px-3 py-2" style={{ background: "#d8f5c6", color: "#1b1d20" }}>
              <Icon name="mikro" size={18} />
              <span className="h-1 flex-1 rounded-full bg-black/30" />
              <span className="text-xs">0:15</span>
            </div>
            <div className="w-5/6 rounded-2xl rounded-bl-sm p-3 text-sm" style={{ background: "var(--btb-surface)", color: "var(--btb-text)" }}>
              <p className="font-bold">📝 EFH Müller, 08.10.</p>
              <p>👷 2 Mitarbeiter, 07:00-16:30</p>
              <p>🔨 Streifenfundamente geschalt und bewehrt</p>
              <p>⚠️ Betonlieferung ca. 2 Std. verspätet</p>
              <p>🌦 Leichter Regen, 8-13 °C, 4,3 mm</p>
              <div className="mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "var(--btb-surface-2)" }}>
                <Icon name="pdf" size={18} />
                <span className="text-xs font-semibold">Bautagebuch_EFH-Mueller.pdf</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section style={{ background: "var(--btb-asphalt)", color: "var(--btb-asphalt-fg)" }}>
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 md:grid-cols-3">
          {[
            ["21 Uhr, Büro, Gedächtnis", "Was war am Dienstag nochmal? Wie lange kam der Beton zu spät? Die Hälfte ist weg."],
            ["Drei Monate später", "Der Architekt fragt, warum es zwei Tage Verzug gab. Ohne Eintrag steht Aussage gegen Aussage."],
            ["Teurer Streit", "Behinderungen, Mehrkosten, Mängel - wer sie nicht zeitnah dokumentiert, bleibt oft auf ihnen sitzen."],
          ].map(([t, x]) => (
            <div key={t} className="space-y-2">
              <h2 className="text-xl" style={{ color: "var(--btb-accent)" }}>
                {t}
              </h2>
              <p className="opacity-80">{x}</p>
            </div>
          ))}
        </div>
      </section>

      {/* So geht's */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-3xl">So einfach geht&apos;s</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {SCHRITTE.map((s, i) => (
            <li key={s.titel} className="btb-card space-y-3 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: "var(--btb-accent-soft)", color: "var(--btb-accent)" }}>
                  <Icon name={s.icon} />
                </span>
                <span className="text-sm font-bold btb-muted">Schritt {i + 1}</span>
              </div>
              <h3 className="text-xl">{s.titel}</h3>
              <p className="btb-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Vorteile */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-8 text-3xl">Gebaut für den Ernstfall</h2>
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {VORTEILE.map(([t, x]) => (
            <div key={t} className="flex gap-3">
              <span className="mt-0.5 shrink-0" style={{ color: "var(--btb-ok)" }}>
                <Icon name="haken" />
              </span>
              <div>
                <h3 className="font-bold">{t}</h3>
                <p className="btb-muted">{x}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Preise */}
      <section className="py-16" style={{ background: "var(--btb-surface-2)" }}>
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-2 text-3xl">Preise</h2>
          <p className="mb-8 btb-muted">Alle Preise zzgl. MwSt. Monatlich kündbar.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {PREISE.map((p) => (
              <div
                key={p.name}
                className="btb-card flex flex-col p-6"
                style={p.hervorgehoben ? { borderColor: "var(--btb-accent)", borderWidth: 2 } : undefined}
              >
                <h3 className="text-lg">{p.name}</h3>
                <p className="mt-2 text-4xl font-bold">{p.preis}</p>
                <p className="text-sm btb-muted">{p.zusatz}</p>
                <ul className="my-5 flex-1 space-y-2 text-sm">
                  {p.punkte.map((x) => (
                    <li key={x} className="flex gap-2">
                      <span style={{ color: "var(--btb-ok)" }}>
                        <Icon name="haken" size={18} />
                      </span>
                      {x}
                    </li>
                  ))}
                </ul>
                <Link href="/bautagebuch/start" className={`btb-btn ${p.hervorgehoben ? "btb-btn-primary" : "btb-btn-secondary"}`}>
                  14 Tage testen
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="mb-6 text-3xl">Häufige Fragen</h2>
        <div className="space-y-3">
          {FRAGEN.map(([f, a]) => (
            <details key={f} className="btb-card p-4">
              <summary className="cursor-pointer font-bold">{f}</summary>
              <p className="mt-2 btb-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: "var(--btb-line)" }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm btb-muted">
          <span>Bautagebuch-Automat</span>
          <span className="flex gap-4">
            <Link href="/bautagebuch/pruefen">Eintrag prüfen</Link>
            <Link href="/bautagebuch/login">Anmelden</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
