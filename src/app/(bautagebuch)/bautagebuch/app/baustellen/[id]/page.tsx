import Link from "next/link";
import { notFound } from "next/navigation";
import { EintragListe } from "@/components/bautagebuch/EintragListe";
import { Icon } from "@/components/bautagebuch/Icon";
import { getBaustelle, listEintraege } from "@/lib/bautagebuch/db";
import { heuteIso } from "@/lib/bautagebuch/erfassung";
import { brauchtSitzung } from "@/lib/bautagebuch/sitzung";
import { baustelleAktivAction } from "../../../actions";

export const metadata = { title: "Baustelle" };

function vorTagen(iso: string, tage: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - tage);
  return d.toISOString().slice(0, 10);
}

export default async function BaustelleSeite({ params }: { params: Promise<{ id: string }> }) {
  const { betrieb } = await brauchtSitzung();
  const { id } = await params;
  const b = getBaustelle(betrieb.id, Number(id));
  if (!b) notFound();

  const eintraege = listEintraege(betrieb.id, { baustelleId: b.id });
  const heute = heuteIso();
  const abgeschlossen = eintraege.filter((e) => e.status === "abgeschlossen").length;
  const behinderungen = eintraege.filter((e) => e.daten.behinderungen.trim()).length;

  return (
    <div className="space-y-6">
      <Link href="/bautagebuch/app/baustellen" className="inline-flex items-center gap-1 text-sm btb-muted no-underline">
        <Icon name="zurueck" size={16} /> Alle Baustellen
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl">{b.name}</h1>
        <p className="btb-muted">
          {[b.adresse, b.ort].filter(Boolean).join(", ") || "Ohne Adresse"}
          {b.auftraggeber ? ` · AG: ${b.auftraggeber}` : ""}
        </p>
        {!b.aktiv && <span className="btb-chip btb-chip-neutral">abgeschlossen</span>}
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          [eintraege.length, "Einträge"],
          [abgeschlossen, "abgeschlossen"],
          [behinderungen, "mit Behinderung"],
        ].map(([zahl, label]) => (
          <div key={label} className="btb-card px-2 py-3">
            <div className="text-2xl font-bold">{zahl}</div>
            <div className="text-xs btb-muted">{label}</div>
          </div>
        ))}
      </div>

      {b.aktiv && (
        <Link href={`/bautagebuch/app/neu?baustelle=${b.id}`} className="btb-btn btb-btn-primary btb-btn-lg w-full">
          <Icon name="kamera" /> Eintrag für heute
        </Link>
      )}

      <section className="btb-card p-4 space-y-3">
        <h2 className="text-lg">Bericht als PDF</h2>
        <p className="text-sm btb-muted">
          Alle abgeschlossenen Einträge eines Zeitraums in einem Dokument - z. B. als Wochenbericht für Bauherrn oder
          Architekt.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            className="btb-btn btb-btn-secondary"
            target="_blank"
            rel="noopener"
            href={`/api/bautagebuch/baustellen/${b.id}/pdf?von=${vorTagen(heute, 6)}&bis=${heute}`}
          >
            <Icon name="pdf" /> Letzte 7 Tage
          </a>
          <a className="btb-btn btb-btn-secondary" target="_blank" rel="noopener" href={`/api/bautagebuch/baustellen/${b.id}/pdf`}>
            <Icon name="pdf" /> Komplettes Bautagebuch
          </a>
        </div>
        <form action={`/api/bautagebuch/baustellen/${b.id}/pdf`} target="_blank" className="flex flex-wrap items-end gap-2">
          <div>
            <label className="btb-label" htmlFor="von">
              Von
            </label>
            <input id="von" name="von" type="date" className="btb-field" defaultValue={vorTagen(heute, 30)} />
          </div>
          <div>
            <label className="btb-label" htmlFor="bis">
              Bis
            </label>
            <input id="bis" name="bis" type="date" className="btb-field" defaultValue={heute} />
          </div>
          <button type="submit" className="btb-btn btb-btn-secondary">
            Zeitraum als PDF
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg">Einträge</h2>
        <EintragListe eintraege={eintraege} mitBaustelle={false} />
      </section>

      <form action={baustelleAktivAction} className="text-center">
        <input type="hidden" name="id" value={b.id} />
        <input type="hidden" name="aktiv" value={b.aktiv ? "0" : "1"} />
        <button type="submit" className="btb-btn btb-btn-ghost text-sm">
          {b.aktiv ? "Baustelle als abgeschlossen markieren" : "Baustelle wieder aktivieren"}
        </button>
      </form>
    </div>
  );
}
