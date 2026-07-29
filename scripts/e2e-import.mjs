/**
 * Prüft die Übernahme von Abstammungen aus einer Textliste.
 *
 *   BASE=http://localhost:3119 ADMIN_PASSWORD=... node scripts/e2e-import.mjs
 *
 * ACHTUNG: Der Test SCHREIBT in die Datenbank. Nur gegen eine Wegwerf-Datenbank
 * laufen lassen, nie gegen den echten Bestand.
 *
 * Die Testpferde sind bewusst frei erfunden und als solche benannt - eine
 * erfundene Abstammung darf niemals versehentlich im echten Bestand landen.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3119";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-passwort-lokal";

const results = [];
function check(label, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "OK  " : "FEHL"} ${label}${detail ? ` - ${detail}` : ""}`);
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("  [Browser-Fehler]", e.message));

// Frei erfundene Pferde. Doc Bar steht mit in der Liste, um zu prüfen, dass
// ein vorhandener Eintrag NICHT überschrieben wird.
const LISTE = `# Testliste - erfundene Pferde
Pruefhengst Alpha | Pruefvater Beta | Pruefstute Gamma | 1990 | Fuchs
Pruefvater Beta | Pruefahn Delta | Pruefstute Epsilon
Doc Bar | Falscher Vater | Falsche Mutter`;

try {
  /* Anmelden */
  await page.goto(`${BASE}/admin/abstammung`, { waitUntil: "networkidle" });
  await page.fill("#password", ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto(`${BASE}/admin/abstammung`, { waitUntil: "networkidle" });
  check(
    "Seite für Abstammungen erreichbar",
    (await page.textContent("body")).includes("Abstammungen eintragen"),
  );

  /* Ohne Anmeldung gesperrt? */
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`${BASE}/admin/abstammung`, { waitUntil: "networkidle" });
  check(
    "Ohne Anmeldung nicht nutzbar",
    !(await anonPage.textContent("body")).includes("Vorschau anzeigen"),
  );
  await anon.close();

  /* Vorschau */
  await page.fill("#text", LISTE);
  await page.click('button:has-text("Vorschau anzeigen")');
  await page.waitForTimeout(1500);

  const vorschau = await page.textContent("body");
  check("Vorschau erscheint", vorschau.includes("Das würde passieren"));
  check(
    "Neue Stute wird als Stute erkannt",
    /Pruefstute Gamma[\s\S]{0,80}Stute/.test(vorschau),
    "aus der Mutterspalte abgeleitet",
  );
  check(
    "Vorhandener Eintrag wird als vorhanden erkannt",
    /Doc Bar[\s\S]{0,140}(vorhanden|unverändert)/.test(vorschau),
  );
  check(
    "Genannter Vorfahr ohne eigene Zeile wird mit angelegt",
    vorschau.includes("Pruefahn Delta"),
  );

  /* Noch nichts geändert? */
  const vorherRes = await page.request.get(`${BASE}/hengste?q=Pruefhengst`);
  check(
    "Vor dem Übernehmen ist nichts angelegt",
    !(await vorherRes.text()).includes("Pruefhengst Alpha"),
  );

  /* Übernehmen */
  await page.click('button:has-text("Übernehmen")');
  await page.waitForTimeout(2500);
  check(
    "Rückmeldung nach dem Übernehmen",
    (await page.textContent("body")).includes("Übernommen"),
  );

  /* Wirkung prüfen */
  await page.goto(`${BASE}/hengste/pruefhengst-alpha`, { waitUntil: "networkidle" });
  const detail = await page.textContent("body");
  check("Neues Pferd hat eine Seite", detail.includes("Pruefhengst Alpha"));
  check(
    "Abstammung wurde übernommen",
    detail.includes("Pruefvater Beta") && detail.includes("Pruefstute Gamma"),
  );
  check("Jahrgang wurde übernommen", detail.includes("1990"));

  /* Der eigentliche Zweck: der Stammbaum reicht über die Eltern hinaus */
  check(
    "Stammbaum reicht bis zu den Grosseltern",
    detail.includes("Pruefahn Delta") && detail.includes("Pruefstute Epsilon"),
    "zweite Generation aus der zweiten Zeile",
  );

  /* Vorhandene Angaben dürfen NICHT überschrieben werden */
  await page.goto(`${BASE}/hengste/doc-bar`, { waitUntil: "networkidle" });
  const docBar = await page.textContent("body");
  check(
    "Vorhandene Abstammung bleibt unangetastet",
    docBar.includes("Lightning Bar") &&
      !docBar.includes("Falscher Vater") &&
      !docBar.includes("Falsche Mutter"),
  );

  /* Zweiter Lauf darf nichts kaputtmachen */
  await page.goto(`${BASE}/admin/abstammung`, { waitUntil: "networkidle" });
  await page.fill("#text", LISTE);
  await page.click('button:has-text("Vorschau anzeigen")');
  await page.waitForTimeout(1500);
  check(
    "Zweiter Lauf legt nichts doppelt an",
    !(await page.textContent("body")).includes("wird angelegt"),
  );
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} von ${results.length} Prüfungen bestanden.`);
process.exit(failed === 0 ? 0 : 1);
