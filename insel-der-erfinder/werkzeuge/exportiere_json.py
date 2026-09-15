# -*- coding: utf-8 -*-
"""Exportiert daten.py als JSON für das Online-Spiel.

daten.py bleibt die einzige Quelle für Inhalte (Karten, Kosten, Punkte,
Felder). Dieses Skript macht daraus eine Datenstruktur, die die
JavaScript-Engine (werkzeuge/motor.js) direkt einlesen kann - inklusive
der Nachbarschaftstabelle für den Spielplan, die hier einmal berechnet
wird, statt sie in JavaScript nachzubauen.

Wird von erzeuge_spielseite.py aufgerufen; kann aber auch einzeln
laufen, um spiel-daten.json zum Nachschauen zu erzeugen:

    python3 werkzeuge/exportiere_json.py
"""
import os, sys, json, io

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
WURZEL = os.path.dirname(HIER)

import daten as D

# Die sechs Richtungen auf einem achsialen Hex-Gitter.
RICHTUNGEN = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1)]


def feld_id(q, r):
    return "%d_%d" % (q, r)


def baue_daten():
    felder = []
    positionen = {}
    for f in D.FELDER:
        fid = feld_id(f["q"], f["r"])
        eintrag = {
            "id": fid, "q": f["q"], "r": f["r"], "typ": f["typ"],
            "fundmarken": f.get("fundkarten", 0),
        }
        if "spieler" in f:
            eintrag["spieler"] = D.SPIELERFARBEN[f["spieler"]]["key"]
        felder.append(eintrag)
        positionen[(f["q"], f["r"])] = fid

    nachbarn = {}
    for f in D.FELDER:
        fid = feld_id(f["q"], f["r"])
        eigene = []
        for dq, dr in RICHTUNGEN:
            p = (f["q"] + dq, f["r"] + dr)
            if p in positionen:
                eigene.append(positionen[p])
        nachbarn[fid] = eigene

    start_werkstatt = {}
    for f in D.FELDER:
        if f["typ"] == "werkstatt":
            start_werkstatt[D.SPIELERFARBEN[f["spieler"]]["key"]] = feld_id(f["q"], f["r"])

    def ohne_gibt(d):
        """RESSOURCEN-Farbwerte fürs Spielbrett, Konstantenname als Schlüssel."""
        return {k: {"name": v["name"], "emoji": v["emoji"], "farbe": v["farbe"], "hell": v["hell"]}
                for k, v in d.items()}

    daten = {
        "version": 1,
        "regeln": {
            "runden": D.RUNDEN,
            "aktionspunkte": D.AKTIONSPUNKTE,
            "lagerlimit": D.LAGERLIMIT,
            "inselkartenRunden": [2, 4, 6],
        },
        "ressourcen": ohne_gibt(D.RESSOURCEN),
        "gelaende": {k: {"name": v["name"], "emoji": v["emoji"], "gibt": v["gibt"],
                        "fuell": v["fuell"], "rand": v["rand"]}
                    for k, v in D.GELAENDE.items()},
        "spielerfarben": [{"key": s["key"], "name": s["name"], "farbe": s["farbe"], "hell": s["hell"]}
                         for s in D.SPIELERFARBEN],
        "felder": felder,
        "nachbarn": nachbarn,
        "startWerkstatt": start_werkstatt,
        "grosseRuine": feld_id(0, 0),
        "erfindungen": [
            {"id": e["id"], "stufe": e["stufe"], "emoji": e["emoji"], "name": e["name"],
             "kosten": e["kosten"], "punkte": e["punkte"], "text": e["text"]}
            for e in D.ERFINDUNGEN
        ],
        "ereignisse": [
            {"id": e["id"], "emoji": e["emoji"], "name": e["name"], "text": e["text"], "art": e["art"]}
            for e in D.EREIGNISSE
        ],
        "inselkarten": [
            {"id": k["id"], "emoji": k["emoji"], "name": k["name"], "text": k["text"]}
            for k in D.INSELKARTEN
        ],
        "fundkarten": [
            {"id": f["id"], "emoji": f["emoji"], "name": f["name"], "anzahl": f["anzahl"],
             "text": f["text"], "relikt": f.get("relikt", False)}
            for f in D.FUNDKARTEN
        ],
        "auftraege": [
            {"id": a["id"], "emoji": a["emoji"], "name": a["name"], "punkte": a["punkte"], "text": a["text"]}
            for a in D.FORSCHUNGSAUFTRAEGE
        ],
        "bonusziele": [
            {"id": b["id"], "emoji": b["emoji"], "name": b["name"], "punkte": b["punkte"], "text": b["text"]}
            for b in D.BONUSZIELE
        ],
    }
    return daten


def schreibe_json(ziel=None):
    daten = baue_daten()
    ziel = ziel or os.path.join(WURZEL, "spiel", "daten.json")
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    text = json.dumps(daten, ensure_ascii=False, indent=2)
    io.open(ziel, "w", encoding="utf-8").write(text)
    print("geschrieben: %s (%d KB)" % (os.path.relpath(ziel, WURZEL), len(text.encode("utf-8")) // 1024))
    return daten


if __name__ == "__main__":
    schreibe_json()
