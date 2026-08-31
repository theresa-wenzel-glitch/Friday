# Entwicklungsplan

## Was fertig ist

### Phase 0 — Fundament ✅

- Monorepo mit pnpm-Workspaces
- PostgreSQL-Schema, zehn Migrationen mit Prüfsummenschutz
- Seed-Daten: 6 Ober- und 22 Unterkategorien
- Geteilte Typen, Validierung und Design-Tokens
- Authentifizierung, Rollen, Sessions
- 104 Tests, davon 22 gegen eine echte Datenbank

### Phase 1 — Kunden ✅ (ohne Fotos)

- Registrierung und Anmeldung
- Startseite, Kategorien
- Anfrage erstellen, ansehen, ändern, zurückziehen
- KI-Analyse mit gezielten Rückfragen
- „Meine Anfragen"

### Phase 2 — Unternehmen ✅

- Unternehmensprofil, Leistungen, Verfügbarkeit
- Dashboard mit Kennzahlen
- Vorgeschlagene Anfragen öffnen

### Phase 3 — Matching ✅

- Matching-Engine mit den Gewichten aus dem Konzept
- Nachvollziehbare Begründungen je Vorschlag
- Verteilung der Anfragen an passende Betriebe

### Phase 4 — Aufträge ✅ (Backend vollständig)

- Angebote erstellen, annehmen, ablehnen, zurückziehen
- Termine aus dem Wochenplan
- Chat je Anfrage und Unternehmen
- Auftragsstatus mit geprueften Übergängen
- Bewertungen

## Was als Nächstes kommt

### Phase 4b — Fotos

Der einzige Teil von Phase 1 bis 4, der noch fehlt. Er braucht Object Storage
**und** Zugriffsschutz: Fotos zeigen Wohnungen und Häuser, und eine öffentlich
erratbare URL wäre ein ernstes Datenschutzproblem. Das Schema ist vorbereitet
(`request_photos.storage_key` — ein Schluessel, keine URL).

Konkret:
1. Object Storage anbinden, Upload über die API (nie direkt vom Client).
2. Zugriff nur über die API mit derselben Berechtigungsprüfung wie bei der
   Anfrage.
3. Bildtyp und -größe serverseitig prüfen, nicht dem Client glauben.

### Phase 5 — Business

- Abonnements (**erst nachdem echte Nutzer die Zahlungsbereitschaft gezeigt
  haben** — siehe `konzept.md`)
- Web-Dashboard für Unternehmen (`apps/web`)
- Administration (`apps/admin`)
- Unternehmensverifizierung als Ablauf
- Push-Nachrichten und E-Mail

### Phase 6 — Skalierung

Erst, wenn echte Nutzerzahlen es rechtfertigen:

- Rate Limiting in einen gemeinsamen Speicher (für mehrere Instanzen)
- Caching der Kategorien
- Suche
- Lasttests
- Monitoring

### Phase 7 — weitere Branchen

Technisch bereits möglich: Kategorien sind Daten. Eine neue Branche ist eine
Zeile in `categories`, kein Umbau.

## Der nächste sinnvolle Schritt

**Echte Nutzer, eine Stadt, eine Branche.**

Die Plattform kann den kompletten Weg von der Anfrage bis zur Bewertung. Was
sie noch nicht kann, ist beantworten, ob Menschen sie benutzen wollen — und
diese Frage beantwortet kein weiteres Feature, sondern nur der Betrieb.

Konkret wäre zu messen:
- Wie viele Anfragen erreichen überhaupt ein Angebot?
- Wie lange brauchen Betriebe wirklich zum Antworten?
- Stimmen die Gewichte des Matchings, oder führen ganz andere Faktoren zu
  Aufträgen?

Auf diese Antworten sind die Gewichte, die Preise und die Rückfragen der KI
bewusst so gebaut, dass sie sich ändern lassen.
