# Tippfeld – Designsystem für eine Fußball-Prognose-App

Das ist das komplette Aussehen deiner App: Farben, Schrift, Symbole, Illustrationen
und fertige Bausteine wie Spielkarte, KI-Analyse und Rangliste.

**Alles darin ist eigens gezeichnet.** Es wird kein Vereinswappen, kein Ligalogo und
kein Sponsorenzeichen nachgebildet. Mannschaften, für die keine Bildrechte vorliegen,
erscheinen als neutraler Schild mit Kürzel plus ausgeschriebenem Namen.

## Anschauen (ohne Programmieren)

Lade den Ordner herunter und öffne **`index.html`** mit einem Doppelklick. Es öffnet
sich eine Seite, auf der alles gezeigt wird. Du brauchst dafür nichts zu installieren.
Oben rechts kannst du zwischen Hell- und Dunkelmodus umschalten.

## Was liegt wo

| Datei / Ordner | Was drin ist |
| --- | --- |
| `index.html` | Die Schaustafel: alles auf einer Seite zum Anschauen |
| `tokens.css` | Farben, Schriftgrößen, Abstände, Radien – die Grundwerte |
| `tokens.json` | Dieselben Werte maschinenlesbar, für App-Builder und Figma |
| `components.css` | Die fertigen Bausteine (Karte, Chip, Balken, Knopf, Tabelle) |
| `seite.css` | Nur das Layout der Schaustafel, nicht Teil des Systems |
| `icons/` | 24 Symbole, je 24 × 24 px, Farbe passt sich automatisch an |
| `illustrations/` | Logo, App-Icon, Splash Screen, Kartengrafiken |

## Wie du es einem App-Builder gibst

Die Datei **`PROMPT-FUER-APP-BUILDER.md`** enthält den fertigen Auftragstext. Du kannst
ihn eins zu eins kopieren. Gib zusätzlich `tokens.json` und den Ordner `icons/` mit –
dann muss niemand die Farben abtippen.

Wenn der App-Builder keine Dateien annimmt: Die wichtigsten Werte stehen im Prompt
noch einmal ausgeschrieben.

## Die wichtigsten Regeln in Kurzform

- **Orange (`#FF5A1F`) ist die einzige laute Farbe.** Pro Bildschirm bekommt sie nur
  die eine wichtigste Aktion.
- **Grün, Gelb, Rot bedeuten etwas** – Sieg, Unentschieden, Niederlage. Nie zur Deko.
- **Farbe steht nie allein.** Neben jedem farbigen Zustand steht auch ein Wort oder
  Kürzel, damit die App bei Farbfehlsichtigkeit verständlich bleibt.
- **Alles Antippbare ist mindestens 44 × 44 px groß.**
- **Zahlen bekommen Tabellenziffern** (`tabular-nums`), damit Spalten sauber stehen.
- **Keine Wettsprache**, keine Quoten, kein Echtgeld. Die App tippt, sie wettet nicht.

## Schriften

| Rolle | Schrift | Ersatz, falls nicht verfügbar |
| --- | --- | --- |
| Anzeige, Überschriften | Oswald | Arial Narrow, sans-serif |
| Fließtext | Source Sans 3 | Segoe UI, system-ui, sans-serif |
| Zahlen und Daten | IBM Plex Mono | ui-monospace, monospace |

Alle drei sind kostenlos über Google Fonts nutzbar, auch in kommerziellen Apps
(SIL Open Font License). Prüfe die Lizenz trotzdem einmal selbst, bevor du
veröffentlichst – Lizenzen können sich ändern.

## Vor der Veröffentlichung

1. **Markenrecherche für das Logo.** Prüfe beim DPMA (dpma.de, kostenlose Recherche)
   und beim EUIPO, ob ein ähnliches Zeichen in Klasse 9 (Software) oder 41
   (Sport, Unterhaltung) eingetragen ist. Bei Unsicherheit eine Anwältin oder einen
   Anwalt für Markenrecht draufschauen lassen.
2. **Datenquelle klären.** Spielpläne und Ergebnisse brauchen eine Lizenz oder eine
   API mit passenden Nutzungsbedingungen. Vereinsnamen als reiner Text sind in der
   Regel unproblematisch, Wappen und Logos sind es nicht.
3. **App-Store-Regeln.** Ohne Echtgeld und ohne Quoten fällt die App nicht unter die
   Glücksspiel-Kategorien von Apple und Google. Das sollte auch in der Beschreibung
   und in den Texten der App erkennbar bleiben.

---

Der Name „Tippfeld“ ist ein Vorschlag, kein geprüfter Markenname. Du kannst ihn
jederzeit austauschen – im Designsystem musst du dafür nur die Wortmarke in
`illustrations/logo-wortmarke.svg` und `illustrations/splash.svg` ändern.
