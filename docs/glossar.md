# Glossar

Begriffe, die in diesem Konzept eine feste, definierte Bedeutung haben.

## Produktbegriffe

| Begriff | Bedeutung |
|---------|-----------|
| **Ziel** (Goal) | Ein vom Nutzer formuliertes Vorhaben mit Zeithorizont. Oberste Ebene der Datenstruktur |
| **Meilenstein** (Milestone) | Eine der 5–10 großen Etappen eines Ziels. Hat immer eine prüfbare Ergebnisdefinition |
| **Aufgabe** (Task) | Ein konkreter, in maximal 8 Stunden erledigbarer Schritt innerhalb eines Meilensteins |
| **Ergebnisdefinition** (Definition of Done) | Der Satz, der beschreibt, woran man erkennt, dass ein Meilenstein abgeschlossen ist |
| **Pfad** | Die visuelle Darstellung eines Ziels als Route mit Wegpunkten. Der Signatur-Screen von Atlas |
| **Heute-Ansicht** | Der Standardbildschirm. Zeigt genau die nächste Aufgabe |
| **Check-in** | Der wöchentliche Rückblick, der das Replanning auslöst |
| **Replanning** | Die Anpassung eines laufenden Plans an veränderte Umstände. Verändert nie das Ziel |
| **Kohorte** | Eine geschlossene Gruppe von 5–20 Personen mit ähnlichem Ziel und Zeitfenster |
| **Wedge** | Das eng gefasste Startsegment, mit dem der Markteintritt erfolgt (hier: Gründung DACH) |

## Playbook-Begriffe

| Begriff | Bedeutung |
|---------|-----------|
| **Playbook** | Eine strukturierte Vorlage für ein bestimmtes Zielmuster, bestehend aus Knoten und Kanten |
| **Playbook-Graph** | Die Gesamtheit aller Playbooks. Das zentrale Datenkapital von Atlas |
| **Intent-Key** | Kanonischer Schlüssel eines Zielmusters, z. B. `founding.gastronomy.cafe` |
| **Knoten** (Node) | Ein Meilensteinmuster im Graphen, mit Mediandauer, Streuung und Abbruchquote |
| **Kante** (Edge) | Eine beobachtete Abfolge zwischen zwei Knoten, mit Häufigkeit und Erfolgsdifferenz |
| **Abbruchquote** (Dropout Rate) | Der Anteil der Nutzer, die an einem bestimmten Knoten aufgeben. Die wertvollste Einzelkennzahl im System |
| **Konfidenz** | Vertrauenswert eines Playbooks (0–1), abgeleitet aus Stichprobengröße und Streuung |
| **k-Anonymität** | Mindestanzahl von Verläufen (hier: 25), ab der aggregiert werden darf |
| **Herkunft** (Origin) | Kennzeichnung, ob ein Schritt aus dem Playbook stammt, generiert oder vom Nutzer erstellt wurde |

## Technische Begriffe

| Begriff | Bedeutung |
|---------|-----------|
| **Planungs-Engine** | Die achtstufige Pipeline aus Klassifikation, Abruf, Erzeugung, Validierung, Reparatur, Terminierung, Vorlage und Rückkopplung |
| **Strukturierte Ausgabe** | Erzwungene JSON-Ausgabe des Modells nach striktem Schema, statt Freitext-Parsing |
| **Validator** | Die deterministische Prüfung eines Plans auf neun Regeln — enthält bewusst kein Modell |
| **Prompt-Caching** | Zwischenspeicherung stabiler Prompt-Anteile zur Kostensenkung |
| **Modell-Routing** | Zuweisung von Aufgabenklassen an unterschiedlich leistungsfähige Modelle |
| **Goldstandard-Satz** | Feste Sammlung von 200 Zielbeschreibungen zur automatisierten Qualitätsmessung |
| **Evaluations-Gate** | Technisch erzwungene Regel: kein Modell- oder Prompt-Wechsel ohne bestandene Bewertung |
| **RLS** (Row-Level-Security) | Datenbankseitige Zugriffstrennung nach Nutzer und Mandant |

## Kaufmännische Begriffe

| Begriff | Bedeutung |
|---------|-----------|
| **ARR** | Annual Recurring Revenue — auf ein Jahr hochgerechneter wiederkehrender Umsatz |
| **ARPU** | Average Revenue per User — Durchschnittserlös je zahlendem Nutzer und Monat |
| **CAC** | Customer Acquisition Cost — Kosten zur Gewinnung eines zahlenden Kunden |
| **LTV** | Lifetime Value — Deckungsbeitrag über die gesamte Kundenbeziehung |
| **COGS** | Cost of Goods Sold — direkte Kosten je bedientem Kunden |
| **Abwanderung** (Churn) | Anteil der Kunden, die ein Abo pro Monat beenden |
| **Amortisationsdauer** (CAC Payback) | Monate, bis der Deckungsbeitrag die Akquisekosten deckt |
| **TAM / SAM / SOM** | Theoretisch adressierbarer / bedienbarer / realistisch erreichbarer Markt |
| **Nordstern** | Die eine Kennzahl, an der alle Produktentscheidungen gemessen werden: erreichte Meilensteine je aktivem Nutzer und Monat |
| **Gate** | Vorab definierte Bedingung, die erfüllt sein muss, bevor weitergebaut oder eingestellt wird |
| **VSOP** | Virtual Stock Option Plan — virtuelle Mitarbeiterbeteiligung |

## Rechtliche Begriffe

| Begriff | Bedeutung |
|---------|-----------|
| **DSGVO** | Datenschutz-Grundverordnung |
| **AVV** | Auftragsverarbeitungsvertrag nach Art. 28 DSGVO |
| **DSFA** | Datenschutz-Folgenabschätzung nach Art. 35 DSGVO |
| **AI Act** | Verordnung der EU über künstliche Intelligenz |
| **StBerG** | Steuerberatungsgesetz — begrenzt, wer steuerlich beraten darf |
| **RDG** | Rechtsdienstleistungsgesetz — begrenzt, wer rechtlich beraten darf |
| **Verweisarchitektur** | Atlas' Grundsatz, bei Beratungsbedarf auf Fachpersonen zu verweisen statt selbst zu beraten |
