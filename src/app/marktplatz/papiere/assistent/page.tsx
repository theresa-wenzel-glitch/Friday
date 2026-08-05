import type { Metadata } from "next";
import { listHorseNames } from "@/lib/db";
import { FoalPaperWizard } from "@/components/marktplatz/FoalPaperWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fohlen-Papier-Assistent",
};

export default function FoalPaperAssistantPage() {
  const horseNames = listHorseNames();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl mb-2 no-print">Fohlen-Papier-Assistent</h1>
      <p className="muted mb-8 no-print">
        Sammelt die üblichen Angaben für eine Fohlenregistrierung. Am Ende
        gibt es eine druckbare Zusammenfassung - das ist keine offizielle
        Einreichung, sondern eine Ausfüllhilfe für das jeweilige Formular bei
        AQHA oder APHA.
      </p>

      <FoalPaperWizard horseNames={horseNames} />
    </div>
  );
}
