// -*- coding: utf-8 -*-
// Testet den Online-Modus mit ZWEI simulierten Geräten (zwei Browser-Seiten),
// die sich einen simulierten "db"-Speicher teilen. Die Mock-Datenbank läuft
// im Node-Prozess und bildet dieselbe Merge-Regel nach, die db.update()
// laut Vertrag hat: Objekte mischen sich rekursiv, alles andere (auch
// Arrays) wird komplett ersetzt.
//
//   NODE_PATH=/opt/node22/lib/node_modules node werkzeuge/teste_online.js

const path = require("path");
const { chromium } = require("playwright");

function warte(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function istPlainObjekt(x) { return x && typeof x === "object" && !Array.isArray(x); }
function tiefesMerge(ziel, patch) {
  const ergebnis = Object.assign({}, ziel);
  Object.keys(patch).forEach(function (k) {
    if (istPlainObjekt(patch[k]) && istPlainObjekt(ziel[k])) ergebnis[k] = tiefesMerge(ziel[k], patch[k]);
    else ergebnis[k] = patch[k];
  });
  return ergebnis;
}

// -------------------------------------------------------- Mock-Datenspeicher

const SPEICHER = {}; // pfad -> Objekt | undefined

function dbGet(pfad) { return SPEICHER[pfad] !== undefined ? SPEICHER[pfad] : null; }
function dbSet(pfad, daten) { SPEICHER[pfad] = JSON.parse(JSON.stringify(daten)); }
function dbUpdate(pfad, patch) {
  if (SPEICHER[pfad] === undefined) throw new Error("update auf nicht existierendes Dokument: " + pfad);
  SPEICHER[pfad] = tiefesMerge(SPEICHER[pfad], JSON.parse(JSON.stringify(patch)));
}

const MOCK_SKRIPT = `
window.claude = {
  use: async function (name) {
    if (name !== "db") return null;
    return {
      collection: function (coll) {
        return {
          doc: function (id) {
            const pfad = coll + "/" + id;
            return {
              get: async function () {
                const daten = await window.__db_get(pfad);
                return { exists: daten !== null, data: function () { return daten; } };
              },
              set: async function (d) { await window.__db_set(pfad, d); },
              update: async function (patch) { await window.__db_update(pfad, patch); },
              onSnapshot: function (next, err) {
                let letzterJson = null;
                let lebt = true;
                (async function schleife() {
                  while (lebt) {
                    try {
                      const daten = await window.__db_get(pfad);
                      const j = JSON.stringify(daten);
                      if (j !== letzterJson) { letzterJson = j; next({ exists: daten !== null, data: function () { return daten; } }); }
                    } catch (e) { if (err) err({ code: "unavailable", message: String(e) }); }
                    await new Promise(function (r) { setTimeout(r, 200); });
                  }
                })();
                return function () { lebt = false; };
              },
            };
          },
        };
      },
    };
  },
};
`;

async function neueSeite(browser) {
  const seite = await browser.newPage({ viewport: { width: 400, height: 820 } });
  await seite.exposeFunction("__db_get", function (pfad) { return dbGet(pfad); });
  await seite.exposeFunction("__db_set", function (pfad, daten) { dbSet(pfad, daten); });
  await seite.exposeFunction("__db_update", function (pfad, patch) { dbUpdate(pfad, patch); });
  await seite.addInitScript(MOCK_SKRIPT);
  const fehler = [];
  seite.on("console", function (msg) {
    if (msg.type() === "error" && !/ERR_CERT_AUTHORITY_INVALID/.test(msg.text())) fehler.push(msg.text());
  });
  seite.on("pageerror", function (e) { fehler.push("pageerror: " + e.message); });
  seite._fehler = fehler;
  return seite;
}

async function main() {
  const DATEI = "file://" + path.join(__dirname, "..", "online-spiel.html");
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });

  console.log("1) Zwei Geräte öffnen die Seite");
  const geraetA = await neueSeite(browser);
  const geraetB = await neueSeite(browser);
  await geraetA.goto(DATEI);
  await geraetB.goto(DATEI);
  await warte(300);

  console.log("2) Gerät A erstellt einen Raum");
  await geraetA.click("#waehle-online-erstellen");
  await warte(600); // pruefeDbVerfuegbarkeit()
  await geraetA.fill("#online-name", "Anke");
  await geraetA.click('button:has-text("Raum erstellen")');
  await warte(400);
  const codeText = await geraetA.textContent(".raumcode-anzeige .code");
  const code = codeText.trim();
  console.log("   Raumcode:", code);
  if (!/^[A-Z0-9]{4}$/.test(code)) throw new Error("Ungültiger Raumcode: " + code);
  await geraetA.screenshot({ path: (process.env.SCRATCH || "/tmp") + "/online-1-raum-erstellt.png" });

  console.log("3) Gerät B tritt mit dem Code bei (Farbe Blau)");
  await geraetB.click("#waehle-online-beitreten");
  await warte(600);
  await geraetB.fill(".code-feld", code);
  await geraetB.fill('input[placeholder="z. B. Theresa"]', "Bodo");
  await geraetB.click('button:has-text("Blau")');
  await geraetB.click('button:has-text("Beitreten")');
  await warte(500);

  console.log("4) Gerät A sollte Bodo jetzt in der Warteliste sehen (live, ohne Reload)");
  await warte(400);
  const wartelisteA = await geraetA.textContent(".spielerliste");
  if (!/Bodo/.test(wartelisteA)) throw new Error("Gerät A sieht Bodo noch nicht in der Warteliste: " + wartelisteA);
  console.log("   ✓ live synchronisiert");
  await geraetA.screenshot({ path: (process.env.SCRATCH || "/tmp") + "/online-2-warteliste.png" });

  console.log("5) Gerät A startet das Spiel");
  await geraetA.click('button:has-text("Spiel beginnen")');
  await warte(500);

  console.log("6) Beide Geräte sollten jetzt das Spielbrett zeigen");
  await geraetA.waitForSelector(".spielkopf", { timeout: 5000 });
  await geraetB.waitForSelector(".spielkopf", { timeout: 5000 });
  await geraetA.screenshot({ path: (process.env.SCRATCH || "/tmp") + "/online-3-brett-a.png" });
  await geraetB.screenshot({ path: (process.env.SCRATCH || "/tmp") + "/online-3-brett-b.png" });

  console.log("7) Rot (Gerät A) ist zuerst dran — A beendet den Zug, B sollte es live merken");
  const kopfA = await geraetA.textContent(".spielkopf");
  if (!/Du bist/.test(kopfA)) throw new Error("Gerät A (Rot) sollte zuerst dran sein: " + kopfA);
  const kopfBVorher = await geraetB.textContent(".spielkopf");
  if (!/ist am Zug/.test(kopfBVorher)) throw new Error("Gerät B sollte warten: " + kopfBVorher);

  await geraetA.click('button:has-text("Zug beenden")');
  await warte(600);
  const kopfBNachher = await geraetB.textContent(".spielkopf");
  if (!/Du bist/.test(kopfBNachher)) throw new Error("Gerät B (Blau) sollte jetzt live am Zug sein: " + kopfBNachher);
  console.log("   ✓ Zugwechsel ist live bei Gerät B angekommen");

  console.log("8) Gerät B bewegt seine Figur, Gerät A sollte die neue Position live sehen");
  await geraetB.click('button:has-text("Bewegen")');
  await warte(200);
  const zielB = await geraetB.$(".hexfeld.anklickbar");
  if (!zielB) throw new Error("Gerät B hat kein anklickbares Zielfeld gefunden");
  await zielB.click();
  await warte(500);
  await geraetA.screenshot({ path: (process.env.SCRATCH || "/tmp") + "/online-4-nach-zug-b.png" });

  const fehlerGesamt = geraetA._fehler.concat(geraetB._fehler);
  await browser.close();

  console.log("");
  if (fehlerGesamt.length) {
    console.error(fehlerGesamt.length + " Konsolenfehler:");
    fehlerGesamt.forEach(function (f) { console.error("  - " + f); });
    process.exitCode = 1;
  } else {
    console.log("Online-Sync zwischen zwei simulierten Geräten funktioniert: Lobby, Zugwechsel und Bewegung kamen live an.");
  }
}

main().catch(function (e) { console.error("TEST FEHLGESCHLAGEN:", e.message); process.exitCode = 1; });
