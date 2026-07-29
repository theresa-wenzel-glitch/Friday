/** Macht Screenshots der wichtigsten Seiten - zur Sichtprüfung des Layouts. */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3112";
const OUT = process.env.OUT ?? "screenshots";
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  ["start", "/"],
  ["liste", "/hengste"],
  ["detail", "/hengste/smart-little-lena"],
  ["eintragen", "/eintragen"],
];

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);

for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: scheme,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  for (const [name, path] of PAGES) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.screenshot({
      path: `${OUT}/${name}-${scheme}.png`,
      fullPage: name !== "eintragen",
    });
    console.log(`${OUT}/${name}-${scheme}.png`);
  }
  await context.close();
}

// Mobil - prüft, dass die Seite nicht seitwärts scrollt.
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mPage = await mobile.newPage();
for (const [name, path] of [["detail", "/hengste/smart-little-lena"], ["liste", "/hengste"]]) {
  await mPage.goto(BASE + path, { waitUntil: "networkidle" });
  const overflow = await mPage.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  console.log(`${name} mobil - seitliches Scrollen: ${overflow ? "JA (Fehler)" : "nein"}`);
  await mPage.screenshot({ path: `${OUT}/${name}-mobil.png`, fullPage: true });
}

await browser.close();
