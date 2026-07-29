# 06 — Produkt & Funktionsumfang

## Die Kernschleife

Alles in Atlas dient einer einzigen wiederkehrenden Schleife:

```
   ZIEL erfassen
        ↓
   PLAN erzeugen  ←──────────────┐
        ↓                        │
   SCHRITT tun                   │  Replanning
        ↓                        │  (wöchentlich oder ereignisgesteuert)
   FORTSCHRITT melden ───────────┘
        ↓
   MEILENSTEIN erreicht
        ↓
   ZIEL erreicht → Playbook-Graph wird besser
```

Der letzte Pfeil ist der wichtigste: **Jeder abgeschlossene Verlauf verbessert die Pläne
aller künftigen Nutzer.** Das ist kein Nebeneffekt, sondern Architekturzweck.

---

# Version 1 — die Beta (Monat 1–6)

Leitfrage für V1: *Was ist das Minimum, mit dem ein Mensch ein reales Ziel wirklich
erreichen kann?* Alles, was nicht dazu beiträgt, wird verschoben.

## 1.1 Zielerfassung

Freitexteingabe („Ich möchte in 18 Monaten ein Café in Leipzig eröffnen") plus ein
geführtes Interview von **maximal 8 Fragen**, adaptiv:

| Frage | Zweck |
|-------|-------|
| Bis wann? | Zeitrahmen, Rückwärtsterminierung |
| Wie viel Zeit pro Woche? | Aufgabenzuschnitt und -dichte |
| Budget? | Realismusprüfung, Meilensteinauswahl |
| Wo? (PLZ) | Behördenpfade, lokale Ressourcen |
| Vorerfahrung? | Detailtiefe der Erklärungen |
| Schon begonnen? | Startpunkt im Playbook |
| Was macht dir am meisten Sorge? | Priorisierung, emotionale Ansprache |
| Feste Termine/Einschränkungen? | Kalenderrestriktionen |

Regel: Nach spätestens **90 Sekunden** steht der Plan. Wer mehr fragen will, verliert
Nutzer.

## 1.2 Planerzeugung

Ausgabe des Modells ist ein streng validiertes Schema (Details in
[Kapitel 10](10-ki-planungs-engine.md)):

- **5–10 Meilensteine** mit Titel, Ergebnis („Woran erkenne ich, dass das fertig ist?"),
  Zeitfenster, Abhängigkeiten
- **Aufgaben** pro Meilenstein mit Zeitschätzung, Fälligkeit, Schwierigkeit,
  Vorbedingungen
- **Ressourcen** je Aufgabe (Link, Formular, Vorlage, Video), kuratiert und mit
  Datumsstempel
- **Risikohinweise** an bekannten Stolperstellen („Achtung: Der Mietvertrag sollte erst
  nach der Konzessionsvorprüfung unterschrieben werden.")

Der Nutzer sieht den Plan zuerst **zur Bestätigung**, nicht als Fakt. Er kann Meilensteine
streichen, umsortieren, Zeitfenster ändern. Erst danach wird der Plan aktiv. Diese
Zustimmung ist zentral: Ein Plan, den man selbst mitgestaltet hat, wird eher befolgt — und
die Korrekturen sind das wertvollste Trainingssignal für den Playbook-Graphen.

## 1.3 Heute-Ansicht

Der Standardbildschirm. Zeigt **eine** Aufgabe groß, darunter höchstens zwei weitere.
Kein Rückstandszähler, keine Gesamtliste, kein Prozentbalken oben.

Drei Aktionen: **Erledigt** · **Verschieben** · **Passt nicht** (letzteres löst eine
Rückfrage aus und wird als Signal gespeichert).

## 1.4 Der Pfad

Die vertikale Zielübersicht als Route: zurückgelegter Weg, aktuelle Position, kommende
Meilensteine. Tippen öffnet Details. Das ist der Screen, den Nutzer teilen — er muss
deshalb gestalterisch der beste sein.

## 1.5 Adaptives Replanning

Das eigentliche Alleinstellungsmerkmal. Auslöser:

- Wöchentlicher Check-in (Standard: Sonntagabend)
- Zwei aufeinanderfolgende verpasste Aufgaben
- Nutzer meldet Änderung („Ich habe zwei Wochen Urlaub", „Die Finanzierung ist geplatzt")
- Externes Ereignis (Frist verschoben, Meilenstein früher erreicht)

Die Anpassung verändert **nicht das Ziel**, sondern Zuschnitt, Reihenfolge und Zeitfenster.
Wenn das Ziel im gesetzten Rahmen unmöglich wird, sagt Atlas das offen und schlägt
Alternativen vor (Datum verschieben, Umfang reduzieren, Zwischenziel setzen) — es tut nicht
so, als ginge es noch.

## 1.6 Erinnerungen

Standard: **eine Push-Nachricht pro Tag**, Zeitpunkt gelernt aus dem Nutzungsverhalten.
Inhalt immer konkret („Heute: 5 Cafés besuchen, Checkliste ist vorbereitet") statt generisch
(„Zeit für dein Ziel!"). Vollständig abschaltbar, mit E-Mail als Alternative.

## 1.7 Kalenderanbindung *(Plus)*

Zwei-Wege-Sync mit Google Calendar, Apple Kalender und Outlook via CalDAV/ICS. Aufgaben
werden als Termine mit realistischer Dauer eingeplant, verfügbare Lücken werden
berücksichtigt. Das ist der Übergang von „Absicht" zu „Termin" — nach Hürde 3 in
[Kapitel 02](02-problem-und-chance.md) einer der wirksamsten Hebel überhaupt.

## 1.8 Ressourcenbibliothek

Kuratierte Inhalte, an Aufgaben gebunden statt frei durchsuchbar. Drei Typen: eigene
Kurztexte (2–4 Minuten Lesezeit), geprüfte externe Links, ausfüllbare Vorlagen
(Businessplan-Gerüst, Liquiditätsplan, Behördenformulare).

## 1.9 Konto, Abrechnung, Export

Registrierung per E-Mail-Magic-Link oder Apple/Google-Login. Abo über Stripe sowie
In-App-Kauf auf iOS. **Vollständiger Datenexport** (JSON + Markdown + ICS) ohne Nachfrage,
jederzeit — siehe Prinzip 5 in [Kapitel 01](01-vision-mission.md).

## Was in V1 bewusst fehlt

| Weggelassen | Warum |
|-------------|-------|
| Kohorten/Community | Braucht Nutzerdichte. Vorher leer und schädlich |
| Android | Ressourcenfokus; DACH-Zahlungsbereitschaft startet auf iOS höher *(Annahme)* |
| Offene Zieldomänen | Playbook-Qualität ginge verloren. Erst Tiefe, dann Breite |
| Experten-Sessions | Operativ aufwendig, erst ab Pro-Tarif in Q3 |
| Gamification | Widerspricht Prinzip 4 |
| Team-/Familienziele | Anderes Produkt |

---

# Version 2 — der Ausbau (Monat 7–12)

## 2.1 Kohorten
Automatische Gruppen von 5–20 Personen mit ähnlichem Ziel und ähnlichem Zeitfenster.
Zweckgebunden und geschlossen: gemeinsamer Meilensteinüberblick, ein wöchentlicher
Austauschimpuls, moderierte Fragen. Kein Feed, keine Likes, keine Follower.

## 2.2 Expertenschicht *(Pro)*
Buchbare 30-Minuten-Sessions mit geprüften Fachleuten (Steuerberatung, Gründungsberatung,
Trainer) direkt aus dem betreffenden Meilenstein heraus. Der Experte sieht mit Zustimmung
den Planstand — kein Erklärungsaufwand mehr am Anfang des Gesprächs.

## 2.3 Partnerintegration
An passenden Meilensteinen erscheinen relevante Dienstleistungen (Geschäftskonto,
Gewerbeversicherung, Kassensystem). Regeln, die nicht verhandelbar sind: immer als
„Anzeige/Partner" gekennzeichnet, immer mit einer neutralen Alternative, nie mehr als eine
Empfehlung pro Meilenstein, niemals Weitergabe personenbezogener Daten ohne ausdrückliche
Einzeleinwilligung.

## 2.4 Zweite Zieldomäne
Gesundheit/Fitness. Beweist Übertragbarkeit und öffnet den B2B-Kanal Krankenkassen.

## 2.5 Android & Widgets
Vollwertige Android-App, plus Home-Screen-Widget („Heute") auf beiden Plattformen und
Apple-Watch-Komplikation.

## 2.6 B2B-Konsole
Mandantenfähiges Dashboard für Gründerzentren und Kammern: Fallübersicht,
Fortschrittsstatus, aggregierte Wirkungsberichte, Nutzerverwaltung, eigenes Branding.

---

# Version 3 — die Plattform (Jahr 2+)

| Funktion | Beschreibung |
|----------|--------------|
| **Offene Zieldomänen** | Beliebige Ziele, gestützt auf die dann breite Playbook-Basis |
| **Dokumenten-Copilot** | Businessplan, Antrag, Bewerbung entstehen im Plan und werden geprüft |
| **Behördenintegration** | Direkte Formularvorbefüllung, perspektivisch elektronische Einreichung |
| **Öffentlicher Playbook-Marktplatz** | Erfolgreiche Nutzer und Fachleute veröffentlichen Playbooks gegen Umsatzbeteiligung |
| **Atlas API** | Banken, Kassen, Kommunen betten Zielpfade in ihre eigenen Produkte ein |
| **Familien-/Paarziele** | Gemeinsame Vorhaben (Hauskauf, Umzug, Elternschaft) |
| **Internationalisierung** | AT/CH → NL, PL, ES; behördliche Lokalisierung als Kernaufgabe |

---

## Funktionsumfang je Tarif

| Funktion | Free | Plus 9,99 € | Pro 29 € | Business |
|----------|:----:|:-----------:|:--------:|:--------:|
| Aktive Ziele | 1 | ∞ | ∞ | ∞ |
| Planerzeugung | ✅ | ✅ | ✅ | ✅ |
| Heute-Ansicht & Pfad | ✅ | ✅ | ✅ | ✅ |
| Adaptives Replanning | monatlich | wöchentlich + Ereignis | täglich möglich | wöchentlich |
| Erinnerungen | E-Mail | Push + E-Mail | Push + E-Mail + SMS | Push + E-Mail |
| Kalender-Sync | — | ✅ | ✅ | ✅ |
| Ressourcen | Basis | vollständig | vollständig | vollständig |
| Kohorten | lesend | ✅ | ✅ | eigene Gruppen |
| Experten-Session | — | Zukauf | 1×/Monat inkl. | Kontingent |
| Dokumentenprüfung | — | — | ✅ | ✅ |
| Export | ✅ | ✅ | ✅ | ✅ + Reporting |
| Support | Hilfeartikel | E-Mail 48 h | E-Mail 12 h | Ansprechpartner |

## Priorisierungsregel

Bei jeder Funktionsentscheidung gilt die Reihenfolge:

1. Erhöht sie die **Meilensteine pro Nutzer und Monat**? → bauen
2. Erhöht sie die **Monat-3-Retention**? → bauen
3. Verbessert sie den **Playbook-Graphen**? → bauen
4. Erhöht sie nur Umsatz oder Verweildauer? → verschieben
5. Keines davon? → nicht bauen
