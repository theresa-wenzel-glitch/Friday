"""Gemeinsame Fixtures fuer die JARVIS-Tests."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from jarvis.config import Config  # noqa: E402
from jarvis.journal import Journal  # noqa: E402
from jarvis.status import Status  # noqa: E402
from jarvis.tools.base import ToolContext  # noqa: E402
from jarvis.vcs import VersionControl  # noqa: E402
from jarvis.workspace import Workspace  # noqa: E402


@pytest.fixture
def config(tmp_path: Path) -> Config:
    return Config(
        workspace=tmp_path / "ws",
        offline=True,
        max_steps=20,
        command_timeout=30,
        auto_commit=False,
    )


@pytest.fixture
def workspace(config: Config) -> Workspace:
    return Workspace(config.workspace)


@pytest.fixture
def ctx(config: Config, workspace: Workspace) -> ToolContext:
    return ToolContext(
        config=config,
        workspace=workspace,
        journal=Journal(config.state_dir / "journal.jsonl"),
        status=Status(goal="Test"),
        vcs=VersionControl(config.workspace),
        confirm=lambda _prompt: False,
    )
