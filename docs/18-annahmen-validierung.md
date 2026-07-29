# 18 — Annahmen & Validierungsplan

## Warum dieses Kapitel existiert

Ein Konzept, das seine eigenen Schwachstellen verschweigt, ist ein Verkaufsprospekt. Dieses
Kapitel listet vollständig auf, worauf das Vorhaben beruht, was davon **gemessen** und was
**angenommen** ist — und wie jede Annahme mit begrenztem Aufwand überprüft wird.

**Aktueller Stand: Es ist nichts gemessen.** Alle Zahlen in diesem Konzept sind
hergeleitete Annahmen. Das ist zu diesem Zeitpunkt normal — aber es muss gesagt werden,
bevor jemand auf Basis dieser Zahlen Geld gibt.

---

## Die Annahmenhierarchie

Annahmen sind nach dem Prinzip geordnet: *Wenn diese falsch ist, ist alles Nachfolgende
bedeutungslos.*

```
A1  Das Problem ist real und schmerzhaft genug          ← ohne dies: kein Produkt
     ↓
A2  KI kann Pläne erzeugen, die Menschen annehmen       ← ohne dies: keine Lösung
     ↓
A3  Menschen bleiben lange genug dabei                  ← ohne dies: kein Abo-Modell
     ↓
A4  Menschen zahlen dafür                               ← ohne dies: kein Umsatz
     ↓
A5  Die Akquise ist bezahlbar                           ← ohne dies: kein Wachstum
     ↓
A6  Der Playbook-Graph erzeugt echten Vorteil           ← ohne dies: kein Graben
     ↓
A7  Der Markt ist groß genug                            ← ohne dies: kein großes Unternehmen
```

---

## A1 — Das Problem ist real *(niedriges Risiko)*

**Annahme:** Menschen mit Mehrmonatszielen scheitern regelmäßig an Struktur, nicht an
Motivation oder Information.

**Warum plausibel:** Die Suchvolumina zu „Checkliste"-Anfragen, die Existenz eines
funktionierenden Coaching-Marktes und die Anzahl von Gründungsberatungsstellen sind
starke indirekte Belege.

**Validierung — E-1: 15 Tiefeninterviews** *(Monat 1, Kosten ~2 T€)*
Je 45–60 Minuten mit Menschen, die in den letzten 24 Monaten ein größeres Ziel verfolgt
haben — davon mindestens 5, die abgebrochen haben. Zentrale Fragen: Wo genau kam der
Stillstand? Was haben Sie stattdessen getan? Was hätte geholfen? Haben Sie für Hilfe
gezahlt?

**Erfolgskriterium:** Mindestens 10 von 15 beschreiben Struktur-/Sequenzprobleme
unaufgefordert als Hauptursache.
**Falls nicht bestätigt:** Problemhypothese neu schneiden, bevor irgendetwas gebaut wird.

---

## A2 — Planqualität *(hohes Risiko, hoher Aufwand)*

**Annahme:** Die Planungs-Engine erzeugt Pläne, die mindestens 70 % der Nutzer ohne
wesentliche Änderung annehmen.

**Warum unsicher:** Modelle erzeugen plausible Pläne. Ob sie *korrekt und passend* sind —
richtige Reihenfolge, realistische Dauern, keine erfundenen Fristen — ist die eigentliche
Frage. Behördenpfade sind regional unterschiedlich und ändern sich.

**Validierung — E-2: Blindbewertung durch Fachleute** *(Monat 2–3, ~5 T€)*
30 generierte Pläne aus dem Wedge-Segment werden 5 erfahrenen Gründungsberatenden
vorgelegt — ohne Hinweis auf die Herkunft, gemischt mit 10 von Menschen erstellten Plänen.
Bewertung auf fünf Kriterien (Vollständigkeit, Reihenfolge, Realismus, Konkretheit,
Ton), je 1–5.

**Erfolgskriterium:** Durchschnitt ≥ 4,0; kein Einzelkriterium < 3,5; Fachleute können
generierte und menschliche Pläne nicht zuverlässig unterscheiden.
**Falls nicht bestätigt:** Anteil redaktioneller Playbook-Struktur erhöhen, Generierung
auf Personalisierung beschränken. Im Extremfall: Playbooks vollständig redaktionell,
Modell nur für Zuschnitt und Terminierung.

**Zusätzlich E-2b: Annahmequote in der Alpha** *(Monat 3)* — die reale Messung an 50
Nutzern. **Gate: ≥ 65 %.**

---

## A3 — Retention *(höchstes Risiko)*

**Annahme:** Monatliche Abwanderung ≤ 7 %, Monat-3-Retention ≥ 25 %.

**Warum unsicher:** Dies ist die schwächste Stelle des gesamten Konzepts. Software zur
Selbstverbesserung hat strukturell schlechte Bindung. Zusätzlich hat Atlas ein besonderes
Problem: **Ein erreichtes Ziel ist ein Kündigungsgrund.**

**Validierung — E-3: Retentionskohorte** *(Monat 3–8, laufend)*
Die Alpha- und Beta-Nutzer werden über sechs Monate wöchentlich kohortenweise verfolgt.
Gemessen: Woche-1/4/8/12-Retention, Check-in-Teilnahme, Meilensteine pro Nutzer und Monat,
Abwanderungsgrund per Austrittsbefragung.

**Erfolgskriterium:** Woche-8-Retention ≥ 30 %, Monat-3 ≥ 25 %.

**Was getestet wird, um die Kurve zu heben:**

| Hebel | Hypothese |
|-------|-----------|
| Kohorten | Soziale Bindung ist der stärkste bekannte Hebel bei Verhaltensänderung |
| Zeitpunkt des ersten Meilensteins | Erfolg in Woche 3–4 überbrückt das Motivationstief |
| Check-in-Ton | Nicht-wertende Formulierung senkt Vermeidung |
| Aufgabengröße | Kleinerer Zuschnitt erhöht Abschlusswahrscheinlichkeit |
| Anschlussziel | Nach Zielerreichung sofort ein Folgeziel anbieten |

**Falls nicht bestätigt (Abwanderung > 15 %):** Zwei Auswege, in dieser Reihenfolge:
1. **Zielgruppe verengen** auf noch stärker fremdbestimmte Ziele (nur Gründungen mit
   bereits fixiertem Eröffnungstermin oder unterzeichnetem Mietvertrag).
2. **Erlösmodell ändern** von Abo auf Einmalzahlung pro Ziel (z. B. 79 € je Zielplan mit
   12 Monaten Begleitung) — das entkoppelt den Umsatz von der Verweildauer, verliert aber
   die Planbarkeit wiederkehrender Erlöse.

---

## A4 — Zahlungsbereitschaft *(mittleres Risiko)*

**Annahme:** ≥ 8 % der aktivierten Nutzer schließen ein Abo ab; 9,99 € ist der richtige
Preis.

**Validierung — E-4: Preistest** *(Monat 7, ~3 T€)*
Zwei getrennte Kohorten: 9,99 € gegen 12,99 €, jeweils mindestens 400 Nutzer.
Gemessen: Konversion, ARPU, 60-Tage-Retention der Zahlenden.

Zusätzlich vorgelagert **E-4a: Zahlungsbereitschaftstest ohne Produkt** *(Monat 5)* — eine
Preisseite mit „Jetzt vormerken" vor dem Bezahlvorgang; gemessen wird die Klickrate, nicht
die tatsächliche Zahlung.

**Erfolgskriterium:** Konversion ≥ 8 % bei mindestens einem Preispunkt; ARPU × Retention
bei 12,99 € nicht schlechter als bei 9,99 €.
**Falls nicht bestätigt:** Free-Tarif weiter einschränken, Pro-Tarif als Anker aufwerten,
oder Preis auf 7,99 € senken bei gleichzeitiger Ausweitung der Partnererlöse.

---

## A5 — Akquisekosten *(mittleres Risiko)*

**Annahme:** Gemischter CAC ≤ 22 € in Jahr 1; Inhalte/SEO liefern 32 % der Neukunden bei
etwa 8 € CAC.

**Validierung — E-5: Kanaltests** *(Monat 5–9, ~25 T€)*
Je Kanal ein klar abgegrenztes Budget mit eigener Erfolgsmessung: 8 T€ Google Search,
8 T€ Meta/TikTok, 5 T€ Inhaltsproduktion mit Zuordnung, 4 T€ Kooperationen.

**Erfolgskriterium:** Mindestens zwei Kanäle mit Amortisationsdauer unter 6 Monaten.
**Falls nicht bestätigt:** Verlagerung auf B2B/B2G, wo die Akquise pro Kopf günstiger ist,
und stärkere Gewichtung von Kooperationen.

---

## A6 — Der Playbook-Vorteil *(langfristiges Risiko)*

**Annahme:** Nach ~500 abgeschlossenen Verläufen je Ziel erzeugt der Graph messbar bessere
Pläne als reine Generierung.

**Warum unsicher:** Es ist offen, ob 500 Verläufe reichen, ob die Streuung zwischen
Einzelfällen zu groß ist, und ob abgeschlossene Verläufe nicht durch Überlebensverzerrung
systematisch schöngefärbt sind.

**Validierung — E-6: A/B-Test der Plangenerierung** *(Monat 10–12)*
Zwei Varianten desselben Ziels: mit Playbook-Kontext gegen ohne. Gemessen: Annahmequote,
Abweichung geschätzte vs. reale Dauer, Meilensteinabschlussrate nach 60 Tagen.

**Erfolgskriterium:** Playbook-Variante mindestens 15 % besser bei der Annahmequote und
messbar präziser bei den Dauerschätzungen.
**Falls nicht bestätigt:** Der Graben muss anderswo liegen — dann rücken Partnernetz,
B2B-Verträge und Markenautorität an seine Stelle. Die Investitionslogik des Unternehmens
ändert sich damit erheblich; das wäre offen zu kommunizieren.

---

## A7 — Marktgröße *(Recherchelücke, kein Experiment)*

**Annahme:** SAM DACH ~ 180 Mio. €/Jahr.

**Status: unbelegt.** Die Zahlen in [Kapitel 03](03-markt-und-wettbewerb.md) sind
bottom-up konstruiert, nicht recherchiert.

**Validierung — V-1: Marktrecherche** *(Monat 2, ~4 T€)*
Zu belegen mit Primär- und Sekundärquellen: Gründungszahlen DACH (Statistisches
Bundesamt, KfW-Gründungsmonitor), Marktgröße Coaching und Weiterbildung (Branchenverbände),
Abo-Zahlungsbereitschaft für Produktivitätssoftware (Marktforschung), Budgets der
Gründerzentren und Kammern (Haushaltspläne, Ausschreibungsdatenbanken).

**V-2: Wettbewerbsrecherche** *(Monat 2, ~2 T€)* — systematische Erfassung von Anbietern
mit Teilüberschneidung in DACH, EU, US, inklusive Finanzierungsstand und Positionierung.

**Bis diese Recherche vorliegt, dürfen die Marktzahlen in keiner Investorenunterlage ohne
den Annahmehinweis erscheinen.**

---

## Weitere kleinere Annahmen

| # | Annahme | Wert | Prüfung |
|---|---------|------|---------|
| B1 | KI-Kosten pro Zahler und Monat | 0,70 € | Messung ab Alpha (Monat 3) |
| B2 | Free-Nutzer je Zahler | 8 | Messung ab Beta |
| B3 | Anteil Jahresabos | 40 % | Messung ab Monat 7 |
| B4 | Cache-Trefferquote | 60 % | Messung ab Monat 2 |
| B5 | Planerstellung dauert 6–14 s | | Messung ab Monat 2 |
| B6 | Supportkontaktquote | 4 % | Messung ab Beta |
| B7 | Zweite Domäne erreicht 80 % der Aktivierung der ersten | | Messung Monat 11 |
| B8 | 12 Playbooks decken 70 % der Gründungsanfragen ab | | Messung ab Alpha |

---

## Gesamtplan der Validierung

| Experiment | Monat | Kosten | Entscheidet über |
|------------|------:|-------:|------------------|
| E-1 Interviews | 1 | 2 T€ | Ob überhaupt gebaut wird |
| V-1 Marktrecherche | 2 | 4 T€ | Investorentauglichkeit der Zahlen |
| V-2 Wettbewerb | 2 | 2 T€ | Positionierung, Dringlichkeit |
| E-2 Fachbewertung | 2–3 | 5 T€ | Ob die Engine trägt |
| E-2b Annahmequote Alpha | 3 | – | **Gate Q1** |
| E-3 Retentionskohorte | 3–8 | – | **Gate Q2, Überlebensfrage** |
| E-4a Zahlungsbereitschaft | 5 | 1 T€ | Preisrichtung |
| E-4 Preistest | 7 | 3 T€ | **Gate Q3**, Preis |
| E-5 Kanaltests | 5–9 | 25 T€ | Skalierbarkeit |
| E-6 Playbook-A/B | 10–12 | – | Existenz des Grabens |
| | **Summe** | **42 T€** | |

42 T€, um die Kernfragen eines Vorhabens mit 2,2 Mio. € Kapitalbedarf zu beantworten. Das
ist die günstigste Position im gesamten Finanzplan.

---

## Abbruchkriterien

Ehrlichkeit verlangt, vorab festzulegen, wann nicht weitergemacht wird:

| Bedingung | Konsequenz |
|-----------|------------|
| E-1: weniger als 8 von 15 bestätigen das Problem | **Abbruch** oder grundlegende Neuausrichtung |
| E-2: Fachbewertung < 3,0/5 | Kein Bau ohne Neukonzeption der Engine |
| E-2b: Annahmequote < 50 % nach zwei Iterationen | **Abbruch** — das Kernversprechen ist nicht einlösbar |
| E-3: Woche-8-Retention < 15 % nach drei Iterationen | Wechsel zum Einmalzahlungsmodell oder **Abbruch** |
| E-4: Konversion < 4 % bei beiden Preispunkten | Erlösmodell grundlegend überdenken |
| Kein Kanal mit Amortisation < 12 Monaten bis Monat 12 | Nur B2B weiterverfolgen |

Diese Kriterien werden **vor** Beginn schriftlich festgehalten und im Gesellschafterkreis
bestätigt. Wer sie erst im Nachhinein definiert, definiert sie immer so, dass
weitergemacht wird.
