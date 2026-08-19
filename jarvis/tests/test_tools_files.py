"""Dateiwerkzeuge."""

from __future__ import annotations

import pytest

from jarvis.errors import SandboxViolation
from jarvis.tools import DeleteFile, ListFiles, ReadFile, ReplaceInFile, WriteFile


def test_write_then_read_roundtrip(ctx):
    WriteFile().run(ctx, path="src/app.py", content="print('hallo')\n")
    assert (ctx.workspace.root / "src" / "app.py").read_text() == "print('hallo')\n"
    result = ReadFile().run(ctx, path="src/app.py")
    assert "print('hallo')" in result.content
    assert not result.is_error


def test_write_reports_creation_and_update(ctx):
    first = WriteFile().run(ctx, path="a.txt", content="x")
    second = WriteFile().run(ctx, path="a.txt", content="y")
    assert "erstellt" in first.content
    assert "aktualisiert" in second.content


def test_write_outside_workspace_is_blocked(ctx):
    with pytest.raises(SandboxViolation):
        WriteFile().run(ctx, path="../boese.txt", content="x")


def test_write_to_internal_directory_is_blocked(ctx):
    with pytest.raises(SandboxViolation):
        WriteFile().run(ctx, path=".jarvis/journal.jsonl", content="x")


def test_read_missing_file_raises(ctx):
    with pytest.raises(SandboxViolation):
        ReadFile().run(ctx, path="fehlt.txt")


def test_read_directory_returns_error(ctx):
    (ctx.workspace.root / "sub").mkdir()
    assert ReadFile().run(ctx, path="sub").is_error


def test_read_line_window(ctx):
    WriteFile().run(ctx, path="lang.txt", content="\n".join(f"zeile{i}" for i in range(1, 21)))
    result = ReadFile().run(ctx, path="lang.txt", start_line=5, max_lines=3)
    assert "zeile5" in result.content and "zeile7" in result.content
    assert "zeile8" not in result.content


def test_replace_requires_unique_match(ctx):
    WriteFile().run(ctx, path="d.py", content="a = 1\na = 1\n")
    assert ReplaceInFile().run(ctx, path="d.py", old_text="a = 1", new_text="a = 2").is_error
    assert ReplaceInFile().run(ctx, path="d.py", old_text="fehlt", new_text="x").is_error


def test_replace_applies_single_change(ctx):
    WriteFile().run(ctx, path="d.py", content="wert = 1\nandere = 2\n")
    result = ReplaceInFile().run(ctx, path="d.py", old_text="wert = 1", new_text="wert = 42")
    assert not result.is_error
    assert (ctx.workspace.root / "d.py").read_text() == "wert = 42\nandere = 2\n"


def test_list_files(ctx):
    WriteFile().run(ctx, path="src/app.py", content="x")
    listing = ListFiles().run(ctx, path=".").content
    assert "src/" in listing


def test_delete_requires_confirmation(ctx):
    WriteFile().run(ctx, path="weg.txt", content="x")
    denied = DeleteFile().run(ctx, path="weg.txt", reason="nicht mehr noetig")
    assert denied.is_error
    assert (ctx.workspace.root / "weg.txt").exists()

    ctx.confirm = lambda _prompt: True
    allowed = DeleteFile().run(ctx, path="weg.txt", reason="nicht mehr noetig")
    assert not allowed.is_error
    assert not (ctx.workspace.root / "weg.txt").exists()
