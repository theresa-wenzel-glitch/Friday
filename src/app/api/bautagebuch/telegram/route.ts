import crypto from "node:crypto";
import { after } from "next/server";
import { telegramAktiv, verarbeiteUpdate, type TgUpdate } from "@/lib/bautagebuch/telegram";

export const runtime = "nodejs";
export const maxDuration = 120;

/*
 * Webhook für den Telegram-Bot. Telegram schickt jede neue Nachricht hierher.
 * Wir antworten sofort mit "OK" und arbeiten danach in Ruhe weiter - sonst
 * würde Telegram bei langsamer KI denken, wir hätten nichts bekommen.
 */
export async function POST(req: Request) {
  if (!telegramAktiv()) return new Response("Telegram nicht eingerichtet", { status: 404 });

  // Nur Telegram kennt dieses Geheimnis (wird beim Einrichten des Webhooks übergeben).
  const erwartet = Buffer.from(process.env.TELEGRAM_WEBHOOK_SECRET ?? "");
  const erhalten = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  if (erwartet.length !== erhalten.length || !crypto.timingSafeEqual(erwartet, erhalten)) {
    return new Response("Nicht erlaubt", { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return new Response("Ungültig", { status: 400 });
  }
  if (typeof update.update_id !== "number") return new Response("Ungültig", { status: 400 });

  after(() => verarbeiteUpdate(update));
  return new Response("OK");
}
