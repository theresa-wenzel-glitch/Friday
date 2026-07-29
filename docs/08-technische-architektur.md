# 08 — Technische Architektur

## Leitentscheidungen

Fünf Entscheidungen prägen die gesamte Architektur:

| Entscheidung | Begründung |
|--------------|------------|
| **Modularer Monolith statt Microservices** | Ein Team von 3–5 Entwickelnden. Microservices kosten in dieser Phase mehr, als sie bringen. Modulgrenzen werden im Code sauber gezogen, damit später herausgelöst werden kann |
| **TypeScript im gesamten Stack** | Ein Team, eine Sprache, geteilte Typen zwischen Server, Web und App. Reduziert Reibung erheblich |
| **PostgreSQL als einzige Primärdatenbank** | Relationen, JSONB, Volltext und Vektorsuche (`pgvector`) in einem System. Kein zweiter Datenspeicher, solange Postgres reicht |
| **EU-Hosting ab Tag 1** | Nicht verhandelbar. Notwendig für DSGVO, entscheidend für den B2B-/B2G-Vertrieb |
| **Modellagnostische Abstraktion** | Die Planungs-Engine spricht mit einem eigenen internen Interface, nicht direkt mit einem Anbieter-SDK. Modellwechsel darf keine Produktänderung erfordern |

---

## Systemüberblick

```
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  iOS / Android │   │   Web-App     │   │ B2B-Konsole   │
│  React Native  │   │   Next.js     │   │   Next.js     │
│  (Expo)        │   │               │   │               │
└───────┬────────┘   └───────┬───────┘   └───────┬───────┘
        └────────────────────┼───────────────────┘
                             │ HTTPS / tRPC + REST
                    ┌────────▼─────────┐
                    │   API-Gateway    │  Auth, Rate-Limit, Logging
                    └────────┬─────────┘
                             │
      ┌──────────────────────┼───────────────────────────┐
      │                      │                           │
┌─────▼──────┐   ┌───────────▼────────────┐   ┌──────────▼────────┐
│  Core-API  │   │  Planning-Engine       │   │  Worker-Pool      │
│  (Fastify) │   │  (Zerlegung, Replan)   │   │  (BullMQ)         │
│            │   │                        │   │  Erinnerungen,    │
│  Ziele     │   │  ┌──────────────────┐  │   │  Sync, Reports,   │
│  Aufgaben  │◄──┤  │ Modell-Abstraktion│ │   │  Playbook-ETL     │
│  Nutzer    │   │  └────────┬─────────┘  │   └──────────┬────────┘
│  Abos      │   └───────────┼────────────┘              │
└─────┬──────┘               │                           │
      │            ┌─────────▼──────────┐                │
      │            │  Claude API        │                │
      │            │  Opus 5 / Sonnet 5 │                │
      │            │  / Haiku 4.5       │                │
      │            └────────────────────┘                │
      │                                                  │
┌─────▼──────────────────────────────────────────────────▼─────┐
│  PostgreSQL 16 (+ pgvector)  │  Redis  │  S3-kompatibel      │
│  Kerndaten, Playbook-Graph,  │  Cache, │  Anhänge, Exporte   │
│  Vektorindex                 │  Queue  │                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Technologie-Stack

### Clients

| Bereich | Wahl | Begründung |
|---------|------|------------|
| Mobile | **React Native + Expo** | Eine Codebasis für iOS/Android, EAS für Builds und OTA-Updates. Für ein formularlastiges Produkt ohne Grafiklast völlig ausreichend |
| Web | **Next.js (App Router)** | Serverseitiges Rendering für SEO — wichtig, weil Suchtraffic ein Hauptkanal ist |
| Zustand | TanStack Query + Zustand | Serverstatus getrennt vom UI-Status |
| Styling | Tailwind (Web) / Restyle (Native) | Gemeinsame Design-Token aus einer JSON-Quelle |
| Offline | WatermelonDB / SQLite | Heute-Ansicht und Erledigt-Markierungen funktionieren offline |
| Animation | Reanimated 3 / Framer Motion | Für S-04 und die Pfadanimation |

### Backend

| Bereich | Wahl |
|---------|------|
| Laufzeit | Node.js 22 LTS, TypeScript strict |
| Framework | Fastify + tRPC (interne Clients), REST/OpenAPI (Partner) |
| ORM | Drizzle ORM (SQL-nah, typsicher, leichte Migrationen) |
| Jobs | BullMQ auf Redis |
| Auth | Magic Link + Apple/Google OIDC, kurzlebige JWT + rotierende Refresh-Token |
| Zahlungen | Stripe (Web), StoreKit 2 / Google Play Billing (App) |
| Suche | Postgres FTS, `pgvector` für semantische Playbook-Suche |
| Mail/Push | Postmark (transaktional), Expo Push / APNs / FCM |

### Infrastruktur

| Bereich | Wahl | Begründung |
|---------|------|------------|
| Hosting | **Hetzner Cloud (Nürnberg/Falkenstein)**, Kubernetes-light (k3s) oder Nomad | Deutsches Hosting, sehr gutes Preis-Leistungs-Verhältnis, starkes Argument im B2G-Vertrieb |
| Datenbank | Managed Postgres (EU) mit Point-in-Time-Recovery | Betriebsaufwand vermeiden |
| Objektspeicher | Hetzner Object Storage / Scaleway (EU) | S3-kompatibel, EU-Region |
| CDN | Bunny.net (EU-Region) | Kostengünstig, DSGVO-freundlich |
| CI/CD | GitHub Actions → Container-Registry → Rolling Deploy | Standard, schnell aufgesetzt |
| Beobachtbarkeit | OpenTelemetry → Grafana Cloud (EU); Sentry (EU-Region) | Anbieterneutral |
| Feature-Flags | Unleash (selbst gehostet) | Keine Nutzerdaten an Dritte |
| Analytik | PostHog (EU-Hosting oder selbst gehostet) | Produktanalytik ohne US-Transfer |

**Bewusst nicht gewählt:** US-Hyperscaler als Primärhosting (Transferproblematik,
B2G-Vertriebshürde), Firebase (Datenhaltung), Vercel für die API (Kostenverlauf, Kaltstart
bei langen Modellaufrufen).

**Die eine Ausnahme.** Die Modellaufrufe gehen an die Claude API. Das ist ein
Datentransfer, der in Verträgen, Verarbeitungsverzeichnis und Datenschutzerklärung
explizit ausgewiesen wird; zusätzlich wird jede Modellanfrage vor dem Versand
pseudonymisiert (siehe unten und [Kapitel 14](14-risiken-recht-datenschutz.md)).

---

## Module des Core-API

Jedes Modul hat eine eigene Schnittstelle und darf nur über diese angesprochen werden.
Damit bleibt eine spätere Herauslösung möglich, ohne heute die Kosten verteilter Systeme
zu zahlen.

| Modul | Verantwortung |
|-------|---------------|
| `identity` | Nutzer, Sitzungen, Einwilligungen, Löschung |
| `goals` | Ziele, Meilensteine, Aufgaben, Zustandsübergänge |
| `planning` | Planerzeugung, Replanning, Validierung (ruft die Engine) |
| `playbooks` | Playbook-Graph, Ähnlichkeitssuche, Aggregation |
| `scheduling` | Kalender-Sync, Terminberechnung, Erinnerungslogik |
| `content` | Ressourcenbibliothek, Kuratierung, Verfallsprüfung |
| `cohorts` | Gruppenbildung, Moderation, Impulse |
| `billing` | Abos, Tarife, Rechte, Webhooks |
| `partners` | Partnerkatalog, Vermittlungen, Provisionsabrechnung |
| `orgs` | Mandanten, B2B-Konsole, Berichte |
| `notifications` | Kanäle, Zeitpunkt-Lernen, Frequenzbegrenzung |

---

## Die Planungs-Engine (technisch)

Die fachliche Logik steht in [Kapitel 10](10-ki-planungs-engine.md). Technisch relevant:

### Modell-Routing

Drei Aufgabenklassen, drei Modelle — Kostensteuerung ohne Qualitätsverlust an den
entscheidenden Stellen:

| Aufgabe | Modell | Warum |
|---------|--------|-------|
| Erstplan, komplexes Replanning | `claude-opus-5` | Höchste Planqualität; der Erstplan entscheidet über Aktivierung. Adaptives Denken aktiviert, `effort: "high"` |
| Standard-Replanning, Aufgabenzuschnitt, Zusammenfassungen | `claude-sonnet-5` | Sehr gutes Verhältnis von Qualität zu Kosten bei häufigen Aufrufen |
| Klassifikation, Extraktion, Tagging, Moderationsvorfilter | `claude-haiku-4-5` | Hohe Frequenz, geringe Komplexität |

Preise (Stand Konzepterstellung, Anthropic-Erstanbieter-Tarife, je 1 Mio. Token):
Opus 5 **5 $ / 25 $** · Sonnet 5 **3 $ / 15 $** · Haiku 4.5 **1 $ / 5 $**.
Die daraus abgeleitete Kostenrechnung pro Nutzer steht in
[Kapitel 11](11-geschaeftsmodell-finanzplan.md).

### Strukturierte Ausgaben

Pläne werden **nie** als Freitext geparst. Die Engine erzwingt ein JSON-Schema über
`output_config.format` (Structured Outputs) mit `additionalProperties: false`. Zusätzlich
läuft nach jeder Generierung ein deterministischer Validator (Kapitel 10), der Zyklen,
fehlende Vorbedingungen, unrealistische Zeitsummen und Datumsverletzungen erkennt. Erst
ein valider Plan wird persistiert.

### Prompt-Caching

Der System-Prompt der Planungs-Engine und der abgerufene Playbook-Kontext sind pro
Zieldomäne weitgehend stabil und werden über `cache_control` zwischengespeichert.
Volatile Anteile (Nutzerprofil, aktueller Stand, Datum) stehen konsequent **nach** dem
letzten Cache-Breakpoint. Das senkt die Eingabekosten bei wiederholten Aufrufen derselben
Domäne erheblich — die konservative Annahme im Finanzplan ist eine Cache-Trefferquote von
60 % *(Annahme)*.

### Ausfallsicherheit

- Zeitüberschreitung → Job wandert in die Warteschlange, Nutzer bekommt Push, sobald fertig
- Modellfehler → automatischer Rückfall auf ein anderes Modell derselben Klasse
- Validierung schlägt fehl → bis zu zwei Reparaturdurchläufe mit dem konkreten Fehler als
  Eingabe, danach Rückfall auf das nächstähnliche Playbook-Template
- Vollständiger Ausfall → Nutzer erhält ein generisches Domänen-Template plus Hinweis;
  die App bleibt in jedem Fall bedienbar

**Grundsatz:** Es darf keinen Zustand geben, in dem ein Nutzer ohne Plan dasteht.

---

## Datenfluss beim Erstplan

```
1. Client sendet Ziel + Interviewantworten
2. Core-API legt Goal (Status: draft) an
3. Planning-Engine:
   a) klassifiziert Domäne          → Haiku
   b) sucht ähnliche Playbooks      → pgvector, Top-5
   c) baut Prompt (gecacht + volatil)
   d) ruft Opus 5, Structured Output
   e) validiert deterministisch
   f) repariert bei Bedarf (max. 2×)
4. Plan wird persistiert (Status: proposed)
5. Client zeigt Bestätigungsscreen
6. Nutzer bestätigt → Status: active
   → Termine werden berechnet, Erinnerungen geplant, Kalender synchronisiert
7. Nutzerkorrekturen werden als plan_feedback gespeichert (Playbook-Signal)
```

Typische Gesamtlaufzeit: **6–14 Sekunden** *(Annahme, zu messen)*. Die Animation in S-04
ist auf dieses Fenster ausgelegt.

---

## Sicherheit

| Ebene | Maßnahme |
|-------|----------|
| Transport | TLS 1.3, HSTS, Certificate Pinning in den Apps |
| Ruhende Daten | Festplattenverschlüsselung; Freitextfelder (Notizen, Ziele) zusätzlich feldweise per AES-256-GCM, Schlüssel im KMS |
| Zugriff | Mandantentrennung über Row-Level-Security in Postgres; jede Abfrage trägt den Mandantenkontext |
| Secrets | Zentrale Secret-Verwaltung, keine Secrets in Repos oder Images |
| Abhängigkeiten | Automatisierte Prüfung (Dependabot, `npm audit`, SBOM je Release) |
| Prompt-Injection | Nutzereingaben werden nie als Instruktion behandelt; Systemanweisungen und Nutzerinhalte sind strikt getrennt; jede Modellausgabe wird gegen das Schema validiert, bevor sie wirkt |
| Personenbezug | Vor jedem Modellaufruf werden Namen, E-Mail-Adressen, Telefonnummern und Adressen durch Platzhalter ersetzt; nur die planungsrelevante Struktur wird übertragen |
| Protokollierung | Keine Klartext-Ziele in Logs; strukturierte Logs mit Redaktionsregeln |
| Zugriffe intern | Vier-Augen-Prinzip für Produktionszugriffe, vollständige Audit-Protokolle |

---

## Skalierung

Die Lastprofile sind gutmütig: Der teure Pfad (Planerzeugung) läuft **einmal pro Ziel**,
nicht pro Sitzung. Der häufige Pfad (Heute-Ansicht) ist eine einfache indizierte Abfrage.

| Nutzerzahl | Setup | Geschätzte Infrastrukturkosten/Monat *(Annahme)* |
|------------|-------|--------------------------------------------------|
| bis 10.000 | 2 App-Server, 1 DB, 1 Redis | ~ 250 € |
| bis 100.000 | 4 App-Server, DB mit Lesereplik, getrennter Worker-Pool | ~ 1.200 € |
| bis 1 Mio. | Autoscaling, Partitionierung nach Mandant, eigener Vektordienst | ~ 9.000 € |

Modellkosten sind dabei nicht enthalten — sie skalieren linear mit aktiven Nutzern und
sind in [Kapitel 11](11-geschaeftsmodell-finanzplan.md) separat gerechnet.

---

## Qualitätssicherung

| Ebene | Umfang |
|-------|--------|
| Unit | Geschäftslogik, Validator, Terminberechnung — Zielabdeckung > 80 % |
| Integration | API-Endpunkte gegen echte Postgres-Instanz (Testcontainers) |
| E2E | Die drei Kernflüsse (Playwright Web, Maestro Mobile) |
| **Planqualitäts-Evaluation** | Feste Sammlung von 200 Zielbeschreibungen; jeder Modell- oder Prompt-Wechsel wird automatisch dagegen bewertet (Schemavalidität, Zyklenfreiheit, Zeitrealismus, menschliche Stichprobenbewertung). **Ohne diese Suite darf kein Modellwechsel in Produktion.** |
| Last | k6 gegen Heute-Ansicht und Planerzeugung vor jedem Marketing-Peak |

## Technische Schulden, bewusst akzeptiert

1. Modularer Monolith — Aufteilung erst ab ca. 15 Entwickelnden
2. Keine mandantenfähige Datenbanktrennung in V1 — RLS reicht bis zu ersten
   Großkunden
3. Deutsch fest verdrahtet in V1 — Internationalisierungsschicht ab Monat 12
4. Kalender-Sync zunächst nur als Ein-Weg-Push, Zwei-Wege ab Monat 8
