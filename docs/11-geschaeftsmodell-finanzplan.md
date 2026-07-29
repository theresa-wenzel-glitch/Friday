# 11 — Geschäftsmodell & Finanzplanung

> **Alle Zahlen in diesem Kapitel sind Modellrechnungen auf Basis offengelegter Annahmen.**
> Sie sind so gebaut, dass jede Eingangsgröße einzeln durch einen gemessenen Wert ersetzt
> werden kann. Die kritischen Annahmen — Konversionsrate und monatliche Abwanderung —
> stehen als Experimente in [Kapitel 18](18-annahmen-validierung.md).

## Die vier Erlösquellen

| Quelle | Anteil Jahr 1 | Anteil Jahr 3 | Charakter |
|--------|:-------------:|:-------------:|-----------|
| **Abonnements (B2C)** | 92 % | 62 % | Planbar, skalierbar, Kern |
| **Partnervermittlung** | 6 % | 22 % | Hohe Marge, wächst mit Nutzerdichte |
| **B2B / B2G-Lizenzen** | 2 % | 14 % | Große Verträge, lange Zyklen, stabil |
| **Marktplatz (Experten, Playbooks)** | 0 % | 2 % | Optional, erst ab Jahr 3 |

Die bewusste Reihenfolge: erst ein funktionierendes Abo, dann Partner, dann B2B. Wer
zuerst B2B verkauft, baut ein Beratungsunternehmen statt eines Produkts.

---

## Preisgestaltung

| Tarif | Preis | Positionierung |
|-------|-------|----------------|
| **Free** | 0 € | 1 aktives Ziel, monatliches Replanning, E-Mail-Erinnerungen. Vollwertig genug, um zu wirken — beschränkt genug, um aufzurüsten |
| **Plus** | **9,99 €/Monat** oder **79 €/Jahr** (−34 %) | Der Hauptumsatzträger |
| **Pro** | **29 €/Monat** | Plus + monatliche 30-Min-Expertensession + Dokumentenprüfung |
| **Business** | ab **8 €/Platz/Monat**, Mindestabnahme 25 Plätze | Gründerzentren, Kammern, Arbeitgeber, Kassen |

### Warum 9,99 €

- **Unter der psychologischen Zehn-Euro-Schwelle** — die Entscheidung fällt ohne Rechnen.
- **Im Rahmen vergleichbarer Abos** (Musik, Video, Produktivität), also erwartungskonform.
- **Verschwindend gegenüber dem Vorhaben.** Wer 25.000 € in ein Café investiert, prüft
  9,99 € nicht.
- **Deutlich unter der Alternative.** Eine einzige Coachingstunde kostet 8–20 Monate Plus.

Ein höherer Preis (14,99 €) wäre bei der Gründungspersona vermutlich durchsetzbar, würde
aber die Konversion in den breiteren Domänen ab Jahr 2 beschädigen. Der Preistest steht
als E-4 in [Kapitel 18](18-annahmen-validierung.md).

### Jahresabo als strategischer Hebel

79 € im Jahr entsprechen 6,58 € im Monat. Der Rabatt ist bewusst großzügig, weil er drei
Probleme gleichzeitig löst: Er sichert Liquidität im Voraus, er umgeht die kritische
Abwanderung in Monat 2 bis 4, und er passt inhaltlich — Ziele dauern Monate, kein
Monatsabo.

Zielverteilung: **40 % Jahresabo** *(Annahme)*.

---

## Unit Economics

### Durchschnittserlös pro zahlendem Nutzer und Monat (ARPU)

| Position | Rechnung | Wert |
|----------|----------|------|
| Plus monatlich (60 % der Plus-Kunden) | 0,60 × 9,99 € | 5,99 € |
| Plus jährlich (40 %) | 0,40 × 6,58 € | 2,63 € |
| → Plus gemischt | | **8,62 €** |
| Tarifmix 85 % Plus / 15 % Pro | 0,85 × 8,62 + 0,15 × 29,00 | **11,68 €** |
| **Abo-ARPU (gerundet)** | | **11,50 €** |
| Partnererlöse Jahr 1 / 2 / 3 | | 0,50 / 1,20 / 2,00 € |
| **Gesamt-ARPU Jahr 1 / 3** | | **12,00 € / 13,50 €** |

### Kosten pro zahlendem Nutzer und Monat (COGS)

#### a) KI-Kosten — die Detailrechnung

Grundlage sind die Erstanbieter-Tarife der Claude API (Stand Konzepterstellung, je 1 Mio.
Token): Opus 5 **5 $ / 25 $**, Sonnet 5 **3 $ / 15 $**, Haiku 4.5 **1 $ / 5 $**.
Umrechnung 1 $ = 0,92 € *(Annahme)*.

**Erstplan (einmal pro Ziel):**

| Schritt | Modell | Token | Kosten |
|---------|--------|-------|--------|
| Klassifikation | Haiku 4.5 | 2.000 ein / 300 aus | $0,0035 |
| Planerzeugung Eingabe | Opus 5 | 18.000, davon 60 % aus dem Cache | $0,045 |
| Planerzeugung Ausgabe | Opus 5 | 6.000 | $0,150 |
| Reparatur (in 8 % der Fälle) | Opus 5 | anteilig | $0,010 |
| **Summe** | | | **≈ $0,21 ≈ 0,19 €** |

**Replanning (Modell nur bei mittlerem/schwerem Rückstand — ca. 1,5×/Monat):**

| Schritt | Modell | Token | Kosten |
|---------|--------|-------|--------|
| Eingabe | Sonnet 5 | 9.000, 60 % gecacht | $0,012 |
| Ausgabe | Sonnet 5 | 2.500 | $0,038 |
| **je Vorgang** | | | **≈ $0,05 ≈ 0,046 €** |

**Monatliche KI-Kosten pro zahlendem Nutzer:**

| Position | Rechnung | Wert |
|----------|----------|------|
| Erstpläne (1,4 Ziele/Jahr → 0,12/Monat) | 0,12 × 0,19 € | 0,02 € |
| Replanning | 1,5 × 0,046 € | 0,07 € |
| Check-in-Auswertung, Tagging, Zusammenfassungen (Haiku) | | 0,11 € |
| **Direkt** | | **0,20 €** |
| Anteilige Kosten für Free-Nutzer (8 je Zahler, je 0,06 €) | | 0,48 € |
| **KI-Kosten gesamt je Zahler** | | **≈ 0,70 €** |

Bemerkenswert: **Die Free-Nutzer sind teurer als die Zahler.** Deshalb ist der Free-Tarif
auf ein Ziel und monatliches Replanning begrenzt — nicht aus Verkaufstaktik, sondern aus
Kostenlogik. Ohne diese Begrenzung wäre das Modell bei niedriger Konversion defizitär.

#### b) Gesamt-COGS

| Position | Wert | Anmerkung |
|----------|------|-----------|
| KI | 0,70 € | s. o. |
| Zahlungsabwicklung | 0,92 € | gemischt aus Stripe (~3,2 %) und App-Store (15 % im Small-Business-Programm) |
| Infrastruktur | 0,15 € | Hosting, Speicher, CDN |
| Support | 0,30 € | bei ~4 % Kontaktquote |
| Inhalte & Kuratierung | 0,20 € | Redaktion, Linkprüfung |
| **COGS gesamt** | **2,27 €** | |
| **Rohmarge** | **9,73 € (81 %)** | bei 12,00 € ARPU |

Die 81 % sind für ein Consumer-Abo mit KI-Anteil ein gesunder Wert — die App-Store-Gebühr
ist der größte Einzelposten, nicht das Modell.

### Kundenwert und Akquisekosten

| Kennzahl | Wert *(Annahme)* | Anmerkung |
|----------|------------------|-----------|
| Monatliche Abwanderung | 7 % | **die kritischste Annahme im gesamten Plan** |
| Durchschnittliche Verweildauer | 14 Monate | 1 / 0,07 |
| **LTV** | **≈ 136 €** | 9,73 € × 14 |
| Blended CAC Jahr 1 | 22 € | Mix aus organisch, Content, bezahlt |
| Blended CAC Jahr 3 | 30 € | steigt mit bezahltem Anteil |
| **LTV/CAC Jahr 1** | **6,2** | gesund (Zielwert > 3) |
| **Amortisationsdauer** | **2,3 Monate** | sehr gut (Zielwert < 12) |

**Sensitivität der Abwanderung** — der Plan lebt und stirbt mit dieser Zahl:

| Monatliche Abwanderung | Verweildauer | LTV | LTV/CAC (CAC 22 €) | Bewertung |
|:----------------------:|:------------:|:---:|:------------------:|-----------|
| 4 % | 25 Mon. | 243 € | 11,1 | ausgezeichnet |
| 7 % *(Planannahme)* | 14 Mon. | 136 € | 6,2 | gesund |
| 10 % | 10 Mon. | 97 € | 4,4 | tragfähig |
| 15 % | 6,7 Mon. | 65 € | 3,0 | Grenzfall |
| **20 %** | 5 Mon. | 49 € | **2,2** | **Geschäftsmodell trägt nicht** |

Über 15 % monatlicher Abwanderung muss entweder der Preis deutlich steigen oder das
Produkt grundlegend geändert werden. Deshalb ist Retention der Nordstern und deshalb ist
der Wedge nach externem Druck ausgewählt (siehe [Kapitel 04](04-zielgruppen-personas.md)).

---

## Drei-Jahres-Plan

### Nutzerentwicklung

| Quartal | Registriert (kum.) | Zahlend | Konversion | ARR |
|---------|-------------------:|--------:|-----------:|----:|
| Q1 J1 | 300 | 0 | – | – |
| Q2 J1 | 3.500 | 180 | 5,1 % | 26 T€ |
| Q3 J1 | 14.000 | 1.400 | 10,0 % | 202 T€ |
| Q4 J1 | 42.000 | 5.000 | 11,9 % | 720 T€ |
| Q2 J2 | 95.000 | 12.500 | 13,2 % | 1,88 Mio € |
| Q4 J2 | 165.000 | 22.000 | 13,3 % | 3,30 Mio € |
| Q2 J3 | 260.000 | 33.000 | 12,7 % | 5,15 Mio € |
| Q4 J3 | 380.000 | 45.000 | 11,8 % | 7,29 Mio € |

Die Konversion sinkt ab Jahr 3 leicht, weil bezahlte Kanäle breiter und damit weniger
qualifiziert einkaufen — eine bewusst konservative Annahme.

### Gewinn- und Verlustrechnung (gerundet, in T€)

| Position | Jahr 1 | Jahr 2 | Jahr 3 |
|----------|-------:|-------:|-------:|
| Abo-Umsatz | 212 | 1.720 | 3.980 |
| Partnererlöse | 14 | 205 | 855 |
| B2B/B2G | 5 | 130 | 660 |
| **Gesamtumsatz** | **231** | **2.055** | **5.495** |
| COGS | −48 | −395 | −1.045 |
| **Rohertrag** | **183** | **1.660** | **4.450** |
| Personal | −470 | −1.350 | −2.600 |
| Marketing | −180 | −700 | −1.300 |
| Recht, Beratung, Buchhaltung | −45 | −80 | −140 |
| Werkzeuge, Software, Büro | −45 | −130 | −280 |
| **Betriebskosten** | **−740** | **−2.260** | **−4.320** |
| **EBITDA** | **−557** | **−600** | **+130** |

**Break-even auf Monatsbasis: Monat 32** *(Annahme)*.

### Personalaufbau

| Zeitpunkt | Köpfe | Zusammensetzung |
|-----------|------:|-----------------|
| Monat 1 | 2 | 2 Gründungspersonen (Produkt/Technik + Wachstum/Betrieb) |
| Monat 3 | 5 | + 2 Entwicklung, + 1 Design |
| Monat 6 | 6 | + 1 Redaktion/Domänenwissen |
| Monat 9 | 8 | + 1 Wachstum, + 1 Support/Community |
| Monat 12 | 8 | konsolidieren |
| Ende Jahr 2 | 16 | + Entwicklung (3), Vertrieb B2B (2), Datenanalyse (1), Redaktion (2) |
| Ende Jahr 3 | 30 | Skalierung aller Funktionen |

Vollkostenansatz je Angestelltem 7.000 €/Monat, Gründungspersonen anfangs 4.500 €/Monat
*(Annahmen)*.

### Marketingbudget Jahr 1 (180 T€)

| Kanal | Budget | Erwartete Neukunden *(Annahme)* |
|-------|-------:|---------------------------:|
| Inhalte & SEO (Redaktion, Tools) | 55 T€ | 1.800 |
| TikTok / Instagram (organisch + Produktion) | 40 T€ | 1.400 |
| Bezahlte Anzeigen (Test) | 45 T€ | 1.300 |
| Kooperationen (IHK, Gründerzentren) | 20 T€ | 350 |
| Empfehlungsprogramm | 12 T€ | 400 |
| Sonstiges (PR, Veranstaltungen) | 8 T€ | 200 |

---

## Kapitalbedarf und Finanzierung

| Runde | Zeitpunkt | Volumen | Verwendung |
|-------|-----------|--------:|------------|
| **Pre-Seed** | Monat 0 | **400 T€** | Team auf 6, Beta bauen, erste 5.000 Nutzer |
| **Seed** | Monat 14 | **1,8 Mio €** | Skalierung, zweite Domäne, B2B-Vertrieb, Team auf 16 |
| *(optional Series A)* | Monat 30 | 6–10 Mio € | Internationalisierung, Marktplatz |

**Kumulierter Kapitalbedarf bis zum Break-even: ca. 1,25 Mio €** zuzüglich Sicherheitspuffer
→ **Gesamtbedarf 2,2 Mio €** *(Annahme)*.

Ohne Seed-Runde (Bootstrapping-Szenario) wäre der Plan mit deutlich langsamerem Wachstum
darstellbar: Break-even etwa Monat 44 bei rund 15 Mitarbeitenden — der Playbook-Vorsprung
gegenüber möglichen Wettbewerbern ginge dabei aber verloren.

### Fördermöglichkeiten (zu prüfen)

EXIST-Gründerstipendium, INVEST-Zuschuss für Wagniskapital, regionale Programme der
Landesförderbanken, Digital-Jetzt-Nachfolgeprogramme, EU-Programme für digitale
Kompetenzen. Diese Mittel sind nicht eingeplant — sie würden den Kapitalbedarf senken,
sollen aber keine Planannahme sein.

---

## Die drei Zahlen, die alles entscheiden

1. **Monat-3-Retention.** Unter 20 % trägt kein Abo-Modell.
2. **Free-zu-Plus-Konversion.** Unter 6 % wird die Free-Nutzerbasis zum Kostenproblem.
3. **Planqualität (Annahmequote ohne Änderung).** Unter 60 % scheitert die Aktivierung —
   und ohne Aktivierung sind die anderen beiden Zahlen bedeutungslos.

Alles andere im Finanzplan ist Ableitung.
