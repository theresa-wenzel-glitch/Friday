import Link from "next/link";
import type { EintragMitBaustelle } from "@/lib/bautagebuch/types";
import { Icon } from "./Icon";

export function datumKurz(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function StatusChip({ e }: { e: EintragMitBaustelle }) {
  return e.status === "abgeschlossen" ? (
    <span className="btb-chip btb-chip-ok">
      <Icon name="schloss" size={12} /> Nr. {e.nr}
    </span>
  ) : (
    <span className="btb-chip btb-chip-warn">Entwurf</span>
  );
}

export function EintragListe({ eintraege, mitBaustelle = true }: { eintraege: EintragMitBaustelle[]; mitBaustelle?: boolean }) {
  if (eintraege.length === 0) {
    return <p className="btb-muted text-sm">Noch keine Einträge.</p>;
  }
  return (
    <ul className="btb-card divide-y" style={{ borderColor: "var(--btb-line)" }}>
      {eintraege.map((e) => (
        <li key={e.id} style={{ borderColor: "var(--btb-line)" }}>
          <Link href={`/bautagebuch/app/eintrag/${e.id}`} className="flex items-start gap-3 px-4 py-3 no-underline hover:opacity-90">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{datumKurz(e.datum)}</span>
                {mitBaustelle && <span className="truncate btb-muted">· {e.baustelleName}</span>}
              </div>
              <p className="mt-0.5 line-clamp-2 text-sm btb-muted">
                {e.daten.leistungen || e.transkript || "Ohne Beschreibung"}
              </p>
              {e.daten.behinderungen && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--btb-warn)" }}>
                  <Icon name="warnung" size={14} /> Behinderung dokumentiert
                </p>
              )}
            </div>
            <StatusChip e={e} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
