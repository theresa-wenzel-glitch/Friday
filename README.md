# Project Atlas — Gründungskonzept

> Arbeitstitel. Die Plattform, die Menschen hilft, echte Ziele zu erreichen.

Google beantwortet Fragen. Instagram zeigt Bilder. TikTok zeigt Videos. LinkedIn zeigt
Lebensläufe. **Atlas bringt Menschen ans Ziel** — es zerlegt ein Lebensziel in einen
konkreten, terminierten, anpassungsfähigen Plan und begleitet die Umsetzung.

Dieses Repository enthält das vollständige Gründungskonzept: Vision, Markt, Produkt,
Technik, Geschäftsmodell, Finanzplanung, Marketing, Roadmap und Pitch.

---

## Inhaltsverzeichnis

| # | Kapitel | Inhalt |
|---|---------|--------|
| 00 | [Executive Summary](docs/00-executive-summary.md) | Die zwei Seiten für Eilige |
| 01 | [Vision & Mission](docs/01-vision-mission.md) | Warum Atlas existiert, Nordstern, Prinzipien |
| 02 | [Problem & Chance](docs/02-problem-und-chance.md) | Das Ziel-Umsetzungs-Gap, warum jetzt |
| 03 | [Markt- & Wettbewerbsanalyse](docs/03-markt-und-wettbewerb.md) | Marktgröße, Wettbewerber, Positionierung |
| 04 | [Zielgruppen & Personas](docs/04-zielgruppen-personas.md) | 5 Personas, Segmentierung, Wedge |
| 05 | [Marke & Designsystem](docs/05-marke-und-design.md) | Name, Logo, Farben, Typografie, Motion |
| 06 | [Produkt & Funktionsumfang](docs/06-produkt-funktionen.md) | V1, V2, V3 — was wann gebaut wird |
| 07 | [UX-Konzept & Screens](docs/07-ux-konzept-screens.md) | Informationsarchitektur, 18 Screens |
| 08 | [Technische Architektur](docs/08-technische-architektur.md) | Stack, Services, Deployment, Security |
| 09 | [Datenmodell](docs/09-datenmodell.md) | Entitäten, Schema, Playbook-Graph |
| 10 | [Die Planungs-Engine (KI)](docs/10-ki-planungs-engine.md) | Zielzerlegung, Replanning, Guardrails |
| 11 | [Geschäftsmodell & Finanzplanung](docs/11-geschaeftsmodell-finanzplan.md) | Preise, Unit Economics, 3-Jahres-Plan |
| 12 | [Marketing & Wachstum](docs/12-marketing-wachstum.md) | Kanäle, Content, Community, Referral |
| 13 | [Roadmap: die ersten 12 Monate](docs/13-roadmap-12-monate.md) | Meilensteine, Gates, Team-Aufbau |
| 14 | [Risiken, Recht & Datenschutz](docs/14-risiken-recht-datenschutz.md) | DSGVO, AI Act, Haftung, Risikomatrix |
| 15 | [Team & Organisation](docs/15-team-organisation.md) | Rollen, Kultur, Cap Table, Hiring |
| 16 | [Pitch Deck](docs/16-pitch-deck.md) | 16 Slides, Slide-für-Slide ausformuliert |
| 17 | [NEXA vs. Atlas](docs/17-nexa-vs-atlas.md) | Strategischer Vergleich, Empfehlung |
| 18 | [Annahmen & Validierungsplan](docs/18-annahmen-validierung.md) | Was noch bewiesen werden muss |

Ergänzend: [Finanzplan als CSV](finanzplan/finanzplan-3-jahre.csv) ·
[Glossar](docs/glossar.md)

## Lauffähiger Code

| Verzeichnis | Inhalt |
|-------------|--------|
| [`engine/`](engine/) | **Die Planungs-Engine.** Klassifikation, Playbook-Abruf, Planerzeugung, deterministischer Validator (9 Regeln), Reparaturschleife, Terminierung, Evaluations-Gate. 83 Tests. Alles ohne API-Key testbar außer der Modellaufruf selbst |
| [`pitch/`](pitch/atlas-pitch-deck.html) | Das Pitch Deck als eigenständige HTML-Präsentation, 16 Folien |

```bash
cd engine && npm install
npm test                 # 83 Tests, kein API-Key nötig
npm run playbooks        # die drei redaktionellen Playbooks
npm run eval -- --dry    # Abdeckungsprüfung des Goldstandards

export ANTHROPIC_API_KEY=sk-ant-...
npm run plan -- "Ich möchte in 18 Monaten ein Café in Leipzig eröffnen" \
  --hours 6 --deadline 2027-06-01 --state SN --budget 28000
npm run eval             # das Gate — die erste echte Messung des Vorhabens
```

---

## Die Kernthese in fünf Sätzen

1. Menschen scheitern nicht an fehlender Motivation, sondern an fehlender **Struktur
   zwischen Absicht und erstem Schritt**.
2. Die dafür nötige Information existiert bereits — sie ist nur über hunderte Blogposts,
   Behördenseiten, YouTube-Videos und Foren verteilt und nicht in einen Plan übersetzt.
3. Große Sprachmodelle können diese Übersetzungsleistung heute erstmals zuverlässig
   erbringen: **Ziel → Meilensteine → Aufgaben → Termine**.
4. Der Verteidigungsgraben ist nicht das Modell, sondern der **Playbook-Graph** — die
   aggregierten, anonymisierten Erfolgspfade tausender Menschen mit demselben Ziel.
5. Wer diesen Graphen zuerst besitzt, wird für jedes weitere Ziel besser, schneller und
   billiger als jeder Nachahmer.

---

## Der Startpunkt (Wedge)

Atlas startet **nicht** mit „alle Ziele für alle Menschen". Version 1 fokussiert eine
einzige Zieldomäne mit hohem Schmerz, hoher Zahlungsbereitschaft und hoher
Partnerdichte:

> **Selbstständigkeit gründen im DACH-Raum** — vom „Ich will ein Café eröffnen" bis zur
> Gewerbeanmeldung, Finanzierung und Eröffnung.

Die Plattformarchitektur ist von Tag 1 domänenunabhängig gebaut. Nach dem Wedge folgen
Gesundheit/Fitness, dann Lernen/Karriere. Details: [Kapitel 04](docs/04-zielgruppen-personas.md)
und [Kapitel 13](docs/13-roadmap-12-monate.md).

---

## Status & Hinweis zu den Zahlen

Dieses Dokument ist ein **Konzept, kein Geschäftsbericht**. Alle Markt-, Kosten- und
Umsatzzahlen sind gekennzeichnete Annahmen und Modellrechnungen. Sie sind
plausibel hergeleitet, aber **nicht quellenbelegt** und müssen vor jeder Investorenansprache
mit Primär- und Sekundärquellen unterlegt werden. Der vollständige Validierungsplan mit
allen offenen Punkten steht in [Kapitel 18](docs/18-annahmen-validierung.md).

Wo eine Zahl geschätzt ist, steht `(Annahme)` daneben.
