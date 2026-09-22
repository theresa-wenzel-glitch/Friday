import { BeitretenFormular } from "@/components/BeitretenFormular";
import { Kopfleiste } from "@/components/Kopfleiste";
import { ligaMitCode } from "@/lib/abfragen";
import { nutzerErforderlich } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

/** Ziel des QR-Codes: der Code steht schon im Formular. */
export default async function BeitrittMitCode({ params }: { params: Promise<{ code: string }> }) {
  await nutzerErforderlich();
  const { code } = await params;
  const liga = ligaMitCode(code);

  return (
    <>
      <Kopfleiste titel="Einladung" zurueck="/ligen" />
      <main className="inhalt" id="inhalt">
        {liga ? (
          <article className="tf-karte tf-karte--offen">
            <strong>{liga.name}</strong>
            <span className="klein leise">
              {liga.mitglieder} Mitglieder · {liga.wettbewerbName}
              {liga.hatPasscode ? " · zusätzlich mit Liga-Passwort geschützt" : ""}
            </span>
            {liga.beschreibung ? <p className="klein">{liga.beschreibung}</p> : null}
          </article>
        ) : (
          <p className="band band--fehler">
            <span>Zu diesem Code gibt es keine Liga. Prüfe die Schreibweise.</span>
          </p>
        )}
        <BeitretenFormular vorgabe={code.toUpperCase()} />
      </main>
    </>
  );
}
