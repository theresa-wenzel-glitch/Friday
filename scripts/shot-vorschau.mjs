import { chromium } from "playwright";
import path from "node:path";
const FILE = "file://" + path.join(process.cwd(), "vorschau", "westernhengste.html");
const OUT = process.env.OUT ?? "screenshots";
import fs from "node:fs"; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });
for (const scheme of ["light", "dark"]) {
  const c = await b.newContext({ viewport: { width: 1280, height: 950 }, colorScheme: scheme });
  const p = await c.newPage();
  await p.goto(FILE); await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/v-liste-${scheme}.png` });
  await p.goto(FILE + "#/hengst/smart-little-lena"); await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/v-detail-${scheme}.png`, fullPage: true });
  await c.close();
}
await b.close();
console.log("fertig");
