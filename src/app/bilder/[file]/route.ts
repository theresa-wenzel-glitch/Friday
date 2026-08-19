/**
 * Liefert hochgeladene Pferdebilder aus.
 *
 * Die Dateien liegen auf dem Datenvolume und damit ausserhalb von `public/`,
 * werden also nicht automatisch bedient. Diese Route ist der einzige Weg nach
 * draussen - und prüft dabei, ob das Bild überhaupt öffentlich sein darf.
 */
import { isPhotoPublic } from "@/lib/db";
import { isLoggedIn } from "@/lib/auth";
import { isStoredPhotoName, photoMimeType } from "@/lib/photo";
import { readPhoto } from "@/lib/uploads";

export const dynamic = "force-dynamic";

function notFound(): Response {
  return new Response("Bild nicht gefunden.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;

  // Nur inhaltsadressierte Namen aus unserer eigenen Ablage. Damit ist jeder
  // Versuch, über den Pfad an andere Dateien zu kommen, hier schon zu Ende.
  if (!isStoredPhotoName(file)) return notFound();

  // Bilder aus noch nicht freigegebenen Einsendungen sieht nur die Moderation.
  const publiclyVisible = isPhotoPublic(file);
  if (!publiclyVisible && !(await isLoggedIn())) return notFound();

  const bytes = await readPhoto(file);
  if (!bytes) return notFound();

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": photoMimeType(file),
      "Content-Length": String(bytes.byteLength),
      // Der Name enthält den Hash des Inhalts: ändert sich das Bild, ändert
      // sich der Name. Freigegebene Bilder dürfen deshalb dauerhaft im Cache
      // liegen - die Vorschau der Moderation ausdrücklich nicht.
      "Cache-Control": publiclyVisible
        ? "public, max-age=31536000, immutable"
        : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
