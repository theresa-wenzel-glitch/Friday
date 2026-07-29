# 10 — Die Planungs-Engine

Dies ist das Herzstück des Produkts. Die zentrale Einsicht vorweg:

> **Ein Sprachmodell allein ist kein Produkt.** Das Modell ist eine Komponente in einer
> Pipeline aus Abruf, Erzeugung, Validierung, Reparatur und Rückkopplung. Der Wert liegt
> in der Pipeline und in den Daten, die sie speist — nicht im Modell, das jeder mieten kann.

---

## Die Pipeline

```
Zieleingabe
    │
    ▼
[1] KLASSIFIZIEREN  ─ Haiku 4.5 ─ Domäne, intent_key, Machbarkeitsprüfung
    │
    ▼
[2] ABRUFEN  ─ pgvector ─ Top-5 Playbooks nach Ähnlichkeit + Region + Konfidenz
    │
    ▼
[3] ERZEUGEN  ─ Opus 5 ─ Structured Output nach striktem Schema
    │
    ▼
[4] VALIDIEREN  ─ deterministisch, kein Modell ─ 9 Regeln
    │
    ├── ungültig ──> [5] REPARIEREN (max. 2×, Fehler als Eingabe) ──┐
    │                                                               │
    ▼                                                               │
[6] TERMINIEREN  ─ deterministisch ─ Kalender, Kapazität, Feiertage │
    │                                                               │
    ▼                                                               │
[7] VORLEGEN  ─ Nutzer bestätigt oder korrigiert                    │
    │                                                               │
    ▼                                                               │
[8] LERNEN  ─ Korrekturen und Verläufe zurück in den Graphen ───────┘
```

Die entscheidende Designentscheidung: **Schritte 4 und 6 enthalten kein Modell.** Ob ein
Plan zyklenfrei ist und ob 40 Stunden Arbeit in eine Woche mit 6 verfügbaren Stunden
passen, ist berechenbar — und wird berechnet, nicht geraten.

---

## Schritt 1 — Klassifizieren

Modell: `claude-haiku-4-5`. Ausgabe strikt strukturiert:

```json
{
  "domain": "founding",
  "intent_key": "founding.gastronomy.cafe",
  "confidence": 0.94,
  "region": "DE-SN",
  "feasibility": "plausible",
  "missing_info": ["budget"],
  "safety_flag": null
}
```

`feasibility` kann `plausible`, `ambitious` oder `unrealistic` sein. Bei `unrealistic`
(„Marathon in 3 Wochen ohne Lauferfahrung") erzeugt Atlas **keinen** Plan, der so tut, als
ginge es. Stattdessen: eine offene Rückmeldung plus zwei Alternativen (Zeitrahmen
erweitern oder Zwischenziel setzen). Das ist eine Vertrauensfrage — ein System, das jedes
Ziel bejaht, ist wertlos.

`safety_flag` erkennt Ziele, die außerhalb des Produkts liegen: Gesundheitskrisen,
Überschuldung, illegale Vorhaben. Der Umgang damit steht in
[Kapitel 14](14-risiken-recht-datenschutz.md).

---

## Schritt 2 — Abrufen

Aus `intent_key`, Region und Kontext werden die fünf ähnlichsten Playbook-Templates
geholt (HNSW-Index über `pgvector`, kosinusbasierte Ähnlichkeit), gefiltert nach Region
und `confidence ≥ 0.4`.

Der abgerufene Kontext enthält je Template: Knotenstruktur, Mediandauern mit p10/p90,
Abbruchquoten, häufige Blockaden und Erfolgs-Korrelate.

**Dieser Kontext ist der Unterschied zwischen Atlas und einem Chatbot.** Ein generisches
Modell weiß, dass man einen Businessplan braucht. Atlas weiß, dass 41 % der Nutzer genau
an dieser Stelle abbrechen, dass der Schritt im Median 23 Tage dauert (p90: 61 Tage), und
dass diejenigen, die vorher eine Standortanalyse gemacht haben, ihn deutlich häufiger
abschließen.

---

## Schritt 3 — Erzeugen

Modell: `claude-opus-5`, adaptives Denken aktiv, `effort: "high"`.

### Ausgabeschema (gekürzt)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["summary", "milestones", "assumptions", "risks"],
  "properties": {
    "summary": { "type": "string" },
    "assumptions": { "type": "array", "items": { "type": "string" } },
    "risks": { "type": "array", "items": {
      "type": "object", "additionalProperties": false,
      "required": ["milestone_ref", "risk", "mitigation"],
      "properties": {
        "milestone_ref": { "type": "string" },
        "risk": { "type": "string" },
        "mitigation": { "type": "string" }
      }
    }},
    "milestones": {
      "type": "array", "minItems": 5, "maxItems": 10,
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["ref","title","definition_of_done","duration_days",
                     "depends_on","origin","tasks"],
        "properties": {
          "ref": { "type": "string" },
          "title": { "type": "string" },
          "definition_of_done": { "type": "string" },
          "duration_days": { "type": "integer", "minimum": 1 },
          "depends_on": { "type": "array", "items": { "type": "string" } },
          "origin": { "enum": ["playbook", "generated"] },
          "playbook_node_id": { "type": ["string", "null"] },
          "tasks": {
            "type": "array", "minItems": 2, "maxItems": 12,
            "items": {
              "type": "object", "additionalProperties": false,
              "required": ["title","why","estimated_min","difficulty","blocking"],
              "properties": {
                "title": { "type": "string" },
                "why": { "type": "string" },
                "how": { "type": ["string","null"] },
                "estimated_min": { "type": "integer", "minimum": 5, "maximum": 480 },
                "difficulty": { "enum": ["micro","small","medium","large"] },
                "blocking": { "type": "boolean" },
                "resource_hints": { "type": "array", "items": { "type": "string" } }
              }
            }
          }
        }
      }
    }
  }
}
```

Drei Felder verdienen Erklärung:

- **`origin`** zwingt das Modell offenzulegen, ob ein Schritt aus realen Daten stammt oder
  erfunden wurde. Generierte Schritte werden im Produkt schwächer gewichtet und bevorzugt
  redaktionell geprüft.
- **`assumptions`** macht sichtbar, worauf der Plan beruht („angenommen, du hast keine
  gastronomische Vorerfahrung"). Falsche Annahmen sind der häufigste Grund für schlechte
  Pläne — sichtbar gemacht, kann der Nutzer sie sofort korrigieren.
- **`estimated_min` mit Obergrenze 480** erzwingt Zerlegung. Eine Aufgabe, die länger als
  einen Arbeitstag dauert, ist keine Aufgabe, sondern ein Meilenstein.

### System-Prompt (Struktur)

Aufgebaut nach Cache-Stabilität — stabile Teile zuerst, volatile zuletzt:

```
[stabil, gecacht]
  1. Rolle und Haltung (Planer, nicht Motivationstrainer; realistisch statt optimistisch)
  2. Qualitätsregeln (Reihenfolge, Abhängigkeiten, Ergebnisdefinitionen, Zeitrealismus)
  3. Verbote (keine Rechts-, Steuer-, Medizinberatung; keine erfundenen
     Fristen, Beträge, Behördennamen; bei Unsicherheit kennzeichnen)
  4. Domänenwissen der aktuellen Zieldomäne
  5. Abgerufene Playbook-Kontexte (Top-5)
--- Cache-Breakpoint ---
[volatil]
  6. Nutzerprofil (pseudonymisiert), Interviewantworten
  7. Heutiges Datum, Zielterminierung
  8. Bei Replanning: aktueller Stand, Check-in-Daten, Änderungswunsch
```

Zwei Regeln aus Block 3 sind besonders wichtig:

> *„Erfinde niemals konkrete Fristen, Gebührenhöhen, Formularnummern oder Behördennamen.
> Wenn eine solche Angabe nötig ist und nicht im bereitgestellten Kontext steht, formuliere
> die Aufgabe als Rechercheschritt."*

> *„Sei realistisch, nicht ermutigend. Ein zu optimistischer Plan schadet mehr als ein
> ernüchternder."*

---

## Schritt 4 — Validieren (deterministisch)

Neun Regeln, ohne Modell, in Millisekunden:

| # | Regel | Verstoß bedeutet |
|---|-------|------------------|
| 1 | Schemakonformität | harter Abbruch |
| 2 | Abhängigkeitsgraph ist azyklisch | Reparatur |
| 3 | Alle `depends_on`-Referenzen existieren | Reparatur |
| 4 | Summe der Meilensteindauern ≤ verfügbarer Zeitraum | Reparatur oder Umfangsreduktion |
| 5 | Wöchentliche Aufgabenlast ≤ `weekly_capacity_min` × 1,2 | Reparatur |
| 6 | Jeder Meilenstein hat eine prüfbare Ergebnisdefinition | Reparatur |
| 7 | Keine Aufgabe > 480 Minuten | Reparatur |
| 8 | Pflichtknoten des Playbooks vorhanden (z. B. Gewerbeanmeldung) | Reparatur |
| 9 | Keine unbelegten Zahlen-, Fristen- oder Behördenangaben (Regex + Abgleich) | Kennzeichnung oder Reparatur |

Regel 5 ist die praktisch wichtigste. Modelle neigen zu Optimismus; ohne diese Prüfung
entstehen Pläne, die 20 Stunden pro Woche verlangen, obwohl der Nutzer 6 hat — der
sicherste Weg zum Abbruch in Woche drei.

## Schritt 5 — Reparieren

Bei Verstößen wird derselben Modellinstanz die konkrete Fehlerliste zurückgegeben
(„Regel 5 verletzt: KW 12 enthält 940 Minuten bei einer Kapazität von 360"). Maximal zwei
Durchläufe. Danach: Rückfall auf das nächstähnliche Playbook-Template als Direktplan, plus
interne Meldung zur Prompt-Verbesserung.

## Schritt 6 — Terminieren (deterministisch)

Reine Berechnung: Meilensteinfenster werden per Rückwärtsterminierung vom Zieldatum
gesetzt, Aufgaben in freie Kalenderlücken einsortiert. Berücksichtigt werden Wochenenden
(sofern der Nutzer sie ausschließt), Feiertage nach Bundesland, bestehende Termine,
Pufferzeiten (Standard 20 %) und die Tageszeitpräferenz.

---

## Replanning

Der wichtigste wiederkehrende Vorgang — technisch ein zweiter Erzeugungslauf mit
zusätzlichem Kontext, aber mit einer entscheidenden Einschränkung:

> **Replanning darf das Ziel nicht ändern und keinen bereits abgeschlossenen Meilenstein
> anfassen.** Es darf Zeitfenster verschieben, Aufgaben neu zuschneiden, Reihenfolgen
> ändern, optionale Schritte entfernen und Zwischenschritte einfügen.

### Strategien nach Situation

| Situation | Strategie | Modell |
|-----------|-----------|--------|
| Leichter Rückstand (1–2 Aufgaben) | Verschieben, Puffer verbrauchen | keins (deterministisch) |
| Mittlerer Rückstand (eine Woche) | Aufgaben verkleinern, Reihenfolge optimieren | Sonnet 5 |
| Schwerer Rückstand (2+ Wochen) | Umfang reduzieren, Zwischenziel setzen, Zieldatum thematisieren | Opus 5 |
| Blockade („warte auf Behörde") | Umsortieren: nicht blockierte Schritte vorziehen | Sonnet 5 |
| Externes Ereignis (Finanzierung geplatzt) | Vollständiger Neuplan ab aktuellem Stand | Opus 5 |
| Schneller als geplant | Optionale Vertiefungen anbieten, Termin vorziehen | Sonnet 5 |

**Kein Modellaufruf bei leichtem Rückstand** — das ist der häufigste Fall und wird
deterministisch gelöst. Das spart erhebliche Kosten und ist zudem schneller und
vorhersagbarer.

### Die Härtefall-Regel

Wenn das Ziel im gesetzten Rahmen rechnerisch nicht mehr erreichbar ist, sagt Atlas das
klar:

> „Mit 6 Stunden pro Woche ist die Eröffnung im März nicht mehr realistisch — es fehlen
> etwa 9 Wochen. Drei Möglichkeiten: Eröffnung auf Mai verschieben · den Umfang
> reduzieren (zunächst ohne Backwerkstatt) · mehr Zeit einplanen (ca. 11 Std./Woche).
> Was passt am besten?"

Ein System, das schweigend weiter unrealistische Pläne erzeugt, verliert das Vertrauen des
Nutzers genau dann, wenn es am meisten gebraucht wird.

---

## Guardrails

| Risiko | Maßnahme |
|--------|----------|
| **Halluzinierte Fakten** | Regel 9 im Validator; alle regulatorischen Angaben stammen aus kuratierten Quellen, nicht aus dem Modell; unsichere Angaben werden als Rechercheschritt formuliert |
| **Rechts-/Steuer-/Medizinberatung** | Systemseitiges Verbot + Nachprüfung der Ausgabe; an solchen Stellen wird auf Fachpersonen verwiesen |
| **Prompt-Injection** (z. B. über importierte Dokumente) | Nutzerinhalte werden nie als Instruktion behandelt; strikte Rollentrennung; jede Ausgabe wird gegen das Schema validiert, bevor sie irgendetwas auslöst |
| **Gefährliche Ziele** | `safety_flag` in Schritt 1; definierte Abbruch- und Weiterleitungspfade |
| **Verzerrte Playbooks** | Menschliche Freigabe bei Änderungen > 15 %; regelmäßige Prüfung auf demografische Schieflagen |
| **Modellausfall** | Mehrstufiger Rückfall bis hin zum statischen Template |
| **Kostenexplosion** | Harte Obergrenzen pro Nutzer und Tag; Modell-Routing; deterministische Pfade wo möglich |

---

## Evaluation

Ohne systematische Messung ist Planqualität nicht steuerbar. Die Suite umfasst:

**Der Goldstandard-Satz.** 200 reale Zielbeschreibungen aus Nutzerforschung, verteilt über
alle Domänen, mit bekannten Schwierigkeiten (vage Ziele, unmögliche Ziele, sehr enge
Zeitrahmen, sehr geringe Kapazität, Sonderregionen).

**Automatische Metriken** (bei jedem Prompt- oder Modellwechsel):

| Metrik | Zielwert *(Annahme)* |
|--------|----------------------|
| Schemavalidität im ersten Versuch | > 97 % |
| Zyklenfreiheit | 100 % |
| Kapazitätskonformität (Regel 5) | > 95 % |
| Reparaturquote | < 8 % |
| Median-Latenz | < 12 s |
| Kosten pro Plan | < 0,20 € |

**Menschliche Bewertung** (Stichprobe 30 Pläne je Änderung), fünf Kriterien à 1–5:
Vollständigkeit · Reihenfolge · Realismus · Konkretheit · Ton.
Freigabekriterium: Durchschnitt ≥ 4,0, kein Einzelkriterium < 3,5.

**Produktivmessung:** Plan-Annahmequote ohne Änderung · Anteil manuell entfernter
Meilensteine · Abweichung geschätzte vs. reale Dauer · Abbruchquote je Meilenstein.

**Regel:** Kein Modell- oder Prompt-Wechsel geht ohne bestandene Evaluation in
Produktion. Diese Regel wird technisch erzwungen (Pipeline-Gate), nicht organisatorisch
vereinbart.

---

## Modellstrategie

Atlas ist auf die Claude-API aufgebaut, aber nicht daran gefesselt. Die interne
Abstraktion (`PlanningModel`-Interface mit `generate`, `repair`, `classify`) erlaubt einen
Anbieterwechsel ohne Produktänderung. Voraussetzungen an jedes Modell: strukturierte
Ausgaben mit erzwungenem Schema, ausreichendes Kontextfenster für die Playbook-Kontexte,
EU-Verarbeitungsoption oder ausreichende vertragliche Absicherung.

**Was Atlas nicht tut:** ein eigenes Modell trainieren. Der Vorteil liegt in den Daten
und der Pipeline, nicht in Modellgewichten. Ein feinabgestimmtes kleines Modell für die
Klassifikation (Schritt 1) ist ab hohem Volumen sinnvoll — das ist eine Kostenfrage,
keine Qualitätsfrage.
