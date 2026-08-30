# Entwicklungsplan

## Was fertig ist

### Phase 0 — Fundament ✅

- Monorepo mit pnpm-Workspaces
- PostgreSQL-Schema, zehn Migrationen mit Pruefsummenschutz
- Seed-Daten: 6 Ober- und 22 Unterkategorien
- Geteilte Typen, Validierung und Design-Tokens
- Authentifizierung, Rollen, Sessions
- 104 Tests, davon 22 gegen eine echte Datenbank

### Phase 1 — Kunden ✅ (ohne Fotos)

- Registrierung und Anmeldung
- Startseite, Kategorien
- Anfrage erstellen, ansehen, aendern, zurueckziehen
- KI-Analyse mit gezielten Rueckfragen
- „Meine Anfragen"

### Phase 2 — Unternehmen ✅

- Unternehmensprofil, Leistungen, Verfuegbarkeit
- Dashboard mit Kennzahlen
- Vorgeschlagene Anfragen oeffnen

### Phase 3 — Matching ✅

- Matching-Engine mit den Gewichten aus dem Konzept
- Nachvollziehbare Begruendungen je Vorschlag
- Verteilung der Anfragen an passende Betriebe

### Phase 4 — Auftraege ✅ (Backend vollstaendig)

- Angebote erstellen, annehmen, ablehnen, zurueckziehen
- Termine aus dem Wochenplan
- Chat je Anfrage und Unternehmen
- Auftragsstatus mit geprueften Uebergaengen
- Bewertungen

## Was als Naechstes kommt

### Phase 4b — Fotos

Der einzige Teil von Phase 1 bis 4, der noch fehlt. Er braucht Object Storage
**und** Zugriffsschutz: Fotos zeigen Wohnungen und Haeuser, und eine oeffentlich
erratbare URL waere ein ernstes Datenschutzproblem. Das Schema ist vorbereitet
(`request_photos.storage_key` — ein Schluessel, keine URL).

Konkret:
1. Object Storage anbinden, Upload ueber die API (nie direkt vom Client).
2. Zugriff nur ueber die API mit derselben Berechtigungspruefung wie bei der
   Anfrage.
3. Bildtyp und -groesse serverseitig pruefen, nicht dem Client glauben.

### Phase 5 — Business

- Abonnements (**erst nachdem echte Nutzer die Zahlungsbereitschaft gezeigt
  haben** — siehe `konzept.md`)
- Web-Dashboard fuer Unternehmen (`apps/web`)
- Administration (`apps/admin`)
- Unternehmensverifizierung als Ablauf
- Push-Nachrichten und E-Mail

### Phase 6 — Skalierung

Erst, wenn echte Nutzerzahlen es rechtfertigen:

- Rate Limiting in einen gemeinsamen Speicher (fuer mehrere Instanzen)
- Caching der Kategorien
- Suche
- Lasttests
- Monitoring

### Phase 7 — weitere Branchen

Technisch bereits moeglich: Kategorien sind Daten. Eine neue Branche ist eine
Zeile in `categories`, kein Umbau.

## Der naechste sinnvolle Schritt

**Echte Nutzer, eine Stadt, eine Branche.**

Die Plattform kann den kompletten Weg von der Anfrage bis zur Bewertung. Was
sie noch nicht kann, ist beantworten, ob Menschen sie benutzen wollen — und
diese Frage beantwortet kein weiteres Feature, sondern nur der Betrieb.

Konkret waere zu messen:
- Wie viele Anfragen erreichen ueberhaupt ein Angebot?
- Wie lange brauchen Betriebe wirklich zum Antworten?
- Stimmen die Gewichte des Matchings, oder fuehren ganz andere Faktoren zu
  Auftraegen?

Auf diese Antworten sind die Gewichte, die Preise und die Rueckfragen der KI
bewusst so gebaut, dass sie sich aendern lassen.
