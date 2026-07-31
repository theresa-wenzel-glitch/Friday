# Vorschau als eine HTML-Datei

`atlas-vorschau.html` ist die App in **einer Datei**. Doppelklicken, fertig —
kein Node, kein Server, keine Installation, keine Internetverbindung.

```bash
node demo/build.mjs      # baut atlas-vorschau.html neu
```

Das Build-Skript setzt die Playbook-Daten aus
`engine/src/playbooks/data/` in `template.html` ein, statt sie abzutippen. So
kann die Vorschau nicht von den echten Daten abweichen.

## Was funktioniert

Konto anlegen, anmelden, abmelden · Ziel eingeben · Sechs-Fragen-Interview ·
Plan mit Meilensteinen und Terminen · Heute-Ansicht · Pfad · Aufgaben abhaken ·
Fortschritt bleibt nach dem Neuladen erhalten · Datenexport · Konto löschen ·
Hell- und Dunkelmodus.

## Was hier anders ist als in `engine/`

| | Vorschau (diese Datei) | `engine/` |
|---|---|---|
| Pläne | aus drei Playbooks, nicht personalisiert | von Claude erzeugt, auf die Situation zugeschnitten |
| Zieldomänen | Café, Freelance, Onlineshop | beliebig |
| Konten | localStorage, SHA-256-Hash | scrypt, Sitzungstoken, Server |
| Daten | in diesem Browser | in einer Datei auf dem Server |
| Validator | nicht enthalten | alle neun Regeln |

**Die Anmeldung hier ist eine Vorschau, keine Sicherheit.** Alles liegt
unverschlüsselt im localStorage des Browsers. Wer das Gerät hat, hat die Daten.
Die korrekt gebaute Anmeldung steckt in `engine/src/auth.ts`.

Der Grund für die Portierung: eine HTML-Datei lässt sich verschicken und ansehen,
ein Node-Server nicht.
