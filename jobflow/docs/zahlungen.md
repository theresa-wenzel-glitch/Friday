# Zahlungen einrichten

Der Code ist fertig. Was fehlt, kann dir niemand abnehmen: **das Zahlungskonto
musst du selbst eröffnen.** Der Anbieter muss deine Identität und dein Gewerbe
prüfen, du unterschreibst Verträge, du hinterlegst deine IBAN. Das ist ein
Rechtsgeschäft mit deinem Ausweis — kein Entwickler und keine Software kann das
an deiner Stelle tun.

Sobald du das Konto hast, trägst du vier Werte in die Konfiguration ein und es
läuft. Diese Anleitung beschreibt genau das.

> Ich bin kein Steuerberater und keine Anwältin. Die rechtlichen Hinweise am
> Ende sind Orientierung, keine Beratung. Bei einem Marktplatz mit Geldfluss
> lohnt sich ein Termin bei beiden.

## Was schon gebaut ist

| Teil | Wo | Zustand |
|---|---|---|
| Pakete Free / Pro / Business | `database/seeds/0002_subscription_plans.sql` | Preise und Grenzen in der Datenbank, änderbar ohne Deployment |
| Guthaben und Grenzen | `services/api/src/modules/billing/service.ts` | serverseitig durchgesetzt |
| Anbieter-Schnittstelle | `services/api/src/modules/billing/provider.ts` | austauschbar |
| Stripe-Anbindung | `services/api/src/modules/billing/stripe-provider.ts` | fertig, wartet auf Schlüssel |
| Webhook mit Signaturprüfung | `services/api/src/modules/billing/webhook.ts` | fertig, mit Tests |
| Preisanzeige in der App | `docs/vorschau/jobflow-app.html` | fertig |

Ohne Schlüssel läuft alles im Paket **Free** weiter. Die Anwendung tut dann
nicht so, als sei bezahlt worden — sie sagt ehrlich, dass kein Konto verknüpft
ist.

## Die Grenzen sind Hypothesen

Free liegt bei **3 Angeboten pro Monat**, im ersten Kalendermonat bei **10**.

Der Einstieg ist kein Geschenk, sondern der Grund, warum die enge Grenze
überhaupt wirken kann: Ein Betrieb, der nie einen Auftrag über JobFlow gewonnen
hat, wechselt nicht auf Pro — er meldet sich ab. Erst wer den ersten Auftrag
erlebt hat, hat einen Grund zu zahlen.

Beide Zahlen sind Startwerte, keine Entscheidungen. Sie stehen in der Datenbank
und lassen sich ohne Deployment ändern:

```sql
-- Enger, wenn zu viele im kostenlosen Paket bleiben:
UPDATE subscription_plans SET monthly_offer_limit = 2 WHERE code = 'FREE';

-- Großzügiger, wenn zu wenige Betriebe überhaupt antworten:
UPDATE subscription_plans SET first_month_offer_limit = 15 WHERE code = 'FREE';
```

**Woran du merkst, dass die Grenze zu eng ist:** Die Zahl der Anfragen, auf die
überhaupt jemand antwortet, sinkt. Das ist gefährlicher als eine zu niedrige
Abo-Quote — ohne antwortende Betriebe verlieren die Kunden das Vertrauen, und
dann gibt es niemanden mehr, dem man ein Abo verkaufen könnte.

Die beiden Zahlen, die das zeigen:

```sql
-- Wie viele Anfragen bekommen mindestens ein Angebot?
SELECT round(100.0 * count(DISTINCT o.request_id) / nullif(count(DISTINCT r.id), 0), 1) AS prozent
FROM requests r LEFT JOIN offers o ON o.request_id = r.id;

-- Wie viele Betriebe stoßen an ihre Grenze?
SELECT count(*) FROM usage_periods u
JOIN businesses b ON b.id = u.business_id
WHERE u.period_start = date_trunc('month', now())::date AND u.offers_sent >= 3;
```

## Schritt für Schritt

### 1. Anbieter wählen

| Anbieter | Wofür | Anmerkung |
|---|---|---|
| **Stripe** | Karte, PayPal, SEPA, Apple Pay, Google Pay, Klarna | Bereits angebunden. Abos sind seine Stärke. |
| **Mollie** | dieselben Arten, europäischer Anbieter | Braucht eine zweite Umsetzung derselben Schnittstelle. |
| **PayPal allein** | nur PayPal | Zu wenig für einen Marktplatz. |

Der Code ist auf Stripe vorbereitet. Wechseln kannst du später, ohne den Rest
der Anwendung anzufassen — dafür ist die Schnittstelle da.

### 2. Konto eröffnen (machst du)

Bei Stripe brauchst du:

- **Gewerbeanmeldung** oder Handelsregisterauszug
- **Ausweis** der vertretungsberechtigten Person
- **IBAN** des Geschäftskontos — dorthin wird ausgezahlt
- **Steuernummer** oder USt-IdNr.
- Eine erreichbare Website mit **Impressum, AGB und Datenschutzerklärung**

Die Prüfung dauert meist ein bis drei Werktage. Solange sie läuft, kannst du im
**Testmodus** arbeiten: dort fließt kein echtes Geld, und du kannst den ganzen
Ablauf durchspielen.

### 3. Preise anlegen (machst du, im Stripe-Konto)

Lege zwei wiederkehrende Preise an:

| Paket | Betrag | Abrechnung |
|---|---|---|
| Pro | 29,00 € | monatlich |
| Business | 79,00 € | monatlich |

Stripe gibt dir dafür je eine Kennung der Form `price_1AbC…`. Die brauchst du
gleich.

Free legst du **nicht** an — dafür wird nicht gezahlt.

### 4. Zahlungsarten aktivieren (machst du, im Stripe-Konto)

Unter *Einstellungen → Zahlungsmethoden* schaltest du frei, was du anbieten
willst: Karte, PayPal, SEPA-Lastschrift, Apple Pay, Google Pay, Klarna.

Das steht bewusst **nicht** im Code. Welche Arten erscheinen, entscheidest du im
Konto — so kannst du eine Methode abschalten, ohne dass jemand etwas
programmiert.

### 5. Webhook eintragen (machst du, im Stripe-Konto)

Unter *Entwickler → Webhooks* eine Adresse hinzufügen:

```
https://deine-api.example/webhooks/payments
```

Diese Ereignisse auswählen:

```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Stripe zeigt dir danach ein **Webhook-Geheimnis** (`whsec_…`). Auch das brauchst
du gleich.

### 6. Die vier Werte eintragen

```bash
STRIPE_SECRET_KEY=sk_live_…        # bzw. sk_test_… zum Ausprobieren
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_PRO=price_…
STRIPE_PRICE_BUSINESS=price_…
BILLING_RETURN_URL=https://deine-app.example/konto
```

Das war es. Die API erkennt beim Start, dass Schlüssel da sind, und schaltet von
`manual` auf `stripe` um.

**Diese Werte gehören niemals ins Repository.** Sie stehen in den
Umgebungsvariablen deines Servers oder im Geheimnis-Speicher deines Anbieters.
Ein Schlüssel, der einmal in einem Commit stand, gilt als verbrannt und muss
ausgetauscht werden — auch wenn du den Commit später löschst.

Zwei Sicherungen sind eingebaut:

- Ist `STRIPE_SECRET_KEY` gesetzt, aber `STRIPE_WEBHOOK_SECRET` fehlt, **startet
  die API nicht**. Ohne Signaturprüfung könnte jeder Aufrufer sich ein Paket
  freischalten.
- Ein Testschlüssel in der Produktion wird ebenfalls abgelehnt.

### 7. Ausprobieren

Im Testmodus mit der Stripe-Testkarte `4242 4242 4242 4242`, beliebiges
zukünftiges Ablaufdatum, beliebige Prüfziffer. Danach in der Datenbank:

```sql
SELECT business_id, plan_code, status FROM subscriptions;
SELECT type, processed_at FROM payment_events ORDER BY created_at DESC LIMIT 5;
```

Steht dort dein Betrieb mit `PRO` und `ACTIVE`, funktioniert die Kette.

## Wie das Geld läuft

JobFlow kennt drei Arten von Geld. Sie werden **getrennt geführt**, und das ist
kein Formalismus:

```
1.  Betrieb  ──── 29 €/Monat ────►  JobFlow        Abo. Läuft über Stripe.
                                                   Fertig gebaut.

2.  Kunde    ──── 120 € ─────────►  Betrieb        Auftrag. Läuft NICHT über
                                                   JobFlow. Bar, Rechnung,
                                                   Überweisung — wie bisher.

3.  JobFlow  ──── Anteil aus 2. ──►  JobFlow       Vermittlungsgebühr.
                                                   Noch nicht gebaut.
```

**Punkt 2 ist der wichtige.** Solange das Geld für den Auftrag direkt vom Kunden
zum Betrieb fließt, ist JobFlow nur Vermittler — rechtlich der einfachste Fall.

Sobald du das Geld über dein eigenes Konto leiten willst, um eine
Vermittlungsgebühr einzubehalten, wirst du zum **Zahlungsvermittler**. In der EU
kann das eine Erlaubnis der BaFin erfordern. Der übliche Ausweg: das
Marktplatz-Produkt des Anbieters (bei Stripe heißt es *Connect*), bei dem der
Anbieter die Lizenz hält und du nur die Aufteilung festlegst. Jeder Betrieb
bräuchte dann ein eigenes verknüpftes Konto.

Das ist ein eigener Bauabschnitt, kein Zusatz — und er lohnt sich erst, wenn
über JobFlow nachweislich Aufträge zustande kommen.

## Zwei Dinge, die überraschen

**App Store.** Verkaufst du das Abo *innerhalb* der iOS-App, verlangt Apple
unter Umständen den eigenen Kauf im Programm (15 – 30 % Anteil). Für Leistungen,
die außerhalb der App erbracht werden — ein Handwerker, der wirklich kommt —
gilt das nicht. Für ein Software-Abo ist die Lage weniger klar. Der sichere Weg:
**das Abo auf der Website verkaufen**, nicht in der App. Die App zeigt dann nur
den Stand an. Kläre das vor der Einreichung.

**Umsatzsteuer.** Auf 29 € kommen 19 % obendrauf, wenn du nicht Kleinunternehmer
nach § 19 UStG bist. Bei Betrieben aus anderen EU-Ländern mit USt-IdNr. gilt das
Reverse-Charge-Verfahren. Jede Zahlung braucht eine ordentliche Rechnung.
Stripe kann Steuer und Rechnungen übernehmen — das musst du im Konto aktivieren
und mit deinem Steuerberater abstimmen.

## Was noch fehlt

| Fehlt | Warum es zählt |
|---|---|
| **Kündigung in der App** | Die Route `/billing/cancel` gibt es. Ein Knopf dafür fehlt noch. |
| **Rechnungen für den Betrieb** | Stripe stellt sie aus; ein Link ins Kundenportal wäre der einfachste Weg. |
| **Mahnwesen** | Bei `PAST_DUE` behält der Betrieb vorerst seine Funktionen. Wann abgeschaltet wird, ist eine Produktentscheidung. |
| **Vermittlungsgebühr** | Siehe oben — eigener Bauabschnitt. |
