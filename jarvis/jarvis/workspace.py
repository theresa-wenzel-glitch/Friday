"""Sandbox: Pfad-Gefaengnis rund um das Arbeitsverzeichnis.

Jeder Dateizugriff eines Werkzeugs geht durch `Workspace.resolve()`. Damit
koennen weder relative Pfade (`../../etc/passwd`), absolute Pfade noch
Symlinks aus dem Arbeitsbereich herausfuehren.
"""

from __future__ import annotations

import os
from pathlib import Path

from jarvis.errors import SandboxViolation

#: Pfade, die JARVIS auch innerhalb des Workspace nicht veraendern darf.
PROTECTED = (".git", ".jarvis")


class Workspace:
    def __init__(self, root: str | os.PathLike[str], create: bool = True) -> None:
        self.root = Path(root).expanduser()
        if create:
            self.root.mkdir(parents=True, exist_ok=True)
        self.root = self.root.resolve()

    # -- Pfade ---------------------------------------------------------------
    def resolve(self, relative: str | os.PathLike[str], *, must_exist: bool = False) -> Path:
        """Loest `relative` gegen die Sandbox-Wurzel auf und prueft die Grenzen."""
        raw = Path(relative)
        if raw.is_absolute():
            candidate = raw
        else:
            candidate = self.root / raw

        # Symlinks aufloesen, soweit vorhanden; nicht existierende Endstuecke
        # werden an den aufgeloesten existierenden Teil angehaengt.
        resolved = self._resolve_existing(candidate)
        try:
            resolved.relative_to(self.root)
        except ValueError:
            raise SandboxViolation(
                f"Pfad '{relative}' liegt ausserhalb des Arbeitsbereichs {self.root}"
            ) from None
        if must_exist and not resolved.exists():
            raise SandboxViolation(f"Pfad '{relative}' existiert nicht")
        return resolved

    @staticmethod
    def _resolve_existing(candidate: Path) -> Path:
        existing = candidate
        tail: list[str] = []
        while not existing.exists():
            if existing.parent == existing:
                break
            tail.append(existing.name)
            existing = existing.parent
        base = existing.resolve()
        for part in reversed(tail):
            base = base / part
        # Der aufgeloeste Teil enthaelt keine Symlinks mehr, der Rest existiert nicht -
        # daher darf '..' hier rein lexikalisch normalisiert werden. Ohne diesen Schritt
        # wuerde 'sub/../../draussen.txt' die Grenzpruefung unterlaufen.
        return Path(os.path.normpath(base))

    def relative(self, path: Path) -> str:
        try:
            return str(path.resolve().relative_to(self.root))
        except ValueError:
            return str(path)

    def is_protected(self, path: Path) -> bool:
        rel = self.relative(path)
        parts = Path(rel).parts
        return bool(parts) and parts[0] in PROTECTED

    def ensure_writable(self, path: Path) -> Path:
        if self.is_protected(path):
            raise SandboxViolation(
                f"'{self.relative(path)}' gehoert zur JARVIS-Infrastruktur und ist schreibgeschuetzt"
            )
        return path

    # -- Inhalte -------------------------------------------------------------
    def list_dir(self, relative: str = ".", *, limit: int = 400) -> list[str]:
        target = self.resolve(relative, must_exist=True)
        if not target.is_dir():
            raise SandboxViolation(f"'{relative}' ist kein Verzeichnis")
        entries = []
        for item in sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name)):
            suffix = "/" if item.is_dir() else ""
            entries.append(f"{self.relative(item)}{suffix}")
            if len(entries) >= limit:
                entries.append("... (gekuerzt)")
                break
        return entries

    def tree(self, *, limit: int = 300) -> list[str]:
        """Flache Dateiliste des Projekts, ohne interne Verzeichnisse."""
        out: list[str] = []
        for path in sorted(self.root.rglob("*")):
            rel = self.relative(path)
            if any(rel == p or rel.startswith(p + os.sep) for p in PROTECTED):
                continue
            if "__pycache__" in Path(rel).parts or "node_modules" in Path(rel).parts:
                continue
            out.append(rel + ("/" if path.is_dir() else ""))
            if len(out) >= limit:
                out.append("... (gekuerzt)")
                break
        return out
