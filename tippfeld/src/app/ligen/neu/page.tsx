import { Kopfleiste } from "@/components/Kopfleiste";
import { LigaFormular } from "@/components/LigaFormular";
import { wettbewerbe } from "@/lib/abfragen";
import { standardPunktesystemLesen } from "@/lib/aktionen";
import { nutzerErforderlich } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

export default async function NeueLigaSeite() {
  await nutzerErforderlich();
  const liste = wettbewerbe();
  const standard = await standardPunktesystemLesen();

  return (
    <>
      <Kopfleiste titel="Liga gründen" zurueck="/ligen" />
      <main className="inhalt" id="inhalt">
        <p className="fliess klein leise">
          Du bekommst danach einen Beitrittscode und einen QR-Code, mit dem andere in deine Liga
          kommen.
        </p>
        <LigaFormular wettbewerbe={liste} standard={standard} />
      </main>
    </>
  );
}
