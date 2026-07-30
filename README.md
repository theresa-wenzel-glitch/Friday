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
- **Selbsteintragung**: Jeder kann seinen Hengst kostenlos eintragen, inklusive
  eines eigenen Fotos (Upload direkt im Formular, JPEG/PNG/WebP bis 8 MB - kein
  Umweg über eine externe Bild-Adresse nötig). Auch Stuten sind erlaubt – sie
  erscheinen nicht als Deckhengste, machen aber die Stammbäume vollständiger.
- **Platzhalter-Portrait** für Pferde ohne Foto: ein farbiges Monogramm statt
  einer Lücke, die Füllfarbe richtet sich nach der erfassten Fellfarbe. So hat
  jeder Eintrag ein Bild - auch die historischen Hengste, für die es aus
  urheberrechtlichen Gründen keine echten Fotos gibt (siehe unten).
- **Besitzerkontakt**: Die E-Mail-Adresse wird erst auf Klick nachgeladen und
  steht nicht im Seitenquelltext, damit Adress-Sammler sie nicht abgreifen.
  Die Zahl der Abrufe pro Anschluss ist begrenzt.
- **Moderation** unter `/admin`: neue Einsendungen freigeben oder ablehnen,
  Korrekturmeldungen bearbeiten, Einträge als „geprüft“ markieren.
- **Nachkommenliste**: Jede Pferdeseite listet die im Verzeichnis erfassten
  Nachkommen.

## Loslegen

Voraussetzung: [Node.js](https://nodejs.org) in der LTS-Version.

```bash
npm install
npm run setup     # legt .env.local mit Passwort und Zufallsschlüssel an
npm run dev
```

Die App läuft dann auf <http://localhost:3000>, der Moderationsbereich unter
<http://localhost:3000/admin>. Beim ersten Start legt sie die Datenbank unter
`data/westernhengste.db` an und füllt sie mit rund 50 bekannten Gründer- und
Vererberhengsten.

`npm run setup` fragt nach einem Passwort für den Moderationsbereich; mit Enter
wird eines erzeugt. Eine vorhandene `.env.local` wird nie ohne Rückfrage
überschrieben. Wer die Datei lieber von Hand anlegt, nimmt `.env.example` als
Vorlage.

Ohne gesetztes `ADMIN_PASSWORD` bleibt `/admin` gesperrt – der öffentliche Teil
funktioniert trotzdem.

## Ansichts-Version ohne Installation

`vorschau/westernhengste.html` ist das Verzeichnis als einzelne Datei: zum
Doppelklicken, ohne Node.js und ohne Server. Enthalten sind Suche, Filter,
Detailansichten und Stammbäume – nicht enthalten sind die Kontaktdaten der
Besitzer, die Datei kann also frei weitergegeben werden.

Neu bauen, wenn sich der Bestand geändert hat:

```bash
npm run vorschau
```

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

Es sind **keine echten Fotos** hinterlegt: Bilder bekannter Hengste sind fast
immer urheberrechtlich geschützt, auch die auf den Seiten der jeweiligen
Zuchtstationen. Statt eine Lücke zu zeigen, bekommt jedes Pferd ohne Foto ein
farbcodiertes Monogramm (`src/components/HorsePortrait.tsx` bzw. das
Gegenstück in `vorschau/_seite.html`) - die Füllfarbe richtet sich nach der
erfassten Fellfarbe, ist also eine echte Angabe zum Pferd und keine Deko.
Bitte nur echte Bilder einpflegen, für die eine Erlaubnis vorliegt - am besten
über den Upload im Eintragungsformular, siehe unten.

Der Bestand ist bei Quarter Horses am dichtesten. Paint Horses und Appaloosas
fehlen weitgehend – genau die sollen über die Selbsteintragung dazukommen.

### In Europa stehende Hengste

Neben den historischen US-Vererbern sind aktuell einige Hengste erfasst, die
tatsächlich in Europa stehen bzw. dort vermarktet werden: Custom Del Cielo und
Platinum Vintage (beide Deutschland, DQHA-gekört bzw. bei Tiemann Performance
Horses), HF Mobster (ein Sohn von Gunner), sowie AHF Rojo El Sueno, Jaz Poco
Simpatico und Remington Steel Burn (Foundation Quarter Horses der Absarokee
Horse Farm, Niedersachsen). Auch hier: per Websuche recherchiert, nicht
geprüft, Quellen in `docs/quellen-vorfahren.md`.

Das sind bewusst nur wenige, konkret belegte Namen - keine erfundene
Vollständigkeit. Wer weitere bekannte, in Europa stehende Hengste kennt: über
`/admin/abstammung` (siehe unten) oder einfach als Nachricht durchgeben, dann
werden sie sauber recherchiert nachgetragen.

### Die Stammbäume wachsen mit dem Bestand

Ein Baum wird nur dort tief, wo die Vorfahren selbst als Eintrag existieren.
Deshalb sind zu den bekannten Hengsten rund 70 Vorfahren mit erfasst – Väter,
Mütter und Grosseltern, die selbst nie Deckhengste im Verzeichnis wären, den
Stammbaum aber überhaupt erst entstehen lassen. Hollywood Dun It reicht damit
zum Beispiel bis zu King P-234 zurück statt bei Vater und Mutter zu enden.

Die Quellen dieser Recherche stehen in
[`docs/quellen-vorfahren.md`](docs/quellen-vorfahren.md). **allbreedpedigree.com
liess sich für diese Recherche nicht automatisiert abrufen** - das liegt an
der Ausführungsumgebung, die für diese Arbeit genutzt wurde (sie darf nur eine
feste Liste von Servern erreichen), nicht an einer Sperre der Seite selbst.
Gearbeitet wurde stattdessen mit Wikipedia, AQHA, Quarter Horse News, Western
Horseman, StallionCompare und rimondo. Genau deshalb steht bei allen
Einträgen weiterhin „ungeprüft“: bitte gegen die Papiere gegenlesen, bevor ihr
sie im Moderationsbereich freigebt - am einfachsten direkt über
`/admin/abstammung`, siehe unten.

Lücken bleiben. Sie schliessen sich, sobald jemand die fehlenden Vorfahren als
eigene Einträge anlegt – die Verknüpfung über den Namen passiert von selbst,
rückwirkend für alle Nachkommen. Geraten wird dabei nichts: lieber ein leeres
Feld als eine erfundene Abstammung, die still in jeden Nachkommen wandert.

### Abstammungen stapelweise nachtragen

Unter `/admin/abstammung` lassen sich mehrere Pferde auf einmal eintragen –
gedacht für den Fall, dass eine Abstammung vorliegt (Zuchtbuchpapier,
allbreedpedigree.com, Katalog) und nicht jedes Pferd einzeln über das Formular
angelegt werden soll. Je Zeile ein Pferd:

```
Colonels Smoking Gun | Colonelfourfreckle | Katie Gun | 1993
Colonelfourfreckle   | Colonel Freckles   | Miss Solano
Katie Gun            | John Gun           | Bueno Katie | 1987
```

Ein Bindestrich heisst „unbekannt“ – dort wird nichts eingetragen. Genannte
Vorfahren werden gleich mit angelegt, damit der Stammbaum weiterwächst; ob
Hengst oder Stute, ergibt sich aus der Spalte bzw. aus dem vorhandenen
Bestand. **Vorhandene Angaben werden nur ergänzt, nie überschrieben**, und eine
Vorschau zeigt vorher genau, was passieren würde.

### Fotos hochladen

Im Eintragungsformular lässt sich ein Foto direkt hochladen (JPEG, PNG oder
WebP, bis 8 MB) - alternativ weiterhin eine externe Bild-Adresse eintragen.
Hochgeladene Bilder landen unter `data/uploads/` (im selben Verzeichnis wie
die Datenbank, damit ein einziges Volume beides sichert) und werden über
`/api/uploads/<zufällige-id>.<endung>` ausgeliefert.

Zur Sicherheit:

- Der Dateityp wird anhand der ersten Bytes geprüft, nicht anhand des vom
  Browser gemeldeten Typs - der liesse sich fälschen.
- SVG ist bewusst nicht erlaubt: SVG-Dateien können Skript enthalten.
- Der Dateiname wird bei jedem Upload komplett neu vergeben (Zufalls-UUID),
  der vom Browser gemeldete Name wird nirgends übernommen.
- Uploads sind pro Anschluss auf 15 pro Stunde begrenzt.

Fehlt ein Foto, zeigt die Seite ein farbcodiertes Monogramm statt einer Lücke
(siehe oben) - kein Umweg über einen externen Bilderdienst nötig.

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
| `src/lib/coat-color.ts` | Farbzuordnung fürs Platzhalter-Portrait |
| `src/components/HorsePortrait.tsx` | Foto oder Platzhalter-Monogramm |
| `src/app/api/upload/` , `src/app/api/uploads/[filename]/` | Foto-Upload: annehmen und ausliefern |

Technisch: Next.js (App Router) mit React Server Components, SQLite über
`better-sqlite3`, Tailwind CSS. Kein externer Dienst nötig, die Datenbank ist
eine einzelne Datei.

## Testen

```bash
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

Die weiteren Testläufe (Server muss laufen, ausser bei `test-vorschau.mjs`):

```bash
node scripts/e2e-import.mjs     # Abstammungen stapelweise eintragen
node scripts/e2e-upload.mjs     # Foto-Upload: echte Datei, gefälschter Typ, SVG, Pfad-Traversal
node scripts/test-vorschau.mjs  # Ansichts-Version, direkt auf der Datei
```

`scripts/e2e-import.mjs` **schreibt in die Datenbank** – nur gegen eine
Wegwerf-Datenbank laufen lassen. Die Testpferde heissen absichtlich
„Pruefhengst Alpha“ und ähnlich, damit eine erfundene Abstammung nie
versehentlich im echten Bestand landet.

## Online stellen

Schritt für Schritt beschrieben in **[DEPLOY.md](DEPLOY.md)** – inklusive
Datenschutz-Hinweisen, Sicherung und der Frage, welche Hoster in Frage kommen.

Kurzfassung für einen eigenen Server mit Docker:

```bash
cat > .env.production <<'EOF'
ADMIN_PASSWORD=dein-passwort
SESSION_SECRET=dein-langer-zufallswert
NEXT_PUBLIC_SITE_URL=https://eure-domain.de
EOF
chmod 600 .env.production

docker compose up -d --build
```

Das Volume auf `/data` ist Pflicht – dort liegt die Datenbank. Ohne Volume sind
alle Einträge nach einem Neustart weg. Die App braucht deshalb einen Hoster mit
**dauerhaftem Dateispeicher**; Vercel und Netlify scheiden im Standardbetrieb
aus.

Sichert die Datenbank regelmässig – sie ist der gesamte Bestand. Hochgeladene
Fotos liegen im selben Verzeichnis (`data/uploads/`) und gehören mit ins
gesicherte Volume.

## Vor dem Livegang

- [ ] `ADMIN_PASSWORD` und `SESSION_SECRET` auf lange Zufallswerte setzen
- [ ] Impressum und vollständige Datenschutzerklärung ergänzen
      (Platzhalter dafür steht in `src/app/info/page.tsx`)
- [ ] Startdaten gegen Papiere prüfen und als „geprüft“ markieren
- [ ] Sicherung der Datenbank einrichten
- [ ] `NEXT_PUBLIC_SITE_URL` setzen, damit Sitemap und robots.txt stimmen

## Bekannte Grenzen

- Die Ratenbegrenzung liegt im Arbeitsspeicher eines Prozesses. Bei mehreren
  Instanzen müsste sie auf einen gemeinsamen Speicher umgestellt werden - das
  betrifft auch die Obergrenze für Foto-Uploads.
- Hochgeladene Fotos landen unverändert auf der Platte, ohne serverseitige
  Verkleinerung oder Neucodierung. Bei sehr vielen grossen Bildern wächst
  `data/uploads/` entsprechend; es gibt noch keine automatische Aufräumung
  für Uploads, deren Einsendung abgelehnt wurde.
- Es gibt noch keine Benachrichtigung per E-Mail, wenn eine neue Einsendung
  eintrifft – die Moderation muss aktiv unter `/admin` nachsehen.
- Die Oberfläche ist auf Deutsch. Für US-Besitzer, die ihren Hengst eintragen
  sollen, wäre eine englische Fassung der nächste sinnvolle Schritt.
- `npm audit` meldet Schwachstellen in `postcss` und `sharp`, beide sind
  Unter-Abhängigkeiten von Next.js. Sie lassen sich erst mit einem Next-Update
  beheben; ein `npm audit fix --force` würde Next auf eine uralte Version
  zurücksetzen und ist keine Lösung.
