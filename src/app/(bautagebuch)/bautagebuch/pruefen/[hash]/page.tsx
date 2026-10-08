import crypto from "node:crypto";
import Link from "next/link";
import { Icon } from "@/components/bautagebuch/Icon";
import { getBetrieb, getEintragByHash, leseMedium, listMedien } from "@/lib/bautagebuch/db";
import { berechneHash } from "@/lib/bautagebuch/erfassung";
import { zeitDe } from "@/lib/bautagebuch/pdf";

export const metadata = { title: "Echtheit prüfen", robots: { index: false } };

/*
 * Öffentliche Prüfseite. Zeigt bewusst keine Inhalte des Eintrags - nur, ob
 * es ihn gibt und ob er seit dem Abschluss unverändert ist.
 */
export default async function PruefErgebnis({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const e = /^[0-9a-f]{64}$/.test(hash) ? getEintragByHash(hash) : null;

  let unveraendert = false;
  let betriebName = "";
  if (e) {
    const medien = listMedien(e.id);
    const dateienOk = medien.every((m) => {
      try {
        return crypto.createHash("sha256").update(leseMedium(m)).digest("hex") === m.sha256;
      } catch {
        return false;
      }
    });
    unveraendert = dateienOk && berechneHash(e, medien) === hash;
    betriebName = getBetrieb(e.betriebId)?.name ?? "";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <Link href="/bautagebuch/pruefen" className="mb-6 text-sm btb-muted no-underline">
        ← Andere Prüfsumme prüfen
      </Link>
      <div className="btb-card p-6 space-y-4">
        {!e ? (
          <>
            <h1 className="flex items-center gap-2 text-2xl" style={{ color: "var(--btb-danger)" }}>
              <Icon name="x" size={28} /> Unbekannt
            </h1>
            <p>Zu dieser Prüfsumme gibt es keinen abgeschlossenen Bautagebuch-Eintrag.</p>
          </>
        ) : unveraendert ? (
          <>
            <h1 className="flex items-center gap-2 text-2xl" style={{ color: "var(--btb-ok)" }}>
              <Icon name="haken" size={28} /> Echt und unverändert
            </h1>
            <p>
              Dieser Eintrag liegt so im Bautagebuch-Automaten vor und wurde seit dem Abschluss nicht verändert - auch die
              Originalfotos und Sprachnachrichten nicht.
            </p>
          </>
        ) : (
          <>
            <h1 className="flex items-center gap-2 text-2xl" style={{ color: "var(--btb-danger)" }}>
              <Icon name="warnung" size={28} /> Abweichung festgestellt
            </h1>
            <p>Den Eintrag gibt es, aber seine gespeicherten Daten passen nicht mehr zur Prüfsumme.</p>
          </>
        )}

        {e && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="btb-muted">Betrieb</dt>
            <dd>{betriebName}</dd>
            <dt className="btb-muted">Baustelle</dt>
            <dd>{e.baustelleName}</dd>
            <dt className="btb-muted">Eintrag</dt>
            <dd>
              Nr. {e.nr} vom {e.datum.split("-").reverse().join(".")}
            </dd>
            <dt className="btb-muted">Erfasst</dt>
            <dd>{zeitDe(e.erfasstAm)} Uhr</dd>
            <dt className="btb-muted">Abgeschlossen</dt>
            <dd>{zeitDe(e.abgeschlossenAm!)} Uhr</dd>
          </dl>
        )}
        <p className="break-all font-mono text-xs btb-muted">{hash}</p>
      </div>
    </main>
  );
}
