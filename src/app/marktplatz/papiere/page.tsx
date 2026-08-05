import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Papierservice",
  description:
    "Ausfüllhilfe für Fohlenpapiere bei AQHA und APHA - keine offizielle Verbandspartnerschaft, keine automatische Einreichung.",
};

export default function PapiereePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl mb-2">Papierservice</h1>
      <p className="muted mb-8">
        Hilfe beim Zusammentragen der Angaben für die Fohlenregistrierung -
        keine offizielle Antragstellung.
      </p>

      <div
        className="rounded-lg px-4 py-3 text-sm mb-8"
        style={{ backgroundColor: "#fff6e0", color: "#7a5300" }}
      >
        <strong>Wichtig:</strong> Diese Seite ist eine Ausfüllhilfe, kein
        offizieller Antrag. Es besteht keine Partnerschaft mit AQHA oder APHA.
        Die eigentliche Registrierung läuft ausschliesslich direkt über den
        jeweiligen Zuchtverband - AQHA und APHA bieten dafür keine öffentliche
        Schnittstelle an, über die sich das automatisieren liesse.
      </div>

      <section className="mb-10">
        <h2 className="text-xl mb-3">Offizielle Formulare und Infoseiten</h2>
        <ul className="space-y-3">
          <li className="surface rounded-xl p-4">
            <p className="font-semibold mb-1">AQHA (American Quarter Horse Association)</p>
            <p className="text-sm muted mb-2">
              Voraussetzung: Vater und Mutter sind bei der AQHA registriert
              (oder als Thoroughbred anerkannt) und DNA-typisiert, ein
              Deckbericht liegt vor.
            </p>
            <a
              href="https://www.aqha.com/registration"
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm underline"
            >
              aqha.com/registration
            </a>
            {" · "}
            <a
              href="https://helpcenter.aqha.com/knowledge/-how-do-i-register-a-foal-with-aqha"
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm underline"
            >
              Anleitung im AQHA-Helpcenter
            </a>
          </li>

          <li className="surface rounded-xl p-4">
            <p className="font-semibold mb-1">APHA (American Paint Horse Association)</p>
            <p className="text-sm muted mb-2">
              Mindestens ein Elternteil muss bei der APHA registriert sein;
              Abstammungsprüfung wird automatisch veranlasst.
            </p>
            <a
              href="https://apha.com/registration/"
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm underline"
            >
              apha.com/registration
            </a>
            {" · "}
            <a
              href="https://apha.com/registration/registration-guides/"
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm underline"
            >
              Registrierungsanleitungen
            </a>
          </li>
        </ul>
      </section>

      <Link href="/marktplatz/papiere/assistent" className="btn btn-primary no-underline">
        Zum Fohlen-Papier-Assistenten
      </Link>
      <p className="text-sm muted mt-3">
        Der Assistent sammelt die üblichen Angaben und erzeugt eine
        Zusammenfassung zum Ausdrucken - zum Übertragen in das jeweilige
        offizielle Formular.
      </p>
    </div>
  );
}
