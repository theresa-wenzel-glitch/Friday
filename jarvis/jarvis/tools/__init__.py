"""Werkzeugkasten von JARVIS II."""

from jarvis.tools.base import Tool, ToolContext, ToolRegistry, ToolResult
from jarvis.tools.control import Finish, RecordCheck, SetPhase
from jarvis.tools.files import DeleteFile, ListFiles, ReadFile, ReplaceInFile, WriteFile
from jarvis.tools.shell import RunCommand


def default_registry() -> ToolRegistry:
    """Der Standard-Werkzeugkasten eines autonomen Laufs."""
    return ToolRegistry(
        [
            ReadFile(),
            WriteFile(),
            ReplaceInFile(),
            ListFiles(),
            DeleteFile(),
            RunCommand(),
            SetPhase(),
            RecordCheck(),
            Finish(),
        ]
    )


__all__ = [
    "Tool", "ToolContext", "ToolRegistry", "ToolResult",
    "ReadFile", "WriteFile", "ReplaceInFile", "ListFiles", "DeleteFile",
    "RunCommand", "SetPhase", "RecordCheck", "Finish", "default_registry",
]
