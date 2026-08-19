# Testabdeckung: Analyse und Vorschläge

Stand: August 2026, Commit `1cd5cb2`.

Diese Analyse schaut sich an, was heute getestet wird, wo die Lücken liegen und
welche Tests am meisten bringen würden. Die im Abschnitt „Belegte Lücken“
genannten Punkte sind keine Vermutungen – sie wurden gegen den echten Code
nachgestellt.

---

## 1. Ist-Zustand

**Es gibt kein Testframework.** `package.json` hat kein `test`-Skript, keine
Testabhängigkeit (kein Vitest, Jest, node:test-Setup) und kein
Abdeckungswerkzeug. Es gibt auch keine CI: das Verzeichnis `.github/` fehlt.
Eine Abdeckungszahl lässt sich deshalb gar nicht erst nennen – es wird nichts
gemessen. Das vorhandene `lint`-Skript läuft ins Leere (siehe Abschnitt 4),
`tsc --noEmit` läuft sauber durch, wird aber nirgends automatisch ausgeführt.

Was es stattdessen gibt:

| Datei | Was es ist | Grenzen |
| --- | --- | --- |
| `scripts/e2e.mjs` | Handgeschriebenes Playwright-Skript, 15 Prüfungen | Braucht einen manuell gestarteten Server auf Port 3111, echte `.env.local`, echte Datenbank. Kein Runner, kein Setup/Teardown. |
| `scripts/screenshots.mjs` | Sichtprüfung (hell/dunkel/mobil) | Kein Test – erzeugt nur Bilder, prüft nichts. |

`scripts/e2e.mjs` ist für das, was es ist, gut gemacht: es geht den wichtigsten
Ablauf wirklich durch (eintragen → Moderation → freigeben → Stammbaum →
Kontakt → Korrektur). Es hat aber Eigenschaften, die es als alleinige
Absicherung untauglich machen:

- **Nicht wiederholbar.** Jeder Lauf legt über `Testhengst ${Date.now()}` einen
  neuen Datensatz in der Entwicklungsdatenbank an, der dort liegen bleibt.
- **Zeitbasierte Synchronisation.** An sieben Stellen steht
  `waitForTimeout(1200…2000)` statt einer Zustandsbedingung. Auf einem
  langsameren CI-Runner wird das flackern.
- **Prüfung über `body.includes(...)`.** Ein Treffer irgendwo auf der Seite gilt
  als bestanden. Der Test „E-Mail erscheint nach Klick“ würde auch bestehen,
  wenn die Adresse an völlig falscher Stelle stünde.
- **Hängt am Grundbestand.** Der Stammbaum-Test setzt voraus, dass „Metallic
  Cat“, „High Brow Cat“ und „High Brow Hickory“ in `seed-data.ts` stehen. Wer
  den Grundbestand umbaut, bricht den Test, ohne dass die App kaputt ist.
- **Alles-oder-nichts.** Ein Fehler in Schritt 4 lässt die Schritte 5–9 gar
  nicht erst laufen.

### Abdeckung je Modul

| Modul | Zeilen | Heute geprüft durch | Bewertung |
| --- | --- | --- | --- |
| `lib/db.ts` | 692 | e2e, nur der glückliche Pfad | **Kritische Lücke** |
| `lib/validate.ts` | 257 | e2e, 2 von ~20 Regeln | **Kritische Lücke** |
| `lib/pedigree.ts` | 95 | e2e, nur ein linearer Baum | **Kritische Lücke** |
| `lib/auth.ts` | 94 | e2e, richtiges/falsches Passwort | Lücke |
| `lib/rate-limit.ts` | 36 | gar nicht | Lücke |
| `lib/allbreed.ts` | 35 | gar nicht | Lücke |
| `lib/slug.ts` | 32 | nur indirekt | Lücke |
| `lib/labels.ts` | 76 | gar nicht | gering |
| `app/actions.ts` | 153 | e2e, glücklicher Pfad | Lücke |
| `app/admin/actions.ts` | 120 | nur `approveAction` | Lücke |

`rejectAction`, `verifyAction`, `deleteAction` und `handleCorrectionAction`
werden von keinem Test angefasst – also genau die Aktionen, die Daten
unwiderruflich verändern.

---

## 2. Belegte Lücken

Beim Durchgehen des Codes sind drei Stellen aufgefallen, an denen sich die
fehlende Abdeckung bereits ausgewirkt hat. Alle drei wurden gegen den echten
Code nachgestellt.

### 2.1 Die Suche nach Vorfahren scheitert bei Namen mit Apostroph

Die README verspricht: „eine Suche nach ‚Doc Bar‘ liefert also auch dessen
Nachkommen“. Das stimmt – aber nur für Namen ohne Satzzeichen.

In `queryHorses` (`src/lib/db.ts:304`) wird der Suchbegriff mit
`normalizeName()` normalisiert, die Spalten `sire_name`, `dam_name`, `aka`,
`stud_name` und `owner_name` aber nur mit `lower()` verglichen:

```sql
OR lower(COALESCE(sire_name, '')) LIKE @search
```

`normalizeName("Doc O'Lena")` ergibt `doc olena` (der Apostroph fällt ersatzlos
weg), gespeichert ist aber `doc o'lena`. Das Muster `%doc olena%` trifft nicht.

Nachgestellt mit echter Datenbank:

```
Suche "Doc O'Lena"  ->  [ "Doc O'Lena" ]                      # Nachkomme fehlt
Suche "Doc Bar"     ->  [ "Doc Bar", "Fohlen Zwei" ]          # Kontrolle, korrekt
```

Betroffen ist genau die Namensform, für die `normalizeName` laut eigenem
Kommentar gebaut wurde („Doc O'Lena, Doc O´Lena, Doc O’Lena“). Nur `name_key`
wird korrekt normalisiert verglichen – die anderen fünf Spalten nicht.

### 2.2 Der Stammbaum verliert Vorfahren bei Linienzucht

`buildPedigree` (`src/lib/pedigree.ts:33`) schützt mit einem `visited`-Set gegen
Endlosschleifen. Das Set gilt aber für den **ganzen Baum**, nicht für den
aktuellen Pfad. Ein Vorfahr, der auf Vater- *und* Mutterseite vorkommt, wird
deshalb nur beim ersten Auftreten vollständig dargestellt.

Nachgestellt: „Ur Ahn“ steht als Vater von „Vater X“ und von „Mutter Y“, beide
sind Eltern von „Inzucht Fohlen“. Die Großelterngeneration ergibt:

```
Ur Ahn (slug=ur-ahn)     # verlinkt, klappt weiter auf
(leer)
Ur Ahn (slug=null)       # toter Endknoten, kein Link, keine weiteren Vorfahren
(leer)
```

Beim zweiten Auftreten fällt der Knoten in den Namens-Endknoten-Zweig: kein
Link, kein Geburtsjahr, keine Farbe, keine weitere Generation. In der
Quarter-Horse-Zucht ist Linienzucht der Normalfall – Doc Bar oder Three Bars
tauchen in vielen Papieren mehrfach auf. Der Fehler trifft also nicht den
Sonderfall, sondern die Mehrheit der interessanten Stammbäume.

Nebenwirkung: `pedigreeCompleteness` zählt den halbierten Knoten trotzdem als
„gefüllt“, die angezeigte Vollständigkeit ist damit zu optimistisch.

Ein echter Zyklenschutz müsste den *Pfad* verfolgen (beim Aufstieg wieder aus
dem Set entfernen), nicht die Menge aller je besuchten Knoten.

### 2.3 Stuten werden ohne ausdrückliche Angabe nie als Mutter verknüpft

`linkParents` (`src/lib/db.ts:564`) verlangt für eine Mutter `sex = 'mare'`.
`validateSubmission` setzt aber standardmäßig `stallion`
(`src/lib/validate.ts:66`: `keep("sex") || "stallion"`). Wer eine Stute
einträgt und das Geschlecht nicht aktiv umstellt, erzeugt einen Datensatz, der
als Mutter nie gefunden wird – ohne jede Rückmeldung.

Im Grundbestand ist das messbar: von 50 Pferden haben 45 einen Mutternamen,
verknüpft sind davon 4. Auf der Vaterseite sind es 34 von 49. Das ist
größtenteils erwartbar (die Stuten stehen schlicht nicht im Verzeichnis), aber
niemand merkt, wenn sich dieses Verhältnis durch eine Regression verschlechtert.

### 2.4 Kleinere Beobachtungen

- **`toPublicHorse` wird nirgends aufgerufen.** Die Funktion soll Kontakt- und
  Einreicherdaten aus der öffentlichen Sicht entfernen, ist aber toter Code.
  Der Schutz hängt heute daran, dass jede Seite von Hand nur die
  unbedenklichen Felder weiterreicht. Das stimmt aktuell – die Detailseite gibt
  an `ContactReveal` nur `slug` und `ownerName` –, ist aber eine Regel, die
  niemand durchsetzt.
- **`CURRENT_YEAR` wird beim Laden des Moduls berechnet**
  (`src/lib/validate.ts:30`). Ein Prozess, der über den Jahreswechsel läuft,
  lehnt ab Januar gültige Geburtsjahrgänge ab.
- **`x-forwarded-for` wird ungeprüft als Schlüssel der Ratenbegrenzung
  benutzt** (`src/app/actions.ts:23`). Ohne vorgelagerten Proxy, der den Header
  überschreibt, kann sich ein Abgreifer der Kontaktadressen durch Variieren des
  Headers beliebig viele Kontingente verschaffen – also genau das, was die
  Begrenzung verhindern soll.
- **`destroySession` löscht nur das Cookie.** Ein bereits abgegriffenes Token
  bleibt bis zum Ablauf (12 h) gültig, weil die Signatur nur den Ablaufzeitpunkt
  enthält und es keine Sperrliste gibt.

---

## 3. Vorschläge, nach Nutzen sortiert

### Priorität 1 – `lib/validate.ts` (Unit-Tests, ohne Datenbank)

Das lohnendste Ziel: reine Funktion, `FormData` rein, Ergebnis raus, keine
Abhängigkeiten. Heute prüft der e2e-Test 2 von rund 20 Regeln.

Zu testen:

- Jede Fehlermeldung einzeln: Name zu kurz/zu lang, Geburtsjahr außerhalb
  1850…Folgejahr, Todesjahr vor Geburtsjahr, Stockmaß außerhalb 100–200,
  Ländercode nicht zweistellig, ungültige E-Mail, fehlende Einwilligung.
- **Grenzwerte**, nicht nur die Mitte: 1849/1850, 200/201 cm, Name mit genau
  80 und 81 Zeichen.
- **Der Honeypot** (`website` gefüllt ⇒ `_spam`) – nirgends getestet, obwohl er
  der einzige Bot-Schutz des Formulars ist.
- **`safeUrl`**, am besten als exportierte Funktion. Nachgestellte Ergebnisse,
  die als Test festgeschrieben gehören:

  | Eingabe | Ergebnis |
  | --- | --- |
  | `javascript:alert(1)` | `null` ✔ |
  | `data:text/html,…` | `null` ✔ |
  | `evil.com` | `https://evil.com/` (Schema wird ergänzt) |
  | `//evil.com/x` | `https://evil.com/x` |

  Die ersten beiden sind das gewünschte Verhalten und sollten gegen eine
  spätere Umformulierung abgesichert werden.
- **Feldübernahme**: dass `status` immer `pending` und `isVerified` immer
  `false` ist, egal was im Formular steht. Das ist die Regel, die verhindert,
  dass sich jemand an der Moderation vorbei veröffentlicht – und sie wird
  aktuell von keinem Test abgesichert.
- Dass bei Fehlern `values` vollständig zurückkommt, damit das Formular nicht
  leergeräumt wird.

Aufwand: etwa 40 Fälle, ein halber Tag. Keine neue Infrastruktur nötig.

### Priorität 2 – `lib/pedigree.ts` (Unit-Tests mit Datenbank im Speicher)

Direkt wegen 2.2. Zu testen:

- Linienzucht: derselbe Vorfahr auf beiden Seiten muss **beidseitig** verlinkt
  und aufklappbar sein. Dieser Test schlägt heute fehl – er beschreibt den
  Sollzustand.
- Echter Zyklus (Pferd ist über fehlerhafte Daten sein eigener Vorfahr) darf
  nicht in eine Endlosschleife laufen.
- `pedigreeColumns` liefert je Generation genau 2^n Plätze, auch bei komplett
  leerem Baum.
- `pedigreeCompleteness` zählt bei bekanntem Baum die richtige Zahl; ein
  vollständiger Vier-Generationen-Baum ergibt 30 von 30.
- Vorfahre nur als Name (ohne eigenen Datensatz) wird zum Endknoten mit
  `slug: null`.

### Priorität 3 – `lib/db.ts` (Integrationstests gegen `:memory:`)

`better-sqlite3` kann `:memory:`, das macht diese Tests schnell und ohne
Aufräumarbeiten. **Voraussetzung ist eine kleine Umbaumaßnahme:** `getDb()`
speichert die Verbindung in einer Modulvariablen und liest `DATABASE_PATH` nur
beim ersten Aufruf; `seedIfEmpty` hat zusätzlich das modulweite Flag
`seedAttempted`. Solange das so bleibt, kann eine Testdatei nur eine einzige
Datenbank benutzen. Ein exportiertes `resetDbForTests()` oder ein
`openDb(path)`, das die Verbindung zurückgibt, statt sie zu verstecken, löst
das.

Zu testen:

- **Sichtbarkeit nach Status**: `queryHorses` liefert ohne Angabe nur
  `approved`. Ein `pending`-Eintrag darf über keinen Filter, keine Suche und
  keine Sortierung auftauchen. Das ist die zentrale Zusage der App und hängt
  heute an einer einzigen e2e-Prüfung.
- **Suche**, einschließlich des Falls aus 2.1 (Vorfahrenname mit Apostroph).
  Dazu: Umlaute, Groß-/Kleinschreibung, mehrere Leerzeichen.
- **Verknüpfung der Abstammung**: Vorfahr nach dem Nachkommen angelegt
  (`linkAsParentOfOthers`), Vorfahr davor angelegt (`linkParents`), Wallach
  wird nie Elternteil, Stute nie Vater. Und der Fall aus 2.3.
- **`uniqueSlug`**: zwei Pferde gleichen Namens ergeben `name` und `name-2`.
- **`seedFamousHorses` ist wiederholbar** – der zweite Lauf legt 0 Pferde an.
  Nachgestellt und derzeit korrekt; genau deshalb festschreiben.
- **`getOffspring`** listet nur freigegebene Nachkommen.
- **Datenintegrität des Grundbestands** als eigener Test: keine doppelten Namen,
  jedes `yearOfDeath >= yearOfBirth`, jeder Ländercode zweistellig, alle
  `disciplines` aus `DISCIPLINES`. Der Bestand wird von Hand gepflegt und wächst
  – so ein Test kostet 20 Zeilen und fängt Tippfehler beim Erweitern ab.

### Priorität 4 – `lib/auth.ts` und `lib/rate-limit.ts`

Beides sicherheitsrelevant und beides quasi ungetestet.

Für `auth.ts` (die Cookie-Funktionen brauchen einen Stub für
`next/headers`, `checkPassword`/`isAdminConfigured` nicht):

- Gefälschtes Token wird abgelehnt; Token mit gültiger Signatur, aber
  abgelaufenem Zeitstempel ebenfalls.
- Token, das mit einem anderen `SESSION_SECRET` signiert wurde, wird abgelehnt.
- Kaputte Form (kein Punkt, leere Signatur) führt zu `false`, nicht zu einer
  Ausnahme.
- `ADMIN_PASSWORD=bitte-aendern` und leeres Passwort sperren den Bereich – der
  Platzhalter aus `.env.example` darf nie funktionieren.

Für `rate-limit.ts`:

- Der `limit`-te Aufruf geht noch durch, der `limit+1`-te nicht.
- Nach Ablauf des Fensters ist wieder frei (Zeit injizierbar machen oder eine
  sehr kurze Fensterbreite verwenden).
- `retryAfterMs` ist plausibel und nie negativ.
- Verschiedene Schlüssel stören einander nicht.

Auch hier ein Testbarkeitsproblem: `buckets` ist eine Modulvariable ohne
Rücksetzmöglichkeit, Tests beeinflussen sich dadurch gegenseitig. Ein
exportiertes `resetRateLimit()` genügt.

### Priorität 5 – Server Actions

Mit den Bausteinen aus Priorität 3 und 4 lassen sich die Aktionen direkt
aufrufen (`next/headers`, `next/cache` und `next/navigation` gestubbt):

- `revealContactAction` gibt für `pending`-Pferde **keine** Adresse heraus –
  die Regel, die verhindert, dass Kontaktdaten vor der Freigabe abfließen.
- `revealContactAction` bei unbekanntem Slug und bei fehlender Adresse.
- Die Aktionen der Moderation ohne Anmeldung: `approve`, `reject`, `verify`,
  `delete` und `handleCorrection` müssen alle werfen. Heute prüft kein Test,
  dass `deleteAction` überhaupt eine Anmeldung verlangt.
- Der Honeypot in `reportCorrectionAction` meldet `sent`, legt aber nichts an.
- Die Dublettenerkennung in `submitHorseAction` setzt die `adminNote`.

### Priorität 6 – e2e absichern statt ersetzen

Der Ablauftest soll bleiben, aber verlässlich werden:

- Gegen eine eigene Datenbank laufen lassen (`DATABASE_PATH` auf eine
  temporäre Datei), damit die Entwicklungsdaten sauber bleiben.
- `waitForTimeout` durch `expect`/`waitFor` auf konkrete Zustände ersetzen.
- Statt `body.includes(...)` gezielt auf Elemente prüfen.
- Server im Test selbst starten und beenden, damit ein einziger Befehl genügt.
- Die fehlenden Wege ergänzen: Ablehnen, Löschen, „geprüft“ setzen,
  Korrektur als erledigt markieren.

---

## 4. Vorschlag für das Setup

**Runner: `node:test` mit `tsx`.** Das Projekt verlangt bereits Node ≥ 22.6 und
hat `tsx` als Entwicklungsabhängigkeit. Damit kommt keine einzige neue
Abhängigkeit dazu, und Node bringt seit 22 auch die Abdeckungsmessung mit:

```jsonc
// package.json
"scripts": {
  "test":          "tsx --test 'src/**/*.test.ts'",
  "test:coverage": "tsx --test --experimental-test-coverage 'src/**/*.test.ts'",
  "test:e2e":      "node scripts/e2e.mjs"
}
```

Wer lieber Watch-Modus, bessere Ausgabe und einfaches Mocking von `next/*` hat,
nimmt stattdessen Vitest – das kostet eine Abhängigkeit, spart aber bei den
Server-Action-Tests einiges an Handarbeit. Für die Priorität-1- und
Priorität-2-Tests reicht `node:test` vollkommen.

**CI**: `.github/workflows/ci.yml` mit `npm ci`, `npx tsc --noEmit`, `npm test`
und `npm run build`. Allein `tsc --noEmit` und `next build` in CI wären schon
ein Gewinn – heute prüft nichts automatisch, ob das Projekt überhaupt baut.
(`tsc --noEmit` läuft aktuell sauber durch.)

**Achtung: `npm run lint` ist kaputt.** Das Skript ruft `next lint` auf, das es
in Next 16 nicht mehr gibt. Next deutet `lint` als Verzeichnisnamen und bricht
ab:

```
$ npx next lint
Invalid project directory provided, no such directory: /home/user/Friday/lint
```

Der Befehl endet trotzdem mit Rückgabewert 0 – in CI wäre das ein Schritt, der
nie etwas prüft und trotzdem immer grün ist. Vor der Aufnahme in CI muss das
Skript auf ESLint direkt umgestellt werden (`eslint .` mit
`eslint-config-next`) oder ersatzlos entfallen.

**Kleine Umbauten, die das Testen erst möglich machen** (jeweils wenige Zeilen):

1. `resetDbForTests()` in `db.ts` exportieren, damit mehrere Datenbanken pro
   Testlauf möglich sind (setzt `db` und `seedAttempted` zurück).
2. `resetRateLimit()` in `rate-limit.ts` exportieren.
3. `safeUrl` aus `validate.ts` exportieren.
4. `CURRENT_YEAR` in eine Funktion verwandeln, statt sie beim Laden zu
   berechnen – behebt nebenbei den Jahreswechsel-Fehler aus 2.4.

## 5. Vorgeschlagene Reihenfolge

| Schritt | Inhalt | Aufwand |
| --- | --- | --- |
| 1 | Runner + CI aufsetzen, `tsc --noEmit` und `next build` in CI | ½ Tag |
| 2 | `validate.ts` und `slug.ts`/`allbreed.ts` (Priorität 1) | ½ Tag |
| 3 | Testbarkeits-Umbauten 1–4 | ½ Tag |
| 4 | `pedigree.ts` inklusive Linienzucht (Priorität 2) | ½ Tag |
| 5 | `db.ts` gegen `:memory:` (Priorität 3) | 1 Tag |
| 6 | `auth.ts`, `rate-limit.ts`, Server Actions (Priorität 4–5) | 1 Tag |
| 7 | e2e stabilisieren (Priorität 6) | ½ Tag |

Die Schritte 2 und 4 schreiben Tests, die den heutigen Zustand teilweise als
**fehlschlagend** ausweisen (2.1, 2.2). Das ist beabsichtigt: sie beschreiben
das gewünschte Verhalten und dienen als Vorlage für die Korrektur.
