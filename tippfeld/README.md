# Tippfeld – die App

Fußballprognosen und Tippligen. Du tippst Ergebnisse, wählst pro Spiel vier
Spieler, bekommst eine statistische Einschätzung und misst dich mit anderen in
privaten oder öffentlichen Ligen.

**Ohne Echtgeld, ohne Quoten, ohne Wettsprache.**

Die Oberfläche benutzt das Designsystem aus dem Nachbarordner
[`../design-system`](../design-system). Dunkel ist der Standard, Hell ist
vollständig da und lässt sich im Profil umschalten.

---

## Loslegen

Du brauchst [Node.js](https://nodejs.org) ab Version 22.

```bash
cd tippfeld
npm install
cp .env.example .env.local     # dann .env.local öffnen und Werte eintragen
npm run seed                   # Spielplan und Demo-Daten anlegen
npm run dev
```

Danach läuft die App auf <http://localhost:3000>.

Melde dich mit einem dieser Namen an: **Mira, Jonas, Theo, Alma, Ravi** – oder
tippe einen neuen Namen ein, dann bekommst du ein frisches Konto.
Der Beitrittscode der privaten Demo-Liga lautet **TF7K2M**.

### Die drei Werte in `.env.local`

| Name | Wofür |
| --- | --- |
| `ADMIN_PASSWORT` | Damit kommst du unter `/admin` herein. Frei wählbar. |
| `SITZUNG_GEHEIMNIS` | Lange Zufallszeichenfolge. Damit werden die Anmelde-Cookies unterschrieben. |
| `DATENQUELLE` | Zurzeit nur `demo`. Später die Kennung deiner echten Fußball-API. |

Eine Zufallszeichenfolge bekommst du mit:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

---

## Was die App kann

| Bereich | Was passiert |
| --- | --- |
| **Start** | Begrüßung, Punktestand, Platzierungen, offene Tipps, nächster Spieltag, Kurzfassung der KI-Einschätzung, Schnellzugriff |
| **Spiele** | Spieltag wählen, alle Partien als Karte, Stand der eigenen Tipps |
| **Spieldetail** | Datum, Wettbewerb, Form, Tor- und Gegentorschnitt, Heim-/Auswärtsbilanz, KI-Analyse, Tippabgabe, Spielerauswahl, Torschützen |
| **KI-Analyse** | Wahrscheinlichkeiten für Heim, Remis, Gast mit Begründung, Einflussfaktoren und Unsicherheiten |
| **Meine Tipps** | Alle bisherigen Tipps mit Ergebnis, Punkten und den Häkchen für Tendenz, Tordifferenz und exaktes Ergebnis |
| **Ligen** | Gründen, beitreten per Code oder QR-Code, öffentliche Ligen durchsuchen und filtern, Rangliste gesamt und je Spieltag, Liga verlassen, melden |
| **Profil** | Name, Profilzeichen, Hell/Dunkel, Sprache, Benachrichtigungen, Datenschutzhinweise, Konto löschen |
| **Admin** | Ergebnisse korrigieren, Spieltage durchgehen, Datenquelle abgleichen, Standard-Punktesystem setzen, Ligen sperren, Meldungen abarbeiten |

## Das Punktesystem

| Fall | Punkte |
| --- | --- |
| Exaktes Ergebnis | 5 |
| Richtige Tordifferenz, aber anderes Ergebnis | 3 |
| Richtige Tendenz | 2 |
| Sieger nicht getroffen | 0 |
| Getippter Spieler trifft | +2 je Tor |
| Getippter Spieler legt auf | +1 je Vorlage |
| Getippter Torwart bleibt ohne Gegentor | +2 |

Die Ergebnisstufen zählen **nicht** zusammen, es gilt immer nur die beste
erreichte Stufe. Bei einem Unentschieden ist die Tordifferenz zwangsläufig
gleich, deshalb gibt es dort die Tendenzpunkte:

- Tipp 1:1, Ergebnis 0:0 → Unentschieden richtig, Ergebnis falsch → **2 Punkte**
- Tipp 2:0, Ergebnis 3:1 → Sieger und Differenz richtig → **3 Punkte**
- Tipp 2:1, Ergebnis 2:1 → exakt → **5 Punkte**

Jede Liga kann eigene Werte haben. Der Adminbereich setzt den Standard für neu
gegründete Ligen; bestehende Ligen behalten ihr System, sonst würden sich ihre
Ranglisten rückwirkend ändern.

Prüfen lässt sich das jederzeit selbst:

```bash
npm run pruefen
```

## Wie die KI-Analyse rechnet

Es steckt kein Sprachmodell dahinter, sondern eine offengelegte Rechnung in
[`src/lib/ki.ts`](src/lib/ki.ts):

1. Aus Tor- und Gegentorschnitt wird je Mannschaft eine Angriffs- und eine
   Abwehrstärke gegenüber dem Ligamittel bestimmt – getrennt für Heim und
   auswärts.
2. Bei wenigen Spielen wird das Ergebnis zur Ligamitte hin gezogen, damit
   einzelne Ausreißer die Schätzung nicht übernehmen.
3. Daraus wird für beide Seiten eine erwartete Torzahl geschätzt und über eine
   Poisson-Verteilung in Wahrscheinlichkeiten für jedes Ergebnis umgerechnet.

Die App nennt das Ergebnis „statistische Prognose“ oder „KI-Einschätzung“,
niemals eine Vorhersage. Zu jeder Analyse gehören die Datenbasis, die
Einflussfaktoren und die Unsicherheiten.

---

## Wie die Teile zusammenhängen

```
Datenquelle  →  Backend/Datenbank  →  KI-Analyse  →  Oberfläche
```

| Ordner / Datei | Aufgabe |
| --- | --- |
| `src/lib/datenquelle/typen.ts` | Die Schnittstelle, die jede Datenquelle erfüllen muss |
| `src/lib/datenquelle/demo.ts` | Übungsdaten, klar als solche gekennzeichnet |
| `src/lib/datenquelle/index.ts` | Auswahl über die Umgebungsvariable `DATENQUELLE` |
| `src/lib/db.ts` | Datenbank und Abgleich mit der Datenquelle |
| `src/lib/punkte.ts` | Punkterechnung, ohne Datenbank, ohne Zufall |
| `src/lib/ki.ts` | Statistische Einschätzung, ohne Datenbank, ohne Zufall |
| `src/lib/abfragen.ts` | Alle Lesezugriffe der Oberfläche |
| `src/lib/aktionen.ts` | Alle schreibenden Vorgänge, jeweils mit Prüfung |
| `src/lib/sitzung.ts` | Anmeldung und Adminzugang |
| `src/app/` | Die Seiten |
| `src/components/` | Die Bausteine der Oberfläche |
| `scripts/design-sync.mjs` | Holt Farben, Symbole und Grafiken aus `../design-system` |

### Eine echte Datenquelle anschließen

1. Neue Datei unter `src/lib/datenquelle/`, zum Beispiel `meinanbieter.ts`.
2. Ein Objekt exportieren, das `Datenquelle` erfüllt: `kennung`, `name`,
   `istDemo: false`, `lizenzhinweis` und `laden()`.
3. In `src/lib/datenquelle/index.ts` eintragen.
4. In `.env.local` `DATENQUELLE=meinanbieter` setzen.
5. Im Adminbereich auf „Jetzt mit der Datenquelle abgleichen“ tippen.

An der App selbst ist dafür nichts zu ändern. Sobald `istDemo` auf `false`
steht, verschwinden die Demo-Hinweise von allein.

---

## Sicherheit

- **Tipps liegen auf dem Server.** Die Datenbank ist die einzige Wahrheit, dem
  Browser wird nichts geglaubt.
- **Die Tippfrist wird serverseitig durchgesetzt.** Es gibt genau eine Stelle,
  die darüber entscheidet (`tippfristOffen` in `src/lib/aktionen.ts`), und sie
  rechnet mit der Serverzeit. Ein manipuliertes Formular kommt damit nicht
  durch.
- **Punkte werden nie gespeichert, sondern immer neu gerechnet.** Dadurch kann
  kein falscher Zwischenstand hängenbleiben, und eine Ergebniskorrektur im
  Adminbereich wirkt sofort in jeder Rangliste.
- **Der Adminbereich hat ein eigenes Passwort** und ein eigenes Cookie. Ein
  normales Konto kommt nicht hinein, auch nicht über die Adresse.
- **Spieler-Tipps werden geprüft:** die Person muss auf der genannten Position
  spielen und einer der beiden Mannschaften angehören.
- **Die Anmeldekennung steht in einem unterschriebenen Cookie**, nicht in einem
  Formularfeld. Ein Browser kann sich nicht als jemand anderes ausgeben.

## Was noch fehlt

Ehrlich aufgelistet, damit du weißt, woran du bist:

- **Richtige Anmeldung.** Zurzeit reicht ein Name, es gibt kein Passwort. Für
  eine Veröffentlichung gehört hier eine Anmeldung mit Passwort oder über einen
  Anbieter-Login hin, samt E-Mail-Bestätigung.
- **Benachrichtigungen.** Die Einstellung wird gespeichert, versendet wird noch
  nichts. Dafür fehlt ein Versanddienst.
- **Weitere Sprachen.** Ligen können eine Sprache tragen und danach gefiltert
  werden; die Oberfläche selbst gibt es nur auf Deutsch.
- **Live-Ticker.** Ergebnisse kommen über den Abgleich, nicht in Echtzeit.
- **Eine Datenbank für größere Lasten.** SQLite reicht für einen Server. Für
  viele gleichzeitige Nutzer wäre PostgreSQL die nächste Stufe.

## Vor der Veröffentlichung prüfen

- Nutzungsrechte für **Wettbewerbsnamen, Vereinsnamen, Spielernamen,
  Vereinslogos, Liga-Logos, Spielerbilder, Statistik- und Live-Daten** – jedes
  einzeln, mit dem Anbieter deiner Datenquelle.
- Solange dafür keine Lizenz vorliegt: keine geschützten Logos, keine
  Spielerfotos, keine Nachahmung offizieller Grafiken. Die App zeigt deshalb
  überall nur Kürzel in einer eigenen Schildform.
- Das Logo auf Markenähnlichkeit prüfen lassen (DPMA, EUIPO).
- Datenschutzerklärung und Impressum ergänzen.
- `SITZUNG_GEHEIMNIS` und `ADMIN_PASSWORT` auf echte, lange Werte setzen.

---

## Befehle

| Befehl | Wirkung |
| --- | --- |
| `npm run dev` | App zum Entwickeln starten |
| `npm run build` | App für den Betrieb bauen |
| `npm run start` | Gebaute App starten |
| `npm run seed` | Spielplan holen und Demo-Konten, Ligen und Tipps anlegen |
| `npm run pruefen` | Punkterechnung gegen alle Beispiele prüfen |
| `npm run e2e` | Mit einem echten Browser durch die ganze App klicken |
| `npm run design:sync` | Änderungen am Designsystem in die App übernehmen |

`npm run e2e` setzt voraus, dass die App bereits läuft:

```bash
npm run build && npm run start      # Fenster 1
npm run e2e                         # Fenster 2
```
