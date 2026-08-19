# Westernhengste

Ein offenes Verzeichnis für Hengste der Westernpferdezucht: Abstammung,
Papiere, Gentests, Erfolge und der direkte Draht zum Besitzer.

Bewusst **ohne Decktaxen, ohne Preise, ohne Verkauf**. Wer Interesse an einem
Hengst hat, schreibt den Besitzer direkt an; das Verzeichnis vermittelt nicht.

## Was die App kann

- **Verzeichnis** mit Suche und Filtern nach Rasse, Disziplin, Land und
  Verfügbarkeit. Die Suche findet auch Vater- und Mutternamen, eine Suche nach
  „Doc Bar“ liefert also auch dessen Nachkommen.
- **Stammbaum über vier Generationen**, der sich selbst zusammensetzt: Vorfahren
  werden über den Namen verknüpft. Trägt jemand einen fehlenden Vorfahren nach,
  wächst der Baum bei allen betroffenen Pferden automatisch mit. Vorfahren ohne
  eigenen Eintrag stehen als reiner Name im Raster.
- **Direktlink zu allbreedpedigree.com** bei jedem Pferd. Es werden dort keine
  Daten ausgelesen, es ist ein normaler Verweis (optional kann pro Pferd eine
  konkrete Zielseite hinterlegt werden).
- **Selbsteintragung**: Jeder kann seinen Hengst kostenlos eintragen. Auch
  Stuten sind erlaubt – sie erscheinen nicht als Deckhengste, machen aber die
  Stammbäume vollständiger.
- **Besitzerkontakt**: Die E-Mail-Adresse wird erst auf Klick nachgeladen und
  steht nicht im Seitenquelltext, damit Adress-Sammler sie nicht abgreifen.
  Die Zahl der Abrufe pro Anschluss ist begrenzt.
- **Moderation** unter `/admin`: neue Einsendungen freigeben oder ablehnen,
  Korrekturmeldungen bearbeiten, Einträge als „geprüft“ markieren.
- **Nachkommenliste**: Jede Pferdeseite listet die im Verzeichnis erfassten
  Nachkommen.

## Loslegen

```bash
npm install
cp .env.example .env.local     # ADMIN_PASSWORD und SESSION_SECRET setzen
npm run dev
```

Die App läuft dann auf <http://localhost:3000>. Beim ersten Start legt sie die
Datenbank unter `data/westernhengste.db` an und füllt sie mit rund 50 bekannten
Gründer- und Vererberhengsten.

`SESSION_SECRET` erzeugen:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ohne gesetztes `ADMIN_PASSWORD` bleibt `/admin` gesperrt – der öffentliche Teil
funktioniert trotzdem.

## Die Startdaten – bitte lesen

Der Grundbestand steht in [`src/lib/seed-data.ts`](src/lib/seed-data.ts).
Drei Dinge sind dabei wichtig:

1. **Die Texte sind eigenständig geschrieben.** Aus fremden Hengstkatalogen
   wurde nichts übernommen. Stammdaten wie Name, Jahrgang, Farbe und Abstammung
   sind freie Fakten und dürfen genutzt werden – ausformulierte Beschreibungen
   und Fotos sind es nicht. Bitte auch beim Erweitern nichts hineinkopieren.

2. **Alle Einträge sind als „ungeprüft“ markiert.** Sie stützen sich auf
   allgemein zugängliche Rassegeschichte und wurden nicht gegen Zuchtbuchpapiere
   abgeglichen. Auf jeder Pferdeseite steht das auch für Besucher sichtbar.
   Wenn ihr einen Eintrag gegen AQHA-Papiere oder allbreedpedigree.com geprüft
   habt, markiert ihn unter `/admin` als geprüft.

3. **Wo die Quellenlage unklar war, ist das Feld leer geblieben** statt geraten.
   Fehlende Mutternamen und Ähnliches sind also Absicht und laden zum Ergänzen
   ein.

Es sind **keine Fotos** hinterlegt: Bilder bekannter Hengste sind fast immer
urheberrechtlich geschützt. Bitte nur Bilder einpflegen, für die eine Erlaubnis
vorliegt.

Der Bestand ist bei Quarter Horses am dichtesten. Paint Horses, Appaloosas und
vor allem die in Europa stehenden Hengste fehlen weitgehend – genau die sollen
über die Selbsteintragung dazukommen.

### Startdaten erweitern

Neue Pferde in `src/lib/seed-data.ts` eintragen und dann:

```bash
npm run seed
```

Der Lauf ist wiederholbar: vorhandene Namen werden übersprungen, von Nutzern
eingetragene Pferde bleiben unberührt.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/app/page.tsx` | Startseite |
| `src/app/hengste/` | Übersicht mit Filtern und Detailseite |
| `src/app/eintragen/` | Eintragungsformular |
| `src/app/admin/` | Moderationsbereich |
| `src/app/actions.ts` | Server Actions: eintragen, Kontakt anzeigen, Korrektur melden |
| `src/lib/db.ts` | SQLite-Zugriff, Schema, Verknüpfung der Abstammung |
| `src/lib/pedigree.ts` | Aufbau des Stammbaums |
| `src/lib/seed-data.ts` | Grundbestand bekannter Hengste |
| `src/lib/validate.ts` | Prüfung der Formulareingaben |

Technisch: Next.js (App Router) mit React Server Components, SQLite über
`better-sqlite3`, Tailwind CSS. Kein externer Dienst nötig, die Datenbank ist
eine einzelne Datei.

## Testen

```bash
npm run typecheck               # TypeScript prüfen
npm run build
npx next start -p 3111          # in einem zweiten Terminal
node scripts/e2e.mjs            # kompletter Ablauf im echten Browser
```

Der Test geht den ganzen Weg durch: Formular absenden, Sperre vor der Freigabe,
serverseitige Validierung, Anmeldung an der Moderation, Freigabe, automatische
Verknüpfung des Stammbaums, Kontaktanzeige und Korrekturmeldung.

Screenshots zur Sichtprüfung (hell, dunkel, mobil):

```bash
node scripts/screenshots.mjs
```

## Betrieb

```bash
docker build -t westernhengste .
docker run -p 3000:3000 \
  -e ADMIN_PASSWORD=... \
  -e SESSION_SECRET=... \
  -e NEXT_PUBLIC_SITE_URL=https://eure-domain.de \
  -v westernhengste-data:/data \
  westernhengste
```

Das Volume auf `/data` ist Pflicht – dort liegt die Datenbank. Ohne Volume sind
alle Einträge nach einem Neustart weg.

Wichtig für die Wahl des Hosters: Die App braucht einen **dauerhaften
Dateispeicher**. Plattformen ohne persistente Festplatte (etwa Vercel im
Standardbetrieb) funktionieren so nicht; dort müsste die Datenspeicherung auf
eine externe Datenbank umgestellt werden.

Sichert `data/westernhengste.db` regelmässig – das ist der gesamte Bestand.

## Vor dem Livegang

- [ ] `ADMIN_PASSWORD` und `SESSION_SECRET` auf lange Zufallswerte setzen
- [ ] Impressum und vollständige Datenschutzerklärung ergänzen
      (Platzhalter dafür steht in `src/app/info/page.tsx`)
- [ ] Startdaten gegen Papiere prüfen und als „geprüft“ markieren
- [ ] Sicherung der Datenbank einrichten
- [ ] `NEXT_PUBLIC_SITE_URL` setzen, damit Sitemap und robots.txt stimmen

## Bekannte Grenzen

- Die Ratenbegrenzung liegt im Arbeitsspeicher eines Prozesses. Bei mehreren
  Instanzen müsste sie auf einen gemeinsamen Speicher umgestellt werden.
- Bilder werden nur verlinkt, nicht hochgeladen. Ein echter Upload bräuchte
  Speicher und eine Prüfung der Dateien.
- Es gibt noch keine Benachrichtigung per E-Mail, wenn eine neue Einsendung
  eintrifft – die Moderation muss aktiv unter `/admin` nachsehen.
- Die Oberfläche ist auf Deutsch. Für US-Besitzer, die ihren Hengst eintragen
  sollen, wäre eine englische Fassung der nächste sinnvolle Schritt.
- `npm audit` meldet Schwachstellen in `postcss` und `sharp`, beide sind
  Unter-Abhängigkeiten von Next.js. Sie lassen sich erst mit einem Next-Update
  beheben; ein `npm audit fix --force` würde Next auf eine uralte Version
  zurücksetzen und ist keine Lösung.
