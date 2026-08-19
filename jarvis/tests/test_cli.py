"""Kommandozeile."""

from __future__ import annotations

import pytest

from jarvis import cli
from jarvis.providers.scripted import ScriptedProvider, turn


def test_doctor_reports_environment(tmp_path, capsys):
    code = cli.main(["doctor", "-w", str(tmp_path / "ws")])
    out = capsys.readouterr().out
    assert "Umgebungspruefung" in out
    assert code in (0, 1)


def test_build_uses_provider_and_prints_report(tmp_path, monkeypatch, capsys):
    steps = [
        turn("Bauen.", ("write_file", {"path": "app.py", "content": "print('ok')\n"})),
        turn("Testen.", ("run_command", {"command": "python3 app.py", "purpose": "test"})),
        turn("Fertig.", ("finish", {"summary": "Mini-App", "how_to_run": "python3 app.py"})),
    ]
    monkeypatch.setattr("jarvis.providers.build_provider", lambda config: ScriptedProvider(steps))
    code = cli.main(["build", "Baue eine Mini-App", "-w", str(tmp_path / "ws")])
    out = capsys.readouterr().out
    assert code == 0
    assert "Ehrlichkeitshinweis" in out
    assert (tmp_path / "ws" / "app.py").exists()


def test_build_exit_code_signals_missing_verification(tmp_path, monkeypatch):
    steps = [
        turn("Fertig ohne Ausfuehrung.", ("finish", {
            "summary": "X", "how_to_run": "-", "unverified_reason": "keine Laufzeit"})),
    ]
    monkeypatch.setattr("jarvis.providers.build_provider", lambda config: ScriptedProvider(steps))
    assert cli.main(["build", "Ziel", "-w", str(tmp_path / "ws")]) == 1


def test_status_report_journal_after_run(tmp_path, monkeypatch, capsys):
    workspace = str(tmp_path / "ws")
    steps = [
        turn("Bauen.", ("set_phase", {"phase": "build", "note": "los"}),
             ("run_command", {"command": "echo hallo", "purpose": "test"})),
        turn("Fertig.", ("finish", {"summary": "X", "how_to_run": "-"})),
    ]
    monkeypatch.setattr("jarvis.providers.build_provider", lambda config: ScriptedProvider(steps))
    cli.main(["build", "Ziel", "-w", workspace])
    capsys.readouterr()

    assert cli.main(["status", "-w", workspace]) == 0
    assert "fertig und verifiziert" in capsys.readouterr().out
    assert cli.main(["report", "-w", workspace]) == 0
    assert "Auftrag: Ziel" in capsys.readouterr().out
    assert cli.main(["journal", "-w", workspace, "--kind", "command"]) == 0
    assert "echo hallo" in capsys.readouterr().out
    assert cli.main(["snapshots", "-w", workspace]) == 0


def test_status_without_run_fails_cleanly(tmp_path, capsys):
    assert cli.main(["status", "-w", str(tmp_path / "leer")]) == 2
    assert "Kein Lauf" in capsys.readouterr().err


def test_unknown_command_exits_with_usage_error(capsys):
    with pytest.raises(SystemExit):
        cli.main(["fliegen"])
