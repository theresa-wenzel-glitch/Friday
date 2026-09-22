import { redirect } from "next/navigation";
import { AdminAnmeldung } from "@/components/AdminFormulare";
import { Kopfleiste } from "@/components/Kopfleiste";
import { istAdmin } from "@/lib/sitzung";

export const dynamic = "force-dynamic";

export default async function AdminAnmeldeSeite() {
  if (await istAdmin()) redirect("/admin");
  return (
    <>
      <Kopfleiste titel="Adminbereich" zurueck="/profil" />
      <main className="inhalt" id="inhalt">
        <p className="fliess klein leise">
          Dieser Bereich ist getrennt von der normalen Anmeldung. Wer hier hereinkommt, kann
          Ergebnisse ändern und Ligen sperren.
        </p>
        <article className="tf-karte">
          <AdminAnmeldung />
        </article>
      </main>
    </>
  );
}
