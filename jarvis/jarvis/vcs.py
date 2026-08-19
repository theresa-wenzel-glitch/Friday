"""Versionskontrolle im Arbeitsbereich (Abschnitt 8 und 9).

JARVIS legt im Workspace ein eigenes Git-Repository an und sichert nach jedem
Arbeitsschritt einen Snapshot. Damit ist jede Aenderung nachvollziehbar und ein
Rollback moeglich, ohne dass Dateien ausserhalb der Sandbox beruehrt werden.
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

GIT_ENV = {
    "GIT_AUTHOR_NAME": "JARVIS II",
    "GIT_AUTHOR_EMAIL": "jarvis@localhost",
    "GIT_COMMITTER_NAME": "JARVIS II",
    "GIT_COMMITTER_EMAIL": "jarvis@localhost",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
}


@dataclass(frozen=True)
class Snapshot:
    commit: str
    message: str


class VersionControl:
    """Duenner Git-Wrapper. Ohne installiertes Git bleibt alles ein No-Op."""

    def __init__(self, root: str | Path) -> None:
        self.root = Path(root)
        self.available = shutil.which("git") is not None

    def _run(self, *args: str, check: bool = False) -> subprocess.CompletedProcess[str]:
        import os

        env = {**os.environ, **GIT_ENV}
        return subprocess.run(
            ["git", *args], cwd=self.root, env=env, capture_output=True, text=True,
            check=check, timeout=60,
        )

    def init(self) -> bool:
        if not self.available:
            return False
        if (self.root / ".git").exists():
            return True
        result = self._run("init", "-q", "-b", "main")
        if result.returncode != 0:
            return False
        gitignore = self.root / ".gitignore"
        if not gitignore.exists():
            gitignore.write_text(".jarvis/\n__pycache__/\nnode_modules/\n", encoding="utf-8")
        return True

    def snapshot(self, message: str) -> Snapshot | None:
        """Commitet den aktuellen Stand. `None`, wenn es nichts zu sichern gibt."""
        if not self.available or not (self.root / ".git").exists():
            return None
        self._run("add", "-A")
        status = self._run("status", "--porcelain")
        staged = self._run("diff", "--cached", "--name-only")
        if not status.stdout.strip() and not staged.stdout.strip():
            return None
        result = self._run("commit", "-q", "-m", message)
        if result.returncode != 0:
            return None
        head = self._run("rev-parse", "--short", "HEAD")
        return Snapshot(commit=head.stdout.strip(), message=message)

    def log(self, limit: int = 20) -> list[Snapshot]:
        if not self.available or not (self.root / ".git").exists():
            return []
        result = self._run("log", f"-{limit}", "--pretty=format:%h%x1f%s")
        entries = []
        for line in result.stdout.splitlines():
            if "\x1f" in line:
                commit, message = line.split("\x1f", 1)
                entries.append(Snapshot(commit=commit, message=message))
        return entries

    def rollback(self, commit: str) -> bool:
        """Setzt den Arbeitsbereich hart auf einen Snapshot zurueck."""
        if not self.available or not (self.root / ".git").exists():
            return False
        return self._run("reset", "--hard", commit).returncode == 0
