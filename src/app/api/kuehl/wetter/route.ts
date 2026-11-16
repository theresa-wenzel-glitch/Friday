import { NextResponse } from "next/server";
import { getWeather } from "@/lib/kuehl/server-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getWeather();
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
}
