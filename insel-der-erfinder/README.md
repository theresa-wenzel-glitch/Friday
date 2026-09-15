# 🏝️ Insel der Erfinder

Ein komplettes Brettspiel zum Selbstausdrucken: Spielplan, Anleitung,
Spielfiguren, 86 Karten, Tableaus und Marker.

**2–4 Spieler · ab 10 Jahren · 45–60 Minuten**

---

## 📕 Der einfachste Weg: ein einziges PDF

**[→ Insel-der-Erfinder-komplett.pdf](Insel-der-Erfinder-komplett.pdf)** –
52 Seiten, alles drin, mit Deckblatt, Inhaltsverzeichnis und Bastelanleitung.
Einmal ausdrucken und loslegen.

Achte im Druckfenster nur auf zwei Dinge:

> 1. Skalierung auf **100 %** bzw. „Tatsächliche Größe" – *nicht* „An Seite anpassen".
> 2. **„Hintergrundgrafiken drucken"** anhaken, sonst fehlen alle Farben.

Den Rest dieser Seite brauchst du nur, wenn du einzelne Teile nachdrucken
oder selbst etwas am Spiel ändern willst.

---

## 🖨️ Einzeln drucken

Alle Dateien liegen im Ordner **`druckvorlagen/`**. Du öffnest sie mit einem
**Doppelklick** – sie gehen im Browser auf. Dann **Strg + P** (Mac: **Cmd + P**)
zum Drucken.

> **Die zwei wichtigsten Einstellungen im Druckfenster:**
> 1. Skalierung auf **100 %** bzw. „Tatsächliche Größe" – *nicht* „An Seite anpassen".
> 2. **„Hintergrundgrafiken drucken"** anhaken, sonst fehlen alle Farben.

| Reihenfolge | Datei | Seiten | Papier |
|---|---|---|---|
| 1 | `spielplan.html` | 2 (zusammenkleben) | so fest wie möglich |
| 2 | `anleitung.html` | 13 | normal |
| 3 | `erfindungskarten.html` | 8 | 200 g |
| 4 | `fundkarten.html` | 6 | 200 g |
| 5 | `ereigniskarten.html` | 4 | 200 g |
| 6 | `forschungsauftraege.html` | 4 | 200 g |
| 7 | `inselkarten.html` | 2 | 200 g |
| 8 | `bonusziele.html` | 2 | 200 g |
| 9 | `spielfiguren.html` | 1 | 160–250 g |
| 10 | `werkstatt-tableaus.html` | 2 | normal |
| 11 | `insel-plaettchen.html` | 1 | 200 g |
| 12 | `marker.html` | 2 | normal |
| 13 | `wertungsblock.html` | 2 | normal |
| – | `spielplan-klein.html` | 1 (A4 **quer**) | optional, kleine Fassung |

**Es eilt?** Für eine erste Testpartie reichen `spielplan.html`,
`anleitung.html`, `erfindungskarten.html`, `spielfiguren.html` und
`werkstatt-tableaus.html`. Als Rohstoffe nimmst du erst mal getrocknete
Bohnen, Perlen, Münzen oder Lego-Steine.

### Karten-Rückseiten

Bei den Kartendateien folgt auf jede Vorderseite die passende Rückseite.
Kann dein Drucker **beidseitig**? Dann „Beidseitig / lange Seite" einstellen –
es passt von allein, weil alle Rückseiten gleich aussehen. Kann er das nicht?
Dann drucke einfach nur die ungeraden Seiten (1, 3, 5 …); auf festem Papier
sieht man nichts durch.

### Der Spielplan besteht aus zwei Seiten

Zusammengeklebt wird er etwa **38 × 28 cm** groß – ein Feld misst dann gut
**4,5 cm**, da haben Figur und Marker bequem Platz.

1. Beide Seiten ausdrucken.
2. Bei **einer** Seite den weißen Rand an der Kante mit der Aufschrift
   „KLEBEKANTE" abschneiden.
3. Die Hälften bündig aneinanderlegen – Rahmen und Rundenleiste müssen
   durchlaufen – und auf der **Rückseite** mit Klebeband verbinden.

Wer einen A3-Drucker oder einen Copyshop in der Nähe hat, bekommt den Plan
dort auf ein einziges Blatt.

**Lieber kleiner?** `spielplan-klein.html` passt auf eine einzige A4-Seite
quer. Dann musst du aber `insel-plaettchen.html` auf **70 %** verkleinern,
sonst passen die Plättchen nicht auf die Felder.

---

## 📦 Das ist alles drin

- 1 Spielplan mit 19 Feldern
- 4 Spielfiguren zum Falten (plus 4 Ersatzfiguren)
- 4 Werkstatt-Tableaus
- 24 Erfindungskarten in drei Stufen
- 20 Fundkarten · 12 Ereigniskarten · 8 Inselkarten
- 12 Forschungsaufträge · 10 Bonusziele
- 207 runde Marker · 6 Insel-Plättchen
- 1 Wertungsblock

**[→ Hier geht's zur kompletten Spielanleitung](ANLEITUNG.md)**

---

## 🔧 Du willst etwas am Spiel ändern?

Musst du nicht programmieren können. Alles, was das Spiel ausmacht, steht in
zwei gut lesbaren Dateien:

| Datei | Was drinsteht |
|---|---|
| `werkzeuge/daten.py` | Karten, Kosten, Punkte, Felder, Farben |
| `werkzeuge/regeln.py` | der gesamte Regeltext |

**So geht's:**

1. Datei mit einem Texteditor öffnen.
2. Ändern, was du willst – zum Beispiel bei der Holzfäller-Axt
   `"punkte": 3` auf `"punkte": 4` setzen.
3. Speichern.
4. Ein Terminal im Ordner `insel-der-erfinder` öffnen und eintippen:

```
python3 werkzeuge/erzeuge.py
```

Fertig. Alle Druckvorlagen sind neu gebaut – die Karte, die Anleitung und die
Kartenübersicht im Anhang stimmen automatisch wieder überein. Du musst nie
etwas an zwei Stellen ändern.

> Willst du danach auch das Gesamt-PDF und die Webseite neu haben, lass noch
> `python3 werkzeuge/erzeuge_webseite.py` und `python3 werkzeuge/erzeuge_pdf.py` laufen.

### Neue Erfindung erfinden

In `werkzeuge/daten.py` bei `ERFINDUNGEN` eine Zeile dazuschreiben, zum
Beispiel:

```python
{"stufe": 2, "emoji": "🎈", "name": "Heißluftballon",
 "kosten": {HOLZ: 2, ENERGIE: 1}, "punkte": 5,
 "text": "Einmal pro Runde: Bewege dich 2 Felder für 1 Aktionspunkt."},
```

Dann wieder `python3 werkzeuge/erzeuge.py` starten. Die Karte ist sofort dabei.

### Bleibt die Insel fair?

Wenn du am Spielplan (`FELDER` in `daten.py`) etwas änderst, prüfe mit:

```
python3 werkzeuge/pruefe_balance.py
```

Das zeigt dir für jeden Spieler, wie weit er zu jedem Rohstoff laufen muss.
Bei der mitgelieferten Insel ist diese Summe für **alle vier Spieler gleich 6** –
niemand ist benachteiligt.

---

## 📁 Ordner

```
insel-der-erfinder/
├── README.md                          ← diese Datei
├── ANLEITUNG.md                       ← die Spielanleitung zum Lesen
├── Insel-der-Erfinder-komplett.pdf    ← alles in einem PDF
├── webseite.html                      ← Online-Fassung zum Nachschlagen
├── druckvorlagen/                     ← alles einzeln zum Ausdrucken
└── werkzeuge/
    ├── daten.py           ← Karten, Felder, Zahlen
    ├── regeln.py          ← Regeltext
    ├── erzeuge.py         ← baut die Druckvorlagen
    ├── erzeuge_webseite.py← baut die Online-Fassung
    ├── erzeuge_pdf.py     ← fügt alles zu einem PDF zusammen (optional)
    └── pruefe_balance.py  ← prüft die Ausgewogenheit der Insel
```

Für die Druckvorlagen brauchst du nur **Python 3** – sonst nichts.

Das Gesamt-PDF neu bauen geht nur, wenn zusätzlich **Chrome** installiert ist
und einmalig `pip install pypdf` gelaufen ist:

```
python3 werkzeuge/erzeuge_pdf.py
```

Das fertige PDF liegt aber schon dabei – du brauchst das nur, wenn du selbst
etwas geändert hast.
