/**
 * Prüft den Foto-Upload im Eintragungsformular: echte Datei hochladen,
 * Validierung (Grösse, Dateityp), Anzeige-Route, Platzhalter ohne Foto.
 *
 *   BASE=http://localhost:3200 node scripts/e2e-upload.mjs
 */
import { chromium } from "playwright";
import { Buffer } from "node:buffer";

const BASE = process.env.BASE ?? "http://localhost:3200";

const results = [];
function check(label, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "OK  " : "FEHL"} ${label}${detail ? ` - ${detail}` : ""}`);
}

// Ein winziges, aber echtes 1x1-PNG (gültige Magic Bytes).
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("  [Browser-Fehler]", e.message));

try {
  /* 1 - Direkter Aufruf der Upload-Route mit einer echten PNG-Datei -------- */
  const goodUpload = await page.request.post(`${BASE}/api/upload`, {
    multipart: { photo: { name: "test.png", mimeType: "image/png", buffer: PNG_1PX } },
  });
  check("Echtes PNG wird angenommen", goodUpload.status() === 201, `Status ${goodUpload.status()}`);
  const goodBody = await goodUpload.json();
  check(
    "Antwort enthält eine /api/uploads/-Adresse",
    typeof goodBody.url === "string" && goodBody.url.startsWith("/api/uploads/"),
    goodBody.url,
  );

  /* 2 - Die hochgeladene Datei lässt sich abrufen -------------------------- */
  const fetchBack = await page.request.get(`${BASE}${goodBody.url}`);
  check("Hochgeladene Datei ist abrufbar", fetchBack.status() === 200);
  check(
    "Content-Type stimmt",
    fetchBack.headers()["content-type"] === "image/png",
    fetchBack.headers()["content-type"],
  );
  const bytesBack = await fetchBack.body();
  check("Abgerufene Bytes stimmen mit dem Original überein", bytesBack.equals(PNG_1PX));

  /* 3 - Vorgetäuschter Dateityp wird anhand der Bytes erkannt -------------- */
  const fakeUpload = await page.request.post(`${BASE}/api/upload`, {
    multipart: {
      photo: {
        name: "test.png",
        mimeType: "image/png",
        buffer: Buffer.from("<script>alert(1)</script>", "utf8"),
      },
    },
  });
  check(
    "Text mit vorgetäuschtem Bild-MIME-Typ wird abgelehnt",
    fakeUpload.status() === 400,
    `Status ${fakeUpload.status()}`,
  );

  /* 4 - SVG wird abgelehnt (Skript-Risiko) --------------------------------- */
  const svgUpload = await page.request.post(`${BASE}/api/upload`, {
    multipart: {
      photo: {
        name: "test.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from('<svg onload="alert(1)"></svg>', "utf8"),
      },
    },
  });
  check("SVG wird abgelehnt", svgUpload.status() === 400, `Status ${svgUpload.status()}`);

  /* 5 - Zu grosse Datei wird abgelehnt ------------------------------------- */
  const bigBuffer = Buffer.alloc(9 * 1024 * 1024, 0);
  PNG_1PX.copy(bigBuffer, 0);
  const bigUpload = await page.request.post(`${BASE}/api/upload`, {
    multipart: { photo: { name: "big.png", mimeType: "image/png", buffer: bigBuffer } },
  });
  check("Zu grosse Datei (9 MB) wird abgelehnt", bigUpload.status() === 400);

  /* 6 - Pfad-Traversal über den Dateinamen der Anzeige-Route --------------- */
  const traversal = await page.request.get(`${BASE}/api/uploads/..%2F..%2Fpackage.json`, {
    failOnStatusCode: false,
  });
  check(
    "Pfad-Traversal beim Abrufen wird verweigert",
    traversal.status() === 404,
    `Status ${traversal.status()}`,
  );

  const randomName = await page.request.get(`${BASE}/api/uploads/nicht-vorhanden.jpg`, {
    failOnStatusCode: false,
  });
  check("Frei erfundener Dateiname liefert 404", randomName.status() === 404);

  /* 7 - Im echten Formular: Datei auswählen, Vorschau erscheint ----------- */
  await page.goto(`${BASE}/eintragen`, { waitUntil: "networkidle" });
  await page.fill("#name", `Fototest ${Date.now()}`);
  await page.fill("#contactEmail", "foto@example.com");

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.click('button:has-text("Bild hochladen")'),
  ]);
  await fileChooser.setFiles({
    name: "hengst.png",
    mimeType: "image/png",
    buffer: PNG_1PX,
  });
  await page.waitForTimeout(1500);

  check(
    "Nach dem Hochladen steht die URL im Textfeld",
    (await page.inputValue("#photoUrl")).startsWith("/api/uploads/"),
  );
  check(
    "Vorschaubild erscheint im Formular",
    (await page.locator('img[alt="Vorschau des Bilds"]').count()) > 0,
  );

  await page.check('input[name="consent"]');
  await page.click('button[type="submit"]');
  await page.waitForURL("**/eintragen/danke", { timeout: 15000 });
  check("Formular mit hochgeladenem Bild lässt sich absenden", true);

  /* 8 - Platzhalter ohne Foto: Startseite / Liste zeigen ein Monogramm ---- */
  await page.goto(`${BASE}/hengste`, { waitUntil: "networkidle" });
  const placeholderCount = await page
    .locator('[aria-label*="Kein Foto hinterlegt"]')
    .count();
  check(
    "Karten ohne Foto zeigen den Platzhalter",
    placeholderCount > 0,
    `${placeholderCount} Platzhalter auf der ersten Seite`,
  );

  await page.click(".grid > a >> nth=0");
  await page.waitForLoadState("networkidle");
  const detailPlaceholder = await page
    .locator('[aria-label*="Kein Foto hinterlegt"]')
    .count();
  const detailImg = await page.locator("figure img").count();
  check(
    "Detailseite zeigt immer ein Bild oder einen Platzhalter",
    detailPlaceholder > 0 || detailImg > 0,
  );
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} von ${results.length} Prüfungen bestanden.`);
process.exit(failed === 0 ? 0 : 1);
