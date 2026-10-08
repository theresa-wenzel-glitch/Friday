import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, degrees, rgb } from "pdf-lib";
import { leseMedium, listMedien, listNachtraege } from "./db";
import type { Betrieb, EintragMitBaustelle, Medium, Nachtrag } from "./types";
import { FELDER } from "./types";
import { wetterZeile } from "./wetter";

/*
 * Erzeugt das Bautagebuch als PDF - ohne externen Dienst, direkt auf dem
 * Server. Ein Eintrag = eine (oder mehrere) A4-Seiten. Für den Wochenbericht
 * werden mehrere Einträge hintereinander in ein Dokument geschrieben.
 */

const A4: [number, number] = [595.28, 841.89];
const RAND = 48;
const BREITE = A4[0] - 2 * RAND;

const FARBE = {
  text: rgb(0.11, 0.12, 0.13),
  grau: rgb(0.42, 0.44, 0.47),
  linie: rgb(0.82, 0.83, 0.85),
  akzent: rgb(0.93, 0.45, 0.07),
  hell: rgb(0.965, 0.965, 0.96),
  entwurf: rgb(0.85, 0.2, 0.15),
};

interface Fonts {
  normal: PDFFont;
  fett: PDFFont;
  zeichen: Set<number>;
}

/** Standardschriften kennen nur Westeuropäisch - Emojis o. Ä. werden ersetzt. */
function sauber(text: string, fonts: Fonts): string {
  let out = "";
  for (const ch of text.normalize("NFC").replace(/\r/g, "").replace(/\t/g, "  ")) {
    const cp = ch.codePointAt(0)!;
    if (ch === "\n" || fonts.zeichen.has(cp)) out += ch;
    else if (cp >= 0x2010 && cp <= 0x2015) out += "-";
  }
  return out;
}

function umbrechen(text: string, font: PDFFont, size: number, breite: number): string[] {
  const zeilen: string[] = [];
  for (const absatz of text.split("\n")) {
    let zeile = "";
    for (const wort of absatz.split(/\s+/).filter(Boolean)) {
      const versuch = zeile ? `${zeile} ${wort}` : wort;
      if (font.widthOfTextAtSize(versuch, size) <= breite) {
        zeile = versuch;
        continue;
      }
      if (zeile) zeilen.push(zeile);
      // Sehr lange Wörter hart trennen
      let rest = wort;
      while (font.widthOfTextAtSize(rest, size) > breite) {
        let n = rest.length;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > breite) n--;
        zeilen.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      zeile = rest;
    }
    zeilen.push(zeile);
  }
  return zeilen;
}

function datumDe(iso: string): string {
  const [j, m, t] = iso.slice(0, 10).split("-");
  return `${t}.${m}.${j}`;
}

function wochentag(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", {
    weekday: "long",
    timeZone: "UTC",
  });
}

export function zeitDe(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Schreibt fortlaufend nach unten und beginnt bei Bedarf eine neue Seite. */
class Schreiber {
  page!: PDFPage;
  y = 0;
  seiten: PDFPage[] = [];

  constructor(
    private doc: PDFDocument,
    private fonts: Fonts,
    private kopf: (s: Schreiber) => void,
  ) {
    this.neueSeite();
  }

  neueSeite() {
    this.page = this.doc.addPage(A4);
    this.seiten.push(this.page);
    this.y = A4[1] - RAND;
    this.kopf(this);
  }

  platz(hoehe: number) {
    if (this.y - hoehe < RAND + 40) this.neueSeite();
  }

  text(
    text: string,
    opts: { size?: number; fett?: boolean; farbe?: ReturnType<typeof rgb>; x?: number; breite?: number; abstand?: number } = {},
  ) {
    const size = opts.size ?? 10;
    const font = opts.fett ? this.fonts.fett : this.fonts.normal;
    const x = opts.x ?? RAND;
    const zeilen = umbrechen(sauber(text, this.fonts), font, size, opts.breite ?? BREITE - (x - RAND));
    const lh = size * 1.35;
    for (const zeile of zeilen) {
      this.platz(lh);
      this.page.drawText(zeile, { x, y: this.y - size, size, font, color: opts.farbe ?? FARBE.text });
      this.y -= lh;
    }
    this.y -= opts.abstand ?? 0;
  }

  linie(dicke = 0.6, farbe = FARBE.linie) {
    this.page.drawLine({
      start: { x: RAND, y: this.y },
      end: { x: A4[0] - RAND, y: this.y },
      thickness: dicke,
      color: farbe,
    });
  }
}

async function ladeFonts(doc: PDFDocument): Promise<Fonts> {
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const fett = await doc.embedFont(StandardFonts.HelveticaBold);
  return { normal, fett, zeichen: new Set(normal.getCharacterSet()) };
}

async function bettBildEin(doc: PDFDocument, m: Medium): Promise<PDFImage | null> {
  try {
    const bytes = leseMedium(m);
    const istPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    return istPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch (err) {
    console.warn("[bautagebuch] Foto nicht einbettbar:", (err as Error).message);
    return null;
  }
}

async function schreibeEintrag(
  doc: PDFDocument,
  fonts: Fonts,
  betrieb: Betrieb,
  e: EintragMitBaustelle,
  medien: Medium[],
  nachtraege: Nachtrag[],
  basisUrl: string,
) {
  const entwurf = e.status !== "abgeschlossen";

  const s = new Schreiber(doc, fonts, (w) => {
    const p = w.page;
    // Kopfzeile: Betrieb links, "Bautagebuch" rechts, orangefarbene Linie
    p.drawText(sauber(betrieb.name, fonts), {
      x: RAND,
      y: w.y - 12,
      size: 12,
      font: fonts.fett,
      color: FARBE.text,
    });
    const titel = "BAUTAGEBUCH";
    p.drawText(titel, {
      x: A4[0] - RAND - fonts.fett.widthOfTextAtSize(titel, 12),
      y: w.y - 12,
      size: 12,
      font: fonts.fett,
      color: FARBE.akzent,
    });
    w.y -= 20;
    p.drawRectangle({ x: RAND, y: w.y - 2, width: BREITE, height: 2.5, color: FARBE.akzent });
    w.y -= 16;

    if (entwurf) {
      p.drawText("ENTWURF", {
        x: 120,
        y: 300,
        size: 110,
        font: fonts.fett,
        color: FARBE.entwurf,
        opacity: 0.08,
        rotate: degrees(35),
      });
    }
  });

  // Stammdaten-Block
  const nrText = entwurf ? "Entwurf (noch ohne Nummer)" : `Nr. ${e.nr}`;
  s.text(`${e.baustelleName}`, { size: 16, fett: true });
  s.text(`${wochentag(e.datum)}, ${datumDe(e.datum)}  ·  ${nrText}`, {
    size: 10.5,
    farbe: FARBE.grau,
    abstand: 8,
  });

  const kasten = [
    ["Wetter (gemessen)", wetterZeile(e.wetter)],
    ["Erfasst", `${zeitDe(e.erfasstAm)} Uhr von ${e.erfasstVon} (${e.quelle === "telegram" ? "Telegram" : "App"})`],
  ];
  if (e.lat !== null && e.lon !== null) {
    kasten.push(["Standort bei Erfassung", `${e.lat.toFixed(5)}, ${e.lon.toFixed(5)} (GPS)`]);
  }
  // Grauer Kasten: erst Höhe ausmessen, dann Hintergrund, dann Text darauf.
  const kastenZeilen = kasten.map(([label, wert]) => ({
    label: label.toUpperCase(),
    zeilen: umbrechen(sauber(wert, fonts), fonts.normal, 9.5, BREITE - 20),
  }));
  const kastenHoehe =
    16 + kastenZeilen.reduce((h, k) => h + 7 * 1.35 + k.zeilen.length * 9.5 * 1.35 + 4, 0);
  s.page.drawRectangle({
    x: RAND,
    y: s.y - kastenHoehe,
    width: BREITE,
    height: kastenHoehe,
    color: FARBE.hell,
    borderColor: FARBE.linie,
    borderWidth: 0.6,
  });
  s.y -= 8;
  for (const k of kastenZeilen) {
    s.page.drawText(k.label, { x: RAND + 10, y: s.y - 7, size: 7, font: fonts.fett, color: FARBE.grau });
    s.y -= 7 * 1.35;
    for (const zeile of k.zeilen) {
      s.page.drawText(zeile, { x: RAND + 10, y: s.y - 9.5, size: 9.5, font: fonts.normal, color: FARBE.text });
      s.y -= 9.5 * 1.35;
    }
    s.y -= 4;
  }
  s.y -= 8;
  s.y -= 16;

  // Die Felder
  for (const feld of FELDER) {
    const wert = e.daten[feld.key]?.trim();
    s.platz(40);
    s.text(feld.label.toUpperCase(), { size: 7.5, fett: true, farbe: FARBE.akzent });
    s.text(wert || "- keine Angabe -", {
      size: 10.5,
      farbe: wert ? FARBE.text : FARBE.grau,
      abstand: 9,
    });
  }

  // Fotos
  const fotos = medien.filter((m) => m.art === "foto");
  for (const [i, foto] of fotos.entries()) {
    const bild = await bettBildEin(doc, foto);
    if (!bild) continue;
    // Passt das Foto noch einigermaßen groß auf die aktuelle Seite, dort lassen.
    const rest = s.y - (RAND + 40) - 30;
    const maxH = rest >= 220 ? Math.min(330, rest) : 330;
    const scale = Math.min(BREITE / bild.width, maxH / bild.height);
    const w = bild.width * scale;
    const h = bild.height * scale;
    s.platz(h + 30);
    s.page.drawImage(bild, { x: RAND + (BREITE - w) / 2, y: s.y - h, width: w, height: h });
    s.y -= h + 4;
    s.text(
      `Foto ${i + 1} von ${fotos.length}  ·  aufgenommen/hochgeladen ${zeitDe(foto.createdAt)} Uhr  ·  SHA-256 ${foto.sha256.slice(0, 16)}…`,
      { size: 7, farbe: FARBE.grau, abstand: 10 },
    );
  }

  // Nachträge (nach dem Abschluss hinzugefügt - der Eintrag selbst bleibt unverändert)
  if (nachtraege.length > 0) {
    s.platz(40);
    s.text("NACHTRÄGE", { size: 7.5, fett: true, farbe: FARBE.akzent });
    for (const n of nachtraege) {
      s.text(`${zeitDe(n.createdAt)} Uhr, ${n.von}:`, { size: 8, farbe: FARBE.grau });
      s.text(n.text, { size: 10, abstand: 6 });
    }
  }

  // Unterschriften
  s.platz(80);
  s.y -= 34;
  const halbe = (BREITE - 30) / 2;
  for (const [i, label] of ["Auftragnehmer / Bauleitung AN", "Auftraggeber / Bauleitung AG"].entries()) {
    const x = RAND + i * (halbe + 30);
    s.page.drawLine({ start: { x, y: s.y }, end: { x: x + halbe, y: s.y }, thickness: 0.6, color: FARBE.text });
    s.page.drawText(label, { x, y: s.y - 10, size: 7.5, font: fonts.normal, color: FARBE.grau });
    s.page.drawText("Datum, Unterschrift", { x, y: s.y - 19, size: 6.5, font: fonts.normal, color: FARBE.grau });
  }
  s.y -= 30;

  // Fußzeile auf jeder Seite: Echtheitsnachweis
  for (const [i, page] of s.seiten.entries()) {
    const zeilen = entwurf
      ? ["ENTWURF - noch nicht abgeschlossen. Inhalte können sich ändern."]
      : [
          `Abgeschlossen am ${zeitDe(e.abgeschlossenAm!)} Uhr von ${e.abgeschlossenVon}. Danach nicht mehr änderbar, nur Nachträge.`,
          `Prüfsumme (SHA-256): ${e.hash}`,
          `Echtheit prüfen: ${basisUrl}/bautagebuch/pruefen/${e.hash}`,
        ];
    let y = RAND - 6 + zeilen.length * 8.5;
    page.drawLine({
      start: { x: RAND, y: y + 6 },
      end: { x: A4[0] - RAND, y: y + 6 },
      thickness: 0.5,
      color: FARBE.linie,
    });
    for (const zeile of zeilen) {
      page.drawText(sauber(zeile, fonts), {
        x: RAND,
        y,
        size: 6.5,
        font: fonts.normal,
        color: entwurf ? FARBE.entwurf : FARBE.grau,
      });
      y -= 8.5;
    }
    const seite = `Seite ${i + 1}/${s.seiten.length}`;
    page.drawText(seite, {
      x: A4[0] - RAND - fonts.normal.widthOfTextAtSize(seite, 6.5),
      y: RAND - 6 + zeilen.length * 8.5,
      size: 6.5,
      font: fonts.normal,
      color: FARBE.grau,
    });
  }
}

export function basisUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function eintragPdf(
  betrieb: Betrieb,
  eintraege: EintragMitBaustelle[],
  anhaenge: (id: number) => { medien: Medium[]; nachtraege: Nachtrag[] } = (id) => ({
    medien: listMedien(id),
    nachtraege: listNachtraege(id),
  }),
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts = await ladeFonts(doc);
  const titel =
    eintraege.length === 1
      ? `Bautagebuch ${eintraege[0].baustelleName} ${datumDe(eintraege[0].datum)}`
      : `Bautagebuch ${eintraege[0]?.baustelleName ?? ""}`;
  doc.setTitle(sauber(titel, fonts));
  doc.setAuthor(sauber(betrieb.name, fonts));
  doc.setCreator("Bautagebuch-Automat");
  doc.setLanguage("de-DE");

  if (eintraege.length === 0) {
    const page = doc.addPage(A4);
    page.drawText("Keine Einträge im gewählten Zeitraum.", {
      x: RAND,
      y: A4[1] - RAND - 20,
      size: 12,
      font: fonts.normal,
    });
  }

  // Ältester Eintrag zuerst - so liest man ein Bautagebuch.
  const sortiert = [...eintraege].sort((a, b) =>
    a.datum === b.datum ? a.erfasstAm.localeCompare(b.erfasstAm) : a.datum.localeCompare(b.datum),
  );
  for (const e of sortiert) {
    const { medien, nachtraege } = anhaenge(e.id);
    await schreibeEintrag(doc, fonts, betrieb, e, medien, nachtraege, basisUrl());
  }
  return doc.save();
}

export function pdfDateiname(e: EintragMitBaustelle): string {
  const name = e.baustelleName.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return `Bautagebuch_${name}_${e.datum}${e.status === "abgeschlossen" ? `_Nr${e.nr}` : "_Entwurf"}.pdf`;
}
