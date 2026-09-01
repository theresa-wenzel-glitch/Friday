# JobFlow

> **Von der Anfrage zum Auftrag.**

Der Kunde beschreibt sein Problem in einem Satz. Die KI versteht es, fragt nur
das Nötige nach und macht daraus eine strukturierte Anfrage. JobFlow findet
passende Anbieter, der Kunde vergleicht Angebote, wählt einen Termin — fertig.

```
Anfrage → KI → Rückfragen → Matching → Angebot → Termin → Auftrag → Bewertung
```

Dieser komplette Weg funktioniert und ist als End-to-End-Test abgesichert
(`services/api/test/flow.test.ts`).

## Erst einmal ansehen

Ohne Installation: [`docs/vorschau/jobflow-app.html`](docs/vorschau/jobflow-app.html)
im Browser öffnen — die App selbst, mit Konto und gespeicherten Daten. Wer
stattdessen sehen möchte, welcher API-Aufruf hinter jedem Schritt steckt, nimmt
[`docs/vorschau/jobflow-vorschau.html`](docs/vorschau/jobflow-vorschau.html).

Zum Ausliefern: [`VEROEFFENTLICHEN.md`](VEROEFFENTLICHEN.md). Eine einzelne Datei, die den gesamten Ablauf klickbar macht —
Kundenseite und Unternehmensseite, vom Willkommensbildschirm bis zur Bewertung.

Die Regel-KI und die Matching-Berechnung darin sind aus dem Backend übernommen:
beschreib ein anderes Problem, und beides rechnet neu. Die Steuerleiste zeigt zu
jeder Aktion den API-Aufruf, den die echte App absetzen würde.

## Schnellstart

Voraussetzungen: **Node ≥ 22.6**, **pnpm**, **PostgreSQL ≥ 14**.

```bash
cd jobflow
pnpm install
pnpm build                      # die geteilten Pakete bauen (dist/)

cp .env.example .env            # DATABASE_URL und SESSION_SECRET anpassen
createdb jobflow
pnpm db:migrate
pnpm db:seed                    # 6 Ober- und 22 Unterkategorien

pnpm api:dev                    # API auf http://localhost:4000
pnpm mobile:start               # Expo in einem zweiten Terminal
```

Ein sicheres `SESSION_SECRET` erzeugen:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Die API startet nicht, wenn das Geheimnis fehlt oder zu kurz ist. Ein Backend,
das mit einem Standardgeheimnis hochfährt, ist gefährlicher als eines, das
sich weigert.

### Ausprobieren ohne App

```bash
TOKEN=$(curl -s -X POST localhost:4000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"max@example.de","name":"Max Mustermann","password":"ein-langes-passwort"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

REQ=$(curl -s -X POST localhost:4000/requests \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"description":"Meine Heizung wird nicht mehr richtig warm.","locationLabel":"45127 Essen"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

curl -s -X POST "localhost:4000/requests/$REQ/analyze" \
  -H "authorization: Bearer $TOKEN" | python3 -m json.tool
```

Die Analyse erkennt die Kategorie „Heizung" und stellt zwei bis drei gezielte
Rückfragen — ohne dass ein externer KI-Dienst konfiguriert sein muss.

## Aufbau

```
jobflow/
├── apps/
│   ├── mobile/        React Native + Expo Router   ← gebaut
│   ├── web/           Next.js, Unternehmen         ← Phase 5
│   └── admin/         Administration               ← Phase 5
├── services/
│   └── api/           Node + TypeScript            ← gebaut
├── packages/
│   ├── types/         gemeinsame Domänentypen
│   ├── validation/    gemeinsame Validierung, ohne Abhängigkeiten
│   ├── config/        Design-Tokens
│   └── ui/            geteilte Komponenten         ← sobald es zwei Oberflächen gibt
├── database/          Migrationen und Seeds
└── docs/
    ├── product/       Konzept und Entwicklungsplan
    ├── architecture/  Aufbau und die Entscheidungen dahinter
    └── api/           alle Endpunkte
```

Die nicht gebauten Teile haben eine README, die erklärt, warum — und was
bereits für sie vorbereitet ist.

## Die Entscheidungen, auf die es ankommt

**Die KI schreibt nie in die Datenbank.** Ihr Ergebnis wird gegen dasselbe
Schema geprüft wie eine Eingabe aus der App; eine erfundene Kategorie wird
verworfen. Der Provider steckt hinter einer Schnittstelle — mitgeliefert ist
ein regelbasierter, der denselben Vertrag erfüllt. So lässt sich die ganze
Plattform ohne externen Dienst entwickeln, und der Wechsel auf ein
Sprachmodell ist eine Zeile in der Konfiguration.

**Die KI entscheidet nichts Verbindliches.** Sie schlägt einen Angebotstext
vor — über Preis und Inhalt entscheidet das Unternehmen. KI-Inhalte sind in
der Oberfläche als solche gekennzeichnet.

**Berechtigungen prüft ausschließlich der Server.** Fremde Objekte antworten
mit 404 statt 403: ein 403 würde bestätigen, dass es das Objekt gibt.

**Wichtige Regeln stehen im Schema.** Die Angebotssumme ist eine generierte
Spalte, „höchstens ein angenommenes Angebot je Anfrage" ein Teilindex, und
ohne abgeschlossenen Auftrag gibt es keine Bewertung. Anwendungslogik hat
Fehler; eine Datenbankzusicherung nicht.

**Kategorien sind Daten.** Eine neue Branche ist eine Zeile in `categories`,
kein Umbau.

Ausführlich: [`docs/architecture/übersicht.md`](docs/architecture/übersicht.md)

## Tests

```bash
pnpm test
```

104 Tests. 82 laufen überall; 22 brauchen eine PostgreSQL-Datenbank und
überspringen sich sonst, statt fehlzuschlagen:

```bash
createdb jobflow_test
TEST_DATABASE_URL=postgres://localhost/jobflow_test pnpm test
```

Die Integrationstests laufen gegen eine **echte** Datenbank. Ein Nachbau wäre
hier wertlos: die interessanten Zusicherungen stecken im Schema selbst, und
ohne Datenbank wäre keine davon getestet. Jeder Lauf baut das Schema neu auf —
deshalb laufen die Testdateien nacheinander.

```bash
pnpm typecheck    # alle sechs Pakete, inklusive Tests und Mobile-App
```

## Umgebungsvariablen

Siehe [`.env.example`](.env.example). Die wichtigsten:

| Variable | Zweck |
|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindung |
| `SESSION_SECRET` | Signiert die Session-Token, mindestens 32 Zeichen |
| `AI_PROVIDER` | `rules` (eingebaut) oder `remote` (externer Dienst) |
| `CORS_ORIGINS` | Erlaubte Web-Oberflächen, kommagetrennt |

## Weiterlesen

- [Produktkonzept](docs/product/konzept.md) — die Idee, das Geschäftsmodell, die Kennzahlen
- [Entwicklungsplan](docs/product/entwicklungsplan.md) — was fertig ist, was fehlt, was als Nächstes sinnvoll ist
- [Architektur](docs/architecture/übersicht.md) — der Aufbau und die Begründungen
- [API](docs/api/endpunkte.md) — alle Endpunkte, Fehlercodes, Rate Limits
