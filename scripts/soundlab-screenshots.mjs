/** Screenshots der SoundLab-Seiten - zur Sichtprüfung von Layout und Farbwelt. */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3113";
const OUT = process.env.OUT ?? "screenshots/soundlab";
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  ["landing", "/soundlab"],
  ["dashboard", "/soundlab/app"],
  ["instrumente", "/soundlab/app/instrumente"],
  ["klavier", "/soundlab/app/instrumente/klavier"],
  ["drums", "/soundlab/app/instrumente/drums"],
  ["gitarre", "/soundlab/app/instrumente/gitarre"],
  ["band", "/soundlab/app/band"],
  ["voice", "/soundlab/app/voice"],
  ["studio", "/soundlab/app/studio"],
  ["pro", "/soundlab/app/pro"],
  ["projekte", "/soundlab/app/projekte"],
  ["lernen", "/soundlab/app/lernen"],
];

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);

const desktop = await browser.newContext({ viewport: { width: 1360, height: 950 } });
const page = await desktop.newPage();
for (const [name, path] of PAGES) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`${OUT}/${name}.png`);
}
await desktop.close();

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const small = await mobile.newPage();
for (const [name, path] of [PAGES[0], PAGES[1], PAGES[3], PAGES[6]]) {
  await small.goto(BASE + path, { waitUntil: "networkidle" });
  await small.waitForTimeout(300);
  await small.screenshot({ path: `${OUT}/${name}-mobil.png`, fullPage: false });
  console.log(`${OUT}/${name}-mobil.png`);
}
await mobile.close();
await browser.close();
