# Vorschau als eine HTML-Datei

`atlas-vorschau.html` ist die App in **einer Datei**. Doppelklicken, fertig —
kein Node, kein Server, keine Installation, keine Internetverbindung.

```bash
node demo/build.mjs      # baut atlas-vorschau.html neu
```

Das Build-Skript setzt die Playbook-Daten aus
`engine/src/playbooks/data/` in `template.html` ein, statt sie abzutippen. So
kann die Vorschau nicht von den echten Daten abweichen. Danach prüft es drei
Dinge und bricht ab, wenn eines fehlschlägt:

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

Konto anlegen, anmelden, abmelden · Ziel eingeben · Sechs-Fragen-Interview ·
Plan mit Meilensteinen und Terminen · Heute-Ansicht · Pfad · Prüfung
(sieben der neun Validator-Regeln, im Browser gerechnet) · Aufgaben abhaken
und verschieben · Fortschritt bleibt nach dem Neuladen erhalten · Datenexport ·
Konto löschen · Hell- und Dunkelmodus · mehrere Ziele nebeneinander.

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
| Pläne ohne Key | aus drei Playbooks, nicht personalisiert | dasselbe (dokumentierter Rückfallweg) |
| Pläne mit Key | Claude, direkt aus dem Browser | Claude, vom Server |
| Zieldomänen | Café, Freelance, Onlineshop (ohne Key) | beliebig |
| Konten | localStorage, SHA-256-Hash | scrypt, Sitzungstoken, HttpOnly-Cookie |
| Daten | in diesem Browser | in einer Datei auf dem Server, pro Konto getrennt |
| Validator | 7 von 9 Regeln | alle neun, plus Reparaturschleife |
| Sicherheitsfilter | nein | ja (Krise, Überschuldung, Essstörung, Illegales) |

**Die Anmeldung hier ist eine Vorschau, keine Sicherheit.** Alles liegt
unverschlüsselt im localStorage des Browsers. Wer das Gerät hat, hat die Daten.
Die korrekt gebaute Anmeldung steckt in `engine/src/auth.ts`.

Der Grund für die Portierung: eine HTML-Datei lässt sich verschicken und ansehen,
ein Node-Server nicht.
