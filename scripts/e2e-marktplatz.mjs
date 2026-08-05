/**
 * Marktplatz-Testsuite. Voraussetzung: Server läuft unter BASE
 * (Standard http://localhost:3111) mit den Werten aus .env.local.
 *
 *   node scripts/e2e-marktplatz.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3111";

const results = [];
function check(label, condition, detail = "") {
  results.push({ label, ok: Boolean(condition), detail });
  console.log(`${condition ? "OK  " : "FEHL"} ${label}${detail ? ` - ${detail}` : ""}`);
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", (e) => console.log("  [Browser-Fehler]", e.message));

const EMAIL = `hof-${Date.now()}@example.com`;
const PASSWORD = "sehr-sicheres-passwort-123";

try {
  /* 1 - Marktplatz-Startseite ohne Login -------------------------------- */
  await page.goto(`${BASE}/marktplatz`);
  check(
    "Marktplatz-Seite zeigt Registrieren/Anmelden ohne Login",
    (await page.getByRole("link", { name: "Konto anlegen" }).count()) > 0,
  );

  /* 2 - Konto-Dashboard ohne Login leitet zum Login um ------------------ */
  await page.goto(`${BASE}/marktplatz/konto`);
  check(
    "Konto-Seite ohne Login leitet zur Anmeldung um",
    page.url().includes("/marktplatz/konto/anmelden"),
    page.url(),
  );

  /* 3 - Registrierung ----------------------------------------------------*/
  await page.goto(`${BASE}/marktplatz/konto/registrieren`);
  await page.fill("#reg-displayName", "Testhof Marktplatz");
  await page.fill("#reg-email", EMAIL);
  await page.fill("#reg-password", PASSWORD);
  await page.fill("#reg-passwordConfirm", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/marktplatz/konto");

  check(
    "Nach Registrierung landet man im Konto-Dashboard",
    page.url().endsWith("/marktplatz/konto"),
  );
  check(
    "Dashboard zeigt den eingetragenen Namen",
    (await page.textContent("body")).includes("Testhof Marktplatz"),
  );
  check(
    "Dashboard zeigt die eingetragene E-Mail",
    (await page.textContent("body")).includes(EMAIL),
  );

  /* 5 - Abmelden ---------------------------------------------------------*/
  await page.goto(`${BASE}/marktplatz/konto`);
  await page.click('button:has-text("Abmelden")');
  await page.waitForURL("**/marktplatz");
  check("Abmelden führt zurück zum Marktplatz", page.url().endsWith("/marktplatz"));

  await page.goto(`${BASE}/marktplatz/konto`);
  check(
    "Nach Abmelden ist das Konto wieder gesperrt",
    page.url().includes("/marktplatz/konto/anmelden"),
  );

  /* 6 - Erneute Registrierung mit derselben E-Mail schlägt fehl ---------- */
  await page.goto(`${BASE}/marktplatz/konto/registrieren`);
  await page.fill("#reg-displayName", "Zweiter Versuch");
  await page.fill("#reg-email", EMAIL);
  await page.fill("#reg-password", PASSWORD);
  await page.fill("#reg-passwordConfirm", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(400);
  check(
    "Doppelte E-Mail wird bei der Registrierung abgelehnt",
    (await page.textContent("body")).includes("bereits ein Konto"),
  );

  /* 7 - Login mit dem zuerst angelegten Konto ---------------------------- */
  await page.goto(`${BASE}/marktplatz/konto/anmelden`);
  await page.fill("#login-email", EMAIL);
  await page.fill("#login-password", "falsches-passwort");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(400);
  check(
    "Falsches Passwort wird abgelehnt",
    (await page.textContent("body")).includes("stimmt nicht"),
  );

  await page.fill("#login-password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/marktplatz/konto");
  check("Login mit richtigem Passwort funktioniert", page.url().endsWith("/marktplatz/konto"));

  /* 8 - Session übersteht einen neuen Tab im selben Kontext (Cookie ist
     httpOnly + persistent) - browser.newPage() allein würde einen neuen,
     isolierten Kontext ohne die Cookies erzeugen, deshalb explizit
     page.context() wiederverwenden. */
  const page2 = await context.newPage();
  await page2.goto(`${BASE}/marktplatz/konto`);
  check(
    "Session gilt auch in einem neuen Tab (selber Browser-Kontext)",
    page2.url().endsWith("/marktplatz/konto"),
  );
  await page2.close();

  check("Keine Skriptfehler im gesamten Ablauf", true);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} von ${results.length} Prüfungen bestanden.`);
process.exit(failed === 0 ? 0 : 1);
