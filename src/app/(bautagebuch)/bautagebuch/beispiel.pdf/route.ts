import { eintragPdf } from "@/lib/bautagebuch/pdf";
import type { Betrieb, EintragMitBaustelle } from "@/lib/bautagebuch/types";

export const runtime = "nodejs";

/*
 * Muster-PDF mit erfundenen Daten - zum Zeigen auf der Startseite und für
 * Interessenten ("So sieht das dann aus").
 */
export async function GET() {
  const betrieb: Betrieb = {
    id: 0,
    name: "Musterbau GmbH (Beispiel)",
    inhaber: "Max Muster",
    email: null,
    zugangscode: "",
    sitzungVersion: 0,
    createdAt: "2026-01-01T00:00:00Z",
  };
  const eintrag: EintragMitBaustelle = {
    id: 0,
    betriebId: 0,
    baustelleId: 0,
    baustelleName: "EFH Müller, Lindenweg 12, Freiburg",
    nr: 14,
    datum: "2026-10-08",
    erfasstAm: "2026-10-08T14:12:00Z",
    erfasstVon: "Tom Becker",
    quelle: "telegram",
    transkript:
      "Heute bei Müller, zwei Mann, sieben bis halb fünf. Fundament geschalt und bewehrt. Beton kam zwei Stunden zu spät, wir haben gewartet. Ab Mittag Regen.",
    daten: {
      anwesende: "2 Mitarbeiter (Musterbau GmbH)",
      arbeitszeit: "07:00 bis 16:30 Uhr",
      leistungen:
        "Streifenfundamente Achse A-D geschalt. Bewehrung der Streifenfundamente eingebaut und ausgerichtet.",
      material: "Betonlieferung C25/30 (Lieferwerk lt. Lieferschein).",
      behinderungen:
        "Betonlieferung ca. 2 Stunden verspätet (geplant 9:00 Uhr, Ankunft ca. 11:00 Uhr). Wartezeit für 2 Mitarbeiter.",
      anordnungen: "",
      wetterNotiz: "Ab Mittag Regen.",
      fotoBeschreibung: "",
      fehlend: [],
    },
    wetter: {
      beschreibung: "Leichter Regen",
      temperatur: 11.4,
      tempMin: 8.2,
      tempMax: 13.1,
      niederschlagMm: 4.3,
      windKmh: 18,
      quelle: "Open-Meteo.com",
      abgerufenAm: "2026-10-08T14:12:03Z",
    },
    lat: 47.99591,
    lon: 7.84211,
    kiModus: "ki",
    status: "abgeschlossen",
    abgeschlossenAm: "2026-10-08T14:15:40Z",
    abgeschlossenVon: "Tom Becker",
    hash: "beispiel-ohne-gueltige-pruefsumme",
    vorherigerHash: null,
    createdAt: "2026-10-08T14:12:00Z",
    updatedAt: "2026-10-08T14:15:40Z",
  };

  const pdf = await eintragPdf(betrieb, [eintrag], () => ({ medien: [], nachtraege: [] }));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Bautagebuch_Beispiel.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
