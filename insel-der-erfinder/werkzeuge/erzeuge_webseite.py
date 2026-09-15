# -*- coding: utf-8 -*-
"""Baut die Online-Fassung von 'Insel der Erfinder' (webseite.html).

Eine Seite zum Nachschlagen am Spieltisch: Spielplan, Regeln und ein
durchsuchbares Verzeichnis aller Karten. Quelle ist wie immer daten.py.
"""
import os, sys, io, html

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
WURZEL = os.path.dirname(HIER)

import daten as D
import erzeuge as E

STUFEN_NAME = {1: "Stufe I", 2: "Stufe II", 3: "Stufe III"}

CSS = """
:root {
  --papier:   #efe7d6;
  --blatt:    #fbf7ee;
  --blatt-2:  #f5eee0;
  --tinte:    #1d2a2f;
  --tinte-2:  #5c6b6b;
  --tinte-3:  #8a9694;
  --see:      #0f6e78;
  --see-hell: #d8e9e9;
  --messing:  #ab6f22;
  --linie:    #d3c7ac;
  --linie-2:  #e4dbc8;
  --schatten: 0 1px 0 #ffffffb0, 0 10px 30px -18px #1d2a2f55;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --papier:   #0e1a1e;
    --blatt:    #16262b;
    --blatt-2:  #1b2e34;
    --tinte:    #e9e1cf;
    --tinte-2:  #9db0af;
    --tinte-3:  #6d807f;
    --see:      #49b8c0;
    --see-hell: #123238;
    --messing:  #dda256;
    --linie:    #2b4248;
    --linie-2:  #22383e;
    --schatten: 0 1px 0 #ffffff0d, 0 10px 30px -18px #000000cc;
  }
}
:root[data-theme="dark"] {
  --papier:   #0e1a1e;
  --blatt:    #16262b;
  --blatt-2:  #1b2e34;
  --tinte:    #e9e1cf;
  --tinte-2:  #9db0af;
  --tinte-3:  #6d807f;
  --see:      #49b8c0;
  --see-hell: #123238;
  --messing:  #dda256;
  --linie:    #2b4248;
  --linie-2:  #22383e;
  --schatten: 0 1px 0 #ffffff0d, 0 10px 30px -18px #000000cc;
}

body {
  background: var(--papier);
  color: var(--tinte);
  font-family: "Source Serif 4", Georgia, "Times New Roman", serif;
  font-size: 17px;
  line-height: 1.6;
}
.seite { max-width: 980px; margin: 0 auto; padding-inline: 20px; padding-block: 0 72px; }

h1, h2, h3, .anzeige {
  font-family: "Bricolage Grotesque", "Trebuchet MS", system-ui, sans-serif;
  font-weight: 800;
  text-wrap: balance;
}
.mono, .marke, th, .kosten, .wert, .stelle {
  font-family: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Consolas, monospace;
}
.marke {
  font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--tinte-3);
}

/* ---------------------------------------------------------- Kopf */
.kopf { padding-block: 56px 36px; border-bottom: 1px solid var(--linie); }
.kopf .oben { border-top: 3px solid var(--tinte); border-bottom: 1px solid var(--tinte);
              height: 6px; margin-bottom: 26px; }
.kopf h1 { margin: 0; font-size: clamp(38px, 9vw, 74px); line-height: 0.95;
           letter-spacing: -0.025em; }
.kopf h1 .klein { display: block; font-size: clamp(12px, 2.1vw, 15px); letter-spacing: 0.22em;
                  text-transform: uppercase; color: var(--see); margin-bottom: 1.1em;
                  font-weight: 600; }
.kopf .unter { margin: 18px 0 0; max-width: 60ch; color: var(--tinte-2); font-size: 18px; }
.daten { display: flex; flex-wrap: wrap; gap: 0; margin-top: 30px;
         border: 1px solid var(--linie); border-radius: 2px; background: var(--blatt);
         overflow: hidden; }
.daten div { flex: 1 1 120px; padding: 12px 16px; border-right: 1px solid var(--linie-2); }
.daten div:last-child { border-right: 0; }
.daten b { display: block; font-size: 24px; font-family: "IBM Plex Mono", monospace;
           font-weight: 600; font-variant-numeric: tabular-nums; color: var(--see); }

/* ------------------------------------------------------ Abschnitt */
section { padding-block: 44px; border-bottom: 1px solid var(--linie); }
section:last-of-type { border-bottom: 0; }
h2 { font-size: clamp(24px, 4.4vw, 34px); margin: 8px 0 14px; letter-spacing: -0.015em; }
h3 { font-size: 19px; margin: 26px 0 8px; }
p { margin: 0 0 14px; max-width: 66ch; }
.fuehrung { font-size: 19px; color: var(--tinte-2); max-width: 62ch; }

/* --------------------------------------------------------- Karte */
.abb { margin: 0; }
.abb .rahmen { background: var(--blatt); border: 1px solid var(--linie); border-radius: 3px;
               padding: 12px; box-shadow: var(--schatten); }
.abb svg { display: block; width: 100%; height: auto; border-radius: 2px; }
.abb figcaption { margin-top: 10px; font-size: 12.5px; color: var(--tinte-3);
                  font-family: "IBM Plex Mono", monospace; }
.abb figcaption b { color: var(--tinte-2); font-weight: 600; }

/* --------------------------------------------------------- Ablauf */
.ablauf { list-style: none; margin: 18px 0 0; padding: 0; display: grid; gap: 1px;
          background: var(--linie-2); border: 1px solid var(--linie); border-radius: 3px; }
.ablauf li { background: var(--blatt); padding: 14px 18px; display: grid;
             grid-template-columns: 34px 1fr; gap: 14px; align-items: start; }
.ablauf .stelle { color: var(--see); font-weight: 600; font-size: 15px; padding-top: 2px; }
.ablauf b { display: block; font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; }
.ablauf span { color: var(--tinte-2); font-size: 15.5px; }

/* -------------------------------------------------------- Tabelle */
.tabelle { width: 100%; border-collapse: collapse; margin-top: 18px; }
.tabelle th { text-align: left; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
              color: var(--tinte-3); font-weight: 600; padding: 0 12px 8px 0;
              border-bottom: 1px solid var(--tinte); }
.tabelle td { padding: 11px 12px 11px 0; border-bottom: 1px solid var(--linie-2);
              vertical-align: top; font-size: 16px; }
.tabelle .ap { font-family: "IBM Plex Mono", monospace; font-weight: 600; color: var(--messing);
               font-variant-numeric: tabular-nums; white-space: nowrap; }
.tabelle .was { font-weight: 600; white-space: nowrap; }
.tabelle .wo { color: var(--tinte-2); }

/* ----------------------------------------------------- Verzeichnis */
.werkzeuge { display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
             margin: 20px 0 6px; position: sticky; top: env(safe-area-inset-top, 0px);
             background: var(--papier); padding-block: 10px; z-index: 5; }
.suche { flex: 1 1 210px; min-width: 0; font: inherit; font-size: 16px; color: var(--tinte);
         background: var(--blatt); border: 1px solid var(--linie); border-radius: 2px;
         padding: 9px 12px; }
.suche::placeholder { color: var(--tinte-3); }
.suche:focus-visible, .chip:focus-visible { outline: 2px solid var(--see); outline-offset: 2px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-family: "IBM Plex Mono", monospace; font-size: 12px; font-weight: 600;
        letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
        background: transparent; color: var(--tinte-2);
        border: 1px solid var(--linie); border-radius: 2px; padding: 7px 10px; }
.chip[aria-pressed="true"] { background: var(--see); border-color: var(--see); color: var(--papier); }

.eintraege { border-top: 1px solid var(--tinte); }
.eintrag { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto;
           gap: 6px 14px; padding: 15px 0; border-bottom: 1px solid var(--linie-2);
           align-items: baseline; }
.eintrag .sinn { font-size: 20px; line-height: 1; }
.eintrag .name { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700;
                 font-size: 17.5px; }
.eintrag .wert { font-size: 15px; font-weight: 600; color: var(--messing); text-align: right;
                 font-variant-numeric: tabular-nums; white-space: nowrap; }
.eintrag .leib { grid-column: 2 / -1; color: var(--tinte-2); font-size: 15.5px; margin: 0; }
.eintrag .kosten { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.eintrag .kosten span { font-size: 12.5px; font-weight: 600; background: var(--see-hell);
                        color: var(--tinte); border-radius: 2px; padding: 2px 7px; }
.eintrag .herkunft { grid-column: 2 / -1; margin-top: 3px; }
.leer { padding: 28px 0; color: var(--tinte-2); }

/* ---------------------------------------------------------- Drucken */
.dateien { width: 100%; border-collapse: collapse; margin-top: 18px; }
.dateien th { text-align: left; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
              color: var(--tinte-3); font-weight: 600; padding: 0 10px 8px 0;
              border-bottom: 1px solid var(--tinte); }
.dateien td { padding: 9px 10px 9px 0; border-bottom: 1px solid var(--linie-2); font-size: 15.5px; }
.dateien td:first-child { font-family: "IBM Plex Mono", monospace; font-size: 13.5px;
                          white-space: nowrap; }
.dateien td:last-child { text-align: right; font-family: "IBM Plex Mono", monospace;
                         font-variant-numeric: tabular-nums; color: var(--tinte-2);
                         white-space: nowrap; }
.merk { background: var(--blatt); border-left: 3px solid var(--messing); border-radius: 0 3px 3px 0;
        padding: 14px 18px; margin: 20px 0 0; }
.merk p:last-child { margin-bottom: 0; }

.fuss { padding-block: 34px 0; color: var(--tinte-3); font-size: 14px; }
.fuss .oben { border-top: 1px solid var(--tinte); border-bottom: 3px solid var(--tinte);
              height: 6px; margin-bottom: 20px; }

@media (max-width: 560px) {
  body { font-size: 16px; }
  .eintrag { grid-template-columns: 26px minmax(0, 1fr) auto; }
  .daten div { flex-basis: 50%; border-bottom: 1px solid var(--linie-2); }
}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
"""


def kosten_span(kosten):
    return "".join(
        '<span>%s&nbsp;%d</span>' % (D.RESSOURCEN[k]["emoji"], v)
        for k in (D.HOLZ, D.METALL, D.WASSER, D.ENERGIE, D.BAUTEIL)
        for v in [kosten.get(k)] if v)


def eintrag(gruppe, emoji, name, text, kosten=None, wert=None, herkunft=None):
    suchtext = " ".join(filter(None, [name, text, herkunft or ""])).lower()
    teile = ['<article class="eintrag" data-gruppe="%s" data-text="%s">' % (gruppe, html.escape(suchtext))]
    teile.append('<div class="sinn" aria-hidden="true">%s</div>' % emoji)
    teile.append('<h3 class="name">%s</h3>' % html.escape(name))
    teile.append('<div class="wert">%s</div>' % (html.escape(wert) if wert else ""))
    if kosten:
        teile.append('<div class="kosten">%s</div>' % kosten)
    teile.append('<p class="leib">%s</p>' % html.escape(text))
    if herkunft:
        teile.append('<div class="herkunft marke">%s</div>' % html.escape(herkunft))
    teile.append('</article>')
    return "".join(teile)


def verzeichnis():
    e = []
    for k in sorted(D.ERFINDUNGEN, key=lambda x: (x["stufe"], -x["punkte"])):
        e.append(eintrag("stufe%d" % k["stufe"], k["emoji"], k["name"], k["text"],
                         kosten_span(k["kosten"]), "%d P" % k["punkte"],
                         "Erfindung · %s" % STUFEN_NAME[k["stufe"]]))
    for k in D.EREIGNISSE:
        e.append(eintrag("ereignis", k["emoji"], k["name"], k["text"], None, None, "Ereigniskarte"))
    for k in D.INSELKARTEN:
        e.append(eintrag("insel", k["emoji"], k["name"], k["text"], None, None, "Inselkarte"))
    for k in D.FORSCHUNGSAUFTRAEGE:
        e.append(eintrag("auftrag", k["emoji"], k["name"], k["text"], None,
                         "%d P" % k["punkte"], "Forschungsauftrag · geheim"))
    for k in D.BONUSZIELE:
        e.append(eintrag("bonus", k["emoji"], k["name"], k["text"], None,
                         "%d P" % k["punkte"], "Bonusziel · für alle"))
    for k in D.FUNDKARTEN:
        e.append(eintrag("fund", k["emoji"], k["name"], k["text"], None,
                         "%d×" % k["anzahl"], "Fundkarte"))
    return "".join(e)


CHIPS = [("alle", "Alle"), ("stufe1", "Stufe I"), ("stufe2", "Stufe II"), ("stufe3", "Stufe III"),
         ("ereignis", "Ereignis"), ("insel", "Insel"), ("auftrag", "Auftrag"),
         ("bonus", "Bonus"), ("fund", "Fund")]

DATEIEN = [
    ("spielplan.html", "Der Spielplan", "2 S. · zusammenkleben"),
    ("anleitung.html", "Anleitung mit Kartenanhang", "13 S."),
    ("erfindungskarten.html", "24 Erfindungen", "8 S."),
    ("fundkarten.html", "20 Fundkarten", "6 S."),
    ("ereigniskarten.html", "12 Ereignisse", "4 S."),
    ("forschungsauftraege.html", "12 Forschungsaufträge", "4 S."),
    ("inselkarten.html", "8 Inselkarten", "2 S."),
    ("bonusziele.html", "10 Bonusziele", "2 S."),
    ("spielfiguren.html", "8 Figuren zum Falten", "1 S."),
    ("werkstatt-tableaus.html", "4 Werkstatt-Tableaus", "2 S."),
    ("insel-plaettchen.html", "6 Insel-Plättchen", "1 S."),
    ("marker.html", "207 Marker", "2 S."),
    ("wertungsblock.html", "Wertungsblock", "2 S."),
    ("spielplan-klein.html", "Kleiner Plan, eine Seite", "1 S. · optional"),
]

AKTIONEN = [
    ("1", "🚶 Bewegen", "Ein Feld weit, auf ein angrenzendes Feld."),
    ("1", "🪵 Sammeln", "1 Rohstoff des Feldes, auf dem du stehst."),
    ("1", "🔍 Untersuchen", "Nur auf einer Ruine mit Fundmarke: Marke ab, Fundkarte ziehen."),
    ("2", "🔧 Bauen", "Nur in deiner eigenen Werkstatt, aus der offenen Auslage."),
    ("1", "🤝 Handeln", "Mit einem Spieler auf deinem oder einem Nachbarfeld."),
    ("1", "⚖️ Tauschbank", "In deiner Werkstatt: 3 gleiche Rohstoffe → 1 beliebiger."),
]

ABLAUF = [
    ("A", "Zugphase", "Reihum hat jeder Spieler 3 Aktionspunkte."),
    ("B", "Lager prüfen", "Wer mehr als 10 Rohstoffe hat, wirft ab. 💎 zählen nicht mit."),
    ("C", "Ereigniskarte", "Eine Karte aufdecken und vorlesen."),
    ("D", "Inselentwicklung", "Nach Runde 2, 4 und 6: eine Inselkarte. Die Insel ändert sich für immer."),
    ("E", "Weiter", "Rundenmarker vor, Startspieler wechselt."),
]


def bau():
    spielplan = E.spielplan_svg()

    daten = "".join('<div><span class="marke">%s</span><b>%s</b></div>' % (a, b) for a, b in
                    [("Spieler", "2–4"), ("Alter", "ab 10"), ("Dauer", "45–60 Min"),
                     ("Runden", "8"), ("Karten", "86")])
    chips = "".join('<button class="chip" type="button" data-filter="%s" aria-pressed="%s">%s</button>'
                    % (w, "true" if w == "alle" else "false", html.escape(t)) for w, t in CHIPS)
    aktionen = "".join('<tr><td class="ap">%s AP</td><td class="was">%s</td><td class="wo">%s</td></tr>'
                       % (a, html.escape(b), html.escape(c)) for a, b, c in AKTIONEN)
    ablauf = "".join('<li><span class="stelle">%s</span><div><b>%s</b><span>%s</span></div></li>'
                     % (a, html.escape(b), html.escape(c)) for a, b, c in ABLAUF)
    dateien = "".join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>'
                      % (html.escape(a), html.escape(b), html.escape(c)) for a, b, c in DATEIEN)

    koerper = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap">

<div class="seite">

<header class="kopf">
  <div class="oben"></div>
  <h1><span class="klein">Ein Brettspiel zum Ausdrucken</span>Insel der Erfinder</h1>
  <p class="unter">Nach einem Sturm stranden mehrere Erfinder auf einer unbekannten Insel.
     Jeder baut sich eine Werkstatt und versucht, die beeindruckendsten Maschinen zu bauen –
     während die Insel sich unter ihnen verändert.</p>
  <div class="daten">__DATEN__</div>
</header>

<section>
  <span class="marke">Das Brett</span>
  <h2>Neunzehn Felder, vier Werkstätten</h2>
  <p class="fuehrung">In der Mitte liegt die Große Ruine – dort gibt es die wertvollen
     seltenen Bauteile, aber von jeder Werkstatt sind es zwei Züge bis dorthin.
     Die beiden Brachland-Felder sind absichtlich leer: Dort entsteht später Neues.</p>
  <figure class="abb">
    <div class="rahmen">__PLAN__</div>
    <figcaption><b>Abb. 1</b> — Die Insel zu Spielbeginn. Die Anordnung ist berechnet, nicht
      geraten: Von jeder Werkstatt aus ist die Summe der Wege zu Holz, Metall, Wasser und
      Energie genau 6. Rot und Grün starten spiegelgleich, Blau und Gelb ebenso.</figcaption>
  </figure>
</section>

<section>
  <span class="marke">Dein Zug</span>
  <h2>Drei Aktionspunkte, sechs Möglichkeiten</h2>
  <p class="fuehrung">Du darfst sie beliebig verteilen und dieselbe Aktion auch mehrfach
     machen. Nicht benutzte Punkte verfallen – und genau da fängt das Nachdenken an.</p>
  <table class="tabelle">
    <thead><tr><th>Kosten</th><th>Aktion</th><th>Was passiert</th></tr></thead>
    <tbody>__AKTIONEN__</tbody>
  </table>
</section>

<section>
  <span class="marke">Eine Runde</span>
  <h2>Fünf Schritte, achtmal</h2>
  <ol class="ablauf">__ABLAUF__</ol>
</section>

<section>
  <span class="marke">Nachschlagen</span>
  <h2>Alle 86 Karten</h2>
  <p class="fuehrung">Wenn am Tisch jemand fragt „was macht der Magnetkran noch mal?" –
     hier steht es. Tippe einen Namen ein oder filtere nach Kartenart.</p>
  <div class="werkzeuge">
    <input class="suche" id="suche" type="search" placeholder="Karte suchen …"
           aria-label="Karte suchen" autocomplete="off">
    <div class="chips" role="group" aria-label="Nach Kartenart filtern">__CHIPS__</div>
  </div>
  <div class="eintraege" id="liste">__EINTRAEGE__</div>
  <p class="leer" id="leer" hidden>Dazu gibt es keine Karte. Versuch es mit einem anderen Wort.</p>
</section>

<section>
  <span class="marke">Selber bauen</span>
  <h2>Was du ausdruckst</h2>
  <p class="fuehrung">Am einfachsten druckst du
     <span class="mono">Insel-der-Erfinder-komplett.pdf</span> – da ist alles drin, 53 Seiten
     mit Deckblatt und Bastelanleitung. Wer nur Einzelteile braucht, findet sie hier:</p>
  <table class="dateien">
    <thead><tr><th>Datei</th><th>Inhalt</th><th>Umfang</th></tr></thead>
    <tbody>__DATEIEN__</tbody>
  </table>
  <div class="merk">
    <p><b>Zwei Einstellungen entscheiden alles:</b> Skalierung auf <b>100 %</b> stellen
       (nicht „An Seite anpassen") und <b>„Hintergrundgrafiken drucken"</b> anhaken.
       Sonst kommt der Plan zu klein und ohne Farbe aus dem Drucker.</p>
    <p><b>Der Spielplan besteht aus zwei Seiten.</b> Bei einer Seite den weißen Rand an der
       Kante mit der Aufschrift „KLEBEKANTE" abschneiden, beide Hälften bündig aneinanderlegen
       und auf der Rückseite mit Klebeband verbinden. Zusammen sind sie etwa 38 × 28 cm groß.</p>
    <p><b>Für die erste Partie</b> reichen Spielplan, Anleitung, Erfindungskarten, Figuren
       und Tableaus. Als Rohstoffe nimmst du erst mal Bohnen, Perlen oder Lego-Steine.</p>
  </div>
</section>

<footer class="fuss">
  <div class="oben"></div>
  <p>Insel der Erfinder · 24 Erfindungen, 20 Fundkarten, 12 Ereignisse, 12 Aufträge,
     10 Bonusziele, 8 Inselkarten · Spielplan, Figuren und Karten zum Selbstausdrucken.</p>
</footer>

</div>

<script>
(function () {
  var suche = document.getElementById("suche");
  var liste = document.getElementById("liste");
  var leer  = document.getElementById("leer");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var eintraege = Array.prototype.slice.call(liste.querySelectorAll(".eintrag"));
  var gruppe = "alle";

  function zeigen() {
    var wort = suche.value.trim().toLowerCase();
    var sichtbar = 0;
    eintraege.forEach(function (e) {
      var passtGruppe = gruppe === "alle" || e.dataset.gruppe === gruppe;
      var passtWort = !wort || e.dataset.text.indexOf(wort) !== -1;
      var zeig = passtGruppe && passtWort;
      e.hidden = !zeig;
      if (zeig) { sichtbar++; }
    });
    leer.hidden = sichtbar > 0;
  }

  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      gruppe = c.dataset.filter;
      chips.forEach(function (x) {
        x.setAttribute("aria-pressed", x === c ? "true" : "false");
      });
      zeigen();
    });
  });
  suche.addEventListener("input", zeigen);
  zeigen();
})();
</script>
"""
    ersetzungen = {
        "__DATEN__": daten, "__PLAN__": spielplan, "__AKTIONEN__": aktionen,
        "__ABLAUF__": ablauf, "__CHIPS__": chips, "__EINTRAEGE__": verzeichnis(),
        "__DATEIEN__": dateien,
    }
    for schluessel, wert in ersetzungen.items():
        koerper = koerper.replace(schluessel, wert)

    seite = ("<title>Insel der Erfinder</title>\n<style>%s</style>\n%s" % (CSS, koerper))
    ziel = os.path.join(WURZEL, "webseite.html")
    io.open(ziel, "w", encoding="utf-8").write(seite)
    print("geschrieben: webseite.html (%d KB)" % (len(seite.encode("utf-8")) // 1024))
    return ziel


if __name__ == "__main__":
    bau()
