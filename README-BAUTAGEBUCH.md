# Bautagebuch-Automat

Ein Foto + 15 Sekunden Sprachnachricht von der Baustelle → fertiger
Bautagebuch-Eintrag als PDF. Läuft unter `/bautagebuch`.

## Was die App kann

- **Erfassen am Handy** (`/bautagebuch/app/neu`): Baustelle wählen, Foto machen,
  Aufnahmeknopf drücken und erzählen. Tippen geht auch.
- **KI macht daraus einen Eintrag**: Die Sprachnachricht wird abgetippt
  (OpenAI Whisper), dann sortiert die KI den Inhalt in die üblichen Felder
  (Anwesende, Arbeitszeit, Leistungen, Material, Behinderungen, Anordnungen …).
  Sie darf **nichts dazuerfinden**: Was nicht gesagt wurde, bleibt leer und
  wird als „nicht erwähnt“ angezeigt.
- **Echtes Wetter** statt geschätztem: Temperatur, Niederschlag und Wind vom
  Wetterdienst Open-Meteo (kostenlos, ohne Schlüssel), für den Handy-Standort
  oder den Ort der Baustelle.
- **Prüfen & abschließen**: Entwürfe kann man noch bearbeiten. Beim Abschließen
  bekommt der Eintrag die laufende Nummer der Baustelle und wird
  festgeschrieben. Danach nur noch **Nachträge** mit Zeitstempel.
- **Prüfsumme**: Jeder abgeschlossene Eintrag bekommt einen digitalen
  Fingerabdruck (SHA-256) über alle Inhalte, die Originalfotos und
  -sprachnachrichten und den vorigen Eintrag. Unter
  `/bautagebuch/pruefen/<prüfsumme>` kann jeder (z. B. der Bauherr) prüfen, ob
  der Eintrag seither verändert wurde. Die Prüfseite zeigt keine Inhalte.
- **PDF** pro Eintrag sowie als **Bericht** einer Baustelle für einen Zeitraum
  (z. B. Wochenbericht an Bauherrn oder Architekt).
- **Team**: Jeder Betrieb hat einen Zugangscode. Mitarbeiter melden sich mit
  Code + eigenem Namen an. Ein neuer Code meldet alle Geräte ab.
- **Telegram-Bot**: Foto + Sprachnachricht in den Chat, PDF kommt zurück, mit
  Knopf „Abschließen“. Dazu eine tägliche Erinnerung.
- **Beispiel-PDF** unter `/bautagebuch/beispiel.pdf` – zum Herzeigen bei
  Interessenten.

## Ausprobieren (auf dem eigenen Rechner)

```bash
npm install
npm run dev
```

Dann <http://localhost:3000/bautagebuch> öffnen → „14 Tage kostenlos testen“.

Ohne KI-Schlüssel läuft alles im **Demo-Modus**: Sprachnachrichten werden
gespeichert, aber nicht abgetippt; getippter Text wird mit einfachen Regeln auf
die Felder verteilt. Zum Ausprobieren der Abläufe reicht das.

## KI einschalten

1. Bei <https://platform.openai.com> ein Konto anlegen, Guthaben aufladen
   (10 € reichen für Hunderte Einträge), einen API-Schlüssel erzeugen.
2. In `.env.local` eintragen:
   ```
   OPENAI_API_KEY=sk-...
   ```
3. Server neu starten.

Kosten pro Eintrag: grob 1–3 Cent (15 Sek. Spracherkennung + eine Anfrage mit
kleinem Foto). Die Modelle lassen sich mit `OPENAI_MODEL` und
`OPENAI_TRANSCRIBE_MODEL` ändern.

## Telegram-Bot einrichten

Geht nur, wenn die App im Internet unter einer **https-Adresse** läuft.

1. In Telegram mit **@BotFather** schreiben → `/newbot` → Namen vergeben.
   Er gibt dir einen **Token**.
2. In die Umgebungsvariablen des Servers:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_BOT_USERNAME=MeinBautagebuchBot
   TELEGRAM_WEBHOOK_SECRET=<langer Zufallswert>
   NEXT_PUBLIC_SITE_URL=https://deine-domain.de
   ```
3. Einmal ausführen: `npm run telegram:webhook`
4. In der App unter **Team** auf „Telegram-Bot verbinden“ tippen.

**Tägliche Erinnerung um 16 Uhr**: `CRON_SECRET` setzen und bei einem
Cron-Dienst (z. B. cron-job.org, kostenlos) einrichten:
`POST https://deine-domain.de/api/bautagebuch/erinnerung` mit Header
`Authorization: Bearer <CRON_SECRET>`, Montag–Freitag 16:00. Erinnert wird nur,
wer heute für seine Baustelle noch nichts erfasst hat.

## Online stellen – Schritt für Schritt (Railway)

Railway ist ein Hosting-Dienst, der die App direkt aus GitHub baut. Kosten:
ab etwa 5 $ im Monat (Hobby-Tarif, Stand Oktober 2026 – bitte auf
railway.com prüfen). Vercel passt **nicht**, weil dort keine Dateien
(Fotos, Datenbank) dauerhaft liegen bleiben.

1. **Konto anlegen**: <https://railway.com> → „Login with GitHub“.
2. **Projekt anlegen**: „New Project“ → „Deploy from GitHub repo“ →
   Repository `Friday` auswählen. Railway findet das `Dockerfile` selbst.
3. **Speicher anhängen** (sonst sind nach jedem Update alle Einträge weg!):
   Im Dienst rechte Maustaste / „+ New“ → **Volume** → Mount path: `/data`.
4. **Variablen eintragen** (Reiter „Variables“ → „New Variable“):

   | Name | Wert |
   | --- | --- |
   | `SESSION_SECRET` | langer Zufallswert (z. B. von <https://www.random.org/strings/>: 40 Zeichen) |
   | `ADMIN_PASSWORD` | Passwort für `/admin` des Hengstverzeichnisses |
   | `RAILWAY_RUN_UID` | `0` (damit die App auf das Volume schreiben darf) |
   | `OPENAI_API_KEY` | dein OpenAI-Schlüssel, siehe unten |
   | `NEXT_PUBLIC_SITE_URL` | die Adresse aus Schritt 5, z. B. `https://friday-production.up.railway.app` |

5. **Adresse erzeugen**: Reiter „Settings“ → „Networking“ →
   „Generate Domain“. Diese Adresse bei `NEXT_PUBLIC_SITE_URL` eintragen.
   Railway baut danach neu (dauert ein paar Minuten).
6. **Testen**: `https://deine-adresse/bautagebuch` öffnen, Konto anlegen,
   Baustelle anlegen, am Handy einen Eintrag machen.

Später lässt sich unter „Networking“ eine eigene Domain wie
`bautagebuch-automat.de` verbinden.

**Backups**: Railway bietet Backups für Volumes an (Volume → „Backups“).
Einschalten!

## OpenAI-Schlüssel besorgen

1. <https://platform.openai.com> → Konto anlegen.
2. „Settings“ → „Billing“ → 10 $ Guthaben aufladen. Dort auch ein
   **monatliches Limit** setzen, damit nie mehr ausgegeben wird als gewollt.
3. „API keys“ → „Create new secret key“ → Schlüssel (beginnt mit `sk-`)
   kopieren. Er wird nur einmal angezeigt.
4. In Railway als Variable `OPENAI_API_KEY` eintragen. Nie in den Code oder
   auf GitHub schreiben.

Danach verschwindet der Hinweis „Demo-Modus“ in der App.

## Vor dem ersten zahlenden Kunden – bitte lesen

- **Nicht „rechtssicher“ versprechen.** Ob ein Bautagebuch vor Gericht trägt,
  entscheidet das Gericht. Werbung mit „rechtssicher“ kann abgemahnt werden.
  Die Startseite formuliert deshalb bewusst sachlich (Zeitstempel,
  Unveränderbarkeit, Originale). Auch „Pflicht laut VOB für jeden Handwerker“
  stimmt so pauschal nicht – oft ist es vertraglich vereinbart oder Aufgabe der
  Bauleitung.
- **Datenschutz (DSGVO)**: Impressum, Datenschutzerklärung und ein
  Auftragsverarbeitungsvertrag (AVV) mit deinen Kunden sind nötig. Mit OpenAI
  ebenfalls einen AVV abschließen (Data Processing Addendum im OpenAI-Konto).
  Fotos können Personen zeigen, Sprachnachrichten Namen enthalten.
- **Backups**: Ein Bautagebuch, das verloren geht, ist schlimmer als keins.
- **Bezahlung**: Ist noch nicht eingebaut. Für die ersten Testkunden reicht
  eine Rechnung per Hand; später z. B. Stripe anbinden. Die Tarifgrenzen
  (1 Baustelle / 40 Einträge) werden noch nicht technisch durchgesetzt.

## Test

```bash
npm run build
npm run e2e:bautagebuch
```

Der Test startet eigene Platzhalter für KI, Wetter und Telegram und prüft den
ganzen Ablauf (56 Prüfungen) – ohne echte Schlüssel und ohne Kosten.

## Wo liegt was?

| Pfad | Inhalt |
| --- | --- |
| `src/app/(bautagebuch)/bautagebuch/` | Seiten (Startseite, Login, App) |
| `src/app/api/bautagebuch/` | Upload, PDF, Fotos, Telegram-Webhook, Erinnerung |
| `src/lib/bautagebuch/` | Datenbank, KI, Wetter, PDF, Telegram, Anmeldung |
| `src/components/bautagebuch/` | Erfassungsbildschirm und Formulare |
