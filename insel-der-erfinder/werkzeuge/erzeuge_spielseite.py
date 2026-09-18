# -*- coding: utf-8 -*-
"""Baut das Online-Spiel 'Insel der Erfinder' aus vier Bausteinen zusammen:

  spiel/daten.json      Spieldaten (aus daten.py exportiert)
  werkzeuge/motor.js    Die Spiel-Engine (reiner Reducer)
  werkzeuge/app.js      Die Oberfläche
  werkzeuge/spiel_stil.css   Das Aussehen

Ergebnis: insel-der-erfinder/online-spiel.html — eine einzige Datei.

    python3 werkzeuge/erzeuge_spielseite.py
"""
import os, sys, io, base64

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
WURZEL = os.path.dirname(HIER)

import exportiere_json


def lese(pfad):
    return io.open(pfad, encoding="utf-8").read()


def baue():
    daten = exportiere_json.schreibe_json()
    import json
    daten_json = json.dumps(daten, ensure_ascii=False).replace("</", "<\\/")

    schale = lese(os.path.join(HIER, "spiel_schale.html"))
    stil = lese(os.path.join(HIER, "spiel_stil.css"))
    motor = lese(os.path.join(HIER, "motor.js"))
    app = lese(os.path.join(HIER, "app.js"))
    with open(os.path.join(HIER, "artwork", "inselkarte.jpg"), "rb") as bilddatei:
        inselbild = "data:image/jpeg;base64," + base64.b64encode(bilddatei.read()).decode("ascii")

    seite = (schale
             .replace("{{STIL}}", stil)
             .replace("{{SPIELDATEN_JSON}}", daten_json)
             .replace("{{INSELBILD_DATENURL}}", inselbild)
             .replace("{{MOTOR_JS}}", motor)
             .replace("{{APP_JS}}", app))

    ziel = os.path.join(WURZEL, "online-spiel.html")
    io.open(ziel, "w", encoding="utf-8").write(seite)
    print("geschrieben: online-spiel.html (%d KB)" % (len(seite.encode("utf-8")) // 1024))
    return ziel


if __name__ == "__main__":
    baue()
