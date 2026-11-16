import { NextResponse } from "next/server";
import { getPlaces } from "@/lib/kuehl/server-data";
import { listReports } from "@/lib/kuehl/reports";
import type { Place } from "@/lib/kuehl/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getPlaces();

  // Freigegebene Bürgermeldungen erscheinen als eigene Ebene auf der Karte.
  let reports: Place[] = [];
  try {
    reports = listReports("approved").map((r) => ({
      id: `meldung-${r.id}`,
      category: "meldung",
      name: r.category,
      kind: "Geprüfte Bürgermeldung",
      lat: r.lat,
      lon: r.lon,
      positionExact: true,
      source: "meldung",
      description: r.description || undefined,
    }));
  } catch (err) {
    console.warn("[kuehl] Meldungen nicht lesbar:", (err as Error).message);
  }

  return NextResponse.json(
    { ...data, places: [...data.places, ...reports] },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
