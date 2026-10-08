import crypto from "node:crypto";
import { sendeErinnerungen, telegramAktiv } from "@/lib/bautagebuch/telegram";

export const runtime = "nodejs";
export const maxDuration = 120;

/*
 * Tägliche Erinnerung um 16 Uhr. Wird von außen angestoßen, z. B. von
 * cron-job.org (kostenlos):
 *
 *   POST https://deine-domain.de/api/bautagebuch/erinnerung
 *   Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !telegramAktiv()) return new Response("Nicht eingerichtet", { status: 404 });

  const erwartet = Buffer.from(`Bearer ${secret}`);
  const erhalten = Buffer.from(req.headers.get("authorization") ?? "");
  if (erwartet.length !== erhalten.length || !crypto.timingSafeEqual(erwartet, erhalten)) {
    return new Response("Nicht erlaubt", { status: 401 });
  }

  const gesendet = await sendeErinnerungen();
  return Response.json({ gesendet });
}
