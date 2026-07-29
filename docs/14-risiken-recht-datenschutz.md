# 14 — Risiken, Recht & Datenschutz

> Dieses Kapitel ersetzt keine Rechtsberatung. Es benennt die Themen, zu denen vor dem
> Marktstart anwaltliche Prüfung eingeholt werden muss, und die Position, die Atlas
> jeweils einnimmt.

---

## Teil A — Datenschutz (DSGVO)

Atlas verarbeitet Daten, die viel über einen Menschen aussagen: Lebensziele, finanzielle
Verhältnisse, berufliche Pläne, teils Gesundheitsziele. Datenschutz ist hier kein
Compliance-Anhang, sondern Produktbestandteil und Vertriebsargument.

### Rechtsgrundlagen je Verarbeitung

| Verarbeitung | Grundlage | Anmerkung |
|--------------|-----------|-----------|
| Konto, Ziele, Pläne, Fortschritt | Art. 6 (1) b — Vertragserfüllung | Kernleistung |
| Erinnerungen und Push | Art. 6 (1) b | Vertragsbestandteil, granular abschaltbar |
| Produktanalytik | Art. 6 (1) f — berechtigtes Interesse | Pseudonymisiert, Widerspruch möglich |
| Playbook-Aggregation | Art. 6 (1) f + Anonymisierung | Nach Anonymisierung außerhalb des DSGVO-Anwendungsbereichs |
| Marketing-E-Mails | Art. 6 (1) a — Einwilligung | Double-Opt-in |
| Partnervermittlung | Art. 6 (1) a — Einwilligung | **Einzeln je Vermittlung**, niemals pauschal |
| Gesundheitsbezogene Ziele (Domäne 2) | **Art. 9 (2) a — ausdrückliche Einwilligung** | Besondere Kategorie, getrennter Einwilligungsvorgang |
| B2B-Datenteilung mit Trägern | Art. 6 (1) a | Betroffene sehen genau, was geteilt wird, und können widersprechen |

**Gesundheitsdaten sind der heikelste Punkt.** Ab der zweiten Zieldomäne muss ein
getrennter, ausdrücklicher Einwilligungsvorgang bestehen, mit eigener Aufklärung und
eigener Widerrufsmöglichkeit. Der Standardvorgang für Gründungsziele darf dafür nicht
mitbenutzt werden.

### Datenübermittlung an das Modell

Der einzige regelmäßige Drittlandbezug ist die Nutzung der Claude API. Die Position von
Atlas:

1. **Pseudonymisierung vor Übertragung.** Namen, E-Mail-Adressen, Telefonnummern,
   Straßenadressen und Geburtsdaten werden serverseitig durch Platzhalter ersetzt.
   Übertragen wird die planungsrelevante Struktur (Domäne, Zeitrahmen, Kapazität,
   Budgetklasse, PLZ-Präfix), nicht die Identität.
2. **Auftragsverarbeitungsvertrag** mit dem Modellanbieter, einschließlich Regelungen zu
   Aufbewahrung und Nichtverwendung für Modelltraining.
3. **Transparenz.** Datenschutzerklärung und Verarbeitungsverzeichnis weisen den Vorgang
   ausdrücklich aus; im Produkt ist an der Planerstellung sichtbar, dass ein KI-System
   beteiligt ist.
4. **Nutzerkontrolle.** Freitextnotizen werden ohne ausdrückliche Aktion des Nutzers
   **nie** an das Modell übertragen.
5. **Prüfauftrag:** Sobald eine EU-Verarbeitungsoption verfügbar ist, wird sie genutzt.

### Betroffenenrechte — technisch umgesetzt

| Recht | Umsetzung | Frist |
|-------|-----------|-------|
| Auskunft (Art. 15) | Selbstbedienung: vollständiger Export in der App | sofort |
| Berichtigung (Art. 16) | Alle Felder in der App änderbar | sofort |
| Löschung (Art. 17) | Konto löschen → 30 Tage Soft Delete → Hard Delete | ≤ 30 Tage |
| Datenübertragbarkeit (Art. 20) | JSON + Markdown + ICS | sofort |
| Widerspruch (Art. 21) | Analytik und Playbook-Beitrag einzeln abschaltbar | sofort |
| Automatisierte Entscheidungen (Art. 22) | Kein Plan wird ohne Bestätigung wirksam (S-05); Begründung immer sichtbar (S-11) | dauerhaft |

Artikel 22 verdient besondere Aufmerksamkeit: Weil jeder Plan und jede Anpassung dem
Nutzer zur Bestätigung vorgelegt wird und eine nachvollziehbare Begründung trägt, liegt
**keine ausschließlich automatisierte Entscheidung mit rechtlicher Wirkung** vor. Diese
Gestaltung ist bewusst gewählt und darf aus Bequemlichkeitsgründen nicht aufgeweicht
werden.

### Weitere Pflichten

- **Verarbeitungsverzeichnis** (Art. 30) ab Tag 1, versioniert im Repository
- **Datenschutz-Folgenabschätzung** (Art. 35) vor dem Start der Gesundheitsdomäne
- **Auftragsverarbeitungsverträge** mit allen Dienstleistern (Hosting, Mail, Push,
  Analytik, Zahlungen, Modellanbieter)
- **Meldeprozess für Datenpannen** mit 72-Stunden-Ablauf, dokumentiert und einmal geprobt
- **Externer Datenschutzbeauftragter** ab ca. 20 Mitarbeitenden oder früher freiwillig
  (starkes B2G-Argument)

---

## Teil B — KI-Regulierung (EU AI Act)

**Einstufung.** Atlas ist nach derzeitiger Einschätzung ein **KI-System mit begrenztem
Risiko** — es trifft keine Entscheidungen über Zugang zu Bildung, Beschäftigung,
Kreditwürdigkeit oder öffentlichen Leistungen. Es erstellt Vorschläge, die der Nutzer
annimmt oder verwirft.

**Achtung bei B2G/B2B.** Sobald Atlas in einem Kontext eingesetzt wird, in dem Ergebnisse
Einfluss auf Fördermittelvergabe, Zulassung zu Maßnahmen oder Leistungsbewertungen haben
könnten, kann eine höhere Risikoklasse greifen. Diese Konstellation ist bei jedem
B2B-Vertrag einzeln zu prüfen — vertraglich wird ausgeschlossen, dass Atlas-Daten als
Grundlage für Leistungsentscheidungen gegenüber betreuten Personen verwendet werden.

**Umgesetzte Transparenzpflichten:**

- Kennzeichnung KI-generierter Inhalte an jeder Stelle, an der sie erscheinen
- Erklärung, worauf ein Plan beruht (Feld `origin` und `assumptions` aus
  [Kapitel 10](10-ki-planungs-engine.md))
- Protokollierung aller Modellaufrufe mit Modell, Prompt-Version, Zeitpunkt und Ergebnis
  (`plan_revisions`) — auditierbar
- Dokumentierte menschliche Aufsicht: redaktionelle Freigabe von Playbook-Versionen,
  Evaluations-Gate vor Modellwechseln

---

## Teil C — Fachrechtliche Abgrenzung

Der größte rechtliche Risikoblock im Wedge-Segment. Atlas bewegt sich in der Nähe dreier
regulierter Beratungsformen — und muss klar außerhalb bleiben.

| Bereich | Gesetz | Verboten | Erlaubt |
|---------|--------|----------|---------|
| **Steuern** | Steuerberatungsgesetz | Konkrete steuerliche Beratung („Du solltest die Kleinunternehmerregelung wählen"), Erstellung von Steuererklärungen | Allgemeine Information, Fristenhinweise, Aufgaben wie „Kläre mit einer Steuerberatung, ob X für dich passt" |
| **Recht** | Rechtsdienstleistungsgesetz | Rechtsberatung im Einzelfall, Vertragsgestaltung, Prüfung konkreter Verträge | Allgemeine Erläuterung von Verfahren, Verweis auf Formulare, Hinweis „Lass den Mietvertrag prüfen" |
| **Gesundheit** | Heilmittelwerbegesetz, MDR | Diagnosen, Therapieempfehlungen, Heilversprechen | Allgemeine Bewegungs- und Ernährungsstrukturierung ohne medizinischen Anspruch |

### Die drei Schutzmechanismen

1. **Systemseitiges Verbot** im Prompt der Planungs-Engine mit expliziten Beispielen.
2. **Ausgabeprüfung** — der Validator markiert Formulierungen, die als Einzelfallberatung
   gelesen werden können, und ersetzt sie durch einen Rechercheschritt mit Verweis.
3. **Verweisarchitektur statt Beratung.** Wo Fachberatung nötig ist, ist der
   Verweis auf eine Fachperson das Produkt — und zugleich Erlösquelle über die
   Partnerschicht. Die rechtliche Grenze und das Geschäftsmodell zeigen erfreulicherweise
   in dieselbe Richtung.

### Umgang mit Grenzfällen

Wenn die Klassifikation ein Ziel außerhalb des Produktbereichs erkennt (`safety_flag`),
greift ein definierter Ablauf:

| Fall | Reaktion |
|------|----------|
| Akute psychische Belastung | Kein Plan. Hinweis auf Telefonseelsorge und ärztliche Hilfe, ruhig formuliert |
| Überschuldung | Kein Finanzplan. Verweis auf anerkannte Schuldnerberatung |
| Essstörungssymptomatik bei Gewichtszielen | Kein Gewichtsreduktionsplan. Verweis auf Fachberatung |
| Illegale Vorhaben | Ablehnung mit sachlicher Begründung |
| Medizinisch riskante Ziele | Plan nur mit vorgeschaltetem Schritt „ärztliche Abklärung" |

Diese Regeln werden vor dem Start der Gesundheitsdomäne fachlich begutachtet.

---

## Teil D — Weitere rechtliche Themen

| Thema | Position |
|-------|----------|
| **Verbraucherrecht** | 14 Tage Widerruf bei Web-Abschluss, klare Preisangaben, Kündigungsbutton nach § 312k BGB |
| **Wettbewerbsrecht** | Partnerempfehlungen immer als Werbung gekennzeichnet, immer mit neutraler Alternative |
| **Urheberrecht bei Inhalten** | Nur eigene Texte oder lizenzierte Quellen; externe Inhalte nur verlinkt, nie kopiert |
| **Markenrecht** | Recherche vor dem Launch-Namen (siehe [Kapitel 05](05-marke-und-design.md)); Anmeldung in Klasse 9, 41, 42 in EU |
| **App-Store-Regeln** | Externe Zahlung nur, wo zulässig; StoreKit auf iOS für digitale Inhalte |
| **Haftung** | AGB mit klarer Leistungsbeschreibung: Atlas erstellt Vorschläge, übernimmt keine Ergebnisgarantie; Haftungsbeschränkung im gesetzlich zulässigen Rahmen; Betriebshaftpflicht mit IT-Deckung |

---

## Teil E — Risikomatrix

Bewertung: Eintrittswahrscheinlichkeit (E) und Auswirkung (A), je 1–5.

| # | Risiko | E | A | Score | Gegenmaßnahme |
|---|--------|:-:|:-:|:-----:|---------------|
| R1 | **Retention zu niedrig** (< 20 % Monat 3) | 4 | 5 | **20** | Wedge mit externem Druck; kein Bestrafungsdesign; Kohorten vorziehen; im Ernstfall Zielgruppe weiter verengen |
| R2 | **Planqualität reicht nicht** | 3 | 5 | **15** | Playbook-Basis statt reiner Generierung; Evaluations-Gate; redaktionelle Nacharbeit; Nutzerkorrekturen als Signal |
| R3 | **Plattformanbieter integriert die Funktion** | 3 | 4 | **12** | Graben über Daten, Termine, Partner, B2B-Verträge — nicht über Planerzeugung |
| R4 | **Konversion zu niedrig** (< 6 %) | 3 | 4 | **12** | Free-Tarif eng begrenzt; anlassbezogene Paywall; Preistest in Q3 |
| R5 | **Rechtliche Beanstandung** (Steuer-/Rechtsberatung) | 2 | 5 | **10** | Dreifacher Schutzmechanismus; anwaltliche Prüfung vor Launch; Verweisarchitektur |
| R6 | **Datenpanne** | 2 | 5 | **10** | Verschlüsselung, RLS, Zugriffsprotokolle, geprobter Meldeprozess, jährlicher Penetrationstest |
| R7 | **Modellkosten steigen deutlich** | 2 | 3 | **6** | Modell-Routing, Caching, deterministische Pfade, Anbieterunabhängigkeit |
| R8 | **Schlüsselperson fällt aus** | 2 | 4 | **8** | Dokumentation, kein Alleinwissen, Vesting, Vertretungsregeln |
| R9 | **Finanzierung kommt nicht zustande** | 3 | 4 | **12** | Bootstrapping-Szenario vorbereitet (Break-even M44); frühe Umsatzerzielung; Förderprogramme |
| R10 | **Playbook-Verzerrung führt zu schlechten Ratschlägen** | 2 | 4 | **8** | k-Anonymität ≥ 25; menschliche Freigabe; regelmäßige Prüfung auf Schieflagen |
| R11 | **App-Store-Ablehnung** | 2 | 3 | **6** | Frühe Einreichung; Web als vollwertiger Ersatzweg |
| R12 | **Partnerabhängigkeit beschädigt Vertrauen** | 2 | 4 | **8** | Höchstens eine Empfehlung je Meilenstein; immer Alternative; klare Kennzeichnung; Umsatzanteil begrenzen |

**Die zwei Risiken, an denen alles hängt, sind R1 und R2.** Beide werden nicht durch
Absichtserklärungen, sondern durch Messung adressiert — siehe
[Kapitel 18](18-annahmen-validierung.md).

---

## Rechtliche Aufgabenliste vor dem Marktstart

- [ ] Gesellschaftsvertrag und Beteiligungsvereinbarung mit Vesting
- [ ] Markenrecherche und -anmeldung für den Launch-Namen
- [ ] AGB, Datenschutzerklärung, Widerrufsbelehrung, Impressum
- [ ] Verarbeitungsverzeichnis, AVV mit allen Dienstleistern
- [ ] Datenschutz-Folgenabschätzung (spätestens vor Domäne 2)
- [ ] Anwaltliche Prüfung der Abgrenzung zu StBerG und RDG
- [ ] Partnerverträge mit Provisions- und Kennzeichnungsregeln
- [ ] B2B-Mustervertrag inkl. Auftragsverarbeitung und AI-Act-Klausel
- [ ] Betriebshaftpflicht mit IT- und Vermögensschadendeckung
