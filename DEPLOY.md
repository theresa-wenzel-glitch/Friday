# Die Seite online stellen

Solange die App nur auf deinem Rechner läuft (`npm run dev`), kommt niemand
sonst darauf. Damit andere ihre Hengste eintragen können, muss sie auf einem
Server laufen, der rund um die Uhr erreichbar ist.

## Die eine wichtige Voraussetzung

Die App speichert alles in einer **einzelnen Datei** (`westernhengste.db`).
Das ist unkompliziert und schnell – hat aber eine Bedingung an den Hoster:

> Er muss einen **dauerhaften Dateispeicher** bieten (oft „Volume“ oder
> „Persistent Disk“ genannt).

Plattformen ohne dauerhaften Speicher – **Vercel und Netlify im
Standardbetrieb** – funktionieren so **nicht**. Dort wäre nach jedem Neustart
jeder eingetragene Hengst weg. Wenn ihr unbedingt dorthin wollt, müsste die
Speicherung vorher auf eine externe Datenbank umgestellt werden; das ist ein
eigener Umbau.

## Noch etwas: Datenschutz

Ihr speichert Namen, E-Mail-Adressen und Telefonnummern von Pferdebesitzern.
Das sind personenbezogene Daten, für die die DSGVO gilt. Praktisch heisst das:

- **Server in der EU wählen.** Alle unten genannten Anbieter können das –
  achtet bei der Einrichtung auf die Region (Frankfurt, Nürnberg, Amsterdam).
- **Auftragsverarbeitungsvertrag (AVV)** mit dem Hoster abschliessen. Bei den
  genannten Anbietern gibt es den zum Anklicken im Kundenkonto.
- **Impressum und Datenschutzerklärung** ergänzen, bevor die Seite öffentlich
  wird. Ein Platzhalter dafür steht in `src/app/info/page.tsx`.

Das ist kein Rechtsrat – bei einer Seite, die öffentlich Kontaktdaten Dritter
zeigt, lohnt sich ein kurzer Blick von jemandem, der sich damit auskennt.

---

## Empfehlung: Railway

Für den Anfang der einfachste Weg. Railway liest das mitgelieferte
`Dockerfile` selbst und braucht keine weitere Konfiguration. Kosten: rund
5 $ im Monat, Kreditkarte nötig.

1. Konto anlegen auf [railway.app](https://railway.app), mit GitHub anmelden.
2. **New Project → Deploy from GitHub repo → `Friday`** auswählen.
   Als Branch den Zweig mit dem Code wählen.
3. Unter **Settings → Region** eine **europäische Region** einstellen
   (z. B. `europe-west4`, Amsterdam).
4. Unter **Variables** eintragen:

   | Name | Wert |
   | --- | --- |
   | `ADMIN_PASSWORD` | dein Passwort aus `npm run setup` |
   | `SESSION_SECRET` | der lange Zufallswert aus deiner `.env.local` |
   | `DATABASE_PATH` | `/data/westernhengste.db` |
   | `NEXT_PUBLIC_SITE_URL` | die spätere Adresse, z. B. `https://westernhengste.de` |

5. **Wichtig:** Unter **Settings → Volumes** ein Volume anlegen und als
   Mount-Pfad **`/data`** eintragen. Ohne diesen Schritt sind nach jedem
   Neustart alle Einträge verloren.
6. Unter **Settings → Networking → Generate Domain** bekommt ihr sofort eine
   Adresse zum Testen. Eine eigene Domain lässt sich dort ebenfalls
   hinterlegen.

Nach dem ersten Start legt die App die Datenbank an und füllt sie mit den
bekannten Hengsten. Fertig.

**Alternative mit gleichem Ablauf:** [Render](https://render.com) funktioniert
genauso (Web Service aus dem Repo, „Frankfurt“ als Region, unter *Disks* eine
Platte auf `/data` anlegen). Rechnet dort mit rund 7 $ plus Speicherkosten.

---

## Eigener Server (günstiger, mehr Handarbeit)

Lohnt sich, wenn ihr ohnehin einen Server habt oder die Daten in Deutschland
liegen sollen. Ein kleiner Server bei [Hetzner](https://hetzner.com) kostet
etwa 4 € im Monat und steht in Nürnberg oder Falkenstein.

Auf dem Server mit installiertem Docker:

```bash
git clone <repo-adresse> westernhengste
cd westernhengste

# Zugangsdaten anlegen
cat > .env.production <<'EOF'
ADMIN_PASSWORD=dein-passwort
SESSION_SECRET=dein-langer-zufallswert
NEXT_PUBLIC_SITE_URL=https://eure-domain.de
EOF
chmod 600 .env.production

docker compose up -d --build
```

Die App hört danach auf `127.0.0.1:3000`. Davor gehört ein Reverse Proxy, der
HTTPS bereitstellt – am bequemsten
[Caddy](https://caddyserver.com), der sich das Zertifikat selbst holt:

```caddyfile
eure-domain.de {
    reverse_proxy 127.0.0.1:3000
}
```

Ohne HTTPS würden Passwort und Anmelde-Cookie im Klartext übertragen.

### Aktualisieren

```bash
git pull
docker compose up -d --build
```

Die Datenbank liegt im Volume und bleibt dabei unangetastet.

### Sichern

Das ist der wichtigste Punkt im laufenden Betrieb – die Datei enthält den
gesamten Bestand:

```bash
docker compose exec app node -e "
  require('better-sqlite3')('/data/westernhengste.db')
    .backup('/data/sicherung.db')
    .then(() => process.exit(0), e => { console.error(e); process.exit(1); })
" && docker compose cp app:/data/sicherung.db ./sicherung-$(date +%F).db
```

Der Umweg über `.backup()` ist Absicht: die Datei einfach zu kopieren, während
die App läuft, kann eine unbrauchbare Sicherung ergeben. Das `.then(…)` sorgt
dafür, dass wirklich gewartet wird, bis die Sicherung fertig geschrieben ist.

Prüfen, ob eine Sicherung brauchbar ist:

```bash
node -e "
  const db = require('better-sqlite3')('sicherung-2026-07-29.db', { readonly: true });
  console.log(db.pragma('integrity_check')[0].integrity_check);
  console.log(db.prepare('select count(*) c from horses').get().c, 'Pferde');
"
```

Legt das als täglichen Cronjob an und kopiert die Sicherungen weg vom Server.

---

## Nach dem Livegang

- [ ] `/admin` aufrufen und die Anmeldung testen
- [ ] Einen Test-Hengst eintragen und freigeben
- [ ] Prüfen, dass `https://eure-domain.de/robots.txt` und `/sitemap.xml`
      die richtige Adresse zeigen (sonst `NEXT_PUBLIC_SITE_URL` korrigieren)
- [ ] Impressum und Datenschutzerklärung ergänzen
- [ ] Sicherung einrichten und **einmal testweise zurückspielen**
- [ ] Regelmässig in `/admin` nach neuen Einsendungen schauen –
      es gibt noch keine Benachrichtigung per E-Mail
