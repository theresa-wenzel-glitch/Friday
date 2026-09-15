# -*- coding: utf-8 -*-
"""Prüft, ob alle vier Startwerkstätten fair liegen."""
import sys, collections
sys.path.insert(0, ".")
import daten as D

RICHTUNGEN = [(1,0),(-1,0),(0,1),(0,-1),(1,-1),(-1,1)]

def pruefe(felder=None, still=False):
    felder = felder or D.FELDER
    karte = {(f["q"], f["r"]): f for f in felder}

    def nachbarn(p):
        return [karte[(p[0]+dq, p[1]+dr)] for dq, dr in RICHTUNGEN
                if (p[0]+dq, p[1]+dr) in karte]

    def entfernung(start, treffer):
        gesehen, rand, d = {start}, [start], 0
        while rand:
            for p in rand:
                if treffer(karte[p]):
                    return d
            neu = []
            for p in rand:
                for dq, dr in RICHTUNGEN:
                    n = (p[0]+dq, p[1]+dr)
                    if n in karte and n not in gesehen:
                        gesehen.add(n); neu.append(n)
            rand, d = neu, d + 1
        return 99

    werkstaetten = [f for f in felder if f["typ"] == "werkstatt"]
    werkstaetten.sort(key=lambda f: f["spieler"])
    zeilen, punkte = [], []
    for w in werkstaetten:
        name = D.SPIELERFARBEN[w["spieler"]]["name"]
        p = (w["q"], w["r"])
        nb = nachbarn(p)
        produzierend = [n for n in nb if D.GELAENDE[n["typ"]]["gibt"]]
        dist = {}
        for typ in ("wald", "mine", "kueste", "energie"):
            dist[typ] = entfernung(p, lambda f, t=typ: f["typ"] == t)
        dist["ruine"] = entfernung(p, lambda f: f["typ"] in ("ruine", "grruine"))
        dist["mitte"] = entfernung(p, lambda f: f["typ"] == "grruine")
        summe = sum(dist[t] for t in ("wald","mine","kueste","energie"))
        punkte.append((len(produzierend), summe, dist["ruine"], dist["mitte"]))
        zeilen.append("%-6s Nachbarn: %-42s | produzierend: %d | Wege W/M/K/E: %d/%d/%d/%d (Summe %d) | Ruine %d | Mitte %d"
                      % (name, ", ".join(D.GELAENDE[n["typ"]]["name"] for n in nb),
                         len(produzierend), dist["wald"], dist["mine"], dist["kueste"],
                         dist["energie"], summe, dist["ruine"], dist["mitte"]))
    if not still:
        print("\n".join(zeilen))
        pr = [x[0] for x in punkte]; su = [x[1] for x in punkte]; ru = [x[2] for x in punkte]
        print()
        print("Spanne produzierende Nachbarn: %d-%d   Spanne Wegesumme: %d-%d   Spanne Ruinenweg: %d-%d"
              % (min(pr), max(pr), min(su), max(su), min(ru), max(ru)))
        c = collections.Counter(f["typ"] for f in felder)
        print("Felder:", dict(c))
    return punkte

if __name__ == "__main__":
    pruefe()
