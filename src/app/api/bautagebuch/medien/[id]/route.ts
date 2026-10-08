import { getMedium, leseMedium } from "@/lib/bautagebuch/db";
import { aktuelleSitzung } from "@/lib/bautagebuch/sitzung";

export const runtime = "nodejs";

/** Liefert ein Originalfoto oder eine Sprachnachricht - nur an den eigenen Betrieb. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sitzung = await aktuelleSitzung();
  if (!sitzung) return new Response("Bitte anmelden.", { status: 401 });

  const { id } = await params;
  const medium = getMedium(sitzung.betrieb.id, Number(id));
  if (!medium) return new Response("Nicht gefunden.", { status: 404 });

  return new Response(new Uint8Array(leseMedium(medium)), {
    headers: {
      "Content-Type": medium.mime.split(";")[0],
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
