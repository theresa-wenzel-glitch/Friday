"""Abschlussbericht - erzeugt ausschliesslich aus belegten Journaldaten."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from jarvis.journal import Journal
from jarvis.status import Status


@dataclass
class Report:
    goal: str
    finished: bool
    verified: bool
    summary: str = ""
    how_to_run: str = ""
    tests: str = ""
    known_limitations: str = ""
    unverified_reason: str = ""
    files: list[str] = field(default_factory=list)
    commands: list[dict[str, Any]] = field(default_factory=list)
    checks: dict[str, bool] = field(default_factory=dict)
    snapshots: list[str] = field(default_factory=list)
    steps: int = 0
    stop_reason: str = ""

    @property
    def honesty_statement(self) -> str:
        """Die Formulierung aus Abschnitt 14 der Direktive."""
        if self.verified:
            return (
                "Die Anwendung wurde in dieser Umgebung ausgefuehrt und die vorgesehenen Tests "
                "wurden erfolgreich abgeschlossen."
            )
        if self.finished:
            reason = self.unverified_reason or "Es liegt kein erfolgreicher Ausfuehrungsnachweis vor."
            return (
                "Der Code wurde erstellt, konnte hier aber nicht erfolgreich ausgefuehrt werden. "
                f"Die Funktionsfaehigkeit ist damit nicht bestaetigt. Grund: {reason}"
            )
        return (
            "Der Lauf wurde beendet, bevor das Projekt abgeschlossen war. Der aktuelle Stand ist "
            "unvollstaendig und nicht verifiziert."
        )

    def render(self) -> str:
        lines = [f"Auftrag: {self.goal}", ""]
        if self.summary:
            lines += ["Ergebnis:", self.summary, ""]
        lines.append(f"Schritte: {self.steps}   Abbruchgrund: {self.stop_reason or 'finish'}")
        lines.append("")

        lines.append(f"Dateien im Projekt ({len(self.files)}):")
        lines += [f"  {name}" for name in self.files[:40]] or ["  (keine)"]
        if len(self.files) > 40:
            lines.append(f"  ... {len(self.files) - 40} weitere")
        lines.append("")

        lines.append(f"Ausgefuehrte Kommandos ({len(self.commands)}):")
        if not self.commands:
            lines.append("  (keine)")
        for cmd in self.commands[-15:]:
            mark = "ok " if cmd.get("exit_code") == 0 else "FEHL"
            lines.append(f"  [{mark}] ({cmd.get('purpose', '?')}) {cmd.get('summary', '')}")
        lines.append("")

        if self.checks:
            lines.append("Pruefungen:")
            for name, passed in self.checks.items():
                lines.append(f"  [{'x' if passed else '!'}] {name}")
            lines.append("")

        if self.how_to_run:
            lines += ["Start:", self.how_to_run, ""]
        if self.tests:
            lines += ["Tests:", self.tests, ""]
        if self.known_limitations:
            lines += ["Bekannte Einschraenkungen:", self.known_limitations, ""]
        if self.snapshots:
            lines += [f"Snapshots: {len(self.snapshots)} (Rollback via 'jarvis rollback')", ""]

        lines += ["Ehrlichkeitshinweis:", self.honesty_statement]
        return "\n".join(lines)


def build_report(
    *,
    goal: str,
    journal: Journal,
    status: Status,
    files: list[str],
    payload: dict[str, Any] | None,
    steps: int,
    stop_reason: str,
) -> Report:
    payload = payload or {}
    commands = [
        {
            "summary": e.data.get("summary", ""),
            "purpose": e.data.get("purpose", ""),
            "exit_code": e.data.get("exit_code"),
        }
        for e in journal.events("command")
    ]
    return Report(
        goal=goal,
        finished=status.finished,
        verified=status.verified,
        summary=payload.get("summary", ""),
        how_to_run=payload.get("how_to_run", ""),
        tests=payload.get("tests", ""),
        known_limitations=payload.get("known_limitations", ""),
        unverified_reason=payload.get("unverified_reason", ""),
        files=[f for f in files if not f.endswith("/")],
        commands=commands,
        checks=dict(status.checks),
        snapshots=[e.data.get("commit", "") for e in journal.events("snapshot")],
        steps=steps,
        stop_reason=stop_reason,
    )
