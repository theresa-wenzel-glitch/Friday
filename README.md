# Reining Stallions — Hengstdatenbank

Eine offene Übersicht über Reining-Hengste aus Europa, den USA und dem Rest der
Welt: Grunddaten, Fotos, Abstammung mit Verknüpfung zu
[allbreedpedigree.com](https://www.allbreedpedigree.com) und der direkte Kontakt
zum Besitzer.

Der Unterschied zu bestehenden Plattformen: Hier geht es nicht um den Verkauf
einer Decktaxe, sondern um die vollständige Übersicht. Jeder Besitzer kann sich
mit einer E-Mail-Adresse anmelden und eigene Hengste eintragen.

## Was die App kann

- **Hengste durchsuchen und filtern** nach Region (Europa / USA & Kanada /
  übrige Welt), Land, Rasse, Disziplin, Decktaxe und Verfügbarkeit
  (Frischsamen, Tiefgefriersamen, Natursprung).
- **Detailseite je Hengst** mit Steckbrief, Fotogalerie, Erfolgen, Nachkommen
  und Gentest-Ergebnissen (HYPP, HERDA, GBED, PSSM1, MH, IMM).
- **Abstammung über drei Generationen** — jeder Vorfahre ist mit
  allbreedpedigree.com verlinkt, wo der vollständige Stammbaum liegt.
- **Anmeldung mit E-Mail und Passwort**, danach eigene Hengste anlegen,
  bearbeiten, veröffentlichen oder als Entwurf halten.
- **Fotos** hochladen (bis 5 MB, liegen in der Datenbank) oder per Link einbinden.
- **Kontakt zum Besitzer**: E-Mail-Adresse steht am Hengst, dazu ein
  Anfrageformular, dessen Nachrichten im Bereich des Besitzers landen.
- **Grunddatenbank** mit 24 bekannten Vererbern, damit die Seite vom ersten Tag
  an brauchbar ist.

## Starten

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
cp .env.example .env       # danach AUTH_SECRET in .env ändern!
npm run setup              # Datenbank anlegen und Grunddaten einspielen
npm run dev                # läuft auf http://localhost:3000
```

`AUTH_SECRET` muss mindestens 32 Zeichen lang sein. Einen sicheren Wert erzeugt
z. B. `openssl rand -base64 32`.

### Nützliche Befehle

| Befehl            | Wirkung                                |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Entwicklungsserver                     |
| `npm run build`   | Produktions-Build                      |
| `npm start`       | Produktionsserver (nach `build`)       |
| `npm run db:push` | Datenbankschema anwenden               |
| `npm run db:seed` | Grunddaten einspielen bzw. auffrischen |

Das Seed-Skript ist wiederholbar: Referenzeinträge werden aktualisiert, selbst
eingetragene Hengste bleiben unangetastet.

## Zu den Grunddaten

Die 24 vorgegebenen Hengste sind **Referenzeinträge** und als solche auf der
Detailseite gekennzeichnet. Bewusste Entscheidungen dabei:

- Es stehen nur Angaben drin, die als gesichert gelten. Unsichere Felder
  (Geburtsjahr, Großeltern, Station) bleiben leer, statt geraten zu werden — in
  einer Abstammungsdatenbank ist eine Lücke besser als ein falscher Vater.
- **Geburtsjahre und Abstammungen sollten vor dem Livegang gegengeprüft
  werden**, am besten über den All-Breed-Link auf der jeweiligen Detailseite.
- Es sind **keine Kontaktdaten** hinterlegt. Adressen realer Personen werden
  nicht erfunden; Besitzer tragen sie selbst ein.
- Standort und Decktaxe fehlen bewusst — beides ändert sich jede Saison.

Weitere Hengste kommen in `prisma/seed.ts` dazu; danach `npm run db:seed`.

## Technik

- **Next.js 15** (App Router, React 19, Server Actions) mit TypeScript
- **Prisma 6** auf **SQLite** — eine Datei, kein Datenbankserver nötig
- Anmeldung über ein signiertes Cookie (`jose`), Passwörter mit `bcryptjs`
- Handgeschriebenes CSS in `src/app/globals.css`, keine UI-Bibliothek, keine
  externen Schriften — die Seite lädt nichts von fremden Servern nach
- Helles und dunkles Design je nach Systemeinstellung

### Aufbau

```
prisma/schema.prisma      Datenmodell
prisma/seed.ts            Grunddatenbank bekannter Vererber
src/app/                  Seiten (Start, Hengste, Detail, Login, Mein Bereich)
src/app/actions/          Server Actions (Anmeldung, Hengste, Fotos, Anfragen)
src/components/           Karten, Filter, Stammbaum, Galerie, Formulare
src/lib/                  Datenbank, Auth, Länder, Pedigree-Links, Validierung
```

## Veröffentlichen

Für einen eigenen Server (VPS, Docker, Raspberry Pi) reicht SQLite:

```bash
npm run build && npm start
```

Die Datei `prisma/dev.db` enthält dann alle Daten — regelmäßig sichern.

Auf Plattformen mit kurzlebigem Dateisystem (Vercel, Netlify) wird eine
Postgres-Datenbank gebraucht. Dafür in `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

setzen, `DATABASE_URL` auf die Postgres-Adresse zeigen lassen und einmal
`npm run db:push && npm run db:seed` ausführen. Die hochgeladenen Fotos liegen
in der Datenbank, es wird also kein zusätzlicher Speicherdienst gebraucht.

## Was als Nächstes sinnvoll wäre

- Passwort-zurücksetzen per E-Mail (braucht einen Mailversand-Dienst)
- Benachrichtigungs-Mail an den Besitzer bei neuer Anfrage
- Merkliste / Vergleich mehrerer Hengste
- Übernahme-Anfrage für Referenzeinträge durch den echten Besitzer
- Englische Sprachfassung für den US-Markt
