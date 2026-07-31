# Atlas Planungs-Engine

Lauffähige Umsetzung der Pipeline aus
[docs/10-ki-planungs-engine.md](../docs/10-ki-planungs-engine.md).

Der Zweck dieses Pakets ist **eine einzige Frage zu beantworten, bevor irgendetwas
anderes gebaut wird**: Erzeugt die Engine Pläne, die Menschen annehmen? Das ist
Annahme A2 aus [docs/18](../docs/18-annahmen-validierung.md) — das größte
Produktrisiko nach der Retention.

Kein Frontend, keine Datenbank, kein Deployment. Nur der Kern.

---

## Schnellstart

```bash
cd engine
npm install
npm start                # → http://localhost:4173
```

Das ist die Oberfläche: Ziel eingeben, sechs Fragen beantworten, Plan bekommen,
Aufgaben abhaken. **Ohne API-Key läuft sie im Demonstrationsbetrieb** — die
Pläne kommen dann direkt aus den drei hinterlegten Playbooks statt aus dem
Modell, sichtbar gekennzeichnet.

Mit Schlüssel wird echt geplant:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

### Weitere Befehle

```bash
npm test                 # 129 Tests, kein API-Key nötig
npm run playbooks        # geladene Playbooks anzeigen
npm run eval -- --dry    # Struktur- und Abdeckungsprüfung des Goldstandards

npm run plan -- "Ich möchte in 18 Monaten ein Café in Leipzig eröffnen" \
  --hours 6 --deadline 2027-06-01 --state SN --budget 28000
npm run eval             # vollständiger Evaluationslauf mit Gate
```

---

## Anmeldung

Beim ersten Aufruf legst du ein Konto an: Name, E-Mail-Adresse, Passwort,
Einwilligung. Danach meldest du dich mit E-Mail und Passwort an. Mehrere
Personen können denselben Server benutzen und sehen jeweils nur ihre eigenen
Ziele.

### Wie das gebaut ist

| | |
|---|---|
| Passwörter | scrypt mit individuellem Salt, Vergleich in konstanter Zeit. Nie im Klartext gespeichert |
| Sitzungen | Zufallstoken im `HttpOnly`-Cookie, `SameSite=Lax`, 30 Tage. In der Datei liegt **nur der SHA-256-Hash** — wer sie liest, kann sich damit nicht anmelden |
| Anmeldeversuche | 8 pro E-Mail-Adresse und Viertelstunde |
| Fehlermeldung | Für unbekannte Adresse und falsches Passwort identisch, damit die Anmeldung nicht verrät, wer registriert ist |
| Datentrennung | Jede Abfrage ist an die Konto-ID gebunden. Fremde Ziele sind nicht lesbar, nicht änderbar, nicht löschbar (durch Tests abgesichert) |
| Passwortregeln | Mindestens 10 Zeichen, keine reinen Ziffern, keine Wörterlisten-Klassiker |

### DSGVO-Grundfunktionen

- **Einwilligung** wird bei der Registrierung einzeln erfasst und versioniert gespeichert
- **Export** über „Alle Daten exportieren" — vollständiges JSON, ohne Nachfrage, ohne
  Passwort-Hash (Art. 20)
- **Löschung** über „Konto löschen" — entfernt Konto, Sitzungen und alle Ziele (Art. 17)

### Was noch fehlt

Für einen **öffentlichen Betrieb** reicht das nicht. Es fehlen:

- HTTPS (das Sitzungs-Cookie setzt `Secure` nur mit `ATLAS_SECURE_COOKIES=1`)
- E-Mail-Bestätigung und Passwort-zurücksetzen
- Postgres statt JSON-Datei — bei gleichzeitigen Schreibvorgängen mehrerer
  Personen ist eine Datei die falsche Ablage
- CSRF-Token für zusätzlichen Schutz (aktuell `SameSite=Lax`)
- Protokollierung, Sicherungen, Betriebsüberwachung
- Zwei-Faktor-Anmeldung

Der Server hört bewusst nur auf `127.0.0.1`. **Nicht ohne die obigen Punkte ins
Internet stellen.**

Das Datenschema in `src/store.ts` entspricht bereits
[docs/09](../docs/09-datenmodell.md) — der Umstieg auf Postgres ist damit ein
Austausch dieser einen Datei, keine Produktumstellung.

---

## Die Pipeline

```
Zieleingabe
    │
    ▼
[1] KLASSIFIZIEREN  Haiku 4.5   Domäne, intent_key, Machbarkeit, Sicherheit
    ▼
[2] ABRUFEN         Playbooks   Top-5 nach Ähnlichkeit
    ▼
[3] ERZEUGEN        Opus 5      Structured Output, erzwungenes Schema
    ▼
[4] VALIDIEREN      —           9 Regeln, deterministisch
    │
    ├── ungültig ──> [5] REPARIEREN (max. 2×, Fehler als Eingabe) ──┐
    ▼                                                               │
[6] TERMINIEREN     —           Kalender, Kapazität, Feiertage      │
    ▼                                                               │
[7] VORLEGEN        (Client)    Nutzer bestätigt ───────────────────┘
```

**Schritte 4 und 6 enthalten bewusst kein Modell.** Ob ein Plan zyklenfrei ist
und ob 40 Stunden Arbeit in eine Woche mit 6 verfügbaren Stunden passen, ist
berechenbar — und wird berechnet, nicht geraten.

---

## Aufbau

| Datei | Inhalt |
|-------|--------|
| `src/pipeline.ts` | Die acht Schritte, Sicherheits- und Machbarkeitsabbrüche |
| `src/validator.ts` | Die neun Regeln. Reines TypeScript, kein Modell |
| `src/scheduler.ts` | Terminierung inkl. deutscher Feiertage (Osterformel nach Gauß) |
| `src/schema.ts` | JSON-Schema für die API + zod-Schema für die Laufzeit |
| `src/model/client.ts` | Modell-Abstraktion, Routing, Caching, Kostenerfassung |
| `src/model/prompts.ts` | System-Prompt, nach Cache-Stabilität sortiert |
| `src/playbooks/` | Playbook-Speicher und die drei redaktionellen Playbooks |
| `src/eval/` | Goldstandard-Satz und Evaluations-Gate |
| `src/cli.ts` | Kommandozeile |

### Die neun Regeln des Validators

| # | Regel | Verstoß |
|---|-------|---------|
| 1 | Schemakonformität | Abbruch |
| 2 | Abhängigkeitsgraph ist azyklisch | Fehler |
| 3 | Alle `dependsOn`-Referenzen existieren | Fehler |
| 4 | Kritischer Pfad passt in den Zeitraum | Fehler |
| 5 | Wochenlast ≤ Kapazität × 1,2 | Fehler |
| 6 | Jeder Meilenstein hat eine prüfbare Ergebnisdefinition | Fehler |
| 7 | Keine Aufgabe > 480 Minuten | Fehler |
| 8 | Pflichtknoten des Playbooks vorhanden | Fehler |
| 9 | Keine unbelegten Zahlen, Fristen, Paragrafen | **Warnung** |

Regel 5 ist die praktisch wichtigste: Modelle neigen zu Optimismus. Ohne diese
Prüfung entstehen Pläne, die 20 Wochenstunden verlangen, obwohl der Mensch 6 hat
— der sicherste Weg zum Abbruch in Woche drei.

Regel 9 ist bewusst nur eine Warnung: Erfundene Gebührenhöhen und Fristen sind
der gefährlichste Halluzinationstyp in dieser Domäne, weil sie glaubwürdig
aussehen. Treffer werden zur Umformulierung als Rechercheschritt markiert, nicht
automatisch verworfen.

---

## Modell-Routing und Kosten

| Aufgabe | Modell | Preis (ein/aus je 1 Mio. Token) |
|---------|--------|--------------------------------|
| Erstplan, komplexes Replanning | `claude-opus-5` | 5 $ / 25 $ |
| Standard-Replanning, Zuschnitt | `claude-sonnet-5` | 3 $ / 15 $ |
| Klassifikation, Tagging | `claude-haiku-4-5` | 1 $ / 5 $ |

Jeder Aufruf wird mit Token, Cache-Treffern, Latenz und Eurokosten erfasst. Der
Zielwert aus [docs/11](../docs/11-geschaeftsmodell-finanzplan.md) ist **unter
0,20 € je Erstplan**; ein Test prüft die Kalkulation gegen diesen Wert.

Der System-Prompt und der Playbook-Kontext liegen vor dem Cache-Breakpoint,
Nutzerprofil und Datum dahinter — so bleibt der teure, stabile Teil
zwischengespeichert.

**Refusal-Fallback ist standardmäßig aktiv** (`fallbacks: "default"`, Beta
`server-side-fallback-2026-07-01`): Lehnt die Sicherheitsprüfung eine Anfrage ab,
bedient ein anderes Modell dieselbe Anfrage im selben Aufruf. `stop_reason` wird
vor dem Lesen des Inhalts geprüft.

---

## Das Evaluations-Gate

```bash
npm run eval
```

Läuft den Goldstandard durch und prüft gegen die Zielwerte aus docs/10:

| Metrik | Zielwert |
|--------|---------:|
| Schemavalidität im 1. Versuch | > 97 % |
| Zyklenfreiheit | 100 % |
| Kapazitätskonformität | > 95 % |
| Reparaturquote | < 8 % |
| Median-Latenz | < 12 s |
| Kosten je Plan | < 0,20 € |

Der Prozess endet mit Exit-Code 1, wenn ein Wert reißt — damit ist er in CI
verwendbar. **Regel aus dem Konzept: Kein Modell- oder Prompt-Wechsel geht ohne
bestandene Evaluation in Produktion.**

Die automatischen Metriken prüfen Struktur, nicht Inhalt. Die menschliche
Stichprobenbewertung (30 Pläne, 5 Kriterien) bleibt zusätzlich erforderlich.

---

## Sicherheitsabbrüche

Die Klassifikation erkennt Ziele außerhalb des Produktbereichs. In diesen Fällen
wird **kein Plan erzeugt**, sondern verwiesen — siehe
[docs/14](../docs/14-risiken-recht-datenschutz.md), Teil C:

| Fall | Reaktion |
|------|----------|
| Akute psychische Belastung | Telefonseelsorge, ärztliche Hilfe |
| Überschuldung | Anerkannte Schuldnerberatung |
| Essstörungssymptomatik | Ärztliche oder psychotherapeutische Abklärung |
| Rechtswidriges Vorhaben | Ablehnung mit sachlicher Begründung |
| Medizinisch riskant | Plan nur mit vorgeschalteter ärztlicher Abklärung |

Ebenso bei `feasibility: "unrealistic"`: Atlas erzeugt bewusst keinen Plan, der
so tut, als ginge es, sondern benennt den Konflikt und schlägt Alternativen vor.

---

## Wichtige Einschränkung

> **Die drei Playbooks in `src/playbooks/data/` sind fachlich NICHT geprüft.**

Sie tragen `reviewStatus: "unreviewed_draft"` und `sampleSize: 0`. Sie sind aus
allgemeinem Domänenwissen erstellt, um die Pipeline lauffähig zu machen — nicht,
um Menschen durch eine echte Gründung zu führen. Behördenpfade unterscheiden sich
je nach Bundesland und Kommune und ändern sich.

Vor jedem Einsatz mit echten Nutzern müssen sie von einer fachkundigen Person
geprüft werden (Rolle C aus
[docs/15](../docs/15-team-organisation.md)). Der `playbooks`-Befehl weist auf
den Status hin, und ein Test stellt sicher, dass ungeprüfte Playbooks nicht
stillschweigend als geprüft markiert werden.

Dasselbe gilt für die Zahlen in den Playbooks (Mediandauern, Abbruchquoten,
`successDelta`): Sie sind **plausible Platzhalter**, keine Messwerte. Echte Werte
entstehen erst aus realen Verläufen über den ETL-Prozess aus
[docs/09](../docs/09-datenmodell.md).

---

## Nächste Schritte

1. **API-Key setzen und `npm run eval` laufen lassen.** Das ist die erste echte
   Messung des Vorhabens.
2. **Playbooks fachlich prüfen lassen** — ohne das ist die Engine ein
   Demonstrator, kein Produkt.
3. **Goldstandard auf 200 Fälle erweitern**, gespeist aus den 15 Interviews
   (E-1 in docs/18).
4. **Replanning implementieren** — bislang ist nur der Erstplan umgesetzt. Die
   Strategien nach Rückstandsgrad stehen in docs/10.
5. **Persistenz** (Postgres, Schema aus docs/09), danach das Frontend.
