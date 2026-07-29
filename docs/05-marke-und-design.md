# 05 — Marke & Designsystem

## Der Name

### Bewertung von „Atlas"

**Wofür er steht.** Der Atlas ist das Buch, das die Welt begehbar macht — jede Karte, jede
Route, jeder Maßstab. Genau das ist das Produktversprechen: Orientierung im unbekannten
Gelände. Der Titan Atlas, der die Last trägt, ist die zweite, tragende Lesart.

**Was funktioniert:** kurz, international aussprechbar, in DACH sofort verständlich,
positive und passende Konnotation, gutes Logo-Potenzial.

**Was nicht funktioniert — offen benannt:** „Atlas" ist einer der am stärksten
belegten Produktnamen überhaupt. Es existieren zahlreiche Software- und
Nicht-Software-Marken dieses Namens in mehreren Nizza-Klassen. Die Wahrscheinlichkeit,
`atlas.com`/`atlas.de` zu bekommen oder eine durchsetzbare Wortmarke in Klasse 9/42
eintragen zu lassen, ist gering. Die SEO-Ausgangslage ist ebenfalls schlecht.

### Empfehlung

> **„Project Atlas" bleibt der interne Arbeitstitel. Der Launch-Name wird separat
> entschieden — vor der ersten öffentlichen Kommunikation, nach anwaltlicher
> Markenrecherche.**

Ein Name muss vier Tests bestehen: (1) freie Wortmarke in Klasse 9, 41, 42 im relevanten
Gebiet, (2) verfügbare `.com`- oder starke `.de`/`.eu`-Domain, (3) am Telefon
buchstabierbar, (4) keine negative Bedeutung in EN/FR/ES/IT/TR/PL.

**Kandidatenliste zur Prüfung:**

| Name | Idee | Anmerkung |
|------|------|-----------|
| **Milea** | Kunstwort aus *Meilenstein* + *Idee* | Weich, warm, wahrscheinlich frei |
| **Vega** | Navigationsstern | Kurz, elegant, teilweise belegt |
| **Kurso** | *Kurs* halten, romanisch klingend | Prägnant, gut skalierbar |
| **Terra** | Boden unter den Füßen | Stark belegt |
| **Norda** | Nordstern, nordisch | Passt zu Kompass-Bildsprache |
| **Steppa** | *Step* + Endung | Sehr direkt, evtl. zu verspielt |
| **Voran** | Deutsches Wort, Richtung | Starke DACH-Verankerung, kaum international |

Der Rest dieses Dokuments verwendet weiterhin „Atlas".

### Claim

Primär: **„Vom Ziel zum ersten Schritt."**
Alternativen: „Dein Plan. Dein Tempo. Dein Ziel." · „Wir wissen, wie es weitergeht." ·
„Große Ziele, kleine Schritte."

---

## Designhaltung

Die Vorgabe lautet: apple-nah, minimalistisch, hochwertig, animiert, Dark Mode. Das wird
hier in konkrete, überprüfbare Regeln übersetzt — Haltung statt Adjektive.

### Fünf Designprinzipien

**1. Ruhe hat Priorität vor Dichte.**
Ein Screen, eine Aufgabe. Großzügiger Weißraum ist keine Verschwendung, sondern die
Botschaft „das hier ist überschaubar". Maximal eine Primäraktion pro Screen.

**2. Der Plan ist eine Landschaft, keine Liste.**
Der visuelle Kern von Atlas ist der **Pfad**: eine vertikal scrollende Route mit
Meilensteinen als Wegpunkte. Der zurückgelegte Weg ist sichtbar — Fortschritt entsteht
räumlich, nicht prozentual. Das ist das eine Bild, an dem Atlas erkennbar sein soll.

**3. Bewegung erklärt, sie schmückt nicht.**
Jede Animation beantwortet eine Frage: Woher kam das? Wohin ging es? Was hat sich
verändert? Dekorative Bewegung ohne Erklärungswert wird gestrichen.

**4. Typografie ist die Hauptgestaltung.**
Keine Illustrationsflut, keine Stockfotos, kaum Farbe. Der Inhalt ist Text — also trägt
Typografie die Hierarchie.

**5. Dark Mode ist gleichwertig, nicht invertiert.**
Beide Modi werden eigenständig gestaltet. Im Dark Mode wird die Akzentfarbe leicht
entsättigt und aufgehellt, Schatten werden durch Umrandungen und Ebenenaufhellung ersetzt.

---

## Farbsystem

Prinzip: **Ein Akzent, viele Neutraltöne, drei semantische Farben.** Farbe wird knapp
gehalten, damit sie etwas bedeutet.

### Light Mode

| Token | Hex | Verwendung |
|-------|-----|------------|
| `bg/base` | `#FBFBFA` | Seitenhintergrund (leicht warm, nicht reinweiß) |
| `bg/elevated` | `#FFFFFF` | Karten, Sheets |
| `bg/sunken` | `#F2F2F0` | Eingabefelder, inaktive Bereiche |
| `text/primary` | `#111214` | Überschriften, Fließtext |
| `text/secondary` | `#5C5F66` | Sekundärtext, Metadaten |
| `text/tertiary` | `#8E9199` | Hinweise, Platzhalter |
| `line/subtle` | `#E6E6E3` | Trennlinien |
| `accent` | `#2F6F5E` | Primäraktion, Pfad, aktiver Zustand |
| `accent/soft` | `#E3EFEA` | Akzentflächen, Badges |
| `success` | `#2E7D4F` | Erledigt |
| `attention` | `#B4761E` | Frist naht (nie Rot für Verzug) |
| `critical` | `#B3261E` | Nur echte Fehler und Löschbestätigungen |

### Dark Mode

| Token | Hex |
|-------|-----|
| `bg/base` | `#0E0F11` |
| `bg/elevated` | `#17191C` |
| `bg/sunken` | `#0A0B0C` |
| `text/primary` | `#F2F3F5` |
| `text/secondary` | `#A0A4AB` |
| `text/tertiary` | `#6E727A` |
| `line/subtle` | `#26282C` |
| `accent` | `#5FB59B` |
| `accent/soft` | `#16332C` |
| `success` | `#5BB57E` |
| `attention` | `#D9A34A` |
| `critical` | `#E0655C` |

**Bewusste Entscheidung:** Ein tiefes, ruhiges Grün als Akzent — nicht das übliche
Tech-Blau und nicht die Purple-Gradients, an denen KI-Produkte gerade erkennbar sind.
Grün trägt Wachstum und Fortschritt, ohne kindlich zu wirken.

**Rot ist verboten für Verzug.** Eine überfällige Aufgabe wird nie rot markiert — sie wird
neutral als „verschoben" dargestellt und löst ein Replanning aus. Das ist Prinzip 2 aus
[Kapitel 01](01-vision-mission.md), umgesetzt im Farbsystem.

### Kontrast

Alle Text/Hintergrund-Kombinationen erfüllen mindestens **WCAG AA (4.5:1)**, große Schrift
mindestens 3:1. Farbe ist nie der einzige Informationsträger — jeder Zustand hat zusätzlich
Form, Symbol oder Beschriftung.

---

## Typografie

| Rolle | Schrift | Begründung |
|-------|---------|------------|
| Display / Überschriften | **Söhne** oder **Neue Haas Grotesk** | Präzise, europäisch, nicht generisch |
| Fließtext / UI | **Inter** (variabel) | Exzellente Lesbarkeit, sehr gute Sprachabdeckung |
| Zahlen / Daten | **Inter Tabular** | Stabile Ziffernbreite in Listen |
| Fallback | System-Stack | `-apple-system, Segoe UI, Roboto` |

Ausdrücklich **kein** Roboto/Arial/Helvetica als sichtbare Markenschrift und keine
Purple-Gradients — beides sind die Erkennungsmerkmale generischer KI-Produkte.

### Typoskala (4-px-Raster)

| Stufe | Größe / Zeilenhöhe | Gewicht | Verwendung |
|-------|--------------------|---------|------------|
| Display | 40 / 44 | 600 | Onboarding, Zielabschluss |
| H1 | 28 / 34 | 600 | Screen-Titel |
| H2 | 22 / 28 | 600 | Meilensteinnamen |
| H3 | 18 / 24 | 600 | Aufgabentitel |
| Body | 16 / 24 | 400 | Fließtext |
| Body S | 14 / 20 | 400 | Sekundärtext |
| Caption | 12 / 16 | 500 | Labels, Metadaten |

Zeilenlänge im Fließtext: max. 68 Zeichen.

---

## Abstände, Radien, Ebenen

**Raster:** 4 px. Erlaubte Abstände: 4, 8, 12, 16, 24, 32, 48, 64.
**Radien:** Eingaben 10, Karten 16, Sheets 24, Buttons 12, Avatare voll.
**Ebenen:** Höchstens zwei sichtbare Ebenen gleichzeitig. Schatten nur im Light Mode und
nur sehr weich (`0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)`); im Dark Mode
stattdessen Hintergrundaufhellung plus 1-px-Umrandung.

---

## Motion

| Bewegung | Dauer | Kurve | Zweck |
|----------|-------|-------|-------|
| Mikro (Tap, Toggle) | 120 ms | `ease-out` | Rückmeldung |
| Standard (Sheet, Navigation) | 260 ms | `cubic-bezier(.32,.72,0,1)` | Räumliche Beziehung |
| Pfad-Fortschritt | 700 ms | `ease-in-out` | Bedeutung: Weg zurückgelegt |
| Planerstellung | 2–5 s | gestaffelt | Wartezeit wird zu einem Moment |

**Der Signaturmoment: die Planerstellung.** Nach dem Onboarding-Interview zeichnet sich der
Pfad von unten nach oben. Meilensteine erscheinen nacheinander mit je 180 ms Versatz,
begleitet von einer kurzen Erläuterung („Ich habe 7 Etappen für dich geplant — die erste
beginnt heute"). Die Wartezeit auf das Modell wird dadurch nicht kaschiert, sondern zum
wertvollsten Moment der App.

**Reduzierte Bewegung.** `prefers-reduced-motion` wird vollständig respektiert: alle
Bewegungen werden zu Ein-/Ausblendungen unter 100 ms; die Planerstellung erscheint
vollständig statt gestaffelt.

---

## Logo & Bildsprache

**Wortmarke.** Kleinschreibung, enger Buchstabenabstand (−1,5 %), eigenständiges Detail an
einem Buchstaben (z. B. das „t" als kleine Wegmarke).

**Bildmarke.** Ein reduzierter **Pfad zwischen zwei Punkten** — eine leichte Kurve von
einem kleinen offenen Kreis (Start) zu einem gefüllten Punkt (Ziel). Funktioniert bei
16 px, als App-Icon und als Prägung. Bewusst kein Kompass (Klischee), kein Gipfel
(Leistungsdruck), kein Gehirn (KI-Klischee).

**Fotografie.** Reale Menschen in realen Situationen: Hände auf einem Notizbuch, ein
halbfertiger Ladenraum, Laufschuhe im Flur. Keine Stockfotos mit lachenden Menschen vor
Whiteboards. Farbstimmung leicht entsättigt, warm.

**Illustration.** Nur diagrammatisch: Pfade, Wegpunkte, einfache Karten. Keine Maskottchen,
keine 3D-Renderings.

---

## Ton der Sprache

**Grundhaltung:** ruhig, konkret, respektvoll, ohne Coach-Pathos.

| Situation | ✅ So | ❌ Nicht so |
|-----------|-------|-------------|
| Aufgabe erledigt | „Erledigt. Als Nächstes: Standortanalyse." | „Fantastisch!! 🎉 Du bist unaufhaltsam!" |
| Verzug | „Diese Woche war wenig Zeit. Ich habe den Plan angepasst — der nächste Schritt ist kleiner." | „Du hinkst 4 Aufgaben hinterher!" |
| Fehler | „Das hat nicht geklappt. Der Plan ist gespeichert, versuch es gleich noch mal." | „Ups! Da ist wohl was schiefgelaufen 🙈" |
| Zielabschluss | „Du hast es geschafft. Vor 14 Monaten war das ein Satz auf einem Bildschirm." | „LEVEL 10 ERREICHT!" |

**Anrede:** Du. **Emoji:** in der Produktoberfläche nicht, im Marketing sparsam.
**Verbot:** „einfach", „nur", „schnell" in Aufgabenbeschreibungen — sie verharmlosen
Aufwand und erzeugen Schuldgefühl beim Scheitern.

---

## Barrierefreiheit

Ziel: **WCAG 2.2 AA** für Web und App.

- Vollständige Bedienbarkeit per Tastatur, sichtbarer Fokusring (2 px, `accent`)
- Screenreader-Labels für jede interaktive Fläche; Pfadfortschritt zusätzlich als Text
- Mindest-Touchziel 44 × 44 px
- Dynamische Schriftgrößen bis 200 % ohne Layoutbruch
- Keine reinen Farbcodierungen
- Sprachniveau: Zielwert B1 für alle Systemtexte
