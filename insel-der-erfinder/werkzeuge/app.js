// -*- coding: utf-8 -*-
//
// app.js — die Oberfläche von "Insel der Erfinder" (Online-Spiel).
// Setzt auf motor.js auf (reiner Reducer) und kennt zwei Speicher:
//   - Lokal: alles in einer JS-Variable, für Pass-and-Play auf einem Gerät.
//   - Online: ein gemeinsames Dokument über die "db"-Fähigkeit, für Partien
//     über mehrere Geräte hinweg (setzt voraus, dass der Betrachter das
//     Spiel im selben Kontext / derselben Organisation öffnet).
//
// Diese Datei erwartet SPIELDATEN (window) und Motor (window), beide von
// vorherigen <script>-Blöcken gesetzt.

(function () {
  "use strict";

  const D = window.SPIELDATEN;
  const M = window.Motor;
  const APP_EL = document.getElementById("app");

  // ----------------------------------------------------------------- Hilfen

  function h(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function neueId(n) { return Math.random().toString(36).slice(2, 2 + n); }
  function jetzt() { return Date.now(); }

  const RESSOURCE_LISTE = ["holz", "metall", "wasser", "energie", "bauteil"];
  function ressourceZeichen(k) { return D.ressourcen[k].emoji; }
  function ressourceFarbe(k) { return "var(--" + k + ")"; }
  function ressourceFarbeHell(k) { return "var(--" + k + "-hell)"; }
  function farbeVon(sitz) { return D.spielerfarben.find(function (s) { return s.key === sitz; }); }

  function kostenChips(kosten) {
    return RESSOURCE_LISTE.filter(function (k) { return kosten[k]; }).map(function (k) {
      return '<span style="background:' + ressourceFarbeHell(k) + ";color:" + ressourceFarbe(k) + '">' +
        ressourceZeichen(k) + "&nbsp;" + kosten[k] + "</span>";
    }).join("");
  }

  // --------------------------------------------------------- Client-Identität

  function holeClientId() {
    let id = localStorage.getItem("insel-client-id");
    if (!id) { id = neueId(16); localStorage.setItem("insel-client-id", id); }
    return id;
  }

  // ======================================================================
  // App-Zustand (nicht zu verwechseln mit dem Spielzustand aus motor.js)
  // ======================================================================

  const App = {
    bildschirm: "start",     // start | lobbyLokal | lobbyOnlineErstellen | lobbyOnlineBeitreten | spiel | ende
    modus: null,             // "lokal" | "online"
    zustand: null,           // der Spielzustand (aus motor.js)
    meinSitzOnline: null,    // fest belegter Sitz im Online-Modus
    raumcode: null,
    sitze: {},               // nur online: { farbe: {clientId, name} }
    dbVerfuegbar: null,      // null = noch unbekannt, true/false danach
    clientId: holeClientId(),
    fehler: null,
    brettModus: "ruhe",      // ruhe | zielWaehlen | flugZielWaehlen | segelZielWaehlen
    seitenleisteOffen: false,
    seitenleisteTab: "markt",
    offenesTableau: null,    // Sitz, dessen Tableau gerade offen ist
    missionenSichtbar: false,
    toast: null,
    letzterEffekt: null,   // { feldId, art: 'funkeln'|'fliesstext', text?, zeit } - kurze Reaktion aufs Brett
    konfettiGezeigt: false,
    localLobby: { anzahl: 2, namen: {} },
  };

  let dbNamespace = null;
  let raumAbmelden = null;

  // ------------------------------------------------------------- Lokale Sicherung

  function sichereLokal() {
    if (App.modus !== "lokal" || !App.zustand) return;
    try { localStorage.setItem("insel-lokal-spiel", JSON.stringify(App.zustand)); } catch (e) { /* egal */ }
  }
  function ladeLokal() {
    try {
      const s = localStorage.getItem("insel-lokal-spiel");
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }
  function loescheLokal() { try { localStorage.removeItem("insel-lokal-spiel"); } catch (e) { /* egal */ } }

  // ======================================================================
  // Wer muss gerade handeln? (vereinheitlicht Lokal- und Online-Modus)
  // ======================================================================

  function ermittleHandelndenSitz(zustand) {
    if (!zustand) return null;
    for (let i = 0; i < zustand.sitzplaetze.length; i++) {
      const s = zustand.sitzplaetze[i];
      if ((zustand.ausstehend[s] || []).length > 0) return s;
    }
    if (zustand.wartetAuf) return zustand.wartetAuf;
    return zustand.sitzplaetze[zustand.zugSitzIndex];
  }

  /** Der Sitz, aus dessen Sicht DIESES Gerät gerade die Oberfläche zeigt. */
  function wirksamerSitz() {
    if (!App.zustand) return null;
    if (App.modus === "lokal") return ermittleHandelndenSitz(App.zustand);
    return App.meinSitzOnline;
  }

  // ======================================================================
  // Aktionen senden
  // ======================================================================

  function melde(text, art) {
    App.toast = { text: text, art: art || "info", id: neueId(6) };
    render();
    setTimeout(function () {
      if (App.toast && App.toast.text === text) { App.toast = null; render(); }
    }, 3200);
  }

  async function sende(aktion) {
    App.fehler = null;
    if (App.modus === "lokal") {
      const r = M.wende(App.zustand, aktion);
      if (r.fehler) { melde(r.fehler, "fehler"); return; }
      App.zustand = r.zustand;
      App.brettModus = "ruhe";
      zeigeKartenToast(r.ereignisse, r.zustand);
      sichereLokal();
      render();
      return;
    }
    // Online: immer erst frisch lesen, dann anwenden, dann minimal schreiben.
    try {
      const ref = raumDok();
      const snap = await ref.get();
      if (!snap.exists) { melde("Der Raum wurde geschlossen.", "fehler"); return; }
      const dok = snap.data();
      const r = M.wende(dok, aktion);
      if (r.fehler) { melde(r.fehler, "fehler"); return; }
      App.brettModus = "ruhe";
      const patch = berechneMinimalesUpdate(dok, r.zustand);
      if (Object.keys(patch).length > 0) await ref.update(patch);
      zeigeKartenToast(r.ereignisse, r.zustand);
      // App.zustand wird gleich über onSnapshot aktualisiert.
    } catch (e) {
      melde("Verbindung hat nicht geklappt: " + (e && e.message ? e.message : e), "fehler");
    }
  }

  /** Setzt App.letzterEffekt für die kurze Reaktion aufs Brett (Funkeln,
   * Fließtext) — zeichneAktionsEffekt() in app.js liest das beim Rendern. */
  function setzeAktionsEffekt(ereignisse, zustandDanach) {
    for (let i = ereignisse.length - 1; i >= 0; i--) {
      const e = ereignisse[i];
      if (e.typ === "gesammelt") {
        const feldId = zustandDanach.spieler[e.sitz].position;
        const teile = Object.keys(e.gaben).map(function (k) { return ressourceZeichen(k) + " +" + e.gaben[k]; });
        App.letzterEffekt = { feldId: feldId, art: "fliesstext", text: teile.join("  "), zeit: Date.now() };
        return;
      }
      if (e.typ === "bewegt") {
        App.letzterEffekt = { feldId: e.ziel, art: "funkeln", zeit: Date.now() };
        return;
      }
      if (e.typ === "gebaut" || e.typ === "fund_gezogen" || e.typ === "ruine_taschenlampe" || e.typ === "getauscht_bank" || e.typ === "sonderfaehigkeit") {
        const feldId = zustandDanach.spieler[e.sitz].position;
        App.letzterEffekt = { feldId: feldId, art: "funkeln", zeit: Date.now() };
        return;
      }
    }
  }

  function zeigeKartenToast(ereignisse, zustandDanach) {
    setzeAktionsEffekt(ereignisse, zustandDanach);
    ereignisse.forEach(function (e) {
      if (e.typ === "ereignis") melde((M.nach.ereignis[e.karte].emoji) + " " + M.nach.ereignis[e.karte].name, "karte");
      if (e.typ === "inselkarte") melde((M.nach.insel[e.karte].emoji) + " " + M.nach.insel[e.karte].name, "karte");
      if (e.typ === "spiel_ende") { App.bildschirm = "ende"; loescheLokal(); }
    });
  }

  function berechneMinimalesUpdate(alt, neu) {
    const patch = {};
    Object.keys(neu).forEach(function (schluessel) {
      if (schluessel === "spieler" || schluessel === "ausstehend") {
        const teil = {};
        Object.keys(neu[schluessel]).forEach(function (sitz) {
          if (JSON.stringify((alt[schluessel] || {})[sitz]) !== JSON.stringify(neu[schluessel][sitz])) {
            teil[sitz] = neu[schluessel][sitz];
          }
        });
        if (Object.keys(teil).length > 0) patch[schluessel] = teil;
      } else if (JSON.stringify(alt[schluessel]) !== JSON.stringify(neu[schluessel])) {
        patch[schluessel] = neu[schluessel];
      }
    });
    return patch;
  }

  // ======================================================================
  // Online: Raum anlegen / beitreten / abonnieren
  // ======================================================================

  function raumDok() { return dbNamespace.collection("rooms").doc(App.raumcode); }

  async function pruefeDbVerfuegbarkeit() {
    try {
      dbNamespace = await window.claude.use("db");
    } catch (e) { dbNamespace = null; }
    App.dbVerfuegbar = !!dbNamespace;
    render();
  }

  async function raumErstellen(name) {
    if (!dbNamespace) return;
    const code = neueId(4).toUpperCase();
    App.raumcode = code;
    const farbe = D.spielerfarben[0].key;
    App.meinSitzOnline = farbe;
    const sitze = {};
    sitze[farbe] = { clientId: App.clientId, name: name };
    await raumDok().set({ phase: "lobby", sitze: sitze, gastgeberClientId: App.clientId, erstelltAm: new Date().toISOString() });
    location.hash = "raum=" + code;
    abonniereRaum();
  }

  async function raumBeitreten(code, name, farbe) {
    if (!dbNamespace) return;
    App.raumcode = code.toUpperCase().trim();
    const ref = raumDok();
    const snap = await ref.get();
    if (!snap.exists) { melde("Diesen Raumcode gibt es nicht.", "fehler"); App.raumcode = null; render(); return; }
    const dok = snap.data();
    if (dok.phase && dok.phase !== "lobby") { melde("Diese Partie läuft schon.", "fehler"); App.raumcode = null; render(); return; }
    const sitze = Object.assign({}, dok.sitze || {});
    const belegt = sitze[farbe];
    if (belegt && belegt.clientId !== App.clientId) { melde("Diese Farbe ist schon vergeben.", "fehler"); return; }
    sitze[farbe] = { clientId: App.clientId, name: name };
    await ref.update({ sitze: sitze });
    App.meinSitzOnline = farbe;
    location.hash = "raum=" + App.raumcode;
    abonniereRaum();
  }

  function abonniereRaum() {
    App.modus = "online";
    if (raumAbmelden) raumAbmelden();
    App.fehler = null;
    raumAbmelden = raumDok().onSnapshot(function (snap) {
      if (!snap.exists) { melde("Der Raum wurde geschlossen.", "fehler"); return; }
      const dok = snap.data();
      App.sitze = dok.sitze || {};
      if (dok.phase === "lobby") {
        App.bildschirm = "lobbyOnlineWarten";
        App.zustand = null;
      } else {
        App.zustand = dok;
        App.bildschirm = dok.phase === "ende" ? "ende" : "spiel";
      }
      render();
    }, function (err) {
      melde("Verbindung verloren: " + err.message, "fehler");
    });
    App.bildschirm = "lobbyOnlineWarten";
    render();
  }

  async function raumSpielStarten() {
    const snap = await raumDok().get();
    const dok = snap.data();
    const sitze = dok.sitze || {};
    const reihenfolge = D.spielerfarben.map(function (s) { return s.key; }).filter(function (k) { return sitze[k]; });
    if (reihenfolge.length < 2) { melde("Mindestens 2 Spieler nötig.", "fehler"); return; }
    const namen = {};
    reihenfolge.forEach(function (k) { namen[k] = sitze[k].name; });
    const zustand = M.erstelleSpiel(reihenfolge, namen);
    await raumDok().set(Object.assign({ sitze: sitze, gastgeberClientId: dok.gastgeberClientId }, zustand));
  }

  function raumVerlassen() {
    if (raumAbmelden) { raumAbmelden(); raumAbmelden = null; }
    App.modus = null; App.raumcode = null; App.meinSitzOnline = null; App.zustand = null; App.sitze = {};
    location.hash = "";
    App.bildschirm = "start";
    render();
  }

  // ======================================================================
  // Lokale Partie anlegen
  // ======================================================================

  function lokaleParieStarten() {
    const anzahl = App.localLobby.anzahl;
    const sitzplaetze = D.spielerfarben.slice(0, anzahl).map(function (s) { return s.key; });
    const namen = {};
    sitzplaetze.forEach(function (s) { namen[s] = (App.localLobby.namen[s] || "").trim() || farbeVon(s).name; });
    App.modus = "lokal";
    App.zustand = M.erstelleSpiel(sitzplaetze, namen);
    App.bildschirm = "spiel";
    sichereLokal();
    render();
  }

  // ======================================================================
  // Rendern
  // ======================================================================

  function render() {
    APP_EL.innerHTML = "";
    let inhalt;
    switch (App.bildschirm) {
      case "start": inhalt = renderStart(); break;
      case "lobbyLokal": inhalt = renderLobbyLokal(); break;
      case "lobbyOnlineErstellen": inhalt = renderLobbyOnlineErstellen(); break;
      case "lobbyOnlineBeitreten": inhalt = renderLobbyOnlineBeitreten(); break;
      case "lobbyOnlineWarten": inhalt = renderLobbyOnlineWarten(); break;
      case "spiel": inhalt = renderSpiel(); break;
      case "ende": inhalt = renderEnde(); break;
      default: inhalt = h('<div>?</div>');
    }
    APP_EL.appendChild(inhalt);
    if (App.toast) APP_EL.appendChild(renderToast());
    if (App.bildschirm === "spiel") {
      const eingehend = eingehendesAngebot();
      if (eingehend) APP_EL.appendChild(renderHandelEingehendModal(eingehend));
      else if (aktivesAusstehend()) APP_EL.appendChild(renderAusstehendModal(aktivesAusstehend()));
      else if (App.modalAktion) APP_EL.appendChild(renderAktionsModal(App.modalAktion));
      if (App.offenesTableau) APP_EL.appendChild(renderTableau(App.offenesTableau));
    }
  }

  function renderToast() {
    const t = App.toast;
    return h('<div class="karten-toast"><span class="te">' + (t.art === "fehler" ? "⚠️" : t.art === "karte" ? "🃏" : "ℹ️") +
      '</span><span>' + esc(t.text) + '</span></div>');
  }

  // ------------------------------------------------------------------ Start

  function renderStart() {
    const el = h('<div class="start"></div>');
    el.appendChild(h(
      '<div class="start-kopf"><div class="emoji">🏝️</div><h1>Insel der Erfinder</h1>' +
      '<p>Das digitale Brett zum Spiel — spielbereit, mit allen Erfindungen, Ereignissen und Missionen.</p></div>'
    ));
    const gespeichert = ladeLokal();
    const gruppe = h('<div class="wahlkarten"></div>');
    if (gespeichert && gespeichert.phase === "spiel") {
      const weiter = h(
        '<button class="wahlkarte" id="weiterspielen"><span class="we">↩️</span>' +
        '<span class="wt"><b>Gespeicherte Partie fortsetzen</b><span>Runde ' + gespeichert.runde + ' von ' + D.regeln.runden + '</span></span></button>'
      );
      weiter.onclick = function () {
        App.modus = "lokal"; App.zustand = gespeichert; App.bildschirm = "spiel"; render();
      };
      gruppe.appendChild(weiter);
    }
    const lokal = h(
      '<button class="wahlkarte" id="waehle-lokal"><span class="we">🪑</span>' +
      '<span class="wt"><b>Lokal auf diesem Gerät</b><span>2–4 Spieler reichen sich ein Gerät weiter — funktioniert überall, sofort.</span></span></button>'
    );
    lokal.onclick = function () { App.bildschirm = "lobbyLokal"; render(); };
    gruppe.appendChild(lokal);

    const erstellen = h(
      '<button class="wahlkarte" id="waehle-online-erstellen"><span class="we">🌐</span>' +
      '<span class="wt"><b>Online-Raum erstellen</b><span>Ein Spielstand, live geteilt über mehrere Geräte.</span></span></button>'
    );
    erstellen.onclick = function () { App.bildschirm = "lobbyOnlineErstellen"; render(); if (App.dbVerfuegbar === null) pruefeDbVerfuegbarkeit(); };
    gruppe.appendChild(erstellen);

    const beitreten = h(
      '<button class="wahlkarte" id="waehle-online-beitreten"><span class="we">🔑</span>' +
      '<span class="wt"><b>Einem Raum beitreten</b><span>Du hast schon einen Raumcode bekommen.</span></span></button>'
    );
    beitreten.onclick = function () { App.bildschirm = "lobbyOnlineBeitreten"; render(); if (App.dbVerfuegbar === null) pruefeDbVerfuegbarkeit(); };
    gruppe.appendChild(beitreten);

    el.appendChild(gruppe);
    return el;
  }

  function zurueckKnopf(ziel) {
    const b = h('<button class="zurueck-link">← Zurück</button>');
    b.onclick = function () { App.bildschirm = ziel; render(); };
    return b;
  }

  // ------------------------------------------------------------- Lokale Lobby

  function renderLobbyLokal() {
    const el = h('<div class="start"></div>');
    el.appendChild(zurueckKnopf("start"));
    el.appendChild(h('<div class="start-kopf"><div class="emoji">🪑</div><h1>Lokal spielen</h1>' +
      '<p>Wie viele Erfinder sitzen am Tisch?</p></div>'));

    const anzahlGruppe = h('<div class="feld-gruppe"><label>Anzahl Spieler</label></div>');
    const anzahlReihe = h('<div style="display:flex;gap:8px"></div>');
    [2, 3, 4].forEach(function (n) {
      const b = h('<button class="knopf ' + (App.localLobby.anzahl === n ? "primaer" : "zweitrangig") + '" style="flex:1">' + n + '</button>');
      b.onclick = function () { App.localLobby.anzahl = n; render(); };
      anzahlReihe.appendChild(b);
    });
    anzahlGruppe.appendChild(anzahlReihe);
    el.appendChild(anzahlGruppe);

    const namenGruppe = h('<div class="feld-gruppe"><label>Namen (optional)</label></div>');
    const liste = h('<div class="spielerliste"></div>');
    D.spielerfarben.slice(0, App.localLobby.anzahl).forEach(function (s) {
      const zeile = h('<div class="spielerzeile"><span class="farbpunkt" style="background:' + s.farbe + '"></span></div>');
      const input = document.createElement("input");
      input.placeholder = s.name; input.value = App.localLobby.namen[s.key] || "";
      input.oninput = function () { App.localLobby.namen[s.key] = input.value; };
      zeile.appendChild(input);
      liste.appendChild(zeile);
    });
    namenGruppe.appendChild(liste);
    el.appendChild(namenGruppe);

    const start = h('<button class="knopf primaer breit">🏝️ Spiel beginnen</button>');
    start.onclick = lokaleParieStarten;
    el.appendChild(start);
    return el;
  }

  // -------------------------------------------------------- Online: erstellen

  function renderLobbyOnlineErstellen() {
    const el = h('<div class="start"></div>');
    el.appendChild(zurueckKnopf("start"));
    el.appendChild(h('<div class="start-kopf"><div class="emoji">🌐</div><h1>Online-Raum erstellen</h1>' +
      '<p>Andere öffnen diese Seite und geben deinen Code ein.</p></div>'));
    if (App.dbVerfuegbar === false) {
      el.appendChild(h('<div class="fehlermeldung">Online-Räume sind hier gerade nicht verfügbar. ' +
        'Das kann daran liegen, dass diese Seite nicht als geteilter Raum geöffnet ist. Nimm stattdessen den lokalen Modus.</div>'));
      return el;
    }
    const gruppe = h('<div class="feld-gruppe"><label>Dein Name</label></div>');
    const input = document.createElement("input");
    input.className = "textfeld"; input.placeholder = "z. B. Theresa"; input.id = "online-name";
    gruppe.appendChild(input);
    el.appendChild(gruppe);
    const knopf = h('<button class="knopf primaer breit">Raum erstellen</button>');
    knopf.disabled = App.dbVerfuegbar !== true;
    knopf.onclick = function () { raumErstellen(input.value.trim() || "Erfinder 1"); };
    el.appendChild(knopf);
    if (App.dbVerfuegbar === null) el.appendChild(h('<p style="text-align:center;color:var(--tinte2);font-size:13px;margin-top:10px">Prüfe Verfügbarkeit …</p>'));
    return el;
  }

  function renderLobbyOnlineBeitreten() {
    const el = h('<div class="start"></div>');
    el.appendChild(zurueckKnopf("start"));
    el.appendChild(h('<div class="start-kopf"><div class="emoji">🔑</div><h1>Raum beitreten</h1>' +
      '<p>Gib den Code ein, den du bekommen hast.</p></div>'));
    if (App.dbVerfuegbar === false) {
      el.appendChild(h('<div class="fehlermeldung">Online-Räume sind hier gerade nicht verfügbar.</div>'));
      return el;
    }
    const codeGruppe = h('<div class="feld-gruppe"><label>Raumcode</label></div>');
    const codeInput = document.createElement("input");
    codeInput.className = "textfeld code-feld"; codeInput.maxLength = 4; codeInput.placeholder = "ABCD";
    codeGruppe.appendChild(codeInput);
    el.appendChild(codeGruppe);

    const nameGruppe = h('<div class="feld-gruppe"><label>Dein Name</label></div>');
    const nameInput = document.createElement("input");
    nameInput.className = "textfeld"; nameInput.placeholder = "z. B. Theresa";
    nameGruppe.appendChild(nameInput);
    el.appendChild(nameGruppe);

    const farbGruppe = h('<div class="feld-gruppe"><label>Farbe</label></div>');
    const farbReihe = h('<div style="display:flex;gap:8px"></div>');
    let gewaehlteFarbe = D.spielerfarben[0].key;
    D.spielerfarben.forEach(function (s, i) {
      const b = h('<button class="knopf ' + (i === 0 ? "primaer" : "zweitrangig") + '" style="flex:1;background:' +
        (i === 0 ? s.farbe : "") + '">' + s.name + '</button>');
      b.onclick = function () {
        gewaehlteFarbe = s.key;
        Array.prototype.forEach.call(farbReihe.children, function (c, j) {
          c.className = "knopf " + (j === i ? "primaer" : "zweitrangig");
          c.style.background = j === i ? s.farbe : "";
        });
      };
      farbReihe.appendChild(b);
    });
    farbGruppe.appendChild(farbReihe);
    el.appendChild(farbGruppe);

    const knopf = h('<button class="knopf primaer breit">Beitreten</button>');
    knopf.onclick = function () {
      if (codeInput.value.trim().length !== 4) { melde("Der Code hat 4 Zeichen.", "fehler"); return; }
      raumBeitreten(codeInput.value, nameInput.value.trim() || "Erfinder", gewaehlteFarbe);
    };
    el.appendChild(knopf);
    return el;
  }

  function renderLobbyOnlineWarten() {
    const el = h('<div class="start"></div>');
    const zurueck = h('<button class="zurueck-link">← Raum verlassen</button>');
    zurueck.onclick = raumVerlassen;
    el.appendChild(zurueck);
    el.appendChild(h('<div class="raumcode-anzeige"><div class="code">' + esc(App.raumcode) + '</div>' +
      '<p>Diesen Code an die anderen weitergeben</p></div>'));

    const liste = h('<div class="spielerliste"></div>');
    D.spielerfarben.forEach(function (s) {
      const belegt = App.sitze[s.key];
      const zeile = h('<div class="spielerzeile"><span class="farbpunkt" style="background:' + s.farbe + '"></span>' +
        '<span' + (belegt ? "" : ' class="sitz-frei"') + '>' + (belegt ? esc(belegt.name) : "noch frei") +
        (belegt && belegt.clientId === App.clientId ? " (du)" : "") + '</span></div>');
      liste.appendChild(zeile);
    });
    el.appendChild(liste);

    const anzahl = Object.keys(App.sitze).length;
    const start = h('<button class="knopf primaer breit">🏝️ Spiel beginnen (' + anzahl + ' Spieler)</button>');
    start.disabled = anzahl < 2;
    start.onclick = raumSpielStarten;
    el.appendChild(start);
    el.appendChild(h('<p style="text-align:center;color:var(--tinte2);font-size:12.5px;margin-top:10px">' +
      'Jeder öffnet diese Seite und tritt mit demselben Code bei.</p>'));
    return el;
  }

  // ======================================================================
  // Spielbildschirm
  // ======================================================================

  function renderSpiel() {
    const el = h('<div id="app-spiel" style="height:100%;display:flex;flex-direction:column"></div>');
    const zustand = App.zustand;
    const sitz = wirksamerSitz();
    el.appendChild(renderSpielkopf(zustand, sitz));

    const buehne = h('<div class="buehne"></div>');
    buehne.appendChild(renderBrettBereich(zustand, sitz));
    buehne.appendChild(renderSeitenleiste(zustand, sitz));
    el.appendChild(buehne);

    el.appendChild(renderAktionsriegel(zustand, sitz));
    return el;
  }

  function renderSpielkopf(zustand, sitz) {
    const handelnder = ermittleHandelndenSitz(zustand);
    const spielerHandelnd = zustand.spieler[handelnder];
    // Online zeigen wir "Du", wenn es der eigene Sitz ist, sonst den Namen.
    // Lokal (ein gemeinsames Gerät) gibt es kein "du" — hier muss immer der
    // Name stehen, sonst weiß am Tisch niemand, wer das Gerät bekommt.
    const zeigeDu = App.modus === "online" && handelnder === sitz;
    const kopf = h('<div class="spielkopf"></div>');
    kopf.appendChild(h('<span class="runde-chip">Runde ' + zustand.runde + '/' + D.regeln.runden + '</span>'));
    const amzug = h('<div class="amzug"></div>');
    const punkt = '<span class="farbpunkt" style="width:12px;height:12px;background:' + farbeVon(handelnder).farbe + '"></span>';
    amzug.innerHTML = punkt + '<b>' + (zeigeDu ? "Du bist" : esc(spielerHandelnd.name) + " ist") +
      (zustand.wartetAuf ? " gefragt" : " am Zug") + '</b>';
    kopf.appendChild(amzug);
    const apAnzeige = h('<div class="ap-punkte"></div>');
    for (let i = 0; i < Math.max(3, zustand.ap); i++) {
      apAnzeige.appendChild(h('<span class="ap-punkt' + (i < zustand.ap ? " voll" : "") + '"></span>'));
    }
    kopf.appendChild(apAnzeige);
    const menuKnopf = h('<button class="icon" title="Protokoll & Markt">📜</button>');
    menuKnopf.onclick = function () { App.seitenleisteOffen = !App.seitenleisteOffen; render(); };
    kopf.appendChild(menuKnopf);
    return kopf;
  }

  // -------------------------------------------------------------- Brett/SVG

  // Die Leinwand wird aus dem tatsächlichen Feldkranz berechnet (nicht aus
  // einer festen Größe) — sonst bleibt bei schmalen Bildschirmen viel
  // ungenutzter Rand übrig, wo eigentlich nur die 19 Felder hingehören.
  const HEX_S = 78;
  const TOKEN_RAND = 55; // Platz für Spielfiguren unterhalb jedes Feldes

  function hexMitteRoh(q, r) {
    return [HEX_S * Math.sqrt(3) * (q + r / 2), HEX_S * 1.5 * r];
  }
  function hexPunkte(cx, cy, s) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i + 30);
      pts.push((cx + s * Math.cos(a)).toFixed(1) + "," + (cy + s * Math.sin(a)).toFixed(1));
    }
    return pts.join(" ");
  }

  const RAHMEN = (function () {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    D.felder.forEach(function (f) {
      const [cx, cy] = hexMitteRoh(f.q, f.r);
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i + 30);
        const x = cx + HEX_S * Math.cos(a), y = cy + HEX_S * Math.sin(a);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    });
    const pad = 26;
    return { ox: -minX + pad, oy: -minY + pad, breite: maxX - minX + pad * 2, hoehe: maxY - minY + pad * 2 + TOKEN_RAND };
  })();
  const OX = RAHMEN.ox, OY = RAHMEN.oy, BREITE = RAHMEN.breite, HOEHE = RAHMEN.hoehe;

  function hexMitte(q, r) {
    return [OX + HEX_S * Math.sqrt(3) * (q + r / 2), OY + HEX_S * 1.5 * r];
  }

  // ----------------------------------------------- Schatzkarten-Symbole
  // Kleine gestreute Symbole statt eines großen Emojis mit Beschriftung je
  // Feld — was ein Feld ist, zeigt die Legende, nicht ein bunter Block.

  function seedVon(text) {
    let wert = 0;
    for (let i = 0; i < text.length; i++) wert = (wert * 131 + text.charCodeAt(i)) % 1000003;
    return wert || 1;
  }
  function zufallsReihe(seed) {
    let z = seed;
    return function () { z = (z * 9301 + 49297) % 233280; return z / 233280; };
  }
  function emojiSvg(cx, cy, emoji, groesse, drehung, opacity) {
    let attrs = "";
    if (drehung) attrs += ' transform="rotate(' + drehung.toFixed(1) + " " + cx.toFixed(1) + " " + cy.toFixed(1) + ')"';
    if (opacity !== undefined && opacity < 1) attrs += ' opacity="' + opacity + '"';
    return '<text x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" font-size="' + groesse +
      '" text-anchor="middle" dominant-baseline="middle"' + attrs + ">" + emoji + "</text>";
  }
  function streueSymbole(cx, cy, radius, seed, elemente) {
    const zufall = zufallsReihe(seed);
    let out = "";
    elemente.forEach(function (el) {
      const winkel = zufall() * Math.PI * 2;
      const abstand = radius * (0.1 + zufall() * 0.4);
      const x = cx + Math.cos(winkel) * abstand;
      const y = cy + Math.sin(winkel) * abstand * 0.85;
      out += emojiSvg(x, y, el[0], el[1], (zufall() - 0.5) * 28);
    });
    return out;
  }
  function wellenSymbole(cx, cy, radius, farbe, seed) {
    const zufall = zufallsReihe(seed);
    let out = "";
    for (let i = 0; i < 2; i++) {
      const x = cx + (zufall() - 0.5) * radius * 0.6;
      const y = cy + (zufall() - 0.5) * radius * 0.4 + i * 10;
      const w = radius * 0.6;
      out += '<path class="eff-welle" style="animation-delay:' + (i * 0.7).toFixed(1) + 's" d="M ' +
        (x - w / 2).toFixed(1) + " " + y.toFixed(1) + " q " + (w / 4).toFixed(1) + " -6 " +
        (w / 2).toFixed(1) + " 0 q " + (w / 4).toFixed(1) + " 6 " + (w / 2).toFixed(1) + ' 0" stroke="' + farbe +
        '" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
    }
    return out;
  }
  function steinkreisSvg(cx, cy, r, farbeStein, farbeSchatten) {
    let out = "";
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n - Math.PI / 2;
      const sx = cx + Math.cos(a) * r, sy = cy + Math.sin(a) * r;
      const breite = r * 0.24, hoehe = r * 0.6;
      const dreh = (a * 180) / Math.PI + 90;
      out += '<rect x="' + (sx - breite / 2).toFixed(1) + '" y="' + (sy - hoehe).toFixed(1) + '" width="' +
        breite.toFixed(1) + '" height="' + hoehe.toFixed(1) + '" rx="2" fill="' + farbeStein + '" stroke="' +
        farbeSchatten + '" stroke-width="1.3" transform="rotate(' + dreh.toFixed(1) + " " + sx.toFixed(1) + " " +
        sy.toFixed(1) + ')"/>';
    }
    return out;
  }
  function zeltSvg(cx, cy, r, farbe) {
    const sx = cx, sy = cy - r * 0.95;
    const liY = cy + r * 0.38, reX = cx + r * 0.72;
    return (
      '<polygon points="' + sx + "," + sy + " " + (cx - r * 0.72) + "," + liY + " " + reX + "," + liY +
      '" fill="' + farbe + '" stroke="var(--tinte)" stroke-width="2"/>' +
      '<line x1="' + sx + '" y1="' + sy + '" x2="' + cx + '" y2="' + liY + '" stroke="var(--tinte)" stroke-width="1.4"/>' +
      '<line x1="' + sx + '" y1="' + sy + '" x2="' + sx + '" y2="' + (sy - r * 0.6) + '" stroke="var(--tinte)" stroke-width="1.6"/>' +
      '<polygon class="eff-fahne" points="' + sx + "," + (sy - r * 0.6) + " " + (sx + r * 0.5) + "," + (sy - r * 0.46) + " " + sx + "," +
      (sy - r * 0.32) + '" fill="var(--tinte)"/>'
    );
  }

  // ------------------------------------------------------ Rauch am Vulkan
  function rauchSvg(cx, cy, seed) {
    const zufall = zufallsReihe(seed + 7);
    let out = "";
    for (let i = 0; i < 3; i++) {
      const x = cx + (zufall() - 0.5) * 10;
      const versatz = ((zufall() - 0.5) * 16).toFixed(1);
      const verzoegerung = (i * 1.1 + zufall()).toFixed(2);
      out += '<circle class="eff-rauch" style="--rauch-x:' + versatz + 'px; animation-delay:-' + verzoegerung +
        's" cx="' + x.toFixed(1) + '" cy="' + (cy - 14).toFixed(1) + '" r="' + (5 + zufall() * 3).toFixed(1) +
        '" fill="var(--tinte3)"/>';
    }
    return out;
  }
  const GELAENDE_SYMBOLE = {
    wald: [["\u{1F332}", 19], ["\u{1F334}", 16], ["\u{1F332}", 13]],
    mine: [["⛰️", 18], ["\u{1FAA8}", 13], ["⛏️", 11]],
  };

  const EFFEKT_DAUER_MS = 1100;

  /** Die kurze Reaktion aufs Brett, die sende() über App.letzterEffekt
   * ausgelöst hat: ein Funken-Kranz beim Bewegen/Bauen/Untersuchen, ein
   * aufsteigender Fließtext beim Sammeln. Läuft rein über CSS-Animationen,
   * die Grafik wird nur einmal gezeichnet, wenn sie noch frisch ist. */
  function zeichneAktionsEffekt() {
    const e = App.letzterEffekt;
    if (!e) return "";
    if (Date.now() - e.zeit > EFFEKT_DAUER_MS) { App.letzterEffekt = null; return ""; }
    const feld = nach_feld(e.feldId);
    if (!feld) return "";
    const [cx, cy] = hexMitte(feld.q, feld.r);
    if (e.art === "fliesstext") {
      return '<text class="eff-fliesstext" x="' + cx.toFixed(1) + '" y="' + (cy - 8).toFixed(1) +
        '" font-size="19" text-anchor="middle" font-weight="800" fill="var(--tinte)">' + esc(e.text) + "</text>";
    }
    let out = '<circle class="eff-ring" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) +
      '" r="18" fill="none" stroke="var(--akzent)"/>';
    const sterne = ["✨", "⭐", "✦"];
    for (let i = 0; i < 5; i++) {
      const winkel = (Math.PI * 2 * i) / 5;
      const x = cx + Math.cos(winkel) * 30, y = cy + Math.sin(winkel) * 30;
      out += '<text class="eff-funkel" style="animation-delay:' + (i * 0.05).toFixed(2) + 's" x="' + x.toFixed(1) +
        '" y="' + y.toFixed(1) + '" font-size="16" text-anchor="middle">' + sterne[i % sterne.length] + "</text>";
    }
    return out;
  }

  function renderBrettBereich(zustand, sitz) {
    const bereich = h('<div class="brett-bereich"></div>');
    const optionen = sitz ? M.gueltigeAktionen(zustand, sitz) : [];
    const zielFelder = {};
    if (App.brettModus === "zielWaehlen") {
      optionen.filter(function (o) { return o.typ === "bewegen" && !o.spezial; }).forEach(function (o) { zielFelder[o.ziel] = o; });
    } else if (App.brettModus === "flugZielWaehlen") {
      optionen.filter(function (o) { return o.typ === "bewegen" && o.spezial === "fliegen"; }).forEach(function (o) { zielFelder[o.ziel] = o; });
    } else if (App.brettModus === "segelZielWaehlen") {
      optionen.filter(function (o) { return o.typ === "bewegen" && o.spezial === "segeln"; }).forEach(function (o) { zielFelder[o.ziel] = o; });
    }

    let svg = '<svg viewBox="0 0 ' + BREITE + ' ' + HOEHE + '">';
    svg += '<defs><radialGradient id="meer" cx="50%" cy="45%" r="75%">' +
      '<stop offset="0%" stop-color="var(--meer)"/><stop offset="100%" stop-color="var(--meer-dunkel)"/></radialGradient></defs>';
    svg += '<rect x="0" y="0" width="' + BREITE + '" height="' + HOEHE + '" fill="url(#meer)"/>';
    // Insel als ruhige zweifarbige Fläche unter dem Feldkranz - eine
    // Schatzkarte, kein Formular mit farbigen Kästchen.
    svg += '<rect x="8" y="8" width="' + (BREITE - 16) + '" height="' + (HOEHE - 16) +
      '" rx="44" fill="var(--strand)"/>';
    svg += '<rect x="22" y="22" width="' + (BREITE - 44) + '" height="' + (HOEHE - 44 - TOKEN_RAND * 0.6) +
      '" rx="36" fill="var(--inselgruen)" stroke="var(--tinte2)" stroke-width="2"/>';

    D.felder.forEach(function (f) {
      const [cx, cy] = hexMitte(f.q, f.r);
      const typ = M.hilfen.feldTyp(zustand, f.id);
      const anklickbar = !!zielFelder[f.id];
      const seed = seedVon(f.id);
      svg += '<g class="hexfeld' + (anklickbar ? " anklickbar" : "") + '" data-feld="' + f.id + '">';
      // Ein sehr blasser Feldumriss als Platzierungshilfe - nicht als bunter Rahmen.
      svg += '<polygon class="hexumriss" points="' + hexPunkte(cx, cy, HEX_S - 3) + '" fill="' +
        (anklickbar ? "var(--akzent-hell)" : "transparent") + '" stroke="' + (anklickbar ? "var(--gut)" : "var(--tinte2)") +
        '" stroke-width="' + (anklickbar ? 5 : 1.4) + '"' +
        (anklickbar ? "" : ' stroke-dasharray="1 6" stroke-opacity="0.55"') + "/>";

      if (f.spieler) {
        svg += zeltSvg(cx, cy + 6, 27, farbeVon(f.spieler).farbe);
      } else if (typ === "grruine") {
        svg += steinkreisSvg(cx, cy + 4, 27, "#c9beA4", "var(--tinte2)");
      } else if (typ === "ruine") {
        svg += emojiSvg(cx, cy, "\u{1F3DB}️", 27, 0, 0.92);
        svg += streueSymbole(cx, cy, HEX_S * 0.68, seed, [["\u{1FAA8}", 11]]);
      } else if (typ === "energie") {
        svg += emojiSvg(cx, cy - 2, "\u{1F30B}", 30);
        svg += rauchSvg(cx, cy - 16, seed);
      } else if (typ === "kueste") {
        svg += wellenSymbole(cx, cy, HEX_S, "var(--meer-dunkel)", seed);
      } else if (GELAENDE_SYMBOLE[typ]) {
        svg += streueSymbole(cx, cy, HEX_S * 0.6, seed, GELAENDE_SYMBOLE[typ]);
      } else if (typ === "brachland") {
        svg += emojiSvg(cx, cy, "\u{1F33E}", 14, 0, 0.35);
      }

      if (M.hilfen.istUntersuchbar(zustand, f.id)) {
        svg += '<circle cx="' + (cx + 24) + '" cy="' + (cy - 24) + '" r="13" fill="var(--blatt)" ' +
          'stroke="var(--tinte2)" stroke-width="2" stroke-dasharray="4 3"/>';
        svg += '<text x="' + (cx + 24) + '" y="' + (cy - 20) + '" font-size="12" font-weight="800" text-anchor="middle" fill="var(--tinte2)">' +
          M.hilfen.fundmarkenRest(zustand, f.id) + '</text>';
      }
      svg += "</g>";
    });

    // Spielfiguren
    zustand.sitzplaetze.forEach(function (s, idx) {
      const feld = nach_feld(zustand.spieler[s].position);
      const [cx, cy] = hexMitte(feld.q, feld.r);
      const versatz = versatzFuerToken(zustand, s);
      const farbe = farbeVon(s);
      const istEigener = s === sitz;
      svg += '<g class="spielfigur" data-figur="' + s + '" style="cursor:pointer" transform="translate(' +
        (cx + versatz[0]) + "," + (cy + 28 + versatz[1]) + ')">';
      svg += '<circle r="15" fill="' + farbe.farbe + '" stroke="var(--blatt)" stroke-width="2.5"/>';
      svg += '<text x="0" y="5" font-size="14" text-anchor="middle">🙂</text>';
      if (istEigener) svg += '<circle class="eff-eigener-ring" r="19" fill="none" stroke="' + farbe.farbe + '" stroke-width="1.5" stroke-dasharray="2 2"/>';
      svg += "</g>";
    });

    svg += zeichneAktionsEffekt();
    svg += "</svg>";
    bereich.innerHTML = svg;

    bereich.querySelectorAll(".hexfeld.anklickbar").forEach(function (g) {
      g.addEventListener("click", function () {
        const feldId = g.getAttribute("data-feld");
        const option = zielFelder[feldId];
        if (option) sende(option);
      });
    });
    bereich.querySelectorAll(".spielfigur").forEach(function (g) {
      g.addEventListener("click", function (ev) {
        ev.stopPropagation();
        App.offenesTableau = g.getAttribute("data-figur");
        render();
      });
    });

    if (App.brettModus !== "ruhe") {
      const hinweis = h('<div class="wartehinweis">Feld auf der Karte wählen …</div>');
      const abbrechen = document.createElement("span");
      abbrechen.textContent = "  ✕ Abbrechen";
      abbrechen.style.cursor = "pointer";
      abbrechen.onclick = function () { App.brettModus = "ruhe"; render(); };
      hinweis.appendChild(abbrechen);
      bereich.appendChild(hinweis);
    }
    return bereich;
  }

  function nach_feld(id) { return D.felder.find(function (f) { return f.id === id; }); }

  function versatzFuerToken(zustand, sitz) {
    const feldId = zustand.spieler[sitz].position;
    const geschwister = zustand.sitzplaetze.filter(function (s) { return zustand.spieler[s].position === feldId; });
    const i = geschwister.indexOf(sitz);
    if (geschwister.length === 1) return [0, 0];
    const winkel = (Math.PI * 2 * i) / geschwister.length;
    return [Math.cos(winkel) * 16, Math.sin(winkel) * 16];
  }

  // ------------------------------------------------------------- Seitenleiste

  function renderSeitenleiste(zustand, sitz) {
    const el = h('<div class="seitenleiste' + (App.seitenleisteOffen ? " offen" : "") + '"></div>');
    const kopf = h('<div class="leiste-kopf"><h2>Insel-Übersicht</h2></div>');
    const schliessen = h('<button>✕</button>');
    schliessen.onclick = function () { App.seitenleisteOffen = false; render(); };
    kopf.appendChild(schliessen);
    el.appendChild(kopf);

    const tabs = h('<div class="leiste-tabs"></div>');
    [["markt", "🔧 Markt"], ["ziele", "⭐ Ziele"], ["protokoll", "📜 Verlauf"]].forEach(function (t) {
      const b = h('<button class="leiste-tab' + (App.seitenleisteTab === t[0] ? " aktiv" : "") + '">' + t[1] + '</button>');
      b.onclick = function () { App.seitenleisteTab = t[0]; render(); };
      tabs.appendChild(b);
    });
    el.appendChild(tabs);

    const inhalt = h('<div class="leiste-inhalt"></div>');
    if (App.seitenleisteTab === "markt") inhalt.appendChild(renderMarkt(zustand, sitz));
    else if (App.seitenleisteTab === "ziele") inhalt.appendChild(renderBonusziele(zustand));
    else inhalt.appendChild(renderProtokoll(zustand));
    el.appendChild(inhalt);
    return el;
  }

  function renderMarkt(zustand, sitz) {
    const el = h('<div></div>');
    const optionen = sitz ? M.gueltigeAktionen(zustand, sitz) : [];
    [1, 2, 3].forEach(function (stufe) {
      el.appendChild(h('<h3 style="font-size:11px;color:var(--tinte3);margin:10px 0 6px;text-transform:uppercase">Stufe ' +
        "I".repeat(stufe) + '</h3>'));
      zustand.markt[stufe].forEach(function (id) {
        const karte = M.nach.erfindung[id];
        const bauOptionen = optionen.filter(function (o) { return o.typ === "bauen" && o.erfindungId === id; });
        const karteEl = h('<div class="marktkarte' + (bauOptionen.length ? " bauen-moeglich" : "") + '">' +
          '<span class="me">' + karte.emoji + '</span><div class="mt"><b>' + esc(karte.name) + '</b>' +
          '<div class="mkosten">' + kostenChips(karte.kosten) + '</div>' +
          '<div class="mtext">' + esc(karte.text) + '</div></div>' +
          '<div class="mpunkte">' + karte.punkte + '</div></div>');
        if (bauOptionen.length) {
          karteEl.style.cursor = "pointer";
          karteEl.onclick = function () {
            if (bauOptionen.length === 1) sende(bauOptionen[0]);
            else { App.modalAktion = { art: "geistesblitz_wahl", optionen: bauOptionen, karte: karte }; render(); }
          };
        }
        el.appendChild(karteEl);
      });
    });
    return el;
  }

  function renderBonusziele(zustand) {
    const el = h('<div></div>');
    el.appendChild(h('<p style="font-size:12.5px;color:var(--tinte2);margin-top:0">Diese 3 Bonusziele gelten für alle Spieler.</p>'));
    zustand.bonusziele.forEach(function (id) {
      const b = M.nach.bonus[id];
      el.appendChild(h('<div class="missionskarte"><span class="mie">' + b.emoji + '</span>' +
        '<div class="mit"><b>' + esc(b.name) + '</b><p>' + esc(b.text) + '</p></div>' +
        '<span class="mip">' + b.punkte + '</span></div>'));
    });
    return el;
  }

  function renderProtokoll(zustand) {
    const el = h('<div></div>');
    zustand.protokoll.slice().reverse().forEach(function (z) {
      el.appendChild(h('<div class="log-zeile"><span class="lr">R' + z.runde + '</span>' + esc(z.text) + '</div>'));
    });
    return el;
  }

  // ----------------------------------------------------------- Aktionsriegel

  function eingehendesAngebot() {
    const z = App.zustand;
    const sitz = wirksamerSitz();
    if (z && z.handelsAngebot && z.wartetAuf === sitz) return z.handelsAngebot;
    return null;
  }
  function aktivesAusstehend() {
    const z = App.zustand; const sitz = wirksamerSitz();
    if (!z || !sitz) return null;
    const liste = z.ausstehend[sitz] || [];
    return liste.length ? liste[0] : null;
  }

  function renderAktionsriegel(zustand, sitz) {
    const riegel = h('<div class="aktionsriegel"></div>');
    if (!sitz || aktivesAusstehend() || eingehendesAngebot()) return riegel;
    const optionen = M.gueltigeAktionen(zustand, sitz);
    const istDran = App.modus === "lokal" || ermittleHandelndenSitz(zustand) === sitz;
    if (!istDran) {
      riegel.appendChild(h('<div style="padding:10px 4px;color:var(--tinte2);font-size:13px">Warte, bis du an der Reihe bist …</div>'));
      return riegel;
    }

    function knopf(emoji, text, onClick, aktiv) {
      const b = h('<button class="aktionsknopf' + (aktiv ? " aktiv" : "") + '"><span class="ae">' + emoji +
        '</span><span class="at">' + text + '</span></button>');
      b.onclick = onClick;
      return b;
    }

    const bewegenMoeglich = optionen.some(function (o) { return o.typ === "bewegen" && !o.spezial; });
    const bewegenKnopf = knopf("🚶", "Bewegen", function () {
      App.brettModus = App.brettModus === "zielWaehlen" ? "ruhe" : "zielWaehlen"; render();
    }, App.brettModus === "zielWaehlen");
    bewegenKnopf.disabled = !bewegenMoeglich;
    riegel.appendChild(bewegenKnopf);

    const flugOptionen = optionen.filter(function (o) { return o.spezial === "fliegen"; });
    if (flugOptionen.length) {
      riegel.appendChild(knopf("🚁", "Fliegen", function () {
        App.brettModus = App.brettModus === "flugZielWaehlen" ? "ruhe" : "flugZielWaehlen"; render();
      }, App.brettModus === "flugZielWaehlen"));
    }
    const segelOptionen = optionen.filter(function (o) { return o.spezial === "segeln"; });
    if (segelOptionen.length) {
      riegel.appendChild(knopf("⛵", "Segeln", function () {
        App.brettModus = App.brettModus === "segelZielWaehlen" ? "ruhe" : "segelZielWaehlen"; render();
      }, App.brettModus === "segelZielWaehlen"));
    }

    const sammelnOptionen = optionen.filter(function (o) { return o.typ === "sammeln"; });
    if (sammelnOptionen.length === 1) {
      const b = knopf("🪵", "Sammeln", function () { sende(sammelnOptionen[0]); });
      riegel.appendChild(b);
    } else if (sammelnOptionen.length > 1) {
      const b = knopf("🪵", "Sammeln", function () { App.modalAktion = { art: "sammeln_wahl", optionen: sammelnOptionen }; render(); });
      riegel.appendChild(b);
    }

    const untersuchenOptionen = optionen.filter(function (o) { return o.typ === "untersuchen"; });
    if (untersuchenOptionen.length) riegel.appendChild(knopf("🔍", "Untersuchen", function () { sende(untersuchenOptionen[0]); }));

    const handelnZiele = optionen.filter(function (o) { return o.typ === "handeln_vorschlagen"; });
    if (handelnZiele.length) {
      riegel.appendChild(knopf("🤝", "Handeln", function () {
        App.modalAktion = { art: "handel_bauen", ziele: handelnZiele, sitz: sitz };
        render();
      }));
    }

    const tauschbankOptionen = optionen.filter(function (o) { return o.typ === "tauschbank"; });
    if (tauschbankOptionen.length) {
      riegel.appendChild(knopf("⚖️", "Tauschbank", function () {
        App.modalAktion = { art: "tauschbank_wahl", optionen: tauschbankOptionen };
        render();
      }));
    }

    ["lagerfeuer", "feldlabor"].forEach(function (schluessel) {
      const opts = optionen.filter(function (o) { return o.typ === "sonderfaehigkeit" && o.schluessel === schluessel; });
      if (opts.length) {
        const bezeichnung = schluessel === "lagerfeuer" ? ["🔥", "Lagerfeuer"] : ["🧪", "Feldlabor"];
        riegel.appendChild(knopf(bezeichnung[0], bezeichnung[1], function () {
          App.modalAktion = { art: "sonderfaehigkeit_wahl", optionen: opts, schluessel: schluessel };
          render();
        }));
      }
    });
    const destillier = optionen.filter(function (o) { return o.typ === "sonderfaehigkeit" && o.schluessel === "destillieranlage"; });
    if (destillier.length) riegel.appendChild(knopf("⚗️", "Destillieren", function () { sende(destillier[0]); }));

    const beenden = knopf("✅", "Zug beenden", function () { sende({ typ: "zug_beenden", sitz: sitz }); });
    beenden.classList.add("beenden");
    riegel.appendChild(beenden);
    return riegel;
  }

  // ======================================================================
  // Modale
  // ======================================================================

  function schleierMitModal(inhaltEl) {
    const schleier = h('<div class="schleier"></div>');
    const modal = h('<div class="modal"></div>');
    modal.appendChild(inhaltEl);
    schleier.appendChild(modal);
    schleier.addEventListener("click", function (ev) { if (ev.target === schleier) { App.modalAktion = null; render(); } });
    return schleier;
  }

  function ressourcenStepper(titel, erlaubteRessourcen, max, aufBestaetigt, grenzen) {
    const werte = {};
    erlaubteRessourcen.forEach(function (k) { werte[k] = 0; });
    const wrap = h('<div></div>');
    wrap.innerHTML = "<h2>" + esc(titel) + "</h2>";
    const raster = h('<div class="ressourcenraster"></div>');
    const summeAnzeige = h('<p class="modal-unter"></p>');
    function aktualisiere() {
      const summe = Object.values(werte).reduce(function (a, b) { return a + b; }, 0);
      summeAnzeige.textContent = max ? "Gewählt: " + summe + " von " + max : "Gewählt: " + summe;
      bestaetigenKnopf.disabled = max ? summe !== max : summe === 0;
    }
    erlaubteRessourcen.forEach(function (k) {
      const feld = h('<div class="ressourcenwahl"><span class="re">' + ressourceZeichen(k) + '</span>' +
        '<div class="rz"><button data-op="-">−</button><span class="rn">0</span><button data-op="+">+</button></div></div>');
      const anzeige = feld.querySelector(".rn");
      feld.querySelectorAll("button").forEach(function (btn) {
        btn.onclick = function () {
          const delta = btn.getAttribute("data-op") === "+" ? 1 : -1;
          const grenze = grenzen && grenzen[k] !== undefined ? grenzen[k] : Infinity;
          const neu = Math.max(0, Math.min(grenze, werte[k] + delta));
          werte[k] = neu; anzeige.textContent = neu; aktualisiere();
        };
      });
      raster.appendChild(feld);
    });
    wrap.appendChild(raster);
    wrap.appendChild(summeAnzeige);
    const aktionen = h('<div class="modal-aktionen"></div>');
    const abbrechen = h('<button class="knopf zweitrangig">Abbrechen</button>');
    abbrechen.onclick = function () { App.modalAktion = null; render(); };
    var bestaetigenKnopf = h('<button class="knopf primaer">Bestätigen</button>');
    bestaetigenKnopf.onclick = function () {
      const gewaehlt = {};
      Object.keys(werte).forEach(function (k) { if (werte[k] > 0) gewaehlt[k] = werte[k]; });
      aufBestaetigt(gewaehlt);
    };
    aktionen.appendChild(abbrechen); aktionen.appendChild(bestaetigenKnopf);
    wrap.appendChild(aktionen);
    aktualisiere();
    return wrap;
  }

  function renderAusstehendModal(eintrag) {
    const sitz = wirksamerSitz();
    let inhalt;
    if (eintrag.art === "abwerfen") {
      const spieler = App.zustand.spieler[sitz];
      const grenzen = {}; RESSOURCE_LISTE.forEach(function (k) { if (k !== "bauteil") grenzen[k] = spieler.ressourcen[k] || 0; });
      inhalt = ressourcenStepper("Lager voll — " + eintrag.anzahl + " abwerfen", ["holz", "metall", "wasser", "energie"], eintrag.anzahl,
        function (wahl) { sende({ typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, wahl: wahl }); }, grenzen);
    } else if (eintrag.art === "verlustwahl") {
      const spieler = App.zustand.spieler[sitz];
      inhalt = h('<div><h2>🐒 Neugierige Affen</h2><p class="modal-unter">Wähle 1 Ressource, die du verlierst.</p></div>');
      const raster = h('<div class="ressourcenraster"></div>');
      RESSOURCE_LISTE.forEach(function (k) {
        if ((spieler.ressourcen[k] || 0) <= 0) return;
        const b = h('<button class="ressourcenwahl" style="cursor:pointer"><span class="re">' + ressourceZeichen(k) + '</span></button>');
        b.onclick = function () { sende({ typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, wahl: { ressource: k } }); };
        raster.appendChild(b);
      });
      inhalt.appendChild(raster);
    } else if (eintrag.art === "ressourcenwahl") {
      const titel = { vorratskiste: "📦 Alte Vorratskiste", verwitterte: "🗺️ Verwitterte Karte",
        strandgut: "🎁 Strandgut", automatikfabrik: "🏭 Automatik-Fabrik" }[eintrag.grund] || "Ressource wählen";
      const erlaubt = RESSOURCE_LISTE.filter(function (k) { return (eintrag.ausschluss || []).indexOf(k) === -1; });
      inhalt = ressourcenStepper(titel + " — " + eintrag.anzahl + " wählen", erlaubt, eintrag.anzahl,
        function (wahl) { sende({ typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, wahl: wahl }); });
    } else if (eintrag.art === "feldwahl_sperren" || eintrag.art === "feldwahl_insel") {
      const titel = eintrag.art === "feldwahl_sperren" ? "🌋 Welches Feld wird gesperrt?" : "🏝️ Wohin mit der Inselkarte?";
      inhalt = h('<div><h2>' + titel + '</h2></div>');
      const liste = h('<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div>');
      eintrag.optionen.forEach(function (fid) {
        const f = nach_feld(fid);
        const name = f.spieler ? "Werkstatt " + farbeVon(f.spieler).name : D.gelaende[M.hilfen.feldTyp(App.zustand, fid)].name;
        const b = h('<button class="knopf zweitrangig breit">' + esc(name) + '</button>');
        b.onclick = function () { sende({ typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, wahl: fid }); };
        liste.appendChild(b);
      });
      inhalt.appendChild(liste);
    } else if (eintrag.art === "taschenlampe_wahl") {
      inhalt = h('<div><h2>🔦 Taschenlampe</h2><p class="modal-unter">Zwei Karten gezogen — welche behältst du?</p></div>');
      eintrag.karten.forEach(function (kid) {
        const k = M.nach.fund[kid];
        const b = h('<div class="karte-vorschau"><span class="ke">' + k.emoji + '</span>' +
          '<div class="kt"><b>' + esc(k.name) + '</b><span>' + esc(k.text) + '</span></div></div>');
        b.onclick = function () { sende({ typ: "ausstehend_loesen", sitz: sitz, eintragId: eintrag.id, wahl: kid }); };
        inhalt.appendChild(b);
      });
    } else {
      inhalt = h('<div><h2>Entscheidung nötig</h2></div>');
    }
    return schleierMitModal(inhalt);
  }

  function renderHandelEingehendModal(angebot) {
    const sitz = wirksamerSitz();
    const von = App.zustand.spieler[angebot.von];
    const inhalt = h('<div><h2>🤝 Handelsangebot von ' + esc(von.name) + '</h2></div>');
    const zeile = h('<div style="display:flex;justify-content:space-between;gap:14px;margin:14px 0"></div>');
    zeile.appendChild(seiteDesAngebots("Du bekommst", angebot.gibt));
    zeile.appendChild(seiteDesAngebots("Du gibst", angebot.nimmt));
    inhalt.appendChild(zeile);
    const aktionen = h('<div class="modal-aktionen"></div>');
    const ablehnen = h('<button class="knopf gefahr">Ablehnen</button>');
    ablehnen.onclick = function () { sende({ typ: "handeln_antwort", sitz: sitz, annehmen: false }); };
    const annehmen = h('<button class="knopf primaer">Annehmen</button>');
    annehmen.onclick = function () { sende({ typ: "handeln_antwort", sitz: sitz, annehmen: true }); };
    aktionen.appendChild(ablehnen); aktionen.appendChild(annehmen);
    inhalt.appendChild(aktionen);
    return schleierMitModal(inhalt);
  }
  function seiteDesAngebots(titel, gaben) {
    const el = h('<div style="flex:1"><b style="font-size:12.5px;color:var(--tinte2)">' + titel + '</b></div>');
    const chips = h('<div class="chip-liste" style="margin-top:6px"></div>');
    const schluessel = Object.keys(gaben);
    if (!schluessel.length) chips.appendChild(h('<span class="chip">nichts</span>'));
    schluessel.forEach(function (k) { chips.appendChild(h('<span class="chip">' + ressourceZeichen(k) + " " + gaben[k] + '</span>')); });
    el.appendChild(chips);
    return el;
  }

  function renderAktionsModal(modalAktion) {
    const sitz = wirksamerSitz();
    let inhalt;
    if (modalAktion.art === "sammeln_wahl") {
      inhalt = h('<div><h2>🪵 Woher sammeln?</h2></div>');
      modalAktion.optionen.forEach(function (o) {
        const feldId = o.quelleFeld || App.zustand.spieler[sitz].position;
        const f = nach_feld(feldId);
        const g = D.gelaende[M.hilfen.feldTyp(App.zustand, feldId)];
        const b = h('<button class="knopf zweitrangig breit" style="margin-bottom:6px">' + g.emoji + " " +
          (o.quelleFeld ? "Nachbarfeld: " : "hier: ") + esc(g.name) + '</button>');
        b.onclick = function () { sende(o); };
        inhalt.appendChild(b);
      });
    } else if (modalAktion.art === "tauschbank_wahl") {
      inhalt = h('<div><h2>⚖️ Tauschbank</h2><p class="modal-unter">3 gleiche gegen 1 beliebige.</p></div>');
      const gruppiert = {};
      modalAktion.optionen.forEach(function (o) { (gruppiert[o.gibtRessource] = gruppiert[o.gibtRessource] || []).push(o); });
      Object.keys(gruppiert).forEach(function (gibt) {
        inhalt.appendChild(h('<p style="margin:10px 0 4px;font-size:12.5px;color:var(--tinte2)">3× ' + ressourceZeichen(gibt) + ' gegen:</p>'));
        const reihe = h('<div style="display:flex;gap:6px;flex-wrap:wrap"></div>');
        gruppiert[gibt].forEach(function (o) {
          const b = h('<button class="knopf zweitrangig klein">' + ressourceZeichen(o.nimmtRessource) + '</button>');
          b.onclick = function () { sende(o); };
          reihe.appendChild(b);
        });
        inhalt.appendChild(reihe);
      });
    } else if (modalAktion.art === "sonderfaehigkeit_wahl") {
      const titel = modalAktion.schluessel === "lagerfeuer" ? "🔥 Lagerfeuer (2 gegen 1)" : "🧪 Feldlabor (1 gegen 1)";
      inhalt = h('<div><h2>' + titel + '</h2></div>');
      const gruppiert = {};
      modalAktion.optionen.forEach(function (o) { (gruppiert[o.gibtRessource] = gruppiert[o.gibtRessource] || []).push(o); });
      Object.keys(gruppiert).forEach(function (gibt) {
        const menge = modalAktion.schluessel === "lagerfeuer" ? 2 : 1;
        inhalt.appendChild(h('<p style="margin:10px 0 4px;font-size:12.5px;color:var(--tinte2)">' + menge + '× ' +
          ressourceZeichen(gibt) + ' gegen:</p>'));
        const reihe = h('<div style="display:flex;gap:6px;flex-wrap:wrap"></div>');
        gruppiert[gibt].forEach(function (o) {
          const b = h('<button class="knopf zweitrangig klein">' + ressourceZeichen(o.nimmtRessource) + '</button>');
          b.onclick = function () { sende(o); };
          reihe.appendChild(b);
        });
        inhalt.appendChild(reihe);
      });
    } else if (modalAktion.art === "geistesblitz_wahl") {
      inhalt = h('<div><h2>' + modalAktion.karte.emoji + " " + esc(modalAktion.karte.name) + '</h2>' +
        '<p class="modal-unter">💡 Geistesblitz: bei welcher Ressource gibt es 1 Rabatt?</p></div>');
      modalAktion.optionen.forEach(function (o) {
        const b = h('<button class="knopf zweitrangig breit" style="margin-bottom:6px">Rabatt auf ' +
          ressourceZeichen(o.geistesblitzRessource) + '</button>');
        b.onclick = function () { sende(o); };
        inhalt.appendChild(b);
      });
    } else if (modalAktion.art === "handel_bauen") {
      inhalt = renderHandelBauenModal(modalAktion);
    } else {
      inhalt = h('<div></div>');
    }
    const wrap = schleierMitModal(inhalt);
    return wrap;
  }

  function renderHandelBauenModal(modalAktion) {
    const sitz = modalAktion.sitz;
    const zustand = App.zustand;
    const wrap = h('<div></div>');
    wrap.innerHTML = "<h2>🤝 Handel anbieten</h2>";
    const zielAuswahl = h('<div class="feld-gruppe"><label>Mit wem?</label></div>');
    const zielReihe = h('<div style="display:flex;gap:6px;flex-wrap:wrap"></div>');
    let zielSitz = modalAktion.ziele[0].anSitz;
    modalAktion.ziele.forEach(function (o, i) {
      const b = h('<button class="knopf ' + (i === 0 ? "primaer" : "zweitrangig") + ' klein">' +
        esc(zustand.spieler[o.anSitz].name) + '</button>');
      b.onclick = function () {
        zielSitz = o.anSitz;
        Array.prototype.forEach.call(zielReihe.children, function (c, j) { c.className = "knopf klein " + (j === i ? "primaer" : "zweitrangig"); });
      };
      zielReihe.appendChild(b);
    });
    zielAuswahl.appendChild(zielReihe);
    wrap.appendChild(zielAuswahl);

    const eigene = zustand.spieler[sitz].ressourcen;
    const werteGibt = {}, werteNimmt = {};
    RESSOURCE_LISTE.forEach(function (k) { werteGibt[k] = 0; werteNimmt[k] = 0; });

    function bauStepperZeile(titel, werte, grenzeFn) {
      const box = h('<div class="feld-gruppe"><label>' + titel + '</label></div>');
      const raster = h('<div class="ressourcenraster"></div>');
      RESSOURCE_LISTE.forEach(function (k) {
        const feld = h('<div class="ressourcenwahl"><span class="re">' + ressourceZeichen(k) + '</span>' +
          '<div class="rz"><button data-op="-">−</button><span class="rn">0</span><button data-op="+">+</button></div></div>');
        const anzeige = feld.querySelector(".rn");
        feld.querySelectorAll("button").forEach(function (btn) {
          btn.onclick = function () {
            const delta = btn.getAttribute("data-op") === "+" ? 1 : -1;
            const grenze = grenzeFn(k);
            werte[k] = Math.max(0, Math.min(grenze, werte[k] + delta));
            anzeige.textContent = werte[k];
          };
        });
        raster.appendChild(feld);
      });
      box.appendChild(raster);
      return box;
    }
    wrap.appendChild(bauStepperZeile("Du gibst", werteGibt, function (k) { return eigene[k] || 0; }));
    wrap.appendChild(bauStepperZeile("Du bekommst", werteNimmt, function () { return 99; }));

    const aktionen = h('<div class="modal-aktionen"></div>');
    const abbrechen = h('<button class="knopf zweitrangig">Abbrechen</button>');
    abbrechen.onclick = function () { App.modalAktion = null; render(); };
    const anbieten = h('<button class="knopf primaer">Anbieten</button>');
    anbieten.onclick = function () {
      const gibt = {}, nimmt = {};
      RESSOURCE_LISTE.forEach(function (k) { if (werteGibt[k]) gibt[k] = werteGibt[k]; if (werteNimmt[k]) nimmt[k] = werteNimmt[k]; });
      sende({ typ: "handeln_vorschlagen", sitz: sitz, anSitz: zielSitz, gibt: gibt, nimmt: nimmt });
    };
    aktionen.appendChild(abbrechen); aktionen.appendChild(anbieten);
    wrap.appendChild(aktionen);
    return wrap;
  }

  // ======================================================================
  // Eigenes Tableau (Tap auf die Spielfigur)
  // ======================================================================

  function renderTableau(sitz) {
    const zustand = App.zustand;
    const spieler = zustand.spieler[sitz];
    const farbe = farbeVon(sitz);
    const wirksam = wirksamerSitz();
    const istEigenes = sitz === wirksam;

    const schleier = h('<div class="tableau-schleier"></div>');
    schleier.onclick = function () { App.offenesTableau = null; App.missionenSichtbar = false; render(); };

    const t = h('<div class="tableau"></div>');
    t.appendChild(h('<div class="tableau-griff"></div>'));
    const kopf = h('<div class="tableau-kopf"><span class="farbpunkt" style="background:' + farbe.farbe + '"></span>' +
      '<h2>' + esc(spieler.name) + '</h2></div>');
    const schliessen = h('<button style="background:none;border:none;font-size:20px;color:var(--tinte2)">✕</button>');
    schliessen.onclick = function () { App.offenesTableau = null; App.missionenSichtbar = false; render(); };
    kopf.appendChild(schliessen);
    t.appendChild(kopf);

    const lager = h('<div class="tableau-abschnitt"><h3>Lager (max. ' + M.hilfen.lagerlimit(spieler) + ')</h3></div>');
    const raster = h('<div class="lagerraster"></div>');
    RESSOURCE_LISTE.forEach(function (k) {
      raster.appendChild(h('<div class="lagerfach" style="background:' + ressourceFarbeHell(k) + ';color:' + ressourceFarbe(k) + '">' +
        '<span class="le">' + ressourceZeichen(k) + '</span><span class="ln">' + (spieler.ressourcen[k] || 0) + '</span></div>'));
    });
    lager.appendChild(raster);
    t.appendChild(lager);

    const erf = h('<div class="tableau-abschnitt"><h3>Erfindungen (' + spieler.gebaut.length + ')</h3></div>');
    const chips = h('<div class="chip-liste"></div>');
    if (spieler.gebaut.length === 0) chips.appendChild(h('<span class="chip">noch keine</span>'));
    spieler.gebaut.forEach(function (id) {
      const k = M.nach.erfindung[id];
      chips.appendChild(h('<span class="chip" title="' + esc(k.text) + '">' + k.emoji + " " + esc(k.name) + '</span>'));
    });
    erf.appendChild(chips);
    t.appendChild(erf);

    if (spieler.relikte.length) {
      const rel = h('<div class="tableau-abschnitt"><h3>Relikte</h3></div>');
      const relChips = h('<div class="chip-liste"></div>');
      spieler.relikte.forEach(function (id) {
        const k = M.nach.fund[id];
        relChips.appendChild(h('<span class="chip" title="' + esc(k.text) + '">' + k.emoji + " " + esc(k.name) + '</span>'));
      });
      rel.appendChild(relChips);
      t.appendChild(rel);
    }

    const missionen = h('<div class="tableau-abschnitt"><h3>Missionen</h3></div>');
    if (istEigenes && App.missionenSichtbar) {
      spieler.auftraege.forEach(function (id) {
        const a = M.nach.auftrag[id];
        const erfuellt = M.hilfen.auftragErfuellt(zustand, sitz, id);
        missionen.appendChild(h('<div class="missionskarte' + (erfuellt ? " erfuellt" : "") + '"><span class="mie">' + a.emoji + '</span>' +
          '<div class="mit"><b>' + esc(a.name) + (erfuellt ? " ✓" : "") + '</b><p>' + esc(a.text) + '</p></div>' +
          '<span class="mip">' + a.punkte + '</span></div>'));
      });
      const verstecken = h('<button class="knopf zweitrangig klein" style="margin-top:6px">🔒 Wieder verdecken</button>');
      verstecken.onclick = function () { App.missionenSichtbar = false; render(); };
      missionen.appendChild(verstecken);
    } else if (istEigenes) {
      const hinweis = h('<div class="verdeckt-hinweis"><div style="font-size:26px">🔒</div>' +
        '<p style="margin:6px 0 0;font-size:13px">Deine ' + spieler.auftraege.length + ' Missionen sind verdeckt.<br>Nur du solltest jetzt hinschauen.</p></div>');
      const zeigen = h('<button class="knopf primaer">Meine Missionen zeigen</button>');
      zeigen.onclick = function () { App.missionenSichtbar = true; render(); };
      hinweis.appendChild(zeigen);
      missionen.appendChild(hinweis);
    } else {
      missionen.appendChild(h('<p style="color:var(--tinte2);font-size:13px">🔒 ' + spieler.auftraege.length +
        ' geheime Missionen — die zeigt ' + esc(spieler.name) + ' nur sich selbst.</p>'));
    }
    t.appendChild(missionen);

    const wrapper = document.createElement("div");
    wrapper.appendChild(schleier);
    wrapper.appendChild(t);
    return wrapper;
  }

  // ======================================================================
  // Endergebnis
  // ======================================================================

  function renderEnde() {
    const zustand = App.zustand;
    const el = h('<div class="endbuehne"></div>');
    el.appendChild(h('<h1>🏆 Die Insel ist erfunden</h1><p class="unter">Nach ' + D.regeln.runden + ' Runden steht das Ergebnis.</p>'));
    zustand.ergebnis.platzierung.forEach(function (p, i) {
      const farbe = farbeVon(p.sitz);
      const karte = h('<div class="platzkarte' + (i === 0 ? " sieger" : "") + '" style="animation-delay:' +
        (i * 0.1).toFixed(1) + 's">' +
        '<span class="platz">' + (i + 1) + '</span>' +
        '<span class="farbpunkt" style="background:' + farbe.farbe + '"></span>' +
        '<span class="pname">' + esc(p.name) + '</span><span class="ppunkte">' + p.punkte + '</span></div>');
      const details = h('<details class="wertungsdetail"><summary>Punkte im Einzelnen</summary></details>');
      p.details.erfindungen.forEach(function (e) {
        details.appendChild(h('<div class="wertungszeile"><span>🔧 ' + esc(e.name) + '</span><span>' + e.punkte + '</span></div>'));
      });
      if (p.details.bauteile) details.appendChild(h('<div class="wertungszeile"><span>💎 Bauteile (' + p.details.bauteile + ')</span></div>'));
      p.details.auftraege.filter(function (a) { return a.erfuellt; }).forEach(function (a) {
        details.appendChild(h('<div class="wertungszeile"><span>🎯 ' + esc(a.name) + '</span><span>' + a.punkte + '</span></div>'));
      });
      p.details.bonusziele.filter(function (b) { return b.erfuellt; }).forEach(function (b) {
        details.appendChild(h('<div class="wertungszeile"><span>⭐ ' + esc(b.name) + '</span><span>' + b.punkte + '</span></div>'));
      });
      if (p.details.restRohstoffe) details.appendChild(h('<div class="wertungszeile"><span>📦 Restliche Rohstoffe</span><span>' + p.details.restRohstoffe + '</span></div>'));
      karte.appendChild(details);
      el.appendChild(karte);
    });
    const neu = h('<button class="knopf primaer breit" style="margin-top:18px">Neue Partie</button>');
    neu.onclick = function () {
      loescheLokal();
      App.konfettiGezeigt = false;
      if (App.modus === "online") raumVerlassen();
      else { App.bildschirm = "start"; App.zustand = null; render(); }
    };
    el.appendChild(neu);
    if (!App.konfettiGezeigt) { App.konfettiGezeigt = true; setTimeout(zeigeKonfetti, 0); }
    return el;
  }

  /** Ein einmaliger Konfettiregen fürs Spielende - in den Spielerfarben plus
   * der Akzentfarbe, per CSS-Fall-Animation, entfernt sich selbst. */
  function zeigeKonfetti() {
    const farben = D.spielerfarben.map(function (s) { return s.farbe; }).concat(["var(--akzent)"]);
    const lage = document.createElement("div");
    lage.className = "konfetti-lage";
    for (let i = 0; i < 46; i++) {
      const stueck = document.createElement("span");
      stueck.className = "konfetti-stueck";
      stueck.style.left = (Math.random() * 100).toFixed(1) + "%";
      stueck.style.background = farben[i % farben.length];
      stueck.style.animationDuration = (2.2 + Math.random() * 1.6).toFixed(2) + "s";
      stueck.style.animationDelay = (Math.random() * 0.6).toFixed(2) + "s";
      stueck.style.transform = "rotate(" + Math.floor(Math.random() * 360) + "deg)";
      lage.appendChild(stueck);
    }
    document.body.appendChild(lage);
    setTimeout(function () { lage.remove(); }, 4200);
  }

  // ======================================================================
  // Los geht's
  // ======================================================================

  window.__insel_debug = function () { return { App: App, zustand: App.zustand }; };

  function pruefeUrlAufRaum() {
    const m = /raum=([A-Za-z0-9]{4})/.exec(location.hash);
    return m ? m[1].toUpperCase() : null;
  }

  function main() {
    const raumAusUrl = pruefeUrlAufRaum();
    if (raumAusUrl) {
      App.bildschirm = "lobbyOnlineBeitreten";
    }
    render();
    if (window.claude && typeof window.claude.use === "function") {
      pruefeDbVerfuegbarkeit();
    } else {
      App.dbVerfuegbar = false;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();
