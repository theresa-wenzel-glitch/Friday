import Link from "next/link";
import { EintragListe } from "@/components/bautagebuch/EintragListe";
import { Icon } from "@/components/bautagebuch/Icon";
import { listBaustellen, listEintraege } from "@/lib/bautagebuch/db";
import { heuteIso } from "@/lib/bautagebuch/erfassung";
import { kiAktiv } from "@/lib/bautagebuch/ki";
import { brauchtSitzung } from "@/lib/bautagebuch/sitzung";

export const metadata = { title: "Übersicht" };

export default async function Uebersicht() {
  const { betrieb, person } = await brauchtSitzung();
  const baustellen = listBaustellen(betrieb.id, { nurAktive: true });
  const heute = heuteIso();
  const entwuerfe = listEintraege(betrieb.id, { status: "entwurf", limit: 20 });
  const letzte = listEintraege(betrieb.id, { limit: 10 });
  const offenHeute = baustellen.filter((b) => b.letzterEintrag !== heute);
  const alteEntwuerfe = entwuerfe.filter((e) => e.datum < heute);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl">Moin {person.split(" ")[0]}!</h1>
        <p className="btb-muted">
          {new Date().toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Europe/Berlin",
          })}
        </p>
      </section>

      {!kiAktiv() && (
        <p className="btb-notice btb-notice-warn text-sm">
          <strong>Demo-Modus</strong> - ohne KI-Schlüssel werden Sprachnachrichten nur gespeichert, nicht abgetippt. Wie man
          den Schlüssel einträgt, steht in der Anleitung (README-BAUTAGEBUCH.md).
        </p>
      )}

      {baustellen.length === 0 ? (
        <section className="btb-card p-6 text-center space-y-3">
          <Icon name="kran" size={40} className="mx-auto" />
          <h2 className="text-xl">Los geht&apos;s: erste Baustelle anlegen</h2>
          <p className="btb-muted">Danach reichen ein Foto und eine kurze Sprachnachricht pro Tag.</p>
          <Link href="/bautagebuch/app/baustellen" className="btb-btn btb-btn-primary">
            <Icon name="plus" /> Baustelle anlegen
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg">Heute</h2>
          <ul className="grid gap-2">
            {baustellen.map((b) => {
              const erledigt = b.letzterEintrag === heute;
              return (
                <li key={b.id}>
                  <Link
                    href={`/bautagebuch/app/neu?baustelle=${b.id}`}
                    className="btb-card flex items-center gap-3 px-4 py-3 no-underline"
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                      style={{
                        background: erledigt ? "var(--btb-ok-soft)" : "var(--btb-accent-soft)",
                        color: erledigt ? "var(--btb-ok)" : "var(--btb-accent)",
                      }}
                    >
                      <Icon name={erledigt ? "haken" : "kamera"} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{b.name}</span>
                      <span className="block text-sm btb-muted">
                        {erledigt ? "Heute erfasst - weiteren Eintrag?" : "Heute noch kein Eintrag"}
                      </span>
                    </span>
                    <Icon name="pfeil" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {offenHeute.length > 0 && (
            <Link href="/bautagebuch/app/neu" className="btb-btn btb-btn-primary btb-btn-lg w-full">
              <Icon name="kamera" /> Jetzt erfassen
            </Link>
          )}
        </section>
      )}

      {alteEntwuerfe.length > 0 && (
        <section className="btb-notice btb-notice-warn">
          <p className="font-semibold">
            {alteEntwuerfe.length === 1 ? "1 Entwurf" : `${alteEntwuerfe.length} Entwürfe`} von früheren Tagen noch nicht
            abgeschlossen.
          </p>
          <p className="text-sm">
            Abgeschlossene Einträge zählen im Streitfall mehr - bitte zeitnah prüfen und abschließen.
          </p>
        </section>
      )}

      {entwuerfe.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg">Zu prüfen</h2>
          <EintragListe eintraege={entwuerfe} />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg">Letzte Einträge</h2>
        <EintragListe eintraege={letzte} />
      </section>
    </div>
  );
}
