# 13 — Roadmap: die ersten 12 Monate

## Grundsatz

Die Roadmap ist nach **Beweisen** gegliedert, nicht nach Funktionen. Jedes Quartal endet
mit einer Frage, die beantwortet sein muss. Ist sie es nicht, wird nicht weitergebaut,
sondern korrigiert.

| Quartal | Die zu beantwortende Frage | Gate |
|---------|---------------------------|------|
| Q1 | Können wir Pläne erzeugen, die Menschen tatsächlich annehmen? | Annahmequote ≥ 65 % |
| Q2 | Bleiben Menschen über den vierten Monat hinaus dabei? | Woche-8-Retention ≥ 30 % |
| Q3 | Zahlen Menschen dafür? | Konversion ≥ 8 %, 1.500 zahlende Abos |
| Q4 | Trägt das Modell über eine Domäne hinaus? | Zweite Domäne mit vergleichbarer Aktivierung |

---

# Q1 — Fundament (Monat 1–3)

**Ziel:** Ein Plan, der funktioniert. Kein Produkt, kein Marketing — nur der Kern.

### Monat 1

- Gründung (UG oder GmbH), Gesellschaftervertrag, Konto, Buchhaltung
- Markenrecherche beauftragt (Ergebnis Ende Monat 2)
- **15 Interviews mit Gründenden** — die wichtigste Aufgabe des Monats. Ergebnis:
  Rohmaterial für die ersten Playbooks und die Validierung des Problems
- Technisches Grundgerüst: Repository, CI/CD, Postgres, Auth, Deployment-Pipeline
- Designsystem als Tokens und erste Komponentenbibliothek

### Monat 2

- **Planungs-Engine, erste Fassung**: Klassifikation, Abruf, Erzeugung, Validierung
- Redaktionelle Erstellung von **12 Playbooks** für die häufigsten Gründungsvorhaben
  (Gastronomie, Handwerk, Einzelhandel, Beratung, Onlinehandel, Pflege, Kosmetik, Fitness,
  Fotografie, Nachhilfe, Handel mit Lebensmitteln, IT-Dienstleistung)
- Goldstandard-Evaluationssatz mit 200 Zielbeschreibungen aufgebaut
- Web-Onboarding (S-01 bis S-05) funktionsfähig

### Monat 3

- Heute-Ansicht, Pfad, Aufgabendetail, Erinnerungen per E-Mail
- **Geschlossene Alpha mit 50 Gründenden**, rekrutiert über die Interviewkontakte und
  ein Gründerzentrum
- Wöchentliche Gespräche mit 10 Alpha-Teilnehmenden
- Erste Evaluationsrunde der Planqualität

**Gate Q1:** Planannahmequote ≥ 65 %, menschliche Qualitätsbewertung ≥ 4,0/5.
*Wird das verfehlt:* Q2 wird verschoben, stattdessen Playbook-Tiefe und Prompt-Arbeit.

---

# Q2 — Beta (Monat 4–6)

**Ziel:** Ein Produkt, das ohne Begleitung funktioniert.

### Monat 4

- iOS-App (Expo), Feature-Parität mit der Web-Version
- Push-Benachrichtigungen mit gelerntem Zeitpunkt
- **Adaptives Replanning** und wöchentlicher Check-in (S-10, S-11) — das Alleinstellungsmerkmal
- Datenschutz-Paket: Verarbeitungsverzeichnis, Datenschutzerklärung, AVV mit allen
  Auftragsverarbeitern, Löschkonzept

### Monat 5

- **Öffentliche Beta** (Web + iOS TestFlight), Warteliste wird geöffnet
- Inhaltsproduktion startet: 4 Kernartikel, erste TikTok-Formate
- Datenexport, Kontolöschung, Einwilligungsverwaltung
- Analytik und Trichtermessung produktiv

### Monat 6

- Kalender-Sync (zunächst Ein-Weg-Push)
- Ressourcenbibliothek mit 120 kuratierten Einträgen
- Erste **Kooperation mit einem Gründerzentrum** unterzeichnet
- Onboarding-Optimierung auf Basis der Trichterdaten
- Vorbereitung der Bezahlfunktion

**Gate Q2:** 5.000 registrierte Nutzer, Woche-8-Retention ≥ 30 %, Absturzfreiheit > 99,5 %.
*Wird das verfehlt:* Monetarisierung wird verschoben; Ursachenanalyse der Abwanderung hat
Vorrang.

---

# Q3 — Monetarisierung (Monat 7–9)

**Ziel:** Beweisen, dass Menschen zahlen.

### Monat 7

- **Bezahlfunktion live**: Stripe (Web), StoreKit 2 (iOS)
- Tarifgrenzen implementiert, Paywall (S-16) mit anlassbezogener Auslösung
- Erste bezahlte Anzeigen als Test, kleines Budget
- Preistest: 9,99 € gegen 12,99 € in getrennten Kohorten

### Monat 8

- **Kohorten (V2.1)** — erste Gruppen mit ausreichender Nutzerdichte
- Zwei-Wege-Kalender-Sync
- Empfehlungsprogramm live
- Podcast startet (auch als Türöffner für Kooperationen)

### Monat 9

- **Pro-Tarif** mit Expertensessions; Aufbau eines Expertenpools von 8 Fachpersonen
- Partnerintegration Stufe 1: Geschäftskonto und Gewerbeversicherung
- Support-Struktur mit Hilfezentrum
- **Erster zahlender B2B-Pilot** (Gründerzentrum, 25–50 Plätze)

**Gate Q3:** 1.500 zahlende Abos, Konversion ≥ 8 %, LTV/CAC ≥ 3.
*Wird das verfehlt:* Preis- und Verpackungsarbeit statt Funktionsausbau.

---

# Q4 — Ausweitung (Monat 10–12)

**Ziel:** Beweisen, dass die Plattform mehr als eine Domäne trägt — und Seed-Reife
herstellen.

### Monat 10

- **Android-App** (aus derselben Codebasis)
- Widgets für iOS und Android, Apple-Watch-Komplikation
- Playbook-ETL produktiv: erste **datengetriebene** Playbook-Version aus realen Verläufen
  (Meilenstein für den Verteidigungsgraben)

### Monat 11

- **Zweite Zieldomäne: Gesundheit/Fitness.** 8 Playbooks (Marathon, Halbmarathon,
  Krafttraining, Gewichtsreduktion, Rauchstopp, Schlaf, Rückengesundheit,
  Ernährungsumstellung)
- Domänenübergreifende Architektur produktiv getestet
- **B2B-Konsole (S-18)** für die ersten Mandanten

### Monat 12

- Skalierung der bezahlten Kanäle auf Basis belegter Amortisationsdauern
- Jahresrückblick für Nutzer (starkes Teilmoment)
- **Seed-Runde**: Unterlagen, Datenraum, Gespräche
- Technische Konsolidierung: Lasttests, Schuldenabbau, Sicherheitsprüfung

**Gate Q4:** 5.000 zahlende Abos, zweite Domäne mit ≥ 80 % der Aktivierungsrate der
ersten, monatliche Abwanderung ≤ 8 %.

---

## Meilensteinübersicht

| Monat | Meilenstein | Erfolgsmaß |
|------:|-------------|------------|
| 1 | 15 Nutzerinterviews | Problem bestätigt, Playbook-Rohmaterial |
| 2 | Planungs-Engine v1 + 12 Playbooks | Evaluationsdurchlauf besteht |
| 3 | Alpha mit 50 Gründenden | Annahmequote ≥ 65 % |
| 4 | Replanning live | Check-in-Teilnahme ≥ 45 % |
| 5 | Öffentliche Beta | 2.000 registrierte Nutzer |
| 6 | Erste Kooperation | Vertrag unterzeichnet |
| 7 | Bezahlfunktion live | Erste 100 Zahlende |
| 8 | Kohorten | Retention in Kohorten +10 Pp. |
| 9 | Pro + B2B-Pilot | 1.500 Zahlende |
| 10 | Android + datengetriebene Playbooks | Playbook-Konfidenz > 0,7 |
| 11 | Zweite Domäne | Aktivierung ≥ 80 % der ersten Domäne |
| 12 | Seed-Reife | 5.000 Zahlende, 720 T€ ARR |

---

## Ressourcenplanung

| | Q1 | Q2 | Q3 | Q4 |
|---|---:|---:|---:|---:|
| Team (FTE) | 5 | 6 | 8 | 8 |
| Personalkosten | 85 T€ | 110 T€ | 135 T€ | 140 T€ |
| Marketing | 5 T€ | 25 T€ | 60 T€ | 90 T€ |
| Infrastruktur & KI | 2 T€ | 6 T€ | 12 T€ | 20 T€ |
| Sonstiges | 25 T€ | 20 T€ | 22 T€ | 23 T€ |
| **Gesamt** | **117 T€** | **161 T€** | **229 T€** | **273 T€** |

Summe Jahr 1: **780 T€** — gedeckt aus Pre-Seed (400 T€), Umsatz (231 T€) und einer
Zwischenfinanzierung bzw. vorgezogenem Seed-Teil.

---

## Was in Jahr 1 bewusst nicht passiert

| Nicht | Frühestens |
|-------|------------|
| Internationalisierung | Jahr 2, Q3 (beginnend mit AT/CH) |
| Offene Zieldomänen | Jahr 2, Q2 |
| Playbook-Marktplatz | Jahr 3 |
| Öffentliche API | Jahr 3 |
| Team-/Familienziele | Jahr 3 |
| Eigenes Modelltraining | nicht geplant |

## Die drei größten Terminrisiken

1. **Playbook-Erstellung dauert länger als geplant.** Fachlich saubere Playbooks sind
   Redaktionsarbeit, nicht Programmierarbeit.
   *Gegenmaßnahme:* Von Anfang an eine erfahrene Redaktionskraft mit Domänenwissen; Start
   mit 6 statt 12 Playbooks, falls nötig.
2. **App-Store-Freigabe verzögert sich.** Abo-Apps werden genau geprüft.
   *Gegenmaßnahme:* Erste Einreichung bereits in Monat 4 mit einer minimalen Version; Web
   bleibt der vollwertige Ersatzweg.
3. **Retention verfehlt das Q2-Gate.** Das wahrscheinlichste Risiko überhaupt.
   *Gegenmaßnahme:* Kohorten aus Q3 vorziehen; Check-in-Ablauf überarbeiten; im
   Zweifelsfall Wedge auf noch stärker fremdbestimmte Ziele verengen (z. B. nur
   Gründungen mit bereits gesetztem Eröffnungstermin).
