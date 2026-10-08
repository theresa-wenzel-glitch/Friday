/**
 * Durchklick-Test für den Bautagebuch-Automaten.
 *
 * Startet selbst einen Platzhalter für KI, Wetterdienst und Telegram und dazu
 * die gebaute App - so lässt sich alles ohne echte Schlüssel und ohne Kosten
 * prüfen.
 *
 *   npm run build
 *   node scripts/bautagebuch-e2e.mjs
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { chromium } from "playwright";

const PORT = Number(process.env.PORT ?? 3117);
const MOCK_PORT = PORT + 1;
const BASE = `http://localhost:${PORT}`;
const MOCK = `http://localhost:${MOCK_PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "btb-e2e-"));
const WEBHOOK_SECRET = "test-geheimnis";
const CRON_SECRET = "cron-geheimnis";
const SHOTS = process.env.SHOTS_DIR;

const results = [];
function check(label, condition, detail = "") {
  results.push({ label, ok: Boolean(condition), detail });
  console.log(`${condition ? "OK  " : "FEHL"} ${label}${detail ? ` - ${detail}` : ""}`);
}

/* ------------------------------------------------------------------ */
/* Platzhalter-Dienste                                                  */
/* ------------------------------------------------------------------ */

const aufrufe = [];
const KI_ANTWORT = {
  anwesende: "2 Mitarbeiter",
  arbeitszeit: "07:00 bis 16:30 Uhr",
  leistungen: "Streifenfundamente geschalt und bewehrt.",
  material: "",
  behinderungen: "Betonlieferung ca. 2 Stunden verspätet.",
  anordnungen: "",
  wetterNotiz: "Ab Mittag Regen.",
  fotoBeschreibung: "Foto zeigt eine geschalte Baugrube.",
  fehlend: ["Material"],
};

function lies(req) {
  return new Promise((ok) => {
    const teile = [];
    req.on("data", (d) => teile.push(d));
    req.on("end", () => ok(Buffer.concat(teile)));
  });
}

const mock = http.createServer(async (req, res) => {
  const body = await lies(req);
  const url = new URL(req.url, MOCK);
  const json = (data) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  aufrufe.push({ pfad: url.pathname, body, typ: req.headers["content-type"] ?? "" });

  if (url.pathname === "/openai/audio/transcriptions") {
    return json({ text: "Heute bei Müller, zwei Mann, Fundament geschalt, Beton kam zwei Stunden zu spät, ab Mittag Regen." });
  }
  if (url.pathname === "/openai/chat/completions") {
    return json({ choices: [{ message: { content: JSON.stringify(KI_ANTWORT) } }] });
  }
  if (url.pathname === "/v1/search") {
    return json({ results: [{ latitude: 47.99, longitude: 7.84, country_code: "DE" }] });
  }
  if (url.pathname === "/v1/forecast") {
    return json({
      current: { temperature_2m: 11.4, weather_code: 61, wind_speed_10m: 14 },
      daily: {
        weather_code: [61],
        temperature_2m_max: [13.1],
        temperature_2m_min: [8.2],
        precipitation_sum: [4.3],
        wind_speed_10m_max: [22],
      },
    });
  }
  if (url.pathname.startsWith("/telegram/file/")) {
    res.writeHead(200);
    return res.end(url.pathname.endsWith(".jpg") ? testJpeg : Buffer.from("OggS-fake-voice"));
  }
  if (url.pathname.startsWith("/telegram/bot")) {
    const methode = url.pathname.split("/").pop();
    if (methode === "getFile") {
      const { file_id } = JSON.parse(body.toString());
      return json({ ok: true, result: { file_path: file_id === "foto1" ? "photos/a.jpg" : "voice/a.oga", file_size: 100 } });
    }
    return json({ ok: true, result: {} });
  }
  res.writeHead(404);
  res.end();
});

const telegramAufrufe = (methode) => aufrufe.filter((a) => a.pfad.endsWith(`/${methode}`));

/* ------------------------------------------------------------------ */
/* Hilfen                                                               */
/* ------------------------------------------------------------------ */

let testJpeg = Buffer.alloc(0);

async function warteAuf(fn, ms = 15000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    const wert = await fn();
    if (wert) return wert;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

async function telegram(update) {
  return fetch(`${BASE}/api/bautagebuch/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": WEBHOOK_SECRET },
    body: JSON.stringify(update),
  });
}

let updateId = 1000;
const nachricht = (inhalt) => ({
  update_id: ++updateId,
  message: { message_id: updateId, chat: { id: 4711 }, from: { first_name: "Kai", last_name: "Dachs" }, ...inhalt },
});

async function keinSeitwaertsScrollen(page, name) {
  const breit = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(`${name}: kein seitliches Scrollen`, !breit);
}

async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

/* ------------------------------------------------------------------ */
/* Ablauf                                                               */
/* ------------------------------------------------------------------ */

await new Promise((ok) => mock.listen(MOCK_PORT, ok));

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  // Eigene Prozessgruppe, damit beim Beenden auch der eigentliche Server-Prozess mit beendet wird.
  detached: true,
  env: {
    ...process.env,
    NODE_ENV: "production",
    SESSION_SECRET: "e2e-" + crypto.randomBytes(16).toString("hex"),
    BAUTAGEBUCH_DATA_DIR: DATA_DIR,
    OPENAI_API_KEY: "sk-test",
    OPENAI_API_BASE: `${MOCK}/openai`,
    OPEN_METEO_API: MOCK,
    OPEN_METEO_GEO_API: MOCK,
    TELEGRAM_BOT_TOKEN: "123:abc",
    TELEGRAM_WEBHOOK_SECRET: WEBHOOK_SECRET,
    TELEGRAM_BOT_USERNAME: "testbaubot",
    TELEGRAM_API_BASE: `${MOCK}/telegram`,
    CRON_SECRET,
    NEXT_PUBLIC_SITE_URL: BASE,
    DATABASE_PATH: path.join(DATA_DIR, "western.db"),
    SKIP_AUTO_SEED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
const stoppeServer = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* schon beendet */
  }
};
process.on("exit", stoppeServer);
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

const bereit = await warteAuf(async () => {
  try {
    return (await fetch(`${BASE}/bautagebuch`)).ok;
  } catch {
    return false;
  }
}, 60000);
if (!bereit) {
  console.error("Server startet nicht:\n", serverLog);
  process.exit(1);
}

const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const handy = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const context = await browser.newContext({
  ...handy,
  permissions: ["microphone", "geolocation"],
  geolocation: { latitude: 47.9959, longitude: 7.8421 },
});
const page = await context.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push(e.message));
page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));

try {
  // Ein echtes JPG für Foto-Uploads erzeugen
  await page.goto(`${BASE}/bautagebuch`);
  testJpeg = Buffer.from(
    (
      await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 800;
        c.height = 600;
        const g = c.getContext("2d");
        g.fillStyle = "#8a8f94";
        g.fillRect(0, 0, 800, 600);
        g.fillStyle = "#c9a26b";
        g.fillRect(80, 380, 640, 120);
        g.fillStyle = "#e8620c";
        g.fillRect(120, 300, 40, 200);
        return c.toDataURL("image/jpeg", 0.8);
      })
    ).split(",")[1],
    "base64",
  );

  /* 1 - Startseite und Beispiel-PDF ------------------------------------ */
  check("Startseite lädt", await page.getByRole("heading", { name: /Das Bautagebuch schreibt sich/ }).isVisible());
  await keinSeitwaertsScrollen(page, "Startseite");
  await shot(page, "01-startseite");
  const beispiel = await fetch(`${BASE}/bautagebuch/beispiel.pdf`);
  const beispielBytes = Buffer.from(await beispiel.arrayBuffer());
  check("Beispiel-PDF ist ein PDF", beispielBytes.subarray(0, 4).toString() === "%PDF", `${beispielBytes.length} Bytes`);
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, "beispiel.pdf"), beispielBytes);

  /* 2 - Geschützte Bereiche ---------------------------------------------- */
  await page.goto(`${BASE}/bautagebuch/app`);
  check("Ohne Anmeldung -> Login", page.url().includes("/bautagebuch/login"));
  check("API ohne Anmeldung -> 401", (await fetch(`${BASE}/api/bautagebuch/eintraege/1/pdf`)).status === 401);

  /* 3 - Registrieren ------------------------------------------------------ */
  await page.goto(`${BASE}/bautagebuch/start`);
  await page.getByLabel("Name des Betriebs").fill("Becker Bedachungen GmbH");
  await page.getByLabel("Ihr Name").fill("Anna Becker");
  await page.getByRole("button", { name: "Kostenlos starten" }).click();
  await page.waitForURL("**/bautagebuch/app/team?neu=1");
  const code = (await page.getByTestId("zugangscode").textContent()).trim();
  check("Registrierung zeigt Zugangscode", /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code), code);
  check("Telegram-Link vorhanden", await page.getByRole("link", { name: "Telegram-Bot verbinden" }).isVisible());
  await shot(page, "02-team");

  /* 4 - Baustelle anlegen --------------------------------------------------- */
  await page.goto(`${BASE}/bautagebuch/app/baustellen`);
  await page.getByLabel("Bezeichnung *").fill("EFH Müller");
  await page.getByLabel("Ort (für das Wetter)").fill("Freiburg");
  await page.getByLabel("Auftraggeber / Bauherr").fill("Familie Müller");
  await page.getByRole("button", { name: "Baustelle anlegen" }).click();
  await page.getByText("Baustelle „EFH Müller“ angelegt.").waitFor();
  check("Baustelle angelegt", await page.getByRole("link", { name: /EFH Müller/ }).isVisible());
  check("Ort wurde nachgeschlagen", aufrufe.some((a) => a.pfad === "/v1/search"));

  /* 5 - Eintrag per Foto + Sprachnachricht -------------------------------------- */
  await page.goto(`${BASE}/bautagebuch/app`);
  await keinSeitwaertsScrollen(page, "Übersicht");
  await page.getByRole("link", { name: /EFH Müller/ }).first().click();
  await page.waitForURL("**/bautagebuch/app/neu?baustelle=*");
  await page.getByTestId("foto-input").setInputFiles({ name: "baustelle.jpg", mimeType: "image/jpeg", buffer: testJpeg });
  await page.getByAltText("Foto 1").waitFor();
  check("Foto-Vorschau erscheint", await page.getByAltText("Foto 1").isVisible());
  await page.getByRole("button", { name: "Aufnahme starten" }).click();
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Aufnahme beenden" }).click();
  await page.getByText(/Aufnahme: 0:0[1-3]/).waitFor();
  check("Sprachnachricht aufgenommen", true);
  await keinSeitwaertsScrollen(page, "Erfassung");
  await shot(page, "03-erfassung");
  await page.getByRole("button", { name: /Bautagebuch erstellen/ }).click();
  await page.waitForURL("**/bautagebuch/app/eintrag/*?neu=1*", { timeout: 30000 });
  check("Eintrag erstellt", await page.getByText("Eintrag erstellt.").isVisible());

  const transkriptAufruf = aufrufe.find((a) => a.pfad === "/openai/audio/transcriptions");
  check("Sprachnachricht an Spracherkennung geschickt", transkriptAufruf && transkriptAufruf.body.length > 1000);
  const kiAufruf = aufrufe.find((a) => a.pfad === "/openai/chat/completions");
  const kiBody = kiAufruf ? JSON.parse(kiAufruf.body.toString()) : null;
  check(
    "KI bekommt Transkript und Foto",
    kiBody &&
      JSON.stringify(kiBody).includes("Fundament geschalt") &&
      JSON.stringify(kiBody).includes("data:image/jpeg;base64"),
  );
  check("Wetter mit Handy-GPS abgefragt", aufrufe.some((a) => a.pfad === "/v1/forecast"));
  check("Felder aus der KI übernommen", (await page.getByLabel("Ausgeführte Leistungen").inputValue()).includes("Streifenfundamente"));
  check("Gemessenes Wetter angezeigt", await page.getByText(/Leichter Regen, 8 bis 13 °C/).isVisible());
  check("Fehlende Angabe wird gemeldet", await page.getByText(/Nicht erwähnt:/).isVisible());
  check("Originalfoto wird angezeigt", await page.locator('img[alt="Foto 1"]').evaluate((img) => img.naturalWidth > 0));
  await keinSeitwaertsScrollen(page, "Eintrag");
  await shot(page, "04-eintrag-entwurf");
  const eintragUrl = page.url().split("?")[0];
  const eintragId = Number(eintragUrl.split("/").pop());

  // Entwurfs-PDF
  const cookies = (await context.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
  const entwurfPdf = await fetch(`${BASE}/api/bautagebuch/eintraege/${eintragId}/pdf`, { headers: { cookie: cookies } });
  check("Entwurfs-PDF lädt", entwurfPdf.ok && entwurfPdf.headers.get("content-type") === "application/pdf");

  /* 6 - Ergänzen und abschließen ------------------------------------------------ */
  await page.getByLabel("Material / Lieferungen / Geräte").fill("Schalungsmaterial, 12 Stk. Bewehrungskörbe");
  await page.getByRole("button", { name: "Prüfen & abschließen" }).click();
  await page.waitForURL("**?abgeschlossen=1");
  check("Abgeschlossen als Nr. 1", await page.getByText("Abgeschlossen als Nr. 1.").isVisible());
  check("Ergänzung vor dem Abschluss gespeichert", await page.getByText("12 Stk. Bewehrungskörbe").isVisible());
  check("Felder nicht mehr bearbeitbar", (await page.getByLabel("Ausgeführte Leistungen").count()) === 0);
  const hash = (await page.locator("dd.font-mono").textContent()).trim();
  check("Prüfsumme vergeben", /^[0-9a-f]{64}$/.test(hash));

  const finalPdf = Buffer.from(
    await (await fetch(`${BASE}/api/bautagebuch/eintraege/${eintragId}/pdf`, { headers: { cookie: cookies } })).arrayBuffer(),
  );
  check("Final-PDF ist ein PDF", finalPdf.subarray(0, 4).toString() === "%PDF", `${finalPdf.length} Bytes`);
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, "eintrag.pdf"), finalPdf);

  // Nachtrag
  await page.getByLabel("Nachtrag hinzufügen").fill("Lieferschein Beton nachgereicht: Ankunft 11:05 Uhr.");
  await page.getByRole("button", { name: "Nachtrag speichern" }).click();
  await page.getByText("Nachtrag gespeichert.").waitFor();
  check("Nachtrag gespeichert", await page.getByText("Ankunft 11:05 Uhr").first().isVisible());
  await shot(page, "05-eintrag-abgeschlossen");

  /* 7 - Echtheitsprüfung und Manipulation ------------------------------------- */
  await page.goto(`${BASE}/bautagebuch/pruefen/${hash}`);
  check("Prüfseite: echt und unverändert", await page.getByText("Echt und unverändert").isVisible());
  await shot(page, "06-pruefen");

  const db = new Database(path.join(DATA_DIR, "bautagebuch.db"));
  const original = db.prepare("SELECT daten FROM eintraege WHERE id = ?").get(eintragId).daten;
  db.prepare("UPDATE eintraege SET daten = ? WHERE id = ?").run(original.replace("2 Stunden", "20 Minuten"), eintragId);
  await page.reload();
  check("Prüfseite erkennt geänderte Daten", await page.getByText("Abweichung festgestellt").isVisible());
  db.prepare("UPDATE eintraege SET daten = ? WHERE id = ?").run(original, eintragId);

  const foto = db.prepare("SELECT datei FROM medien WHERE eintrag_id = ? AND art = 'foto'").get(eintragId);
  const fotoPfad = path.join(DATA_DIR, "dateien", foto.datei);
  const fotoOriginal = fs.readFileSync(fotoPfad);
  fs.writeFileSync(fotoPfad, Buffer.concat([fotoOriginal, Buffer.from("x")]));
  await page.reload();
  check("Prüfseite erkennt ausgetauschtes Foto", await page.getByText("Abweichung festgestellt").isVisible());
  fs.writeFileSync(fotoPfad, fotoOriginal);
  await page.reload();
  check("Nach Rückbau wieder echt", await page.getByText("Echt und unverändert").isVisible());

  await page.goto(`${BASE}/bautagebuch/pruefen/${"0".repeat(64)}`);
  check("Unbekannte Prüfsumme", await page.getByRole("heading", { name: /Unbekannt/ }).isVisible());

  /* 8 - Mitarbeiter meldet sich mit Code an ---------------------------------------- */
  const ctx2 = await browser.newContext(handy);
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/bautagebuch/login?code=${code}`);
  await p2.getByLabel("Ihr Name").fill("Jonas Kran");
  await p2.getByRole("button", { name: "Anmelden" }).click();
  await p2.waitForURL("**/bautagebuch/app");
  check("Mitarbeiter sieht Einträge des Betriebs", await p2.getByText("Streifenfundamente").first().isVisible());

  // Demo-Ersatz: nur Text, ohne Foto
  await p2.goto(`${BASE}/bautagebuch/app/neu`);
  await p2.getByRole("button", { name: "Lieber tippen" }).click();
  await p2.getByLabel("Oder eintippen").fill("Dachrinne montiert, Gerüst abgebaut.");
  await p2.getByRole("button", { name: /Bautagebuch erstellen/ }).click();
  await p2.waitForURL("**/bautagebuch/app/eintrag/*", { timeout: 30000 });
  check("Text-Eintrag vom Mitarbeiter", await p2.getByText(/von Jonas Kran/).isVisible());

  // Falscher Code
  const ctx3 = await browser.newContext(handy);
  const p3 = await ctx3.newPage();
  await p3.goto(`${BASE}/bautagebuch/login`);
  await p3.getByLabel("Zugangscode des Betriebs").fill("AAAA-BBBB-CCCC");
  await p3.getByLabel("Ihr Name").fill("Fremd");
  await p3.getByRole("button", { name: "Anmelden" }).click();
  await p3.getByText("Diesen Zugangscode gibt es nicht.").waitFor({ timeout: 5000 }).catch(() => {});
  check("Falscher Code abgelehnt", await p3.getByText("Diesen Zugangscode gibt es nicht.").isVisible());

  // Anderer Betrieb sieht nichts
  await p3.goto(`${BASE}/bautagebuch/start`);
  await p3.getByLabel("Name des Betriebs").fill("Fremdbau");
  await p3.getByLabel("Ihr Name").fill("Fremd");
  await p3.getByRole("button", { name: "Kostenlos starten" }).click();
  await p3.waitForURL("**/team?neu=1");
  const fremdCookies = (await ctx3.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
  const fremdPdf = await fetch(`${BASE}/api/bautagebuch/eintraege/${eintragId}/pdf`, { headers: { cookie: fremdCookies } });
  check("Anderer Betrieb: Eintrag nicht abrufbar", fremdPdf.status === 404);
  const fotoId = db.prepare("SELECT id FROM medien WHERE eintrag_id = ? AND art = 'foto'").get(eintragId).id;
  const fremdFoto = await fetch(`${BASE}/api/bautagebuch/medien/${fotoId}`, { headers: { cookie: fremdCookies } });
  check("Anderer Betrieb: Foto nicht abrufbar", fremdFoto.status === 404);
  const fremdSeite = await p3.goto(`${BASE}/bautagebuch/app/eintrag/${eintragId}`);
  check("Anderer Betrieb: Seite 404", fremdSeite.status() === 404, `HTTP ${fremdSeite.status()}`);

  /* 9 - Telegram-Bot ------------------------------------------------------------- */
  const ohneSecret = await fetch(`${BASE}/api/bautagebuch/telegram`, { method: "POST", body: "{}" });
  check("Webhook ohne Geheimnis abgelehnt", ohneSecret.status === 401);

  await telegram(nachricht({ text: `/start ${code}` }));
  const verbunden = await warteAuf(() =>
    telegramAufrufe("sendMessage").some((a) => a.body.toString().includes("Verbunden mit")),
  );
  check("Telegram: Chat verbunden", verbunden);

  await telegram(nachricht({ photo: [{ file_id: "foto1", width: 800, height: 600 }] }));
  check(
    "Telegram: Foto bestätigt",
    await warteAuf(() => telegramAufrufe("sendMessage").some((a) => a.body.toString().includes("Foto gespeichert"))),
  );

  const doppelt = nachricht({ voice: { file_id: "voice1", mime_type: "audio/ogg", duration: 14 } });
  await telegram(doppelt);
  await telegram(doppelt); // Telegram stellt manchmal doppelt zu
  const pdfGesendet = await warteAuf(() => telegramAufrufe("sendDocument").length > 0, 20000);
  check("Telegram: PDF zurückgeschickt", pdfGesendet);
  await new Promise((r) => setTimeout(r, 800));
  check("Telegram: doppelte Zustellung nur einmal verarbeitet", telegramAufrufe("sendDocument").length === 1);

  const tgEintrag = db.prepare("SELECT * FROM eintraege WHERE quelle = 'telegram'").get();
  check("Telegram: Eintrag mit Foto + Audio", tgEintrag && db.prepare("SELECT COUNT(*) c FROM medien WHERE eintrag_id = ?").get(tgEintrag.id).c === 2);
  check("Telegram: erfasst von Telegram-Name", tgEintrag?.erfasst_von === "Kai Dachs");
  const caption = telegramAufrufe("sendDocument")[0].body.toString();
  check("Telegram: Zusammenfassung im PDF-Text", caption.includes("Streifenfundamente") && caption.includes("ab:"));

  await telegram({
    update_id: ++updateId,
    callback_query: { id: "cb1", from: { first_name: "Kai" }, data: `ab:${tgEintrag.id}`, message: { chat: { id: 4711 }, message_id: 5 } },
  });
  const zweitesPdf = await warteAuf(() => telegramAufrufe("sendDocument").length === 2);
  const abgeschlossen = db.prepare("SELECT status, nr FROM eintraege WHERE id = ?").get(tgEintrag.id);
  check("Telegram: per Knopf abgeschlossen als Nr. 2", zweitesPdf && abgeschlossen.status === "abgeschlossen" && abgeschlossen.nr === 2);

  /* 10 - Erinnerung ---------------------------------------------------------------- */
  const ohneCron = await fetch(`${BASE}/api/bautagebuch/erinnerung`, { method: "POST" });
  check("Erinnerung ohne Geheimnis abgelehnt", ohneCron.status === 401);
  const erinnerung = await fetch(`${BASE}/api/bautagebuch/erinnerung`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const er = await erinnerung.json();
  check("Erinnerung: heute schon erfasst -> keine Nachricht", erinnerung.ok && er.gesendet === 0);

  /* 11 - Baustellen-Bericht ------------------------------------------------------- */
  const bs = db.prepare("SELECT id FROM baustellen WHERE name = 'EFH Müller'").get();
  const bericht = Buffer.from(
    await (await fetch(`${BASE}/api/bautagebuch/baustellen/${bs.id}/pdf`, { headers: { cookie: cookies } })).arrayBuffer(),
  );
  check("Gesamt-PDF der Baustelle", bericht.subarray(0, 4).toString() === "%PDF", `${bericht.length} Bytes`);
  if (SHOTS) fs.writeFileSync(path.join(SHOTS, "bericht.pdf"), bericht);

  await page.goto(`${BASE}/bautagebuch/app/baustellen/${bs.id}`);
  await keinSeitwaertsScrollen(page, "Baustelle");
  await shot(page, "07-baustelle");

  /* 12 - Code erneuern meldet andere ab ----------------------------------------- */
  await page.goto(`${BASE}/bautagebuch/app/team`);
  await page.getByRole("button", { name: "Neuen Zugangscode erzeugen" }).click();
  await page.waitForFunction((alt) => document.querySelector("[data-testid=zugangscode]")?.textContent.trim() !== alt, code);
  check("Eigene Anmeldung bleibt nach Codewechsel", page.url().includes("/team"));
  await p2.goto(`${BASE}/bautagebuch/app`);
  check("Mitarbeiter nach Codewechsel abgemeldet", p2.url().includes("/login"));

  db.close();
  check("Keine Fehler in der Browser-Konsole", fehler.length === 0, fehler.slice(0, 3).join(" | "));
} catch (err) {
  console.error(err);
  check("Test ohne Absturz durchgelaufen", false, err.message);
} finally {
  await browser.close();
  stoppeServer();
  mock.close();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
}

const fehlgeschlagen = results.filter((r) => !r.ok);
console.log(`\n${results.length - fehlgeschlagen.length}/${results.length} Prüfungen bestanden.`);
if (fehlgeschlagen.length) {
  console.log("\nServer-Log (Ende):\n" + serverLog.slice(-3000));
  process.exit(1);
}
