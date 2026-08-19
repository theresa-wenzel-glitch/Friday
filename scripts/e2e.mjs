/**
 * Durchgehender Test des wichtigsten Ablaufs:
 * eintragen -> Moderation -> freigeben -> Stammbaum verbindet sich -> Kontakt.
 *
 * Voraussetzung: Server läuft unter BASE (Standard http://localhost:3111)
 * mit den Werten aus .env.local.
 *
 *   node scripts/e2e.mjs
 */
import { chromium } from "playwright";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const BASE = process.env.BASE ?? "http://localhost:3111";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-passwort-lokal";
const NAME = `Testhengst ${Date.now()}`;
const EMAIL = "besitzer@example.com";

/**
 * Eigene Absenderkennung je Lauf. Die Ratenbegrenzung der App zählt pro
 * Anschluss; ohne das wäre der Test nur einmal pro Serverstart durchführbar.
 */
const CLIENT_IP = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;

/* --- Testbild erzeugen ------------------------------------------------- */

function pngChunk(type, data) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body), 0);
  return Buffer.concat([head, body, crc]);
}

/**
 * Baut ein gültiges PNG mit zufälligen Pixeln. Zufällig deshalb, weil die App
 * Bilder unter ihrem Inhalts-Hash ablegt: so bekommt jeder Lauf eine eigene
 * Datei und sieht keine Reste des vorherigen Laufs.
 */
function makePng(width, height) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0; // Filter: keiner
    crypto.randomFillSync(raw, row + 1, width * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 2; // Farbtyp RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wh-e2e-"));
const PHOTO = path.join(tmpDir, "hengst.png");
const PHOTO_BYTES = makePng(120, 90);
fs.writeFileSync(PHOTO, PHOTO_BYTES);

// So heisst die Datei nach dem Speichern - dieselbe Regel wie in uploads.ts.
const PHOTO_FILE = `${crypto
  .createHash("sha256")
  .update(PHOTO_BYTES)
  .digest("hex")
  .slice(0, 40)}.png`;

// Zweites, anderes Bild - für den Test, dass beim Löschen auch die Datei geht.
const PHOTO_B = path.join(tmpDir, "zweiter-hengst.png");
const PHOTO_B_BYTES = makePng(100, 70);
fs.writeFileSync(PHOTO_B, PHOTO_B_BYTES);
const PHOTO_B_FILE = `${crypto
  .createHash("sha256")
  .update(PHOTO_B_BYTES)
  .digest("hex")
  .slice(0, 40)}.png`;

// Eine Textdatei mit Bildendung: muss an der Inhaltsprüfung scheitern.
// Bewusst über der Mindestgrösse, damit sie tatsächlich bis zur Prüfung der
// Magic Bytes kommt und nicht schon als zu klein abgewiesen wird.
const FAKE_PHOTO = path.join(tmpDir, "kein-bild.jpg");
fs.writeFileSync(
  FAKE_PHOTO,
  `<html><script>alert(1)</script></html>\n${"<!-- Fülltext -->".repeat(80)}`,
);

const results = [];
function check(label, condition, detail = "") {
  results.push({ label, ok: Boolean(condition), detail });
  console.log(`${condition ? "OK  " : "FEHL"} ${label}${detail ? ` - ${detail}` : ""}`);
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const context = await browser.newContext({
  extraHTTPHeaders: { "x-forwarded-for": CLIENT_IP },
});
const page = await context.newPage();
page.on("pageerror", (e) => console.log("  [Browser-Fehler]", e.message));

try {
  /* 1 - Formular absenden ------------------------------------------------ */
  await page.goto(`${BASE}/eintragen`, { waitUntil: "networkidle" });

  await page.fill("#name", NAME);
  await page.fill("#yearOfBirth", "2015");
  await page.fill("#color", "Buckskin");
  // Vater existiert bereits im Bestand - der Stammbaum muss sich verbinden.
  await page.fill("#sireName", "Metallic Cat");
  await page.fill("#damName", "Eine Testmutter");
  await page.fill("#country", "de");
  await page.fill("#studName", "Testhof");
  await page.fill("#contactEmail", EMAIL);
  await page.fill("#ownerName", "Test Besitzerin");
  await page.fill("#genetics-HYPP", "N/N");
  await page.check('input[name="disciplines"][value="Reining"]');
  await page.setInputFiles("#photo", PHOTO);
  await page.check('input[name="photoRights"]');
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');

  await page.waitForURL("**/eintragen/danke", { timeout: 15000 });
  check("Einsendung führt zur Danke-Seite", true);

  /* 2 - Eintrag darf noch NICHT öffentlich sein -------------------------- */
  await page.goto(`${BASE}/hengste?q=${encodeURIComponent(NAME)}`);
  const publicBefore = await page.locator(`text=${NAME}`).count();
  check("Neuer Eintrag ist vor Freigabe unsichtbar", publicBefore === 0);

  // Das Bild darf die Moderation nicht aushebeln: wer die Adresse errät, darf
  // es vor der Freigabe trotzdem nicht abrufen.
  const anon = await browser.newContext();
  const beforeApproval = await anon.request.get(`${BASE}/bilder/${PHOTO_FILE}`);
  check(
    "Bild ist vor der Freigabe nicht abrufbar",
    beforeApproval.status() === 404,
    `HTTP ${beforeApproval.status()}`,
  );

  /* 3 - Validierung: Pflichtfelder --------------------------------------- */
  await page.goto(`${BASE}/eintragen`, { waitUntil: "networkidle" });
  await page.fill("#name", "X");
  await page.fill("#contactEmail", "keine-echte-adresse");
  await page.fill("#yearOfBirth", "1200");
  await page.evaluate(() => {
    // HTML-Validierung ausschalten, damit die serverseitige Prüfung greift.
    document.querySelector("form")?.setAttribute("novalidate", "");
  });
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  const bodyText = await page.textContent("body");
  check(
    "Serverseitige Validierung meldet Fehler",
    bodyText.includes("mindestens 2 Zeichen") &&
      bodyText.includes("Geburtsjahr zwischen"),
  );

  /* 3b - Bild ohne Rechtebestätigung ------------------------------------- */
  await page.goto(`${BASE}/eintragen`, { waitUntil: "networkidle" });
  await page.fill("#name", `${NAME} ohne Rechte`);
  await page.fill("#contactEmail", EMAIL);
  await page.setInputFiles("#photo", PHOTO);
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  check(
    "Bild ohne Rechtebestätigung wird abgelehnt",
    (await page.textContent("body")).includes("Bitte bestätige, dass du das Bild"),
  );

  /* 3c - Datei, die nur so heisst wie ein Bild --------------------------- */
  await page.goto(`${BASE}/eintragen`, { waitUntil: "networkidle" });
  await page.fill("#name", `${NAME} falsches Format`);
  await page.fill("#contactEmail", EMAIL);
  await page.setInputFiles("#photo", FAKE_PHOTO);
  await page.check('input[name="photoRights"]');
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  check(
    "Datei mit .jpg-Endung, aber ohne Bildinhalt wird abgelehnt",
    (await page.textContent("body")).includes("Nur JPEG, PNG und WebP"),
    "Prüfung an den Magic Bytes, nicht am Dateinamen",
  );

  /* 4 - Anmelden an der Moderation --------------------------------------- */
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.fill("#password", "falsches-passwort");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
  check(
    "Falsches Passwort wird abgelehnt",
    (await page.textContent("body")).includes("Passwort stimmt nicht"),
  );

  await page.fill("#password", ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  check(
    "Anmeldung mit richtigem Passwort",
    (await page.textContent("body")).includes("Neue Einsendungen"),
  );

  /* 5 - Freigeben --------------------------------------------------------- */
  const card = page.locator("li", { hasText: NAME }).first();
  check("Einsendung erscheint in der Moderation", (await card.count()) > 0);

  // Die Moderation muss das Bild sehen können, bevor sie darüber entscheidet.
  const preview = card.locator(`img[src="/bilder/${PHOTO_FILE}"]`);
  check("Moderation sieht das eingesandte Bild", (await preview.count()) > 0);

  const previewOk = await page.request.get(`${BASE}/bilder/${PHOTO_FILE}`);
  check(
    "Angemeldete Moderation darf das Bild abrufen",
    previewOk.status() === 200,
    `HTTP ${previewOk.status()}`,
  );

  await card.locator('button:has-text("Freigeben")').click();
  await page.waitForTimeout(2000);

  /* 6 - Jetzt öffentlich + Stammbaum verbunden ---------------------------- */
  await page.goto(`${BASE}/hengste?q=${encodeURIComponent(NAME)}`, {
    waitUntil: "networkidle",
  });
  check("Eintrag ist nach Freigabe sichtbar", (await page.locator(`text=${NAME}`).count()) > 0);

  // Auf die Navigation warten, nicht auf "networkidle" - letzteres kann noch
  // auf der alten Seite auslösen und liefert dann den falschen Seiteninhalt.
  await page.locator("a", { hasText: NAME }).first().click();
  await page.waitForURL(/\/hengste\/testhengst/, { timeout: 15000 });
  const detail = await page.textContent("body");

  check("Detailseite zeigt den Vater", detail.includes("Metallic Cat"));
  check(
    "Stammbaum reicht über den Vater hinaus",
    detail.includes("High Brow Cat") && detail.includes("High Brow Hickory"),
    "Grossvater und Urgrossvater aus dem Bestand",
  );
  check("Gentest wird angezeigt", detail.includes("HYPP"));
  check("Hinweis auf ungeprüfte Angaben", detail.includes("noch nicht geprüft"));

  /* 6b - Das Bild ist jetzt öffentlich ----------------------------------- */
  check(
    "Detailseite bindet das hochgeladene Bild ein",
    (await page.locator(`img[src="/bilder/${PHOTO_FILE}"]`).count()) > 0,
  );

  const served = await anon.request.get(`${BASE}/bilder/${PHOTO_FILE}`);
  check(
    "Bild wird nach der Freigabe öffentlich ausgeliefert",
    served.status() === 200,
    `HTTP ${served.status()}`,
  );
  check(
    "Bild kommt als PNG heraus",
    served.headers()["content-type"] === "image/png",
    served.headers()["content-type"],
  );
  check(
    "Ausgeliefertes Bild ist byteweise das hochgeladene",
    Buffer.compare(await served.body(), PHOTO_BYTES) === 0,
  );

  // Ein erfundener Name darf nichts aus dem Dateisystem herausgeben.
  const traversal = await anon.request.get(
    `${BASE}/bilder/${encodeURIComponent("../westernhengste.db")}`,
  );
  check(
    "Ausbruch aus dem Bildverzeichnis wird abgewiesen",
    traversal.status() === 404,
    `HTTP ${traversal.status()}`,
  );

  /* 7 - E-Mail erst auf Klick -------------------------------------------- */
  check("E-Mail steht nicht im HTML", !(await page.content()).includes(EMAIL));
  await page.click('button:has-text("E-Mail-Adresse anzeigen")');
  await page.waitForTimeout(1500);
  check(
    "E-Mail erscheint nach Klick",
    (await page.textContent("body")).includes(EMAIL),
  );

  /* 8 - Verlinkung im Stammbaum ------------------------------------------ */
  const horseUrl = page.url();
  await page.click('a[href="/hengste/metallic-cat"]');
  await page.waitForURL("**/hengste/metallic-cat", { timeout: 15000 });
  check(
    "Klick im Stammbaum öffnet den Vorfahren",
    page.url().includes("/hengste/metallic-cat"),
  );
  check(
    "Vorfahr listet den neuen Nachkommen",
    (await page.textContent("body")).includes(NAME),
    "Rückverweis über Nachkommen im Verzeichnis",
  );

  /* 9 - Korrekturmeldung -------------------------------------------------- */
  await page.goto(horseUrl, { waitUntil: "networkidle" });
  await page.click("text=Korrektur melden");
  await page.fill("#correction-message", "Das Geburtsjahr stimmt nicht, es ist 2016.");
  await page.click('button:has-text("Korrektur absenden")');
  await page.waitForTimeout(1500);
  check(
    "Korrektur wird angenommen",
    (await page.textContent("body")).includes("Meldung ist angekommen"),
  );

  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  check(
    "Korrektur landet in der Moderation",
    (await page.textContent("body")).includes("Das Geburtsjahr stimmt nicht"),
  );

  /* 10 - Löschen entfernt auch die Bilddatei ----------------------------- */
  // Eigene Absenderkennung, damit dieser Eintrag nicht gegen die
  // Ratenbegrenzung des ersten Absenders zählt.
  const second = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": "203.0.113.7" },
  });
  const secondPage = await second.newPage();
  const NAME_B = `${NAME} zum Löschen`;

  await secondPage.goto(`${BASE}/eintragen`, { waitUntil: "networkidle" });
  await secondPage.fill("#name", NAME_B);
  await secondPage.fill("#contactEmail", EMAIL);
  await secondPage.setInputFiles("#photo", PHOTO_B);
  await secondPage.check('input[name="photoRights"]');
  await secondPage.check('input[name="consent"]');
  await secondPage.click('button[type="submit"]');
  await secondPage.waitForURL("**/eintragen/danke", { timeout: 15000 });
  await second.close();

  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const storedBefore = await page.request.get(`${BASE}/bilder/${PHOTO_B_FILE}`);
  check(
    "Bild der zweiten Einsendung liegt auf dem Server",
    storedBefore.status() === 200,
    `HTTP ${storedBefore.status()}`,
  );

  const cardB = page.locator("li", { hasText: NAME_B }).first();
  await cardB.locator('button:has-text("Endgültig löschen")').click();
  await page.waitForTimeout(2000);

  // Als angemeldete Moderation gilt die Freigabe-Sperre nicht. Ein 404 kann
  // deshalb nur bedeuten: die Datei ist wirklich von der Platte verschwunden.
  const afterDelete = await page.request.get(`${BASE}/bilder/${PHOTO_B_FILE}`);
  check(
    "Löschen entfernt die Bilddatei von der Platte",
    afterDelete.status() === 404,
    `HTTP ${afterDelete.status()}`,
  );

  // Das Bild des freigegebenen Pferdes darf davon unberührt bleiben.
  const stillThere = await anon.request.get(`${BASE}/bilder/${PHOTO_FILE}`);
  check(
    "Das Bild des anderen Pferdes bleibt erhalten",
    stillThere.status() === 200,
    `HTTP ${stillThere.status()}`,
  );
} finally {
  await browser.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length} von ${results.length} Prüfungen bestanden.`,
);
process.exit(failed.length === 0 ? 0 : 1);
