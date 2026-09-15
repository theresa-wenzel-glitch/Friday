# -*- coding: utf-8 -*-
"""Baut alle Druckvorlagen für 'Insel der Erfinder'.

Starten mit:   python3 werkzeuge/erzeuge.py
Ergebnis:      druckvorlagen/*.html  und  ANLEITUNG.md
"""
import os, re, math, random, html, io, sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
WURZEL = os.path.dirname(HIER)
ZIEL = os.path.join(WURZEL, "druckvorlagen")

import daten as D
import regeln as R

os.makedirs(ZIEL, exist_ok=True)


def schreibe(dateiname, inhalt):
    pfad = os.path.join(ZIEL, dateiname)
    io.open(pfad, "w", encoding="utf-8").write(inhalt)
    print("  geschrieben: druckvorlagen/%s (%d KB)" % (dateiname, len(inhalt.encode("utf-8")) // 1024))


# ============================================================ gemeinsames CSS

BASIS_CSS = """
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
       color: #221c15; background: #f4f1ea; }
.hinweis { max-width: 190mm; margin: 6mm auto; padding: 5mm 6mm; background: #fffdf7;
           border: 1px solid #d8cfbc; border-radius: 3mm; font-size: 10pt; line-height: 1.5; }
.hinweis h1 { margin: 0 0 2mm; font-size: 15pt; }
.hinweis p { margin: 0 0 2mm; }
.hinweis strong { color: #8a5a20; }
.bogen { background: #fff; margin: 0 auto; page-break-after: always; break-after: page; }
.bogen:last-child { page-break-after: auto; break-after: auto; }
@media print { body { background: #fff; } .hinweis { display: none; } }
"""

KARTEN_CSS = """
@page { size: A4 portrait; margin: 8mm; }
.bogen { width: 194mm; padding: 0; display: grid;
         grid-template-columns: repeat(3, 63mm); grid-auto-rows: 88mm; gap: 1mm 1mm;
         justify-content: center; }
.karte { width: 63mm; height: 88mm; border: 0.3mm dashed #b9ae99; border-radius: 3mm;
         padding: 3.5mm; display: flex; flex-direction: column; overflow: hidden;
         position: relative; background: #fffdf8; }
.k-kopf { display: flex; align-items: center; gap: 2mm; margin-bottom: 2mm;
          border-bottom: 0.6mm solid currentColor; padding-bottom: 1.5mm; }
.k-emoji { font-size: 20pt; line-height: 1; }
.k-name { font-size: 11.5pt; font-weight: 700; line-height: 1.1; color: #221c15; }
.k-band { position: absolute; top: 0; left: 0; right: 0; height: 2mm; }
.k-kosten { display: flex; flex-wrap: wrap; gap: 1mm; margin-bottom: 2.5mm; }
.k-kost { display: inline-flex; align-items: center; gap: 0.8mm; font-size: 10pt;
          font-weight: 700; padding: 0.8mm 2mm; border-radius: 6mm; border: 0.3mm solid #00000022; }
.k-text { font-size: 9.2pt; line-height: 1.38; flex: 1; position: relative; z-index: 1; }
.k-wasserzeichen { position: absolute; right: -6mm; bottom: 6mm; font-size: 46pt;
                   opacity: 0.09; pointer-events: none; line-height: 1; z-index: 0; }
.k-kosten, .k-kopf, .k-fuss { position: relative; z-index: 1; }
.k-fuss { display: flex; align-items: center; justify-content: space-between;
          margin-top: 2mm; font-size: 8pt; text-transform: uppercase;
          letter-spacing: 0.4pt; color: #6b6154; }
.k-punkte { width: 11mm; height: 11mm; border-radius: 50%; display: flex;
            align-items: center; justify-content: center; font-size: 14pt;
            font-weight: 800; color: #fff; }
.k-ruecken { display: flex; flex-direction: column; align-items: center;
             justify-content: center; gap: 3mm; color: #fff; }
.k-ruecken .r-emoji { font-size: 36pt; }
.k-ruecken .r-name { font-size: 12pt; font-weight: 800; letter-spacing: 1pt;
                     text-transform: uppercase; text-align: center; }
"""


def seite(titel, css, koerper, hinweis=""):
    return (
        "<!doctype html>\n<html lang=\"de\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
        "<title>%s</title>\n<style>%s%s</style>\n</head>\n<body>\n%s%s\n</body>\n</html>\n"
        % (html.escape(titel), BASIS_CSS, css,
           ("<div class=\"hinweis\"><h1>%s</h1>%s</div>\n" % (html.escape(titel), hinweis)) if hinweis else "",
           koerper))


DRUCK_HINWEIS = ("<p><strong>So druckst du das aus:</strong> Diese Datei im Browser öffnen "
                 "(Doppelklick), dann <strong>Strg&nbsp;+&nbsp;P</strong> (Mac: <strong>Cmd&nbsp;+&nbsp;P</strong>). "
                 "Wichtig: Bei „Skalierung\" <strong>100&nbsp;%</strong> bzw. „Tatsächliche Größe\" einstellen – "
                 "nicht „An Seite anpassen\". Und <strong>„Hintergrundgrafiken drucken\"</strong> anhaken, "
                 "sonst bleiben die Farben weg.</p>"
                 "<p>Dieser graue Kasten wird nicht mitgedruckt.</p>")


# =================================================================== Spielplan

def hex_punkte(cx, cy, s):
    return " ".join("%.2f,%.2f" % (cx + s * math.cos(math.radians(60 * i + 30)),
                                   cy + s * math.sin(math.radians(60 * i + 30)))
                    for i in range(6))


def hex_mitte(q, r, s, ox, oy):
    return (ox + s * math.sqrt(3) * (q + r / 2.0), oy + s * 1.5 * r)


def blob_pfad(cx, cy, rx, ry, n, wobble, seed):
    rnd = random.Random(seed)
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        f = 1 + rnd.uniform(-wobble, wobble)
        pts.append((cx + math.cos(a) * rx * f, cy + math.sin(a) * ry * f))
    mid = lambda p, q: ((p[0] + q[0]) / 2.0, (p[1] + q[1]) / 2.0)
    d = ["M %.1f %.1f" % mid(pts[-1], pts[0])]
    for i in range(n):
        p, m = pts[i], mid(pts[i], pts[(i + 1) % n])
        d.append("Q %.1f %.1f %.1f %.1f" % (p[0], p[1], m[0], m[1]))
    d.append("Z")
    return " ".join(d)


def panel(x, y, w, h, titel, zeilen, kopffarbe="#3b3128"):
    """Ein Info-Kästchen auf dem Spielplan. zeilen = Liste (emoji, fett, text)."""
    o = ['<g><rect x="%d" y="%d" width="%d" height="%d" rx="14" fill="#fffdf6" '
         'stroke="#b9ae99" stroke-width="2.5"/>' % (x, y, w, h),
         '<rect x="%d" y="%d" width="%d" height="30" rx="14" fill="%s"/>' % (x, y, w, kopffarbe),
         '<rect x="%d" y="%d" width="%d" height="16" fill="%s"/>' % (x, y + 14, w, kopffarbe),
         '<text x="%d" y="%d" font-size="16" font-weight="700" fill="#fff" '
         'text-anchor="middle" letter-spacing="1.2">%s</text>' % (x + w / 2, y + 21, html.escape(titel))]
    ty = y + 52
    for emoji, fett, text in zeilen:
        if emoji is None:          # Trennlinie
            o.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#ddd4c0" stroke-width="2"/>'
                     % (x + 12, ty - 12, x + w - 12, ty - 12))
            ty += 4
            continue
        o.append('<text x="%d" y="%d" font-size="19">%s</text>' % (x + 13, ty + 1, emoji))
        o.append('<text x="%d" y="%d" font-size="13.5" font-weight="700" fill="#2b241c">%s</text>'
                 % (x + 40, ty - 3, html.escape(fett)))
        if text:
            o.append('<text x="%d" y="%d" font-size="11.5" fill="#6f6556">%s</text>'
                     % (x + 40, ty + 11, html.escape(text)))
            ty += 31
        else:
            ty += 25
    o.append('</g>')
    return "\n".join(o)


PLAN_S = 84.0            # Hex-Radius in SVG-Einheiten
PLAN_LUFT = 3.0          # Fuge zwischen den Feldern
PLAN_W, PLAN_H = 1180, 858
PLAN_BREITE_MM = 272.0   # so breit wird der Plan auf A4 quer gedruckt
MM_JE_EINHEIT = PLAN_BREITE_MM / PLAN_W
HEX_S_MM = (PLAN_S - PLAN_LUFT) * MM_JE_EINHEIT   # Radius der Insel-Plättchen


def spielplan_svg():
    S = PLAN_S
    OX, OY = 590.0, 400.0
    W, H = PLAN_W, PLAN_H
    o = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
         'width="100%%" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif">' % (W, H)]

    # --- Meer
    o.append('<defs>'
             '<radialGradient id="meer" cx="50%" cy="45%" r="75%">'
             '<stop offset="0%" stop-color="#8fc6e0"/><stop offset="100%" stop-color="#4a92bb"/>'
             '</radialGradient>'
             '<radialGradient id="sand" cx="50%" cy="45%" r="70%">'
             '<stop offset="0%" stop-color="#f3e6c8"/><stop offset="100%" stop-color="#e2cfa4"/>'
             '</radialGradient>'
             '<filter id="schatten" x="-20%" y="-20%" width="140%" height="140%">'
             '<feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.22"/>'
             '</filter></defs>')
    o.append('<rect x="0" y="0" width="%d" height="%d" rx="18" fill="url(#meer)"/>' % (W, H))

    # Wellen
    rnd = random.Random(7)
    for _ in range(46):
        wx, wy = rnd.uniform(20, W - 60), rnd.uniform(20, H - 20)
        if (wx - OX) ** 2 / 430.0 ** 2 + (wy - OY) ** 2 / 400.0 ** 2 < 1.15:
            continue
        o.append('<path d="M %.0f %.0f q 9 -6 18 0 q 9 6 18 0" stroke="#ffffff" '
                 'stroke-opacity="0.34" stroke-width="2.6" fill="none" stroke-linecap="round"/>' % (wx, wy))

    # --- Insel (Strand + Land)
    o.append('<path d="%s" fill="#f7eed8" opacity="0.85"/>'
             % blob_pfad(OX, OY, 420, 392, 15, 0.055, 11))
    o.append('<path d="%s" fill="url(#sand)" stroke="#cbb789" stroke-width="3"/>'
             % blob_pfad(OX, OY, 400, 372, 15, 0.05, 11))

    # --- Felder
    sp_nach_index = {s["key"]: s for s in D.SPIELERFARBEN}
    for f in D.FELDER:
        g = D.GELAENDE[f["typ"]]
        cx, cy = hex_mitte(f["q"], f["r"], S, OX, OY)
        ist_werkstatt = f["typ"] == "werkstatt"
        if ist_werkstatt:
            sp = D.SPIELERFARBEN[f["spieler"]]
            fuell, rand = sp["hell"], sp["farbe"]
        else:
            fuell, rand = g["fuell"], g["rand"]
        o.append('<polygon points="%s" fill="%s" stroke="%s" stroke-width="4" '
                 'stroke-linejoin="round" filter="url(#schatten)"/>'
                 % (hex_punkte(cx, cy, S - PLAN_LUFT), fuell, rand))
        # Emoji
        o.append('<text x="%.0f" y="%.0f" font-size="40" text-anchor="middle">%s</text>'
                 % (cx, cy - 6, g["emoji"]))
        # Name
        name = (sp["name"].upper() if ist_werkstatt else g["name"].upper())
        o.append('<text x="%.0f" y="%.0f" font-size="13" font-weight="800" text-anchor="middle" '
                 'fill="%s" letter-spacing="0.8">%s</text>' % (cx, cy + 20, rand, html.escape(name)))
        if ist_werkstatt:
            o.append('<text x="%.0f" y="%.0f" font-size="10.5" font-weight="700" text-anchor="middle" '
                     'fill="#6f6556">WERKSTATT</text>' % (cx, cy + 36))
        elif g["gibt"]:
            res = D.RESSOURCEN[g["gibt"]]
            o.append('<g><rect x="%.0f" y="%.0f" width="58" height="22" rx="11" fill="#ffffffcc" '
                     'stroke="%s" stroke-width="1.6"/>' % (cx - 29, cy + 26, res["farbe"]))
            o.append('<text x="%.0f" y="%.0f" font-size="13" text-anchor="middle" '
                     'font-weight="700" fill="%s">%s +1</text></g>'
                     % (cx, cy + 42, res["farbe"], res["emoji"]))
        if f.get("fundkarten"):
            n = f["fundkarten"]
            o.append('<g><circle cx="%.0f" cy="%.0f" r="17" fill="#fff" stroke="%s" '
                     'stroke-width="2.6" stroke-dasharray="4 3"/>' % (cx, cy + 40, g["rand"]))
            o.append('<text x="%.0f" y="%.0f" font-size="17" font-weight="800" text-anchor="middle" '
                     'fill="%s">%d</text></g>' % (cx, cy + 46, g["rand"], n))
        if f["typ"] == "brachland":
            o.append('<text x="%.0f" y="%.0f" font-size="10.5" font-weight="700" text-anchor="middle" '
                     'fill="#a2957c">wartet auf</text>' % (cx, cy + 34))
            o.append('<text x="%.0f" y="%.0f" font-size="10.5" font-weight="700" text-anchor="middle" '
                     'fill="#a2957c">eine Inselkarte</text>' % (cx, cy + 46))

    # --- Titel
    o.append('<text x="%d" y="40" font-size="32" font-weight="800" text-anchor="middle" '
             'fill="#ffffff" letter-spacing="3" opacity="0.95">🏝️ INSEL DER ERFINDER</text>' % (W / 2))

    # --- Legende links
    o.append(panel(14, 62, 206, 372, "GELÄNDE", [
        ("🌲", "Wald", "gibt 🪵 Holz"),
        ("⛏️", "Mine", "gibt ⚙️ Metall"),
        ("🌊", "Küste", "gibt 💧 Wasser"),
        ("⚡", "Energiequelle", "gibt ⚡ Energie"),
        (None, None, None),
        ("🏛️", "Ruine", "untersuchen: 💎 & mehr"),
        ("🏭", "Werkstatt", "hier baust du"),
        ("🏜️", "Brachland", "noch nichts"),
    ], "#4a7a3c"))

    # --- Aktionen rechts
    o.append(panel(960, 62, 206, 372, "DEINE 3 AP", [
        ("🚶", "Bewegen — 1 AP", "1 Feld weit"),
        ("🪵", "Sammeln — 1 AP", "1 Rohstoff des Feldes"),
        ("🔍", "Untersuchen — 1 AP", "nur Ruine mit Marke"),
        ("🔧", "Bauen — 2 AP", "nur eigene Werkstatt"),
        ("🤝", "Handeln — 1 AP", "Nachbar oder gleiches Feld"),
        ("⚖️", "Tauschbank — 1 AP", "3 gleiche → 1 beliebige"),
    ], "#8a5a20"))

    # --- Rundenleiste unten
    rx0, ry0 = 236, 768
    o.append('<rect x="%d" y="%d" width="708" height="60" rx="30" fill="#fffdf6" '
             'stroke="#b9ae99" stroke-width="2.5"/>' % (rx0, ry0))
    o.append('<text x="%d" y="%d" font-size="12.5" font-weight="800" fill="#6f6556" '
             'letter-spacing="1">RUNDE</text>' % (rx0 + 20, ry0 + 37))
    for i in range(1, D.RUNDEN + 1):
        cx = rx0 + 96 + (i - 1) * 78
        insel = i in (2, 4, 6)
        o.append('<circle cx="%d" cy="%d" r="23" fill="%s" stroke="%s" stroke-width="3"/>'
                 % (cx, ry0 + 30, "#f0e4c4" if insel else "#ffffff", "#c79a1e" if insel else "#b9ae99"))
        o.append('<text x="%d" y="%d" font-size="19" font-weight="800" text-anchor="middle" '
                 'fill="#3b3128">%d</text>' % (cx, ry0 + 37, i))
        if insel:
            o.append('<text x="%d" y="%d" font-size="15" text-anchor="middle">⭐</text>' % (cx, ry0 + 4))
    o.append('<text x="%d" y="%d" font-size="12" fill="#ffffff" fill-opacity="0.9" '
             'text-anchor="middle">⭐ Nach dieser Runde wird eine Inselkarte aufgedeckt – '
             'die Insel verändert sich für immer.</text>' % (W / 2, ry0 + 82))

    # --- Fundkarten-Ablage (Ecke unten links)
    o.append('<g><rect x="20" y="622" width="196" height="120" rx="14" fill="#fffdf6" '
             'stroke="#7a5fae" stroke-width="2.5" stroke-dasharray="7 5"/>'
             '<text x="118" y="654" font-size="14" font-weight="800" fill="#7a5fae" '
             'text-anchor="middle" letter-spacing="1">FUNDKARTEN</text>'
             '<text x="118" y="678" font-size="11.5" fill="#6f6556" text-anchor="middle">'
             'Stapel hier daneben ablegen</text>'
             '<text x="118" y="700" font-size="11.5" fill="#6f6556" text-anchor="middle">'
             'Die Zahl im Kreis auf einer</text>'
             '<text x="118" y="716" font-size="11.5" fill="#6f6556" text-anchor="middle">'
             'Ruine sagt, wie viele</text>'
             '<text x="118" y="732" font-size="11.5" fill="#6f6556" text-anchor="middle">'
             'Fundmarken dort starten.</text></g>')

    # --- Wertung (Ecke unten rechts)
    o.append('<g><rect x="964" y="622" width="202" height="120" rx="14" fill="#fffdf6" '
             'stroke="#b9ae99" stroke-width="2.5"/>'
             '<text x="1065" y="650" font-size="13.5" font-weight="800" fill="#3b3128" '
             'text-anchor="middle" letter-spacing="1">WERTUNG</text>')
    for i, t in enumerate(["🔧 Erfindungen = Kartenwert", "💎 Bauteil = 2 Punkte",
                           "🎯 Auftrag + ⭐ Bonusziel", "📦 3 Rohstoffe = 1 Punkt"]):
        o.append('<text x="976" y="%d" font-size="11.5" fill="#4a4136">%s</text>' % (674 + i * 19, t))
    o.append('</g>')

    o.append('</svg>')
    return "\n".join(o)


def bau_spielplan():
    css = ("@page { size: A4 landscape; margin: 6mm; }\n"
           ".plan { width: %.0fmm; margin: 0 auto; }\n"
           ".plan svg { display: block; width: 100%%; height: auto; }\n"
           "@media print { .plan { page-break-inside: avoid; } }\n" % PLAN_BREITE_MM)
    hinweis = (DRUCK_HINWEIS +
               "<p><strong>Tipp:</strong> Der Plan ist für <strong>A4 quer</strong> gemacht. "
               "Noch schöner wird er auf <strong>A3</strong> – dann im Druckdialog auf "
               "<strong>141&nbsp;%</strong> vergrößern. Wichtig: Die Datei "
               "<em>insel-plaettchen.html</em> dann <strong>genauso</strong> vergrößern, "
               "damit die Plättchen auf die Felder passen.</p>"
               "<p>Am haltbarsten wird er, wenn du ihn auf feste Pappe klebst oder "
               "im Copyshop laminieren lässt.</p>")
    koerper = '<div class="plan">%s</div>' % spielplan_svg()
    schreibe("spielplan.html", seite("Spielplan – Insel der Erfinder", css, koerper, hinweis))


# ====================================================================== Karten

STUFEN_FARBE = {1: "#4a7a3c", 2: "#2a6f97", 3: "#7a5fae"}
STUFEN_NAME = {1: "Stufe I", 2: "Stufe II", 3: "Stufe III"}


def kosten_html(kosten):
    teile = []
    for schluessel in (D.HOLZ, D.METALL, D.WASSER, D.ENERGIE, D.BAUTEIL):
        n = kosten.get(schluessel)
        if not n:
            continue
        r = D.RESSOURCEN[schluessel]
        teile.append('<span class="k-kost" style="background:%s;color:%s">%s&nbsp;%d</span>'
                     % (r["hell"], r["farbe"], r["emoji"], n))
    return '<div class="k-kosten">%s</div>' % "".join(teile)


def karte_html(farbe, emoji, name, koerper, fuss_links="", punkte=None, punktfarbe=None):
    fuss = ""
    if fuss_links or punkte is not None:
        p = ('<span class="k-punkte" style="background:%s">%s</span>'
             % (punktfarbe or farbe, punkte)) if punkte is not None else ""
        fuss = '<div class="k-fuss"><span>%s</span>%s</div>' % (html.escape(fuss_links), p)
    return ('<div class="karte" style="color:%s">'
            '<div class="k-band" style="background:%s"></div>'
            '<div class="k-kopf"><span class="k-emoji">%s</span>'
            '<span class="k-name">%s</span></div>'
            '<div class="k-wasserzeichen">%s</div>%s%s</div>'
            % (farbe, farbe, emoji, html.escape(name), emoji, koerper, fuss))


def ruecken_html(farbe, emoji, name):
    return ('<div class="karte k-ruecken" style="background:%s;border-color:%s">'
            '<div class="r-emoji">%s</div><div class="r-name">%s</div></div>'
            % (farbe, farbe, emoji, html.escape(name)))


def karten_datei(dateiname, titel, karten_html_liste, ruecken=None, extra_hinweis=""):
    """Legt die Karten zu 9 Stück auf A4-Bögen. Mit 'ruecken' folgt auf jeden
    Vorderseiten-Bogen ein passender Rückseiten-Bogen (für Duplexdruck)."""
    boegen = []
    for i in range(0, len(karten_html_liste), 9):
        teil = karten_html_liste[i:i + 9]
        boegen.append('<div class="bogen">%s</div>' % "".join(teil))
        if ruecken:
            boegen.append('<div class="bogen">%s</div>' % (ruecken * len(teil)))
    hinweis = DRUCK_HINWEIS + extra_hinweis
    if ruecken:
        hinweis += ("<p><strong>Rückseiten:</strong> Nach jeder Vorderseite kommt die "
                    "passende Rückseite. Wenn dein Drucker <strong>beidseitig</strong> kann, "
                    "stell „Beidseitig / lange Seite\" ein – dann passt alles von allein. "
                    "Wenn nicht: einfach nur die Vorderseiten drucken, auf festem Papier "
                    "sieht man nichts durch.</p>")
    hinweis += ("<p><strong>Karten (%d Stück):</strong> Am besten auf 200-g-Papier drucken "
                "und an den gestrichelten Linien ausschneiden.</p>" % len(karten_html_liste))
    schreibe(dateiname, seite(titel, KARTEN_CSS, "\n".join(boegen), hinweis))


def bau_erfindungskarten():
    extra = ("<p><strong>Wichtig:</strong> Die Erfindungen werden nach <strong>Stufe</strong> "
             "in drei getrennte Stapel sortiert (die Rückseiten sind unterschiedlich gefärbt). "
             "In der Auslage liegen immer 2× Stufe&nbsp;I, 2× Stufe&nbsp;II und 1× Stufe&nbsp;III.</p>")
    # Bögen mit passender Rückseite je Stufe
    ausgabe = []
    for stufe in (1, 2, 3):
        teil = [karte_html(STUFEN_FARBE[stufe], e["emoji"], e["name"],
                           kosten_html(e["kosten"]) + '<div class="k-text">%s</div>' % html.escape(e["text"]),
                           STUFEN_NAME[stufe], e["punkte"])
                for e in sorted([x for x in D.ERFINDUNGEN if x["stufe"] == stufe],
                                key=lambda x: -x["punkte"])]
        rck = ruecken_html(STUFEN_FARBE[stufe], "🔧", STUFEN_NAME[stufe])
        for i in range(0, len(teil), 9):
            stueck = teil[i:i + 9]
            ausgabe.append('<div class="bogen">%s</div>' % "".join(stueck))
            ausgabe.append('<div class="bogen">%s</div>' % (rck * len(stueck)))
    hinweis = (DRUCK_HINWEIS + extra +
               "<p><strong>Rückseiten:</strong> Nach jedem Vorderseiten-Bogen kommt der "
               "passende Rückseiten-Bogen. Beidseitig drucken („lange Seite\") – oder "
               "einfach weglassen.</p>"
               "<p><strong>24 Erfindungskarten.</strong> Auf 200-g-Papier drucken und "
               "an den gestrichelten Linien ausschneiden.</p>")
    schreibe("erfindungskarten.html",
             seite("Erfindungskarten – Insel der Erfinder", KARTEN_CSS, "\n".join(ausgabe), hinweis))


def bau_fundkarten():
    karten = []
    for f in D.FUNDKARTEN:
        for _ in range(f["anzahl"]):
            farbe = "#7a5fae" if f.get("relikt") else "#8a5a20"
            koerper = '<div class="k-text">%s</div>' % html.escape(f["text"])
            karten.append(karte_html(farbe, f["emoji"], f["name"], koerper,
                                     "Relikt – behalten" if f.get("relikt") else "Fundkarte"))
    karten_datei("fundkarten.html", "Fundkarten – Insel der Erfinder", karten,
                 ruecken_html("#8a5a20", "🏛️", "Fund"),
                 "<p>Diese 20 Karten bilden <strong>einen gemeinsamen verdeckten Stapel</strong> "
                 "neben dem Spielplan. Wer eine Ruine untersucht, nimmt dort eine Fundmarke ab "
                 "und zieht hier die oberste Karte.</p>")


def bau_ereigniskarten():
    art_farbe = {"gut": "#1e8449", "schlecht": "#b04a2f", "gemischt": "#b7950b"}
    art_text = {"gut": "Gutes Ereignis", "schlecht": "Schlechtes Ereignis", "gemischt": "Gemischt"}
    karten = [karte_html(art_farbe[e["art"]], e["emoji"], e["name"],
                         '<div class="k-text">%s</div>' % html.escape(e["text"]),
                         art_text[e["art"]])
              for e in D.EREIGNISSE]
    karten_datei("ereigniskarten.html", "Ereigniskarten – Insel der Erfinder", karten,
                 ruecken_html("#b04a2f", "🃏", "Ereignis"),
                 "<p>Nach jeder Runde wird eine Karte aufgedeckt. Karten, die für die "
                 "<strong>nächste Runde</strong> gelten, bleiben offen liegen.</p>")


def bau_inselkarten():
    karten = [karte_html("#1e8449", k["emoji"], k["name"],
                         '<div class="k-text">%s</div>' % html.escape(k["text"]),
                         "Inselentwicklung")
              for k in D.INSELKARTEN]
    karten_datei("inselkarten.html", "Inselkarten – Insel der Erfinder", karten,
                 ruecken_html("#1e8449", "🏝️", "Insel"),
                 "<p>Von diesen 8 Karten werden pro Partie nur <strong>3</strong> gebraucht: "
                 "nach Runde 2, 4 und 6. Dadurch ist jede Partie anders.</p>")


def bau_forschungsauftraege():
    karten = [karte_html("#2471a3", a["emoji"], a["name"],
                         '<div class="k-text">%s</div>' % html.escape(a["text"]),
                         "Geheimer Auftrag", a["punkte"])
              for a in D.FORSCHUNGSAUFTRAEGE]
    karten_datei("forschungsauftraege.html", "Forschungsaufträge – Insel der Erfinder", karten,
                 ruecken_html("#2471a3", "🎯", "Auftrag"),
                 "<p>Jeder Spieler zieht zu Beginn <strong>2 Stück</strong> und hält sie "
                 "<strong>geheim</strong>. Erfüllte Aufträge werden am Spielende aufgedeckt.</p>")


def bau_bonusziele():
    karten = [karte_html("#b7950b", b["emoji"], b["name"],
                         '<div class="k-text">%s</div>' % html.escape(b["text"]),
                         "Bonusziel für alle", b["punkte"])
              for b in D.BONUSZIELE]
    karten_datei("bonusziele.html", "Bonusziele – Insel der Erfinder", karten, None,
                 "<p><strong>3 Karten</strong> werden offen ausgelegt und gelten für "
                 "<strong>alle</strong> Spieler. Rückseiten braucht man hier nicht.</p>")


# =================================================================== Figuren

def erfinder_figur(farbe, hell):
    """Ein Erfinder mit Schutzbrille und Schraubenschlüssel, 100 x 150 Einheiten."""
    dunkel = "#2b241c"
    return """
  <ellipse cx="50" cy="145" rx="27" ry="5.5" fill="#00000022"/>
  <polygon points="35,86 65,86 77,142 23,142" fill="{farbe}"/>
  <rect x="23" y="134" width="54" height="9" rx="3" fill="{dunkel}"/>
  <rect x="47.5" y="92" width="5" height="42" fill="#00000026"/>
  <g stroke="{farbe}" stroke-width="12" stroke-linecap="round">
    <line x1="34" y1="62" x2="16" y2="76"/>
    <line x1="66" y1="62" x2="84" y2="74"/>
  </g>
  <rect x="31" y="50" width="38" height="42" rx="12" fill="{farbe}"/>
  <path d="M 41 50 L 50 62 L 59 50 Z" fill="{hell}"/>
  <circle cx="50" cy="74" r="7.5" fill="{hell}" opacity="0.95"/>
  <circle cx="50" cy="74" r="3" fill="{farbe}"/>
  <circle cx="16" cy="77" r="7" fill="{hell}"/>
  <circle cx="85" cy="74" r="7" fill="{hell}"/>
  <g transform="rotate(28 85 74)">
    <rect x="82" y="46" width="6" height="30" rx="2.5" fill="{dunkel}"/>
    <path d="M 81 40 h 8 v 7 h -3 v 3 h -2 v -3 h -3 Z" fill="{dunkel}"/>
  </g>
  <circle cx="50" cy="30" r="17" fill="{farbe}"/>
  <path d="M 34 24 q 6 -14 16 -14 q 10 0 16 14 q -8 -5 -16 -5 q -8 0 -16 5 Z" fill="{dunkel}"/>
  <rect x="30" y="20.5" width="40" height="11" rx="4" fill="{dunkel}"/>
  <circle cx="40" cy="26" r="5" fill="{hell}"/>
  <circle cx="60" cy="26" r="5" fill="{hell}"/>
  <circle cx="40" cy="26" r="2" fill="{dunkel}" opacity="0.5"/>
  <circle cx="60" cy="26" r="2" fill="{dunkel}" opacity="0.5"/>
  <path d="M 42 39 q 8 6 16 0" stroke="{dunkel}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
""".format(farbe=farbe, hell=hell, dunkel=dunkel)


def figur_streifen(sp):
    """Eine zum Falten: oben die Figur auf dem Kopf, unten aufrecht."""
    fig = erfinder_figur(sp["farbe"], sp["hell"])
    return """<svg class="figur" viewBox="0 0 100 300" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="98" height="298" rx="7" fill="#fff" stroke="#c9bfa9"
        stroke-width="1" stroke-dasharray="3 2.5"/>
  <g transform="rotate(180 50 75)">{fig}</g>
  <g transform="translate(0 150)">{fig}</g>
  <line x1="3" y1="150" x2="97" y2="150" stroke="{farbe}" stroke-width="1.4"
        stroke-dasharray="5 4" opacity="0.8"/>
  <text x="50" y="159" font-size="6.2" fill="{farbe}" text-anchor="middle"
        font-family="Arial, sans-serif" font-weight="700" letter-spacing="1.2"
        opacity="0.9">▲ HIER FALTEN ▲</text>
  <text x="50" y="291.5" font-size="7.4" fill="#ffffff" text-anchor="middle"
        font-family="Arial, sans-serif" font-weight="800" letter-spacing="1.6">{name}</text>
  <text x="50" y="14" font-size="7.4" fill="#ffffff" text-anchor="middle"
        font-family="Arial, sans-serif" font-weight="800" letter-spacing="1.6"
        transform="rotate(180 50 11)">{name}</text>
</svg>""".format(fig=fig, farbe=sp["farbe"], name=sp["name"].upper())


def bau_figuren():
    css = """
@page { size: A4 portrait; margin: 10mm; }
.bogen { width: 190mm; padding: 0; display: flex; flex-wrap: wrap;
         gap: 3mm 5mm; justify-content: center; align-content: flex-start; }
.figur { width: 37mm; height: 111mm; display: block; }
.bastel { width: 190mm; margin: 0 auto 3mm; padding: 2.5mm 4mm; border: 0.4mm solid #c9bfa9;
          border-radius: 2mm; font-size: 8.8pt; line-height: 1.4; background: #fffdf7;
          display: flex; gap: 5mm; align-items: flex-start; }
.bastel h2 { margin: 0; font-size: 10.5pt; white-space: nowrap; }
.bastel ol { margin: 0; padding-left: 4.5mm; columns: 2; column-gap: 6mm; }
.bastel li { margin-bottom: 0.6mm; break-inside: avoid; }
.bastel .ersatz { margin: 1mm 0 0; font-size: 8.2pt; color: #6f6556; }
"""
    streifen = "".join(figur_streifen(sp) for sp in D.SPIELERFARBEN for _ in range(2))
    anleitung = ("<div class=\"bastel\"><h2>🙋 Vom Papier zur Figur</h2><div><ol>"
                 "<li>Streifen an der äußeren gestrichelten Linie ausschneiden.</li>"
                 "<li>In der Mitte falten – die beiden Köpfe treffen sich oben.</li>"
                 "<li>Unten leicht auseinanderziehen: Die Figur steht wie ein Zelt.</li>"
                 "<li>Wackelt sie? <strong>Wäscheklammer</strong> als Fuß nehmen oder "
                 "vorher auf Pappe kleben.</li></ol>"
                 "<p class=\"ersatz\">Von jeder Farbe sind <strong>zwei</strong> Figuren dabei – "
                 "eine zum Spielen, eine als Ersatz.</p></div></div>")
    koerper = anleitung + '<div class="bogen">%s</div>' % streifen
    schreibe("spielfiguren.html",
             seite("Spielfiguren – Insel der Erfinder", css, koerper,
                   DRUCK_HINWEIS + "<p><strong>Tipp:</strong> Auf möglichst festem Papier "
                   "drucken (160–250&nbsp;g), sonst knicken die Figuren um.</p>"))


# ======================================================== Werkstatt-Tableaus

def tableau_html(sp):
    lager = "".join(
        '<div class="lagerfach" style="border-color:%s">'
        '<div class="lf-kopf" style="background:%s">%s %s</div>'
        '<div class="lf-flaeche"></div></div>'
        % (D.RESSOURCEN[k]["farbe"], D.RESSOURCEN[k]["hell"], D.RESSOURCEN[k]["emoji"],
           html.escape("Bauteil" if k == D.BAUTEIL else D.RESSOURCEN[k]["name"]))
        for k in (D.HOLZ, D.METALL, D.WASSER, D.ENERGIE, D.BAUTEIL))

    aktionen = "".join(
        '<li><b>%s</b> <span>%s</span></li>' % (html.escape(a), html.escape(b))
        for a, b in [("🚶 Bewegen — 1", "1 Feld weit"),
                     ("🪵 Sammeln — 1", "1 Rohstoff des Feldes"),
                     ("🔍 Untersuchen — 1", "Ruine mit Fundmarke"),
                     ("🔧 Bauen — 2", "nur hier, in deiner Werkstatt"),
                     ("🤝 Handeln — 1", "Nachbar oder gleiches Feld"),
                     ("⚖️ Tauschbank — 1", "3 gleiche → 1 beliebige")])

    kaestchen = lambda n: "".join('<span class="kaestchen"></span>' for _ in range(n))
    gelaende = "".join('<span class="gel">%s<span class="kaestchen"></span></span>' % e
                       for e in ("🌲", "⛏️", "🌊", "⚡", "🏛️"))

    return """<div class="tableau" style="--farbe:%s;--hell:%s">
  <div class="t-kopf"><span class="t-titel">🏭 WERKSTATT %s</span>
    <span class="t-limit">Lager: max. <b>10</b> Rohstoffe · 💎 zählen nicht mit</span></div>
  <div class="t-raster">
    <div class="t-links">
      <div class="t-label">Dein Lager</div>
      <div class="lagerreihe">%s</div>
      <div class="t-label">Deine Erfindungen hierhin legen</div>
      <div class="bauplatz">🔧</div>
    </div>
    <div class="t-rechts">
      <div class="t-label">Deine 3 Aktionspunkte</div>
      <ul class="aktionen">%s</ul>
      <div class="t-label">Merkliste (für Aufträge &amp; Bonusziele)</div>
      <div class="merk"><b>Gehandelt</b>%s</div>
      <div class="merk"><b>Ruine untersucht</b>%s</div>
      <div class="merk"><b>Gelände besucht</b>%s</div>
      <div class="rundenbox">
        <b>Jede Runde:</b> alle sind dran &rarr; Lager auf 10 pr&uuml;fen &rarr;
        Ereigniskarte &rarr; nach Runde 2/4/6 eine Inselkarte
      </div>
    </div>
  </div>
</div>""" % (sp["farbe"], sp["hell"], html.escape(sp["name"].upper()),
             lager, aktionen, kaestchen(6), kaestchen(6), gelaende)


def bau_tableaus():
    css = """
@page { size: A4 portrait; margin: 8mm; }
.bogen { width: 194mm; display: flex; flex-direction: column; gap: 4mm; }
.tableau { border: 0.8mm solid var(--farbe); border-radius: 3mm; overflow: hidden;
           background: #fffdf8; height: 133mm; display: flex; flex-direction: column; }
.t-kopf { background: var(--farbe); color: #fff; padding: 2.5mm 4mm; display: flex;
          align-items: baseline; justify-content: space-between; }
.t-titel { font-size: 13pt; font-weight: 800; letter-spacing: 1pt; }
.t-limit { font-size: 8.5pt; opacity: 0.95; }
.t-raster { display: grid; grid-template-columns: 1.05fr 1fr; gap: 4mm; padding: 3mm 4mm 4mm; flex: 1; }
.t-links, .t-rechts { display: flex; flex-direction: column; min-height: 0; }
.rundenbox { margin-top: auto; font-size: 7.6pt; line-height: 1.45; background: var(--hell);
             border-radius: 1.5mm; padding: 2mm 2.5mm; color: #4a4136; }
.t-label { font-size: 7.5pt; font-weight: 800; letter-spacing: 0.6pt; text-transform: uppercase;
           color: #7a6f5d; margin: 0 0 1.5mm; }
.lagerreihe { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.2mm; margin-bottom: 3mm; }
.lagerfach { border: 0.4mm solid; border-radius: 1.5mm; overflow: hidden; }
.lf-kopf { font-size: 6.6pt; font-weight: 700; text-align: center; padding: 0.8mm 0.3mm;
           line-height: 1.2; }
.lf-flaeche { height: 26mm; }
.bauplatz { border: 0.5mm dashed var(--farbe); border-radius: 2mm; flex: 1; min-height: 46mm;
            display: flex; align-items: center; justify-content: center;
            font-size: 24pt; opacity: 0.25; }
.aktionen { list-style: none; margin: 0 0 3mm; padding: 0; }
.aktionen li { display: flex; justify-content: space-between; gap: 2mm; font-size: 8.4pt;
               padding: 0.9mm 0; border-bottom: 0.2mm dotted #d5cbb6; }
.aktionen li span { color: #7a6f5d; font-size: 7.8pt; text-align: right; }
.merk { font-size: 8.2pt; margin-bottom: 2mm; display: flex; align-items: center;
        gap: 1.5mm; flex-wrap: wrap; }
.merk b { min-width: 25mm; }
.kaestchen { display: inline-block; width: 4.2mm; height: 4.2mm; border: 0.35mm solid #9c907a;
             border-radius: 0.8mm; background: #fff; }
.gel { display: inline-flex; align-items: center; gap: 0.6mm; margin-right: 0.9mm; font-size: 8.4pt; }
.merk .kaestchen { flex: none; }
"""
    boegen = []
    for i in range(0, len(D.SPIELERFARBEN), 2):
        paar = D.SPIELERFARBEN[i:i + 2]
        boegen.append('<div class="bogen">%s</div>' % "".join(tableau_html(sp) for sp in paar))
    schreibe("werkstatt-tableaus.html",
             seite("Werkstatt-Tableaus – Insel der Erfinder", css, "\n".join(boegen),
                   DRUCK_HINWEIS + "<p>Jeder Spieler bekommt ein Tableau in seiner Farbe. "
                   "Auf zwei A4-Seiten sind alle vier drauf. Die Merkliste ist zum Ankreuzen – "
                   "am besten laminieren und mit abwischbarem Stift benutzen.</p>"))


# ====================================================================== Marker

def marker_html(emoji, text, fuell, rand, klein=False):
    return ('<div class="marker" style="background:%s;border-color:%s;color:%s">'
            '<span class="m-emoji">%s</span>'
            '<span class="m-text"%s>%s</span></div>'
            % (fuell, rand, rand, emoji,
               ' style="font-size:4.4pt"' if klein else "", html.escape(text)))


def bau_marker():
    css = """
@page { size: A4 portrait; margin: 8mm; }
.bogen { width: 194mm; padding: 0; }
.gruppe { margin-bottom: 3mm; }
.g-titel { font-size: 9pt; font-weight: 800; letter-spacing: 0.8pt; text-transform: uppercase;
           color: #6f6556; border-bottom: 0.4mm solid #d5cbb6; padding-bottom: 1mm;
           margin-bottom: 2mm; }
.reihe { display: flex; flex-wrap: wrap; gap: 1.2mm; }
.marker { width: 18mm; height: 18mm; border-radius: 50%; border: 0.4mm solid;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.3mm; }
.m-emoji { font-size: 10pt; line-height: 1; }
.m-text { font-size: 5pt; font-weight: 800; letter-spacing: 0.2pt; line-height: 1; }
"""
    def gruppe(titel, marker):
        return ('<div class="gruppe"><div class="g-titel">%s</div>'
                '<div class="reihe">%s</div></div>' % (html.escape(titel), "".join(marker)))

    # --- Seite 1: die drei häufigsten Rohstoffe
    seite1 = []
    for schluessel, anzahl in ((D.HOLZ, 40), (D.METALL, 40), (D.WASSER, 40)):
        r = D.RESSOURCEN[schluessel]
        seite1.append(gruppe("%s %s – %d Stück" % (r["emoji"], r["name"], anzahl),
                             [marker_html(r["emoji"], r["name"].upper(), r["hell"], r["farbe"])] * anzahl))

    # --- Seite 2: der Rest
    seite2 = []
    for schluessel, anzahl in ((D.ENERGIE, 25), (D.BAUTEIL, 20)):
        r = D.RESSOURCEN[schluessel]
        seite2.append(gruppe("%s %s – %d Stück" % (r["emoji"], r["name"], anzahl),
                             [marker_html(r["emoji"], "BAUTEIL" if schluessel == D.BAUTEIL
                                          else r["name"].upper(), r["hell"], r["farbe"])] * anzahl))
    seite2.append(gruppe("🏛️ Fundmarken – 28 Stück (liegen auf den Ruinen)",
                         [marker_html("🏛️", "FUND", "#e3dcd0", "#9a8c76")] * 28))
    ap = []
    for sp in D.SPIELERFARBEN:
        ap += [marker_html("⬤", "AP", sp["hell"], sp["farbe"])] * 3
    seite2.append(gruppe("⬤ Aktionspunkte – 3 pro Spieler", ap))
    seite2.append(gruppe("Sonstige Marker", [
        marker_html("⏳", "RUNDE", "#fff", "#3b3128"),
        marker_html("👑", "START", "#f8ebc0", "#b7950b"),
    ]))

    koerper = ('<div class="bogen">%s</div><div class="bogen">%s</div>'
               % ("".join(seite1), "".join(seite2)))
    schreibe("marker.html",
             seite("Marker – Insel der Erfinder", css, koerper,
                   DRUCK_HINWEIS +
                   "<p><strong>207 runde Marker</strong> auf zwei Seiten. Ausschneiden ist "
                   "Fleißarbeit – es geht schneller, wenn du das Blatt auf Pappe klebst und "
                   "die Reihen erst in Streifen schneidest.</p>"
                   "<p><strong>Geht auch:</strong> getrocknete Bohnen, Perlen, Lego-Steine oder "
                   "Münzen als Rohstoffe nehmen. Dann brauchst du nur die "
                   "<strong>Fundmarken</strong> und den <strong>Rundenmarker</strong>.</p>"))


# =========================================================== Insel-Plättchen

def plaettchen_svg(pl):
    if pl["gelaende"] is None:      # die Brücke ist kein Feld
        return """<svg class="bruecke" viewBox="0 0 220 90" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="216" height="86" rx="12" fill="#e8d9c5" stroke="#8a5a20"
        stroke-width="3" stroke-dasharray="7 5"/>
  <path d="M 24 62 Q 110 16 196 62" stroke="#8a5a20" stroke-width="7" fill="none"/>
  <g stroke="#8a5a20" stroke-width="4.5">
    <line x1="48" y1="53" x2="48" y2="70"/><line x1="86" y1="40" x2="86" y2="70"/>
    <line x1="134" y1="40" x2="134" y2="70"/><line x1="172" y1="53" x2="172" y2="70"/>
  </g>
  <line x1="20" y1="70" x2="200" y2="70" stroke="#8a5a20" stroke-width="6"/>
  <text x="110" y="28" font-size="17" font-weight="800" fill="#8a5a20" text-anchor="middle"
        font-family="Arial, sans-serif" letter-spacing="1.5">BRÜCKE</text>
</svg>"""
    g = D.GELAENDE[pl["gelaende"]]
    s, cx, cy = 50.0, 43.3, 50.0
    eingestuerzt = pl["name"] == "Eingestürzt"
    fuell = "#ddd2c0" if eingestuerzt else g["fuell"]
    rand = "#9a5f2a" if eingestuerzt else g["rand"]
    o = ['<svg class="plaettchen" viewBox="0 0 86.6 100" xmlns="http://www.w3.org/2000/svg">',
         '<polygon points="%s" fill="%s" stroke="%s" stroke-width="2.4" stroke-linejoin="round"/>'
         % (hex_punkte(cx, cy, s - 1.2), fuell, rand),
         '<text x="%.1f" y="%.1f" font-size="24" text-anchor="middle">%s</text>'
         % (cx, cy - 2, pl["emoji"])]
    beschriftung = "EINGESTÜRZT" if eingestuerzt else g["name"].upper()
    o.append('<text x="%.1f" y="%.1f" font-size="8" font-weight="800" text-anchor="middle" '
             'fill="%s" font-family="Arial, sans-serif" letter-spacing="0.5">%s</text>'
             % (cx, cy + 13, rand, html.escape(beschriftung)))
    if eingestuerzt:
        zusatz = "3 Fundmarken"
    elif g["gibt"]:
        r = D.RESSOURCEN[g["gibt"]]
        zusatz = "%s +1" % r["emoji"]
    else:
        zusatz = "3 Fundmarken"
    o.append('<text x="%.1f" y="%.1f" font-size="7.5" text-anchor="middle" fill="#6f6556" '
             'font-family="Arial, sans-serif">%s</text>' % (cx, cy + 25, zusatz))
    o.append('</svg>')
    return "\n".join(o)


def bau_plaettchen():
    breite = HEX_S_MM * math.sqrt(3)
    css = """
@page { size: A4 portrait; margin: 12mm; }
.bogen { width: 186mm; display: flex; flex-wrap: wrap; gap: 8mm; justify-content: center;
         align-items: flex-start; }
.plaettchen { width: %.2fmm; height: %.2fmm; }
.bruecke { width: %.2fmm; height: %.2fmm; }
.stueck { text-align: center; }
.stueck figcaption { font-size: 7.6pt; color: #6f6556; margin-top: 1.5mm; max-width: %.0fmm;
                     line-height: 1.35; }
.stueck figcaption b { color: #3b3128; }
""" % (breite, breite * 100.0 / 86.6, breite * 1.55, breite * 1.55 * 90.0 / 220.0, breite + 6)

    stuecke = []
    for pl in D.INSELPLAETTCHEN:
        stuecke.append('<figure class="stueck">%s<figcaption>gehört zur Inselkarte<br>'
                       '<b>%s</b></figcaption></figure>'
                       % (plaettchen_svg(pl), html.escape(pl["karte"])))
    hinweis = (DRUCK_HINWEIS +
               "<p><strong>Ganz wichtig:</strong> Diese Seite <em>genauso</em> skalieren wie "
               "den Spielplan. Beides auf 100&nbsp;% &rarr; passt. Beides auf 141&nbsp;% (A3) "
               "&rarr; passt auch. Nur eins von beidem vergrößern &rarr; passt nicht.</p>"
               "<p>Die Plättchen werden während des Spiels durch <strong>Inselkarten</strong> "
               "auf den Plan gelegt und decken das alte Gelände zu. Die "
               "<strong>Brücke</strong> ist kein Feld – sie wird zwischen zwei Felder gelegt.</p>")
    schreibe("insel-plaettchen.html",
             seite("Insel-Plättchen – Insel der Erfinder", css,
                   '<div class="bogen">%s</div>' % "".join(stuecke), hinweis))


# ================================================================ Wertungsblock

def bau_wertungsblock():
    zeilen = [
        ("🔧", "Erfindungen", "Punkte auf den Karten zusammenzählen"),
        ("💎", "Seltene Bauteile", "Anzahl × 2"),
        ("🎯", "Forschungsauftrag 1", "nur wenn erfüllt"),
        ("🎯", "Forschungsauftrag 2", "nur wenn erfüllt"),
        ("🎯", "Weitere Aufträge", "aus Fundkarten"),
        ("⭐", "Bonusziel 1", ""),
        ("⭐", "Bonusziel 2", ""),
        ("⭐", "Bonusziel 3", ""),
        ("🗿", "Relikte", "wie auf der Karte"),
        ("📦", "Restliche Rohstoffe", "Anzahl ÷ 3, abrunden"),
    ]
    kopf = "".join('<th style="color:%s">%s</th>' % (sp["farbe"], html.escape(sp["name"]))
                   for sp in D.SPIELERFARBEN)
    koerper_zeilen = "".join(
        '<tr><td class="w-emoji">%s</td><td class="w-was"><b>%s</b>%s</td>%s</tr>'
        % (e, html.escape(n), ('<span>%s</span>' % html.escape(h)) if h else "",
           "".join('<td class="w-feld"></td>' for _ in D.SPIELERFARBEN))
        for e, n, h in zeilen)
    tabelle = ("""<table class="wertung">
  <tr><th></th><th class="w-was">Wofür?</th>%s</tr>
  %s
  <tr class="w-summe"><td class="w-emoji">🏆</td><td class="w-was"><b>SUMME</b></td>%s</tr>
</table>""" % (kopf, koerper_zeilen,
               "".join('<td class="w-feld"></td>' for _ in D.SPIELERFARBEN)))

    block = ('<div class="block"><h2>🏆 Wertung – Insel der Erfinder</h2>%s'
             '<p class="w-fuss"><b>Gleichstand?</b> Es gewinnt, wer mehr Erfindungen gebaut hat. '
             'Dann: wer mehr 💎 hat. Dann: gemeinsamer Sieg.</p></div>' % tabelle)
    css = """
@page { size: A4 portrait; margin: 12mm; }
.bogen { width: 186mm; display: flex; flex-direction: column; gap: 10mm; }
.block h2 { font-size: 14pt; margin: 0 0 3mm; }
.wertung { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
.wertung th, .wertung td { border: 0.3mm solid #b9ae99; padding: 1.8mm 2mm; text-align: center; }
.wertung th { background: #efe9dc; font-size: 10pt; }
.w-emoji { width: 9mm; font-size: 12pt; }
.w-was { text-align: left !important; width: 58mm; }
.w-was span { display: block; font-size: 7.6pt; color: #7a6f5d; }
.w-feld { height: 9mm; background: #fffdf8; }
.w-summe td { background: #f6efdd; font-size: 12pt; height: 12mm; }
.w-fuss { font-size: 8.5pt; color: #6f6556; margin: 2mm 0 0; }
"""
    schreibe("wertungsblock.html",
             seite("Wertungsblock – Insel der Erfinder", css,
                   '<div class="bogen">%s%s</div>' % (block, block),
                   DRUCK_HINWEIS + "<p>Zwei Wertungen pro Blatt – reicht für zwei Partien. "
                   "Oder einmal drucken, laminieren und mit abwischbarem Stift benutzen.</p>"))


# ================================================== Markdown -> HTML (schlank)

def _inline(t):
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![\w*])\*([^*\n]+?)\*(?![\w*])", r"<em>\1</em>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    t = t.replace("&amp;rarr;", "&rarr;")
    return t


def md_zu_html(md):
    zeilen = md.split("\n")
    aus, i = [], 0
    n = len(zeilen)
    while i < n:
        z = zeilen[i]
        s = z.strip()

        if not s:
            i += 1; continue

        if s.startswith("#"):
            grad = len(s) - len(s.lstrip("#"))
            aus.append("<h%d>%s</h%d>" % (grad, _inline(s[grad:].strip()), grad))
            i += 1; continue

        if re.match(r"^-{3,}$", s):
            aus.append("<hr>"); i += 1; continue

        # Tabelle
        if s.startswith("|") and i + 1 < n and re.match(r"^\|[\s:|-]+\|$", zeilen[i + 1].strip()):
            def felder(r):
                return [c.strip() for c in r.strip().strip("|").split("|")]
            kopf = felder(s)
            i += 2
            koerper = []
            while i < n and zeilen[i].strip().startswith("|"):
                koerper.append(felder(zeilen[i])); i += 1
            aus.append("<table><thead><tr>%s</tr></thead><tbody>%s</tbody></table>" % (
                "".join("<th>%s</th>" % _inline(c) for c in kopf),
                "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % _inline(c) for c in r)
                        for r in koerper)))
            continue

        # Zitatblock
        if s.startswith(">"):
            teile = []
            while i < n and zeilen[i].strip().startswith(">"):
                teile.append(zeilen[i].strip().lstrip(">").strip()); i += 1
            aus.append("<blockquote>%s</blockquote>" % _inline(" ".join(teile)))
            continue

        # Liste (mit Fortsetzungszeilen)
        m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", z)
        if m:
            geordnet = not m.group(2) in ("-", "*")
            punkte = []
            while i < n:
                mm = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", zeilen[i])
                if mm:
                    punkte.append([mm.group(3)]); i += 1
                elif zeilen[i].strip() and zeilen[i].startswith((" ", "\t")) and punkte:
                    punkte[-1].append(zeilen[i].strip()); i += 1
                else:
                    break
            tag = "ol" if geordnet else "ul"
            aus.append("<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % _inline(" ".join(p))
                                                     for p in punkte), tag))
            continue

        # Absatz
        teile = []
        while i < n and zeilen[i].strip() and not re.match(
                r"^\s*(#|\||>|-{3,}|([-*]|\d+\.)\s)", zeilen[i]):
            teile.append(zeilen[i].strip()); i += 1
        aus.append("<p>%s</p>" % _inline(" ".join(teile)))
    return "\n".join(aus)


# ========================================================== Anhang: Kartenliste

def _kosten_text(kosten):
    return " ".join("%s%d" % (D.RESSOURCEN[k]["emoji"], v)
                    for k, v in kosten.items() if v)


def anhang_md():
    t = ["\n---\n\n## Anhang A: Alle 24 Erfindungen\n"]
    for stufe, titel in ((1, "Stufe I – kleine Helfer"),
                         (2, "Stufe II – richtige Maschinen"),
                         (3, "Stufe III – Super-Erfindungen")):
        t.append("### %s\n" % titel)
        t.append("| Erfindung | Kosten | Punkte | Fähigkeit |")
        t.append("|---|---|---|---|")
        for e in sorted([x for x in D.ERFINDUNGEN if x["stufe"] == stufe],
                        key=lambda x: -x["punkte"]):
            t.append("| %s **%s** | %s | **%d** | %s |"
                     % (e["emoji"], e["name"], _kosten_text(e["kosten"]), e["punkte"], e["text"]))
        t.append("")

    t.append("## Anhang B: Alle 12 Ereigniskarten\n")
    t.append("| Ereignis | Wirkung |")
    t.append("|---|---|")
    for e in D.EREIGNISSE:
        t.append("| %s **%s** | %s |" % (e["emoji"], e["name"], e["text"]))
    t.append("")

    t.append("## Anhang C: Alle 8 Inselkarten\n")
    t.append("| Inselkarte | Wirkung |")
    t.append("|---|---|")
    for k in D.INSELKARTEN:
        t.append("| %s **%s** | %s |" % (k["emoji"], k["name"], k["text"]))
    t.append("")

    t.append("## Anhang D: Alle 12 Forschungsaufträge\n")
    t.append("| Auftrag | Punkte | Bedingung |")
    t.append("|---|---|---|")
    for a in D.FORSCHUNGSAUFTRAEGE:
        t.append("| %s **%s** | **%d** | %s |" % (a["emoji"], a["name"], a["punkte"], a["text"]))
    t.append("")

    t.append("## Anhang E: Alle 10 Bonusziele\n")
    t.append("| Bonusziel | Punkte | Bedingung |")
    t.append("|---|---|---|")
    for b in D.BONUSZIELE:
        t.append("| %s **%s** | **%d** | %s |" % (b["emoji"], b["name"], b["punkte"], b["text"]))
    t.append("")

    t.append("## Anhang F: Alle 20 Fundkarten\n")
    t.append("| Anzahl | Karte | Wirkung |")
    t.append("|---|---|---|")
    for f in D.FUNDKARTEN:
        t.append("| %d× | %s **%s** | %s |" % (f["anzahl"], f["emoji"], f["name"], f["text"]))
    t.append("")
    return "\n".join(t)


def bau_anleitung():
    vollstaendig = R.REGELN.strip() + "\n" + anhang_md()
    io.open(os.path.join(WURZEL, "ANLEITUNG.md"), "w", encoding="utf-8").write(vollstaendig + "\n")
    print("  geschrieben: ANLEITUNG.md (%d KB)" % (len(vollstaendig.encode("utf-8")) // 1024))

    css = """
@page { size: A4 portrait; margin: 16mm 15mm; }
.bogen { width: 180mm; padding: 0; page-break-after: auto; }
.regeln { font-size: 10.5pt; line-height: 1.55; color: #2b241c; }
.regeln h1 { font-size: 26pt; margin: 0 0 4mm; line-height: 1.1; letter-spacing: -0.5pt; }
.regeln h2 { font-size: 15pt; margin: 9mm 0 3mm; padding-bottom: 1.5mm;
             border-bottom: 0.6mm solid #c9a227; page-break-after: avoid; }
.regeln h3 { font-size: 12pt; margin: 6mm 0 2mm; color: #8a5a20; page-break-after: avoid; }
.regeln p { margin: 0 0 3mm; }
.regeln ul, .regeln ol { margin: 0 0 3.5mm; padding-left: 6mm; }
.regeln li { margin-bottom: 1.5mm; }
.regeln hr { border: none; border-top: 0.4mm solid #ddd4c0; margin: 7mm 0; }
.regeln table { width: 100%; border-collapse: collapse; margin: 0 0 4mm; font-size: 9.5pt;
                page-break-inside: avoid; }
.regeln th, .regeln td { border: 0.25mm solid #cfc5b0; padding: 1.6mm 2.2mm;
                         text-align: left; vertical-align: top; }
.regeln th { background: #efe9dc; font-weight: 700; }
.regeln tr:nth-child(even) td { background: #faf7f0; }
.regeln blockquote { margin: 0 0 4mm; padding: 2.5mm 4mm; background: #fdf6e3;
                     border-left: 1.2mm solid #c9a227; border-radius: 0 2mm 2mm 0; }
.regeln blockquote p { margin: 0; }
.regeln strong { color: #6b4a1a; }
.regeln code { background: #efe9dc; padding: 0.3mm 1mm; border-radius: 1mm; font-size: 9.5pt; }
@media screen { .bogen { padding: 14mm; margin: 6mm auto; border-radius: 3mm;
                         box-shadow: 0 2px 14px #0001; } }
"""
    koerper = '<div class="bogen"><div class="regeln">%s</div></div>' % md_zu_html(vollstaendig)
    schreibe("anleitung.html", seite("Spielanleitung – Insel der Erfinder", css, koerper,
                                     DRUCK_HINWEIS +
                                     "<p>Die komplette Anleitung samt Kartenübersicht. "
                                     "Ideal beidseitig gedruckt und zusammengeheftet.</p>"))


# ========================================================================= Los

def alles():
    print("Baue 'Insel der Erfinder' ...")
    bau_spielplan()
    bau_erfindungskarten()
    bau_fundkarten()
    bau_ereigniskarten()
    bau_inselkarten()
    bau_forschungsauftraege()
    bau_bonusziele()
    bau_figuren()
    bau_tableaus()
    bau_marker()
    bau_plaettchen()
    bau_wertungsblock()
    bau_anleitung()
    print("Fertig. Alles liegt in druckvorlagen/")


if __name__ == "__main__":
    alles()
