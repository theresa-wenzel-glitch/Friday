/** Prüft die Ansichts-Version direkt als Datei - ohne Server. */
import { chromium } from "playwright";
import path from "node:path";

const FILE = "file://" + path.join(process.cwd(), "vorschau", "westernhengste.html");

const results = [];
function check(label, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "OK  " : "FEHL"} ${label}${detail ? ` - ${detail}` : ""}`);
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

try {
  await page.goto(FILE);
  await page.waitForTimeout(500);

  check("Seite lädt ohne Skriptfehler", errors.length === 0, errors.join(" | "));
  check(
    "Alle 50 Hengste werden gelistet",
    (await page.textContent("#resultLine")).includes("50"),
    await page.textContent("#resultLine"),
  );

  /* Suche */
  await page.fill("#q", "doc bar");
  await page.waitForTimeout(300);
  const treffer = await page.locator(".card h3").allTextContents();
  check(
    "Suche findet Nachkommen über die Abstammung",
    treffer.includes("Doc Bar") && treffer.some((t) => t.includes("Doc O")),
    treffer.join(", "),
  );

  /* Filter */
  await page.fill("#q", "");
  await page.selectOption("#fDiscipline", "Reining");
  await page.waitForTimeout(300);
  const reining = Number((await page.textContent("#resultLine")).match(/\d+/)[0]);
  check("Disziplin-Filter greift", reining > 0 && reining < 50, `${reining} Reiningpferde`);
  await page.selectOption("#fDiscipline", "");

  /* Detailseite + Stammbaum */
  await page.fill("#q", "Smart Little Lena");
  await page.waitForTimeout(300);
  // Genau diese Karte - die Suche liefert absichtlich auch den Sohn
  // Smart Chic Olena, weil dessen Vater gesucht wurde.
  await page.click('.card[data-slug="smart-little-lena"]');
  await page.waitForTimeout(400);

  const detail = await page.textContent("#detailView");
  check("Detailseite öffnet", detail.includes("Smart Little Lena"));
  check(
    "Stammbaum reicht vier Generationen tief",
    detail.includes("Doc Bar") && detail.includes("Lightning Bar") && detail.includes("Three Bars"),
  );
  check(
    "Tiefenangabe stimmt",
    /Bekannt bis zur 4\. Generation – 18 von 30 Plätzen/.test(detail),
  );
  check("Nachkommen werden gelistet", detail.includes("Smart Chic Olena"));

  const cells = await page.locator(".ped-cell").count();
  check("Raster hat 30 Ahnenplätze", cells === 30, `${cells} Felder`);

  /* Klick im Stammbaum */
  await page.locator('.ped-cell.linked:has-text("Doc Bar")').first().click();
  await page.waitForTimeout(400);
  check(
    "Klick im Stammbaum öffnet den Vorfahren",
    (await page.textContent("#detailView")).includes("Als Rennpferd eine Enttäuschung"),
  );

  /* All Breed Pedigree */
  const abLink = await page.locator('a[href*="allbreedpedigree"]').first().getAttribute("href");
  check("Link zu All Breed Pedigree stimmt", abLink.includes("hn=Doc%20Bar"), abLink);

  /* Demo-Eintrag */
  await page.click("[data-back]");
  await page.waitForTimeout(400);
  check(
    "Zurück-Knopf führt zur Übersicht, nicht zum vorigen Pferd",
    !(await page.locator("#listView").getAttribute("class")).includes("hidden"),
  );
  await page.fill("#q", "");
  await page.click("details.demo > summary");
  await page.fill("#dName", "Mein Testhengst");
  await page.fill("#dYear", "2018");
  await page.fill("#dSire", "Doc Bar");
  await page.fill("#dDam", "Poco Lena");
  await page.click('#demoForm button[type="submit"]');
  await page.waitForTimeout(500);

  const own = await page.textContent("#detailView");
  check("Eigener Eintrag wird angelegt", own.includes("Mein Testhengst"));
  check(
    "Stammbaum des eigenen Eintrags verbindet sich",
    own.includes("Lightning Bar") && own.includes("Poco Bueno"),
    "Grosseltern aus dem Bestand",
  );

  /* Zurück und wiederfinden */
  await page.click("[data-back]");
  await page.waitForTimeout(300);
  await page.fill("#q", "Testhengst");
  await page.waitForTimeout(300);
  check(
    "Eigener Eintrag steht im Verzeichnis",
    (await page.locator(".card h3").allTextContents()).some((t) => t.includes("Mein Testhengst")),
  );

  /* Mobil: kein seitliches Scrollen */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.fill("#q", "Smart Little Lena");
  await page.waitForTimeout(300);
  await page.click(".card");
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  check("Am Handy kein seitliches Scrollen der Seite", !overflow);

  /* Dünne Abstammungen: genau der Fall, der auf dem Handy als
     "kaum vorhanden" auffiel. Das Raster darf dann nicht 28 leere
     Kästchen zeigen. */
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(FILE + "#/hengst/hollywood-dun-it");
  await page.waitForTimeout(400);
  const duenn = await page.locator(".ped-cell").count();
  const duennLeer = await page.locator(".ped-cell.ped-empty").count();
  check(
    "Nur Vater und Mutter bekannt: genau zwei Felder, keine leeren",
    duenn === 2 && duennLeer === 0,
    `${duenn} Felder, davon ${duennLeer} leer`,
  );
  check(
    "Beschriftung nennt die tatsächliche Tiefe",
    (await page.textContent("#detailView")).includes("Bekannt sind Vater und Mutter"),
  );

  await page.goto(FILE + "#/hengst/traveler");
  await page.waitForTimeout(400);
  check(
    "Ohne Abstammung wird kein leeres Raster gezeichnet",
    (await page.locator(".ped-cell").count()) === 0 &&
      (await page.textContent("#detailView")).includes("noch keine Abstammung"),
  );

  /* Kein Pferd darf ein Raster mit überwiegend leeren Feldern in einer
     komplett leeren letzten Spalte zeigen. */
  const slugs = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".card")).map((c) => c.dataset.slug),
  );
  await page.goto(FILE);
  await page.waitForTimeout(300);
  const alle = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".card")).map((c) => c.dataset.slug),
  );
  let leereSpalte = [];
  for (const slug of alle) {
    await page.goto(FILE + "#/hengst/" + slug);
    await page.waitForTimeout(60);
    const letzteSpalteLeer = await page.evaluate(() => {
      const grid = document.querySelector(".pedigree");
      if (!grid) return false;
      const spalten = Number(
        (grid.style.gridTemplateColumns.match(/repeat\((\d+)/) || [])[1] || 0,
      );
      const inLetzter = Array.from(grid.children).filter(
        (el) => Number(el.style.gridColumn) === spalten,
      );
      return inLetzter.length > 0 && inLetzter.every((el) => el.classList.contains("ped-empty"));
    });
    if (letzteSpalteLeer) leereSpalte.push(slug);
  }
  check(
    "Keine komplett leere letzte Generation",
    leereSpalte.length === 0,
    leereSpalte.join(", "),
  );

  check("Keine Skriptfehler im gesamten Ablauf", errors.length === 0, errors.join(" | "));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} von ${results.length} Prüfungen bestanden.`);
process.exit(failed === 0 ? 0 : 1);
