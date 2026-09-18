# -*- coding: utf-8 -*-
"""Alle Spieldaten von 'Insel der Erfinder' an einem Ort.

Wenn du etwas am Spiel ändern willst (Kosten, Punkte, Texte), ändere es
HIER und starte danach 'python3 werkzeuge/erzeuge.py'. Dann werden alle
Druckvorlagen neu gebaut.
"""

# ---------------------------------------------------------------- Ressourcen

HOLZ, METALL, WASSER, ENERGIE, BAUTEIL = "holz", "metall", "wasser", "energie", "bauteil"

RESSOURCEN = {
    HOLZ:    {"name": "Holz",             "emoji": "\U0001FAB5", "farbe": "#7a5230", "hell": "#e8d9c5"},
    METALL:  {"name": "Metall",           "emoji": "⚙️", "farbe": "#5a6673", "hell": "#d8dee5"},
    WASSER:  {"name": "Wasser",           "emoji": "\U0001F4A7", "farbe": "#2a6f97", "hell": "#cfe4f2"},
    ENERGIE: {"name": "Energie",          "emoji": "⚡",     "farbe": "#b8860b", "hell": "#f7e9bf"},
    BAUTEIL: {"id": "bauteil", "name": "Seltenes Bauteil", "emoji": "\U0001F48E", "farbe": "#6b4a9e", "hell": "#e4dbf5"},
}

# ------------------------------------------------------------ Geländetypen

GELAENDE = {
    "wald":     {"name": "Wald",          "emoji": "\U0001F332", "gibt": HOLZ,    "fuell": "#dbd5b2", "rand": "#7b7a4f"},
    "mine":     {"name": "Mine",          "emoji": "\u26CF\uFE0F", "gibt": METALL,  "fuell": "#dad3c5", "rand": "#7d7264"},
    "kueste":   {"name": "Küste",         "emoji": "\U0001F30A", "gibt": WASSER,  "fuell": "#e9e1cd", "rand": "#8a8168"},
    "energie":  {"name": "Energiequelle", "emoji": "\u26A1",     "gibt": ENERGIE, "fuell": "#ecdcab", "rand": "#987d38"},
    "ruine":    {"name": "Ruine",         "emoji": "\U0001F3DB\uFE0F", "gibt": None, "fuell": "#d5c8b0", "rand": "#796950"},
    "grruine":  {"name": "Große Ruine",   "emoji": "\U0001F3DB\uFE0F", "gibt": None, "fuell": "#c7b593", "rand": "#67563d"},
    "brachland":{"name": "Brachland",     "emoji": "\U0001F3DC\uFE0F", "gibt": None, "fuell": "#f2ead9", "rand": "#b2a78e"},
    "werkstatt":{"name": "Werkstatt",     "emoji": "\U0001F3ED", "gibt": None, "fuell": "#fffdf8", "rand": "#4a3b2a"},
}

SPIELERFARBEN = [
    {"key": "rot",  "name": "Rot",  "farbe": "#9c4a35", "hell": "#f8e6de"},
    {"key": "blau", "name": "Blau", "farbe": "#3f6478", "hell": "#e4eef4"},
    {"key": "gruen","name": "Grün", "farbe": "#5a7345", "hell": "#eaefe1"},
    {"key": "gelb", "name": "Gelb", "farbe": "#a8842c", "hell": "#faf2dd"},
]

# ------------------------------------------------------------- Der Spielplan
# Achsiale Hex-Koordinaten (q, r). Gültig ist alles mit |q|,|r|,|q+r| <= 2.
# Das ergibt 19 Felder: 1 Mitte + 6 innerer Ring + 12 äußerer Ring. (q, r)
# bestimmen weiterhin, welche Felder als Nachbarn gelten (Bewegungsregeln) -
# das bleibt unverändert.
#
# "bx"/"by" sind zusätzlich die Bildkoordinaten der Station auf der
# handgezeichneten Insel-Illustration (werkzeuge/artwork/inselkarte.jpg,
# BILD_BREITE x BILD_HOEHE Pixel). Spielplan und Online-Brett zeichnen die
# Insel nicht mehr geometrisch aus (q, r), sondern legen dieses Bild als
# Hintergrund und platzieren jede Station exakt auf ihre passende Stelle
# darauf (Werkstatt-Zelt, Ruine, Vulkan, Wald, ...).
BILD_BREITE, BILD_HOEHE = 1536, 1024

FELDER = [
    # Mitte
    {"q":  0, "r":  0, "typ": "grruine", "fundkarten": 8, "bx":  770, "by": 490},

    # Innerer Ring (6 Felder, alle grenzen an die Große Ruine)
    {"q":  1, "r": -1, "typ": "energie", "bx": 1195, "by":  90},
    {"q":  1, "r":  0, "typ": "wald", "bx": 1030, "by": 460},
    {"q":  0, "r":  1, "typ": "mine", "bx":  870, "by": 650},
    {"q": -1, "r":  1, "typ": "ruine", "fundkarten": 4, "bx":  560, "by": 545},
    {"q": -1, "r":  0, "typ": "wald", "bx":  650, "by": 460},
    {"q":  0, "r": -1, "typ": "mine", "bx":  960, "by": 290},

    # Äußerer Ring (12 Felder, darunter die 4 Startwerkstätten)
    {"q":  2, "r": -2, "typ": "werkstatt", "spieler": 0, "bx": 1135, "by": 155},
    {"q":  2, "r": -1, "typ": "kueste", "bx": 1380, "by": 680},
    {"q":  2, "r":  0, "typ": "mine", "bx": 1300, "by": 430},
    {"q":  1, "r":  1, "typ": "werkstatt", "spieler": 1, "bx": 1245, "by": 617},
    {"q":  0, "r":  2, "typ": "brachland", "bx": 1000, "by": 640},
    {"q": -1, "r":  2, "typ": "energie", "bx":  800, "by": 760},
    {"q": -2, "r":  2, "typ": "werkstatt", "spieler": 2, "bx":  510, "by": 175},
    {"q": -2, "r":  1, "typ": "kueste", "bx":  220, "by": 340},
    {"q": -2, "r":  0, "typ": "brachland", "bx":  250, "by": 620},
    {"q": -1, "r": -1, "typ": "werkstatt", "spieler": 3, "bx":  480, "by": 760},
    {"q":  0, "r": -2, "typ": "wald", "bx":  700, "by": 150},
    {"q":  1, "r": -2, "typ": "ruine", "fundkarten": 4, "bx":  830, "by": 140},
]

# --------------------------------------------------------- Erfindungskarten
# kosten: Dict Ressource -> Anzahl | punkte: Siegpunkte | text: Fähigkeit

ERFINDUNGEN = [
    # ----- Stufe I: kleine Erfindungen (8 Karten)
    {"stufe": 1, "emoji": "\U0001FA93", "id": "holzfaelleraxt", "name": "Holzfäller-Axt",
     "kosten": {HOLZ: 2, METALL: 1}, "punkte": 3,
     "text": "Wenn du im \U0001F332 Wald sammelst, bekommst du 1 \U0001FAB5 Holz extra."},
    {"stufe": 1, "emoji": "\U0001FAA3", "id": "regenfaenger", "name": "Regenfänger",
     "kosten": {HOLZ: 1, METALL: 1, WASSER: 1}, "punkte": 3,
     "text": "Wenn du an der \U0001F30A Küste sammelst, bekommst du 1 \U0001F4A7 Wasser extra."},
    {"stufe": 1, "emoji": "\U0001F6D2", "id": "schubkarre", "name": "Schubkarre",
     "kosten": {HOLZ: 2}, "punkte": 3,
     "text": "Dein Lager fasst 4 Ressourcen mehr (also 14 statt 10)."},
    {"stufe": 1, "emoji": "\U0001F526", "id": "taschenlampe", "name": "Taschenlampe",
     "kosten": {METALL: 1, ENERGIE: 1}, "punkte": 4,
     "text": "Wenn du eine Ruine untersuchst, ziehe 2 Fundkarten und behalte 1. Die andere kommt zurück unter den Stapel."},
    {"stufe": 1, "emoji": "\U0001FA9C", "id": "strickleiter", "name": "Strickleiter",
     "kosten": {HOLZ: 3}, "punkte": 3,
     "text": "Einmal pro Runde: Bewege dich 1 Feld weit, ohne einen Aktionspunkt zu bezahlen."},
    {"stufe": 1, "emoji": "⛏️", "id": "spitzhacke", "name": "Spitzhacke",
     "kosten": {HOLZ: 1, METALL: 2}, "punkte": 4,
     "text": "Wenn du in der ⛏️ Mine sammelst, bekommst du 1 ⚙️ Metall extra."},
    {"stufe": 1, "emoji": "\U0001F525", "id": "lagerfeuer", "name": "Lagerfeuer",
     "kosten": {HOLZ: 2, WASSER: 1}, "punkte": 3,
     "text": "Einmal pro Runde: Tausche 2 gleiche Ressourcen gegen 1 beliebige. Das kostet keine Aktion."},
    {"stufe": 1, "emoji": "\U0001F4EF", "id": "signalhorn", "name": "Signalhorn",
     "kosten": {HOLZ: 1, METALL: 1, WASSER: 1}, "punkte": 4,
     "text": "Handeln kostet dich keinen Aktionspunkt mehr."},

    # ----- Stufe II: richtige Maschinen (10 Karten)
    {"stufe": 2, "emoji": "\U0001F681", "id": "miniflugmaschine", "name": "Mini-Flugmaschine",
     "kosten": {METALL: 2, ENERGIE: 1, HOLZ: 1}, "punkte": 6,
     "text": "Einmal pro Runde: Fliege für 1 Aktionspunkt auf ein beliebiges Feld der Insel."},
    {"stufe": 2, "emoji": "\U0001F916", "id": "roboterhelfer", "name": "Roboter-Helfer",
     "kosten": {METALL: 3, ENERGIE: 1}, "punkte": 5,
     "text": "Einmal pro Runde: Beim Sammeln bekommst du 1 zusätzliche Ressource des Feldes."},
    {"stufe": 2, "emoji": "\U0001F4A7", "id": "wasserrecycling", "name": "Wasser-Recyclingmaschine",
     "kosten": {METALL: 2, WASSER: 2}, "punkte": 4,
     "text": "Am Spielende: Jedes \U0001F4A7 Wasser in deinem Lager ist 1 Punkt wert."},
    {"stufe": 2, "emoji": "\U0001F52D", "id": "aussichtsturm", "name": "Aussichtsturm",
     "kosten": {HOLZ: 3, METALL: 1}, "punkte": 5,
     "text": "Wenn du sammelst, darfst du stattdessen von einem angrenzenden Feld sammeln."},
    {"stufe": 2, "emoji": "\U0001F6F6", "id": "auslegerboot", "name": "Auslegerboot",
     "kosten": {HOLZ: 3, WASSER: 1}, "punkte": 5,
     "text": "Einmal pro Runde: Fahre für 1 Aktionspunkt auf ein beliebiges \U0001F30A Küstenfeld."},
    {"stufe": 2, "emoji": "\U0001F50C", "id": "energiespeicher", "name": "Energiespeicher",
     "kosten": {METALL: 2, ENERGIE: 1}, "punkte": 5,
     "text": "Am Spielende: Jede ⚡ Energie in deinem Lager ist 2 Punkte wert."},
    {"stufe": 2, "emoji": "\U0001F9F2", "id": "magnetkran", "name": "Magnetkran",
     "kosten": {METALL: 3, HOLZ: 1}, "punkte": 6,
     "text": "Einmal pro Runde: Sammle, ohne einen Aktionspunkt zu bezahlen."},
    {"stufe": 2, "emoji": "\U0001F9EA", "id": "feldlabor", "name": "Feldlabor",
     "kosten": {METALL: 2, WASSER: 1, ENERGIE: 1}, "punkte": 6,
     "text": "Sofort: Ziehe 1 Forschungsauftrag. Außerdem einmal pro Runde: Tausche 1 Ressource gegen 1 andere, ohne Aktion."},
    {"stufe": 2, "emoji": "⚗️", "id": "destillieranlage", "name": "Destillieranlage",
     "kosten": {METALL: 2, WASSER: 2, ENERGIE: 1}, "punkte": 7,
     "text": "Einmal pro Runde für 1 Aktionspunkt: Tausche 3 \U0001F4A7 Wasser gegen 1 \U0001F48E seltenes Bauteil."},
    {"stufe": 2, "emoji": "\U0001F3D7️", "id": "hebekran", "name": "Hebekran",
     "kosten": {HOLZ: 2, METALL: 2}, "punkte": 5,
     "text": "Erfindungen bauen kostet dich nur noch 1 Aktionspunkt statt 2."},

    # ----- Stufe III: Super-Erfindungen (6 Karten)
    {"stufe": 3, "emoji": "⚡", "id": "supergenerator", "name": "Supergenerator",
     "kosten": {METALL: 2, ENERGIE: 2, BAUTEIL: 1}, "punkte": 10,
     "text": "Keine Fähigkeit – dafür besonders viele Punkte."},
    {"stufe": 3, "emoji": "\U0001F6F8", "id": "luftschiff", "name": "Luftschiff",
     "kosten": {HOLZ: 3, METALL: 2, ENERGIE: 1}, "punkte": 9,
     "text": "Bewegung kostet dich ab jetzt nie mehr einen Aktionspunkt."},
    {"stufe": 3, "emoji": "\U0001F4E1", "id": "ruinenscanner", "name": "Ruinen-Scanner",
     "kosten": {METALL: 2, ENERGIE: 2, BAUTEIL: 1}, "punkte": 9,
     "text": "Einmal pro Runde: Untersuche eine Ruine, ohne einen Aktionspunkt zu bezahlen."},
    {"stufe": 3, "emoji": "\U0001F309", "id": "grossebruecke", "name": "Große Brücke",
     "kosten": {HOLZ: 4, METALL: 2}, "punkte": 7,
     "text": "Am Spielende: +1 Punkt für jede Erfindung, die du gebaut hast (diese mitgezählt)."},
    {"stufe": 3, "emoji": "\U0001F3ED", "id": "automatikfabrik", "name": "Automatik-Fabrik",
     "kosten": {METALL: 3, ENERGIE: 2, BAUTEIL: 1}, "punkte": 11,
     "text": "Zu Beginn jeder Runde: Nimm 1 beliebige Ressource aus dem Vorrat."},
    {"stufe": 3, "emoji": "\U0001F5FC", "id": "leuchtturm", "name": "Leuchtturm der Erfinder",
     "kosten": {HOLZ: 2, METALL: 2, WASSER: 2, ENERGIE: 1}, "punkte": 12,
     "text": "Am Spielende: Jedes übrige \U0001F48E seltene Bauteil zählt 4 statt 2 Punkte."},
]

# ------------------------------------------------------------ Ereigniskarten

EREIGNISSE = [
    {"emoji": "\U0001F32A️", "id": "tropensturm", "name": "Tropensturm",
     "text": "Nächste Runde: Jede Bewegung kostet 1 Aktionspunkt mehr.", "art": "schlecht"},
    {"emoji": "\U0001F4A1", "id": "geistesblitz", "name": "Geistesblitz",
     "text": "Nächste Runde: Jede Erfindung kostet 1 Ressource weniger (du suchst aus welche).", "art": "gut"},
    {"emoji": "\U0001F412", "id": "neugierigeaffen", "name": "Neugierige Affen",
     "text": "Jeder Spieler verliert sofort 1 Ressource seiner Wahl.", "art": "schlecht"},
    {"emoji": "\U0001F30B", "id": "inselbebt", "name": "Die Insel bebt",
     "text": "Der Startspieler wählt 1 Feld (keine Werkstatt). Nächste Runde darf niemand darauf ziehen. Figuren, die dort stehen, dürfen bleiben.", "art": "schlecht"},
    {"emoji": "\U0001F327️", "id": "regenzeit", "name": "Regenzeit",
     "text": "Jeder Spieler nimmt 1 \U0001F4A7 Wasser aus dem Vorrat.", "art": "gut"},
    {"emoji": "☀️", "id": "sonnensturm", "name": "Sonnensturm",
     "text": "Jeder Spieler auf einem ⚡ Energiefeld nimmt 1 ⚡ Energie. Alle anderen verlieren 1 ⚡ Energie, falls sie welche haben.", "art": "gemischt"},
    {"emoji": "\U0001F99C", "id": "buntevoegel", "name": "Bunte Vögel",
     "text": "Nächste Runde: Jedes Sammeln bringt für alle 1 Ressource extra.", "art": "gut"},
    {"emoji": "\U0001F30A", "id": "flut", "name": "Flut",
     "text": "Nächste Runde sind alle \U0001F30A Küstenfelder gesperrt. Figuren, die dort stehen, müssen als erste Aktion wegziehen.", "art": "schlecht"},
    {"emoji": "\U0001F525", "id": "waldbrand", "name": "Waldbrand",
     "text": "Nächste Runde kann im \U0001F332 Wald nicht gesammelt werden.", "art": "schlecht"},
    {"emoji": "\U0001F381", "id": "strandgut", "name": "Strandgut",
     "text": "Jeder Spieler, dessen Figur an der \U0001F30A Küste steht, nimmt 2 beliebige Ressourcen.", "art": "gut"},
    {"emoji": "\U0001F91D", "id": "erfinderkongress", "name": "Erfinderkongress",
     "text": "Nächste Runde kostet Handeln für alle keinen Aktionspunkt.", "art": "gut"},
    {"emoji": "\U0001F319", "id": "sternenklarenacht", "name": "Sternenklare Nacht",
     "text": "Nächste Runde hat jeder Spieler 4 Aktionspunkte statt 3.", "art": "gut"},
]

# --------------------------------------------------------------- Inselkarten

INSELKARTEN = [
    {"emoji": "⚡", "id": "neueenergiequelle", "name": "Neue Energiequelle entdeckt!",
     "text": "Lege das ⚡ Insel-Plättchen auf ein \U0001F3DC️ Brachland. Dort kann ab jetzt Energie gesammelt werden."},
    {"emoji": "\U0001F3DB️", "id": "verschuetteteruine", "name": "Verschüttete Ruine freigelegt!",
     "text": "Lege das \U0001F3DB️ Insel-Plättchen auf ein \U0001F3DC️ Brachland und 3 Fundmarken darauf."},
    {"emoji": "⛏️", "id": "minebrichtein", "name": "Die Mine bricht ein!",
     "text": "Lege das ⚠️ Plättchen auf ein ⛏️ Minenfeld. Dort kann nicht mehr gesammelt werden – dafür liegen jetzt 3 Fundmarken darauf – die Ruine kann untersucht werden."},
    {"emoji": "\U0001F332", "id": "waldwaechst", "name": "Der Wald wächst",
     "text": "Lege das \U0001F332 Insel-Plättchen auf ein \U0001F3DC️ Brachland. Dort kann ab jetzt Holz gesammelt werden."},
    {"emoji": "\U0001F30A", "id": "wasserspiegelsteigt", "name": "Der Wasserspiegel steigt",
     "text": "Lege das \U0001F30A Insel-Plättchen auf ein beliebiges Randfeld (keine Werkstatt). Es ist ab jetzt Küste."},
    {"emoji": "\U0001F309", "id": "bruecke", "name": "Brücke über die Schlucht",
     "text": "Lege das \U0001F309 Plättchen zwischen die Große Ruine und ein beliebiges Werkstattfeld. Diese beiden Felder sind ab jetzt für alle benachbart."},
    {"emoji": "\U0001F344", "id": "leuchtpilze", "name": "Leuchtpilze",
     "text": "Lege auf jedes \U0001F3DB️ Ruinenfeld (auch die Große Ruine) 2 zusätzliche Fundkarten."},
    {"emoji": "\U0001F33A", "id": "fruchtbareerde", "name": "Fruchtbare Erde",
     "text": "Ab jetzt bringt Sammeln im \U0001F332 Wald und an der \U0001F30A Küste für alle Spieler 1 Ressource extra."},
]

# --------------------------------------------------------------- Fundkarten
# anzahl = wie oft diese Karte im Stapel liegt

FUNDKARTEN = [
    {"id": "fundbauteil", "emoji": "\U0001F48E", "name": "Seltenes Bauteil", "anzahl": 8,
     "text": "Nimm 1 \U0001F48E seltenes Bauteil."},
    {"emoji": "\U0001F48E\U0001F48E", "id": "reicherfund", "name": "Reicher Fund", "anzahl": 3,
     "text": "Nimm 2 \U0001F48E seltene Bauteile."},
    {"emoji": "\U0001F4E6", "id": "vorratskiste", "name": "Alte Vorratskiste", "anzahl": 4,
     "text": "Nimm 2 beliebige Ressourcen (kein Bauteil)."},
    {"emoji": "\U0001F5FA️", "id": "verwitterte", "name": "Verwitterte Karte", "anzahl": 2,
     "text": "Nimm 1 beliebige Ressource und ziehe 1 Forschungsauftrag."},
    {"emoji": "\U0001F9ED", "id": "reliktkompass", "name": "Relikt: Alter Kompass", "anzahl": 1, "relikt": True,
     "text": "Behalte diese Karte offen. Deine erste Bewegung in jeder Runde kostet keinen Aktionspunkt."},
    {"emoji": "\U0001F50B", "id": "reliktbatterie", "name": "Relikt: Ewige Batterie", "anzahl": 1, "relikt": True,
     "text": "Behalte diese Karte offen. Einmal pro Runde bekommst du beim Sammeln zusätzlich 1 ⚡ Energie."},
    {"emoji": "\U0001F5FF", "id": "reliktwaechter", "name": "Relikt: Steinerner Wächter", "anzahl": 1, "relikt": True,
     "text": "Behalte diese Karte offen. Am Spielende bekommst du +4 Punkte."},
]

# -------------------------------------------------------- Forschungsauftraege

FORSCHUNGSAUFTRAEGE = [
    {"emoji": "\U0001FAB5", "id": "holzsammler", "name": "Holzsammler",  "punkte": 3, "text": "Du hast am Spielende mindestens 4 \U0001FAB5 Holz im Lager."},
    {"emoji": "⚙️", "id": "metallhaendler", "name": "Metallhändler","punkte": 3, "text": "Du hast am Spielende mindestens 4 ⚙️ Metall im Lager."},
    {"emoji": "\U0001F4A7", "id": "wassertraeger", "name": "Wasserträger", "punkte": 3, "text": "Du hast am Spielende mindestens 4 \U0001F4A7 Wasser im Lager."},
    {"emoji": "⚡", "id": "energiebuendel", "name": "Energiebündel",   "punkte": 4, "text": "Du hast am Spielende mindestens 3 ⚡ Energie im Lager."},
    {"emoji": "\U0001F48E", "id": "schatzsucher", "name": "Schatzsucher",  "punkte": 4, "text": "Du hast am Spielende mindestens 2 \U0001F48E seltene Bauteile im Lager."},
    {"emoji": "\U0001F9ED", "id": "weltenbummler", "name": "Weltenbummler", "punkte": 4, "text": "Deine Figur stand im Lauf des Spiels auf jeder Geländeart: \U0001F332 ⛏️ \U0001F30A ⚡ \U0001F3DB️ (Haken auf dem Werkstatt-Tableau machen!)."},
    {"emoji": "\U0001F528", "id": "baumeister", "name": "Baumeister",    "punkte": 4, "text": "Du hast mindestens 3 Erfindungen gebaut."},
    {"emoji": "\U0001F393", "id": "grossmeister", "name": "Großmeister",  "punkte": 5, "text": "Du hast mindestens 1 Erfindung der Stufe III gebaut."},
    {"emoji": "\U0001F3DB️", "id": "ruinenforscher", "name": "Ruinenforscher", "punkte": 4, "text": "Du hast mindestens 4-mal eine Ruine untersucht."},
    {"emoji": "\U0001F91D", "id": "haendler", "name": "Händler",      "punkte": 3, "text": "Du hast mindestens 3-mal mit anderen Spielern gehandelt."},
    {"emoji": "\U0001F6E0️", "id": "heimwerker", "name": "Heimwerker","punkte": 3, "text": "Du hast mindestens 2 Erfindungen der Stufe I gebaut."},
    {"emoji": "\U0001F4E6", "id": "sparfuchs", "name": "Sparfuchs",     "punkte": 4, "text": "Du hast am Spielende mindestens 8 Ressourcen im Lager."},
]

# ---------------------------------------------------------------- Bonusziele

BONUSZIELE = [
    {"emoji": "⚙️", "id": "meistermaschinen", "name": "Meister der Maschinen", "punkte": 5, "text": "Du hast mindestens 3 verschiedene Erfindungen gebaut."},
    {"emoji": "\U0001F308", "id": "vielfalt", "name": "Vielfalt",       "punkte": 5, "text": "Du hast am Spielende von jeder Art mindestens 1: \U0001FAB5 ⚙️ \U0001F4A7 ⚡ \U0001F48E"},
    {"emoji": "\U0001F50D", "id": "entdecker", "name": "Entdecker",      "punkte": 4, "text": "Du hast die meisten \U0001F48E seltenen Bauteile gefunden (verbaute zählen mit). Bei Gleichstand bekommen alle die Punkte."},
    {"emoji": "\U0001F3C1", "id": "schnellbauer", "name": "Schnellbauer",   "punkte": 4, "text": "Du hast als Erster eine Erfindung der Stufe III gebaut. Nur ein Spieler bekommt das."},
    {"emoji": "⚡", "id": "energiemeister", "name": "Energiemeister",     "punkte": 4, "text": "Du hast mindestens 2 Erfindungen gebaut, die ⚡ Energie gekostet haben."},
    {"emoji": "\U0001F91D", "id": "guternachbar", "name": "Guter Nachbar",  "punkte": 4, "text": "Du hast mindestens 3-mal mit anderen Spielern gehandelt."},
    {"emoji": "\U0001F3E0", "id": "heimatverbunden", "name": "Heimatverbunden","punkte": 3, "text": "Deine Figur steht am Spielende auf deinem eigenen Werkstattfeld."},
    {"emoji": "\U0001F41D", "id": "fleissig", "name": "Fleißig",       "punkte": 6, "text": "Du hast mindestens 5 Erfindungen gebaut."},
    {"emoji": "\U0001F332", "id": "holzhuette", "name": "Holzhütte",     "punkte": 4, "text": "Du hast mindestens 3 Erfindungen gebaut, die \U0001FAB5 Holz gekostet haben."},
    {"emoji": "\U0001F30A", "id": "kuestenbewohner", "name": "Küstenbewohner","punkte": 4, "text": "Du hast am Spielende mindestens 5 \U0001F4A7 Wasser im Lager."},
]

# ------------------------------------------------------------- Insel-Plättchen

INSELPLAETTCHEN = [
    {"emoji": "⚡", "name": "Energiequelle", "karte": "Neue Energiequelle entdeckt!", "gelaende": "energie"},
    {"emoji": "\U0001F3DB️", "name": "Ruine", "karte": "Verschüttete Ruine freigelegt!", "gelaende": "ruine"},
    {"emoji": "\U0001F332", "name": "Wald", "karte": "Der Wald wächst", "gelaende": "wald"},
    {"emoji": "\U0001F30A", "name": "Küste", "karte": "Der Wasserspiegel steigt", "gelaende": "kueste"},
    {"emoji": "⚠️", "name": "Eingestürzt", "karte": "Die Mine bricht ein!", "gelaende": "ruine"},
    {"emoji": "\U0001F309", "name": "Brücke", "karte": "Brücke über die Schlucht", "gelaende": None},
]

RUNDEN = 8
AKTIONSPUNKTE = 3
LAGERLIMIT = 10
