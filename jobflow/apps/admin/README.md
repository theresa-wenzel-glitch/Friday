# apps/admin — noch nicht gebaut

Hier entsteht die Administration: Unternehmen pruefen, Meldungen bearbeiten,
Kategorien verwalten, Nutzer sperren.

**Warum noch nicht:** Eine Admin-Oberflaeche wird in dem Moment gebraucht, in
dem echte Nutzer dazukommen — nicht vorher. Was sie koennen muss, haengt davon
ab, welche Faelle tatsaechlich auftreten.

**Was schon steht:** Das Datenmodell traegt die Administration bereits:

- `users.blocked_at` — gesperrte Konten koennen sich nicht anmelden, und
  bestehende Sessions verlieren sofort ihre Gueltigkeit
  (`AuthService.authenticate` prueft das bei jeder Anfrage).
- `businesses.verified` / `verified_at` — die Unternehmensverifizierung.
- `categories` — Kategorien sind Daten und lassen sich pflegen, ohne die
  Anwendung neu auszuliefern.
- `audit_log` — jede sicherheitsrelevante Aktion ist protokolliert.
- `analytics_events` — der Funnel von der Anfrage bis zum Auftrag.

Es fehlt die Oberflaeche darauf, nicht das Fundament darunter.

Geplant fuer Phase 5 (siehe `docs/product/entwicklungsplan.md`).
