"""Kommandowerkzeug: echte Prozesse, echte Exit-Codes."""

from __future__ import annotations

from jarvis.tools import RunCommand


def test_successful_command_reports_stdout(ctx):
    result = RunCommand().run(ctx, command="echo hallo", purpose="inspect")
    assert not result.is_error
    assert "hallo" in result.content
    assert "exit_code=0" in result.content


def test_failing_command_is_marked_as_error(ctx):
    result = RunCommand().run(ctx, command="python3 -c 'import sys; sys.exit(3)'", purpose="test")
    assert result.is_error
    assert "exit_code=3" in result.content
    assert ctx.journal.failed_commands()


def test_command_runs_inside_workspace(ctx):
    result = RunCommand().run(ctx, command="pwd", purpose="inspect")
    assert str(ctx.workspace.root) in result.content


def test_timeout_is_enforced(ctx):
    result = RunCommand().run(ctx, command="sleep 5", purpose="run", timeout=1)
    assert result.is_error
    assert "Zeitlimit" in result.content
    assert not ctx.journal.verification_evidence()


def test_blocked_command_is_not_executed(ctx):
    result = RunCommand().run(ctx, command="pip install requests", purpose="setup")
    assert result.is_error
    assert "abgelehnt" in result.content
    assert ctx.journal.events("command_blocked")


def test_destructive_command_asks_and_can_be_denied(ctx):
    asked: list[str] = []

    def confirm(prompt: str) -> bool:
        asked.append(prompt)
        return False

    ctx.confirm = confirm
    result = RunCommand().run(ctx, command="rm -rf build", purpose="setup")
    assert result.is_error and asked


def test_only_test_run_build_count_as_verification(ctx):
    RunCommand().run(ctx, command="echo hallo", purpose="inspect")
    assert not ctx.journal.verification_evidence()
    RunCommand().run(ctx, command="echo test", purpose="test")
    assert len(ctx.journal.verification_evidence()) == 1


def test_secrets_are_not_leaked_into_subprocess(ctx, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-geheim-testwert")
    result = RunCommand().run(ctx, command="printenv ANTHROPIC_API_KEY || echo LEER", purpose="inspect")
    assert "sk-ant-geheim-testwert" not in result.content
    assert "LEER" in result.content


def test_long_output_is_truncated(ctx):
    ctx.config = ctx.config.with_(max_output_chars=200)
    result = RunCommand().run(ctx, command="python3 -c \"print('x'*5000)\"", purpose="inspect")
    assert "gekuerzt" in result.content
    assert len(result.content) < 2000
