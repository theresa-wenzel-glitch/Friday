import type { Metadata } from "next";
import { SubmitForm } from "@/components/SubmitForm";

export const metadata: Metadata = {
  title: "Hengst eintragen",
  description:
    "Trage deinen Hengst kostenlos in das Verzeichnis ein - mit Abstammung, Papieren, Gentests und Kontaktadresse.",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-3xl mb-3">Hengst eintragen</h1>
      <p className="muted max-w-2xl mb-8">
        Kostenlos und für jeden offen - egal ob der Hengst in Deutschland, in
        Österreich, in den USA oder sonstwo steht. Ausgefüllt wird, was bekannt
        ist; ergänzen könnt ihr jederzeit über die Korrekturmeldung.
      </p>

      <div
        className="rounded-lg px-4 py-3 mb-10 text-sm"
        style={{
          backgroundColor: "var(--surface-muted)",
          border: "1px solid var(--line)",
        }}
      >
        <strong>Kurz vorweg:</strong> Dieses Verzeichnis ist reine Information.
        Es gibt hier keine Decktaxen, keine Preise und keine Buchung. Alles
        Geschäftliche klärt ihr direkt mit dem Besitzer.
      </div>

      <SubmitForm />
    </div>
  );
}
