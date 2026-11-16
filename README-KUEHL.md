# Kühl in Mülheim

> Deine Stadt. Dein Schatten. Dein Hitzeschutz.

Eine Hitzeschutz-App für Mülheim an der Ruhr: Trinkbrunnen, kühle Orte,
Schwimmbäder, aktuelle Temperaturen und amtliche Hitzewarnungen auf einer Karte.
Sie liegt in diesem Projekt unter **`/kuehl`**. SoundLab und das
Hengstverzeichnis bleiben davon unberührt.

Die App ist ein Bürgerprojekt und **kein offizielles Angebot der Stadt**.

## Losgehen

```bash
npm install
npm run dev
```

Dann <http://localhost:3000/kuehl> im Browser öffnen. Auf dem Handy lässt sich
die App über „Zum Startbildschirm hinzufügen“ wie eine normale App ablegen.

## Was die App kann

| Bereich | Adresse | Inhalt |
| --- | --- | --- |
| Start | `/kuehl` | Aktuelles Wetter, Hitzestufe mit Verhaltenstipp, amtliche DWD-Warnungen, kühle Orte in der Nähe |
| Karte | `/kuehl/karte` | Echte OpenStreetMap-Karte mit ein- und ausschaltbaren Ebenen: Trinkwasser, kühle Orte, Baden, Gebäude, Toiletten, Bürgermeldungen und Temperaturen je Stadtteil |
| Entdecken | `/kuehl/entdecken` | Listen nach Entfernung, mit Filtern (viel Schatten, Trinkwasser in der Nähe, barrierefrei) |
| Hitzeschutz | `/kuehl/hitzeschutz` | Warnzeichen, Notruf 112 und 116 117, Ratgeber zum Aufklappen |
| Melden | `/kuehl/melden` | Fehlende oder kaputte Brunnen, Schattenplätze und Kartenfehler melden, Ort auf der Karte antippen |
| Moderation | `/kuehl/moderation` | Meldungen freigeben oder ablehnen (Anmeldung über `/admin`) |
| Über die App | `/kuehl/info` | Datenquellen, Grenzen, Datenschutz |

Weitere Funktionen:

- **Standort**: Auf Wunsch per GPS, sonst über feste Startpunkte wie den
  Hauptbahnhof. Der Standort bleibt auf dem Gerät.
- **Fußweg**: Jede Detailkarte öffnet die Fußgängerroute in OpenStreetMap.
- **Brunnensaison**: Die App rechnet Ostern selbst aus und zeigt, ob die
  öffentlichen Trinkbrunnen gerade laufen (Ostern bis Oktober).
- **Cool-Score**: 1 bis 5 Blätter, eine grobe Einschätzung nach Art des Ortes
  (Wald hoch, Uferweg niedrig). Keine Messung.

## Woher die Daten kommen

| Daten | Quelle | Aktualisierung |
| --- | --- | --- |
| 3 öffentliche Trinkbrunnen der RWW | Hitze-Informationen der Stadt Mülheim an der Ruhr | fest in `src/lib/kuehl/places.ts` |
| Parks, Wälder, Bäder, Bibliotheken, Toiletten, weitere Wasserstellen | OpenStreetMap über die Overpass-API | einmal täglich, auf dem Server zwischengespeichert |
| Aktuelles Wetter, Tageshöchstwert, UV-Index, Temperatur je Stadtteil | Open-Meteo (Wettermodelle, u. a. DWD) | alle 10 Minuten |
| Ersatz, falls Open-Meteo nicht antwortet | DWD-Messstation und DWD-Vorhersage über Bright Sky | alle 10 Minuten |
| Unwetter- und Hitzewarnungen | Deutscher Wetterdienst über Bright Sky | alle 10 Minuten |
| Kartenbilder | OpenStreetMap-Kachelserver | direkt im Browser |

Keine dieser Quellen braucht einen API-Schlüssel.

Der OpenStreetMap-Abruf wird zusätzlich in `kuehl-osm-cache.json` neben der
Datenbank gespeichert (im Docker-Abbild unter `/data`). Ist OpenStreetMap
nicht erreichbar, zeigt die App die Grundliste aus `places.ts` und lädt später
nach.

### Bekannte Lücken

- **Position der drei Brunnen**: Sie ist nur ungefähr eingetragen. Findet die
  App in OpenStreetMap eine Trinkwasserstelle näher als 80 m, übernimmt sie
  deren genaue Lage. Sonst bitte vor Ort prüfen und in `places.ts` eintragen
  (`positionExact: true`).
- **Hitzekarte**: Gezeigt werden Modelltemperaturen je Stadtteil. Die
  Klimatopkarte und die Hitzevulnerabilitätsanalyse der Stadt sind noch nicht
  eingebunden; dafür braucht es die Geodaten-Schnittstellen der Stadt.
- **Schattenroute**: Braucht Baumkataster und Gebäudedaten und ist noch nicht
  gebaut. Der Fußweg-Knopf nutzt die normale Fußgängerroute.
- **Fotos zu Orten**: Noch keine. Echte Fotos brauchen geklärte Bildrechte.
- **Kartenkacheln**: Der öffentliche OpenStreetMap-Kachelserver ist für
  geringe Last gedacht. Bei vielen Nutzern einen eigenen Kachelanbieter
  eintragen (`MapView.tsx`).

## Meldungen und Moderation

Meldungen landen in der SQLite-Datenbank (Tabelle `kuehl_reports`) und sind
erst nach Freigabe auf der Karte zu sehen. Gespeichert werden nur Kategorie,
Beschreibung und Position, keine Namen, E-Mail- oder IP-Adressen. Pro
Anschluss sind 5 Meldungen pro Stunde erlaubt.

Zum Prüfen unter `/admin` anmelden (Passwort aus `ADMIN_PASSWORD`, siehe
`.env.example`) und dann `/kuehl/moderation` öffnen.

## Tests

```bash
npm run test:kuehl                 # Hilfsfunktionen: Saison, Entfernungen, Datenquellen
npm run dev -- -p 3113             # in einem zweiten Fenster
npm run e2e:kuehl                  # Durchklick-Test im Browser (Handy-Ansicht)
```

## Wo der Code liegt

```
src/app/(kuehl)/                 Seiten unter /kuehl und das Designsystem (kuehl.css)
src/app/api/kuehl/               orte, wetter, meldungen
src/components/kuehl/            Karte, Detailkarte, Listen, gemeinsamer Zustand
src/lib/kuehl/                   Datenquellen, Grundliste, Hilfsfunktionen, Tests
public/kuehl-*                   App-Symbol und Manifest für den Startbildschirm
scripts/kuehl-e2e.mjs            Durchklick-Test
```
