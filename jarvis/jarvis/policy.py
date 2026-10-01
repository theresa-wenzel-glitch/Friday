"""Kommando-Policy: was JARVIS ohne Rueckfrage ausfuehren darf.

Die Direktive verlangt (Abschnitt 8 und 9): destruktive Operationen brauchen
eine Bestaetigung, unnoetige Systemrechte werden nicht verwendet. Diese
Prueflogik ist bewusst konservativ - im Zweifel wird abgelehnt.
"""

from __future__ import annotations

import re
import shlex
from dataclasses import dataclass

#: Muster, die grundsaetzlich nie ausgefuehrt werden (auch nicht mit Bestaetigung).
FORBIDDEN: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\brm\s+(-[a-zA-Z]*\s+)*(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+/(\s|$)"),
     "rekursives Loeschen des Wurzelverzeichnisses"),
    (re.compile(r"\bmkfs(\.[a-z0-9]+)?\b"), "Formatieren eines Dateisystems"),
    (re.compile(r"\bdd\b[^\n]*\bof=/dev/"), "direktes Schreiben auf ein Blockgeraet"),
    (re.compile(r"[:\s]\(\)\s*\{\s*:\|\s*:\s*&\s*\}\s*;\s*:"), "Fork-Bombe"),
    (re.compile(r"\b(shutdown|reboot|halt|poweroff)\b"), "Herunterfahren des Systems"),
    (re.compile(r"\b(chmod|chown)\b[^\n]*\s/(\s|$)"), "Rechteaenderung am Wurzelverzeichnis"),
    (re.compile(r"\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(ba)?sh\b"), "Ausfuehren heruntergeladener Skripte"),
    (re.compile(r"\bsudo\b"), "Ausfuehrung mit erhoehten Rechten"),
    (re.compile(r"\bgit\s+push\b[^\n]*--force(-with-lease)?\b"), "erzwungenes Ueberschreiben der Historie"),
)

#: Muster, die eine ausdrueckliche Bestaetigung des Nutzers verlangen.
NEEDS_CONFIRMATION: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\brm\s+(-[a-zA-Z]+\s+)*-[a-zA-Z]*r"), "rekursives Loeschen"),
    (re.compile(r"\bgit\s+(reset\s+--hard|clean\s+-[a-zA-Z]*f|push\b)"), "destruktive oder externe Git-Operation"),
    (re.compile(r"\b(dropdb|drop\s+database|truncate\s+table)\b", re.I), "Datenbank-Loeschung"),
)

#: Kommandos, die nach aussen telefonieren. Nur mit `allow_network=True`.
NETWORK = re.compile(
    r"\b(curl|wget|ssh|scp|rsync|nc|ncat|telnet)\b"
    r"|\b(pip3?|npm|pnpm|yarn|apt|apt-get|go|cargo)\s+(install|add|get|update|upgrade)\b"
    r"|\bgit\s+(clone|fetch|pull|push)\b"
)


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str = ""
    needs_confirmation: bool = False

    @property
    def blocked(self) -> bool:
        return not self.allowed


def check_command(command: str, *, allow_network: bool = False, confirmed: bool = False) -> Decision:
    """Prueft ein Shell-Kommando gegen die Policy."""
    text = command.strip()
    if not text:
        return Decision(False, "leeres Kommando")

    for pattern, reason in FORBIDDEN:
        if pattern.search(text):
            return Decision(False, f"verboten: {reason}")

    if not allow_network and NETWORK.search(text):
        return Decision(
            False,
            "Netzwerkzugriff ist gesperrt (Start mit --allow-network oder JARVIS_ALLOW_NETWORK=1)",
        )

    for pattern, reason in NEEDS_CONFIRMATION:
        if pattern.search(text):
            if confirmed:
                return Decision(True, f"bestaetigt: {reason}", needs_confirmation=True)
            return Decision(False, f"benoetigt Bestaetigung: {reason}", needs_confirmation=True)

    return Decision(True)


def describe(command: str) -> str:
    """Kurzbeschreibung eines Kommandos fuer Journal und Statusausgabe."""
    try:
        parts = shlex.split(command)
    except ValueError:
        parts = command.split()
    return " ".join(parts[:4]) + (" ..." if len(parts) > 4 else "")
