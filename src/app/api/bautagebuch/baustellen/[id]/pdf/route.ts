import { getBaustelle, listEintraege } from "@/lib/bautagebuch/db";
import { eintragPdf } from "@/lib/bautagebuch/pdf";
import { aktuelleSitzung } from "@/lib/bautagebuch/sitzung";

export const runtime = "nodejs";

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Sammel-PDF einer Baustelle für einen Zeitraum - z. B. der Wochenbericht an den Bauherrn. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sitzung = await aktuelleSitzung();
  if (!sitzung) return new Response("Bitte anmelden.", { status: 401 });

  const { id } = await params;
  const baustelle = getBaustelle(sitzung.betrieb.id, Number(id));
  if (!baustelle) return new Response("Nicht gefunden.", { status: 404 });

  const url = new URL(req.url);
  const von = url.searchParams.get("von") ?? "";
  const bis = url.searchParams.get("bis") ?? "";
  const mitEntwuerfen = url.searchParams.get("entwuerfe") === "1";

  const eintraege = listEintraege(sitzung.betrieb.id, {
    baustelleId: baustelle.id,
    von: DATUM.test(von) ? von : undefined,
    bis: DATUM.test(bis) ? bis : undefined,
    status: mitEntwuerfen ? undefined : "abgeschlossen",
    limit: 400,
  });

  const pdf = await eintragPdf(sitzung.betrieb, eintraege);
  const name = baustelle.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const zeitraum = [von, bis].filter((d) => DATUM.test(d)).join("_bis_") || "gesamt";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(`Bautagebuch_${name}_${zeitraum}.pdf`)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
