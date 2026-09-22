/**
 * Durchklick-Test für SoundLab.
 *
 * Prüft, dass jede Seite lädt, die Navigation funktioniert, Instrumente Töne
 * erzeugen (AudioContext läuft), der Zustand gespeichert wird und nichts
 * seitwärts scrollt.
 *
 *   node scripts/soundlab-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3113";
const results = [];
function check(label, condition, detail = "") {
  results.push({ label, ok: Boolean(condition), detail });
  console.log(`${condition ? "OK  " : "FEHL"} ${label}${detail ? ` - ${detail}` : ""}`);
}

const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ["microphone"],
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(`${message.text()} (${message.location()?.url ?? "?"})`);
  }
});
page.on("response", (response) => {
  if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
});
// Das Hengstverzeichnis hat kein Favicon - das ist nicht Sache von SoundLab.
const ignorable = (message) => /favicon\.ico/.test(message);

/* Zählt, wie oft die App Audioknoten startet - so sehen wir, ob wirklich
   Töne erzeugt werden, ohne sie hören zu müssen. */
async function instrumentAudio() {
  await page.addInitScript(() => {
    window.__notes = 0;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      window.__notes += 1;
      return start.apply(this, args);
    };
    const bufferStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.__notes += 1;
      return bufferStart.apply(this, args);
    };
  });
}
await instrumentAudio();

const notes = () => page.evaluate(() => window.__notes ?? 0);

try {
  /* 1 - Landing Page ---------------------------------------------------- */
  await page.goto(`${BASE}/soundlab`, { waitUntil: "networkidle" });
  check("Landing lädt", await page.getByText("Ohne Instrument zu können.").isVisible());

  await page.getByRole("button", { name: /Piano/ }).first().click();
  await page.waitForTimeout(400);
  check("Landing-Demo erzeugt Töne", (await notes()) > 0, `${await notes()} Tonstarts`);

  await page.getByRole("link", { name: /Jetzt ausprobieren/ }).click();
  await page.waitForURL("**/soundlab/app");
  check("CTA führt ins Studio", page.url().endsWith("/soundlab/app"));

  /* 2 - Dashboard und Navigation ---------------------------------------- */
  check("Begrüßung sichtbar", await page.getByText("Mach Musik. Ohne Vorkenntnisse.").isVisible());

  for (const [label, url] of [
    ["Instrumente", "/soundlab/app/instrumente"],
    ["Meine Band", "/soundlab/app/band"],
    ["Voice", "/soundlab/app/voice"],
    ["Studio", "/soundlab/app/studio"],
    ["Pro", "/soundlab/app/pro"],
    ["Meine Projekte", "/soundlab/app/projekte"],
  ]) {
    await page.getByRole("link", { name: label, exact: true }).first().click();
    await page.waitForURL(`**${url}`);
    check(`Navigation: ${label}`, page.url().endsWith(url));
  }

  /* 3 - Klavier ---------------------------------------------------------- */
  await page.goto(`${BASE}/soundlab/app/instrumente/klavier`, { waitUntil: "networkidle" });
  const before = await notes();
  // Unten anklicken - oben liegen die schwarzen Tasten darüber, wie am echten Klavier.
  await page.locator(".sl-key-white").nth(2).click({ position: { x: 12, y: 150 } });
  await page.locator(".sl-key-black").first().click();
  await page.keyboard.press("KeyA");
  await page.waitForTimeout(300);
  check("Klavier spielt Töne", (await notes()) > before, `${(await notes()) - before} Tonstarts`);

  await page.getByRole("button", { name: "Alle meine Entchen" }).click();
  check("Melodie-Hilfe markiert eine Taste", (await page.locator('[data-hint="true"]').count()) > 0);

  /* 4 - Schlagzeug und Transport ----------------------------------------- */
  await page.goto(`${BASE}/soundlab/app/instrumente/drums`, { waitUntil: "networkidle" });
  const beforeDrums = await notes();
  await page.getByRole("button", { name: /^Snare/ }).click();
  await page.waitForTimeout(200);
  check("Drum-Pad klingt", (await notes()) > beforeDrums);

  await page.getByRole("button", { name: "Boom Bap" }).click();
  await page.getByRole("button", { name: /Beat starten/ }).click();
  await page.waitForTimeout(1600);
  const playing = await page.getByRole("button", { name: /Stopp/ }).first().isVisible();
  check("Beat läuft", playing);
  check("Sequencer erzeugt Töne", (await notes()) > beforeDrums + 5, `${await notes()} gesamt`);
  check("Abspielkopf sichtbar", (await page.locator('[data-cursor="true"]').count()) > 0);

  /* 5 - Band zusammenstellen --------------------------------------------- */
  await page.goto(`${BASE}/soundlab/app/band`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Gitarre einschalten/ }).click();
  await page.waitForTimeout(200);
  check("Gitarre ist Teil der Band", (await page.locator(".sl-accent-guitar.sl-card-active").count()) > 0);
  check("Bühne zeigt Mitspieler", (await page.getByText("Gitarre", { exact: true }).count()) > 0);

  /* 6 - Song Builder und Projekte ---------------------------------------- */
  await page.goto(`${BASE}/soundlab/app/studio`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Lo-Fi/ }).first().click();
  await page.getByLabel("Songname").fill("Testsong");
  await page.getByRole("button", { name: /Speichern/ }).click();
  await page.waitForTimeout(300);
  check("Song gespeichert", await page.getByText("„Testsong“ gespeichert").isVisible());

  await page.goto(`${BASE}/soundlab/app/projekte`, { waitUntil: "networkidle" });
  check("Projekt erscheint in der Liste", await page.getByText("Testsong").first().isVisible());

  /* 6b - Stimme aufnehmen (synthetisches Mikrofon des Browsers) ---------- */
  await page.goto(`${BASE}/soundlab/app/voice`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Aufnehmen" }).click();
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /Aufnahme beenden/ }).click();
  await page.waitForTimeout(1500);
  check("Aufnahme ausgewertet", await page.getByText("Deine Aufnahme", { exact: true }).isVisible());
  check("Tonhöhe erkannt", await page.getByText("Stimmstabilität").isVisible());
  const beforePlayback = await notes();
  await page.getByRole("button", { name: /Anhören/ }).click();
  await page.waitForTimeout(400);
  check("Aufnahme wird abgespielt", (await notes()) > beforePlayback);
  await page.getByRole("button", { name: /Weicher und runder/ }).click();
  check("Klangfarbe wählbar", (await page.locator(".sl-card-active").count()) > 0);

  /* 7 - Pro Mode --------------------------------------------------------- */
  await page.goto(`${BASE}/soundlab/app/pro`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Pro Mode aktivieren" }).click();
  await page.waitForTimeout(200);
  check("Pro Mode aktiv", (await page.locator(".sl-player input[type=number]").count()) > 0);
  const cells = await page.locator('button[aria-label*="Takt"]').count();
  check("Pro-Timeline zeigt Takte", cells >= 16, `${cells} Zellen`);
  await page.locator('button[aria-label*="Takt"]').first().click();

  /* 8 - Lernen ----------------------------------------------------------- */
  await page.goto(`${BASE}/soundlab/app/lernen`, { waitUntil: "networkidle" });
  const beforeLesson = await notes();
  await page.getByRole("button", { name: /Hör es dir an/ }).first().click();
  await page.waitForTimeout(500);
  check("Lektion spielt Beispiel", (await notes()) > beforeLesson);

  /* 9 - Zustand bleibt erhalten ------------------------------------------ */
  await page.reload({ waitUntil: "networkidle" });
  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("soundlab.state.v1") ?? "{}"),
  );
  check("Zustand gespeichert", stored.mode === "pro" && stored.projects?.length > 0);

  /* 10 - Mobil ----------------------------------------------------------- */
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/soundlab", "/soundlab/app", "/soundlab/app/instrumente/klavier", "/soundlab/app/studio"]) {
    await mobile.goto(BASE + path, { waitUntil: "networkidle" });
    const overflow = await mobile.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`Kein Seitwärts-Scroll: ${path}`, overflow <= 1, `${overflow}px`);
  }
  check(
    "Mobile Navigation sichtbar",
    await mobile.getByRole("link", { name: "Band" }).first().isVisible(),
  );
  await mobile.close();

  /* 11 - Die alte App läuft weiter --------------------------------------- */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  check("Hengstverzeichnis unberührt", await page.getByText("Westernhengste").first().isVisible());
} catch (error) {
  check("Durchlauf ohne Ausnahme", false, error.message);
} finally {
  const realErrors = errors.filter((message) => !ignorable(message));
  check("Keine Browser-Fehler", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} Prüfungen bestanden`);
  process.exit(failed.length ? 1 : 0);
}
