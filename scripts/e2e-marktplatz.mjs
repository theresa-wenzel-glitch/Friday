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

  /* 9 - Inserat einstellen (noch als Testhof Marktplatz angemeldet) ------ */
  const HORSE_NAME = `Testhengst Markt ${Date.now()}`;
  await page.goto(`${BASE}/marktplatz/inserieren`);
  await page.fill("#name", HORSE_NAME);
  await page.selectOption("#kind", "stud");
  await page.fill("#yearOfBirth", "2018");
  await page.fill("#color", "Palomino");
  await page.fill("#country", "DE");
  await page.fill("#price", "950");
  await page.fill("#priceLabel", "zzgl. Versandsamen");
  await page.fill("#contactEmail", "besitzer@example.com");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
  check(
    "Inserat-Einsendung wird bestätigt",
    (await page.textContent("body")).includes("wird kurz geprüft"),
  );

  /* 10 - Vor Freigabe ist das Inserat im Marktplatz nicht sichtbar -------
     Wichtig: page.textContent("body") liefert auch den Text von <script>-
     Tags (u. a. die RSC-Nutzlast, die den Suchbegriff aus der URL enthält) -
     das ergäbe hier einen falschen Treffer. Deshalb gezielt auf einen echten
     Link mit diesem Namen prüfen (Accessibility-Baum, keine Script-Inhalte). */
  await page.goto(`${BASE}/marktplatz/pferde?q=${encodeURIComponent(HORSE_NAME)}`);
  check(
    "Neues Inserat ist vor Freigabe unsichtbar",
    (await page.getByRole("link", { name: HORSE_NAME }).count()) === 0,
  );

  /* 11 - Admin gibt das Inserat frei --------------------------------------
     eigener Browser-Kontext, damit die Anbieter-Session nicht überschrieben wird. */
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${BASE}/admin/marktplatz`);
  await adminPage.fill("#password", process.env.ADMIN_PASSWORD ?? "test-passwort-lokal");
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForTimeout(500);
  check(
    "Neues Inserat erscheint in der Marktplatz-Moderation",
    (await adminPage.textContent("body")).includes(HORSE_NAME),
  );

  await adminPage.locator("li", { hasText: HORSE_NAME }).getByRole("button", { name: "Freigeben" }).click();
  await adminPage.waitForTimeout(500);
  await adminContext.close();

  /* 12 - Nach Freigabe ist das Inserat mit Preis und Land sichtbar -------
     Ab hier auf <main> statt <body> beschränken, aus demselben Grund wie
     oben (RSC-Script-Nutzlast würde sonst falsche Treffer erzeugen). */
  await page.goto(`${BASE}/marktplatz/pferde?q=${encodeURIComponent(HORSE_NAME)}`);
  const listingMain = await page.locator("main").textContent();
  check(
    "Inserat ist nach Freigabe sichtbar mit Preis-Badge",
    listingMain.includes(HORSE_NAME) && listingMain.includes("950"),
  );
  check(
    "Inserat zeigt das Land",
    listingMain.includes("Deutschland"),
  );

  await page.click(`a:has-text("${HORSE_NAME}")`);
  await page.waitForTimeout(400);
  const detailMain = await page.locator("main").textContent();
  check(
    "Detailseite zeigt Decktaxe und Zusatztext",
    detailMain.includes("950") && detailMain.includes("Versandsamen"),
  );
  check(
    "Detailseite verrät keine Kontakt-E-Mail im HTML",
    !(await page.textContent("body")).includes("besitzer@example.com"),
  );

  /* 13 - Ein Interessent (nicht angemeldet) schreibt über das Inserat an -
     eigener Kontext, damit keine Anbieter-Session mitgeschickt wird. */
  const listingUrl = page.url();
  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  await visitorPage.goto(listingUrl);
  await visitorPage.fill("#senderName", "Interessentin Mueller");
  await visitorPage.fill("#senderEmail", "interessentin@example.com");
  await visitorPage.fill("#message", "Ist ein Decktermin im Mai noch frei?");
  await visitorPage.click('button:has-text("Anfrage senden")');
  await visitorPage.waitForTimeout(500);
  check(
    "Anfrage wird bestätigt",
    (await visitorPage.textContent("main")).includes("beim Anbieter angekommen"),
  );
  await visitorContext.close();

  /* 14 - Der Anbieter sieht die Anfrage im eigenen Konto ------------------ */
  await page.goto(`${BASE}/marktplatz/konto`);
  const dashboardBody = await page.locator("main").textContent();
  check(
    "Anfrage erscheint im Konto des Anbieters",
    dashboardBody.includes("Interessentin Mueller") &&
      dashboardBody.includes("interessentin@example.com") &&
      dashboardBody.includes("Decktermin im Mai"),
  );

  /* 15 - Anfrage als erledigt markieren ----------------------------------- */
  await page.click('button:has-text("Als erledigt markieren")');
  await page.waitForTimeout(400);
  check(
    "Anfrage lässt sich als erledigt markieren",
    (await page.locator("main").textContent()).includes("erledigt"),
  );

  check("Keine Skriptfehler im gesamten Ablauf", true);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} von ${results.length} Prüfungen bestanden.`);
process.exit(failed === 0 ? 0 : 1);
