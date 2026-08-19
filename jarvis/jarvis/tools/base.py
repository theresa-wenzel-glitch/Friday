"""Werkzeug-Grundlagen: Kontext, Ergebnis und Registry."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Protocol

from jarvis.config import Config
from jarvis.journal import Journal
from jarvis.status import Status
from jarvis.vcs import VersionControl
from jarvis.workspace import Workspace


@dataclass
class ToolContext:
    """Alles, was ein Werkzeug zur Ausfuehrung braucht."""

    config: Config
    workspace: Workspace
    journal: Journal
    status: Status
    vcs: VersionControl
    #: Rueckfrage bei destruktiven Operationen. Standard: ablehnen.
    confirm: Callable[[str], bool] = field(default=lambda _prompt: False)
    #: Von `finish` gesetzt, sobald der Lauf abgeschlossen ist.
    finished: bool = False
    finish_payload: dict[str, Any] = field(default_factory=dict)
    #: Zaehlt abgelehnte `finish`-Versuche ohne Ausfuehrungsnachweis.
    finish_attempts: int = 0


@dataclass
class ToolResult:
    content: str
    is_error: bool = False

    @classmethod
    def error(cls, message: str) -> "ToolResult":
        return cls(content=message, is_error=True)


class Tool(Protocol):
    name: str
    description: str
    input_schema: dict[str, Any]

    def run(self, ctx: ToolContext, **kwargs: Any) -> ToolResult: ...


class ToolRegistry:
    def __init__(self, tools: list[Tool] | None = None) -> None:
        self._tools: dict[str, Tool] = {}
        for tool in tools or []:
            self.add(tool)

    def add(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def names(self) -> list[str]:
        return sorted(self._tools)

    def schemas(self) -> list[dict[str, Any]]:
        """Werkzeugdefinitionen im Format der Messages API."""
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.input_schema,
            }
            for tool in (self._tools[name] for name in self.names())
        ]
