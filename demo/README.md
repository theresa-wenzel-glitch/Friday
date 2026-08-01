# Vorschau als eine HTML-Datei

`atlas-vorschau.html` ist die App in **einer Datei**. Doppelklicken, fertig —
kein Node, kein Server, keine Installation, keine Internetverbindung.

```bash
node demo/build.mjs      # baut atlas-vorschau.html neu
```

```bash
node --test demo/test/planner.test.mjs   # 16 Tests für den Planer
```

Das Build-Skript setzt vier Dinge in `template.html` ein, statt sie
abzutippen: die Playbook-Daten aus `engine/src/playbooks/data/`, die
Fachmodule, die Grundmuster und den Planer-Code aus `demo/planner/`. Die Tests
prüfen genau dieselben Dateien — eine Quelle, zwei Nutzer. Danach prüft der
Build drei Dinge und bricht ab, wenn eines fehlschlägt:

1. Das eingebettete Skript ist syntaktisch gültig (`new Function`).
2. `view-auth` ist **nicht** `hidden` — sonst bleibt die Seite ohne JavaScript leer.
3. Der `<noscript>`-Hinweis ist vorhanden.

Punkt 1 und 2 stehen dort, weil beides schon einmal schiefgegangen ist: ein
deutsches Schlusszeichen (`"`) in einer Zeichenkette mit geraden
Anführungszeichen hat das gesamte Skript ungültig gemacht, und weil alle
Ansichten mit `hidden` starteten, war in der iOS-Vorschau nichts als ein Banner
zu sehen.

## Öffnen

| Wo | Wie |
|---|---|
| iPhone/iPad | Datei antippen → Teilen-Symbol → **„In Safari öffnen“** |
| Mac/Windows | Rechtsklick → **Öffnen mit** → Browser |

Das Vorschau-Fenster von Mail, Nachrichten und der Dateien-App führt **kein
JavaScript** aus. Die Datei zeigt dort den Anmeldebildschirm und einen Hinweis,
wie man sie richtig öffnet — die App selbst läuft erst im Browser.

## Was funktioniert

Konto anlegen, anmelden, abmelden · **jedes Ziel planen, auch ohne API-Key** ·
Sechs-Fragen-Interview · Plan mit Meilensteinen und Terminen · Heute-Ansicht ·
Pfad · Prüfung (sieben der neun Validator-Regeln, im Browser gerechnet) ·
Aufgaben abhaken und verschieben · Fortschritt bleibt nach dem Neuladen
erhalten · Datenexport · Konto löschen · Hell- und Dunkelmodus · mehrere Ziele
nebeneinander.

## Der Planer: drei Ebenen, von konkret nach allgemein

`demo/planner/` enthält den regelbasierten Planer. Er kommt ohne Sprachmodell
aus und fällt nie aus — für jedes Ziel greift mindestens die unterste Ebene.

| Ebene | Woher | Deckt ab |
|---|---|---|
| **Playbook** | `engine/src/playbooks/data/` — redaktionell erstellt | 3 Gründungsvorhaben |
| **Fachmodul** | `demo/planner/domains.json` | 27 Lebensbereiche: Sport, Gesundheit, Lernen, Karriere, Finanzen, Wohnen, Kreatives, Soziales |
| **Grundmuster** | `demo/planner/archetypes.json` | 7 Zielformen: etwas lernen · etwas aufbauen · auf einen Termin hinarbeiten · körperliches Ziel · Gewohnheit ändern · finanzielles Ziel · Lebenssituation verändern |

Die Zuordnung läuft über Stichwörter; ein Treffer zählt so viel, wie das
Stichwort lang ist, Playbooks bekommen einen Bonus. Passt kein Fachmodul,
entscheidet die **Form** des Ziels über das Grundmuster — und der Plan sagt
das in seinen Annahmen ausdrücklich, statt Genauigkeit vorzutäuschen.

Der Zeitraum kommt in dieser Reihenfolge: aus der eingegebenen Frist, sonst aus
dem Zielsatz („in 18 Monaten“), sonst aus einem Erfahrungswert. Die Aufwände
werden auf die angegebenen Wochenstunden herunterskaliert, damit Regel 5 des
Validators hält — ein Plan, der die Kapazität reißt, ist eine Wunschliste.

**Was der Planer nicht kann:** auf die Besonderheiten einer einzelnen Lage
eingehen. Er kennt den typischen Weg für Ziele einer Art. Dafür gibt es den
API-Key.

### Wo es keinen Plan gibt

Für Suizidgedanken, Selbstverletzung, Essstörungen und unzulässige Vorhaben
erzeugt Atlas bewusst keinen Plan, sondern nennt eine Anlaufstelle — auch dann,
wenn ein API-Key hinterlegt ist. Portiert aus `engine/src/pipeline.ts`.

## Mit eigenem API-Key: Pläne von Claude

Unter **Einstellungen** lässt sich ein Anthropic-API-Key hinterlegen. Dann ruft
die Datei `api.anthropic.com` direkt aus dem Browser auf und plant für
**beliebige** Ziele statt nur für die drei Playbooks — mit demselben
Systemprompt, demselben JSON-Schema und derselben Validierung wie `engine/`.
Kosten: etwa 0,15–0,20 € pro Plan über den eigenen Anthropic-Account.

Zwei Einschränkungen:

- Der Schlüssel liegt im localStorage des Browsers. Für den Eigengebrauch in
  Ordnung, für ein öffentliches Produkt nicht — dort gehört er auf den Server,
  so wie in `engine/src/model/client.ts`.
- Der Aufruf funktioniert nur, wenn die Datei **lokal** geöffnet ist. Über eine
  gehostete Adresse mit strenger Content-Security-Policy wird die Verbindung zu
  `api.anthropic.com` blockiert; dann bleiben die drei Playbooks.

## Was hier anders ist als in `engine/`

| | Vorschau (diese Datei) | `engine/` |
|---|---|---|
| Pläne ohne Key | regelbasiert, jedes Ziel | nur Playbook-Rückfall (3 Vorhaben) |
| Pläne mit Key | Claude, direkt aus dem Browser | Claude, vom Server |
| Konten | localStorage, SHA-256-Hash | scrypt, Sitzungstoken, HttpOnly-Cookie |
| Daten | in diesem Browser | in einer Datei auf dem Server, pro Konto getrennt |
| Validator | 7 von 9 Regeln | alle neun, plus Reparaturschleife |
| Sicherheitsfilter | ja (Krise, Essstörung, Illegales) | ja, zusätzlich Überschuldung und medizinische Risiken |

Der regelbasierte Planer ist hier weiter als in `engine/` — dort ist der
Playbook-Rückfall bewusst schmal, weil dort im Normalbetrieb Claude plant.

**Die Anmeldung hier ist eine Vorschau, keine Sicherheit.** Alles liegt
unverschlüsselt im localStorage des Browsers. Wer das Gerät hat, hat die Daten.
Die korrekt gebaute Anmeldung steckt in `engine/src/auth.ts`.

Der Grund für die Portierung: eine HTML-Datei lässt sich verschicken und ansehen,
ein Node-Server nicht.
