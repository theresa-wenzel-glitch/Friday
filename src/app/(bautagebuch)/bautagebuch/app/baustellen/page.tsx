import Link from "next/link";
import { datumKurz } from "@/components/bautagebuch/EintragListe";
import { BaustelleFormular } from "@/components/bautagebuch/Formulare";
import { Icon } from "@/components/bautagebuch/Icon";
import { listBaustellen } from "@/lib/bautagebuch/db";
import { brauchtSitzung } from "@/lib/bautagebuch/sitzung";

export const metadata = { title: "Baustellen" };

export default async function Baustellen() {
  const { betrieb } = await brauchtSitzung();
  const baustellen = listBaustellen(betrieb.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Baustellen</h1>

      {baustellen.length > 0 && (
        <ul className="grid gap-2">
          {baustellen.map((b) => (
            <li key={b.id}>
              <Link
                href={`/bautagebuch/app/baustellen/${b.id}`}
                className="btb-card flex items-center gap-3 px-4 py-3 no-underline"
                style={{ opacity: b.aktiv ? 1 : 0.6 }}
              >
                <Icon name="kran" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{b.name}</span>
                  <span className="block text-sm btb-muted">
                    {b.anzahl} {b.anzahl === 1 ? "Eintrag" : "Einträge"}
                    {b.letzterEintrag ? ` · zuletzt ${datumKurz(b.letzterEintrag)}` : ""}
                    {!b.aktiv && " · abgeschlossen"}
                  </span>
                </span>
                <Icon name="pfeil" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="btb-card p-4 space-y-3">
        <h2 className="text-lg">Neue Baustelle</h2>
        <BaustelleFormular />
      </section>
    </div>
  );
}
