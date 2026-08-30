# Architektur

## Der Aufbau in einem Bild

```
        KUNDEN-APP            ANBIETER-APP
        (React Native, eine Codebasis, zwei Oberflaechen)
              │                     │
              └──────────┬──────────┘
                         │  REST, Bearer-Token
                         ▼
                    services/api
                (modularer Monolith)
                         │
    ┌────────────────────┼────────────────────┐
    ▼                    ▼                    ▼
  Auth              KI-Service            Matching
  Sessions          (austauschbar)        (reine Funktion)
    │                    │                    │
    └────────────────────┼────────────────────┘
                         ▼
                   PostgreSQL
                         │
                   Object Storage (Fotos, spaeter)
```

## Warum ein modularer Monolith

Alles laeuft als eine Anwendung, ist innen aber nach Fachbereichen getrennt:
`auth`, `requests`, `ai`, `matching`, `offers`, `appointments`, `jobs`,
`conversations`, `reviews`.

Die Regel dabei: **kein Modul greift auf die Tabellen eines anderen zu**,
sondern nur auf dessen Service. Genau diese Trennung macht es spaeter moeglich,
einen Bereich herauszuloesen, wenn er wirklich eigene Ressourcen braucht.

Microservices von Anfang an waeren hier der falsche Preis: man bezahlt sofort
mit verteilten Transaktionen, Netzwerkfehlern und Betriebsaufwand — und kauft
sich dafuer eine Skalierbarkeit, die bei null Nutzern niemand braucht.

## Die drei Entscheidungen, auf die es ankommt

### 1. Die KI schreibt nie in die Datenbank

```
App  →  API  →  KI-Service  →  Ergebnis  →  Validierung  →  Datenbank
                                              ▲
                                     dasselbe Schema wie
                                   fuer Eingaben aus der App
```

Ein Sprachmodell ist keine vertrauenswuerdige Quelle. Es kann Felder
weglassen, Werte erfinden oder eine Kategorie nennen, die es nicht gibt. Das
Ergebnis geht deshalb durch `aiAnalysisResultSchema`, und ein unbekannter
Kategorie-Slug wird verworfen statt uebernommen
(`services/api/src/modules/ai/service.ts`).

Der Provider steckt hinter einer Schnittstelle (`AiProvider`). Mitgeliefert
ist ein regelbasierter Provider, der denselben Vertrag erfuellt — damit laesst
sich die gesamte Plattform ohne externen Dienst entwickeln und testen. Der
Wechsel auf ein Sprachmodell ist eine Zeile in der Konfiguration.

Ebenso wichtig: **die KI trifft keine verbindlichen Entscheidungen.** Sie
schlaegt einen Angebotstext vor — ueber Preis und Inhalt entscheidet das
Unternehmen. Sie erkennt eine Kategorie — ueberschreibt aber nie die Wahl des
Kunden.

### 2. Berechtigungen werden im Backend erzwungen, nicht in der App

Jede Abfrage, die fremde Daten liefern koennte, traegt die Pruefung in der
SQL-Bedingung — nicht in einem `if` davor. Beispiel aus
`RequestService.getForUser`:

```sql
WHERE r.id = $1
  AND (
    r.customer_id = $2
    OR EXISTS (            -- oder ein Unternehmen, dem sie vorgeschlagen wurde
      SELECT 1 FROM matches m
      JOIN business_members bm ON bm.business_id = m.business_id
      WHERE m.request_id = r.id AND bm.user_id = $2
    )
  )
```

Fremde Objekte antworten mit **404, nicht 403**. Ein 403 wuerde bestaetigen,
dass es das Objekt gibt — damit liessen sich durch Durchprobieren gueltige IDs
finden.

### 3. Wichtige Regeln stehen im Schema, nicht nur im Code

Anwendungslogik hat Fehler. Eine Datenbankzusicherung nicht.

- `offers.total_cents` ist eine generierte Spalte — die Summe kann gar nicht
  von den Positionen abweichen.
- `offers_one_accepted_per_request` ist ein Teilindex — zu einer Anfrage kann
  hoechstens ein Angebot angenommen sein, auch bei gleichzeitigen Aufrufen.
- `reviews.job_id` ist UNIQUE und verweist auf einen Auftrag — ohne echten,
  abgeschlossenen Auftrag gibt es keine Bewertung. Das ist der einfachste
  wirksame Schutz gegen erfundene Rezensionen.

## Sessions statt reiner Tokens

Das Token des Clients ist ein Zufallswert; die Datenbank speichert nur dessen
HMAC. Wer die Datenbank liest, kann sich damit nicht anmelden.

Bewusst **kein JWT ohne Serverzustand**: eine Abmeldung oder Sperrung soll
sofort wirken. Ein signiertes Token, das niemand zurueckziehen kann, gilt bis
zum Ablauf weiter — bei einem gesperrten Konto ist das nicht hinnehmbar.

## Das Matching

Die Bewertung ist eine reine Funktion ohne Datenbankzugriff
(`modules/matching/engine.ts`). Die Datenbank uebernimmt nur die Vorauswahl:
Kategorie, Einsatzradius, keine bereits abgelehnten Betriebe.

```
Passende Leistung   35        Ein Betrieb ausserhalb seines Einsatzradius
Entfernung          20        bekommt 0 Entfernungspunkte - er faehrt
Verfuegbarkeit      15        nicht hin, egal wie gut er sonst passt.
Bewertung           10
Preis               10        Wenige Bestbewertungen werden gedaempft:
Erfahrung            5        5,0 aus einer Bewertung soll 4,7 aus 200
Antwortzeit          5        nicht ueberholen.
──────────────────────
                   100        Fehlende Angaben zaehlen neutral (0,5),
                              nicht als Ausschluss - sonst haetten neue
                              Betriebe nie eine Chance.
```

Die Gewichte sind ein **Startmodell, keine Wahrheit**. Welche Faktoren
tatsaechlich zu Auftraegen fuehren, zeigt sich erst im Betrieb — deshalb liegen
sie an einer Stelle und getrennt von den Abfragen.

## Was bewusst noch fehlt

| Fehlt | Warum |
|---|---|
| Foto-Upload | Braucht Object Storage **und** Zugriffsschutz. Halb gebaut waere er ein Sicherheitsproblem: Fotos zeigen Wohnungen. |
| Zahlungen | Erst wenn Matching und Angebote nachweislich funktionieren. Kartendaten speichert JobFlow ohnehin nie selbst. |
| Push-Nachrichten | Braucht Geraeteregistrierung und einen Zustelldienst. |
| Web- und Admin-App | Siehe `apps/web/README.md` und `apps/admin/README.md`. |
| Mehrere Instanzen | Das Rate Limiting zaehlt im Arbeitsspeicher. Ab der zweiten Instanz gehoert der Zaehler in einen gemeinsamen Speicher. |
