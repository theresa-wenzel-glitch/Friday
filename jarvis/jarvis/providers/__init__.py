"""Provider von JARVIS II."""

from jarvis.providers.base import AssistantTurn, Provider, ToolCall
from jarvis.providers.scripted import ScriptedProvider, turn


def build_provider(config) -> Provider:
    """Waehlt den Provider anhand der Konfiguration."""
    from jarvis.errors import ProviderError

    if config.offline:
        raise ProviderError(
            "Im Offline-Modus muss ein Provider explizit uebergeben werden (z. B. ScriptedProvider)."
        )
    from jarvis.providers.anthropic_provider import AnthropicProvider

    return AnthropicProvider(config)


__all__ = ["AssistantTurn", "Provider", "ToolCall", "ScriptedProvider", "turn", "build_provider"]
