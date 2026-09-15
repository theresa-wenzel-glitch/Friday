// -*- coding: utf-8 -*-
// Spielt eine komplette lokale Partie durch echte Klicks bis zum Ende durch
// (nur "Zug beenden" plus alle nötigen Entscheidungen zufällig lösen) und
// prüft, dass der Endbildschirm erscheint. Das stresstestet nebenbei sehr
// viele Ereignis-/Inselkarten-Modale über die echte Oberfläche.
//
//   NODE_PATH=/opt/node22/lib/node_modules node werkzeuge/teste_endspiel.js

const path = require("path");
const { chromium } = require("playwright");

function warte(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function loeseOffeneModaleZufaellig(seite) {
  // Löst so lange irgendein offenes Modal, bis keins mehr da ist.
  for (let i = 0; i < 20; i++) {
    const schleier = await seite.$(".schleier");
    if (!schleier) return;
    const knoepfe = await schleier.$$("button");
    if (knoepfe.length === 0) return;
    // Lagerfeuer/Feldlabor/Tauschbank-Modale können leer bestätigt werden -> übersprungen (Bestätigen bleibt disabled),
    // deshalb Ressourcen-Stepper zuerst +1 auf einer Option klicken, falls vorhanden.
    const plus = await schleier.$$('button:has-text("+")');
    if (plus.length > 0) {
      const nötig = await schleier.$('p.modal-unter');
      // einfach ein paar Pluspunkte verteilen, dann bestätigen
      for (let k = 0; k < Math.min(3, plus.length); k++) { await plus[k % plus.length].click(); }
    }
    const bestaetigen = await schleier.$('button:has-text("Bestätigen")');
    if (bestaetigen && !(await bestaetigen.isDisabled())) { await bestaetigen.click(); await warte(80); continue; }
    // sonst: irgendeinen nicht-"Abbrechen"/"Ablehnen" Knopf nehmen
    let geklickt = false;
    for (const b of knoepfe) {
      const txt = (await b.textContent() || "").trim();
      if (/Abbrechen/.test(txt)) continue;
      if (await b.isDisabled()) continue;
      await b.click(); geklickt = true; break;
    }
    if (!geklickt) return;
    await warte(80);
  }
}

async function main() {
  const DATEI = "file://" + path.join(__dirname, "..", "online-spiel.html");
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  const seite = await browser.newPage({ viewport: { width: 420, height: 860 } });
  const fehler = [];
  seite.on("console", function (msg) { if (msg.type() === "error" && !/ERR_CERT_AUTHORITY_INVALID/.test(msg.text())) fehler.push(msg.text()); });
  seite.on("pageerror", function (e) { fehler.push("pageerror: " + e.message); });

  await seite.goto(DATEI);
  await warte(200);
  await seite.click("#waehle-lokal");
  await seite.click('button:has-text("3")');
  await seite.click('button:has-text("Spiel beginnen")');
  await warte(200);

  let klicks = 0;
  const MAX_KLICKS = 400;
  while (klicks < MAX_KLICKS) {
    klicks += 1;
    const endeSichtbar = await seite.isVisible(".endbuehne").catch(function () { return false; });
    if (endeSichtbar) break;

    await loeseOffeneModaleZufaellig(seite);
    const nochEnde = await seite.isVisible(".endbuehne").catch(function () { return false; });
    if (nochEnde) break;

    const tableauSchleier = await seite.$(".tableau-schleier");
    if (tableauSchleier) { await seite.click(".tableau-kopf button"); await warte(60); continue; }

    const beenden = await seite.$('button:has-text("Zug beenden")');
    if (beenden && !(await beenden.isDisabled())) { await beenden.click(); await warte(60); continue; }

    // Kein "Zug beenden" sichtbar -> evtl. wartet die Oberfläche auf den anderen Sitz (Handel);
    // in dieser Partie schlagen wir aber nie Handel vor, also sollte das nicht vorkommen.
    await warte(80);
  }

  await seite.screenshot({ path: (process.env.SCRATCH || "/tmp") + "/endspiel-1-ergebnis.png", fullPage: true });
  const rundenChip = await seite.textContent(".runde-chip").catch(function () { return ""; });
  const endeDa = await seite.isVisible(".endbuehne").catch(function () { return false; });

  await browser.close();

  console.log("Klicks gebraucht:", klicks);
  console.log("Letzter Rundenstand (falls sichtbar):", rundenChip);
  console.log("Endbildschirm erreicht:", endeDa);
  if (fehler.length) {
    console.error(fehler.length + " Konsolenfehler:");
    fehler.forEach(function (f) { console.error("  - " + f); });
    process.exitCode = 1;
  }
  if (!endeDa) { console.error("FEHLGESCHLAGEN: Endbildschirm nie erreicht."); process.exitCode = 1; }
  else console.log("Partie erfolgreich über die Oberfläche bis zum Ende gespielt.");
}

main().catch(function (e) { console.error("TEST FEHLGESCHLAGEN:", e.message); process.exitCode = 1; });
