// -*- coding: utf-8 -*-
//
// motor.js — die Spiel-Engine von "Insel der Erfinder".
//
// Reiner Reducer: wende(zustand, aktion) -> {zustand, ereignisse, fehler}.
// Nichts hier greift auf DOM, Netzwerk oder Zeit zu (außer Math.random beim
// Erzeugen einer neuen Partie) — das macht die Engine leicht zu testen und
// in Node genauso lauffähig wie im Browser, egal ob lokal oder online
// gespielt wird. Erwartet eine globale Variable SPIELDATEN (siehe daten.json)
// bevor diese Datei geladen wird.
//
// Namensraum: window.Motor im Browser, module.exports.Motor in Node.

(function (global) {
  "use strict";

  const D = global.SPIELDATEN;
  if (!D) throw new Error("SPIELDATEN fehlt — motor.js braucht die Spieldaten zuerst.");

  const GRUNDROHSTOFFE = ["holz", "metall", "wasser", "energie"];
  const ALLE_ROHSTOFFE = ["holz", "metall", "wasser", "energie", "bauteil"];
  const EINMAL_PRO_RUNDE_SCHLUESSEL = [
    "strickleiter", "lagerfeuer", "miniflugmaschine", "roboterhelfer", "auslegerboot",
    "magnetkran", "feldlabor", "destillieranlage", "ruinenscanner",
    "reliktkompass", "reliktbatterie",
  ];

  function klon(x) { return x === undefined ? x : JSON.parse(JSON.stringify(x)); }

  function mische(liste, zzz) {
    const rng = zzz || Math.random;
    const a = liste.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ------------------------------------------------------------ Nachschlagen

  const nach = { erfindung: {}, ereignis: {}, insel: {}, fund: {}, auftrag: {}, bonus: {}, feld: {} };
  D.erfindungen.forEach(function (e) { nach.erfindung[e.id] = e; });
  D.ereignisse.forEach(function (e) { nach.ereignis[e.id] = e; });
  D.inselkarten.forEach(function (e) { nach.insel[e.id] = e; });
  D.fundkarten.forEach(function (e) { nach.fund[e.id] = e; });
  D.auftraege.forEach(function (e) { nach.auftrag[e.id] = e; });
  D.bonusziele.forEach(function (e) { nach.bonus[e.id] = e; });
  D.felder.forEach(function (f) { nach.feld[f.id] = f; });

  function neueId(praefix) {
    return praefix + "_" + Math.random().toString(36).slice(2, 10);
  }

  // -------------------------------------------------------------- Spielplan

  /** Der aktuelle Feld-Typ, nachdem Inselkarten das Gelände verändert haben. */
  function feldTyp(zustand, feldId) {
    const ueb = zustand.brett.ueberschreibungen[feldId];
    if (ueb && ueb.typ) return ueb.typ;
    return nach.feld[feldId].typ;
  }

  function feldSpielerFarbe(feldId) {
    const f = nach.feld[feldId];
    return f && f.spieler ? f.spieler : null;
  }

  function feldGibt(zustand, feldId) {
    const t = feldTyp(zustand, feldId);
    const g = D.gelaende[t];
    return g ? g.gibt : null;
  }

  function fundmarkenRest(zustand, feldId) {
    const v = zustand.brett.fundmarkenRest[feldId];
    return v === undefined ? 0 : v;
  }

  function istUntersuchbar(zustand, feldId) {
    const t = feldTyp(zustand, feldId);
    return (t === "ruine" || t === "grruine") && fundmarkenRest(zustand, feldId) > 0;
  }

  /** Nachbarn eines Feldes inklusive per Inselkarte gebauter Brücken. */
  function nachbarnVon(zustand, feldId) {
    const basis = D.nachbarn[feldId] || [];
    const zusatz = [];
    zustand.brett.zusatzKanten.forEach(function (paar) {
      if (paar[0] === feldId) zusatz.push(paar[1]);
      if (paar[1] === feldId) zusatz.push(paar[0]);
    });
    return basis.concat(zusatz);
  }

  function istGesperrtZumBetreten(zustand, feldId) {
    if (zustand.rundenSperren.felder.indexOf(feldId) !== -1) return true;
    const t = feldTyp(zustand, feldId);
    return zustand.rundenSperren.gelaendeBewegen.indexOf(t) !== -1;
  }

  function istGesperrtZumSammeln(zustand, feldId) {
    const t = feldTyp(zustand, feldId);
    return zustand.rundenSperren.gelaendeSammeln.indexOf(t) !== -1;
  }

  // -------------------------------------------------------------- Spieler-Helfer

  function hatErfindung(spieler, id) { return spieler.gebaut.indexOf(id) !== -1; }
  function hatRelikt(spieler, id) { return spieler.relikte.indexOf(id) !== -1; }

  function gesamtRessourcen(spieler, nurGrund) {
    const liste = nurGrund ? GRUNDROHSTOFFE : ALLE_ROHSTOFFE;
    return liste.reduce(function (s, k) { return s + (spieler.ressourcen[k] || 0); }, 0);
  }

  function lagerlimit(spieler) {
    return D.regeln.lagerlimit + (hatErfindung(spieler, "schubkarre") ? 4 : 0);
  }

  function gibRessourcen(spieler, gaben) {
    Object.keys(gaben).forEach(function (k) {
      spieler.ressourcen[k] = (spieler.ressourcen[k] || 0) + gaben[k];
    });
  }

  function kannBezahlen(spieler, kosten) {
    return Object.keys(kosten).every(function (k) { return (spieler.ressourcen[k] || 0) >= kosten[k]; });
  }

  function bezahle(spieler, kosten) {
    Object.keys(kosten).forEach(function (k) { spieler.ressourcen[k] -= kosten[k]; });
  }

  function merkeGelaendeBesuch(spieler, gelaendeTyp) {
    if (spieler.zaehler.besuchteGelaende.indexOf(gelaendeTyp) === -1) {
      spieler.zaehler.besuchteGelaende.push(gelaendeTyp);
    }
  }

  // ------------------------------------------------------------- Protokoll

  function log(zustand, text) {
    zustand.protokoll.push({ runde: zustand.runde, text: text });
    if (zustand.protokoll.length > 60) zustand.protokoll.shift();
  }

  // ============================================================ Spiel anlegen

  function erstelleSpiel(sitzplaetze, namen) {
    const zustand = {
      version: 1,
      erstellt: new Date().toISOString(),
      phase: "spiel",
      runde: 1,
      sitzplaetze: sitzplaetze.slice(),
      zugSitzIndex: 0,
      zuegeDieseRunde: 0,
      startspielerIndex: 0,
      ap: D.regeln.aktionspunkte,
      brett: { ueberschreibungen: {}, zusatzKanten: [], fundmarkenRest: {} },
      rundenSperren: { felder: [], gelaendeBewegen: [], gelaendeSammeln: [] },
      aktivEffekte: { diese: leereEffekte(), naechste: leereEffekte(), dauerhaft: { fruchtbareErde: false } },
      spieler: {},
      markt: { 1: [], 2: [], 3: [] },
      stapel: { erfindungen: { 1: [], 2: [], 3: [] }, fund: [], fundAblage: [], ereignisse: [], insel: [] },
      ausstehend: {},
      handelsAngebot: null,
      wartetAuf: null,
      bonusziele: [],
      ersterStufe3: null,
      protokoll: [],
      ergebnis: null,
    };

    D.felder.forEach(function (f) {
      if (f.fundmarken) zustand.brett.fundmarkenRest[f.id] = f.fundmarken;
    });

    // Erfindungsstapel je Stufe mischen, Auslage füllen (2/2/1).
    [1, 2, 3].forEach(function (stufe) {
      const ids = D.erfindungen.filter(function (e) { return e.stufe === stufe; }).map(function (e) { return e.id; });
      zustand.stapel.erfindungen[stufe] = mische(ids);
    });
    zustand.markt[1] = [zustand.stapel.erfindungen[1].pop(), zustand.stapel.erfindungen[1].pop()];
    zustand.markt[2] = [zustand.stapel.erfindungen[2].pop(), zustand.stapel.erfindungen[2].pop()];
    zustand.markt[3] = [zustand.stapel.erfindungen[3].pop()];

    // Fundkartenstapel: jede Karte so oft, wie "anzahl" angibt.
    let fund = [];
    D.fundkarten.forEach(function (f) { for (let i = 0; i < f.anzahl; i++) fund.push(f.id); });
    zustand.stapel.fund = mische(fund);

    zustand.stapel.ereignisse = mische(D.ereignisse.map(function (e) { return e.id; }));
    zustand.stapel.insel = mische(D.inselkarten.map(function (e) { return e.id; }));
    zustand.bonusziele = mische(D.bonusziele.map(function (b) { return b.id; })).slice(0, 3);

    const auftraegeStapel = mische(D.auftraege.map(function (a) { return a.id; }));

    sitzplaetze.forEach(function (sitz, i) {
      zustand.spieler[sitz] = {
        name: (namen && namen[sitz]) || D.spielerfarben.find(function (s) { return s.key === sitz; }).name,
        position: D.startWerkstatt[sitz],
        ressourcen: { holz: 1, metall: 1, wasser: 1, energie: 0, bauteil: 0 },
        gebaut: [],
        relikte: [],
        einmalProRunde: {},
        zaehler: { getauscht: 0, untersucht: 0, besuchteGelaende: [], bauteileGefundenGesamt: 0 },
        auftraege: [auftraegeStapel.pop(), auftraegeStapel.pop()],
      };
      merkeGelaendeBesuch(zustand.spieler[sitz], feldTyp(zustand, D.startWerkstatt[sitz]));
      zustand.ausstehend[sitz] = [];
    });

    startZug(zustand, zustand.sitzplaetze[0]);
    log(zustand, "Das Spiel beginnt. " + zustand.spieler[zustand.sitzplaetze[0]].name + " ist zuerst dran.");
    return zustand;
  }

  function leereEffekte() {
    return {
      bewegenExtraKosten: 0, sammelnExtra: 0, handelnKostenlos: false, apBonus: 0,
      geistesblitz: false, sperrFelder: [], sperrGelaendeBewegen: [], sperrGelaendeSammeln: [],
    };
  }

  function startZug(zustand, sitz) {
    zustand.zugSitzIndex = zustand.sitzplaetze.indexOf(sitz);
    zustand.ap = D.regeln.aktionspunkte + zustand.aktivEffekte.diese.apBonus + (zustand.aktivEffekte.diese.bewegenExtraKosten ? 0 : 0);
    EINMAL_PRO_RUNDE_SCHLUESSEL.forEach(function (k) { zustand.spieler[sitz].einmalProRunde[k] = false; });
  }

  // =============================================================== Aktionen

  /** wende(zustand, aktion) -> { zustand, ereignisse, fehler } — nie mutiert das Original. */
  function wende(zustandAlt, aktion) {
    const zustand = klon(zustandAlt);
    const ereignisse = [];
    try {
      const ergebnis = AKTIONEN[aktion.typ];
      if (!ergebnis) return { zustand: zustandAlt, ereignisse: [], fehler: "Unbekannte Aktion: " + aktion.typ };
      ergebnis(zustand, aktion, ereignisse);
      return { zustand: zustand, ereignisse: ereignisse, fehler: null };
    } catch (e) {
      if (e instanceof Regelfehler) return { zustand: zustandAlt, ereignisse: [], fehler: e.message };
      throw e;
    }
  }

  function Regelfehler(msg) { this.message = msg; }
  Regelfehler.prototype = Object.create(Error.prototype);

  function pruefe(bedingung, meldung) {
    if (!bedingung) throw new Regelfehler(meldung);
  }

  function istAmZug(zustand, sitz) {
    return zustand.phase === "spiel" && !zustand.wartetAuf && zustand.sitzplaetze[zustand.zugSitzIndex] === sitz;
  }

  function verlangeEigenerZug(zustand, sitz) {
    pruefe(zustand.phase === "spiel", "Das Spiel läuft nicht (mehr).");
    pruefe(!zustand.wartetAuf, "Es wartet noch jemand auf eine Antwort.");
    pruefe(zustand.sitzplaetze[zustand.zugSitzIndex] === sitz, "Du bist nicht am Zug.");
  }

  function verlangeAp(zustand, n) {
    pruefe(zustand.ap >= n, "Nicht genug Aktionspunkte.");
  }

  const AKTIONEN = {};

  // ------------------------------------------------------------------ Bewegen

  AKTIONEN.bewegen = function (zustand, aktion, ereignisse) {
    verlangeEigenerZug(zustand, aktion.sitz);
    const spieler = zustand.spieler[aktion.sitz];
    const ziel = aktion.ziel;
    pruefe(nach.feld[ziel], "Unbekanntes Feld.");
    pruefe(!istGesperrtZumBetreten(zustand, ziel), "Dieses Feld ist diese Runde gesperrt.");

    const luftschiff = hatErfindung(spieler, "luftschiff");
    let kostenlos = luftschiff;
    let weiteFlugreise = false;

    if (aktion.spezial === "fliegen") {
      pruefe(hatErfindung(spieler, "miniflugmaschine"), "Du hast keine Mini-Flugmaschine.");
      pruefe(!spieler.einmalProRunde.miniflugmaschine, "Die Mini-Flugmaschine ist diese Runde schon benutzt.");
      spieler.einmalProRunde.miniflugmaschine = true;
      weiteFlugreise = true;
    } else if (aktion.spezial === "segeln") {
      pruefe(hatErfindung(spieler, "auslegerboot"), "Du hast kein Auslegerboot.");
      pruefe(!spieler.einmalProRunde.auslegerboot, "Das Auslegerboot ist diese Runde schon benutzt.");
      pruefe(feldTyp(zustand, ziel) === "kueste", "Das Auslegerboot fährt nur zu Küstenfeldern.");
      spieler.einmalProRunde.auslegerboot = true;
      weiteFlugreise = true;
    } else {
      const nachbarn = nachbarnVon(zustand, spieler.position);
      pruefe(nachbarn.indexOf(ziel) !== -1, "Das Feld grenzt nicht an deine Position an.");
      if (!kostenlos && !spieler.einmalProRunde.strickleiter && hatErfindung(spieler, "strickleiter")) {
        spieler.einmalProRunde.strickleiter = true;
        kostenlos = true;
      }
      if (!kostenlos && !spieler.einmalProRunde.reliktkompass && hatRelikt(spieler, "reliktkompass")) {
        spieler.einmalProRunde.reliktkompass = true;
        kostenlos = true;
      }
    }

    const kosten = weiteFlugreise ? 1 : (kostenlos ? 0 : 1 + zustand.aktivEffekte.diese.bewegenExtraKosten);
    verlangeAp(zustand, kosten);
    zustand.ap -= kosten;
    spieler.position = ziel;
    merkeGelaendeBesuch(spieler, feldTyp(zustand, ziel));
    ereignisse.push({ typ: "bewegt", sitz: aktion.sitz, ziel: ziel });
  };

  // ------------------------------------------------------------------ Sammeln

  AKTIONEN.sammeln = function (zustand, aktion, ereignisse) {
    verlangeEigenerZug(zustand, aktion.sitz);
    const spieler = zustand.spieler[aktion.sitz];

    let quelle = spieler.position;
    if (aktion.quelleFeld && aktion.quelleFeld !== spieler.position) {
      pruefe(hatErfindung(spieler, "aussichtsturm"), "Nur der Aussichtsturm erlaubt Sammeln von einem Nachbarfeld.");
      pruefe(nachbarnVon(zustand, spieler.position).indexOf(aktion.quelleFeld) !== -1, "Das ist kein Nachbarfeld.");
      quelle = aktion.quelleFeld;
    }

    const rohstoff = feldGibt(zustand, quelle);
    pruefe(rohstoff, "Auf diesem Feld gibt es nichts zu sammeln.");
    pruefe(!istGesperrtZumSammeln(zustand, quelle), "Hier ist Sammeln diese Runde gesperrt.");

    let kostenlos = false;
    if (!spieler.einmalProRunde.magnetkran && hatErfindung(spieler, "magnetkran")) {
      spieler.einmalProRunde.magnetkran = true;
      kostenlos = true;
    }
    verlangeAp(zustand, kostenlos ? 0 : 1);

    let menge = 1;
    menge += zustand.aktivEffekte.diese.sammelnExtra;
    if (zustand.aktivEffekte.dauerhaft.fruchtbareErde && (feldTyp(zustand, quelle) === "wald" || feldTyp(zustand, quelle) === "kueste")) menge += 1;
    if (rohstoff === "holz" && hatErfindung(spieler, "holzfaelleraxt")) menge += 1;
    if (rohstoff === "wasser" && hatErfindung(spieler, "regenfaenger")) menge += 1;
    if (rohstoff === "metall" && hatErfindung(spieler, "spitzhacke")) menge += 1;
    if (!spieler.einmalProRunde.roboterhelfer && hatErfindung(spieler, "roboterhelfer")) {
      spieler.einmalProRunde.roboterhelfer = true;
      menge += 1;
    }

    if (!kostenlos) zustand.ap -= 1;
    const gaben = {}; gaben[rohstoff] = menge;
    if (rohstoff === "energie") {
      // nichts weiter
    }
    if (!spieler.einmalProRunde.reliktbatterie && hatRelikt(spieler, "reliktbatterie")) {
      spieler.einmalProRunde.reliktbatterie = true;
      gaben.energie = (gaben.energie || 0) + 1;
    }
    gibRessourcen(spieler, gaben);
    merkeGelaendeBesuch(spieler, feldTyp(zustand, quelle));
    ereignisse.push({ typ: "gesammelt", sitz: aktion.sitz, gaben: gaben });
  };

  // -------------------------------------------------------------- Untersuchen

  AKTIONEN.untersuchen = function (zustand, aktion, ereignisse) {
    verlangeEigenerZug(zustand, aktion.sitz);
    const spieler = zustand.spieler[aktion.sitz];
    pruefe(istUntersuchbar(zustand, spieler.position), "Hier gibt es keine Fundmarke mehr.");

    let kostenlos = false;
    if (!spieler.einmalProRunde.ruinenscanner && hatErfindung(spieler, "ruinenscanner")) {
      spieler.einmalProRunde.ruinenscanner = true;
      kostenlos = true;
    }
    verlangeAp(zustand, kostenlos ? 0 : 1);
    if (!kostenlos) zustand.ap -= 1;

    zustand.brett.fundmarkenRest[spieler.position] -= 1;
    spieler.zaehler.untersucht += 1;

    if (hatErfindung(spieler, "taschenlampe")) {
      const a = ziehFundkarte(zustand);
      const b = ziehFundkarte(zustand);
      warteAuf(zustand, aktion.sitz, { art: "taschenlampe_wahl", karten: [a, b] });
      ereignisse.push({ typ: "ruine_taschenlampe", sitz: aktion.sitz, karten: [a, b] });
    } else {
      const karte = ziehFundkarte(zustand);
      wendeFundkarteAn(zustand, aktion.sitz, karte, ereignisse);
    }
  };

  function ziehFundkarte(zustand) {
    if (zustand.stapel.fund.length === 0) {
      pruefe(zustand.stapel.fundAblage.length > 0, "Keine Fundkarten mehr übrig.");
      zustand.stapel.fund = mische(zustand.stapel.fundAblage);
      zustand.stapel.fundAblage = [];
    }
    return zustand.stapel.fund.pop();
  }

  function wendeFundkarteAn(zustand, sitz, kartenId, ereignisse) {
    const karte = nach.fund[kartenId];
    const spieler = zustand.spieler[sitz];
    ereignisse.push({ typ: "fund_gezogen", sitz: sitz, karte: kartenId });

    if (karte.relikt) {
      spieler.relikte.push(kartenId);
      log(zustand, spieler.name + " findet ein Relikt: " + karte.name + ".");
      return;
    }
    zustand.stapel.fundAblage.push(kartenId);

    switch (kartenId) {
      case "fundbauteil":
        gibRessourcen(spieler, { bauteil: 1 });
        spieler.zaehler.bauteileGefundenGesamt += 1;
        break;
      case "reicherfund":
        gibRessourcen(spieler, { bauteil: 2 });
        spieler.zaehler.bauteileGefundenGesamt += 2;
        break;
      case "vorratskiste":
        warteAuf(zustand, sitz, { art: "ressourcenwahl", anzahl: 2, ausschluss: ["bauteil"], grund: "vorratskiste" });
        break;
      case "verwitterte":
        warteAuf(zustand, sitz, { art: "ressourcenwahl", anzahl: 1, ausschluss: ["bauteil"], grund: "verwitterte" });
        ziehAuftrag(zustand, sitz);
        break;
    }
    log(zustand, spieler.name + " findet: " + karte.name + ".");
  }

  function ziehAuftrag(zustand, sitz) {
    // Alle noch nicht vergebenen Aufträge ermitteln und einen ziehen.
    const vergeben = {};
    Object.keys(zustand.spieler).forEach(function (s) {
      zustand.spieler[s].auftraege.forEach(function (a) { vergeben[a] = true; });
    });
    const uebrig = D.auftraege.map(function (a) { return a.id; }).filter(function (id) { return !vergeben[id]; });
    if (uebrig.length === 0) return;
    zustand.spieler[sitz].auftraege.push(mische(uebrig)[0]);
  }

  // ------------------------------------------------------------------- Bauen

  AKTIONEN.bauen = function (zustand, aktion, ereignisse) {
    verlangeEigenerZug(zustand, aktion.sitz);
    const spieler = zustand.spieler[aktion.sitz];
    pruefe(spieler.position === D.startWerkstatt[aktion.sitz], "Du musst in deiner eigenen Werkstatt sein.");

    const stufe = [1, 2, 3].filter(function (s) { return zustand.markt[s].indexOf(aktion.erfindungId) !== -1; })[0];
    pruefe(stufe, "Diese Erfindung liegt nicht in der Auslage.");

    const kartenkosten = klon(nach.erfindung[aktion.erfindungId].kosten);
    if (zustand.aktivEffekte.diese.geistesblitz) {
      const r = aktion.geistesblitzRessource;
      pruefe(r && kartenkosten[r], "Wähle eine Ressource, die diese Erfindung kostet, für den Rabatt.");
      kartenkosten[r] = Math.max(0, kartenkosten[r] - 1);
    }
    pruefe(kannBezahlen(spieler, kartenkosten), "Du hast nicht genug Rohstoffe.");

    const apKosten = hatErfindung(spieler, "hebekran") ? 1 : 2;
    verlangeAp(zustand, apKosten);
    zustand.ap -= apKosten;
    bezahle(spieler, kartenkosten);

    zustand.markt[stufe] = zustand.markt[stufe].filter(function (id) { return id !== aktion.erfindungId; });
    if (zustand.stapel.erfindungen[stufe].length > 0) {
      zustand.markt[stufe].push(zustand.stapel.erfindungen[stufe].pop());
    }
    spieler.gebaut.push(aktion.erfindungId);

    if (stufe === 3 && !zustand.ersterStufe3) zustand.ersterStufe3 = aktion.sitz;
    if (aktion.erfindungId === "feldlabor") ziehAuftrag(zustand, aktion.sitz);

    log(zustand, spieler.name + " baut: " + nach.erfindung[aktion.erfindungId].name + ".");
    ereignisse.push({ typ: "gebaut", sitz: aktion.sitz, erfindungId: aktion.erfindungId });
  };

  // ---------------------------------------------------------------- Handeln

  AKTIONEN.handeln_vorschlagen = function (zustand, aktion, ereignisse) {
    verlangeEigenerZug(zustand, aktion.sitz);
    pruefe(!zustand.handelsAngebot, "Es gibt schon ein offenes Handelsangebot.");
    pruefe(zustand.spieler[aktion.anSitz], "Unbekannter Mitspieler.");
    pruefe(aktion.anSitz !== aktion.sitz, "Du kannst nicht mit dir selbst handeln.");

    const eigene = zustand.spieler[aktion.sitz];
    const andere = zustand.spieler[aktion.anSitz];
    const nachbarn = nachbarnVon(zustand, eigene.position).concat([eigene.position]);
    pruefe(nachbarn.indexOf(andere.position) !== -1, "Dieser Spieler steht nicht auf oder neben deinem Feld.");
    pruefe(kannBezahlen(eigene, aktion.gibt || {}), "Du hast diese Rohstoffe nicht.");
    pruefe(kannBezahlen(andere, aktion.nimmt || {}), "Der andere Spieler hat diese Rohstoffe nicht.");

    const kostenlos = zustand.aktivEffekte.diese.handelnKostenlos || hatErfindung(eigene, "signalhorn");
    verlangeAp(zustand, kostenlos ? 0 : 1);

    zustand.handelsAngebot = {
      id: neueId("handel"), von: aktion.sitz, an: aktion.anSitz,
      gibt: aktion.gibt || {}, nimmt: aktion.nimmt || {}, apKosten: kostenlos ? 0 : 1,
    };
    zustand.wartetAuf = aktion.anSitz;
    log(zustand, eigene.name + " bietet " + andere.name + " einen Tausch an.");
    ereignisse.push({ typ: "handel_angeboten", angebot: zustand.handelsAngebot });
  };

  AKTIONEN.handeln_antwort = function (zustand, aktion, ereignisse) {
    pruefe(zustand.handelsAngebot, "Es liegt kein Angebot vor.");
    pruefe(zustand.handelsAngebot.an === aktion.sitz, "Dieses Angebot richtet sich nicht an dich.");
    const angebot = zustand.handelsAngebot;
    const von = zustand.spieler[angebot.von];
    const an = zustand.spieler[angebot.an];

    if (aktion.annehmen) {
      bezahle(von, angebot.gibt); gibRessourcen(an, angebot.gibt);
      bezahle(an, angebot.nimmt); gibRessourcen(von, angebot.nimmt);
      von.zaehler.getauscht += 1; an.zaehler.getauscht += 1;
      zustand.ap -= angebot.apKosten;
      log(zustand, an.name + " nimmt den Tausch an.");
      ereignisse.push({ typ: "handel_angenommen", angebot: angebot });
    } else {
      log(zustand, an.name + " lehnt den Tausch ab.");
      ereignisse.push({ typ: "handel_abgelehnt", angebot: angebot });
    }
    zustand.handelsAngebot = null;
    zustand.wartetAuf = null;
  };

  // -------------------------------------------------------------- Tauschbank

  AKTIONEN.tauschbank = function (zustand, aktion, ereignisse) {
    verlangeEigenerZug(zustand, aktion.sitz);
    const spieler = zustand.spieler[aktion.sitz];
    pruefe(spieler.position === D.startWerkstatt[aktion.sitz], "Die Tauschbank gibt es nur in deiner eigenen Werkstatt.");
    pruefe((spieler.ressourcen[aktion.gibtRessource] || 0) >= 3, "Du brauchst 3 gleiche Rohstoffe.");
    verlangeAp(zustand, 1);
    zustand.ap -= 1;
    spieler.ressourcen[aktion.gibtRessource] -= 3;
    gibRessourcen(spieler, (function () { const o = {}; o[aktion.nimmtRessource] = 1; return o; })());
    ereignisse.push({ typ: "getauscht_bank", sitz: aktion.sitz });
  };

  // -------------------------------------------------------- Sonderfähigkeiten

  AKTIONEN.sonderfaehigkeit = function (zustand, aktion, ereignisse) {
    verlangeEigenerZug(zustand, aktion.sitz);
    const spieler = zustand.spieler[aktion.sitz];
    const schluessel = aktion.schluessel;

    if (schluessel === "lagerfeuer" || schluessel === "feldlabor") {
      pruefe(hatErfindung(spieler, schluessel), "Du hast diese Erfindung nicht.");
      pruefe(!spieler.einmalProRunde[schluessel], "Schon diese Runde benutzt.");
      const menge = schluessel === "lagerfeuer" ? 2 : 1;
      pruefe((spieler.ressourcen[aktion.gibtRessource] || 0) >= menge, "Nicht genug Rohstoffe dafür.");
      spieler.einmalProRunde[schluessel] = true;
      spieler.ressourcen[aktion.gibtRessource] -= menge;
      gibRessourcen(spieler, (function () { const o = {}; o[aktion.nimmtRessource] = 1; return o; })());
      ereignisse.push({ typ: "sonderfaehigkeit", schluessel: schluessel, sitz: aktion.sitz });
      return;
    }

    if (schluessel === "destillieranlage") {
      pruefe(hatErfindung(spieler, schluessel), "Du hast die Destillieranlage nicht.");
      pruefe(!spieler.einmalProRunde[schluessel], "Schon diese Runde benutzt.");
      pruefe((spieler.ressourcen.wasser || 0) >= 3, "Du brauchst 3 Wasser.");
      verlangeAp(zustand, 1);
      spieler.einmalProRunde[schluessel] = true;
      zustand.ap -= 1;
      spieler.ressourcen.wasser -= 3;
      gibRessourcen(spieler, { bauteil: 1 });
      spieler.zaehler.bauteileGefundenGesamt += 1;
      ereignisse.push({ typ: "sonderfaehigkeit", schluessel: schluessel, sitz: aktion.sitz });
      return;
    }

    throw new Regelfehler("Unbekannte Sonderfähigkeit.");
  };

  // ----------------------------------------------------------- Zug beenden

  AKTIONEN.zug_beenden = function (zustand, aktion, ereignisse) {
    verlangeEigenerZug(zustand, aktion.sitz);
    pruefe(zustand.ausstehend[aktion.sitz].length === 0, "Du musst erst noch etwas entscheiden.");

    // Der Startspieler rotiert jede Runde (siehe rundeAbschliessen), darum
    // reicht "Index bis ans Arrayende" nicht als Rundenende-Erkennung — wir
    // zählen stattdessen, wie viele der sitzplaetze.length Spieler diese
    // Runde schon dran waren, und laufen dabei rund um das Array herum.
    zustand.zuegeDieseRunde += 1;
    if (zustand.zuegeDieseRunde < zustand.sitzplaetze.length) {
      const naechsterIndex = (zustand.zugSitzIndex + 1) % zustand.sitzplaetze.length;
      const naechsterSitz = zustand.sitzplaetze[naechsterIndex];
      startZug(zustand, naechsterSitz);
      log(zustand, zustand.spieler[naechsterSitz].name + " ist am Zug.");
      ereignisse.push({ typ: "naechster_zug", sitz: naechsterSitz });
    } else {
      rundeAbschliessen(zustand, ereignisse);
    }
  };

  function rundeAbschliessen(zustand, ereignisse) {
    // B) Lager prüfen — wer über dem Limit ist, muss abwerfen.
    zustand.sitzplaetze.forEach(function (sitz) {
      const spieler = zustand.spieler[sitz];
      const ueberschuss = gesamtRessourcen(spieler, true) - lagerlimit(spieler);
      if (ueberschuss > 0) warteAuf(zustand, sitz, { art: "abwerfen", anzahl: ueberschuss });
    });

    // C) Ereigniskarte aufdecken.
    if (zustand.stapel.ereignisse.length === 0) zustand.stapel.ereignisse = mische(D.ereignisse.map(function (e) { return e.id; }));
    const ereignisId = zustand.stapel.ereignisse.pop();
    wendeEreignisAn(zustand, ereignisId, ereignisse);

    // D) Inselentwicklung nach Runde 2, 4, 6.
    if (D.regeln.inselkartenRunden.indexOf(zustand.runde) !== -1 && zustand.stapel.insel.length > 0) {
      const inselId = zustand.stapel.insel.pop();
      wendeInselkarteAn(zustand, inselId, ereignisse);
    }

    // Effekte für die neue Runde übernehmen ("nächste Runde" -> "diese Runde").
    zustand.aktivEffekte.diese = zustand.aktivEffekte.naechste;
    zustand.aktivEffekte.naechste = leereEffekte();
    zustand.rundenSperren = {
      felder: zustand.aktivEffekte.diese.sperrFelder,
      gelaendeBewegen: zustand.aktivEffekte.diese.sperrGelaendeBewegen,
      gelaendeSammeln: zustand.aktivEffekte.diese.sperrGelaendeSammeln,
    };

    // E) Rundenende.
    zustand.runde += 1;
    if (zustand.runde > D.regeln.runden) {
      beendeSpiel(zustand, ereignisse);
      return;
    }
    zustand.startspielerIndex = (zustand.startspielerIndex + 1) % zustand.sitzplaetze.length;

    // Automatik-Fabrik: zu Beginn jeder Runde 1 beliebige Ressource.
    zustand.sitzplaetze.forEach(function (sitz) {
      if (hatErfindung(zustand.spieler[sitz], "automatikfabrik")) {
        warteAuf(zustand, sitz, { art: "ressourcenwahl", anzahl: 1, ausschluss: [], grund: "automatikfabrik" });
      }
    });

    zustand.zuegeDieseRunde = 0;
    const ersterSitz = zustand.sitzplaetze[zustand.startspielerIndex];
    startZug(zustand, ersterSitz);
    log(zustand, "— Runde " + zustand.runde + " beginnt. " + zustand.spieler[ersterSitz].name + " ist Startspieler. —");
    ereignisse.push({ typ: "neue_runde", runde: zustand.runde });
  }

  // ----------------------------------------------------------- Ereigniskarten

  function wendeEreignisAn(zustand, id, ereignisse) {
    const karte = nach.ereignis[id];
    log(zustand, "Ereignis: " + karte.name + " — " + karte.text);
    ereignisse.push({ typ: "ereignis", karte: id });
    const naechste = zustand.aktivEffekte.naechste;

    switch (id) {
      case "tropensturm": naechste.bewegenExtraKosten = 1; break;
      case "geistesblitz": naechste.geistesblitz = true; break;
      case "neugierigeaffen":
        zustand.sitzplaetze.forEach(function (sitz) {
          if (gesamtRessourcen(zustand.spieler[sitz], false) > 0) {
            warteAuf(zustand, sitz, { art: "verlustwahl", anzahl: 1, grund: "neugierigeaffen" });
          }
        });
        break;
      case "inselbebt": {
        const optionen = D.felder.map(function (f) { return f.id; }).filter(function (fid) { return feldSpielerFarbe(fid) === null; });
        warteAuf(zustand, zustand.sitzplaetze[zustand.startspielerIndex], { art: "feldwahl_sperren", optionen: optionen });
        break;
      }
      case "regenzeit":
        zustand.sitzplaetze.forEach(function (sitz) { gibRessourcen(zustand.spieler[sitz], { wasser: 1 }); });
        break;
      case "sonnensturm":
        zustand.sitzplaetze.forEach(function (sitz) {
          const spieler = zustand.spieler[sitz];
          if (feldTyp(zustand, spieler.position) === "energie") gibRessourcen(spieler, { energie: 1 });
          else if (spieler.ressourcen.energie > 0) spieler.ressourcen.energie -= 1;
        });
        break;
      case "buntevoegel": naechste.sammelnExtra = 1; break;
      case "flut":
        naechste.sperrGelaendeBewegen.push("kueste");
        naechste.sperrGelaendeSammeln.push("kueste");
        break;
      case "waldbrand": naechste.sperrGelaendeSammeln.push("wald"); break;
      case "strandgut":
        zustand.sitzplaetze.forEach(function (sitz) {
          if (feldTyp(zustand, zustand.spieler[sitz].position) === "kueste") {
            warteAuf(zustand, sitz, { art: "ressourcenwahl", anzahl: 2, ausschluss: ["bauteil"], grund: "strandgut" });
          }
        });
        break;
      case "erfinderkongress": naechste.handelnKostenlos = true; break;
      case "sternenklarenacht": naechste.apBonus = 1; break;
    }
  }

  // ------------------------------------------------------------ Inselkarten

  function freieBrachlandFelder(zustand) {
    return D.felder.filter(function (f) { return feldTyp(zustand, f.id) === "brachland"; }).map(function (f) { return f.id; });
  }

  function beliebigesErsatzfeld(zustand) {
    return D.felder
      .filter(function (f) { return f.typ !== "werkstatt" && f.id !== D.grosseRuine; })
      .map(function (f) { return f.id; });
  }

  function setzeFeldTyp(zustand, feldId, typ, fundmarken) {
    zustand.brett.ueberschreibungen[feldId] = zustand.brett.ueberschreibungen[feldId] || {};
    zustand.brett.ueberschreibungen[feldId].typ = typ;
    if (fundmarken) zustand.brett.fundmarkenRest[feldId] = fundmarken;
  }

  function wendeInselkarteAn(zustand, id, ereignisse) {
    const karte = nach.insel[id];
    log(zustand, "Inselentwicklung: " + karte.name);
    ereignisse.push({ typ: "inselkarte", karte: id });
    const startSitz = zustand.sitzplaetze[zustand.startspielerIndex];

    function zielFeld(bevorzugterTyp) {
      const brachland = freieBrachlandFelder(zustand);
      if (brachland.length === 1) return { feld: brachland[0], mehrereOptionen: null };
      if (brachland.length > 1) return { feld: null, mehrereOptionen: brachland };
      const ersatz = beliebigesErsatzfeld(zustand).filter(function (f) { return feldTyp(zustand, f) !== bevorzugterTyp; });
      if (ersatz.length === 1) return { feld: ersatz[0], mehrereOptionen: null };
      return { feld: null, mehrereOptionen: ersatz };
    }

    switch (id) {
      case "neueenergiequelle": case "waldwaechst": {
        const typ = id === "neueenergiequelle" ? "energie" : "wald";
        const z = zielFeld(typ);
        if (z.feld) setzeFeldTyp(zustand, z.feld, typ);
        else warteAuf(zustand, startSitz, { art: "feldwahl_insel", optionen: z.mehrereOptionen, insel: id });
        break;
      }
      case "verschuetteteruine": case "minebrichtein": {
        const bevorzugt = id === "minebrichtein" ? "mine" : "brachland";
        let ziel;
        if (id === "minebrichtein") {
          const minen = D.felder.filter(function (f) { return feldTyp(zustand, f.id) === "mine"; }).map(function (f) { return f.id; });
          ziel = minen.length === 1 ? minen[0] : null;
          if (!ziel && minen.length > 1) { warteAuf(zustand, startSitz, { art: "feldwahl_insel", optionen: minen, insel: id }); break; }
        } else {
          const z = zielFeld(bevorzugt);
          if (z.feld) ziel = z.feld;
          else { warteAuf(zustand, startSitz, { art: "feldwahl_insel", optionen: z.mehrereOptionen, insel: id }); break; }
        }
        setzeFeldTyp(zustand, ziel, "ruine", 3);
        break;
      }
      case "wasserspiegelsteigt": {
        const kandidaten = D.felder
          .filter(function (f) { return f.typ !== "werkstatt" && f.id !== D.grosseRuine && feldTyp(zustand, f.id) !== "kueste"; })
          .map(function (f) { return f.id; });
        if (kandidaten.length === 1) setzeFeldTyp(zustand, kandidaten[0], "kueste");
        else warteAuf(zustand, startSitz, { art: "feldwahl_insel", optionen: kandidaten, insel: id });
        break;
      }
      case "bruecke": {
        const schonVerbunden = {};
        zustand.brett.zusatzKanten.forEach(function (p) { schonVerbunden[p[0]] = true; schonVerbunden[p[1]] = true; });
        const werkstaetten = Object.keys(D.startWerkstatt).map(function (s) { return D.startWerkstatt[s]; })
          .filter(function (f) { return !schonVerbunden[f]; });
        if (werkstaetten.length === 1) zustand.brett.zusatzKanten.push([D.grosseRuine, werkstaetten[0]]);
        else if (werkstaetten.length > 1) warteAuf(zustand, startSitz, { art: "feldwahl_insel", optionen: werkstaetten, insel: id });
        break;
      }
      case "leuchtpilze":
        D.felder.forEach(function (f) {
          if (feldTyp(zustand, f.id) === "ruine" || feldTyp(zustand, f.id) === "grruine") {
            zustand.brett.fundmarkenRest[f.id] = fundmarkenRest(zustand, f.id) + 2;
          }
        });
        break;
      case "fruchtbareerde": zustand.aktivEffekte.dauerhaft.fruchtbareErde = true; break;
    }
  }

  // -------------------------------------------------------------- Ausstehend

  function warteAuf(zustand, sitz, eintrag) {
    eintrag.id = neueId("aus");
    zustand.ausstehend[sitz] = zustand.ausstehend[sitz] || [];
    zustand.ausstehend[sitz].push(eintrag);
  }

  AKTIONEN.ausstehend_loesen = function (zustand, aktion, ereignisse) {
    const liste = zustand.ausstehend[aktion.sitz] || [];
    const index = liste.findIndex(function (e) { return e.id === aktion.eintragId; });
    pruefe(index !== -1, "Dieser Punkt steht bei dir nicht mehr aus.");
    const eintrag = liste[index];
    const spieler = zustand.spieler[aktion.sitz];

    switch (eintrag.art) {
      case "abwerfen": {
        const gaben = aktion.wahl || {};
        const summe = Object.keys(gaben).reduce(function (s, k) { return s + gaben[k]; }, 0);
        pruefe(summe === eintrag.anzahl, "Du musst genau " + eintrag.anzahl + " abwerfen.");
        Object.keys(gaben).forEach(function (k) {
          pruefe((spieler.ressourcen[k] || 0) >= gaben[k], "Du hast davon nicht so viele.");
          spieler.ressourcen[k] -= gaben[k];
        });
        break;
      }
      case "verlustwahl": {
        const r = aktion.wahl && aktion.wahl.ressource;
        pruefe(r && (spieler.ressourcen[r] || 0) > 0, "Wähle eine Ressource, die du besitzt.");
        spieler.ressourcen[r] -= 1;
        break;
      }
      case "ressourcenwahl": {
        const gaben = aktion.wahl || {};
        const summe = Object.keys(gaben).reduce(function (s, k) { return s + gaben[k]; }, 0);
        pruefe(summe === eintrag.anzahl, "Wähle genau " + eintrag.anzahl + " Rohstoff(e).");
        (eintrag.ausschluss || []).forEach(function (k) { pruefe(!gaben[k], "Das darf hier nicht gewählt werden."); });
        gibRessourcen(spieler, gaben);
        break;
      }
      case "feldwahl_sperren": {
        pruefe(eintrag.optionen.indexOf(aktion.wahl) !== -1, "Ungültiges Feld.");
        zustand.aktivEffekte.naechste.sperrFelder.push(aktion.wahl);
        break;
      }
      case "feldwahl_insel": {
        pruefe(eintrag.optionen.indexOf(aktion.wahl) !== -1, "Ungültiges Feld.");
        if (eintrag.insel === "bruecke") zustand.brett.zusatzKanten.push([D.grosseRuine, aktion.wahl]);
        else if (eintrag.insel === "minebrichtein" || eintrag.insel === "verschuetteteruine") setzeFeldTyp(zustand, aktion.wahl, "ruine", 3);
        else if (eintrag.insel === "neueenergiequelle") setzeFeldTyp(zustand, aktion.wahl, "energie");
        else if (eintrag.insel === "waldwaechst") setzeFeldTyp(zustand, aktion.wahl, "wald");
        else if (eintrag.insel === "wasserspiegelsteigt") setzeFeldTyp(zustand, aktion.wahl, "kueste");
        break;
      }
      case "taschenlampe_wahl": {
        pruefe(eintrag.karten.indexOf(aktion.wahl) !== -1, "Das war keine der beiden Karten.");
        const andere = eintrag.karten.filter(function (k) { return k !== aktion.wahl; })[0];
        zustand.stapel.fund.unshift(andere);
        liste.splice(index, 1);
        wendeFundkarteAn(zustand, aktion.sitz, aktion.wahl, ereignisse);
        return;
      }
      default:
        throw new Regelfehler("Unbekannter ausstehender Punkt.");
    }
    liste.splice(index, 1);
    ereignisse.push({ typ: "ausstehend_geloest", sitz: aktion.sitz, art: eintrag.art });
  };

  // =============================================================== Wertung

  function beendeSpiel(zustand, ereignisse) {
    zustand.phase = "ende";
    const platzierung = zustand.sitzplaetze.map(function (sitz) { return berechneWertung(zustand, sitz); });
    platzierung.sort(function (a, b) {
      if (b.punkte !== a.punkte) return b.punkte - a.punkte;
      if (b.erfindungen !== a.erfindungen) return b.erfindungen - a.erfindungen;
      return b.bauteile - a.bauteile;
    });
    zustand.ergebnis = { platzierung: platzierung };
    log(zustand, "Das Spiel ist zu Ende. " + zustand.spieler[platzierung[0].sitz].name + " gewinnt!");
    ereignisse.push({ typ: "spiel_ende", ergebnis: zustand.ergebnis });
  }

  function bonuszielErfuellt(zustand, sitz, bonusId) {
    const spieler = zustand.spieler[sitz];
    const alle = zustand.sitzplaetze.map(function (s) { return zustand.spieler[s]; });
    switch (bonusId) {
      case "meistermaschinen": return new Set(spieler.gebaut).size >= 3;
      case "vielfalt": return ALLE_ROHSTOFFE.every(function (r) { return (spieler.ressourcen[r] || 0) >= 1; });
      case "entdecker": {
        const werte = alle.map(function (s) { return s.zaehler.bauteileGefundenGesamt; });
        const max = Math.max.apply(null, werte);
        return max > 0 && spieler.zaehler.bauteileGefundenGesamt === max;
      }
      case "schnellbauer": return zustand.ersterStufe3 === sitz;
      case "energiemeister": return spieler.gebaut.filter(function (id) { return (nach.erfindung[id].kosten.energie || 0) > 0; }).length >= 2;
      case "guternachbar": return spieler.zaehler.getauscht >= 3;
      case "heimatverbunden": return spieler.position === D.startWerkstatt[sitz];
      case "fleissig": return spieler.gebaut.length >= 5;
      case "holzhuette": return spieler.gebaut.filter(function (id) { return (nach.erfindung[id].kosten.holz || 0) > 0; }).length >= 3;
      case "kuestenbewohner": return (spieler.ressourcen.wasser || 0) >= 5;
      default: return false;
    }
  }

  function auftragErfuellt(zustand, sitz, auftragId) {
    const spieler = zustand.spieler[sitz];
    switch (auftragId) {
      case "holzsammler": return (spieler.ressourcen.holz || 0) >= 4;
      case "metallhaendler": return (spieler.ressourcen.metall || 0) >= 4;
      case "wassertraeger": return (spieler.ressourcen.wasser || 0) >= 4;
      case "energiebuendel": return (spieler.ressourcen.energie || 0) >= 3;
      case "schatzsucher": return (spieler.ressourcen.bauteil || 0) >= 2;
      case "weltenbummler": return ["wald", "mine", "kueste", "energie", "ruine"].every(function (t) {
        return spieler.zaehler.besuchteGelaende.indexOf(t) !== -1 || (t === "ruine" && spieler.zaehler.besuchteGelaende.indexOf("grruine") !== -1);
      });
      case "baumeister": return spieler.gebaut.length >= 3;
      case "grossmeister": return spieler.gebaut.some(function (id) { return nach.erfindung[id].stufe === 3; });
      case "ruinenforscher": return spieler.zaehler.untersucht >= 4;
      case "haendler": return spieler.zaehler.getauscht >= 3;
      case "heimwerker": return spieler.gebaut.filter(function (id) { return nach.erfindung[id].stufe === 1; }).length >= 2;
      case "sparfuchs": return gesamtRessourcen(spieler, true) >= 8;
      default: return false;
    }
  }

  function berechneWertung(zustand, sitz) {
    const spieler = zustand.spieler[sitz];
    const details = { erfindungen: [], bauteile: 0, auftraege: [], bonusziele: [], relikte: [], restRohstoffe: 0 };
    let punkte = 0;

    spieler.gebaut.forEach(function (id) {
      const e = nach.erfindung[id];
      details.erfindungen.push({ id: id, name: e.name, punkte: e.punkte });
      punkte += e.punkte;
    });
    if (hatErfindung(spieler, "grossebruecke")) punkte += spieler.gebaut.length;

    const bauteilWert = hatErfindung(spieler, "leuchtturm") ? 4 : 2;
    details.bauteile = spieler.ressourcen.bauteil || 0;
    punkte += details.bauteile * bauteilWert;

    spieler.auftraege.forEach(function (id) {
      const erfuellt = auftragErfuellt(zustand, sitz, id);
      details.auftraege.push({ id: id, name: nach.auftrag[id].name, punkte: nach.auftrag[id].punkte, erfuellt: erfuellt });
      if (erfuellt) punkte += nach.auftrag[id].punkte;
    });

    zustand.bonusziele.forEach(function (id) {
      const erfuellt = bonuszielErfuellt(zustand, sitz, id);
      details.bonusziele.push({ id: id, name: nach.bonus[id].name, punkte: nach.bonus[id].punkte, erfuellt: erfuellt });
      if (erfuellt) punkte += nach.bonus[id].punkte;
    });

    if (hatRelikt(spieler, "reliktwaechter")) { details.relikte.push({ id: "reliktwaechter", punkte: 4 }); punkte += 4; }

    // Restliche Rohstoffe: Wasser/Energie ggf. per Erfindung einzeln, Rest 3:1.
    const pool = { holz: spieler.ressourcen.holz || 0, metall: spieler.ressourcen.metall || 0 };
    if (hatErfindung(spieler, "wasserrecycling")) { punkte += (spieler.ressourcen.wasser || 0); }
    else pool.wasser = spieler.ressourcen.wasser || 0;
    if (hatErfindung(spieler, "energiespeicher")) { punkte += (spieler.ressourcen.energie || 0) * 2; }
    else pool.energie = spieler.ressourcen.energie || 0;
    const restSumme = Object.keys(pool).reduce(function (s, k) { return s + pool[k]; }, 0);
    details.restRohstoffe = Math.floor(restSumme / 3);
    punkte += details.restRohstoffe;

    return { sitz: sitz, name: spieler.name, punkte: punkte, erfindungen: spieler.gebaut.length, bauteile: details.bauteile, details: details };
  }

  // ======================================================= Mögliche Aktionen
  //
  // Für die UI (welche Knöpfe sind anklickbar?) und für automatisierte Tests.
  // Gibt niemals AP-Kosten>vorhanden zurück; prüft aber nicht jede einzelne
  // Regel — wende() bleibt die einzige Wahrheit. Bei einer abgelehnten
  // Aktion einfach ignorieren und neu anzeigen (der Zustand ändert sich ja
  // nicht).

  function gueltigeAktionen(zustand, sitz) {
    const liste = [];
    if (zustand.phase !== "spiel") return liste;

    (zustand.ausstehend[sitz] || []).forEach(function (eintrag) {
      liste.push({ typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, eintrag: eintrag });
    });
    if (liste.length > 0) return liste; // erst entscheiden, dann weiter

    if (zustand.wartetAuf === sitz && zustand.handelsAngebot) {
      liste.push({ typ: "handeln_antwort", sitz: sitz, annehmen: true });
      liste.push({ typ: "handeln_antwort", sitz: sitz, annehmen: false });
      return liste;
    }
    if (zustand.wartetAuf) return liste; // jemand anders muss erst antworten

    if (!istAmZug(zustand, sitz)) return liste;
    const spieler = zustand.spieler[sitz];

    const bewegenKostenlos = hatErfindung(spieler, "luftschiff")
      || (!spieler.einmalProRunde.strickleiter && hatErfindung(spieler, "strickleiter"))
      || (!spieler.einmalProRunde.reliktkompass && hatRelikt(spieler, "reliktkompass"));
    const bewegenKosten = bewegenKostenlos ? 0 : 1 + zustand.aktivEffekte.diese.bewegenExtraKosten;

    if (zustand.ap >= bewegenKosten) {
      nachbarnVon(zustand, spieler.position).forEach(function (ziel) {
        if (!istGesperrtZumBetreten(zustand, ziel)) liste.push({ typ: "bewegen", sitz: sitz, ziel: ziel });
      });
    }
    if (zustand.ap >= 1) {
      if (hatErfindung(spieler, "miniflugmaschine") && !spieler.einmalProRunde.miniflugmaschine) {
        D.felder.forEach(function (f) {
          if (f.id !== spieler.position && !istGesperrtZumBetreten(zustand, f.id)) {
            liste.push({ typ: "bewegen", sitz: sitz, ziel: f.id, spezial: "fliegen" });
          }
        });
      }
      if (hatErfindung(spieler, "auslegerboot") && !spieler.einmalProRunde.auslegerboot) {
        D.felder.forEach(function (f) {
          if (feldTyp(zustand, f.id) === "kueste" && !istGesperrtZumBetreten(zustand, f.id)) {
            liste.push({ typ: "bewegen", sitz: sitz, ziel: f.id, spezial: "segeln" });
          }
        });
      }
    }

    const sammelnKostenlos = !spieler.einmalProRunde.magnetkran && hatErfindung(spieler, "magnetkran");
    if (zustand.ap >= (sammelnKostenlos ? 0 : 1)) {
      if (feldGibt(zustand, spieler.position) && !istGesperrtZumSammeln(zustand, spieler.position)) {
        liste.push({ typ: "sammeln", sitz: sitz });
      }
      if (hatErfindung(spieler, "aussichtsturm")) {
        nachbarnVon(zustand, spieler.position).forEach(function (n) {
          if (feldGibt(zustand, n) && !istGesperrtZumSammeln(zustand, n)) {
            liste.push({ typ: "sammeln", sitz: sitz, quelleFeld: n });
          }
        });
      }
    }

    const untersuchenKostenlos = !spieler.einmalProRunde.ruinenscanner && hatErfindung(spieler, "ruinenscanner");
    if (zustand.ap >= (untersuchenKostenlos ? 0 : 1) && istUntersuchbar(zustand, spieler.position)) {
      liste.push({ typ: "untersuchen", sitz: sitz });
    }

    if (spieler.position === D.startWerkstatt[sitz]) {
      [1, 2, 3].forEach(function (stufe) {
        zustand.markt[stufe].forEach(function (id) {
          const apKosten = hatErfindung(spieler, "hebekran") ? 1 : 2;
          if (zustand.ap < apKosten) return;
          const kosten = nach.erfindung[id].kosten;
          if (zustand.aktivEffekte.diese.geistesblitz) {
            Object.keys(kosten).forEach(function (r) {
              const probe = klon(kosten); probe[r] = Math.max(0, probe[r] - 1);
              if (kannBezahlen(spieler, probe)) liste.push({ typ: "bauen", sitz: sitz, erfindungId: id, geistesblitzRessource: r });
            });
          } else if (kannBezahlen(spieler, kosten)) {
            liste.push({ typ: "bauen", sitz: sitz, erfindungId: id });
          }
        });
      });
      ALLE_ROHSTOFFE.forEach(function (g) {
        if ((spieler.ressourcen[g] || 0) >= 3 && zustand.ap >= 1) {
          ALLE_ROHSTOFFE.forEach(function (n) { if (n !== g) liste.push({ typ: "tauschbank", sitz: sitz, gibtRessource: g, nimmtRessource: n }); });
        }
      });
    }

    if (zustand.ap >= 1 || zustand.aktivEffekte.diese.handelnKostenlos || hatErfindung(spieler, "signalhorn")) {
      const hierUndDaneben = nachbarnVon(zustand, spieler.position).concat([spieler.position]);
      zustand.sitzplaetze.forEach(function (anderer) {
        if (anderer === sitz) return;
        if (hierUndDaneben.indexOf(zustand.spieler[anderer].position) !== -1) {
          liste.push({ typ: "handeln_vorschlagen", sitz: sitz, anSitz: anderer, gibt: {}, nimmt: {} });
        }
      });
    }

    if (hatErfindung(spieler, "lagerfeuer") && !spieler.einmalProRunde.lagerfeuer) {
      ALLE_ROHSTOFFE.forEach(function (g) {
        if ((spieler.ressourcen[g] || 0) >= 2) liste.push({ typ: "sonderfaehigkeit", sitz: sitz, schluessel: "lagerfeuer", gibtRessource: g });
      });
    }
    if (hatErfindung(spieler, "feldlabor") && !spieler.einmalProRunde.feldlabor) {
      ALLE_ROHSTOFFE.forEach(function (g) {
        if ((spieler.ressourcen[g] || 0) >= 1) liste.push({ typ: "sonderfaehigkeit", sitz: sitz, schluessel: "feldlabor", gibtRessource: g });
      });
    }
    if (hatErfindung(spieler, "destillieranlage") && !spieler.einmalProRunde.destillieranlage && zustand.ap >= 1 && (spieler.ressourcen.wasser || 0) >= 3) {
      liste.push({ typ: "sonderfaehigkeit", sitz: sitz, schluessel: "destillieranlage" });
    }

    liste.push({ typ: "zug_beenden", sitz: sitz });
    return liste;
  }

  // =================================================================== Export

  const Motor = {
    erstelleSpiel: erstelleSpiel,
    wende: wende,
    gueltigeAktionen: gueltigeAktionen,
    hilfen: {
      feldTyp: feldTyp, feldGibt: feldGibt, fundmarkenRest: fundmarkenRest,
      istUntersuchbar: istUntersuchbar, nachbarnVon: nachbarnVon,
      istGesperrtZumBetreten: istGesperrtZumBetreten, istGesperrtZumSammeln: istGesperrtZumSammeln,
      hatErfindung: hatErfindung, hatRelikt: hatRelikt, gesamtRessourcen: gesamtRessourcen,
      lagerlimit: lagerlimit, istAmZug: istAmZug, berechneWertung: berechneWertung,
      auftragErfuellt: auftragErfuellt, bonuszielErfuellt: bonuszielErfuellt,
    },
    nach: nach,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = { Motor: Motor };
  else global.Motor = Motor;
})(typeof window !== "undefined" ? window : global);
