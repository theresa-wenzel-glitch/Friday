# JobFlow — das Produkt

> **Von der Anfrage zum Auftrag.**

## Die Idee

Nicht: „Hier ist eine Liste von Handwerkern." Das gibt es bereits.

Sondern: „Sag uns einfach, was los ist. Wir kuemmern uns um den Rest."

Der Kunde beschreibt sein Problem in einem Satz. Die KI versteht es, fragt nur
das Noetige nach und macht daraus eine strukturierte Anfrage. JobFlow findet
passende Anbieter, der Kunde vergleicht Angebote, waehlt einen Termin — fertig.

## Der Ablauf

```
KUNDE                                          UNTERNEHMEN

"Meine Heizung wird
 nicht mehr warm."
      │
      ▼
   KI-Analyse
   Kategorie: Heizung
   Dringlichkeit: normal
      │
      ▼
   2 Rueckfragen
   (nicht 30 Felder)
      │
      ▼
   Matching  ─────────────────────────────►  Neue Anfrage
   6 passende Betriebe                       + KI-Zusammenfassung
                                             + 4,2 km entfernt
                                                     │
   3 Angebote  ◄─────────────────────────────  Angebot 120 €
      │                                       (KI schlaegt Text vor,
      ▼                                        der Betrieb entscheidet)
   Angebot annehmen  ─────────────────────►  Auftrag
      │                                             │
      ▼                                             ▼
   Termin waehlen                            Termin bestaetigt
      │                                             │
      ▼                                             ▼
   Auftrag laeuft  ◄──────── Chat ────────►  Auftrag abschliessen
      │
      ▼
   ⭐⭐⭐⭐⭐
```

## Was die KI darf — und was nicht

| Die KI darf | Die KI darf nicht |
|---|---|
| Das Problem verstehen und einordnen | Die Kategorie des Kunden ueberschreiben |
| Gezielt nachfragen, was fehlt | Ein 30-Felder-Formular erzeugen |
| Einen Angebotstext vorschlagen | Ueber Preise entscheiden |
| Eine Antwort im Chat vorschlagen | Sie eigenstaendig abschicken |
| Aus „Wann koennen Sie kommen?" eine Terminaktion machen | Den Termin verbindlich zusagen |

Und: KI-generierte Inhalte werden als solche gekennzeichnet. Sie duerfen nicht
so aussehen, als waeren sie garantiert richtig.

## Die wichtigste Kennzahl

Downloads sind nicht die Kennzahl. Wir wollen wissen, wo Nutzer abspringen:

```
10.000 Anfragen
       ↓  request_created
 8.700 Matches
       ↓  match_generated
 6.200 Angebote
       ↓  offer_created
 3.100 angenommen
       ↓  offer_accepted
 2.800 abgeschlossen
       ↓  job_completed
```

Diese Ereignisse werden bereits geschrieben (`analytics_events`) — bewusst
ohne personenbezogene Freitexte. Wir messen, was passiert, nicht was Nutzer
schreiben.

**Wie viele Anfragen werden tatsaechlich zu Auftraegen?** Dort entsteht der
Wert, und dort entscheidet sich, ob das Produkt funktioniert.

## Geschaeftsmodell

Freemium fuer Unternehmen: kostenloses Profil mit begrenzten Anfragen, dazu
kostenpflichtige Stufen mit mehr Anfragen, KI-Unterstuetzung, Kalender und
Statistiken. Spaeter moeglicherweise eine Vermittlungsgebuehr bei
erfolgreichen Auftraegen.

**Die genannten Preise sind Hypothesen.** Erst echte Nutzer zeigen, welche
Zahlungsbereitschaft vorhanden ist. Deshalb ist im Datenmodell noch kein
Abonnement verdrahtet: eine falsch geratene Preisstruktur im Schema kostet
spaeter mehr als sie jetzt spart.

## Drei Tests, die nicht vermischt werden duerfen

| Test | Frage |
|---|---|
| **Produkt-Test** | Funktioniert der Ablauf? |
| **Markt-Test** | Wollen Menschen das ueberhaupt? |
| **Groessen-Test** | Funktioniert das noch bei vielen Nutzern gleichzeitig? |

Der Produkt-Test ist beantwortbar — der End-to-End-Test in
`services/api/test/flow.test.ts` geht den kompletten Weg durch. Die anderen
beiden beantwortet keine Testsuite, sondern nur echter Betrieb.

## Vertrauen

Bei einem Marktplatz ist das keine Nebensache:

- **Unternehmen** koennen verifiziert werden (`businesses.verified`).
- **Kunden** sehen den Preis vollstaendig, bevor sie annehmen — aufgeschluesselt
  nach Arbeit, Material und Anfahrt.
- **Bewertungen** setzen einen abgeschlossenen Auftrag voraus. Ohne echten
  Auftrag keine Bewertung — in der Datenbank erzwungen, nicht nur im Code.
- **Der Auftragsstatus** ist jederzeit sichtbar. Vertrauen entsteht daraus,
  dass der Kunde weiss, wo sein Anliegen steht.
- **Standortdaten** werden nur so genau gespeichert, wie noetig: der Kunde gibt
  „45127 Essen" an, die vollstaendige Adresse erfaehrt erst der beauftragte
  Betrieb.
