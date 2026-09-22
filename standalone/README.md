# SoundLab als einzelne Datei

`soundlab.html` ist die komplette App in einer Datei - dieselben Instrumente,
dieselbe Band, derselbe Song Builder und Pro Mode wie unter `/soundlab`, nur
ohne Next.js und ohne Bauschritt.

Sie ist als Artifact veröffentlicht und dort direkt im Browser aufrufbar:
<https://claude.ai/artifact/45o86pHW9CHuBs8yXHKuuf>

## Unterschiede zur Version im `src/`-Ordner

| | `src/app/(soundlab)/` | `standalone/soundlab.html` |
| --- | --- | --- |
| Aufbau | React-Komponenten, viele Dateien | eine Datei, reines JavaScript |
| Start | `npm run dev` | Datei im Browser öffnen |
| Zweck | weiterentwickeln | verschicken und sofort benutzen |

Beide erzeugen den Klang auf dieselbe Weise: Web Audio API, keine Audiodateien.
Wer etwas an der Musik ändert, sollte es in beiden nachziehen - die
Klangerzeugung in `src/lib/soundlab/` und der obere Skriptblock in
`soundlab.html` sind Zeile für Zeile dieselbe Logik.

## Beim Veröffentlichen beachtet

Die Datei wird beim Veröffentlichen in ein fertiges HTML-Gerüst eingesetzt,
deshalb stehen hier weder `<!doctype>` noch `<html>`- oder `<body>`-Tags.
Zum lokalen Öffnen im Browser fehlt also die Hülle - dafür einmal

```html
<!doctype html><html><head><meta charset="utf-8"></head><body> ... </body></html>
```

darumlegen.
