"""Steuerwerkzeuge: Phasenwechsel, Pruefprotokoll und Abschluss.

`finish` ist die Ehrlichkeitsschranke aus Abschnitt 13/14: Ein Projekt darf nur
dann als fertig gemeldet werden, wenn im Journal ein erfolgreich ausgefuehrtes
Test- oder Startkommando steht. Fehlt dieser Nachweis, muss das Modell den Grund
ausdruecklich benennen - der Bericht wird dann als 'nicht verifiziert' markiert.
"""

from __future__ import annotations

from typing import Any

from jarvis.status import Phase
from jarvis.tools.base import ToolContext, ToolResult


class SetPhase:
    name = "set_phase"
    description = (
        "Wechselt die Projektphase (understand, plan, build, run, debug, test, optimize, finalize) "
        "und macht den Fortschritt fuer den Nutzer sichtbar."
    )
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "phase": {"type": "string", "enum": [p.value for p in Phase]},
            "note": {"type": "string", "description": "Kurze Beschreibung des aktuellen Schritts"},
        },
        "required": ["phase"],
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, phase: str, note: str = "") -> ToolResult:
        try:
            target = Phase(phase)
        except ValueError:
            return ToolResult.error(
                f"Unbekannte Phase '{phase}'. Erlaubt: {', '.join(p.value for p in Phase)}"
            )
        ctx.status.enter(target, note)
        ctx.journal.append("phase", phase=target.value, note=note)
        if ctx.config.auto_commit:
            snapshot = ctx.vcs.snapshot(f"[{target.value}] {note or 'Zwischenstand'}")
            if snapshot:
                ctx.journal.append("snapshot", commit=snapshot.commit, message=snapshot.message)
        return ToolResult(f"Phase: {target.value}" + (f" - {note}" if note else ""))


class RecordCheck:
    name = "record_check"
    description = (
        "Haelt das Ergebnis einer Pruefung fest (z. B. 'Tests gruen', 'Server startet'). "
        "Nur eintragen, was tatsaechlich beobachtet wurde."
    )
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "passed": {"type": "boolean"},
            "evidence": {"type": "string", "description": "Womit wurde das geprueft?"},
        },
        "required": ["name", "passed"],
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, name: str, passed: bool, evidence: str = "") -> ToolResult:
        ctx.status.check(name, passed)
        ctx.journal.append("check", name=name, passed=passed, evidence=evidence)
        return ToolResult(f"Pruefung notiert: {name} = {'bestanden' if passed else 'nicht bestanden'}")


class Finish:
    name = "finish"
    description = (
        "Schliesst den Lauf ab. Erst aufrufen, wenn die Anwendung wirklich ausgefuehrt und getestet "
        "wurde. Ohne erfolgreichen Test-/Startnachweis wird der Aufruf abgelehnt; ist eine Ausfuehrung "
        "in dieser Umgebung unmoeglich, muss 'unverified_reason' den Grund nennen."
    )
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "summary": {"type": "string", "description": "Was wurde gebaut?"},
            "how_to_run": {"type": "string", "description": "Startanleitung fuer den Nutzer"},
            "tests": {"type": "string", "description": "Welche Tests liefen mit welchem Ergebnis?"},
            "known_limitations": {"type": "string", "description": "Bekannte Einschraenkungen"},
            "unverified_reason": {
                "type": "string",
                "description": "Nur ausfuellen, wenn keine Ausfuehrung moeglich war - mit Begruendung",
            },
        },
        "required": ["summary", "how_to_run"],
        "additionalProperties": False,
    }

    def run(
        self,
        ctx: ToolContext,
        summary: str,
        how_to_run: str,
        tests: str = "",
        known_limitations: str = "",
        unverified_reason: str = "",
    ) -> ToolResult:
        evidence = ctx.journal.verification_evidence()
        if not evidence and not unverified_reason:
            ctx.finish_attempts += 1
            ctx.journal.append("finish_rejected", attempt=ctx.finish_attempts, summary=summary)
            return ToolResult.error(
                "Abschluss abgelehnt: Es gibt keinen erfolgreichen Ausfuehrungsnachweis. "
                "Fuehre die Anwendung oder die Tests mit run_command (purpose='test' oder 'run') aus. "
                "Ist das in dieser Umgebung unmoeglich, rufe finish erneut mit 'unverified_reason' auf."
            )

        verified = bool(evidence)
        # Die zuletzt aktive Phase gilt mit dem Abschluss als erledigt.
        ctx.status.complete(ctx.status.current)
        ctx.status.finished = True
        ctx.status.verified = verified
        ctx.finished = True
        ctx.finish_payload = {
            "summary": summary,
            "how_to_run": how_to_run,
            "tests": tests,
            "known_limitations": known_limitations,
            "unverified_reason": unverified_reason,
            "verified": verified,
            "evidence": [e.data.get("summary", "") for e in evidence],
        }
        ctx.journal.append("finish", verified=verified, summary=summary,
                           unverified_reason=unverified_reason)
        if ctx.config.auto_commit:
            snapshot = ctx.vcs.snapshot("[finalize] Abschluss")
            if snapshot:
                ctx.journal.append("snapshot", commit=snapshot.commit, message=snapshot.message)
        state = "verifiziert" if verified else "ohne Ausfuehrungsnachweis"
        return ToolResult(f"Lauf abgeschlossen ({state}).")
