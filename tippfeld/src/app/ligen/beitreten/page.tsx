import { BeitretenFormular } from "@/components/BeitretenFormular";
import { Kopfleiste } from "@/components/Kopfleiste";
import { nutzerErforderlich } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

export default async function BeitretenSeite() {
  await nutzerErforderlich();
  return (
    <>
      <Kopfleiste titel="Liga beitreten" zurueck="/ligen" />
      <main className="inhalt" id="inhalt">
        <p className="fliess klein leise">
          Gib den Code ein, den du bekommen hast, oder scanne den QR-Code der Einladung.
        </p>
        <BeitretenFormular />
      </main>
    </>
  );
}
