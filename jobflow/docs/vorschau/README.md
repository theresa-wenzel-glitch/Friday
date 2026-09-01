# Vorschau und Quellcode

Zwei Dateien, die beide ohne Server und ohne Installation funktionieren —
einfach im Browser öffnen.

| Datei | Was sie ist |
|---|---|
| `jobflow-app.html` | **Die App selbst.** Ohne Demo-Beiwerk, mit gespeicherten Daten |
| `jobflow-vorschau.html` | Die Vorschau mit Werkbank: Screen-Liste und API-Protokoll daneben |
| `jobflow-quellcode.html` | Der gesamte Quellcode zum Durchblättern |

## Der Unterschied zwischen App und Vorschau

`jobflow-app.html` ist die Fassung zum Veröffentlichen: Vollbild, keine
Steuerleiste, keine Rollen-Umschaltung, kein Zurücksetzen-Knopf. Man legt ein
Konto an — als Kunde **oder** als Betrieb — und wechselt die Seite durch Ab- und
Anmelden, genau wie im echten Produkt. Konten, Anfragen und Aufträge bleiben im
Browser gespeichert.

Legt man beide Konten auf demselben Gerät an, läuft der komplette Kreislauf
durch: Der Kunde stellt eine Anfrage, der eigene Betrieb erscheint im Matching,
schreibt ein Angebot, der Kunde nimmt an, der Betrieb meldet den Auftrag als
erledigt, der Kunde bewertet.

`jobflow-vorschau.html` bleibt daneben bestehen: sie zeigt zu jedem Schritt den
API-Aufruf, den das Backend an dieser Stelle bekäme, und ist zum Erklären
gedacht, nicht zum Benutzen.

`jobflow-quellcode.html` ist eine **Momentaufnahme** des Codes zum Zeitpunkt
des jeweiligen Commits: 150 Dateien, nach Architektur-Bereichen gruppiert, mit
Suche und eigener Einfärbung. Sie lädt nichts nach und funktioniert deshalb
auch offline. Wer den aktuellen Stand braucht, liest ihn im Repository —
die Seite ersetzt kein `git pull`.

# Vorschau

`jobflow-vorschau.html` ist ein klickbarer Prototyp der gesamten App — eine
einzelne Datei, ohne Server, ohne Installation. Im Browser öffnen, fertig.

```bash
# macOS
open jobflow-vorschau.html
# Linux
xdg-open jobflow-vorschau.html
```

## Was darin echt ist

Zwei Teile sind nicht nachgebaut, sondern aus dem Backend übernommen:

- **Die Regel-KI** (`services/api/src/modules/ai/rules-provider.ts`).
  Beschreib etwas anderes als die Heizung — „Mein Waschbecken tropft",
  „Der Rasen muss gemäht werden", „Notfall, Wasserschaden!" — und Kategorie,
  Rückfragen und Dringlichkeit ändern sich entsprechend. Erkennt sie nichts,
  sagt sie das mit niedriger Sicherheit, statt zu raten.
- **Die Matching-Engine** (`services/api/src/modules/matching/engine.ts`) mit
  den Gewichten 35/20/15/10/10/5/5. Die Punktzahlen und die Begründungen unter
  jedem Betrieb sind gerechnet, nicht hinterlegt.

Die Steuerleiste rechts schreibt zu jeder Aktion den API-Aufruf mit, den die
echte App an dieser Stelle absetzen würde — dieselben Endpunkte wie in
[`docs/api/endpunkte.md`](../api/endpunkte.md).

## Was daran Attrappe ist

Beispieldaten statt Datenbank, zehn erfundene Betriebe, keine Anmeldung, keine
Fotos, keine Zahlungen. Der Prototyp zeigt **den Ablauf und die Gestaltung** —
er ersetzt nicht den echten Durchstich, der unter `jobflow/` liegt und mit
einem End-to-End-Test gegen PostgreSQL abgesichert ist.

## Verhältnis zum Code

Jeder Screen im Prototyp hat eine Entsprechung in `apps/mobile/app/`:

| Prototyp | Code |
|---|---|
| Willkommen, Konto, Anmelden | `app/index.tsx`, `app/(auth)/` |
| Startseite, Anfrage erstellen | `app/(app)/home.tsx`, `create-request.tsx` |
| KI-Analyse, Rückfragen | `app/(app)/requests/[id].tsx` |
| Anbieter, Angebote | `requests/[id].tsx`, `offers/[id].tsx` |
| Termin | `appointment.tsx` |
| Auftragsstatus, Bewertung | `jobs/[id].tsx`, `review.tsx` |
| Chat | `chat.tsx` |
| Dashboard, Statistik | `dashboard.tsx`, `statistics.tsx` |
| Angebot erstellen | `create-offer.tsx` |
| Unternehmensprofil | `business-profile.tsx` |
