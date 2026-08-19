"""Anbindung an die Claude Messages API (offizielles Anthropic SDK)."""

from __future__ import annotations

from typing import Any

from jarvis.config import Config
from jarvis.errors import ProviderError
from jarvis.providers.base import AssistantTurn, ToolCall


class AnthropicProvider:
    """Ruft `messages.create` mit Werkzeugen und adaptivem Denken auf."""

    name = "anthropic"

    def __init__(self, config: Config) -> None:
        try:
            import anthropic  # noqa: F401
        except ImportError as exc:  # pragma: no cover - abhaengig von der Installation
            raise ProviderError(
                "Das Paket 'anthropic' fehlt. Installation: pip install 'jarvis-ii[llm]' "
                "oder JARVIS mit --offline starten."
            ) from exc

        from anthropic import Anthropic

        self._anthropic = __import__("anthropic")
        self.config = config
        # Ohne expliziten Key loest das SDK die Zugangsdaten selbst aus der Umgebung auf.
        self.client = Anthropic(api_key=config.api_key) if config.api_key else Anthropic()

    def complete(
        self, *, system: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]]
    ) -> AssistantTurn:
        try:
            response = self.client.messages.create(
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                system=system,
                messages=messages,
                tools=tools,
                thinking={"type": "adaptive"},
                output_config={"effort": self.config.effort},
            )
        except self._anthropic.AuthenticationError as exc:
            raise ProviderError(
                "Die Zugangsdaten wurden abgelehnt. Pruefe ANTHROPIC_API_KEY "
                f"(Antwort der API: {exc})."
            ) from exc
        except TypeError as exc:
            # Das SDK meldet fehlende Zugangsdaten erst beim Aufruf als TypeError.
            if "authentication" not in str(exc).lower():
                raise
            raise ProviderError(
                "Keine Zugangsdaten gefunden. Setze ANTHROPIC_API_KEY (oder melde dich mit "
                "'ant auth login' an) - alternativ laeuft 'jarvis demo' ganz ohne Modellzugang."
            ) from exc
        except self._anthropic.APIStatusError as exc:
            raise ProviderError(f"Claude API antwortete mit HTTP {exc.status_code}: {exc}") from exc
        except self._anthropic.APIConnectionError as exc:
            raise ProviderError(f"Keine Verbindung zur Claude API: {exc}") from exc

        if response.stop_reason == "refusal":
            details = getattr(response, "stop_details", None)
            raise ProviderError(
                "Das Modell hat die Anfrage abgelehnt"
                + (f" ({getattr(details, 'category', 'unbekannt')})" if details else "")
            )

        content: list[dict[str, Any]] = []
        text_parts: list[str] = []
        tool_calls: list[ToolCall] = []
        for block in response.content:
            block_dict = block.model_dump(exclude_none=True)
            content.append(block_dict)
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append(ToolCall(id=block.id, name=block.name, input=dict(block.input)))

        usage = {
            "input_tokens": getattr(response.usage, "input_tokens", 0),
            "output_tokens": getattr(response.usage, "output_tokens", 0),
        }
        return AssistantTurn(
            text="\n".join(text_parts).strip(),
            tool_calls=tool_calls,
            content=content,
            stop_reason=response.stop_reason or "end_turn",
            usage=usage,
        )
