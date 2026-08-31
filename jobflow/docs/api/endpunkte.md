# API

Basisadresse in der Entwicklung: `http://localhost:4000`

## Antwortstruktur

Jede Antwort hat dieselbe Hülle — im Erfolgs- wie im Fehlerfall. Die
Frontends müssen so nie pro Endpunkt raten, wie eine Antwort aussieht.

```json
{ "success": true, "data": { }, "error": null }
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Bitte prüfe deine Eingaben.",
    "fields": { "password": "Bitte mindestens 10 Zeichen angeben." }
  }
}
```

`fields` ordnet Fehlermeldungen den Eingabefeldern zu — die App kann sie
direkt unter dem betroffenen Feld anzeigen.

### Fehlercodes

| Code | Status | Bedeutung |
|---|---|---|
| `VALIDATION_FAILED` | 422 | Eingaben unvollständig oder ungueltig |
| `UNAUTHENTICATED` | 401 | Kein oder ungueltiges Token |
| `FORBIDDEN` | 403 | Angemeldet, aber nicht berechtigt |
| `NOT_FOUND` | 404 | Gibt es nicht — **oder gehört jemand anderem** |
| `CONFLICT` | 409 | Zustand passt nicht (Angebot bereits angenommen o. ae.) |
| `RATE_LIMITED` | 429 | Zu viele Anfragen, `Retry-After` beachten |
| `AI_UNAVAILABLE` | 503 | Die Analyse ist gerade nicht möglich |
| `INTERNAL_ERROR` | 500 | Fehler auf Serverseite |

## Anmeldung

Nach `register` oder `login` gibt es ein Token. Es gehört in jeden weiteren
Aufruf:

```
Authorization: Bearer <token>
```

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| POST | `/auth/register` | — | Konto anlegen (`CUSTOMER` oder `BUSINESS`) |
| POST | `/auth/login` | — | Anmelden |
| POST | `/auth/logout` | angemeldet | Diese Session beenden |
| POST | `/auth/logout-all` | angemeldet | Auf allen Geräten abmelden |
| GET | `/me` | angemeldet | Eigenes Konto |

Ein `BUSINESS`-Konto bekommt bei der Registrierung sofort ein — zunächst
leeres — Unternehmensprofil. Sonst müsste jede spätere Abfrage den Sonderfall
"Konto ohne Unternehmen" behandeln.

## Kategorien

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| GET | `/categories` | öffentlich | Alle aktiven Kategorien |
| GET | `/categories/tree` | öffentlich | Als Baum, für die Startseite |

## Anfragen

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| POST | `/requests` | CUSTOMER | Anfrage anlegen |
| GET | `/requests` | CUSTOMER | Eigene Anfragen (`?limit=&offset=`) |
| GET | `/requests/:id` | Beteiligte | Anfrage lesen |
| PATCH | `/requests/:id` | CUSTOMER | Ändern, solange keine Angebote vorliegen |
| DELETE | `/requests/:id` | CUSTOMER | Zurückziehen |

`GET /requests/:id` liefert die Anfrage an den Kunden **und** an jedes
Unternehmen, dem sie vorgeschlagen wurde — vorher nicht.

## KI

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| POST | `/requests/:id/analyze` | CUSTOMER | Analysieren lassen |
| GET | `/requests/:id/analysis` | Beteiligte | Jüngste Analyse mit Rückfragen |
| POST | `/requests/:id/questions/:questionId` | CUSTOMER | Rückfrage beantworten |
| POST | `/offers/suggest-text` | BUSINESS | Textvorschlag für ein Angebot |
| POST | `/conversations/:id/suggest-reply` | Beteiligte | Antwortvorschlag |

Die Vorschläge werden **zurückgegeben, nicht abgeschickt**. Sie tragen
`isAiGenerated: true`, damit die Oberfläche sie kennzeichnen kann.

## Unternehmen

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| GET | `/businesses/me` | BUSINESS | Eigenes Profil |
| PATCH | `/businesses/me` | Inhaber | Profil pflegen |
| GET | `/businesses/me/statistics` | BUSINESS | Kennzahlen |
| GET/POST | `/businesses/me/services` | BUSINESS | Leistungen |
| DELETE | `/businesses/me/services/:id` | Inhaber | Leistung deaktivieren |
| GET/POST | `/businesses/me/availability` | BUSINESS | Wochenplan |
| GET | `/businesses/me/matches` | BUSINESS | Vorgeschlagene Anfragen |
| GET | `/businesses/me/offers` | BUSINESS | Eigene Angebote |
| GET | `/businesses/:id` | öffentlich | Öffentliches Profil |
| GET | `/businesses/:id/reviews` | öffentlich | Bewertungen |
| GET | `/businesses/:id/availability` | angemeldet | Freie Zeitfenster |

Es gibt bewusst **keinen** Endpunkt, mit dem ein Unternehmen eine fremde
Unternehmens-ID übergeben könnte. `/businesses/me` bezieht sich immer auf das
eigene — die ID kommt aus der Session, nicht aus der Anfrage.

## Matching, Angebote, Termine, Aufträge

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| POST | `/requests/:id/matches` | CUSTOMER | Anbieter suchen |
| GET | `/requests/:id/matches` | CUSTOMER | Vorschläge mit Begründung |
| POST | `/matches/:id/respond` | BUSINESS | Annehmen oder ablehnen |
| POST | `/offers` | BUSINESS | Angebot abgeben |
| GET | `/requests/:id/offers` | CUSTOMER | Angebote vergleichen |
| GET | `/offers/:id` | Beteiligte | Angebot lesen |
| POST | `/offers/:id/accept` | CUSTOMER | Annehmen → Auftrag entsteht |
| POST | `/offers/:id/decline` | CUSTOMER | Ablehnen |
| POST | `/offers/:id/withdraw` | BUSINESS | Zurückziehen |
| POST | `/appointments` | Beteiligte | Termin buchen |
| DELETE | `/appointments/:id` | Beteiligte | Absagen |
| GET | `/jobs`, `/jobs/:id` | Beteiligte | Aufträge |
| PATCH | `/jobs/:id/status` | siehe unten | Fortschritt melden |
| POST | `/reviews` | CUSTOMER | Abgeschlossenen Auftrag bewerten |

`POST /offers/:id/accept` ist der wichtigste Zustandswechsel der Plattform und
laeuft in **einer** Transaktion: Angebot annehmen, übrige Angebote ablehnen,
Anfrage umstellen, Auftrag anlegen, Gespräch eröffnen. Entweder alles oder
nichts.

`PATCH /jobs/:id/status`: Den Fortschritt (`IN_PROGRESS`, `COMPLETED`) meldet
das ausführende Unternehmen — das ist seine Aussage, nicht die des Kunden.
Abbrechen (`CANCELLED`) dürfen beide Seiten.

## Chat

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| GET | `/conversations` | angemeldet | Eigene Gespräche |
| GET | `/conversations/:id/messages` | Beteiligte | Verlauf |
| POST | `/conversations/:id/messages` | Beteiligte | Nachricht senden |

Nachrichten tragen `isAiGenerated`. Die Oberfläche muss das sichtbar machen —
ein KI-Text darf nicht aussehen, als hätte ihn ein Mensch geschrieben.

## Rate Limiting

| Bereich | Grenze |
|---|---|
| Registrierung, Anmeldung | 10 je 15 Minuten und IP-Bereich |
| Schreibende Aufrufe | 60 je Minute und Nutzer |
| KI-Aufrufe | 20 je Minute und Nutzer |
| Lesende Aufrufe | 300 je Minute und Nutzer |

Bei 429 nennt der `Retry-After`-Header die Wartezeit in Sekunden.
