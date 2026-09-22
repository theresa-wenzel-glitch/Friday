# Auftragstext für den App-Builder

Diesen Text kannst du komplett kopieren und in einen App-Builder einfügen.
Gib nach Möglichkeit `tokens.json` und den Ordner `icons/` mit dazu.

---

## Auftrag

Erstelle eine moderne Mobile-App für Fußballprognosen und Tippligen, lauffähig auf
iOS und Android. Die App sagt Spielausgänge vorher und lässt Freundesgruppen
gegeneinander tippen. **Es wird kein Echtgeld eingesetzt, es werden keine Quoten
angezeigt und es wird keine Wettsprache verwendet.**

## Funktionen

1. **Spieltagsübersicht** mit Match-Cards: Anstoßzeit, beide Mannschaften, Form der
   letzten fünf Spiele als Kürzel (S / U / N), Status des eigenen Tipps.
2. **Tippabgabe** als Ergebnistipp (Tore Heim : Tore Gast), bis zum Anpfiff änderbar,
   danach gesperrt und für alle sichtbar.
3. **KI-Analyse** pro Spiel: Wahrscheinlichkeit für Heimsieg, Unentschieden und
   Auswärtssieg, dazu die wichtigsten Gründe in kurzen Sätzen (Form, erwartete Tore,
   Ausfälle, letzte Duelle) und eine Angabe, wie verlässlich die Schätzung ist.
   Jede Analyse trägt den Hinweis, dass sie eine Schätzung ist und keine Garantie.
4. **Spielerbasierte Prognosen nach Position**: Torwart, Abwehr, Mittelfeld, Angriff.
   Für Feldspieler die Wahrscheinlichkeit für Tor und Vorlage, für Torhüter die
   Wahrscheinlichkeit, ohne Gegentor zu bleiben.
5. **Punktesystem**, additiv und pro Spiel gedeckelt:
   - exaktes Ergebnis: 5 Punkte
   - richtige Tordifferenz: 3 Punkte
   - richtige Tendenz: 2 Punkte
   - Es zählt immer nur die beste erreichte Stufe, die drei addieren sich nicht.
   - Zusätzlich: richtiger Torschütze +2, richtiger Vorlagengeber +1.
6. **Tippligen**, privat und öffentlich. Private Ligen tritt man über einen
   sechsstelligen Code oder einen QR-Code bei. Jede Liga hat einen Gründer, der
   Mitglieder entfernen und die Liga öffentlich schalten kann.
7. **Einladung per QR-Code**: Code erzeugen, teilen, scannen. Der Beitrittscode ist
   zusätzlich als Text eintippbar, falls die Kamera nicht geht.
8. **Rangliste** je Liga: Platz, Name, Treffer, Punkte, Veränderung zum Vorspieltag.
   Der eigene Eintrag ist hervorgehoben.
9. **Ergebnisarchiv**: abgeschlossene Spieltage mit Endergebnis, eigenem Tipp und den
   dafür erhaltenen Punkten.
10. **Neutrale Textnamen**: Solange keine Lizenz für Wappen oder Fotos vorliegt, wird
    jede Mannschaft als neutraler Schild mit Kürzel plus ausgeschriebenem Namen
    dargestellt, jede Person als Initialen im Kreis. Keine fremden Logos, keine
    Trikotmuster, keine Spielerfotos.

## Aussehen

Verwende ausschließlich das beiliegende Designsystem. Erfinde keine eigenen Farben
und lade keine fremden Icon-Bibliotheken nach.

**Farben**

- Grund dunkel `#101A2B`, Karten dunkel `#18253A`, Linien dunkel `#24344C`
- Grund hell `#F5F7F2`, Karten hell `#FFFFFF`, Linien hell `#D5DBCE`
- Text dunkelmodus `#F5F7F2`, Text hellmodus `#101A2B`, Hilfstext `#8C9689`
- Akzent `#FF5A1F` (gedrückt `#E24610`) – nur für die jeweils wichtigste Aktion
- Sieg `#1F7A54`, Unentschieden `#E8A200`, Niederlage `#C8323B` – nur als Status,
  nie als Dekoration

Hell- und Dunkelmodus sind beide Pflicht und folgen der Systemeinstellung.

**Schrift**

- Überschriften und Spielstände: Oswald (Ersatz: Arial Narrow)
- Fließtext: Source Sans 3 (Ersatz: System-Schrift)
- Zahlen, Punkte, Prozentwerte: IBM Plex Mono, immer mit Tabellenziffern

**Form**

- Eckenradius 12 px für Flächen, 18 px für Karten, rund für Knöpfe
- Abstände im 4er-Raster: 4, 8, 12, 16, 24, 32, 48
- Karten tragen an der linken Kante einen 4 px breiten Statusstreifen:
  orange = Tipp offen, grün = Sieg, gelb = Unentschieden, rot = Niederlage
- Symbole: 24 × 24 px, 2 px Strich, runde Enden, Farbe immer `currentColor`

**Bildmarke**

Das Zeichen ist der Anstoßpunkt: Mittellinie, Mittelkreis, ein orangener Ball genau
auf der Linie. Es liegt als `app-icon.svg` bei. Der Splash Screen (`splash.svg`) zeigt
abstrahierte Flutlichtkegel über Kreidelinien. Zeichne beides nicht neu.

## Bedienbarkeit

- Jede Antippfläche mindestens 44 × 44 px.
- Farbe ist nie das einzige Signal: neben jedem farbigen Zustand steht ein Wort oder
  Kürzel.
- Alle Bilder und Symbole bekommen einen Alternativtext.
- Bewegungen respektieren die Systemeinstellung „Bewegung reduzieren“.
- Texte müssen bei größter Systemschriftgröße noch lesbar sein, ohne dass etwas
  abgeschnitten wird.

## Sprache und Ton

Deutsch, geduzt, kurz und konkret. Knöpfe sagen, was passiert („Tipp abgeben“, danach
„Tipp gespeichert“). Fehlermeldungen erklären, was schiefging und was zu tun ist.
Keine Werbesprache, keine Ausrufezeichen, keine Glücksspielbegriffe.

## Rechtliches

- Keine fremden Vereins-, Liga- oder Sponsorenlogos, auch nicht angedeutet.
- Keine Spielerfotos ohne Rechte.
- Spielpläne und Ergebnisse nur aus einer Datenquelle mit passender Lizenz.
- Kein Echtgeld, keine Quoten, keine Auszahlungen.
