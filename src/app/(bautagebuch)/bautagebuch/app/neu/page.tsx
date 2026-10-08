import { Erfassung } from "@/components/bautagebuch/Erfassung";
import { listBaustellen } from "@/lib/bautagebuch/db";
import { kiAktiv } from "@/lib/bautagebuch/ki";
import { brauchtSitzung } from "@/lib/bautagebuch/sitzung";

export const metadata = { title: "Neuer Eintrag" };

export default async function NeuerEintrag({ searchParams }: { searchParams: Promise<{ baustelle?: string }> }) {
  const { betrieb } = await brauchtSitzung();
  const { baustelle } = await searchParams;
  const baustellen = listBaustellen(betrieb.id, { nurAktive: true }).map((b) => ({ id: b.id, name: b.name }));
  const vorauswahl = baustellen.find((b) => b.id === Number(baustelle))?.id ?? null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Neuer Eintrag</h1>
      <Erfassung baustellen={baustellen} vorauswahl={vorauswahl} kiAktiv={kiAktiv()} />
    </div>
  );
}
