// -*- coding: utf-8 -*-
// Testet die zusammengebaute Seite mit einem echten Browser (Playwright):
// klickt sich durch Start -> lokale Lobby -> Spiel -> ein paar Züge ->
// eigenes Tableau -> Missionen zeigen. Bricht bei der ersten Konsolen-
// Fehlermeldung oder einer fehlenden Erwartung ab.
//
//   NODE_PATH=/opt/node22/lib/node_modules node werkzeuge/teste_ui.js

const path = require("path");
const { chromium } = require("playwright");

const DATEI = "file://" + path.join(__dirname, "..", "online-spiel.html");
const SCRATCH = process.env.SCRATCH || "/tmp";

function warte(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const seite = await browser.newPage({ viewport: { width: 420, height: 860 } });
  const fehler = [];
  seite.on("console", function (msg) {
    if (msg.type() !== "error") return;
    // In dieser Sandbox hat der Test-Proxy kein gültiges Zertifikat für
    // fonts.googleapis.com — im echten Artifact-Viewer ist das kein Problem
    // (dort ist der Font-Host ausdrücklich erlaubt). Kein App-Fehler, ignorieren.
    if (/ERR_CERT_AUTHORITY_INVALID/.test(msg.text())) return;
    fehler.push(msg.text());
  });
  seite.on("pageerror", function (e) { fehler.push("pageerror: " + e.message); });

  await seite.goto(DATEI);
  await warte(300);

  console.log("1) Startseite");
  await seite.screenshot({ path: SCRATCH + "/ui-1-start.png" });
  await seite.click("#waehle-lokal");
  await warte(150);

  console.log("2) Lokale Lobby (4 Spieler)");
  await seite.click('button:has-text("4")');
  await seite.screenshot({ path: SCRATCH + "/ui-2-lobby.png" });

  console.log("2b) Online-Bildschirme (ohne echte Verbindung, Fallback prüfen)");
  await seite.click(".zurueck-link");
  await warte(100);
  await seite.click("#waehle-online-erstellen");
  await warte(400); // pruefeDbVerfuegbarkeit() braucht bis zu 10s zum Scheitern, wir schauen nur den Zwischenzustand an
  await seite.screenshot({ path: SCRATCH + "/ui-2b-online-erstellen.png" });
  await seite.click(".zurueck-link");
  await seite.click("#waehle-online-beitreten");
  await warte(150);
  await seite.screenshot({ path: SCRATCH + "/ui-2c-online-beitreten.png" });
  await seite.click(".zurueck-link");
  await warte(100);

  await seite.click("#waehle-lokal");
  await warte(100);
  await seite.click('button:has-text("4")');
  await seite.click('button:has-text("Spiel beginnen")');
  await warte(200);

  console.log("3) Spielbrett");
  await seite.screenshot({ path: SCRATCH + "/ui-3-brett.png" });
  const kopfText = await seite.textContent(".spielkopf");
  if (!/Runde 1/.test(kopfText)) throw new Error("Rundenanzeige fehlt: " + kopfText);

  console.log("4) Eigenes Tableau öffnen (erste Spielfigur antippen)");
  await seite.click(".spielfigur");
  await warte(150);
  await seite.screenshot({ path: SCRATCH + "/ui-4-tableau.png" });
  const tableauText = await seite.textContent(".tableau");
  if (!/verdeckt/.test(tableauText)) throw new Error("Missionen sollten verdeckt starten");

  console.log("5) Missionen aufdecken");
  await seite.click('.tableau button:has-text("Missionen zeigen")');
  await warte(120);
  await seite.screenshot({ path: SCRATCH + "/ui-5-missionen.png" });
  const missionskarten = await seite.$$(".missionskarte");
  if (missionskarten.length === 0) throw new Error("Nach dem Aufdecken sollten Missionskarten sichtbar sein");
  console.log("   " + missionskarten.length + " Missionskarte(n) sichtbar");
  await seite.click(".tableau-kopf button");
  await warte(120);

  console.log("6) Bewegen-Knopf antippen und ein Zielfeld wählen");
  const bewegenSichtbar = await seite.isVisible('button:has-text("Bewegen")');
  if (bewegenSichtbar) {
    await seite.click('button:has-text("Bewegen")');
    await warte(150);
    const anklickbar = await seite.$$(".hexfeld.anklickbar");
    console.log("   anklickbare Felder:", anklickbar.length);
    if (anklickbar.length > 0) {
      await anklickbar[0].click();
      await warte(150);
    }
  }
  await seite.screenshot({ path: SCRATCH + "/ui-6-nach-zug.png" });

  console.log("7) Zug beenden mehrfach, um Rundenwechsel zu sehen");
  for (let i = 0; i < 4; i++) {
    const beendenKnopf = await seite.$('button:has-text("Zug beenden")');
    if (beendenKnopf) { await beendenKnopf.click(); await warte(150); }
  }
  await seite.screenshot({ path: SCRATCH + "/ui-7-mehrere-zuege.png" });

  console.log("8) Seitenleiste öffnen (Markt/Ziele/Verlauf)");
  const modalOffen = await seite.isVisible(".schleier");
  if (modalOffen) {
    console.log("   (eine Entscheidung steht gerade an — Seitenleiste in diesem Lauf übersprungen)");
  } else {
    const menu = await seite.$('button[title="Protokoll & Markt"]');
    if (menu) { await menu.click(); await warte(150); await seite.screenshot({ path: SCRATCH + "/ui-8-seitenleiste.png" }); }
  }

  await browser.close();

  console.log("");
  if (fehler.length) {
    console.error(fehler.length + " Konsolenfehler:");
    fehler.forEach(function (f) { console.error("  - " + f); });
    process.exitCode = 1;
  } else {
    console.log("Keine Konsolenfehler. Alle Interaktions-Schritte liefen durch.");
  }
}

main().catch(function (e) { console.error("TEST FEHLGESCHLAGEN:", e.message); process.exitCode = 1; });
