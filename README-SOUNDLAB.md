# SoundLab

> „Du musst kein Instrument spielen können, um Musik zu machen.“

SoundLab ist eine Musik-Web-App für Menschen ohne Vorkenntnisse - und für
Fortgeschrittene, wenn sie mehr wollen. Sie liegt in diesem Projekt unter
**`/soundlab`**; das Hengstverzeichnis unter `/` bleibt davon unberührt.

## Losgehen

```bash
npm install
npm run dev
```

Dann im Browser öffnen:

| Adresse | Was dort ist |
| --- | --- |
| <http://localhost:3000/soundlab> | Landing Page |
| <http://localhost:3000/soundlab/app> | Dashboard (der Einstieg) |
| <http://localhost:3000/> | das alte Hengstverzeichnis |

## Was die App kann

**Instrumente** (`/soundlab/app/instrumente`)

- **Klavier** mit Maus, Touch und Computertastatur (A–L für weiße, W/E/T/Z/U für
  schwarze Tasten, Pfeiltasten wechseln die Oktave). Vier Klangfarben, ein
  „Easy Play“-Modus, der jeden Anschlag auf den nächsten passenden Ton zieht,
  und drei Melodien, bei denen die nächste Taste leuchtet.
- **Schlagzeug** mit sechs Pads (Tasten Y/X/C/V/B/N), sechs fertigen Beats und
  einem Raster, in dem man sieht, was man hört.
- **Gitarre** ohne Griffbrett: vier passende Akkorde, ein Schlagbalken zum
  Ziehen, Auto-Strum im Takt.
- **Bass** in drei Lagen (Tief/Mitte/Hoch), immer in der Tonart.
- **Synthesizer** als Klangfeld - waagerecht die Töne, senkrecht die Helligkeit.
- **Stimme** mit echter Aufnahme.

**Begleitband dazu**: Auf jeder Instrumentenseite kann die restliche Band
mitlaufen, während die eigene Spur frei bleibt.

**Meine Band** (`/soundlab/app/band`): Instrumente an- und ausschalten, Bühne
mit Figuren, die sich im Takt bewegen - die Bewegung kommt aus dem echten Pegel
der Spur.

**Stimme** (`/soundlab/app/voice`): Aufnehmen, anhören, Klangfarbe wählen
(Clean, Warm, Bright, Echo, Room, Studio). Danach zeigt die App Tonhöhe,
Timing, Stimmstabilität und Lautstärke - freundlich formuliert, ohne Bewertung.
Ein Zielton-Anzeiger zeigt live, ob man den gewünschten Ton trifft.

**Song Builder** (`/soundlab/app/studio`): Tempo, Stil, Instrumente - fertig.
Dazu die Struktur Intro → Strophe → Refrain → Outro, ein Loop-Regal mit sechs
Kategorien und sechs Klangfarben-Karten.

**Pro Mode** (`/soundlab/app/pro`): Mehrspur-Timeline über alle Takte (klicken
und ziehen), Mischpult mit Panorama, EQ, Hall- und Echo-Anteil, Tonart und
Tonleiter, Kompressor, Delay-Zeit, Swing. Umschalten oben rechts - es ist
derselbe Song, nur mit mehr Reglern.

**Meine Projekte** (`/soundlab/app/projekte`): Songs speichern und wieder
öffnen. Alles bleibt im Browser (localStorage), ohne Konto und ohne Upload.

**Musik entdecken** (`/soundlab/app/lernen`): Sechs kurze Lektionen, jede mit
einem Knopf, der die Sache hörbar macht - in der Tonart des eigenen Songs.

## Wie der Klang entsteht

Es gibt **keine Audiodateien**. Jeder Ton wird live mit der Web Audio API
berechnet:

- `src/lib/soundlab/engine.ts` - das Mischpult. Pro Spur ein fester Weg:
  EQ → Panorama → Lautstärke → Summe, dazu Hall- und Echo-Wege.
- `src/lib/soundlab/voices.ts` - die Instrumente. Klavier aus mehreren
  Teiltönen, Gitarre nach Karplus-Strong (ein Rauschimpuls kreist in einer sehr
  kurzen Verzögerung), Schlagzeug aus Sinus und gefiltertem Rauschen.
- `src/lib/soundlab/transport.ts` - die Uhr. Töne werden ein Stück in der
  Zukunft geplant, deshalb bleibt der Takt exakt, auch wenn die Oberfläche
  gerade zu tun hat.
- `src/lib/soundlab/arranger.ts` - übersetzt Song + Schritt in einzelne Töne.
- `src/lib/soundlab/patterns.ts` - Stile, Rhythmen, Loops. Ein Rhythmus ist eine
  Zeichenkette aus 16 Zeichen: `X---x---X---x---` (X betont, x normal, `.` leise,
  `-` Pause).
- `src/lib/soundlab/theory.ts` - Tonleitern und Akkorde.
- `src/lib/soundlab/voiceLab.ts` - Aufnahme und Auswertung (Tonhöhe per
  Autokorrelation).

Weil alle Spuren dasselbe Raster, dasselbe Tempo und dieselbe Tonart benutzen,
passt jede Kombination automatisch zusammen. Genau das ist der Trick hinter
„man kann nichts falsch machen“.

## Aufbau im Projekt

```
src/app/(western)/      das Hengstverzeichnis (unverändert, nur verschoben)
src/app/(soundlab)/     SoundLab
  soundlab.css            Designsystem (dunkel, eine Akzentfarbe je Instrument)
  soundlab/page.tsx       Landing Page
  soundlab/app/           die eigentliche App
src/components/soundlab/  Klavier, Drumkit, Timeline, Player, Provider …
src/lib/soundlab/         Klang, Takt, Musiktheorie
```

Beide Anwendungen teilen sich `src/app/layout.tsx`. Der enthält nur noch
`<html>` und `<body>`; die sichtbare Hülle liegt in der jeweiligen Gruppe.

## Prüfen

```bash
npm run build
npm start                    # Server auf Port 3000
BASE=http://localhost:3000 npm run e2e:soundlab
```

Der Durchklick-Test startet einen echten Browser, spielt Töne, nimmt mit dem
synthetischen Mikrofon von Chromium auf, speichert ein Projekt und prüft, dass
auf dem Handy nichts seitwärts scrollt. Screenshots aller Seiten:

```bash
BASE=http://localhost:3000 npm run shots:soundlab
```

## Was noch fehlt

- Der Song wird nicht als Audiodatei exportiert (kein Download).
- Die Aufnahme der Stimme bleibt im Arbeitsspeicher: Nach dem Neuladen der Seite
  ist sie weg, der Rest des Songs bleibt erhalten.
- Die Songstruktur hat feste vier Abschnitte à vier Takte.
