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

const BASE = process.env.BASE ?? "http://localhost:3111";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-passwort-lokal";
const NAME = `Testhengst ${Date.now()}`;
const EMAIL = "besitzer@example.com";

const results = [];
function check(label, condition, detail = "") {
  results.push({ label, ok: Boolean(condition), detail });
  console.log(`${condition ? "OK  " : "FEHL"} ${label}${detail ? ` - ${detail}` : ""}`);
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage();
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
  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');

  await page.waitForURL("**/eintragen/danke", { timeout: 15000 });
  check("Einsendung führt zur Danke-Seite", true);

  /* 2 - Eintrag darf noch NICHT öffentlich sein -------------------------- */
  await page.goto(`${BASE}/hengste?q=${encodeURIComponent(NAME)}`);
  const publicBefore = await page.locator(`text=${NAME}`).count();
  check("Neuer Eintrag ist vor Freigabe unsichtbar", publicBefore === 0);

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
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length} von ${results.length} Prüfungen bestanden.`,
);
process.exit(failed.length === 0 ? 0 : 1);
