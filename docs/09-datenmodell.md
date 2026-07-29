# 09 — Datenmodell

## Zwei Datenwelten

Atlas hat zwei klar getrennte Datenbereiche mit unterschiedlichen Regeln:

| | **Nutzerdaten** | **Playbook-Graph** |
|---|---|---|
| Inhalt | Ziele, Pläne, Fortschritt einer Person | Aggregierte, anonymisierte Zielpfade |
| Personenbezug | ja | nein (k-Anonymität ≥ 25) |
| Löschung | vollständig auf Anforderung | bleibt bestehen (nicht rückführbar) |
| Zweck | das Produkt betreiben | das Produkt für alle besser machen |
| Zugriff | strikt mandanten- und nutzergetrennt | intern, aggregiert |

Diese Trennung ist gleichzeitig Datenschutz-Architektur und Geschäftsmodell-Fundament.
Sie muss von Anfang an technisch durchgesetzt werden — nachträglich ist sie kaum
herstellbar.

---

## Kernentitäten (Nutzerdaten)

### Übersicht

```
User ──1:n──> Goal ──1:n──> Milestone ──1:n──> Task
 │              │                                │
 │              ├──1:n──> PlanRevision           ├──1:n──> TaskEvent
 │              ├──1:n──> CheckIn                └──n:m──> Resource
 │              └──n:1──> PlaybookTemplate
 │
 ├──1:1──> Subscription
 ├──1:n──> Consent
 ├──1:n──> CalendarConnection
 ├──0:n──> CohortMembership
 └──0:n──> OrgMembership
```

### `users`

| Feld | Typ | Anmerkung |
|------|-----|-----------|
| `id` | uuid PK | |
| `email` | citext unique | verschlüsselt gespeichert, gehasht indiziert |
| `display_name` | text | optional |
| `locale`, `timezone` | text | `de-DE`, `Europe/Berlin` |
| `postal_code_prefix` | text(3) | **nur die ersten 3 Stellen** — reicht für Behördenpfade, ist deutlich weniger identifizierend |
| `weekly_capacity_min` | int | verfügbare Minuten/Woche |
| `notification_prefs` | jsonb | Kanäle, Zeitfenster, Frequenz |
| `created_at`, `deleted_at` | timestamptz | Soft Delete mit 30-Tage-Frist, dann Hard Delete |

### `goals`

| Feld | Typ | Anmerkung |
|------|-----|-----------|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `raw_input` | text | Originalformulierung — **verschlüsselt** |
| `normalized_title` | text | „Café eröffnen" |
| `domain` | enum | `founding`, `health`, `learning`, `career`, `finance`, `other` |
| `intent_key` | text | Kanonischer Schlüssel, z. B. `founding.gastronomy.cafe` — Verbindung zum Playbook |
| `target_date` | date | |
| `status` | enum | `draft`, `proposed`, `active`, `paused`, `completed`, `abandoned` |
| `context` | jsonb | Interviewantworten (Budget, Erfahrung, Einschränkungen) |
| `playbook_template_id` | uuid FK null | Ursprungsvorlage, falls verwendet |
| `completed_at`, `abandoned_reason` | | für Playbook-Auswertung |

### `milestones`

| Feld | Typ | Anmerkung |
|------|-----|-----------|
| `id`, `goal_id` | uuid | |
| `position` | int | Reihenfolge im Pfad |
| `title` | text | |
| `definition_of_done` | text | „Fertig, wenn …" — zentral für Klarheit |
| `window_start`, `window_end` | date | Zeitfenster, nicht Fixtermin |
| `depends_on` | uuid[] | Vorbedingungen (Grundlage der Zyklenprüfung) |
| `status` | enum | `pending`, `active`, `done`, `skipped` |
| `playbook_node_id` | uuid null | Herkunft im Graphen |
| `origin` | enum | `playbook`, `generated`, `user` — Herkunft jedes Schritts ist nachvollziehbar |

### `tasks`

| Feld | Typ | Anmerkung |
|------|-----|-----------|
| `id`, `milestone_id` | uuid | |
| `title`, `why`, `how` | text | Was, warum, wie |
| `estimated_min` | int | Zeitschätzung |
| `due_at` | timestamptz | |
| `difficulty` | enum | `micro` (<15 min), `small`, `medium`, `large` |
| `blocking` | bool | blockiert der Schritt den Meilenstein? |
| `status` | enum | `open`, `done`, `deferred`, `dismissed` |
| `deferred_count` | int | **wichtigstes Replanning-Signal** |
| `origin` | enum | wie oben |

### `plan_revisions`

Jede Planänderung wird als vollständige, unveränderliche Revision gespeichert.

| Feld | Typ | Anmerkung |
|------|-----|-----------|
| `id`, `goal_id` | uuid | |
| `revision` | int | fortlaufend |
| `trigger` | enum | `initial`, `weekly`, `missed_tasks`, `user_event`, `user_edit` |
| `diff` | jsonb | strukturierte Änderungen |
| `rationale` | text | die dem Nutzer gezeigte Begründung |
| `model_id`, `prompt_version`, `input_tokens`, `output_tokens`, `latency_ms` | | vollständige Nachvollziehbarkeit und Kostenzuordnung |

Diese Tabelle erfüllt drei Zwecke gleichzeitig: Nachvollziehbarkeit für den Nutzer,
Kostentransparenz pro Ziel, und Auditierbarkeit der KI-Entscheidungen für den AI Act.

### `check_ins`

| Feld | Typ |
|------|-----|
| `id`, `goal_id`, `week_of` | |
| `available_min` | int |
| `blockers` | text[] — `time`, `unclear`, `waiting`, `motivation`, `money`, `other` |
| `mood` | int 1–5 (optional) |
| `note` | text (verschlüsselt) |

### `task_events`

Append-only Ereignisstrom — die Rohdatenquelle für den Playbook-Graphen.

`id · task_id · type (viewed, started, completed, deferred, dismissed) · at · source
(app, web, widget, calendar)`

### Weitere Entitäten

| Entität | Zweck |
|---------|-------|
| `resources` | Kuratierte Inhalte: Typ, URL, Titel, Lesedauer, `valid_until`, Domänen-Tags |
| `subscriptions` | Tarif, Anbieter (stripe/apple/google), Status, Periode |
| `consents` | Einwilligungen einzeln, versioniert, mit Zeitstempel und Widerruf |
| `calendar_connections` | Anbieter, verschlüsselte Token, Sync-Richtung, letzter Abgleich |
| `cohorts` / `cohort_memberships` | Gruppen nach `intent_key` + Startfenster |
| `organizations` / `org_memberships` | B2B-Mandanten, Rollen, freigegebene Sichtbarkeit |
| `partner_offers` / `partner_referrals` | Katalog, Auslöser-Meilenstein, Vermittlungsereignisse, Provisionen |

---

## Der Playbook-Graph

Das eigentliche Kapital. Formal ein gerichteter azyklischer Graph pro `intent_key`, in dem
Knoten Meilensteine und Kanten Abfolgen mit Häufigkeiten sind.

### `playbook_templates`

| Feld | Anmerkung |
|------|-----------|
| `intent_key` | `founding.gastronomy.cafe` |
| `version` | versioniert, alte Pläne bleiben reproduzierbar |
| `region` | `DE`, `DE-BY`, `AT` — Behördenlogik ist regional |
| `sample_size` | Anzahl der zugrunde liegenden realen Verläufe |
| `confidence` | 0–1, abgeleitet aus `sample_size` und Streuung |
| `embedding` | vector(1536) für Ähnlichkeitssuche |
| `source` | `expert` (redaktionell), `derived` (aus Daten), `hybrid` |

### `playbook_nodes`

| Feld | Anmerkung |
|------|-----------|
| `title`, `definition_of_done` | |
| `typical_duration_days` | **Median der realen Verläufe**, nicht Schätzung |
| `p10_duration`, `p90_duration` | Streuung → realistische Zeitfenster statt Optimismus |
| `dropout_rate` | Anteil der Nutzer, die hier abbrechen — die wertvollste Kennzahl im ganzen System |
| `common_blockers` | jsonb, aus Check-in-Daten aggregiert |
| `success_correlates` | jsonb: was unterscheidet Erfolgreiche von Abbrechenden |
| `required_before` | uuid[] |

### `playbook_edges`

`from_node · to_node · frequency · median_gap_days · success_delta`

`success_delta` beantwortet die interessanteste Frage überhaupt: *Erhöht diese Reihenfolge
die Abschlusswahrscheinlichkeit?* Beispiel aus der Gründungsdomäne: Wer die
Standortanalyse **vor** dem Businessplan macht, schließt messbar häufiger ab — solche
Erkenntnisse sind nicht generierbar, nur beobachtbar.

### Wie der Graph entsteht (ETL, wöchentlich)

```
1. Alle in der Woche abgeschlossenen/abgebrochenen Ziele je intent_key sammeln
2. Personenbezug entfernen (Pseudonymisierung, Freitext verwerfen)
3. k-Anonymität prüfen: < 25 Verläufe → keine Aggregation, Daten bleiben ungenutzt
4. Meilensteinsequenzen normalisieren (Titel-Clustering per Embedding)
5. Kennzahlen berechnen: Mediandauer, p10/p90, Abbruchquoten, Kantenhäufigkeiten
6. Kandidat für neue Template-Version erzeugen
7. Redaktionelle Freigabe (menschlich) bei Änderungen > 15 % gegenüber Vorversion
8. Version veröffentlichen; laufende Pläne bleiben auf ihrer Version
```

**Schritt 7 ist nicht verhandelbar.** Ein automatisch aktualisierter Plangenerator, der
aus verzerrten Daten lernt, kann systematisch schlechte Ratschläge verbreiten. Ein Mensch
schaut drauf.

### Die Kaltstart-Frage

Am ersten Tag hat der Graph null Verläufe. Die Lösung in drei Stufen:

| Phase | Quelle der Playbooks | `confidence` |
|-------|----------------------|--------------|
| **Monat 1–3 (Bootstrap)** | Redaktionell erstellt: 12 Playbooks für die häufigsten Gründungsvorhaben, aus IHK-Leitfäden, Fachliteratur und **15 Interviews mit realen Gründenden** | 0,5 |
| **Monat 4–9 (Hybrid)** | Redaktionelle Basis + erste Nutzerdaten korrigieren Dauern und Abbruchstellen | 0,6–0,75 |
| **ab Monat 10 (Datengetrieben)** | Überwiegend abgeleitet, redaktionell geprüft | > 0,8 |

Die 15 Interviews sind die günstigste und wirksamste Einzelinvestition des gesamten
Projekts — sie erzeugen den Startwert des Kapitals, das später den Graben bildet.

---

## Indizes und Leistung

```sql
-- Der häufigste Zugriff überhaupt: "Was ist heute zu tun?"
CREATE INDEX idx_tasks_today ON tasks (milestone_id, status, due_at)
  WHERE status = 'open';

-- Zielübersicht
CREATE INDEX idx_goals_user_active ON goals (user_id, status)
  WHERE status IN ('active','paused');

-- Playbook-Ähnlichkeitssuche
CREATE INDEX idx_playbook_embedding ON playbook_templates
  USING hnsw (embedding vector_cosine_ops);

-- Erinnerungs-Scheduler
CREATE INDEX idx_tasks_due ON tasks (due_at) WHERE status = 'open';
```

Mandantentrennung durchgehend über Row-Level-Security; jede Verbindung setzt
`app.current_user_id` bzw. `app.current_org_id`.

---

## Aufbewahrung und Löschung

| Daten | Aufbewahrung |
|-------|--------------|
| Aktives Konto | solange die Nutzung besteht |
| Nach Kündigung | 30 Tage Soft Delete (Wiederherstellung möglich), dann Hard Delete |
| `task_events` | 24 Monate, danach nur aggregiert |
| Rechnungsdaten | 10 Jahre (handels- und steuerrechtlich) |
| Modell-Ein-/Ausgaben | **nicht dauerhaft gespeichert**; nur Metadaten (Token, Modell, Latenz) in `plan_revisions` |
| Playbook-Aggregate | unbegrenzt (kein Personenbezug) |

**Löschung eines Kontos** entfernt alle personenbezogenen Daten. Bereits in Aggregate
eingeflossene, k-anonymisierte Beiträge bleiben bestehen — darauf wird in der
Datenschutzerklärung und beim Löschvorgang ausdrücklich hingewiesen.

## Export

Ein Klick, drei Formate: **JSON** (vollständig, maschinenlesbar), **Markdown** (lesbarer
Plan mit allen Meilensteinen und Aufgaben), **ICS** (alle Termine für den eigenen
Kalender). Ohne Rückfrage, ohne Wartezeit, ohne Bedingung.
