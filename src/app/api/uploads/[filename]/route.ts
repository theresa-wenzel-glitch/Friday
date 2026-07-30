import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { uploadsDir } from "@/lib/uploads";
import { UPLOAD_CONTENT_TYPES, UPLOAD_FILENAME_RE } from "@/lib/upload-validate";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Nur Dateinamen im exakten Muster, das die Upload-Route selbst erzeugt
  // (Zufalls-UUID plus bekannte Endung). Das schliesst Pfad-Traversal aus,
  // ohne dass hier noch einmal Pfade zusammengebaut und geprüft werden müssen.
  if (!UPLOAD_FILENAME_RE.test(filename)) {
    return new NextResponse("Nicht gefunden.", { status: 404 });
  }

  const ext = filename.slice(filename.lastIndexOf(".") + 1);

  let data: Buffer;
  try {
    data = await fs.readFile(path.join(uploadsDir(), filename));
  } catch {
    return new NextResponse("Nicht gefunden.", { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": UPLOAD_CONTENT_TYPES[ext],
      // Der Dateiname ist eine Zufalls-UUID, die nie wiederverwendet oder
      // verändert wird - langes Zwischenspeichern ist deshalb unbedenklich.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
