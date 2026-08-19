"""Statussystem (Abschnitt 12) und Phasenmodell (Abschnitt 2).

Der Status ist die fuer Menschen lesbare Projektion des Journals:

    [x] Anforderungen analysiert
    [~] Backend implementiert
    [ ] Funktionstest bestanden
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path


class Phase(str, Enum):
    UNDERSTAND = "understand"
    PLAN = "plan"
    BUILD = "build"
    RUN = "run"
    DEBUG = "debug"
    TEST = "test"
    OPTIMIZE = "optimize"
    FINALIZE = "finalize"


PHASE_ORDER: tuple[Phase, ...] = tuple(Phase)

PHASE_LABELS: dict[Phase, str] = {
    Phase.UNDERSTAND: "Anforderungen analysiert",
    Phase.PLAN: "Architektur und Plan erstellt",
    Phase.BUILD: "Projekt implementiert",
    Phase.RUN: "Anwendung ausgefuehrt",
    Phase.DEBUG: "Fehler behoben",
    Phase.TEST: "Tests ausgefuehrt",
    Phase.OPTIMIZE: "Optimierungen umgesetzt",
    Phase.FINALIZE: "Dokumentation erstellt",
}

MARKS = {"pending": " ", "active": "~", "done": "x", "failed": "!", "skipped": "-"}


@dataclass
class PhaseState:
    state: str = "pending"
    note: str = ""


@dataclass
class Status:
    """Zustand eines Laufs; wird nach jeder Aenderung nach `status.json` geschrieben."""

    goal: str = ""
    current: Phase = Phase.UNDERSTAND
    phases: dict[str, PhaseState] = field(default_factory=dict)
    checks: dict[str, bool] = field(default_factory=dict)
    finished: bool = False
    verified: bool = False

    def __post_init__(self) -> None:
        for phase in PHASE_ORDER:
            self.phases.setdefault(phase.value, PhaseState())
        if isinstance(self.current, str):
            self.current = Phase(self.current)

    # -- Mutationen ----------------------------------------------------------
    def enter(self, phase: Phase, note: str = "") -> None:
        """Wechselt in eine Phase; vorherige aktive Phasen gelten als erledigt."""
        for earlier in PHASE_ORDER:
            if earlier is phase:
                break
            state = self.phases[earlier.value]
            if state.state == "active":
                state.state = "done"
        self.current = phase
        current = self.phases[phase.value]
        if current.state in ("pending", "active"):
            current.state = "active"
        if note:
            current.note = note

    def complete(self, phase: Phase, note: str = "") -> None:
        state = self.phases[phase.value]
        state.state = "done"
        if note:
            state.note = note

    def fail(self, phase: Phase, note: str = "") -> None:
        state = self.phases[phase.value]
        state.state = "failed"
        if note:
            state.note = note

    def check(self, name: str, passed: bool) -> None:
        self.checks[name] = passed

    # -- Darstellung ---------------------------------------------------------
    def render(self) -> str:
        lines: list[str] = []
        if self.goal:
            lines.append(f"Ziel: {self.goal}")
            lines.append("")
        for phase in PHASE_ORDER:
            state = self.phases[phase.value]
            mark = MARKS.get(state.state, " ")
            suffix = f"  - {state.note}" if state.note else ""
            lines.append(f"[{mark}] {PHASE_LABELS[phase]}{suffix}")
        if self.checks:
            lines.append("")
            lines.append("Pruefungen:")
            for name, passed in self.checks.items():
                lines.append(f"[{'x' if passed else '!'}] {name}")
        lines.append("")
        lines.append(
            "Zustand: " + (
                "fertig und verifiziert" if self.finished and self.verified
                else "fertig, aber ohne Ausfuehrungsnachweis" if self.finished
                else f"laufend ({PHASE_LABELS[self.current]})"
            )
        )
        return "\n".join(lines)

    # -- Persistenz ----------------------------------------------------------
    def to_dict(self) -> dict:
        data = asdict(self)
        data["current"] = self.current.value
        return data

    def save(self, path: str | Path) -> None:
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(self.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: str | Path) -> "Status":
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        phases = {k: PhaseState(**v) for k, v in raw.get("phases", {}).items()}
        return cls(
            goal=raw.get("goal", ""),
            current=Phase(raw.get("current", Phase.UNDERSTAND.value)),
            phases=phases,
            checks=raw.get("checks", {}),
            finished=raw.get("finished", False),
            verified=raw.get("verified", False),
        )
