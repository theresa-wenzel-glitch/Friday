import { NextResponse } from "next/server";
import { insertReport, validateReport } from "@/lib/kuehl/reports";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Die IP dient nur der Missbrauchsbremse im Arbeitsspeicher und wird nicht gespeichert.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
  const limit = rateLimit(`kuehl-meldung:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Du hast in der letzten Stunde schon mehrere Meldungen geschickt. Bitte versuch es später noch einmal." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Die Meldung konnte nicht gelesen werden." }, { status: 400 });
  }

  const result = validateReport((body ?? {}) as Record<string, unknown>);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const report = insertReport(result.value);
  return NextResponse.json({ id: report.id, status: report.status }, { status: 201 });
}
