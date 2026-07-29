# 00 — Executive Summary

## Das Problem

Jedes Jahr fassen Millionen Menschen im DACH-Raum ein ernsthaftes Vorhaben: ein Café
eröffnen, sich selbstständig machen, einen Marathon laufen, programmieren lernen, eine
Wohnung kaufen, eine Weiterbildung abschließen. Die überwiegende Mehrheit dieser Vorhaben
scheitert — und zwar nicht am Willen und nicht an fehlender Information.

Sie scheitern an der **Lücke zwischen Absicht und erstem Schritt**. Wer heute „Café
eröffnen" googelt, bekommt 40 Millionen Treffer, 200 Blogposts mit widersprüchlichen
Checklisten, eine IHK-Seite in Behördensprache und ein YouTube-Video mit Werbung für einen
Online-Kurs. Was er nicht bekommt: einen Plan, der zu *seiner* Situation passt, mit
Terminen, die zu *seinem* Kalender passen, und einer nächsten Aufgabe, die er heute
Nachmittag erledigen kann.

Alle bestehenden Werkzeuge lösen ein Teilproblem: Suchmaschinen liefern Information.
Projekttools (Notion, Todoist, Asana) liefern leere Container — man muss den Plan selbst
schon kennen. Lernplattformen (Udemy, Coursera) liefern Wissen ohne Umsetzungspfad.
Coaches liefern das Ganze, kosten aber 80–200 € pro Stunde und skalieren nicht.

## Die Lösung

**Atlas** ist eine Zielerreichungs-Plattform. Der Nutzer formuliert sein Ziel in normaler
Sprache. Atlas führt ein kurzes, strukturiertes Interview (Budget, Zeitbudget, Standort,
Vorerfahrung, Deadline) und erzeugt daraus einen vollständigen Plan:

- **Meilensteine** — die 6 bis 10 großen Etappen bis zum Ziel
- **Aufgaben** — konkrete, an einem Nachmittag erledigbare Schritte mit Fälligkeitsdatum
- **Ressourcen** — genau der Artikel, das Formular, das Video, das *an dieser Stelle*
  gebraucht wird, nicht ein Kurs über alles
- **Erinnerungen** — im richtigen Rhythmus, nicht als Spam
- **Kohorte** — 5 bis 20 Menschen, die dasselbe Ziel im selben Zeitfenster verfolgen

Und — der wichtigste Teil — Atlas **passt den Plan laufend an**. Wer eine Woche nichts
geschafft hat, bekommt nicht dieselbe Liste mit roten Zahlen, sondern einen neu
geschnittenen Plan mit einem kleineren nächsten Schritt.

## Warum jetzt

Drei Dinge sind erst seit kurzem gleichzeitig wahr:

1. **Sprachmodelle können planen.** Die Zerlegung eines unscharfen Ziels in eine
   abhängigkeitskorrekte Aufgabenstruktur war bis vor kurzem nicht automatisierbar. Heute
   liefern Modelle wie Claude Opus 5 mit strukturierter Ausgabe und Werkzeugnutzung
   verlässlich validierbare Pläne.
2. **Die Kosten sind gefallen.** Ein vollständiger, hochwertiger Plan kostet in der
   Modellnutzung heute unter 20 Cent (Kalkulation in [Kapitel 11](11-geschaeftsmodell-finanzplan.md)) —
   bei einem Preis von 9,99 €/Monat ist das eine tragfähige Marge.
3. **Abo-Gewohnheit ist etabliert.** Der Markt hat gelernt, für Software, die persönlich
   relevant ist, monatlich zu zahlen.

## Der Verteidigungsgraben

Ein Sprachmodell allein ist kein Graben — jeder hat Zugriff auf dieselben Modelle. Atlas'
Graben ist der **Playbook-Graph**: eine wachsende, strukturierte Datenbank realer
Zielpfade. Für jedes Ziel speichert Atlas anonymisiert, welche Meilensteine tatsächlich
vorkamen, in welcher Reihenfolge, wie lange sie wirklich gedauert haben, an welcher Stelle
Menschen abgebrochen sind und was diejenigen anders gemacht haben, die es geschafft haben.

Nach 3.000 Café-Gründungen erzeugt Atlas keinen generischen KI-Plan mehr, sondern einen,
der auf 3.000 realen Verläufen basiert. Das ist ein klassischer Daten-Netzwerkeffekt: Das
Produkt wird mit jedem Nutzer besser, und diese Verbesserung ist nicht kopierbar.

## Der Markt

Adressiert wird die Schnittmenge aus Produktivitäts-Software, Online-Weiterbildung,
Coaching und Gründungsberatung. Die konservative Bottom-up-Rechnung (Herleitung in
[Kapitel 03](03-markt-und-wettbewerb.md)) ergibt für den DACH-Raum ein realistisch
erreichbares Marktvolumen von **rund 180 Mio. € pro Jahr** *(Annahme)*, europaweit ein
Vielfaches. Atlas braucht keine Marktdominanz: 100.000 zahlende Abonnenten entsprechen
rund 12 Mio. € ARR.

## Das Geschäftsmodell

| Ebene | Preis | Inhalt |
|-------|-------|--------|
| Free | 0 € | 1 aktives Ziel, Basisplan, Community lesend |
| Plus | 9,99 €/Monat (79 €/Jahr) | Unbegrenzte Ziele, adaptives Replanning, Kalender-Sync, Kohorten |
| Pro | 29 €/Monat | Plus + monatliche Experten-Session, Dokumentenprüfung, Prioritäts-Support |
| Partner | Provision | Vermittelte Dienstleistungen (Steuerberatung, Bank, Versicherung, Kurse) |
| Business | ab 8 €/Nutzer/Monat | Gründerzentren, Kammern, Arbeitgeber, Krankenkassen |

Die Partnerebene ist der eigentliche Hebel: Wer weiß, dass ein Nutzer in vier Wochen ein
Geschäftskonto braucht, hat den wertvollsten Vermittlungsmoment im Markt — und zwar mit
echtem Nutzen für den Nutzer statt als Werbeunterbrechung.

## Der Plan für 12 Monate

| Quartal | Ziel |
|---------|------|
| Q1 | Team, Marke, Playbook-Rohbau für Wedge, geschlossene Alpha mit 50 Gründenden |
| Q2 | Öffentliche Beta (iOS + Web), 5.000 registrierte Nutzer, erste Zahlungen |
| Q3 | Android, Kohorten, Partnerintegration, 1.500 zahlende Abos |
| Q4 | Zweite Domäne (Gesundheit), 5.000 zahlende Abos, Seed-Runde |

Kapitalbedarf bis Monat 18: **rund 1,2 Mio. €** *(Annahme, Herleitung in
[Kapitel 11](11-geschaeftsmodell-finanzplan.md))*.

## Was dieses Konzept ehrlich offenlässt

Vier Dinge sind noch nicht bewiesen und werden in
[Kapitel 18](18-annahmen-validierung.md) mit konkreten Experimenten adressiert:

1. Ob Nutzer für Struktur zahlen — oder nur für Ergebnisse.
2. Ob die Retention über Monat 3 hinaus hält (der Kern jedes Abo-Modells).
3. Ob die Planqualität ohne menschliche Nacharbeit ausreicht.
4. Ob die Marktzahlen halten — sie sind bislang Schätzung, nicht Recherche.
