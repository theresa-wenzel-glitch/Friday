import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Liefert ein hochgeladenes Foto aus der Datenbank aus. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });

  if (!photo?.data || !photo.mimeType) {
    return new NextResponse("Nicht gefunden", { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
