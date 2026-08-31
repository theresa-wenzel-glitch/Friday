# JobFlow — das Produkt

> **Von der Anfrage zum Auftrag.**

## Die Idee

Nicht: „Hier ist eine Liste von Handwerkern." Das gibt es bereits.

Sondern: „Sag uns einfach, was los ist. Wir kümmern uns um den Rest."

Der Kunde beschreibt sein Problem in einem Satz. Die KI versteht es, fragt nur
das Nötige nach und macht daraus eine strukturierte Anfrage. JobFlow findet
passende Anbieter, der Kunde vergleicht Angebote, wählt einen Termin — fertig.

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
   2 Rückfragen
   (nicht 30 Felder)
      │
      ▼
   Matching  ─────────────────────────────►  Neue Anfrage
   6 passende Betriebe                       + KI-Zusammenfassung
                                             + 4,2 km entfernt
                                                     │
   3 Angebote  ◄─────────────────────────────  Angebot 120 €
      │                                       (KI schlägt Text vor,
      ▼                                        der Betrieb entscheidet)
   Angebot annehmen  ─────────────────────►  Auftrag
      │                                             │
      ▼                                             ▼
   Termin wählen                            Termin bestätigt
      │                                             │
      ▼                                             ▼
   Auftrag laeuft  ◄──────── Chat ────────►  Auftrag abschließen
      │
      ▼
   ⭐⭐⭐⭐⭐
```

## Was die KI darf — und was nicht

| Die KI darf | Die KI darf nicht |
|---|---|
| Das Problem verstehen und einordnen | Die Kategorie des Kunden überschreiben |
| Gezielt nachfragen, was fehlt | Ein 30-Felder-Formular erzeugen |
| Einen Angebotstext vorschlagen | Über Preise entscheiden |
| Eine Antwort im Chat vorschlagen | Sie eigenständig abschicken |
| Aus „Wann können Sie kommen?" eine Terminaktion machen | Den Termin verbindlich zusagen |

Und: KI-generierte Inhalte werden als solche gekennzeichnet. Sie dürfen nicht
so aussehen, als wären sie garantiert richtig.

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

**Wie viele Anfragen werden tatsächlich zu Aufträgen?** Dort entsteht der
Wert, und dort entscheidet sich, ob das Produkt funktioniert.

## Geschäftsmodell

Freemium für Unternehmen: kostenloses Profil mit begrenzten Anfragen, dazu
kostenpflichtige Stufen mit mehr Anfragen, KI-Unterstützung, Kalender und
Statistiken. Später möglicherweise eine Vermittlungsgebühr bei
erfolgreichen Aufträgen.

**Die genannten Preise sind Hypothesen.** Erst echte Nutzer zeigen, welche
Zahlungsbereitschaft vorhanden ist. Deshalb ist im Datenmodell noch kein
Abonnement verdrahtet: eine falsch geratene Preisstruktur im Schema kostet
später mehr als sie jetzt spart.

## Drei Tests, die nicht vermischt werden dürfen

| Test | Frage |
|---|---|
| **Produkt-Test** | Funktioniert der Ablauf? |
| **Markt-Test** | Wollen Menschen das überhaupt? |
| **Größen-Test** | Funktioniert das noch bei vielen Nutzern gleichzeitig? |

Der Produkt-Test ist beantwortbar — der End-to-End-Test in
`services/api/test/flow.test.ts` geht den kompletten Weg durch. Die anderen
beiden beantwortet keine Testsuite, sondern nur echter Betrieb.

## Vertrauen

Bei einem Marktplatz ist das keine Nebensache:

- **Unternehmen** können verifiziert werden (`businesses.verified`).
- **Kunden** sehen den Preis vollständig, bevor sie annehmen — aufgeschlüsselt
  nach Arbeit, Material und Anfahrt.
- **Bewertungen** setzen einen abgeschlossenen Auftrag voraus. Ohne echten
  Auftrag keine Bewertung — in der Datenbank erzwungen, nicht nur im Code.
- **Der Auftragsstatus** ist jederzeit sichtbar. Vertrauen entsteht daraus,
  dass der Kunde weiß, wo sein Anliegen steht.
- **Standortdaten** werden nur so genau gespeichert, wie nötig: der Kunde gibt
  „45127 Essen" an, die vollständige Adresse erfährt erst der beauftragte
  Betrieb.
