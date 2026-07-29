# 03 — Markt- & Wettbewerbsanalyse

> **Wichtiger Hinweis vorab:** Alle Zahlen in diesem Kapitel sind bewusst *bottom-up*
> hergeleitete Modellrechnungen mit offengelegten Annahmen — keine recherchierten
> Marktdaten. Sie sind so aufgebaut, dass jede Annahme einzeln durch eine Quelle ersetzt
> werden kann. Der Recherche-Auftrag dazu steht als V-1 in
> [Kapitel 18](18-annahmen-validierung.md). Für eine Investorenansprache müssen die
> Annahmen durch belegte Werte ersetzt werden.

## Marktabgrenzung

Atlas liegt in der Schnittmenge von vier etablierten Märkten und ist in keinem davon
vollständig zu Hause:

```
        Produktivitäts-/                  Online-
        Planungs-Software                 Weiterbildung
                    \                     /
                     \                   /
                      \      ATLAS      /
                      /                 \
                     /                   \
        Coaching &                        Gründungs- &
        Verhaltensänderung                Fachberatung
```

Die Positionierung: Atlas hat die **Skalierbarkeit von Software** bei der
**Ergebnisverantwortung von Coaching**.

## TAM / SAM / SOM — Bottom-up

### TAM (theoretisch adressierbar, Europa)

| Annahme | Wert |
|---------|------|
| Erwachsene Bevölkerung EU + UK + CH | ~ 400 Mio. *(Annahme)* |
| Anteil mit mindestens einem ernsthaften Mehrmonatsziel pro Jahr | 25 % *(Annahme)* |
| Menschen mit Atlas-relevantem Ziel/Jahr | ~ 100 Mio. |
| Zahlungsbereitschaft für digitale Begleitung | 8 % *(Annahme)* |
| Zahlungsbereite Personen | ~ 8 Mio. |
| Durchschnittlicher Jahresumsatz pro Zahler | 90 € *(Annahme: Mix aus Plus/Pro, ~7,5 Monate Laufzeit)* |
| **TAM** | **~ 720 Mio. €/Jahr** |

### SAM (bedienbar, DACH, drei Zieldomänen)

| Annahme | Wert |
|---------|------|
| Erwachsene DACH | ~ 80 Mio. *(Annahme)* |
| Ziel in einer der drei Startdomänen (Gründung, Gesundheit, Lernen/Karriere)/Jahr | 12 % *(Annahme)* |
| Personen | ~ 9,6 Mio. |
| Zahlungsbereitschaft | 8 % *(Annahme)* |
| Zahlungsbereite Personen | ~ 770.000 |
| Ø Jahresumsatz inkl. Partnererlöse | 110 € *(Annahme)* |
| **SAM** | **~ 85 Mio. €/Jahr** |

Zuzüglich B2B (Gründerzentren, Kammern, Arbeitgeber, Krankenkassen), konservativ mit
weiteren **~ 95 Mio. €** angesetzt *(Annahme)* → **SAM gesamt ~ 180 Mio. €/Jahr**.

### SOM (realistisch erreichbar, Jahr 3)

| Annahme | Wert |
|---------|------|
| Marktanteil am DACH-SAM in Jahr 3 | 3 % *(Annahme)* |
| **SOM Jahr 3** | **~ 5,4 Mio. € ARR** |

Diese Zahl deckt sich grob mit dem eigenständig gerechneten Finanzplan in
[Kapitel 11](11-geschaeftsmodell-finanzplan.md) (~ 6,1 Mio. € ARR Ende Jahr 3) — die
beiden Rechnungen sind unabhängig entstanden, was ihre Plausibilität stützt, aber nicht
belegt.

### Die einzige Zahl, die wirklich zählt

> **100.000 zahlende Abonnenten × 9,99 €/Monat = ~ 12 Mio. € ARR.**

Das entspricht rund 0,13 % der erwachsenen DACH-Bevölkerung. Atlas braucht keine
Marktdominanz, sondern einen sehr kleinen Anteil eines sehr großen Marktes.

## Wettbewerbslandschaft

### Direkte Wettbewerber (Ziel → Plan → Begleitung)

Zum Zeitpunkt der Konzepterstellung ist **kein etablierter Anbieter bekannt, der die
gesamte Kette abdeckt**. Es existieren jedoch Startups mit Teilüberschneidung im Bereich
KI-gestützter Zielplanung. Diese Aussage ist eine Momentaufnahme und muss durch eine
systematische Wettbewerbsrecherche belegt werden (V-2 in
[Kapitel 18](18-annahmen-validierung.md)).

Die realistische Erwartung: Das Fenster ohne direkte Konkurrenz beträgt **6 bis 18
Monate**. Danach entscheidet nicht die Idee, sondern die Datentiefe des Playbook-Graphen.

### Indirekte Wettbewerber und die jeweilige Antwort

| Wettbewerber | Stärke | Angriffsfläche | Atlas' Antwort |
|--------------|--------|----------------|----------------|
| **ChatGPT / Claude** | Kostenlos verfügbar, guter Erstplan | Kein Gedächtnis, keine Termine, keine Erinnerungen, keine Erfahrungsdaten | Persistenz + Termine + Kohorte + Playbook-Graph. Der Plan ist der billige Teil |
| **Notion** | Flexibel, große Community | Leer, hoher Einrichtungsaufwand, keine Führung | Atlas kommt gefüllt und passt sich an |
| **Todoist / Things** | Exzellente Aufgabenverwaltung | Kein Zielverständnis, keine Zerlegung | Atlas beginnt eine Ebene höher: beim Ziel |
| **Coaching-Plattformen** | Menschliche Qualität, echte Verantwortung | 80–200 €/h, nicht skalierbar | Atlas als Basisschicht, Experten als Pro-Tarif obendrauf |
| **Domänenspezialisten** (Gründerplattformen, Trainings-Apps) | Tiefe, Fachautorität | Eine Domäne, kein übertragbares System | Atlas gewinnt beim zweiten Ziel — und jeder hat ein zweites Ziel |
| **Gründungsberatung / IHK** | Autorität, Förderzugang | Termingebunden, papierlastig, langsam | Atlas als digitale Vorstufe; Kooperation statt Verdrängung |

### Die drei ernsthaften Bedrohungen

**1. Ein Plattformanbieter baut es ein.** Wenn OpenAI, Google oder Apple Zielplanung als
Standardfunktion ausliefern, verschwindet die Erstplan-Erzeugung als Differenzierung über
Nacht.
*Antwort:* Der Wert liegt nicht in der Erzeugung, sondern in Erfahrungsdaten, Terminen,
Partnernetz und Kohorten — alles Dinge, die eine horizontale Plattform nicht nebenbei
mitliefert. Zusätzlich strategische Absicherung durch Domänentiefe und
B2B-Vertriebsverträge, die nicht über Nacht ersetzbar sind.

**2. Ein Domänenspezialist erweitert sich.** Eine große Gründerplattform ergänzt
KI-Planung.
*Antwort:* Domänenspezialisten sind strukturell auf ihre Domäne festgelegt (Marke,
Vertrieb, Erlösmodell). Atlas' Übertragbarkeit auf das nächste Ziel ist der Vorteil.

**3. Ein finanzstarkes Copycat.** Ein gut finanziertes Team kopiert das Konzept.
*Antwort:* Der einzig verlässliche Schutz ist Vorsprung im Playbook-Graphen. Deshalb ist
die Datensammlung ab Tag 1 Produktbestandteil, nicht Nachgedanke — siehe
[Kapitel 09](09-datenmodell.md) und [Kapitel 10](10-ki-planungs-engine.md).

## Positionierung

**Für** Menschen mit einem ernsthaften Ziel und ohne Plan,
**die** nicht wissen, wo sie anfangen sollen oder nach einigen Wochen steckenbleiben,
**ist Atlas** eine Zielerreichungs-Plattform,
**die** aus dem Ziel einen konkreten, terminierten und sich anpassenden Plan macht und
durch die Umsetzung begleitet.
**Anders als** ein Chatbot, ein Projekttool oder ein Onlinekurs
**basiert Atlas** auf den realen Verläufen tausender Menschen mit demselben Ziel und bleibt
über Monate an der Seite des Nutzers.

### Positionierungsachsen

```
                        strukturiert & geführt
                                 ▲
                                 │
              Domänen-Tools      │      ● ATLAS
                                 │
   eine Domäne ◄─────────────────┼─────────────────► alle Ziele
                                 │
              Coaching (teuer)   │      ChatGPT
                                 │      Notion / Todoist
                                 ▼
                         offen & unstrukturiert
```

## Markteintrittsstrategie

**Phase 1 — Tiefe vor Breite (Monat 1–9).** Eine Domäne (Gründung DACH), ein Land
(Deutschland), zwei Plattformen (Web + iOS). Ziel: die beste Gründungsbegleitung im Markt
zu sein, nicht die breiteste Zielplattform.

**Phase 2 — Zweite Domäne (Monat 10–18).** Gesundheit/Fitness. Beweist die
Übertragbarkeit der Plattform und öffnet den B2B-Kanal Krankenkassen.

**Phase 3 — Breite (ab Monat 19).** Offene Zieleingabe für beliebige Domänen, gestützt
auf die dann vorhandene Playbook-Basis. Internationalisierung beginnt mit Österreich und
der Schweiz (gleiche Sprache, abweichende Behördenlogik — ein guter Test für die
Lokalisierungsarchitektur).
