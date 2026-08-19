"""Deterministischer Offline-Provider.

Nutzen: (1) Tests des Agentenloops ohne Netz und ohne API-Key,
(2) die Demo `jarvis demo`, die den kompletten Zyklus - inklusive echtem
Fehlschlag und echter Korrektur - real auf der Platte durchspielt.
"""

from __future__ import annotations

import itertools
from typing import Any, Callable, Sequence

from jarvis.errors import ProviderError
from jarvis.providers.base import AssistantTurn, ToolCall

Step = AssistantTurn | Callable[[list[dict[str, Any]]], AssistantTurn]


def turn(text: str = "", *calls: tuple[str, dict[str, Any]], stop: str | None = None) -> AssistantTurn:
    """Hilfsfunktion: Antwort mit Text und beliebig vielen Werkzeugaufrufen."""
    counter = next(_ids)
    tool_calls = [
        ToolCall(id=f"call_{counter}_{i}", name=name, input=payload)
        for i, (name, payload) in enumerate(calls)
    ]
    return AssistantTurn(
        text=text,
        tool_calls=tool_calls,
        stop_reason=stop or ("tool_use" if tool_calls else "end_turn"),
    )


_ids = itertools.count(1)


class ScriptedProvider:
    """Spielt eine Folge vorgegebener Antworten ab."""

    name = "scripted"

    def __init__(self, steps: Sequence[Step]) -> None:
        self.steps = list(steps)
        self.calls = 0
        self.seen_messages: list[list[dict[str, Any]]] = []

    def complete(
        self, *, system: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]]
    ) -> AssistantTurn:
        self.seen_messages.append(list(messages))
        if self.calls >= len(self.steps):
            raise ProviderError(
                f"Skript erschoepft: {len(self.steps)} Schritte definiert, "
                f"Aufruf {self.calls + 1} angefordert."
            )
        step = self.steps[self.calls]
        self.calls += 1
        return step(messages) if callable(step) else step
