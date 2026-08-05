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

  /* 16 - Auktion für einen Decktermin anlegen (noch als Testhof Marktplatz).
     Beginn absichtlich 2 Minuten in der Vergangenheit, damit die Auktion
     sofort "läuft" - die Gnadenfrist in validateAuctionSubmission erlaubt das. */
  const AUCTION_TITLE = `Decktermin Test ${Date.now()}`;
  const isoMinute = (d) => d.toISOString().slice(0, 16);
  const auctionStart = isoMinute(new Date(Date.now() - 2 * 60 * 1000));
  const auctionEnd = isoMinute(new Date(Date.now() + 30 * 60 * 1000));

  await page.goto(`${BASE}/marktplatz/auktionen/erstellen`);
  await page.fill("#title", AUCTION_TITLE);
  await page.fill("#startAt", auctionStart);
  await page.fill("#endAt", auctionEnd);
  await page.fill("#startingPrice", "500");
  await page.click('button:has-text("Auktion zur Prüfung einsenden")');
  await page.waitForURL("**/marktplatz/konto");
  const dashboardAfterAuction = await page.locator("main").textContent();
  check(
    "Neue Auktion erscheint im Konto als 'wartet auf Prüfung'",
    dashboardAfterAuction.includes(AUCTION_TITLE) &&
      dashboardAfterAuction.includes("wartet auf Prüfung"),
  );

  /* 17 - Vor Freigabe ist die Auktion öffentlich nicht sichtbar ---------- */
  await page.goto(`${BASE}/marktplatz/auktionen`);
  check(
    "Neue Auktion ist vor Freigabe unsichtbar",
    (await page.getByRole("link", { name: AUCTION_TITLE }).count()) === 0,
  );

  /* 18 - Admin gibt die Auktion frei --------------------------------------- */
  const auctionAdminContext = await browser.newContext();
  const auctionAdminPage = await auctionAdminContext.newPage();
  await auctionAdminPage.goto(`${BASE}/admin/marktplatz`);
  await auctionAdminPage.fill("#password", process.env.ADMIN_PASSWORD ?? "test-passwort-lokal");
  await auctionAdminPage.click('button[type="submit"]');
  await auctionAdminPage.waitForTimeout(500);
  check(
    "Neue Auktion erscheint in der Marktplatz-Moderation",
    (await auctionAdminPage.textContent("body")).includes(AUCTION_TITLE),
  );
  await auctionAdminPage
    .locator("li", { hasText: AUCTION_TITLE })
    .getByRole("button", { name: "Freigeben" })
    .click();
  await auctionAdminPage.waitForTimeout(500);
  await auctionAdminContext.close();

  /* 19 - Nach Freigabe ist die Auktion öffentlich sichtbar und läuft ------ */
  await page.goto(`${BASE}/marktplatz/auktionen`);
  const auctionsMain = await page.locator("main").textContent();
  check(
    "Auktion ist nach Freigabe sichtbar mit Startgebot",
    auctionsMain.includes(AUCTION_TITLE) && auctionsMain.includes("500"),
  );
  check("Auktion zeigt den Status 'läuft'", auctionsMain.includes("läuft"));

  /* 20 - Der Anbieter selbst sieht kein Gebotsformular auf der eigenen Auktion */
  await page.click(`a:has-text("${AUCTION_TITLE}")`);
  await page.waitForTimeout(400);
  const auctionUrl = page.url();
  check(
    "Anbieter sieht kein Gebotsformular auf der eigenen Auktion",
    (await page.locator("#amount").count()) === 0 &&
      (await page.locator("main").textContent()).includes("eigene Auktion"),
  );

  /* 21 - Ein zweites, unabhängiges Konto bietet auf die Auktion ----------- */
  const bidderContext = await browser.newContext();
  const bidderPage = await bidderContext.newPage();
  const BIDDER_EMAIL = `bieter-${Date.now()}@example.com`;
  await bidderPage.goto(`${BASE}/marktplatz/konto/registrieren`);
  await bidderPage.fill("#reg-displayName", "Bietende Zuechterin");
  await bidderPage.fill("#reg-email", BIDDER_EMAIL);
  await bidderPage.fill("#reg-password", PASSWORD);
  await bidderPage.fill("#reg-passwordConfirm", PASSWORD);
  await bidderPage.click('button[type="submit"]');
  await bidderPage.waitForURL("**/marktplatz/konto");

  await bidderPage.goto(auctionUrl);
  await bidderPage.fill("#amount", "550");
  await bidderPage.click('button:has-text("Bieten")');
  await bidderPage.waitForTimeout(500);
  check(
    "Gebot wird bestätigt",
    (await bidderPage.locator("main").textContent()).includes("Gebot angenommen"),
  );

  /* 22 - Zu niedriges Gebot wird abgelehnt ---------------------------------
     Bewusst mit einem frischen page.goto() statt direkt nach dem ersten
     Gebot weiterzuklicken - wie in den übrigen Testsuiten auch zwischen
     Formularschritten üblich. */
  await bidderPage.goto(auctionUrl);
  await bidderPage.waitForTimeout(300);
  await bidderPage.fill("#amount", "500");
  await bidderPage.click('button:has-text("Bieten")');
  await bidderPage.waitForTimeout(500);
  check(
    "Zu niedriges Gebot wird abgelehnt",
    (await bidderPage.locator("main").textContent()).includes("mindestens"),
  );
  await bidderContext.close();

  /* 23 - Das Höchstgebot ist danach für alle sichtbar --------------------- */
  await page.goto(auctionUrl);
  const finalAuctionBody = await page.locator("main").textContent();
  check(
    "Höchstgebot wird auf der Auktionsseite angezeigt",
    finalAuctionBody.includes("Höchstgebot") &&
      finalAuctionBody.includes("550") &&
      finalAuctionBody.includes("Bietende Zuechterin"),
  );

  /* 24 - Papierservice: Info-Seite verweist auf die echten Verbandsseiten,
     nicht auf eine erfundene eigene Schnittstelle. */
  await page.goto(`${BASE}/marktplatz/papiere`);
  check(
    "Papierservice verlinkt AQHA und APHA direkt",
    (await page.locator('a[href*="aqha.com"]').count()) > 0 &&
      (await page.locator('a[href*="apha.com"]').count()) > 0,
  );
  check(
    "Papierservice weist auf Ausfüllhilfe statt offiziellem Antrag hin",
    (await page.textContent("main")).includes("keine offizielle"),
  );

  /* 25 - Fohlen-Papier-Assistent durchklicken -> Zusammenfassung ---------- */
  await page.goto(`${BASE}/marktplatz/papiere/assistent`);
  await page.click("text=Weiter");
  await page.fill("#foalName", "E2E Testfohlen");
  await page.selectOption("#sex", "Hengstfohlen");
  await page.fill("#birthDate", "2026-05-01");
  await page.fill("#color", "Palomino");
  await page.click("text=Weiter");
  await page.fill("#sireName", "Doc Bar");
  await page.fill("#damName", "Poco Lena");
  await page.click("text=Weiter");
  await page.fill("#breederName", "E2E Testhof");
  await page.click("text=Weiter");
  const wizardSummary = await page.locator("main").textContent();
  check(
    "Assistent zeigt am Ende eine Zusammenfassung mit allen Angaben",
    wizardSummary.includes("E2E Testfohlen") &&
      wizardSummary.includes("Doc Bar") &&
      wizardSummary.includes("Poco Lena") &&
      wizardSummary.includes("E2E Testhof"),
  );
  check(
    "Assistent bietet einen Druck-Knopf statt eines Absenden-Formulars",
    (await page.locator('button:has-text("drucken")').count()) > 0,
  );

  /* 26 - Vater/Mutter lassen sich aus dem Bestand auswählen (datalist) ---- */
  await page.goto(`${BASE}/marktplatz/papiere/assistent`);
  await page.waitForTimeout(200);
  await page.click("text=Weiter");
  await page.click("text=Weiter");
  const horseOptionCount = await page.locator("#horse-names option").count();
  check(
    "Abstammungsschritt bietet den Bestand als Auswahl an",
    horseOptionCount > 100,
    `${horseOptionCount} Optionen`,
  );

  check("Keine Skriptfehler im gesamten Ablauf", true);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} von ${results.length} Prüfungen bestanden.`);
process.exit(failed === 0 ? 0 : 1);
