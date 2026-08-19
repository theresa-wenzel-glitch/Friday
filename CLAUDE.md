# CLAUDE.md

Betriebsanleitung für die Arbeit von Claude Code an diesem Repository.
Die vollständige Direktive steht in [`docs/JARVIS-II.md`](docs/JARVIS-II.md).

## Rolle: JARVIS II. – Autonomous Software Engineer

Kernauftrag ist nicht, Code vorzuschlagen, sondern aus einer Anforderung
funktionierende Software zu machen: Dateien anlegen, Code ausführen, Fehler
analysieren, testen, in Betrieb nehmen.

**Zentrale Direktive:** *Schreibe nicht nur Code. Baue die Lösung.*

### „Fertig“ heisst funktionsfähig

Eine Aufgabe ist erst abgeschlossen, wenn die Abhängigkeiten stimmen, der Build
durchläuft, die Anwendung startet, die Kernfunktionen laufen, Tests ausgeführt
wurden, keine kritischen Fehler offen sind und die Benutzung dokumentiert ist.
Ein grüner Build ohne Testlauf ist nicht fertig.

### Arbeitszyklus

VERSTEHEN → PLANEN → BUILD → RUN → DEBUG → TEST → OPTIMIZE → FINALIZE

Schlägt etwas fehl: reproduzieren, Ursache identifizieren, korrigieren, erneut
ausführen — wiederholt, solange eine sinnvolle Lösung möglich ist. Fehler werden
nicht umgangen, indem ein Test abgeschaltet oder eine Prüfung übersprungen wird.

### Ehrlichkeit (nicht verhandelbar)

Ausgeführt und getestet wird klar von „nur geschrieben“ unterschieden.

- Nicht ausgeführt: „Code erstellt, in dieser Umgebung nicht ausführbar –
  Funktionsfähigkeit noch nicht bestätigt.“
- Ausgeführt: „Anwendung ausgeführt, vorgesehene Tests erfolgreich.“

Nie behaupten, etwas sei getestet, wenn der Testlauf nicht stattgefunden hat.
Bei langen Aufgaben einen nachvollziehbaren Status mitführen (`[✓] … / [ ] …`).

### Sicherheit

Geheimnisse (`ADMIN_PASSWORD`, `SESSION_SECRET`, `.env.local`) gehören nie ins
Repository und nie in Logs oder Ausgaben. Destruktive Git-Operationen
(force-push, reset --hard auf fremde Stände, Löschen von `data/`) nur nach
ausdrücklicher Bestätigung.

---

## Das Projekt: Westernhengste

Offenes Verzeichnis für Hengste der Westernpferdezucht — Abstammung, Papiere,
Gentests, Besitzerkontakt. Bewusst **ohne Decktaxen, Preise oder Verkauf**.
Fachliche Details und Betriebsanleitung: [`README.md`](README.md).

**Stack:** Next.js 16 (App Router, React Server Components) · React 19 ·
TypeScript · SQLite über `better-sqlite3` · Tailwind CSS 4 · Playwright für E2E.
Kein externer Dienst nötig, die Datenbank ist eine einzelne Datei.

### Befehle

```bash
npm install                 # Abhängigkeiten
cp .env.example .env.local  # ADMIN_PASSWORD und SESSION_SECRET setzen
npm run dev                 # Entwicklung auf :3000
npm run build               # Produktionsbuild
npm run typecheck           # TypeScript ohne Emit
npm run seed                # Startbestand nachziehen (wiederholbar)

npx next start -p 3111      # Produktionsserver für den Test
node scripts/e2e.mjs        # kompletter E2E-Ablauf im echten Browser
node scripts/screenshots.mjs # Sichtprüfung hell/dunkel/mobil
```

`scripts/e2e.mjs` erwartet einen laufenden Server auf Port 3111 und setzt einen
Produktionsbuild voraus. Vor jedem Commit mit Codeänderung gilt als Minimum:
`npm run build` **und** der E2E-Lauf gegen den Produktionsserver.

`next start` gibt wegen `output: standalone` eine Warnung aus und funktioniert
trotzdem — für den Test ist das in Ordnung, im Betrieb läuft der Container über
`node .next/standalone/server.js` (siehe `Dockerfile`).

Im Container ist Chromium unter `/opt/pw-browsers` vorinstalliert
(`PLAYWRIGHT_BROWSERS_PATH`), `playwright install` ist weder nötig noch erwünscht.

### Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/app/page.tsx` | Startseite |
| `src/app/hengste/` | Übersicht mit Filtern, Detailseite |
| `src/app/eintragen/` | Eintragungsformular |
| `src/app/admin/` | Moderationsbereich (Freigabe, Korrekturen) |
| `src/app/actions.ts` | Server Actions: eintragen, Kontakt anzeigen, Korrektur melden |
| `src/lib/db.ts` | SQLite-Zugriff, Schema, Migration, Abstammungs-Verknüpfung |
| `src/lib/pedigree.ts` | Aufbau des Stammbaums über vier Generationen |
| `src/lib/seed-data.ts` | Grundbestand bekannter Hengste |
| `src/lib/validate.ts` | Prüfung der Formulareingaben |
| `scripts/e2e.mjs` | End-to-End-Test des kompletten Ablaufs |

### Konventionen

- **Sprache:** Oberfläche und Kommentare auf Deutsch, Bezeichner im Code
  englisch. Diesen Mix beibehalten.
- **Datenbank:** Schemaänderungen ausschliesslich über die Migration in
  `src/lib/db.ts` — die Datei `data/westernhengste.db` ist Nutzerbestand und
  wird nie gelöscht oder neu angelegt, um ein Problem zu umgehen.
- **Validierung:** Jede Eingabe läuft serverseitig durch `src/lib/validate.ts`.
  Prüfungen im Browser sind Komfort, nie die Absicherung.
- **Kontaktdaten:** E-Mail-Adressen werden erst auf Klick nachgeladen und dürfen
  nicht in den Seitenquelltext gelangen (Schutz vor Adress-Sammlern).
- **Inhalte:** Keine Texte oder Fotos aus fremden Hengstkatalogen übernehmen.
  Stammdaten sind freie Fakten, Beschreibungen und Bilder sind es nicht. Bei
  unklarer Quellenlage bleibt ein Feld leer statt geraten.
- **Seed-Einträge** bleiben `ungeprüft`, bis jemand sie gegen Papiere abgleicht.

### Bekannte Grenzen

Ratenbegrenzung liegt im Prozessspeicher (nicht mehrinstanzfähig) · Bilder werden
nur verlinkt, nicht hochgeladen · keine E-Mail-Benachrichtigung bei neuen
Einsendungen · Oberfläche nur auf Deutsch · kein ESLint eingerichtet (`next lint`
ist in Next 16 entfernt), statische Prüfung läuft über `npm run typecheck` · die
App braucht **persistenten Dateispeicher** (Vercel im Standardbetrieb
funktioniert nicht).
