# apps/admin — noch nicht gebaut

Hier entsteht die Administration: Unternehmen prüfen, Meldungen bearbeiten,
Kategorien verwalten, Nutzer sperren.

**Warum noch nicht:** Eine Admin-Oberfläche wird in dem Moment gebraucht, in
dem echte Nutzer dazukommen — nicht vorher. Was sie können muss, hängt davon
ab, welche Fälle tatsächlich auftreten.

**Was schon steht:** Das Datenmodell trägt die Administration bereits:

- `users.blocked_at` — gesperrte Konten können sich nicht anmelden, und
  bestehende Sessions verlieren sofort ihre Gültigkeit
  (`AuthService.authenticate` prüft das bei jeder Anfrage).
- `businesses.verified` / `verified_at` — die Unternehmensverifizierung.
- `categories` — Kategorien sind Daten und lassen sich pflegen, ohne die
  Anwendung neu auszuliefern.
- `audit_log` — jede sicherheitsrelevante Aktion ist protokolliert.
- `analytics_events` — der Funnel von der Anfrage bis zum Auftrag.

Es fehlt die Oberfläche darauf, nicht das Fundament darunter.

Geplant für Phase 5 (siehe `docs/product/entwicklungsplan.md`).
