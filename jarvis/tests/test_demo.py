"""Ende-zu-Ende: die Offline-Demo baut ein echtes, laufendes Programm."""

from __future__ import annotations

import subprocess
import sys

from jarvis.agent import Agent
from jarvis.demo_script import build_demo_provider


def test_demo_produces_working_program(config):
    result = Agent(config.with_(auto_commit=True, max_steps=30), build_demo_provider()).build(
        "Baue ein Kommandozeilen-Werkzeug 'wordstats' mit Tests."
    )

    assert result.finished and result.verified
    assert result.stop_reason == "finish"

    # Der erste Testlauf ist wirklich fehlgeschlagen, der zweite wirklich gruen.
    exit_codes = [c["exit_code"] for c in result.report.commands if c["purpose"] == "test"]
    assert exit_codes == [1, 0]

    # Das Ergebnis laeuft auch ausserhalb des Agenten.
    workspace = config.workspace
    for name in ("wordstats.py", "test_wordstats.py", "README.md"):
        assert (workspace / name).exists(), name

    tests = subprocess.run([sys.executable, "-m", "unittest", "discover"],
                           cwd=workspace, capture_output=True, text=True, timeout=120)
    assert tests.returncode == 0, tests.stderr

    run = subprocess.run([sys.executable, "wordstats.py", "beispiel.txt", "-n", "2"],
                         cwd=workspace, capture_output=True, text=True, timeout=60)
    assert run.returncode == 0
    assert "der" in run.stdout  # Gross-/Kleinschreibung wurde korrekt zusammengefasst


def test_demo_report_documents_evidence(config):
    result = Agent(config.with_(max_steps=30), build_demo_provider()).build("wordstats")
    rendered = result.report.render()
    assert "Unittests gruen" in rendered
    assert "ausgefuehrt und die vorgesehenen Tests" in rendered
    assert "Bekannte Einschraenkungen" in rendered
