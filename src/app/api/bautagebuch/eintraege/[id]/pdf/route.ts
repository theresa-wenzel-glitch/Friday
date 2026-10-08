import { getEintrag } from "@/lib/bautagebuch/db";
import { eintragPdf, pdfDateiname } from "@/lib/bautagebuch/pdf";
import { aktuelleSitzung } from "@/lib/bautagebuch/sitzung";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sitzung = await aktuelleSitzung();
  if (!sitzung) return new Response("Bitte anmelden.", { status: 401 });

  const { id } = await params;
  const eintrag = getEintrag(sitzung.betrieb.id, Number(id));
  if (!eintrag) return new Response("Nicht gefunden.", { status: 404 });

  const pdf = await eintragPdf(sitzung.betrieb, [eintrag]);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(pdfDateiname(eintrag))}`,
      "Cache-Control": "private, no-store",
    },
  });
}
