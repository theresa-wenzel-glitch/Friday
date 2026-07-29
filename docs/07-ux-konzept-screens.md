# 07 — UX-Konzept & Screens

## Informationsarchitektur

Vier Bereiche in der Hauptnavigation. Mehr nicht — jeder weitere Reiter kostet Klarheit.

```
Atlas
├── HEUTE          ← Standardeinstieg. Was tue ich jetzt?
├── PFAD           ← Wo stehe ich? (Zielübersicht)
├── WISSEN         ← Ressourcen zum aktuellen Meilenstein
└── ICH            ← Profil, Ziele, Abo, Einstellungen
```

**Die Regel dahinter:** Der Nutzer öffnet Atlas in 80 % der Fälle mit genau einer Frage —
*Was ist mein nächster Schritt?* Diese Frage wird ohne einen einzigen Klick beantwortet.

Bei mehreren aktiven Zielen wird oben ein Zielumschalter eingeblendet; die Struktur bleibt
identisch.

---

## Die drei Kernflüsse

### Fluss A — Erstes Ziel (Onboarding)

```
Splash → Wertversprechen (3 Karten) → Zieleingabe → Interview (max. 8)
   → Planerstellung (Animation) → Planbestätigung → Konto anlegen → Heute
```

**Kritische Entscheidung: Das Konto kommt zum Schluss.** Der Nutzer sieht seinen fertigen
Plan, *bevor* er sich registriert. Der Plan ist das Verkaufsargument — Registrierung davor
kostet den Großteil der Interessenten.

Zielzeit vom Start bis zum ersten sichtbaren Plan: **unter 3 Minuten**.

### Fluss B — Der tägliche Besuch

```
Push „Heute: Standortanalyse" → App öffnet direkt auf Heute
   → Aufgabe lesen → Ressource öffnen (optional) → Erledigt
   → kurze Bestätigung + nächster Schritt
```

Zielzeit: **unter 30 Sekunden**, wenn keine Ressource geöffnet wird.

### Fluss C — Wöchentlicher Check-in

```
Sonntag 18:00 Push → Rückblick (was lief, was nicht)
   → 3 Fragen (Zeit gehabt? Blockaden? Änderungen?)
   → Atlas schlägt angepassten Plan vor (Diff-Ansicht)
   → Bestätigen oder anpassen → Woche startet
```

Das ist der wichtigste Retentionsmoment der ganzen Anwendung. Er darf höchstens **2
Minuten** dauern und muss sich als Erleichterung anfühlen, nicht als Prüfung.

---

## Screen-Beschreibungen

Notation: **[Zweck]** · *Aufbau* · Interaktion · Fehler-/Leerzustände.

---

### S-01 Willkommen
**[Zweck]** In 8 Sekunden verstehen, was Atlas tut.
*Aufbau:* Vollbild, dunkler Hintergrund. Ein animierter Pfad zeichnet sich von unten nach
oben. Darüber: „Vom Ziel zum ersten Schritt." Darunter drei knappe Zeilen: *Du sagst, was
du erreichen willst · Atlas macht daraus einen Plan mit Terminen · Du gehst los, Atlas
passt an.* Primärbutton „Loslegen", Textlink „Ich habe schon ein Konto".
*Interaktion:* Kein Karussell, kein Wischen. Eine Seite.

### S-02 Zieleingabe
**[Zweck]** Das Ziel in eigenen Worten erfassen.
*Aufbau:* Große Frage: „Was möchtest du erreichen?" Darunter ein mehrzeiliges Textfeld,
Platzhalter „z. B. Ich möchte in 18 Monaten ein Café in Leipzig eröffnen". Darunter 6
antippbare Beispielziele als Startpunkt.
*Interaktion:* Tastatur öffnet sofort. Weiter-Button aktiviert ab 10 Zeichen.
*Fehler:* Zu vage („glücklich werden") → Rückfrage statt Ablehnung: „Was wäre der erste
sichtbare Unterschied, wenn du das erreicht hast?"

### S-03 Interview
**[Zweck]** Die 5–8 Angaben erheben, die den Plan personalisieren.
*Aufbau:* Eine Frage pro Screen, große Typografie, Fortschrittspunkte oben.
Antwortformate wechseln: Datumsauswahl, Slider (Stunden/Woche), Betragsfeld, PLZ,
Mehrfachauswahl.
*Interaktion:* Jede Frage überspringbar. Zurück jederzeit möglich.

### S-04 Planerstellung *(Signaturmoment)*
**[Zweck]** Die Wartezeit auf das Modell in den wertvollsten Moment der App verwandeln.
*Aufbau:* Dunkler Hintergrund. Der Pfad zeichnet sich Segment für Segment. Mit jedem
Meilenstein erscheint eine Kurzzeile („Meilenstein 3: Finanzierung sichern — Monat 5–8").
Begleittext wechselt: „Ich schaue mir an, wie andere das gemacht haben…" → „Ich passe die
Zeiten an deine 6 Stunden pro Woche an…" → „Fertig."
*Dauer:* 4–12 Sekunden. Bei längerer Modelllaufzeit läuft die Animation weiter, es wird
nie ein leerer Ladebalken gezeigt.
*Fehler:* Bei Zeitüberschreitung → „Das dauert länger als gedacht. Ich schicke dir eine
Nachricht, sobald der Plan steht" + E-Mail-Feld.

### S-05 Planbestätigung
**[Zweck]** Zustimmung erzeugen und Korrektursignale einsammeln.
*Aufbau:* Vertikale Liste der Meilensteine mit Zeitfenstern; oben eine Zusammenfassung
(„7 Etappen · 18 Monate · ca. 6 Std./Woche"). Je Meilenstein: aufklappbare Aufgabenvorschau,
Aktionen *Anpassen* / *Entfernen*. Unten „Plan starten".
*Interaktion:* Drag-and-drop zum Umsortieren. Jede Änderung wird als Signal gespeichert.
*Leerzustand:* nicht möglich — es gibt immer mindestens 5 Meilensteine.

### S-06 Heute *(Hauptbildschirm)*
**[Zweck]** Genau eine Frage beantworten: Was tue ich jetzt?
*Aufbau:* Oben klein Zielname und Meilensteinname. Zentral eine große Karte: Aufgabentitel
(H2), 1–2 Sätze Kontext, Zeitschätzung, Fälligkeit. Darunter zwei Ressourcenchips. Ganz
unten höchstens zwei weitere Aufgaben in kleiner Darstellung. **Kein Rückstandszähler,
kein Prozentbalken.**
*Interaktion:* Wischen nach rechts = erledigt (mit haptischem Feedback und 700-ms-Animation
des Pfadfortschritts), nach links = verschieben. Langes Drücken = „Passt nicht".
*Leerzustand (alles erledigt):* „Für heute bist du durch. Nächster Schritt: Donnerstag."
— ausdrücklich **kein** Vorschlag, mehr zu tun.

### S-07 Aufgabendetail
**[Zweck]** Alles liefern, was zur Erledigung nötig ist.
*Aufbau:* Titel, Warum-dieser-Schritt (2 Sätze), Schritt-für-Schritt-Anleitung falls
sinnvoll, Ressourcen, verwandte Aufgaben, Notizfeld, Anhänge.
*Interaktion:* Erledigt-Button fixiert am unteren Rand.

### S-08 Pfad *(Zielübersicht)*
**[Zweck]** Fortschritt räumlich erlebbar machen. Der Screen, der geteilt wird.
*Aufbau:* Vertikal scrollende Route. Abgeschlossene Meilensteine gefüllt in `accent`,
aktueller als pulsierender Ring, kommende als offene Kreise. Links Zeitachse mit Monaten.
Ganz oben das Ziel als Flagge.
*Interaktion:* Antippen öffnet Meilensteindetail. Pinch-Zoom zwischen Monats- und
Wochenansicht. Teilen-Button erzeugt ein hochwertiges Bild ohne personenbezogene Details.

### S-09 Meilensteindetail
**[Zweck]** Eine Etappe planbar machen.
*Aufbau:* Titel, Ergebnisdefinition („Fertig, wenn: Businessplan vollständig und von
einer dritten Person gegengelesen"), Zeitfenster, Aufgabenliste mit Status,
Risikohinweise, zugehörige Ressourcen, ggf. Partnerempfehlung (klar gekennzeichnet).

### S-10 Wöchentlicher Check-in
**[Zweck]** Rückstand in einen neuen Plan verwandeln — ohne Schuldzuweisung.
*Aufbau, 3 Schritte:*
1. *Rückblick:* „3 von 5 Aufgaben erledigt. Der Meilenstein liegt im Zeitplan."
2. *Fragen:* Wie viel Zeit hattest du? (Slider) · Was hat gebremst? (Chips: Zeit ·
   Unklarheit · Warten auf andere · Motivation · Sonstiges) · Ändert sich etwas?
3. *Vorschlag:* Diff-Ansicht — was wird verschoben, was verkleinert, was fällt weg.
*Ton:* nie wertend. Bei 0 erledigten Aufgaben: „Diese Woche war nichts drin. Das ist
normal. Ich mache den nächsten Schritt kleiner."

### S-11 Replanning-Diff
**[Zweck]** Vertrauen durch Nachvollziehbarkeit.
*Aufbau:* Zweispaltig (mobil: gestapelt) — vorher/nachher je Meilenstein, farbig markiert.
Darunter eine Begründung in Prosa: „Weil du zwei Wochen im Urlaub warst, verschiebe ich
die Objektsuche nach hinten und ziehe die Marktrecherche vor — die geht auch von unterwegs."
*Interaktion:* „Übernehmen" oder „Einzeln anpassen".

### S-12 Wissen
**[Zweck]** Genau das Wissen liefern, das jetzt gebraucht wird.
*Aufbau:* Oben „Für deinen aktuellen Schritt" (2–4 Einträge), darunter „Für diesen
Meilenstein", ganz unten Suche über die Bibliothek. Jeder Eintrag mit Lesedauer und
Quelle.

### S-13 Kohorte *(V2)*
**[Zweck]** Zugehörigkeit ohne Social-Media-Mechanik.
*Aufbau:* Gruppenname („Café-Gründungen, Start Frühjahr"), 8–20 anonymisierte Mitglieder
mit Meilensteinstand, ein wöchentlicher Impuls, Fragenbereich.
*Bewusst nicht vorhanden:* Likes, Follower, öffentliche Profile, Endlos-Feed.

### S-14 Ziele
**[Zweck]** Mehrere Ziele verwalten.
*Aufbau:* Karten je Ziel mit Miniatur-Pfad, Status, nächstem Schritt. Button „Neues Ziel".
*Interaktion:* Ab dem 3. aktiven Ziel erscheint ein Hinweis: „Drei Ziele gleichzeitig sind
selten realistisch. Möchtest du eines pausieren?"

### S-15 Ich
**[Zweck]** Konto, Abo, Einstellungen.
*Aufbau:* Profil, Abo-Status mit Verwaltung, Benachrichtigungseinstellungen (granular),
Kalenderverbindungen, Datenexport, Datenschutz, Konto löschen (in zwei Schritten, ohne
Hürden).

### S-16 Paywall
**[Zweck]** Konvertieren, ohne zu erpressen.
*Aufbau:* Erscheint erst, wenn ein Plus-Nutzen konkret ansteht (zweites Ziel,
Kalender-Sync, wöchentliches Replanning) — **nie** direkt nach dem Onboarding.
Kopfzeile nennt den konkreten Anlass: „Du willst dein zweites Ziel starten." Zwei
Optionen: Monat 9,99 € · Jahr 79 € (34 % gespart). 7 Tage kostenlos testen ohne
Zahlungsdaten in der Web-Version.
*Textlink:* „Erst mal weiter mit einem Ziel" — immer sichtbar, nie versteckt.

### S-17 Zielabschluss
**[Zweck]** Der emotionale Höhepunkt des Produkts.
*Aufbau:* Vollbild. Der komplette Pfad zeichnet sich noch einmal nach, alle Meilensteine
leuchten auf. Text: „Du hast es geschafft. Vor 14 Monaten war das ein Satz auf einem
Bildschirm." Darunter Kennzahlen (Dauer, erledigte Aufgaben, längste Pause). Aktionen:
Rückblick teilen · Erfahrung beitragen (fließt ins Playbook) · Neues Ziel.

### S-18 B2B-Konsole *(V2, Web)*
**[Zweck]** Programmleitungen Überblick und Nachweise geben.
*Aufbau:* Tabelle aller betreuten Personen mit Ziel, Meilensteinstand, letzter Aktivität,
Risikomarkierung („seit 14 Tagen inaktiv"). Aggregierte Auswertungen. Export als PDF/CSV.
*Datenschutz:* Die betreute Person sieht transparent, welche Daten geteilt werden, und
kann jederzeit widersprechen.

---

## Zustandsdesign

| Zustand | Regel |
|---------|-------|
| **Laden** | Nie leerer Spinner. Skeleton-Layouts oder erzählende Animation (S-04) |
| **Leer** | Immer mit konkreter nächster Handlung, nie nur Illustration |
| **Fehler** | Was ist passiert · was ist gesichert · was kann ich tun. Nie „Ups!" |
| **Offline** | Heute-Ansicht und Erledigt-Markierungen funktionieren offline und synchronisieren später |
| **Verzug** | Neutrale Darstellung „verschoben", niemals rot, niemals gezählt |

## Plattformspezifika

**iOS.** Native Navigation, Haptik bei Erledigt, Live Activity während laufender Aufgabe,
Home-Screen-Widget „Heute", Shortcuts-Integration.
**Android.** Material-3-konform, aber gleiches visuelles System, Quick-Settings-Tile.
**Web.** Voller Funktionsumfang, tastaturbedienbar (`n` neue Aufgabe, `e` erledigt,
`/` Suche), optimiert für den B2B-Einsatz und für das Onboarding aus der Suche.
