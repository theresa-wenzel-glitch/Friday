// -*- coding: utf-8 -*-
// Gezielte Einzeltests für Erfindungen und Regeln, die die zufällige
// Simulation selten oder nie erreicht (z. B. weil sie teure Erfindungen
// brauchen). Statt viele Runden zu spielen, bauen wir uns den Zustand
// direkt zusammen — wende() prüft nur die Regeln, nicht die Herkunft
// des Zustands.
//
//   node werkzeuge/teste_motor_einzeln.js

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const daten = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "spiel", "daten.json"), "utf-8"));
global.SPIELDATEN = daten;
const { Motor } = require("./motor.js");

let bestanden = 0;
function test(name, fn) {
  try {
    fn();
    bestanden += 1;
    console.log("  ✓ " + name);
  } catch (e) {
    console.error("  ✗ " + name + "\n    " + e.message);
    process.exitCode = 1;
  }
}

function neuesSpiel(sitze) { return Motor.erstelleSpiel(sitze || ["rot", "blau"]); }

function gib(zustand, sitz, patch) {
  Object.assign(zustand.spieler[sitz], patch);
  return zustand;
}

function wendeOk(zustand, aktion) {
  const r = Motor.wende(zustand, aktion);
  assert.ok(!r.fehler, "Aktion wurde abgelehnt: " + JSON.stringify(aktion) + " -> " + r.fehler);
  return r.zustand;
}

function wendeFehler(zustand, aktion) {
  const r = Motor.wende(zustand, aktion);
  assert.ok(r.fehler, "Aktion sollte abgelehnt werden, wurde aber angenommen: " + JSON.stringify(aktion));
  return r.fehler;
}

console.log("Einzeltests:");

test("roboterhelfer: eine Extra-Ressource, aber nur einmal pro Runde", function () {
  let z = neuesSpiel();
  z.spieler.rot.gebaut = ["roboterhelfer"];
  z.spieler.rot.position = "1_0"; // Wald
  const vorher = z.spieler.rot.ressourcen.holz;
  z = wendeOk(z, { typ: "sammeln", sitz: "rot" });
  assert.strictEqual(z.spieler.rot.ressourcen.holz, vorher + 2, "erster Sammelvorgang sollte +2 geben");
  z = wendeOk(z, { typ: "bewegen", sitz: "rot", ziel: "0_0" });
  z = wendeOk(z, { typ: "bewegen", sitz: "rot", ziel: "1_0" });
  z.ap = 3;
  const zwischenstand = z.spieler.rot.ressourcen.holz;
  z = wendeOk(z, { typ: "sammeln", sitz: "rot" });
  assert.strictEqual(z.spieler.rot.ressourcen.holz, zwischenstand + 1, "zweiter Sammelvorgang nur noch +1");
});

test("luftschiff: Bewegung kostet nie wieder einen Aktionspunkt", function () {
  let z = neuesSpiel();
  z.spieler.rot.gebaut = ["luftschiff"];
  const ziel = Motor.hilfen.nachbarnVon(z, z.spieler.rot.position)[0];
  z.ap = 0;
  z = wendeOk(z, { typ: "bewegen", sitz: "rot", ziel: ziel });
  assert.strictEqual(z.ap, 0, "AP dürfen sich nicht verändert haben");
  assert.strictEqual(z.spieler.rot.position, ziel);
});

test("ruinenscanner: einmal pro Runde kostenlos untersuchen", function () {
  let z = neuesSpiel();
  z.spieler.rot.gebaut = ["ruinenscanner"];
  z.spieler.rot.position = "0_0";
  z.ap = 0;
  const restVorher = z.brett.fundmarkenRest["0_0"];
  z = wendeOk(z, { typ: "untersuchen", sitz: "rot" });
  assert.strictEqual(z.brett.fundmarkenRest["0_0"], restVorher - 1);
  assert.strictEqual(z.ap, 0, "die erste Untersuchung war kostenlos");
  wendeFehler(z, { typ: "untersuchen", sitz: "rot" }); // kein AP mehr, Fähigkeit schon benutzt
});

test("automatikfabrik: zu Rundenbeginn eine Ressource nach Wahl", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.gebaut = ["automatikfabrik"];
  z.ap = 0;
  z = wendeOk(z, { typ: "zug_beenden", sitz: "rot" }); // blau ist jetzt dran
  z = wendeOk(z, { typ: "zug_beenden", sitz: "blau" }); // Runde 2 beginnt
  assert.strictEqual(z.runde, 2);
  const pendent = z.ausstehend.rot.find(function (e) { return e.grund === "automatikfabrik"; });
  assert.ok(pendent, "Automatik-Fabrik sollte eine ausstehende Ressourcenwahl erzeugen");
  const vorher = z.spieler.rot.ressourcen.energie;
  z = wendeOk(z, { typ: "ausstehend_loesen", sitz: "rot", eintragId: pendent.id, wahl: { energie: 1 } });
  assert.strictEqual(z.spieler.rot.ressourcen.energie, vorher + 1);
});

test("leuchtturm: übrige Bauteile zählen 4 statt 2 Punkte", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.gebaut = ["leuchtturm"];
  z.spieler.rot.ressourcen.bauteil = 3;
  const wertung = Motor.hilfen.berechneWertung(z, "rot");
  const bauteilPunkte = wertung.details.bauteile * 4;
  assert.ok(wertung.punkte >= nach_erfindung_punkte(z, "leuchtturm") + bauteilPunkte,
    "Wertung sollte den 4-Punkte-Bauteilwert enthalten");
});
function nach_erfindung_punkte(z, id) { return daten.erfindungen.find(function (e) { return e.id === id; }).punkte; }

test("wasserrecycling: übriges Wasser zählt 1:1 statt 3:1", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.gebaut = ["wasserrecycling"];
  z.spieler.rot.ressourcen.wasser = 5;
  const wertung = Motor.hilfen.berechneWertung(z, "rot");
  assert.strictEqual(wertung.details.restRohstoffe, 0, "Wasser läuft nicht mehr in den 3:1-Topf");
  assert.ok(wertung.punkte >= nach_erfindung_punkte(z, "wasserrecycling") + 5);
});

test("große Brücke: +1 Punkt je gebauter Erfindung", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.gebaut = ["grossebruecke", "schubkarre"];
  z.spieler.rot.auftraege = []; z.bonusziele = [];
  z.spieler.rot.ressourcen = { holz: 0, metall: 0, wasser: 0, energie: 0, bauteil: 0 };
  z.spieler.rot.position = "1_0"; // nicht die eigene Werkstatt, damit "heimatverbunden" nicht mitzählt
  const wertung = Motor.hilfen.berechneWertung(z, "rot");
  const basis = nach_erfindung_punkte(z, "grossebruecke") + nach_erfindung_punkte(z, "schubkarre");
  assert.strictEqual(wertung.punkte, basis + 2, "2 Erfindungen -> +2 Bonus");
});

test("Geistesblitz: 1 Ressource Rabatt beim Bauen, nur während des Effekts", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.position = z.markt ? "2_-2" : "2_-2";
  z.spieler.rot.ressourcen = { holz: 1, metall: 0, wasser: 0, energie: 0, bauteil: 0 };
  z.markt[1] = ["schubkarre", z.markt[1][1]]; // Schubkarre kostet 2 Holz
  wendeFehler(z, { typ: "bauen", sitz: "rot", erfindungId: "schubkarre" }); // zu teuer ohne Rabatt
  z.aktivEffekte.diese.geistesblitz = true;
  z = wendeOk(z, { typ: "bauen", sitz: "rot", erfindungId: "schubkarre", geistesblitzRessource: "holz" });
  assert.ok(z.spieler.rot.gebaut.indexOf("schubkarre") !== -1);
});

test("Taschenlampe: 2 ziehen, 1 behalten, 1 zurück unter den Stapel", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.gebaut = ["taschenlampe"];
  z.spieler.rot.position = "0_0";
  // Zwei Karten ohne Folgewahl ans Stapelende legen, damit der Test deterministisch bleibt.
  z.stapel.fund = z.stapel.fund.filter(function (id) { return id !== "fundbauteil" && id !== "reicherfund"; });
  z.stapel.fund.push("reicherfund", "fundbauteil"); // .pop() zieht zuerst "fundbauteil"
  const stapelVorher = z.stapel.fund.length;
  z = wendeOk(z, { typ: "untersuchen", sitz: "rot" });
  const pendent = z.ausstehend.rot.find(function (e) { return e.art === "taschenlampe_wahl"; });
  assert.ok(pendent, "sollte eine Taschenlampen-Wahl erzeugen");
  assert.deepStrictEqual(pendent.karten.slice().sort(), ["fundbauteil", "reicherfund"].sort());
  assert.strictEqual(z.stapel.fund.length, stapelVorher - 2, "beide Karten wurden vom Stapel genommen");
  z = wendeOk(z, { typ: "ausstehend_loesen", sitz: "rot", eintragId: pendent.id, wahl: "reicherfund" });
  assert.strictEqual(z.stapel.fund.length, stapelVorher - 1, "die andere Karte kam zurück unter den Stapel");
  assert.strictEqual(z.stapel.fund[0], "fundbauteil", "die abgelehnte Karte liegt jetzt unten");
  assert.strictEqual(z.ausstehend.rot.length, 0, "reicherfund braucht keine weitere Wahl");
  assert.strictEqual(z.spieler.rot.ressourcen.bauteil, 2, "reicherfund gibt 2 Bauteile");
});

test("Handel: Annehmen tauscht wirklich, Ablehnen tauscht nichts", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.ressourcen = { holz: 3, metall: 0, wasser: 0, energie: 0, bauteil: 0 };
  z.spieler.blau.ressourcen = { holz: 0, metall: 3, wasser: 0, energie: 0, bauteil: 0 };
  z.spieler.blau.position = z.spieler.rot.position; // garantiert benachbart/gleiches Feld
  z = wendeOk(z, { typ: "handeln_vorschlagen", sitz: "rot", anSitz: "blau", gibt: { holz: 1 }, nimmt: { metall: 1 } });
  assert.strictEqual(z.wartetAuf, "blau");
  wendeFehler(z, { typ: "bewegen", sitz: "rot", ziel: Motor.hilfen.nachbarnVon(z, z.spieler.rot.position)[0] }); // rot muss warten
  z = wendeOk(z, { typ: "handeln_antwort", sitz: "blau", annehmen: true });
  assert.strictEqual(z.spieler.rot.ressourcen.holz, 2);
  assert.strictEqual(z.spieler.rot.ressourcen.metall, 1);
  assert.strictEqual(z.spieler.blau.ressourcen.metall, 2);
  assert.strictEqual(z.spieler.blau.ressourcen.holz, 1);
  assert.strictEqual(z.wartetAuf, null);
  assert.strictEqual(z.spieler.rot.zaehler.getauscht, 1);
  assert.strictEqual(z.spieler.blau.zaehler.getauscht, 1);
});

test("Handel: fremdes Angebot kann nicht von Dritten beantwortet werden", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.blau.position = z.spieler.rot.position;
  z = wendeOk(z, { typ: "handeln_vorschlagen", sitz: "rot", anSitz: "blau", gibt: {}, nimmt: {} });
  wendeFehler(z, { typ: "handeln_antwort", sitz: "rot", annehmen: true });
});

test("Signalhorn: Handeln kostet keinen Aktionspunkt mehr", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.gebaut = ["signalhorn"];
  z.spieler.blau.position = z.spieler.rot.position;
  z.ap = 0;
  z = wendeOk(z, { typ: "handeln_vorschlagen", sitz: "rot", anSitz: "blau", gibt: {}, nimmt: {} });
  assert.strictEqual(z.handelsAngebot.apKosten, 0);
});

test("Tauschbank: nur in der eigenen Werkstatt, 3 gegen 1", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.ressourcen.holz = 3;
  z.spieler.rot.position = "1_0"; // nicht die eigene Werkstatt
  wendeFehler(z, { typ: "tauschbank", sitz: "rot", gibtRessource: "holz", nimmtRessource: "metall" });
  z.spieler.rot.position = daten.startWerkstatt.rot;
  z = wendeOk(z, { typ: "tauschbank", sitz: "rot", gibtRessource: "holz", nimmtRessource: "metall" });
  assert.strictEqual(z.spieler.rot.ressourcen.holz, 0);
  assert.strictEqual(z.spieler.rot.ressourcen.metall, 2);
});

test("Lagerfeuer: 2 gegen 1, kostet keine Aktion, einmal pro Runde", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.gebaut = ["lagerfeuer"];
  z.spieler.rot.ressourcen.holz = 4;
  z.ap = 3;
  z = wendeOk(z, { typ: "sonderfaehigkeit", sitz: "rot", schluessel: "lagerfeuer", gibtRessource: "holz", nimmtRessource: "energie" });
  assert.strictEqual(z.ap, 3, "kostet keine Aktion");
  assert.strictEqual(z.spieler.rot.ressourcen.holz, 2);
  assert.strictEqual(z.spieler.rot.ressourcen.energie, 1);
  wendeFehler(z, { typ: "sonderfaehigkeit", sitz: "rot", schluessel: "lagerfeuer", gibtRessource: "holz", nimmtRessource: "energie" });
});

test("Destillieranlage: 3 Wasser -> 1 Bauteil, kostet 1 AP, einmal pro Runde", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.gebaut = ["destillieranlage"];
  z.spieler.rot.ressourcen.wasser = 3;
  z.ap = 3;
  z = wendeOk(z, { typ: "sonderfaehigkeit", sitz: "rot", schluessel: "destillieranlage" });
  assert.strictEqual(z.ap, 2);
  assert.strictEqual(z.spieler.rot.ressourcen.bauteil, 1);
  assert.strictEqual(z.spieler.rot.ressourcen.wasser, 0);
});

test("Hebekran: Bauen kostet nur noch 1 statt 2 Aktionspunkte", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.gebaut = ["hebekran"];
  z.spieler.rot.position = daten.startWerkstatt.rot;
  z.spieler.rot.ressourcen = { holz: 2, metall: 0, wasser: 0, energie: 0, bauteil: 0 };
  z.markt[1] = ["schubkarre", z.markt[1][1]];
  z.ap = 1;
  z = wendeOk(z, { typ: "bauen", sitz: "rot", erfindungId: "schubkarre" });
  assert.strictEqual(z.ap, 0);
});

test("Bewegen: gesperrtes Feld kann nicht betreten werden", function () {
  let z = neuesSpiel(["rot", "blau"]);
  const ziel = Motor.hilfen.nachbarnVon(z, z.spieler.rot.position)[0];
  z.rundenSperren.felder = [ziel];
  wendeFehler(z, { typ: "bewegen", sitz: "rot", ziel: ziel });
});

test("Brücke: verbundene Felder gelten als Nachbarn", function () {
  let z = neuesSpiel(["rot", "blau"]);
  const werkstattRot = daten.startWerkstatt.rot;
  assert.ok(Motor.hilfen.nachbarnVon(z, werkstattRot).indexOf(daten.grosseRuine) === -1, "vorher nicht benachbart");
  z.brett.zusatzKanten.push([daten.grosseRuine, werkstattRot]);
  assert.ok(Motor.hilfen.nachbarnVon(z, werkstattRot).indexOf(daten.grosseRuine) !== -1, "nach Brücke benachbart");
});

test("Aufträge und Bonusziele: Prüf-Logik reagiert auf den Zustand", function () {
  let z = neuesSpiel(["rot", "blau"]);
  z.spieler.rot.ressourcen.holz = 4;
  assert.strictEqual(Motor.hilfen.auftragErfuellt(z, "rot", "holzsammler"), true);
  z.spieler.rot.ressourcen.holz = 3;
  assert.strictEqual(Motor.hilfen.auftragErfuellt(z, "rot", "holzsammler"), false);
  z.spieler.rot.gebaut = ["holzfaelleraxt", "regenfaenger", "schubkarre"];
  assert.strictEqual(Motor.hilfen.bonuszielErfuellt(z, "rot", "meistermaschinen"), true);
});

test("Lagerlimit: Schubkarre erhöht es auf 14", function () {
  let z = neuesSpiel(["rot", "blau"]);
  assert.strictEqual(Motor.hilfen.lagerlimit(z.spieler.rot), 10);
  z.spieler.rot.gebaut = ["schubkarre"];
  assert.strictEqual(Motor.hilfen.lagerlimit(z.spieler.rot), 14);
});

console.log("");
console.log(bestanden + " Einzeltests bestanden.");
