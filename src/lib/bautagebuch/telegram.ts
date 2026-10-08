import {
  findBetriebByCode,
  getBaustelle,
  getBetrieb,
  getEintrag,
  getTelegramChat,
  listBaustellen,
  listEintraege,
  listTelegramChats,
  merkeUpdate,
  schliesseAb,
  setTelegramBaustelle,
  setWartenderText,
  speichereMedium,
  verknuepfeTelegramChat,
  verwerfeAlteWartende,
  wartendeMedien,
  type TelegramChat,
} from "./db";
import { berechneHash, erstelleEintrag, heuteIso } from "./erfassung";
import { basisUrl, eintragPdf, pdfDateiname } from "./pdf";
import type { EintragMitBaustelle } from "./types";
import { FELDER } from "./types";
import { wetterZeile } from "./wetter";

/*
 * Telegram-Bot: Der Handwerker schickt ein Foto und eine Sprachnachricht,
 * der Bot antwortet mit dem fertigen PDF.
 *
 * Ablauf im Chat:
 *   /start ABCD-EFGH-JKMN   -> verbindet den Chat mit dem Betrieb
 *   /baustelle              -> Baustelle wählen (Knöpfe)
 *   Foto(s)                 -> werden gesammelt
 *   Sprachnachricht / Text  -> daraus wird der Eintrag, Antwort mit PDF
 *   Knopf "Abschließen"     -> Eintrag wird festgeschrieben
 */

const API = () => (process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org").replace(/\/$/, "");
const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? "";

// Fotos und Sprachnachrichten, die so lange zurückliegen, gehören nicht mehr zum nächsten Eintrag.
const SAMMEL_FENSTER_MS = 3 * 60 * 60 * 1000;

export function telegramAktiv(): boolean {
  return Boolean(TOKEN() && process.env.TELEGRAM_WEBHOOK_SECRET);
}

async function call<T = unknown>(methode: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API()}/bot${TOKEN()}/${methode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!data.ok) throw new Error(`Telegram ${methode}: ${data.description}`);
  return data.result;
}

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sende(chatId: string, text: string, extra: Record<string, unknown> = {}) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...extra,
  });
}

async function sendePdf(chatId: string, e: EintragMitBaustelle, caption: string, knoepfe: unknown) {
  const betrieb = getBetrieb(e.betriebId)!;
  const pdf = await eintragPdf(betrieb, [e]);
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("parse_mode", "HTML");
  if (knoepfe) form.append("reply_markup", JSON.stringify(knoepfe));
  form.append("document", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), pdfDateiname(e));
  const res = await fetch(`${API()}/bot${TOKEN()}/sendDocument`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) throw new Error(`Telegram sendDocument: ${data.description}`);
}

async function ladeDatei(fileId: string): Promise<Buffer> {
  const info = await call<{ file_path: string; file_size?: number }>("getFile", { file_id: fileId });
  if ((info.file_size ?? 0) > 20 * 1024 * 1024) throw new Error("Datei zu groß");
  const res = await fetch(`${API()}/file/bot${TOKEN()}/${info.file_path}`, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Download fehlgeschlagen: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/* ------------------------------------------------------------------ */
/* Typen (nur das, was wir von Telegram brauchen)                       */
/* ------------------------------------------------------------------ */

interface TgUser {
  first_name?: string;
  last_name?: string;
}

interface TgMessage {
  message_id: number;
  chat: { id: number };
  from?: TgUser;
  text?: string;
  caption?: string;
  media_group_id?: string;
  photo?: { file_id: string; width: number; height: number; file_size?: number }[];
  voice?: { file_id: string; mime_type?: string; duration?: number };
  audio?: { file_id: string; mime_type?: string };
  document?: { file_id: string; mime_type?: string };
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: {
    id: string;
    from: TgUser;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
}

function personName(u: TgUser | undefined, chat: TelegramChat | null): string {
  const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim();
  return name || chat?.person || "Telegram";
}

/* ------------------------------------------------------------------ */
/* Verarbeitung                                                         */
/* ------------------------------------------------------------------ */

const HILFE = `So geht's:
1. 📷 Foto von der Baustelle schicken (auch mehrere)
2. 🎤 Sprachnachricht dazu: Wer war da, was wurde gemacht, was lief schief?
3. Ich schicke dir das fertige Bautagebuch als PDF zurück.

/baustelle - Baustelle wechseln
/hilfe - diese Hilfe`;

export async function verarbeiteUpdate(update: TgUpdate): Promise<void> {
  // Telegram stellt bei Zeitüberschreitung erneut zu - doppelte Einträge vermeiden.
  if (!merkeUpdate(update.update_id)) return;

  try {
    if (update.callback_query) await verarbeiteKnopf(update.callback_query);
    else if (update.message) await verarbeiteNachricht(update.message);
  } catch (err) {
    console.error("[bautagebuch] Telegram-Fehler:", err);
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (chatId) {
      await sende(
        String(chatId),
        "⚠️ Da ist etwas schiefgegangen. Bitte in ein paar Minuten noch einmal versuchen.",
      ).catch(() => {});
    }
  }
}

async function verarbeiteNachricht(msg: TgMessage) {
  const chatId = String(msg.chat.id);
  const text = (msg.text ?? "").trim();

  if (text.startsWith("/start")) {
    const code = text.slice(6).trim();
    if (!code) {
      await sende(
        chatId,
        "👋 Willkommen beim Bautagebuch-Automaten!\n\nSchick mir bitte deinen Zugangscode, zum Beispiel:\n<code>/start ABCD-EFGH-JKMN</code>\n\nDen Code findest du in der App unter „Team & Telegram“.",
      );
      return;
    }
    const betrieb = findBetriebByCode(code);
    if (!betrieb) {
      await sende(chatId, "❌ Dieser Zugangscode ist unbekannt. Bitte noch einmal prüfen.");
      return;
    }
    verknuepfeTelegramChat(chatId, betrieb.id, personName(msg.from, null));
    await sende(chatId, `✅ Verbunden mit <b>${esc(betrieb.name)}</b>.\n\n${HILFE}`);
    await frageBaustelle(chatId, betrieb.id);
    return;
  }

  const chat = getTelegramChat(chatId);
  if (!chat) {
    await sende(
      chatId,
      "Dieser Chat ist noch nicht verbunden. Bitte zuerst den Zugangscode schicken:\n<code>/start ABCD-EFGH-JKMN</code>",
    );
    return;
  }

  if (text === "/baustelle" || text.startsWith("/baustelle@")) {
    await frageBaustelle(chatId, chat.betriebId);
    return;
  }
  if (text.startsWith("/hilfe") || text.startsWith("/help")) {
    await sende(chatId, HILFE);
    return;
  }
  if (text.startsWith("/")) {
    await sende(chatId, HILFE);
    return;
  }

  // Foto (oder Bild als Datei geschickt)
  const istBildDatei = msg.document?.mime_type === "image/jpeg" || msg.document?.mime_type === "image/png";
  if (msg.photo?.length || istBildDatei) {
    const fileId = msg.photo?.length
      ? [...msg.photo].sort((a, b) => b.width * b.height - a.width * a.height)[0].file_id
      : msg.document!.file_id;
    const bytes = await ladeDatei(fileId);
    speichereMedium({
      betriebId: chat.betriebId,
      art: "foto",
      mime: msg.document?.mime_type === "image/png" ? "image/png" : "image/jpeg",
      bytes,
      wartendChatId: chatId,
    });
    const caption = (msg.caption ?? "").trim();
    if (caption.length >= 10) {
      await erzeugeEintrag(chat, personName(msg.from, chat), caption);
      return;
    }
    // Bei mehreren Fotos auf einmal nur einmal antworten.
    const wartend = wartendeMedien(chatId, new Date(Date.now() - SAMMEL_FENSTER_MS).toISOString());
    if (wartend.filter((m) => m.art === "foto").length === 1 || !msg.media_group_id) {
      await sende(chatId, "📷 Foto gespeichert. Jetzt bitte eine 🎤 Sprachnachricht dazu: Wer war da, was wurde gemacht?");
    }
    return;
  }

  // Sprachnachricht
  const sprache = msg.voice ?? msg.audio;
  if (sprache) {
    const bytes = await ladeDatei(sprache.file_id);
    speichereMedium({
      betriebId: chat.betriebId,
      art: "audio",
      mime: sprache.mime_type ?? "audio/ogg",
      bytes,
      wartendChatId: chatId,
    });
    await erzeugeEintrag(chat, personName(msg.from, chat), "");
    return;
  }

  // Getippter Text statt Sprachnachricht
  if (text.length >= 10) {
    await erzeugeEintrag(chat, personName(msg.from, chat), text);
    return;
  }

  await sende(chatId, HILFE);
}

async function frageBaustelle(chatId: string, betriebId: number) {
  const baustellen = listBaustellen(betriebId, { nurAktive: true });
  if (baustellen.length === 0) {
    await sende(
      chatId,
      "Es gibt noch keine Baustelle. Bitte zuerst in der App unter „Baustellen“ eine anlegen, dann /baustelle schicken.",
    );
    return;
  }
  await sende(chatId, "🏗 Für welche Baustelle schreibst du?", {
    reply_markup: {
      inline_keyboard: baustellen.slice(0, 30).map((b) => [
        { text: b.name.slice(0, 60), callback_data: `bs:${b.id}` },
      ]),
    },
  });
}

async function erzeugeEintrag(chat: TelegramChat, person: string, text: string) {
  // Ohne gewählte Baustelle: bei genau einer automatisch, sonst nachfragen und Text merken.
  let baustelleId = chat.baustelleId;
  if (!baustelleId || !getBaustelle(chat.betriebId, baustelleId)?.aktiv) {
    const aktive = listBaustellen(chat.betriebId, { nurAktive: true });
    if (aktive.length === 1) {
      baustelleId = aktive[0].id;
      setTelegramBaustelle(chat.chatId, baustelleId);
    } else {
      if (text) setWartenderText(chat.chatId, [chat.wartenderText, text].filter(Boolean).join("\n"));
      await frageBaustelle(chat.chatId, chat.betriebId);
      return;
    }
  }
  const baustelle = getBaustelle(chat.betriebId, baustelleId)!;

  const grenze = new Date(Date.now() - SAMMEL_FENSTER_MS).toISOString();
  verwerfeAlteWartende(chat.chatId, grenze);
  const medien = wartendeMedien(chat.chatId, grenze);
  const gesamtText = [chat.wartenderText, text].filter(Boolean).join("\n");
  const audios = medien.filter((m) => m.art === "audio");
  if (!gesamtText && audios.length === 0) return;

  await call("sendChatAction", { chat_id: chat.chatId, action: "upload_document" }).catch(() => {});

  const { eintrag, hinweis } = await erstelleEintrag({
    betriebId: chat.betriebId,
    baustelle,
    person,
    quelle: "telegram",
    fotos: medien.filter((m) => m.art === "foto"),
    audios,
    text: gesamtText,
    lat: null,
    lon: null,
  });
  setWartenderText(chat.chatId, null);

  await sendePdf(chat.chatId, eintrag, zusammenfassung(eintrag, hinweis), knoepfeFuer(eintrag));
}

function zusammenfassung(e: EintragMitBaustelle, hinweis: string | null): string {
  const zeilen = [`📝 <b>Entwurf: ${esc(e.baustelleName)}</b>, ${e.datum.split("-").reverse().join(".")}`];
  const icons: Record<string, string> = {
    anwesende: "👷",
    arbeitszeit: "🕐",
    leistungen: "🔨",
    material: "🚚",
    behinderungen: "⚠️",
    anordnungen: "📌",
  };
  for (const f of FELDER) {
    const wert = e.daten[f.key];
    if (wert && icons[f.key]) zeilen.push(`${icons[f.key]} ${esc(wert)}`);
  }
  zeilen.push(`🌦 ${esc(wetterZeile(e.wetter))}`);
  if (e.daten.fehlend.length) zeilen.push(`\n❓ Nicht erwähnt: ${esc(e.daten.fehlend.join(", "))}`);
  if (hinweis) zeilen.push(`\nℹ️ ${esc(hinweis)}`);
  zeilen.push("\nPasst alles? Dann „Abschließen“ - danach ist der Eintrag nicht mehr änderbar.");
  // Telegram erlaubt höchstens 1024 Zeichen als Bildunterschrift.
  const text = zeilen.join("\n");
  return text.length > 1000 ? `${text.slice(0, 990)}…` : text;
}

function knoepfeFuer(e: EintragMitBaustelle) {
  const reihe: Record<string, string>[] = [{ text: "✅ Abschließen", callback_data: `ab:${e.id}` }];
  // Telegram akzeptiert nur öffentlich erreichbare Links als Knopf.
  if (basisUrl().startsWith("https://")) {
    reihe.push({ text: "✏️ Bearbeiten", url: `${basisUrl()}/bautagebuch/app/eintrag/${e.id}` });
  }
  return { inline_keyboard: [reihe] };
}

async function verarbeiteKnopf(q: NonNullable<TgUpdate["callback_query"]>) {
  const chatId = q.message ? String(q.message.chat.id) : null;
  const chat = chatId ? getTelegramChat(chatId) : null;
  if (!chat || !chatId) {
    await call("answerCallbackQuery", { callback_query_id: q.id, text: "Chat nicht verbunden." });
    return;
  }
  const [art, idText] = (q.data ?? "").split(":");
  const id = Number(idText);

  if (art === "bs") {
    const b = getBaustelle(chat.betriebId, id);
    if (!b) {
      await call("answerCallbackQuery", { callback_query_id: q.id, text: "Baustelle nicht gefunden." });
      return;
    }
    setTelegramBaustelle(chatId, b.id);
    await call("answerCallbackQuery", { callback_query_id: q.id, text: `Baustelle: ${b.name}` });

    // Lag schon eine Sprachnachricht oder ein Text bereit? Dann jetzt den Eintrag bauen.
    const wartend = wartendeMedien(chatId, new Date(Date.now() - SAMMEL_FENSTER_MS).toISOString());
    const aktuell = getTelegramChat(chatId)!;
    if (aktuell.wartenderText || wartend.some((m) => m.art === "audio")) {
      await erzeugeEintrag(aktuell, personName(q.from, aktuell), "");
    } else {
      await sende(chatId, `🏗 <b>${esc(b.name)}</b> gewählt. Schick mir jetzt Foto + Sprachnachricht.`);
    }
    return;
  }

  if (art === "ab") {
    const person = personName(q.from, chat);
    const fertig = schliesseAb(chat.betriebId, id, person, berechneHash);
    if (!fertig) {
      const e = getEintrag(chat.betriebId, id);
      await call("answerCallbackQuery", {
        callback_query_id: q.id,
        text: e?.status === "abgeschlossen" ? "Schon abgeschlossen." : "Eintrag nicht gefunden.",
      });
      return;
    }
    await call("answerCallbackQuery", { callback_query_id: q.id, text: "Abgeschlossen ✅" });
    if (q.message) {
      await call("editMessageReplyMarkup", {
        chat_id: chatId,
        message_id: q.message.message_id,
        reply_markup: { inline_keyboard: [] },
      }).catch(() => {});
    }
    await sendePdf(
      chatId,
      getEintrag(chat.betriebId, id)!,
      `✅ <b>Eintrag Nr. ${fertig.nr}</b> für ${esc(fertig.baustelleName)} abgeschlossen und archiviert.`,
      null,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Tägliche Erinnerung                                                  */
/* ------------------------------------------------------------------ */

/** Erinnert jeden verbundenen Chat, dessen Baustelle heute noch keinen Eintrag hat. */
export async function sendeErinnerungen(): Promise<number> {
  const heute = heuteIso();
  let gesendet = 0;
  for (const chat of listTelegramChats()) {
    if (!chat.baustelleId) continue;
    const b = getBaustelle(chat.betriebId, chat.baustelleId);
    if (!b?.aktiv) continue;
    const schon = listEintraege(chat.betriebId, { baustelleId: b.id, von: heute, bis: heute, limit: 1 });
    if (schon.length > 0) continue;
    try {
      await sende(
        chat.chatId,
        `⏰ Kurze Erinnerung: Bautagebuch für <b>${esc(b.name)}</b>.\n📷 Ein Foto + 🎤 15 Sekunden Sprachnachricht genügen.`,
      );
      gesendet++;
    } catch (err) {
      console.warn("[bautagebuch] Erinnerung nicht zugestellt:", (err as Error).message);
    }
  }
  return gesendet;
}
