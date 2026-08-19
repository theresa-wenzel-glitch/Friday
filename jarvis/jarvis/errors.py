"""Fehlerklassen von JARVIS II."""


class JarvisError(Exception):
    """Basisklasse fuer alle JARVIS-Fehler."""


class SandboxViolation(JarvisError):
    """Ein Zugriff verliess den erlaubten Arbeitsbereich."""


class PolicyViolation(JarvisError):
    """Ein Kommando wurde von der Sicherheits-Policy abgelehnt."""


class ToolError(JarvisError):
    """Ein Werkzeug konnte die Anfrage nicht ausfuehren.

    Wird im Agentenloop in ein `tool_result` mit `is_error=True` uebersetzt,
    damit das Modell den Fehler sieht und selbst korrigieren kann.
    """


class ProviderError(JarvisError):
    """Der LLM-Provider ist nicht verfuegbar oder antwortet fehlerhaft."""
