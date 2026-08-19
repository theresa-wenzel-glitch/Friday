"""Der autonome Entwicklungsloop von JARVIS II.

Ablauf je Schritt:

    Modell antwortet -> Werkzeugaufrufe ausfuehren -> Ergebnisse zurueckgeben
                     -> Status/Journal aktualisieren -> naechster Schritt

Der Loop endet, wenn `finish` erfolgreich war, das Schrittbudget aufgebraucht ist
oder der Provider ausfaellt. In jedem Fall entsteht ein Bericht aus dem Journal.
"""

from __future__ import annotations

import traceback
from dataclasses import dataclass, field
from typing import Any, Callable

from jarvis.config import Config
from jarvis.errors import JarvisError, ProviderError
from jarvis.journal import Journal
from jarvis.prompts import SYSTEM_PROMPT, initial_message
from jarvis.providers.base import AssistantTurn, Provider
from jarvis.redact import redact
from jarvis.report import Report, build_report
from jarvis.status import Status
from jarvis.tools import ToolContext, ToolRegistry, ToolResult, default_registry
from jarvis.vcs import VersionControl
from jarvis.workspace import Workspace

#: So oft darf das Modell ohne Werkzeugaufruf und ohne finish antworten.
MAX_IDLE_TURNS = 3


@dataclass
class RunResult:
    report: Report
    status: Status
    journal_path: str
    steps: int
    stop_reason: str
    finished: bool
    verified: bool
    messages: list[dict[str, Any]] = field(default_factory=list)


class Agent:
    """Verbindet Provider, Werkzeuge, Status und Journal zu einem autonomen Lauf."""

    def __init__(
        self,
        config: Config,
        provider: Provider,
        registry: ToolRegistry | None = None,
        confirm: Callable[[str], bool] | None = None,
        on_event: Callable[[str, dict[str, Any]], None] | None = None,
    ) -> None:
        self.config = config
        self.provider = provider
        self.registry = registry or default_registry()
        self.workspace = Workspace(config.workspace)
        self.journal = Journal(config.state_dir / "journal.jsonl")
        self.status = Status()
        self.vcs = VersionControl(config.workspace)
        self.on_event = on_event or (lambda kind, data: None)
        self.ctx = ToolContext(
            config=config,
            workspace=self.workspace,
            journal=self.journal,
            status=self.status,
            vcs=self.vcs,
            confirm=confirm or (lambda _prompt: False),
        )

    # -- oeffentliche API ----------------------------------------------------
    def build(self, goal: str) -> RunResult:
        """Fuehrt einen kompletten autonomen Lauf fuer `goal` aus."""
        self.status.goal = goal
        self.journal.append("run_start", goal=goal, model=self.config.model,
                            provider=self.provider.name, workspace=str(self.config.workspace))
        if self.config.auto_commit:
            self.vcs.init()
            snapshot = self.vcs.snapshot("[start] Ausgangszustand")
            if snapshot:
                self.journal.append("snapshot", commit=snapshot.commit, message=snapshot.message)

        messages: list[dict[str, Any]] = [
            {"role": "user", "content": initial_message(goal, self.config, self.workspace.tree(limit=60))}
        ]
        steps = 0
        idle_turns = 0
        stop_reason = "max_steps"

        while steps < self.config.max_steps:
            steps += 1
            try:
                turn = self.provider.complete(
                    system=SYSTEM_PROMPT, messages=messages, tools=self.registry.schemas()
                )
            except ProviderError as exc:
                self.journal.append("provider_error", message=str(exc))
                self._emit("error", {"message": str(exc)})
                stop_reason = f"provider_error: {exc}"
                break

            self._record_turn(turn, steps)
            messages.append(turn.as_message())

            if not turn.tool_calls:
                if self.ctx.finished:
                    stop_reason = "finish"
                    break
                idle_turns += 1
                if idle_turns >= MAX_IDLE_TURNS:
                    stop_reason = "modell_ohne_werkzeugaufrufe"
                    self.journal.append("stalled", turns=idle_turns)
                    break
                messages.append({
                    "role": "user",
                    "content": (
                        "Kein Werkzeugaufruf erhalten. Arbeite weiter: naechster konkreter Schritt "
                        "mit einem Werkzeug, oder rufe finish auf, wenn die Anwendung laeuft und "
                        "getestet ist."
                    ),
                })
                continue

            idle_turns = 0
            results = [self._execute(call) for call in turn.tool_calls]
            messages.append({"role": "user", "content": results})
            self._persist_status()

            if self.ctx.finished:
                stop_reason = "finish"
                break

        self._persist_status()
        report = build_report(
            goal=goal,
            journal=self.journal,
            status=self.status,
            files=self.workspace.tree(),
            payload=self.ctx.finish_payload,
            steps=steps,
            stop_reason=stop_reason,
        )
        self.journal.append("run_end", stop_reason=stop_reason, steps=steps,
                            finished=self.status.finished, verified=self.status.verified)
        (self.config.state_dir / "report.txt").write_text(report.render(), encoding="utf-8")
        return RunResult(
            report=report,
            status=self.status,
            journal_path=str(self.journal.path),
            steps=steps,
            stop_reason=stop_reason,
            finished=self.status.finished,
            verified=self.status.verified,
            messages=messages,
        )

    # -- intern --------------------------------------------------------------
    def _record_turn(self, turn: AssistantTurn, step: int) -> None:
        if turn.text:
            self.journal.append("assistant", step=step, text=turn.text[:4000])
            self._emit("assistant", {"step": step, "text": redact(turn.text)})
        for call in turn.tool_calls:
            self._emit("tool_call", {"name": call.name, "input": call.input})

    def _execute(self, call) -> dict[str, Any]:
        """Fuehrt einen Werkzeugaufruf aus und verpackt das Ergebnis als tool_result."""
        tool = self.registry.get(call.name)
        if tool is None:
            result = ToolResult.error(
                f"Unbekanntes Werkzeug '{call.name}'. Verfuegbar: {', '.join(self.registry.names())}"
            )
        else:
            try:
                result = tool.run(self.ctx, **call.input)
            except TypeError as exc:
                result = ToolResult.error(f"Ungueltige Parameter fuer '{call.name}': {exc}")
            except JarvisError as exc:
                result = ToolResult.error(f"{type(exc).__name__}: {exc}")
            except Exception as exc:  # pragma: no cover - Schutznetz
                self.journal.append(
                    "tool_crash", tool=call.name, error=str(exc),
                    traceback=traceback.format_exc()[-2000:],
                )
                result = ToolResult.error(f"Werkzeug '{call.name}' ist abgestuerzt: {exc}")

        self.journal.append(
            "tool_result", tool=call.name, is_error=result.is_error, preview=result.content[:500]
        )
        self._emit("tool_result", {"name": call.name, "is_error": result.is_error,
                                   "preview": redact(result.content[:400])})
        return {
            "type": "tool_result",
            "tool_use_id": call.id,
            "content": redact(result.content) or "(keine Ausgabe)",
            "is_error": result.is_error,
        }

    def _persist_status(self) -> None:
        self.status.save(self.config.state_dir / "status.json")

    def _emit(self, kind: str, data: dict[str, Any]) -> None:
        try:
            self.on_event(kind, data)
        except Exception:  # pragma: no cover - Ausgabe darf den Lauf nie stoppen
            pass
