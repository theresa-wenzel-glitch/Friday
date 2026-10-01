"""Der autonome Loop: Werkzeugausfuehrung, Debug-Zyklus, Abschlussschranke."""

from __future__ import annotations

from jarvis.agent import Agent
from jarvis.providers.base import AssistantTurn
from jarvis.providers.scripted import ScriptedProvider, turn


def run(config, steps, **kwargs) -> object:
    provider = ScriptedProvider(steps)
    agent = Agent(config, provider, **kwargs)
    return agent.build("Testauftrag")


def test_loop_executes_tools_and_finishes_verified(config):
    result = run(config, [
        turn("Ich baue.", ("write_file", {"path": "app.py", "content": "print('ok')\n"})),
        turn("Ich fuehre aus.", ("run_command", {"command": "python3 app.py", "purpose": "run"})),
        turn("Fertig.", ("finish", {"summary": "Mini-App", "how_to_run": "python3 app.py"})),
    ])
    assert result.finished and result.verified
    assert (config.workspace / "app.py").exists()
    assert "ausgefuehrt und die vorgesehenen Tests" in result.report.honesty_statement


def test_finish_is_rejected_without_execution_evidence(config):
    result = run(config, [
        turn("Code steht.", ("write_file", {"path": "app.py", "content": "print(1)\n"})),
        turn("Fertig?", ("finish", {"summary": "App", "how_to_run": "python3 app.py"})),
        turn("Ich kann hier nicht ausfuehren.", ("finish", {
            "summary": "App",
            "how_to_run": "python3 app.py",
            "unverified_reason": "Keine Laufzeitumgebung verfuegbar.",
        })),
    ])
    assert result.finished
    assert not result.verified
    assert "nicht bestaetigt" in result.report.honesty_statement
    assert "Keine Laufzeitumgebung" in result.report.render()


def test_failed_command_triggers_debug_and_second_run(config):
    def fix_after_failure(messages) -> AssistantTurn:
        blob = str(messages[-1])
        assert "exit_code=1" in blob, "Der Loop muss den Fehlschlag zurueckliefern"
        return turn("Ich korrigiere.", ("write_file", {"path": "app.py", "content": "print('ok')\n"}))

    result = run(config, [
        turn("Erste Fassung.", ("write_file", {"path": "app.py", "content": "raise SystemExit(1)\n"})),
        turn("Ausfuehren.", ("run_command", {"command": "python3 app.py", "purpose": "run"})),
        fix_after_failure,
        turn("Erneut ausfuehren.", ("run_command", {"command": "python3 app.py", "purpose": "run"})),
        turn("Fertig.", ("finish", {"summary": "App", "how_to_run": "python3 app.py"})),
    ])
    assert result.verified
    commands = result.report.commands
    assert [c["exit_code"] for c in commands] == [1, 0]


def test_unknown_tool_is_reported_back_to_the_model(config):
    seen: list[str] = []

    def observe(messages) -> AssistantTurn:
        seen.append(str(messages[-1]))
        return turn("Ich nutze das richtige Werkzeug.",
                    ("run_command", {"command": "echo ok", "purpose": "test"}))

    result = run(config, [
        turn("Falsches Werkzeug.", ("zauberstab", {"x": 1})),
        observe,
        turn("Fertig.", ("finish", {"summary": "X", "how_to_run": "-"})),
    ])
    assert "Unbekanntes Werkzeug" in seen[0]
    assert result.finished


def test_sandbox_violation_is_returned_as_tool_error(config):
    seen: list[str] = []

    def observe(messages) -> AssistantTurn:
        seen.append(str(messages[-1]))
        return turn("Ich bleibe im Arbeitsbereich.",
                    ("run_command", {"command": "echo ok", "purpose": "test"}))

    result = run(config, [
        turn("Ausbruch.", ("write_file", {"path": "../../boese.txt", "content": "x"})),
        observe,
        turn("Fertig.", ("finish", {"summary": "X", "how_to_run": "-"})),
    ])
    assert "SandboxViolation" in seen[0]
    assert result.finished


def test_invalid_tool_arguments_do_not_crash_the_loop(config):
    result = run(config, [
        turn("Falsche Parameter.", ("write_file", {"pfad": "app.py"})),
        turn("Fertig.", ("finish", {
            "summary": "X", "how_to_run": "-", "unverified_reason": "Abbruchtest"})),
    ])
    assert result.finished
    assert any(e.data.get("is_error") for e in
               __import__("jarvis.journal", fromlist=["Journal"]).Journal(
                   config.state_dir / "journal.jsonl").events("tool_result"))


def test_loop_stops_when_model_stops_using_tools(config):
    result = run(config, [turn("Ich denke nach."), turn("Immer noch."), turn("Und weiter.")])
    assert not result.finished
    assert result.stop_reason == "modell_ohne_werkzeugaufrufe"
    assert "unvollstaendig" in result.report.honesty_statement


def test_step_budget_is_enforced(config):
    small = config.with_(max_steps=3)
    result = run(small, [
        turn("1", ("list_files", {})),
        turn("2", ("list_files", {})),
        turn("3", ("list_files", {})),
        turn("4", ("list_files", {})),
    ])
    assert result.steps == 3
    assert result.stop_reason == "max_steps"


def test_provider_failure_is_handled(config):
    result = run(config, [turn("1", ("list_files", {}))])  # Schritt 2 fehlt im Skript
    assert not result.finished
    assert "provider_error" in result.stop_reason


def test_run_writes_status_report_and_journal(config):
    run(config, [
        turn("Bauen.", ("set_phase", {"phase": "build", "note": "los"}),
             ("run_command", {"command": "echo ok", "purpose": "test"})),
        turn("Fertig.", ("finish", {"summary": "X", "how_to_run": "-"})),
    ])
    assert (config.state_dir / "status.json").exists()
    assert (config.state_dir / "report.txt").exists()
    assert (config.state_dir / "journal.jsonl").exists()
    assert "Ehrlichkeitshinweis" in (config.state_dir / "report.txt").read_text(encoding="utf-8")


def test_snapshots_are_created_when_enabled(config):
    with_git = config.with_(auto_commit=True)
    result = run(with_git, [
        turn("Bauen.",
             ("write_file", {"path": "app.py", "content": "print('x')\n"}),
             ("set_phase", {"phase": "build", "note": "Code geschrieben"})),
        turn("Testen.", ("run_command", {"command": "python3 app.py", "purpose": "test"})),
        turn("Fertig.", ("finish", {"summary": "X", "how_to_run": "python3 app.py"})),
    ])
    from jarvis.vcs import VersionControl

    if VersionControl(with_git.workspace).available:
        assert result.report.snapshots
