"""Provider-Schnittstelle.

Der Agentenloop kennt nur diese Schnittstelle. Dadurch laesst sich derselbe Loop
mit dem echten Modell (`AnthropicProvider`) oder deterministisch im Offline-Modus
(`ScriptedProvider`) betreiben - letzteres macht den Loop testbar.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class ToolCall:
    id: str
    name: str
    input: dict[str, Any] = field(default_factory=dict)


@dataclass
class AssistantTurn:
    """Eine Antwort des Modells."""

    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    #: Inhaltsbloecke im Wire-Format - muessen unveraendert in die Historie zurueck.
    content: list[dict[str, Any]] = field(default_factory=list)
    stop_reason: str = "end_turn"
    usage: dict[str, int] = field(default_factory=dict)

    def as_message(self) -> dict[str, Any]:
        content = self.content
        if not content:
            content = []
            if self.text:
                content.append({"type": "text", "text": self.text})
            for call in self.tool_calls:
                content.append(
                    {"type": "tool_use", "id": call.id, "name": call.name, "input": call.input}
                )
        return {"role": "assistant", "content": content}


class Provider(Protocol):
    name: str

    def complete(
        self, *, system: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]]
    ) -> AssistantTurn: ...
