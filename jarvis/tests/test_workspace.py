"""Sandbox: Ausbruchsversuche muessen scheitern."""

from __future__ import annotations

import os

import pytest

from jarvis.errors import SandboxViolation
from jarvis.workspace import Workspace


def test_resolves_relative_path_inside_root(workspace: Workspace):
    target = workspace.resolve("src/app.py")
    assert str(target).startswith(str(workspace.root))


@pytest.mark.parametrize(
    "escape",
    ["../geheim.txt", "../../etc/passwd", "sub/../../draussen.txt", "/etc/passwd"],
)
def test_rejects_paths_outside_root(workspace: Workspace, escape: str):
    with pytest.raises(SandboxViolation):
        workspace.resolve(escape)


def test_rejects_symlink_escape(workspace: Workspace, tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "beute.txt").write_text("geheim", encoding="utf-8")
    os.symlink(outside, workspace.root / "link")
    with pytest.raises(SandboxViolation):
        workspace.resolve("link/beute.txt")


def test_protects_internal_directories(workspace: Workspace):
    with pytest.raises(SandboxViolation):
        workspace.ensure_writable(workspace.resolve(".jarvis/journal.jsonl"))
    with pytest.raises(SandboxViolation):
        workspace.ensure_writable(workspace.resolve(".git/config"))


def test_tree_skips_internal_paths(workspace: Workspace):
    (workspace.root / "app.py").write_text("x", encoding="utf-8")
    (workspace.root / ".jarvis").mkdir()
    (workspace.root / ".jarvis" / "journal.jsonl").write_text("{}", encoding="utf-8")
    tree = workspace.tree()
    assert "app.py" in tree
    assert not any(entry.startswith(".jarvis") for entry in tree)


def test_list_dir_requires_directory(workspace: Workspace):
    (workspace.root / "datei.txt").write_text("x", encoding="utf-8")
    with pytest.raises(SandboxViolation):
        workspace.list_dir("datei.txt")
