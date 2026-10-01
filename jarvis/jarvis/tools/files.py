"""Dateiwerkzeuge. Alle Pfade laufen durch die Sandbox."""

from __future__ import annotations

from typing import Any

from jarvis.errors import SandboxViolation
from jarvis.tools.base import ToolContext, ToolResult


class ReadFile:
    name = "read_file"
    description = (
        "Liest eine Textdatei aus dem Arbeitsbereich. Optional nur einen Zeilenbereich. "
        "Nutze das Werkzeug, bevor du eine bestehende Datei aenderst."
    )
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Pfad relativ zum Arbeitsbereich"},
            "start_line": {"type": "integer", "description": "Erste Zeile (1-basiert)", "minimum": 1},
            "max_lines": {"type": "integer", "description": "Maximale Zeilenzahl", "minimum": 1},
        },
        "required": ["path"],
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, path: str, start_line: int = 1, max_lines: int = 800) -> ToolResult:
        target = ctx.workspace.resolve(path, must_exist=True)
        if target.is_dir():
            return ToolResult.error(f"'{path}' ist ein Verzeichnis - nutze list_files.")
        if target.stat().st_size > ctx.config.max_file_bytes:
            return ToolResult.error(
                f"'{path}' ist groesser als {ctx.config.max_file_bytes} Bytes und wird nicht geladen."
            )
        try:
            text = target.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return ToolResult.error(f"'{path}' ist keine UTF-8-Textdatei.")
        lines = text.splitlines()
        chunk = lines[start_line - 1: start_line - 1 + max_lines]
        numbered = "\n".join(f"{i:>5}| {line}" for i, line in enumerate(chunk, start=start_line))
        more = len(lines) > start_line - 1 + len(chunk)
        ctx.journal.append("read_file", path=ctx.workspace.relative(target), lines=len(chunk))
        suffix = f"\n... ({len(lines)} Zeilen insgesamt)" if more else ""
        return ToolResult(numbered + suffix if numbered else "(leere Datei)")


class WriteFile:
    name = "write_file"
    description = (
        "Schreibt eine Datei im Arbeitsbereich und legt fehlende Verzeichnisse an. "
        "Ersetzt vorhandenen Inhalt vollstaendig - fuer punktuelle Aenderungen replace_in_file nutzen."
    )
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "path": {"type": "string"},
            "content": {"type": "string"},
        },
        "required": ["path", "content"],
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, path: str, content: str) -> ToolResult:
        target = ctx.workspace.ensure_writable(ctx.workspace.resolve(path))
        target.parent.mkdir(parents=True, exist_ok=True)
        existed = target.exists()
        target.write_text(content, encoding="utf-8")
        rel = ctx.workspace.relative(target)
        ctx.journal.append("write_file", path=rel, bytes=len(content.encode("utf-8")), created=not existed)
        verb = "aktualisiert" if existed else "erstellt"
        return ToolResult(f"{rel} {verb} ({len(content.splitlines())} Zeilen).")


class ReplaceInFile:
    name = "replace_in_file"
    description = (
        "Ersetzt exakt einen Textabschnitt in einer Datei. Der Suchtext muss genau einmal vorkommen. "
        "Bevorzugt fuer kleine Korrekturen waehrend des Debuggings."
    )
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "path": {"type": "string"},
            "old_text": {"type": "string"},
            "new_text": {"type": "string"},
        },
        "required": ["path", "old_text", "new_text"],
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, path: str, old_text: str, new_text: str) -> ToolResult:
        target = ctx.workspace.ensure_writable(ctx.workspace.resolve(path, must_exist=True))
        text = target.read_text(encoding="utf-8")
        occurrences = text.count(old_text)
        if occurrences == 0:
            return ToolResult.error(f"Suchtext kommt in '{path}' nicht vor.")
        if occurrences > 1:
            return ToolResult.error(
                f"Suchtext kommt {occurrences}-mal in '{path}' vor - bitte eindeutiger waehlen."
            )
        target.write_text(text.replace(old_text, new_text, 1), encoding="utf-8")
        rel = ctx.workspace.relative(target)
        ctx.journal.append("replace_in_file", path=rel)
        return ToolResult(f"{rel}: eine Stelle ersetzt.")


class ListFiles:
    name = "list_files"
    description = "Listet den Inhalt eines Verzeichnisses im Arbeitsbereich auf."
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {"path": {"type": "string", "description": "Standard: Wurzel des Arbeitsbereichs"}},
        "required": [],
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, path: str = ".") -> ToolResult:
        entries = ctx.workspace.list_dir(path)
        return ToolResult("\n".join(entries) if entries else "(leeres Verzeichnis)")


class DeleteFile:
    name = "delete_file"
    description = (
        "Loescht eine Datei im Arbeitsbereich. Destruktiv - wird nur nach Bestaetigung ausgefuehrt."
    )
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "path": {"type": "string"},
            "reason": {"type": "string", "description": "Warum die Datei entfernt werden soll"},
        },
        "required": ["path", "reason"],
        "additionalProperties": False,
    }

    def run(self, ctx: ToolContext, path: str, reason: str) -> ToolResult:
        target = ctx.workspace.ensure_writable(ctx.workspace.resolve(path, must_exist=True))
        if target.is_dir():
            raise SandboxViolation("Verzeichnisse werden aus Sicherheitsgruenden nicht geloescht.")
        rel = ctx.workspace.relative(target)
        if not ctx.confirm(f"Datei '{rel}' loeschen? Grund: {reason}"):
            ctx.journal.append("delete_denied", path=rel, reason=reason)
            return ToolResult.error(f"Loeschen von '{rel}' wurde nicht bestaetigt.")
        target.unlink()
        ctx.journal.append("delete_file", path=rel, reason=reason)
        return ToolResult(f"{rel} geloescht.")
