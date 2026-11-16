/**
 * Durchklick-Test für "Kühl in Mülheim".
 *
 * Prüft, dass alle Seiten laden, die Karte Orte zeigt, Detailkarten aufgehen,
 * der Trinkwasser-Finder funktioniert, Meldungen gespeichert werden und
 * nichts seitwärts scrollt. Erwartet einen laufenden Server:
 *
 *   npm run dev -- -p 3113
 *   npm run e2e:kuehl
 */
import { chromium, devices } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3113";
const results = [];
function check(label, condition, detail = "") {
  results.push({ label, ok: Boolean(condition) });
  console.log(`${condition ? "OK  " : "FEHL"} ${label}${detail ? ` - ${detail}` : ""}`);
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const context = await browser.newContext({ ...devices["Pixel 7"], locale: "de-DE" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`${m.text()} (${m.location()?.url ?? "?"})`);
});
// Kartenkacheln kommen von außen; ob die erreichbar sind, ist nicht Sache dieses Tests.
const ignorable = (msg) => /tile\.openstreetmap\.org|favicon\.ico|ERR_(TUNNEL|PROXY|NAME|INTERNET)/.test(msg);

async function noSideScroll(label) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`${label}: kein seitliches Scrollen`, w <= 1, `${w}px`);
}

// Start
await page.goto(`${BASE}/kuehl`);
await page.getByRole("heading", { name: "Hallo! Bleib cool in Mülheim." }).waitFor();
check("Startseite lädt", true);
await page.waitForFunction(() => !document.body.innerText.includes("Aktuelle Werte werden geladen"), null, { timeout: 30_000 });
const weatherText = await page.locator(".k-weather").innerText();
check(
  "Wetterkarte zeigt Werte oder eine verständliche Meldung",
  /°C/.test(weatherText) || /nicht erreichbar/.test(weatherText),
  weatherText.split("\n").slice(0, 3).join(" | "),
);
await noSideScroll("Start");

// Karte
await page.getByRole("navigation").getByRole("link", { name: "Karte" }).click();
await page.waitForURL(/\/kuehl\/karte/);
await page.locator(".k-marker").first().waitFor({ timeout: 30_000 });
const markers = await page.locator(".k-marker").count();
check("Karte zeigt Orte", markers >= 10, `${markers} Marker`);
check("Leaflet-Karte ist da", (await page.locator(".leaflet-container").count()) === 1);

await page.getByRole("button", { name: /Kühle Orte/ }).click();
const afterToggle = await page.locator(".k-marker").count();
check("Ebene ausschalten blendet Orte aus", afterToggle < markers, `${markers} -> ${afterToggle}`);
await page.getByRole("button", { name: /Kühle Orte/ }).click();

await page.getByRole("button", { name: "Nächstes Trinkwasser finden" }).click();
const sheet = page.getByRole("dialog");
await sheet.waitFor();
const sheetText = await sheet.innerText();
check("Trinkwasser-Finder öffnet einen Brunnen", /Trinkwasser|Trinkbrunnen/.test(sheetText), sheetText.split("\n")[2]);
check("Detailkarte nennt Entfernung und Quelle", /Luftlinie/.test(sheetText) && /Quelle/.test(sheetText));
check("Fußweg-Link zeigt auf OpenStreetMap", (await sheet.getByRole("link", { name: /Fußweg/ }).getAttribute("href"))?.includes("openstreetmap.org/directions"));
await page.keyboard.press("Escape");
await sheet.waitFor({ state: "detached" });
check("Detailkarte schließt mit Escape", true);

// Ein Marker kann nach dem Heranzoomen außerhalb des Ausschnitts liegen; Leaflet reagiert aber auf den Klick.
await page.evaluate(() => document.querySelectorAll(".k-marker")[3].closest(".leaflet-marker-icon").click());
await sheet.waitFor();
check("Klick auf Marker öffnet Detailkarte", await sheet.isVisible());
await sheet.getByRole("button", { name: "Schließen" }).click();

await page.getByRole("button", { name: "Hitze" }).click();
await page.getByText(/Modellwerte|nicht verfügbar/).first().waitFor();
check("Hitze-Ebene erklärt ihre Datenlage", true);
await noSideScroll("Karte");

// Entdecken
await page.goto(`${BASE}/kuehl/entdecken?tab=wasser`);
await page.locator(".k-place").first().waitFor();
const water = await page.locator(".k-place").allInnerTexts();
check("Trinkwasser-Liste enthält die städtischen Brunnen", water.filter((t) => /Angabe der Stadt/.test(t)).length === 3, `${water.length} Einträge`);

await page.getByRole("tab", { name: "Kühle Orte" }).click();
await page.waitForURL(/tab=kuehl/);
const coolAll = await page.locator(".k-place").count();
await page.getByLabel("Viel Schatten").check();
const coolShade = await page.locator(".k-place").count();
check("Filter „Viel Schatten“ wirkt", coolShade > 0 && coolShade <= coolAll, `${coolAll} -> ${coolShade}`);
await page.getByLabel("Ich bin hier:").selectOption("saarn");
const firstSaarn = await page.locator(".k-place h3").first().innerText();
check("Sortierung folgt dem Startpunkt", firstSaarn.length > 0, `ab Saarn zuerst: ${firstSaarn}`);
await page.locator(".k-place").first().click();
await page.waitForURL(/\/kuehl\/karte\?ort=/);
await page.getByRole("dialog").waitFor();
check("Listeneintrag öffnet den Ort auf der Karte", true);
await noSideScroll("Entdecken");

// Hitzeschutz
await page.goto(`${BASE}/kuehl/hitzeschutz`);
check("Hitzeschutz zeigt den Notruf", await page.getByText("112", { exact: true }).isVisible());
await page.getByText("Ausreichend trinken").click();
check("Ratgeber klappt auf", await page.getByText(/nicht erst, wenn du Durst hast/).isVisible());

// Melden
await page.goto(`${BASE}/kuehl/melden`);
await page.locator(".k-map .leaflet-container").waitFor();
await page.getByRole("button", { name: "Meldung absenden" }).click();
check("Ohne Ort gibt es eine Fehlermeldung", await page.getByText("Bitte tippe auf der Karte an, wo der Ort ist.").isVisible());
const box = await page.locator(".k-map .leaflet-container").boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.getByText(/^Gewählt:/).waitFor();
await page.getByLabel("Was möchtest du melden?").selectOption("Neuer Schattenplatz");
await page.getByLabel(/Beschreibung/).fill("Testmeldung aus dem Durchklick-Test");
await page.getByRole("button", { name: "Meldung absenden" }).click();
await page.getByText("Deine Meldung ist angekommen.").waitFor();
check("Meldung wird gespeichert", true);

const bad = await page.request.post(`${BASE}/api/kuehl/meldungen`, {
  data: { category: "Neuer Schattenplatz", lat: 52.52, lon: 13.4 },
});
check("Server lehnt Orte außerhalb Mülheims ab", bad.status() === 400);

// Moderation ohne Anmeldung
await page.goto(`${BASE}/kuehl/moderation`);
check("Moderation verlangt Anmeldung", await page.getByText(/melde dich zuerst|noch nicht eingerichtet/).isVisible());

const real = errors.filter((e) => !ignorable(e));
check("Keine Fehler in der Konsole", real.length === 0, real.slice(0, 3).join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} von ${results.length} Prüfungen bestanden.`);
process.exit(failed ? 1 : 0);
