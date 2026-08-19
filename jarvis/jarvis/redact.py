"""Schutz von Geheimnissen (Abschnitt 9 der Direktive).

Alles, was JARVIS in Journal, Statusausgabe oder Modellkontext schreibt,
laeuft durch `redact()`. Damit landen API-Keys weder im Log noch im Prompt.
"""

from __future__ import annotations

import os
import re
from typing import Iterable

PLACEHOLDER = "[REDACTED]"

#: Umgebungsvariablen, deren *Werte* nie ausgegeben werden duerfen.
SECRET_ENV_HINTS = ("KEY", "TOKEN", "SECRET", "PASSWORD", "PASSWD", "CREDENTIAL")

#: Muster fuer Geheimnisse, die auch ohne passende Umgebungsvariable erkennbar sind.
PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"sk-ant-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"gh[pousr]_[A-Za-z0-9]{16,}"),
    re.compile(r"AKIA[0-9A-Z]{12,}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"(?i)\b(?:api[_-]?key|auth[_-]?token|password)\b\s*[:=]\s*[\"']?([^\s\"',;]{6,})"),
)


def secret_values(environ: dict[str, str] | None = None) -> list[str]:
    """Werte aller sensibel benannten Umgebungsvariablen (laengste zuerst)."""
    env = os.environ if environ is None else environ
    found = [
        value
        for name, value in env.items()
        if value and len(value) >= 6 and any(hint in name.upper() for hint in SECRET_ENV_HINTS)
    ]
    return sorted(set(found), key=len, reverse=True)


def redact(text: str, extra: Iterable[str] = (), environ: dict[str, str] | None = None) -> str:
    """Ersetzt bekannte Geheimnisse in `text` durch einen Platzhalter."""
    if not text:
        return text
    for value in list(secret_values(environ)) + [e for e in extra if e]:
        if value in text:
            text = text.replace(value, PLACEHOLDER)
    for pattern in PATTERNS:
        if pattern.groups:
            text = pattern.sub(lambda m: m.group(0).replace(m.group(1), PLACEHOLDER), text)
        else:
            text = pattern.sub(PLACEHOLDER, text)
    return text


def clean_env(environ: dict[str, str] | None = None) -> dict[str, str]:
    """Umgebung fuer Subprozesse: sensible Variablen werden entfernt."""
    env = dict(os.environ if environ is None else environ)
    for name in list(env):
        if any(hint in name.upper() for hint in SECRET_ENV_HINTS):
            del env[name]
    return env
