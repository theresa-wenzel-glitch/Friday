import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { uploadsDir } from "@/lib/uploads";
import { detectImageType, MAX_UPLOAD_BYTES } from "@/lib/upload-validate";

export const dynamic = "force-dynamic";

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unbekannt";
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`upload:${clientKey(request)}`, 15, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Uploads von diesem Anschluss. Bitte später erneut versuchen." },
      { status: 429 },
    );
  }

  // Grober Vorabcheck über die angegebene Grösse, bevor der ganze Rumpf
  // eingelesen wird - ein Vielfaches der erlaubten Grösse, weil multipart/
  // form-data Kopfdaten und Grenzmarken mitzählt.
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES * 2) {
    return NextResponse.json({ error: "Die Anfrage ist zu gross." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Die Anfrage konnte nicht gelesen werden." }, { status: 400 });
  }

  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Bilddatei gefunden." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Die Datei ist leer." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Die Datei ist zu gross - erlaubt sind höchstens 8 MB." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Der behauptete MIME-Typ des Browsers wird ignoriert - massgeblich sind
  // die ersten Bytes der Datei. So lässt sich der Dateityp nicht durch einen
  // umbenannten Dateinamen oder einen falschen Content-Type vortäuschen.
  const detected = detectImageType(buffer.subarray(0, 16));
  if (!detected) {
    return NextResponse.json(
      { error: "Nur JPEG-, PNG- oder WebP-Bilder werden angenommen." },
      { status: 400 },
    );
  }

  // Der Dateiname wird komplett neu vergeben - der vom Browser gemeldete
  // Name wird nirgends übernommen. Das schliesst Pfad-Traversal und
  // kollidierende oder informationsverratende Dateinamen von vornherein aus.
  const filename = `${crypto.randomUUID()}.${detected.ext}`;
  await fs.writeFile(path.join(uploadsDir(), filename), buffer);

  return NextResponse.json({ url: `/api/uploads/${filename}` }, { status: 201 });
}
