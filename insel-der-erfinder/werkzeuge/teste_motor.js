// -*- coding: utf-8 -*-
// Automatisierter Test der Spiel-Engine: viele Partien mit zufälligen,
// aber gültigen Zügen bis zum Ende durchspielen und dabei jede Regel-
// Verletzung, jede Exception und ein paar Kennzahlen protokollieren.
//
//   node werkzeuge/teste_motor.js [anzahlPartien]

const fs = require("fs");
const path = require("path");

const daten = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "spiel", "daten.json"), "utf-8"));
global.SPIELDATEN = daten;
const { Motor } = require("./motor.js");

function zufallsElement(liste) { return liste[Math.floor(Math.random() * liste.length)]; }

const ABDECKUNG = { ereignisse: {}, inselkarten: {}, fundkarten: {}, erfindungen: {} };

function loeseAusstehendZufaellig(eintrag, zustand, sitz) {
  const spieler = zustand.spieler[sitz];
  switch (eintrag.art) {
    case "abwerfen": {
      let noch = eintrag.anzahl;
      const gaben = {};
      const verfuegbar = ["holz", "metall", "wasser", "energie"].filter(function (k) { return spieler.ressourcen[k] > 0; });
      while (noch > 0) {
        const wahl = verfuegbar.filter(function (k) { return (spieler.ressourcen[k] || 0) - (gaben[k] || 0) > 0; });
        const k = zufallsElement(wahl);
        gaben[k] = (gaben[k] || 0) + 1;
        noch -= 1;
      }
      return { typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, wahl: gaben };
    }
    case "verlustwahl": {
      const k = zufallsElement(["holz", "metall", "wasser", "energie", "bauteil"].filter(function (r) { return spieler.ressourcen[r] > 0; }));
      return { typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, wahl: { ressource: k } };
    }
    case "ressourcenwahl": {
      const erlaubt = ["holz", "metall", "wasser", "energie", "bauteil"].filter(function (r) { return (eintrag.ausschluss || []).indexOf(r) === -1; });
      const gaben = {};
      for (let i = 0; i < eintrag.anzahl; i++) { const k = zufallsElement(erlaubt); gaben[k] = (gaben[k] || 0) + 1; }
      return { typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, wahl: gaben };
    }
    case "feldwahl_sperren": case "feldwahl_insel":
      return { typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, wahl: zufallsElement(eintrag.optionen) };
    case "taschenlampe_wahl":
      return { typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, wahl: zufallsElement(eintrag.karten) };
    default:
      throw new Error("Unbekannter Ausstehend-Typ im Test: " + eintrag.art);
  }
}

function pruefeInvarianten(zustand, letzteAktion) {
  if (zustand.ap < 0) throw new Error("Negative AP nach " + JSON.stringify(letzteAktion));
  Object.keys(zustand.spieler).forEach(function (sitz) {
    const r = zustand.spieler[sitz].ressourcen;
    ["holz", "metall", "wasser", "energie", "bauteil"].forEach(function (k) {
      if ((r[k] || 0) < 0) throw new Error("Negative Ressource " + k + " bei " + sitz + " nach " + JSON.stringify(letzteAktion));
    });
  });
  Object.keys(zustand.brett.fundmarkenRest).forEach(function (fid) {
    if (zustand.brett.fundmarkenRest[fid] < 0) throw new Error("Negative Fundmarken auf " + fid + " nach " + JSON.stringify(letzteAktion));
  });
  if (zustand.stapel.fund.length + zustand.stapel.fundAblage.length +
      Object.keys(zustand.spieler).reduce(function (s, k) { return s + zustand.spieler[k].relikte.length; }, 0)
      + zaehleUnterwegsBefindlicheFundkarten(zustand) !== daten.fundkarten.reduce(function (s, f) { return s + f.anzahl; }, 0)) {
    throw new Error("Fundkarten sind verschwunden oder verdoppelt nach " + JSON.stringify(letzteAktion));
  }
}

function zaehleUnterwegsBefindlicheFundkarten(zustand) {
  // Karten, die gerade als "taschenlampe_wahl" zwischen den Stapeln hängen.
  let n = 0;
  Object.keys(zustand.ausstehend).forEach(function (sitz) {
    zustand.ausstehend[sitz].forEach(function (e) { if (e.art === "taschenlampe_wahl") n += e.karten.length; });
  });
  return n;
}

function spielePartie(anzahlSpieler, seed) {
  const sitze = daten.spielerfarben.slice(0, anzahlSpieler).map(function (s) { return s.key; });
  let zustand = Motor.erstelleSpiel(sitze);
  let zuege = 0;
  const MAX_ZUEGE = 20000;
  const zugBeendetJeSitz = {};
  sitze.forEach(function (s) { zugBeendetJeSitz[s] = 0; });

  while (zustand.phase === "spiel" && zuege < MAX_ZUEGE) {
    zuege += 1;
    // Wer ist gerade dran / muss etwas lösen?
    let handelnderSitz = null;
    for (const s of sitze) {
      if ((zustand.ausstehend[s] || []).length > 0) { handelnderSitz = s; break; }
    }
    if (!handelnderSitz) {
      if (zustand.wartetAuf) handelnderSitz = zustand.wartetAuf;
      else handelnderSitz = zustand.sitzplaetze[zustand.zugSitzIndex];
    }

    const optionen = Motor.gueltigeAktionen(zustand, handelnderSitz);
    if (optionen.length === 0) throw new Error("Keine gültige Aktion für " + handelnderSitz + " — Sackgasse.");

    let aktion;
    const ausstehendOptionen = optionen.filter(function (o) { return o.typ === "ausstehend_loesen"; });
    if (ausstehendOptionen.length > 0) {
      const o = zufallsElement(ausstehendOptionen);
      aktion = loeseAusstehendZufaellig(o.eintrag, zustand, handelnderSitz);
    } else {
      // "zug_beenden" seltener wählen, damit die Partien nicht sofort durchrauschen.
      const ohneBeenden = optionen.filter(function (o) { return o.typ !== "zug_beenden"; });
      if (ohneBeenden.length > 0 && Math.random() < 0.85) aktion = zufallsElement(ohneBeenden);
      else aktion = zufallsElement(optionen);
      if (aktion.typ === "handeln_vorschlagen") {
        // Ein bisschen echten Tausch simulieren statt leerer Angebote.
        const von = zustand.spieler[aktion.sitz], an = zustand.spieler[aktion.anSitz];
        const vonHat = Object.keys(von.ressourcen).filter(function (k) { return von.ressourcen[k] > 0; });
        const anHat = Object.keys(an.ressourcen).filter(function (k) { return an.ressourcen[k] > 0; });
        if (vonHat.length) aktion.gibt = (function () { const o = {}; o[zufallsElement(vonHat)] = 1; return o; })();
        if (anHat.length) aktion.nimmt = (function () { const o = {}; o[zufallsElement(anHat)] = 1; return o; })();
      }
    }

    const ergebnis = Motor.wende(zustand, aktion);
    if (ergebnis.fehler) {
      throw new Error("Engine lehnte eine als gültig gemeldete Aktion ab: " + JSON.stringify(aktion) + " -> " + ergebnis.fehler);
    }
    zustand = ergebnis.zustand;
    pruefeInvarianten(zustand, aktion);
    if (aktion.typ === "zug_beenden") zugBeendetJeSitz[aktion.sitz] += 1;
    ergebnis.ereignisse.forEach(function (e) {
      if (e.typ === "ereignis") ABDECKUNG.ereignisse[e.karte] = (ABDECKUNG.ereignisse[e.karte] || 0) + 1;
      if (e.typ === "inselkarte") ABDECKUNG.inselkarten[e.karte] = (ABDECKUNG.inselkarten[e.karte] || 0) + 1;
      if (e.typ === "fund_gezogen") ABDECKUNG.fundkarten[e.karte] = (ABDECKUNG.fundkarten[e.karte] || 0) + 1;
      if (e.typ === "gebaut") ABDECKUNG.erfindungen[e.erfindungId] = (ABDECKUNG.erfindungen[e.erfindungId] || 0) + 1;
    });

    // Handelsantworten: die Ziel-Seite muss reagieren, sonst hängt die Partie.
    if (zustand.wartetAuf && zustand.handelsAngebot) {
      const antwort = { typ: "handeln_antwort", sitz: zustand.wartetAuf, annehmen: Math.random() < 0.6 };
      const r2 = Motor.wende(zustand, antwort);
      if (r2.fehler) throw new Error("Handelsantwort abgelehnt: " + r2.fehler);
      zustand = r2.zustand;
    }
  }

  if (zustand.phase !== "ende") throw new Error("Partie kam nicht zum Ende (Zugzahl-Limit erreicht).");

  // Fairness: bei rotierendem Startspieler muss trotzdem jeder Sitz genau
  // einmal pro Runde dran gewesen sein — sonst bekommen manche Spieler
  // durch die Rotation weniger Züge als andere.
  sitze.forEach(function (s) {
    if (zugBeendetJeSitz[s] !== daten.regeln.runden) {
      throw new Error("Unfaire Zugverteilung: " + s + " hat " + zugBeendetJeSitz[s] +
        " Züge beendet, erwartet " + daten.regeln.runden + " (" + anzahlSpieler + " Spieler).");
    }
  });

  return { zustand: zustand, zuege: zuege };
}

function pruefeWertungskonsistenz(zustand) {
  const summenpunkte = zustand.ergebnis.platzierung.map(function (p) { return p.punkte; });
  summenpunkte.forEach(function (p) {
    if (!Number.isFinite(p) || p < 0) throw new Error("Unsinnige Punktzahl: " + p);
  });
}

function main() {
  const anzahlPartien = parseInt(process.argv[2] || "40", 10);
  let minZuege = Infinity, maxZuege = 0, gesamtZuege = 0;
  const siegpunkte = [];
  for (let i = 0; i < anzahlPartien; i++) {
    const anzahlSpieler = 2 + (i % 3); // 2, 3, 4, 2, 3, 4, ...
    const { zustand, zuege } = spielePartie(anzahlSpieler, i);
    pruefeWertungskonsistenz(zustand);
    minZuege = Math.min(minZuege, zuege);
    maxZuege = Math.max(maxZuege, zuege);
    gesamtZuege += zuege;
    siegpunkte.push(zustand.ergebnis.platzierung[0].punkte);
    if (i < 3) {
      const sieger = zustand.ergebnis.platzierung[0];
      console.log("Partie " + (i + 1) + " (" + anzahlSpieler + " Spieler): Sieger " + sieger.name +
        " mit " + sieger.punkte + " Punkten, " + zuege + " Züge");
    }
  }
  console.log("");
  console.log(anzahlPartien + " Partien fehlerfrei durchgespielt.");
  console.log("Züge je Partie: min " + minZuege + " / durchschn. " + Math.round(gesamtZuege / anzahlPartien) + " / max " + maxZuege);
  console.log("Siegpunkte: min " + Math.min.apply(null, siegpunkte) + " / durchschn. " +
    Math.round(siegpunkte.reduce(function (a, b) { return a + b; }, 0) / siegpunkte.length) + " / max " + Math.max.apply(null, siegpunkte));

  function fehlend(liste, gesehen) { return liste.map(function (e) { return e.id; }).filter(function (id) { return !gesehen[id]; }); }
  console.log("");
  console.log("Nie ausgelöst — Ereignisse: " + JSON.stringify(fehlend(daten.ereignisse, ABDECKUNG.ereignisse)));
  console.log("Nie ausgelöst — Inselkarten: " + JSON.stringify(fehlend(daten.inselkarten, ABDECKUNG.inselkarten)));
  console.log("Nie gezogen — Fundkarten: " + JSON.stringify(fehlend(daten.fundkarten, ABDECKUNG.fundkarten)));
  console.log("Nie gebaut — Erfindungen: " + JSON.stringify(fehlend(daten.erfindungen, ABDECKUNG.erfindungen)));
}

main();
