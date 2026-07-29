# 15 — Team & Organisation

## Was dieses Vorhaben verlangt

Atlas ist kein reines Softwareprojekt. Es verlangt drei Kompetenzen gleichzeitig, und das
Fehlen einer davon ist tödlich:

| Kompetenz | Warum unverzichtbar |
|-----------|---------------------|
| **Produkt & Technik** | Die Planungs-Engine ist der Kern. Ohne technische Tiefe entsteht ein Chatbot mit Terminliste |
| **Domänenwissen & Redaktion** | Playbooks sind Fachinhalte. Falsche Behördenpfade beschädigen das Vertrauen sofort und dauerhaft |
| **Wachstum & Vertrieb** | Ein guter Plan verkauft sich nicht von selbst. Sowohl B2C-Reichweite als auch B2B-Zugang müssen aufgebaut werden |

Die häufigste Fehlbesetzung in dieser Produktkategorie: zwei technische Gründungspersonen
und niemand, der Fachinhalte verantwortet. Das Ergebnis sind hübsche generische Pläne.

---

## Gründungsteam

### Rolle A — Produkt & Technik (CTO/CPO)

**Verantwortung:** Architektur, Planungs-Engine, Datenmodell, Evaluationssystem,
technische Einstellungen.
**Profil:** Mehrjährige Erfahrung im Aufbau von Produktivsystemen, Erfahrung mit
LLM-gestützten Produkten (nicht nur Prototypen), Produktverständnis über den Code hinaus.
**Erste 90 Tage:** Grundgerüst, Engine v1, Evaluationssuite, Alpha-Betrieb.

### Rolle B — Wachstum & Betrieb (CEO)

**Verantwortung:** Vision, Finanzierung, Marketing, Partner, B2B-Vertrieb, Recht,
Organisation.
**Profil:** Vertriebs- oder Marketingerfahrung im Abo-Geschäft, Fähigkeit, Inhalte selbst
zu produzieren, Erfahrung im Umgang mit Institutionen (Kammern, Träger, Banken).
**Erste 90 Tage:** 15 Nutzerinterviews, Pre-Seed, erste Kooperation, Inhaltsproduktion.

### Rolle C — Domäne & Redaktion (ab Monat 4, ideal ab Monat 1)

**Verantwortung:** Playbook-Qualität, fachliche Richtigkeit, Ressourcenkuratierung,
Expertennetzwerk.
**Profil:** Gründungsberatung, IHK-Umfeld, Wirtschaftsjournalismus oder eigene
Gründungserfahrung. Kein Marketingprofil.

**Empfehlung:** Rolle C wird als **drittes Gründungsmitglied** besetzt, nicht als
Angestellte. Playbook-Qualität ist der Verteidigungsgraben; wer ihn baut, sollte am
Unternehmen beteiligt sein.

---

## Einstellungsplan

| Monat | Rolle | Begründung |
|------:|-------|------------|
| 1 | Gründung A + B | |
| 2 | Senior Full-Stack-Entwicklung | Engine und API parallel |
| 3 | Produktdesign (Teilzeit → Vollzeit) | Der Signaturmoment S-04 und der Pfad sind gestalterisch entscheidend |
| 3 | Mobile-Entwicklung (React Native) | iOS in Q2 |
| 4 | Redaktion/Domäne (Gründung C) | Playbooks |
| 7 | Wachstum/Inhalte | Kanäle skalieren |
| 9 | Support & Community | Alpha der Kohorten |
| 14 | Datenanalyse | Playbook-ETL, Evaluation |
| 15 | B2B-Vertrieb | Nach dem ersten Pilotvertrag |
| 16 | Zweite Redaktionskraft | Domäne 2 |
| 18 | Backend-Entwicklung (2) | Skalierung |

**Einstellungsgrundsatz:** Bis 10 Personen wird nur eingestellt, wenn eine Rolle
nachweislich mehr als eine Person voll auslastet. Vorher wird zugekauft (Design,
Buchhaltung, Recht, Video).

---

## Arbeitsweise

**Rhythmus.** Zwei Wochen. Montags Planung (45 Minuten), täglich asynchroner Statusabgleich
(kein Stand-up-Meeting), freitags Demo mit funktionierender Software, alle zwei Wochen
Retrospektive.

**Entscheidungen.** Wer die Verantwortung trägt, entscheidet — nach Anhörung, nicht per
Abstimmung. Entscheidungen mit struktureller Wirkung werden als kurzes
Entscheidungsdokument (ADR) im Repository festgehalten: Kontext, Optionen, Entscheidung,
Konsequenz. Nach einem Jahr weiß sonst niemand mehr, warum etwas so ist.

**Remote-first mit Ankern.** Verteiltes Arbeiten, aber ein zweitägiges Präsenztreffen pro
Quartal. Kernzeit 10–15 Uhr MEZ, sonst asynchron.

**Umgang mit Nutzerkontakt.** **Jede Person im Team spricht mindestens einmal pro Monat mit
einem Nutzer** — Entwicklung, Design, Wachstum, alle. Das ist keine Empfehlung, sondern eine
Regel. In einem Produkt, dessen Qualität sich in Planrelevanz misst, ist Distanz zur
Zielgruppe der schnellste Weg zum falschen Produkt.

---

## Kultur

Fünf Sätze, die intern gelten sollen — und an denen Einstellungen und Entlassungen
ausgerichtet werden:

1. **Wir messen uns an erreichten Zielen, nicht an gebauten Funktionen.**
2. **Realismus ist Respekt.** Wir schönen weder Nutzerpläne noch interne Zahlen.
3. **Wer die Arbeit macht, entscheidet über das Wie.**
4. **Fehler werden geteilt, nicht verwaltet.** Post-Mortems ohne Schuldzuweisung, öffentlich
   im Team.
5. **Ruhe ist auch intern ein Feature.** Keine Erwartung von Erreichbarkeit außerhalb der
   Arbeitszeit. Ein Produkt über nachhaltiges Dranbleiben darf nicht im Ausbrennen gebaut
   werden.

---

## Beteiligungsstruktur (Vorschlag)

### Ausgangslage bei Gründung

| Partei | Anteil |
|--------|-------:|
| Gründung A (Produkt/Technik) | 38 % |
| Gründung B (Wachstum/Betrieb) | 38 % |
| Gründung C (Domäne/Redaktion, ab Monat 4) | 12 % |
| Mitarbeiterbeteiligungspool (VSOP) | 12 % |

**Vesting für alle Gründungsmitglieder:** 4 Jahre, 1 Jahr Cliff, monatlich linear.
Ohne Ausnahme — auch und gerade für die Gründungspersonen selbst. Beschleunigung bei
Unternehmensverkauf (Double-Trigger).

### Nach Finanzierungsrunden (illustrativ)

| | Gründung A | Gründung B | Gründung C | Pool | Investoren |
|---|---:|---:|---:|---:|---:|
| Gründung | 38 % | 38 % | 12 % | 12 % | – |
| Nach Pre-Seed (10 %) | 34,2 % | 34,2 % | 10,8 % | 10,8 % | 10 % |
| Nach Seed (18 %, Pool auf 15 %) | 26,4 % | 26,4 % | 8,3 % | 15,0 % | 23,9 % |

Die Zahlen sind illustrativ und hängen von der Bewertung ab. Wichtiger als die exakten
Prozentsätze sind zwei Grundsätze: **Der Pool wird vor der Runde aufgestockt** (sonst
verwässern ihn nur die Gründenden), und **die Gründenden behalten nach Seed gemeinsam die
Mehrheit**.

---

## Beirat

Drei Personen, je 0,25–0,5 % über zwei Jahre gevestet, vierteljährliches Treffen:

| Profil | Beitrag |
|--------|---------|
| **Erfahrung im Abo-Geschäft** | Preisgestaltung, Retention, Trichteroptimierung |
| **Institutionelle Verankerung** (Kammer, Förderbank, Gründerzentrum) | B2B-Zugang, Glaubwürdigkeit, Ausschreibungswissen |
| **KI-Produkterfahrung** | Evaluation, Modellstrategie, regulatorische Einordnung |

Kein Beirat vor Monat 6 — vorher gibt es zu wenig zu beraten.

---

## Externe Dienstleistungen

| Bereich | Ansatz | Kosten/Jahr *(Annahme)* |
|---------|--------|------------------------:|
| Buchhaltung & Lohn | Steuerberatung mit digitaler Anbindung | 12 T€ |
| Recht (Gründung, AGB, Verträge) | Kanzlei mit Startup-Fokus | 20 T€ |
| Datenschutz | Externe Beauftragung ab Monat 12 | 6 T€ |
| Video-/Audioproduktion | Freie Mitarbeit, monatlich | 24 T€ |
| Übersetzung | ab Jahr 2 | – |
| Sicherheitsprüfung | Jährlicher Penetrationstest ab Jahr 2 | 10 T€ |

---

## Die drei Personalrisiken

1. **Rolle C wird nicht gut besetzt.** Die häufigste und teuerste Lücke. Ohne echtes
   Domänenwissen entstehen plausible, aber falsche Playbooks — und Vertrauensverlust in
   dieser Domäne ist nicht reparabel.
   *Gegenmaßnahme:* Suche startet in Monat 1, nicht Monat 4. Notfalls Interim-Besetzung
   über eine erfahrene Gründungsberatung auf Honorarbasis.

2. **Zu frühes Wachstum.** Ein Team von 12 Personen vor bewiesener Retention verbrennt
   Kapital und Handlungsfähigkeit gleichzeitig.
   *Gegenmaßnahme:* Die Quartals-Gates in [Kapitel 13](13-roadmap-12-monate.md) gelten
   auch für Einstellungen — kein Aufbau bei verfehltem Gate.

3. **Gründungskonflikt über die Richtung.** Der klassische Streit lautet hier: mehr
   Domänentiefe gegen mehr Zielbreite.
   *Gegenmaßnahme:* Der Nordstern aus [Kapitel 01](01-vision-mission.md) ist die
   verbindliche Schiedsinstanz — was die Meilensteinrate erhöht, gewinnt. Zusätzlich
   Gesellschaftervereinbarung mit klaren Ressorts und einem Verfahren für Patt-Situationen.
