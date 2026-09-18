# -*- coding: utf-8 -*-
"""Fügt alle Druckvorlagen zu einem einzigen PDF zusammen.

Braucht Chrome/Chromium und das Paket pypdf (pip install pypdf).
Das fertige PDF liegt dem Projekt bei – dieses Skript brauchst du nur,
wenn du selbst etwas am Spiel geändert hast.

    python3 werkzeuge/erzeuge_pdf.py
"""
import os, sys, io, html, glob, shutil, subprocess, tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
WURZEL = os.path.dirname(HIER)
VORLAGEN = os.path.join(WURZEL, "druckvorlagen")
ZIEL = os.path.join(WURZEL, "Insel-der-Erfinder-komplett.pdf")

import erzeuge as E

# Reihenfolge im Heft. Zuerst lesen, dann bauen, zuletzt ausschneiden.
TEILE = [
    ("anleitung.html",            "Spielanleitung",            "mit Übersicht aller Karten"),
    ("spielplan.html",            "Spielplan",                 "zwei Seiten zum Zusammenkleben"),
    ("insel-plaettchen.html",     "Insel-Plättchen",           "6 Stück"),
    ("erfindungskarten.html",     "Erfindungskarten",          "24 Karten in drei Stufen"),
    ("fundkarten.html",           "Fundkarten",                "20 Karten"),
    ("ereigniskarten.html",       "Ereigniskarten",            "12 Karten"),
    ("forschungsauftraege.html",  "Forschungsaufträge",        "12 Karten, geheim"),
    ("inselkarten.html",          "Inselkarten",               "8 Karten"),
    ("bonusziele.html",           "Bonusziele",                "10 Karten"),
    ("spielfiguren.html",         "Spielfiguren",              "8 Figuren zum Falten"),
    ("werkstatt-tableaus.html",   "Werkstatt-Tableaus",        "4 Stück"),
    ("marker.html",               "Marker",                    "207 Stück"),
    ("wertungsblock.html",        "Wertungsblock",             "für zwei Partien"),
    ("spielplan-klein.html",      "Spielplan, kleine Fassung", "eine A4-Seite quer, optional"),
]


def finde_chrome():
    kandidaten = glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome")
    for name in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable"):
        pfad = shutil.which(name)
        if pfad:
            kandidaten.append(pfad)
    for pfad in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                 r"C:\Program Files\Google\Chrome\Application\chrome.exe"):
        if os.path.exists(pfad):
            kandidaten.append(pfad)
    if not kandidaten:
        raise SystemExit("Chrome oder Chromium nicht gefunden – ohne Browser kann ich keine "
                         "PDFs erzeugen. Das fertige PDF liegt dem Projekt aber bei.")
    return kandidaten[0]


def nach_pdf(chrome, quelle, ziel):
    subprocess.run([chrome, "--headless", "--no-sandbox", "--disable-gpu",
                    "--no-pdf-header-footer", "--print-to-pdf=" + ziel,
                    "file://" + quelle],
                   check=True, capture_output=True)
    if not os.path.exists(ziel):
        raise SystemExit("PDF konnte nicht erzeugt werden: %s" % quelle)


DECK_CSS = """
@page { size: A4 portrait; margin: 0; }
body { margin: 0; }
.blatt { width: 210mm; height: 297mm; padding: 26mm 24mm; background: %(insel)s;
         color: %(tinte)s; display: flex; flex-direction: column;
         font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
         page-break-after: always; }
.blatt:last-child { page-break-after: auto; }
.regel { border-top: 1.2mm solid %(tinte)s; border-bottom: 0.4mm solid %(tinte)s;
         height: 2.4mm; margin-bottom: 9mm; }
.regel.unten { border-top: 0.4mm solid %(tinte)s; border-bottom: 1.2mm solid %(tinte)s;
               margin: 9mm 0 0; }
h1 { font-size: 34pt; margin: 0; letter-spacing: -0.5pt; line-height: 1.05; }
.ober { font-size: 10pt; letter-spacing: 3pt; text-transform: uppercase;
        color: %(tinte2)s; margin: 0 0 5mm; font-weight: 700; }
.unter { font-size: 12.5pt; line-height: 1.55; margin: 6mm 0 0; max-width: 130mm;
         color: %(tinte2)s; }
.zahlen { display: flex; gap: 0; margin: 10mm 0 0; border: 0.4mm solid %(linie)s;
          background: %(papier)s; }
.zahlen div { flex: 1; padding: 4mm 5mm; border-right: 0.4mm solid %(linie)s; }
.zahlen div:last-child { border-right: 0; }
.zahlen span { display: block; font-size: 7.5pt; letter-spacing: 1.4pt; text-transform: uppercase;
               color: %(tinte2)s; font-weight: 700; margin-bottom: 1mm; }
.zahlen b { font-size: 17pt; }
h2 { font-size: 15pt; margin: 0 0 4mm; }
.inhalt { list-style: none; margin: 0; padding: 0; flex: 1; }
.inhalt li { display: flex; align-items: baseline; gap: 2mm; padding: 2.4mm 0;
             border-bottom: 0.25mm solid %(linie)s; font-size: 11pt; }
.inhalt .name { font-weight: 700; white-space: nowrap; }
.inhalt .was { color: %(tinte2)s; font-size: 9.5pt; }
.inhalt .punkte { flex: 1; border-bottom: 0.25mm dotted %(linie)s; margin: 0 1mm 1mm; }
.inhalt .nr { font-weight: 700; font-variant-numeric: tabular-nums; }
.schritte { list-style: none; margin: 0; padding: 0; counter-reset: s; }
.schritte li { counter-increment: s; position: relative; padding: 0 0 5mm 12mm;
               font-size: 11.5pt; line-height: 1.5; }
.schritte li::before { content: counter(s); position: absolute; left: 0; top: 0;
                       width: 7mm; height: 7mm; border-radius: 50%%; background: %(tinte)s;
                       color: %(insel)s; font-size: 9pt; font-weight: 700;
                       display: flex; align-items: center; justify-content: center; }
.schritte li > b:first-child { display: block; }
.kasten { background: %(papier)s; border-left: 1.2mm solid %(tinte)s; padding: 4mm 5mm;
          margin: 6mm 0 0; font-size: 10.5pt; line-height: 1.5; }
.fuss { font-size: 9pt; color: %(tinte2)s; margin: 4mm 0 0; }
""" % {"insel": E.STRAND, "papier": E.PAPIER, "tinte": E.TINTE,
       "tinte2": E.TINTE_2, "linie": E.LINIE}


def deckblatt(eintraege, gesamt):
    zeilen = "".join(
        '<li><span class="name">%s</span><span class="was">%s</span>'
        '<span class="punkte"></span><span class="nr">%d</span></li>'
        % (html.escape(n), html.escape(w), s) for n, w, s in eintraege)
    zahlen = "".join('<div><span>%s</span><b>%s</b></div>' % (a, b) for a, b in
                     [("Spieler", "2–4"), ("Alter", "ab 10"), ("Dauer", "65–90 Min"),
                      ("Seiten", str(gesamt))])
    return """<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>Insel der Erfinder</title><style>%s</style></head><body>
<div class="blatt">
  <div class="regel"></div>
  <p class="ober">Ein Brettspiel zum Ausdrucken</p>
  <h1>Insel der Erfinder</h1>
  <p class="unter">Nach einem Sturm stranden mehrere Erfinder auf einer unbekannten Insel.
     Jeder baut sich eine Werkstatt und versucht, die beeindruckendsten Maschinen zu bauen –
     während die Insel sich unter ihnen verändert.</p>
  <div class="zahlen">%s</div>
  <h2 style="margin-top:12mm">Inhalt</h2>
  <ul class="inhalt">%s</ul>
  <div class="regel unten"></div>
</div>

<div class="blatt">
  <div class="regel"></div>
  <h1 style="font-size:26pt">So baust du das Spiel</h1>
  <p class="unter" style="margin-bottom:8mm">Der Reihe nach – in zwei Nachmittagen ist
     alles fertig, und du kannst jederzeit zwischendurch aufhören.</p>
  <ol class="schritte">
    <li><b>Alles ausdrucken – auf 100 %%.</b>
        Im Druckfenster die Skalierung auf <b>100 %%</b> bzw. „Tatsächliche Größe“ stellen,
        nicht auf „An Seite anpassen“. Sonst passen die Insel-Plättchen später nicht
        auf die Felder des Spielplans.</li>
    <li><b>Karten auf festes Papier.</b>
        Die Kartenseiten möglichst auf 200-g-Papier drucken. Auf jede Vorderseite folgt
        die passende Rückseite: Wenn dein Drucker beidseitig kann, „Beidseitig / lange
        Seite“ einstellen. Wenn nicht, druck nur die ungeraden Seiten – auf festem Papier
        sieht man nichts durch.</li>
    <li><b>Den Spielplan zusammenkleben.</b>
        Der Plan besteht aus zwei Seiten. Bei einer Seite den weißen Rand an der Kante mit
        der Aufschrift „KLEBEKANTE“ abschneiden, beide Hälften bündig aneinanderlegen –
        Rahmen und Rundenleiste müssen durchlaufen – und auf der <b>Rückseite</b>
        mit Klebeband verbinden.</li>
    <li><b>Ausschneiden.</b>
        Karten an den gestrichelten Linien. Bei den Markern geht es schneller, wenn du das
        Blatt erst in Streifen schneidest.</li>
    <li><b>Figuren falten.</b>
        Streifen ausschneiden, in der Mitte falten – die beiden Köpfe treffen sich oben.
        Unten leicht auseinanderziehen, dann steht die Figur wie ein Zelt. Wackelt sie,
        hilft eine Wäscheklammer als Fuß.</li>
    <li><b>Anleitung lesen und losspielen.</b>
        Kapitel 13 ist eine Schnellübersicht für den Tisch – die reicht meistens.</li>
  </ol>
  <div class="kasten">
    <b>Es eilt?</b> Für eine erste Testpartie reichen Anleitung, Spielplan,
    Erfindungskarten, Spielfiguren und Werkstatt-Tableaus. Als Rohstoffe nimmst du
    getrocknete Bohnen, Perlen, Münzen oder Lego-Steine – die Marker kannst du später
    immer noch ausschneiden.
  </div>
  <p class="fuss">Farben fehlen im Ausdruck? Dann ist im Druckfenster
     „Hintergrundgrafiken drucken“ nicht angehakt.</p>
  <div class="regel unten"></div>
</div>
</body></html>""" % (DECK_CSS, zahlen, zeilen)


def bau():
    from pypdf import PdfReader, PdfWriter
    chrome = finde_chrome()
    print("Chrome: %s" % chrome)
    tmp = tempfile.mkdtemp(prefix="insel-pdf-")

    teile, seite = [], 3        # Seite 1 und 2 sind das Deckblatt
    eintraege = []
    for datei, name, was in TEILE:
        quelle = os.path.join(VORLAGEN, datei)
        if not os.path.exists(quelle):
            raise SystemExit("fehlt: %s – erst 'python3 werkzeuge/erzeuge.py' laufen lassen" % datei)
        ziel = os.path.join(tmp, datei.replace(".html", ".pdf"))
        nach_pdf(chrome, quelle, ziel)
        anzahl = len(PdfReader(ziel).pages)
        print("  %-26s %2d Seiten  (ab Seite %d)" % (name, anzahl, seite))
        teile.append(ziel)
        eintraege.append((name, was, seite))
        seite += anzahl

    gesamt = seite - 1
    deck_html = os.path.join(tmp, "deckblatt.html")
    io.open(deck_html, "w", encoding="utf-8").write(deckblatt(eintraege, gesamt))
    deck_pdf = os.path.join(tmp, "deckblatt.pdf")
    nach_pdf(chrome, deck_html, deck_pdf)

    schreiber = PdfWriter()
    for seiten in PdfReader(deck_pdf).pages:
        schreiber.add_page(seiten)
    for pfad in teile:
        for seiten in PdfReader(pfad).pages:
            schreiber.add_page(seiten)
    schreiber.add_metadata({"/Title": "Insel der Erfinder – Brettspiel zum Ausdrucken",
                            "/Subject": "Spielanleitung und alle Druckvorlagen"})
    with open(ZIEL, "wb") as f:
        schreiber.write(f)
    shutil.rmtree(tmp, ignore_errors=True)
    mb = os.path.getsize(ZIEL) / 1024.0 / 1024.0
    print("\nFertig: Insel-der-Erfinder-komplett.pdf – %d Seiten, %.1f MB" % (gesamt, mb))


if __name__ == "__main__":
    bau()
