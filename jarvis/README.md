# JARVIS II. — autonomer KI-Software-Engineer

JARVIS II. schreibt nicht nur Code, sondern **baut die Lösung**: Er legt Dateien an,
führt Kommandos wirklich aus, liest echte Fehlermeldungen, korrigiert den Code,
lässt Tests laufen und meldet erst dann „fertig“, wenn ein Ausführungsnachweis
im Journal steht.

Kern des Projekts ist ein autonomer Entwicklungsloop mit Werkzeugen (Dateien,
Shell, Phasen, Prüfprotokoll, Abschluss), einer Sandbox um den Arbeitsbereich,
einem lückenlosen Ereignisjournal, Git-Snapshots für Rollbacks — und einer
Ehrlichkeitsschranke, die „ist getestet“ von „ist geschrieben“ trennt.

```
Auftrag ─► understand ─► plan ─► build ─► run ─► debug ─┐
                                          ▲             │  Fehler?
                                          └─────────────┘
                       ─► test ─► optimize ─► finalize ─► finish (nur mit Nachweis)
```

## Schnellstart

```bash
cd jarvis
pip install -e ".[llm,dev]"        # oder: pip install anthropic pytest

jarvis doctor                      # Umgebung prüfen
jarvis demo -w /tmp/demo           # kompletter Zyklus OHNE API-Key (deterministisch)
export ANTHROPIC_API_KEY=sk-ant-…
jarvis build "Baue ein CLI-Tool, das CSV-Dateien zusammenfasst" -w projekte/csvtool
```

Ohne Installation: `PYTHONPATH=. python3 -m jarvis …`

## Befehle

| Befehl | Zweck |
|---|---|
| `jarvis build "<Idee>" -w <Ordner>` | Autonomer Lauf: verstehen → planen → bauen → ausführen → debuggen → testen → dokumentieren |
| `jarvis demo -w <Ordner>` | Offline-Demo des kompletten Zyklus, ohne Modellzugang |
| `jarvis status -w <Ordner>` | Statustafel des letzten Laufs |
| `jarvis report -w <Ordner>` | Abschlussbericht |
| `jarvis journal -w <Ordner> [--kind command] [--json]` | Ereignisjournal |
| `jarvis snapshots -w <Ordner>` | Git-Snapshots des Arbeitsbereichs |
| `jarvis rollback -w <Ordner> <commit>` | Arbeitsbereich auf einen Snapshot zurücksetzen |
| `jarvis doctor -w <Ordner>` | Voraussetzungen prüfen |

Wichtige Optionen von `build`: `--model` (Standard `claude-opus-5`), `--effort`
(`low`…`max`, Standard `xhigh`), `--max-steps`, `--timeout` (Sekunden je Kommando),
`--allow-network`, `-y` (Rückfragen automatisch bestätigen), `-v` (alle Werkzeugausgaben).

Exit-Codes von `build`: `0` = fertig **und** verifiziert, `1` = fertig ohne
Ausführungsnachweis, `3` = Lauf unvollständig abgebrochen, `2` = Startfehler.

## Statusausgabe

```
[x] Anforderungen analysiert  - CLI, stdlib-only, Top-N Worthaeufigkeiten
[x] Architektur und Plan erstellt
[x] Projekt implementiert
[x] Anwendung ausgefuehrt  - Erster Testlauf
[x] Fehler behoben  - Zaehlung normalisiert Gross-/Kleinschreibung nicht
[x] Tests ausgefuehrt
[ ] Optimierungen umgesetzt
[x] Dokumentation erstellt

Pruefungen:
[x] Unittests gruen (6 Tests)

Zustand: fertig und verifiziert
```

## Ehrlichkeitsschranke

`finish` prüft das Journal, nicht die Behauptung des Modells:

* Es gibt ein erfolgreiches Kommando mit `purpose="test" | "run" | "build"` →
  Bericht: *„Die Anwendung wurde ausgeführt und die vorgesehenen Tests wurden
  erfolgreich abgeschlossen.“*
* Kein solcher Nachweis → der Abschluss wird **abgelehnt**, das Modell muss weiter
  arbeiten. Ist eine Ausführung nachweislich unmöglich, kann es mit
  `unverified_reason` abschließen; der Bericht sagt dann ausdrücklich, dass die
  Funktionsfähigkeit **nicht** bestätigt ist.

## Sicherheit

* **Sandbox:** Jeder Dateizugriff läuft durch `Workspace.resolve()`. Relative
  Ausbrüche (`../..`), absolute Pfade und Symlinks nach draußen werden abgewiesen;
  `.git/` und `.jarvis/` sind schreibgeschützt.
* **Kommando-Policy:** `rm -rf /`, `mkfs`, `dd of=/dev/…`, `sudo`, `shutdown`,
  `curl … | sh`, `git push --force` sind gesperrt. Destruktive Operationen
  (`rm -r`, `git reset --hard`, `git push`, Datenbank-Drops) brauchen eine
  Bestätigung. Netzwerkzugriff ist standardmäßig aus (`--allow-network`).
* **Geheimnisse:** Sensible Umgebungsvariablen werden aus Subprozessen entfernt;
  Journal, Statusausgabe und Modellkontext laufen durch eine Redaction-Schicht.
* **Nachvollziehbarkeit:** Jeder Schritt landet in `.jarvis/journal.jsonl`; nach
  jedem Phasenwechsel entsteht ein Git-Snapshot im Arbeitsbereich (Rollback
  jederzeit möglich).

## Architektur

```
jarvis/
├── agent.py              Autonomer Loop (Modell ↔ Werkzeuge ↔ Journal)
├── prompts.py            Systemprompt (Direktive) und Startnachricht
├── config.py             Konfiguration, Modellwahl, Budgets
├── workspace.py          Sandbox / Pfad-Gefängnis
├── policy.py             Kommando-Policy (verboten / bestätigungspflichtig)
├── redact.py             Schutz von Schlüsseln und Passwörtern
├── journal.py            Append-only Ereignisjournal (JSONL)
├── status.py             Phasenmodell und Statustafel
├── vcs.py                Git-Snapshots und Rollback
├── report.py             Abschlussbericht aus belegten Daten
├── cli.py                Kommandozeile
├── demo_script.py        Offline-Demo (echte Dateien, echte Testläufe)
├── tools/                read_file, write_file, replace_in_file, list_files,
│                         delete_file, run_command, set_phase, record_check, finish
└── providers/            Claude Messages API + deterministischer Offline-Provider
```

Der Loop kennt nur die Provider-Schnittstelle. Dadurch läuft derselbe Code
gegen das echte Modell **und** deterministisch in Tests — die Werkzeugebene
darunter ist in beiden Fällen real.

**Modellaufruf:** offizielles `anthropic`-SDK, `messages.create` mit Werkzeugen,
`thinking={"type": "adaptive"}` und `output_config={"effort": …}`.

## Tests

```bash
python3 -m pytest -q          # 82 Tests
```

Abgedeckt: Sandbox-Ausbrüche, Kommando-Policy, Redaction, alle Werkzeuge,
Journal/Status/Snapshots, der Agentenloop (Debug-Zyklus, unbekannte Werkzeuge,
ungültige Parameter, Schrittbudget, Providerausfall, Abschlussschranke), der
API-Provider mit Stub-Client sowie ein Ende-zu-Ende-Test: die Demo baut ein
Programm, dessen erster Testlauf **wirklich** rot ist, korrigiert es und liefert
ein Programm, das anschließend außerhalb des Agenten ausgeführt wird.

## Bekannte Einschränkungen

* Der Sandbox-Schutz ist eine Anwendungs-Sandbox (Pfad- und Kommandoprüfung),
  keine Kernel-Isolierung. Für nicht vertrauenswürdige Aufträge zusätzlich in
  Container/VM ausführen.
* `run_command` ist synchron; dauerhaft blockierende Server müssen als
  Selbsttest gestartet werden (Hintergrundstart → Anfrage → Stopp in einem
  Kommando). Es gibt noch keinen Prozessmanager für Langläufer.
* Ohne `--allow-network` können keine Pakete installiert werden — geplant wird
  dann bewusst mit der Standardbibliothek.
* Browser-basierte UI-Prüfungen (Klicks, Navigation) sind nicht enthalten;
  geprüft wird über Kommandos und Tests.
* Der Kontext wird nicht komprimiert; sehr lange Läufe begrenzt `--max-steps`.
