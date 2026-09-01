# JobFlow veröffentlichen

Dieses Paket enthält nur den Laufzeit-Code: keine Testdateien, keine
Testkonfiguration. Es baut und typprüft vollständig.

## Was hier drin ist

| Teil | Was es ist | Bereit? |
|---|---|---|
| `services/api` | Backend, Node + TypeScript | ja |
| `database` | PostgreSQL-Schema als Migrationen | ja |
| `packages/*` | Geteilte Typen, Validierung, Design-Tokens | ja |
| `apps/mobile` | React-Native-App für iOS und Android | Build fehlt noch |
| `docs/vorschau/jobflow-app.html` | Die App als Web-Fassung ohne Server | ja |

## Das Backend ausliefern

Voraussetzungen: **Node ≥ 22.6**, **PostgreSQL ≥ 14**.

```bash
pnpm install
pnpm build                  # erzeugt services/api/dist

createdb jobflow
DATABASE_URL=... pnpm db:migrate
DATABASE_URL=... pnpm db:seed        # legt die Kategorien an

# Starten
NODE_ENV=production \
DATABASE_URL=postgres://benutzer:passwort@host:5432/jobflow \
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
PORT=4000 \
node services/api/dist/index.js
```

Die API **startet nicht**, wenn `SESSION_SECRET` fehlt, kürzer als 32 Zeichen
ist oder noch auf dem Beispielwert steht. Das ist Absicht: ein Backend, das mit
einem Standardgeheimnis hochfährt, ist gefährlicher als eines, das sich weigert.

### Vor dem ersten echten Nutzer

- **HTTPS davor.** Die API spricht HTTP; Verschlüsselung übernimmt der Reverse
  Proxy (nginx, Caddy, die Plattform deines Anbieters).
- **`CORS_ORIGINS` setzen** auf die Adressen, unter denen deine Weboberfläche
  läuft. Ohne Eintrag kommt kein Browser-Client durch — Absicht.
- **Datenbank sichern.** Ein Backup-Plan gehört vor den ersten Nutzer, nicht
  nach dem ersten Verlust.
- **`NODE_ENV=production`**, sonst bleibt die ausführliche Protokollierung an.

## Die Mobile-App ausliefern

```bash
cd apps/mobile
# apiUrl in app.json auf deine öffentliche API-Adresse setzen
npx expo start          # zum Ausprobieren
npx eas build           # Build für App Store und Play Store
```

Für die Stores brauchst du zusätzlich Entwicklerkonten bei Apple und Google,
Symbole und Startbildschirme sowie eine Datenschutzerklärung.

## Die Web-Fassung ausliefern

`docs/vorschau/jobflow-app.html` ist eine einzelne Datei. Sie auf einen
beliebigen Webspace legen — fertig. Sie läuft ohne Server; alles bleibt im
Browser des Besuchers.

## Was für echte Nutzer noch fehlt

| Fehlt | Warum es zählt |
|---|---|
| **Foto-Upload** | Im Schema vorbereitet (`request_photos.storage_key`). Braucht Object Storage **und** Zugriffsschutz — Fotos zeigen Wohnungen. |
| **Zahlungen** | Erst wenn Matching und Angebote nachweislich funktionieren. Kartendaten speichert JobFlow ohnehin nie selbst. |
| **Benachrichtigungen** | Ohne Push oder E-Mail erfährt ein Betrieb nicht, dass eine Anfrage da ist. Das ist der wichtigste fehlende Baustein. |
| **Administration** | Unternehmen prüfen, Meldungen bearbeiten, Nutzer sperren. Das Datenmodell trägt es bereits. |
| **Rechtliches** | Impressum, AGB, Datenschutzerklärung, Auftragsverarbeitung. Bei einem Marktplatz mit Standortdaten und Wohnungsfotos kein Nebenpunkt. |

## Ein Hinweis zu den Tests

Dieses Paket ist auf Wunsch ohne Testdateien geschnürt. Im Repository bleiben
sie erhalten — 104 Tests, davon 22 gegen eine echte PostgreSQL-Datenbank.
Sie werden nicht mit ausgeliefert und kosten im Betrieb nichts; sie sind das,
was spätere Änderungen sicher macht. Wenn du den Code weiterentwickeln lässt,
lohnt es sich, sie mitzugeben.
