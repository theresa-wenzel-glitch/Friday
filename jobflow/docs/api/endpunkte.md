# API

Basisadresse in der Entwicklung: `http://localhost:4000`

## Antwortstruktur

Jede Antwort hat dieselbe Huelle — im Erfolgs- wie im Fehlerfall. Die
Frontends muessen so nie pro Endpunkt raten, wie eine Antwort aussieht.

```json
{ "success": true, "data": { }, "error": null }
```

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Bitte pruefe deine Eingaben.",
    "fields": { "password": "Bitte mindestens 10 Zeichen angeben." }
  }
}
```

`fields` ordnet Fehlermeldungen den Eingabefeldern zu — die App kann sie
direkt unter dem betroffenen Feld anzeigen.

### Fehlercodes

| Code | Status | Bedeutung |
|---|---|---|
| `VALIDATION_FAILED` | 422 | Eingaben unvollstaendig oder ungueltig |
| `UNAUTHENTICATED` | 401 | Kein oder ungueltiges Token |
| `FORBIDDEN` | 403 | Angemeldet, aber nicht berechtigt |
| `NOT_FOUND` | 404 | Gibt es nicht — **oder gehoert jemand anderem** |
| `CONFLICT` | 409 | Zustand passt nicht (Angebot bereits angenommen o. ae.) |
| `RATE_LIMITED` | 429 | Zu viele Anfragen, `Retry-After` beachten |
| `AI_UNAVAILABLE` | 503 | Die Analyse ist gerade nicht moeglich |
| `INTERNAL_ERROR` | 500 | Fehler auf Serverseite |

## Anmeldung

Nach `register` oder `login` gibt es ein Token. Es gehoert in jeden weiteren
Aufruf:

```
Authorization: Bearer <token>
```

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| POST | `/auth/register` | — | Konto anlegen (`CUSTOMER` oder `BUSINESS`) |
| POST | `/auth/login` | — | Anmelden |
| POST | `/auth/logout` | angemeldet | Diese Session beenden |
| POST | `/auth/logout-all` | angemeldet | Auf allen Geraeten abmelden |
| GET | `/me` | angemeldet | Eigenes Konto |

Ein `BUSINESS`-Konto bekommt bei der Registrierung sofort ein — zunaechst
leeres — Unternehmensprofil. Sonst muesste jede spaetere Abfrage den Sonderfall
"Konto ohne Unternehmen" behandeln.

## Kategorien

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| GET | `/categories` | oeffentlich | Alle aktiven Kategorien |
| GET | `/categories/tree` | oeffentlich | Als Baum, fuer die Startseite |

## Anfragen

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| POST | `/requests` | CUSTOMER | Anfrage anlegen |
| GET | `/requests` | CUSTOMER | Eigene Anfragen (`?limit=&offset=`) |
| GET | `/requests/:id` | Beteiligte | Anfrage lesen |
| PATCH | `/requests/:id` | CUSTOMER | Aendern, solange keine Angebote vorliegen |
| DELETE | `/requests/:id` | CUSTOMER | Zurueckziehen |

`GET /requests/:id` liefert die Anfrage an den Kunden **und** an jedes
Unternehmen, dem sie vorgeschlagen wurde — vorher nicht.

## KI

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| POST | `/requests/:id/analyze` | CUSTOMER | Analysieren lassen |
| GET | `/requests/:id/analysis` | Beteiligte | Juengste Analyse mit Rueckfragen |
| POST | `/requests/:id/questions/:questionId` | CUSTOMER | Rueckfrage beantworten |
| POST | `/offers/suggest-text` | BUSINESS | Textvorschlag fuer ein Angebot |
| POST | `/conversations/:id/suggest-reply` | Beteiligte | Antwortvorschlag |

Die Vorschlaege werden **zurueckgegeben, nicht abgeschickt**. Sie tragen
`isAiGenerated: true`, damit die Oberflaeche sie kennzeichnen kann.

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
| GET | `/businesses/:id` | oeffentlich | Oeffentliches Profil |
| GET | `/businesses/:id/reviews` | oeffentlich | Bewertungen |
| GET | `/businesses/:id/availability` | angemeldet | Freie Zeitfenster |

Es gibt bewusst **keinen** Endpunkt, mit dem ein Unternehmen eine fremde
Unternehmens-ID uebergeben koennte. `/businesses/me` bezieht sich immer auf das
eigene — die ID kommt aus der Session, nicht aus der Anfrage.

## Matching, Angebote, Termine, Auftraege

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| POST | `/requests/:id/matches` | CUSTOMER | Anbieter suchen |
| GET | `/requests/:id/matches` | CUSTOMER | Vorschlaege mit Begruendung |
| POST | `/matches/:id/respond` | BUSINESS | Annehmen oder ablehnen |
| POST | `/offers` | BUSINESS | Angebot abgeben |
| GET | `/requests/:id/offers` | CUSTOMER | Angebote vergleichen |
| GET | `/offers/:id` | Beteiligte | Angebot lesen |
| POST | `/offers/:id/accept` | CUSTOMER | Annehmen → Auftrag entsteht |
| POST | `/offers/:id/decline` | CUSTOMER | Ablehnen |
| POST | `/offers/:id/withdraw` | BUSINESS | Zurueckziehen |
| POST | `/appointments` | Beteiligte | Termin buchen |
| DELETE | `/appointments/:id` | Beteiligte | Absagen |
| GET | `/jobs`, `/jobs/:id` | Beteiligte | Auftraege |
| PATCH | `/jobs/:id/status` | siehe unten | Fortschritt melden |
| POST | `/reviews` | CUSTOMER | Abgeschlossenen Auftrag bewerten |

`POST /offers/:id/accept` ist der wichtigste Zustandswechsel der Plattform und
laeuft in **einer** Transaktion: Angebot annehmen, uebrige Angebote ablehnen,
Anfrage umstellen, Auftrag anlegen, Gespraech eroeffnen. Entweder alles oder
nichts.

`PATCH /jobs/:id/status`: Den Fortschritt (`IN_PROGRESS`, `COMPLETED`) meldet
das ausfuehrende Unternehmen — das ist seine Aussage, nicht die des Kunden.
Abbrechen (`CANCELLED`) duerfen beide Seiten.

## Chat

| Methode | Pfad | Rolle | Zweck |
|---|---|---|---|
| GET | `/conversations` | angemeldet | Eigene Gespraeche |
| GET | `/conversations/:id/messages` | Beteiligte | Verlauf |
| POST | `/conversations/:id/messages` | Beteiligte | Nachricht senden |

Nachrichten tragen `isAiGenerated`. Die Oberflaeche muss das sichtbar machen —
ein KI-Text darf nicht aussehen, als haette ihn ein Mensch geschrieben.

## Rate Limiting

| Bereich | Grenze |
|---|---|
| Registrierung, Anmeldung | 10 je 15 Minuten und IP-Bereich |
| Schreibende Aufrufe | 60 je Minute und Nutzer |
| KI-Aufrufe | 20 je Minute und Nutzer |
| Lesende Aufrufe | 300 je Minute und Nutzer |

Bei 429 nennt der `Retry-After`-Header die Wartezeit in Sekunden.
