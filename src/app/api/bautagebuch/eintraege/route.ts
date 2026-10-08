import { NextResponse } from "next/server";
import { getBaustelle, speichereMedium, verwerfeMedien } from "@/lib/bautagebuch/db";
import { erstelleEintrag } from "@/lib/bautagebuch/erfassung";
import { aktuelleSitzung } from "@/lib/bautagebuch/sitzung";
import type { Medium } from "@/lib/bautagebuch/types";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
// Spracherkennung + KI brauchen ein paar Sekunden.
export const maxDuration = 120;

const MAX_FOTOS = 6;
const MAX_FOTO_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

function istBild(b: Buffer): "image/jpeg" | "image/png" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  return null;
}

function zahl(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Neuer Eintrag aus der Web-App: Fotos + Sprachnachricht und/oder Text. */
export async function POST(req: Request) {
  const sitzung = await aktuelleSitzung();
  if (!sitzung) return NextResponse.json({ fehler: "Bitte neu anmelden." }, { status: 401 });

  const limit = rateLimit(`btb-eintrag:${sitzung.betrieb.id}`, 60, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ fehler: "Zu viele Einträge in kurzer Zeit." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ fehler: "Upload unvollständig - bitte erneut senden." }, { status: 400 });
  }

  const baustelle = getBaustelle(sitzung.betrieb.id, Number(form.get("baustelleId")));
  if (!baustelle || !baustelle.aktiv) {
    return NextResponse.json({ fehler: "Bitte eine Baustelle wählen." }, { status: 400 });
  }

  const text = String(form.get("text") ?? "").slice(0, 4000);
  const fotoDateien = form.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  const audioDatei = form.get("audio");
  const hatAudio = audioDatei instanceof File && audioDatei.size > 0;

  if (!hatAudio && text.trim().length < 3) {
    return NextResponse.json(
      { fehler: "Bitte eine Sprachnachricht aufnehmen oder kurz beschreiben, was gemacht wurde." },
      { status: 400 },
    );
  }
  if (fotoDateien.length > MAX_FOTOS) {
    return NextResponse.json({ fehler: `Höchstens ${MAX_FOTOS} Fotos pro Eintrag.` }, { status: 400 });
  }

  const gespeichert: Medium[] = [];
  try {
    const fotos: Medium[] = [];
    for (const datei of fotoDateien) {
      if (datei.size > MAX_FOTO_BYTES) throw new Error("Ein Foto ist zu groß (max. 10 MB).");
      const bytes = Buffer.from(await datei.arrayBuffer());
      const mime = istBild(bytes);
      if (!mime) throw new Error("Fotos bitte als JPG oder PNG.");
      const m = speichereMedium({ betriebId: sitzung.betrieb.id, art: "foto", mime, bytes });
      gespeichert.push(m);
      fotos.push(m);
    }

    const audios: Medium[] = [];
    if (hatAudio) {
      if (audioDatei.size > MAX_AUDIO_BYTES) throw new Error("Die Sprachnachricht ist zu lang.");
      const mime = audioDatei.type || "audio/webm";
      if (!mime.startsWith("audio/") && !mime.startsWith("video/webm")) {
        throw new Error("Unbekanntes Tonformat.");
      }
      const m = speichereMedium({
        betriebId: sitzung.betrieb.id,
        art: "audio",
        mime: mime.replace(/^video\//, "audio/"),
        bytes: Buffer.from(await audioDatei.arrayBuffer()),
      });
      gespeichert.push(m);
      audios.push(m);
    }

    const { eintrag, hinweis } = await erstelleEintrag({
      betriebId: sitzung.betrieb.id,
      baustelle,
      person: sitzung.person,
      quelle: "web",
      fotos,
      audios,
      text,
      lat: zahl(form.get("lat")),
      lon: zahl(form.get("lon")),
    });
    return NextResponse.json({ id: eintrag.id, hinweis });
  } catch (err) {
    // Halb angelegte Dateien wieder wegräumen.
    verwerfeMedien(gespeichert);
    const meldung = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[bautagebuch] Eintrag fehlgeschlagen:", err);
    return NextResponse.json({ fehler: meldung }, { status: 400 });
  }
}
