"""Konfiguration von JARVIS II."""

from __future__ import annotations

import os
from dataclasses import dataclass, field, replace
from pathlib import Path

#: Standardmodell. Bewusst als Konstante, damit ein Wechsel an genau einer Stelle passiert.
DEFAULT_MODEL = "claude-opus-5"
DEFAULT_EFFORT = "xhigh"


def _int_env(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


@dataclass(frozen=True)
class Config:
    """Alle Stellschrauben eines JARVIS-Laufs.

    `workspace` ist gleichzeitig das Sandbox-Gefaengnis: kein Werkzeug darf
    ausserhalb dieses Verzeichnisses lesen, schreiben oder Kommandos starten.
    """

    workspace: Path
    model: str = DEFAULT_MODEL
    effort: str = DEFAULT_EFFORT
    offline: bool = False
    max_steps: int = 60
    max_tokens: int = 16000
    command_timeout: int = 300
    max_output_chars: int = 20_000
    max_file_bytes: int = 1_000_000
    allow_network: bool = False
    auto_commit: bool = True
    api_key: str | None = None
    extra_env: dict[str, str] = field(default_factory=dict)

    @classmethod
    def from_env(cls, workspace: str | os.PathLike[str], **overrides: object) -> "Config":
        cfg = cls(
            workspace=Path(workspace).expanduser().resolve(),
            model=os.environ.get("JARVIS_MODEL", DEFAULT_MODEL),
            effort=os.environ.get("JARVIS_EFFORT", DEFAULT_EFFORT),
            max_steps=_int_env("JARVIS_MAX_STEPS", 60),
            command_timeout=_int_env("JARVIS_COMMAND_TIMEOUT", 300),
            allow_network=os.environ.get("JARVIS_ALLOW_NETWORK", "") == "1",
            api_key=os.environ.get("ANTHROPIC_API_KEY") or None,
        )
        return replace(cfg, **overrides) if overrides else cfg

    @property
    def state_dir(self) -> Path:
        """Verzeichnis fuer Journal und Status (`<workspace>/.jarvis`)."""
        return self.workspace / ".jarvis"

    def with_(self, **overrides: object) -> "Config":
        return replace(self, **overrides)
