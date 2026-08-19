"""Geheimnisschutz."""

from __future__ import annotations

from jarvis.redact import PLACEHOLDER, clean_env, redact


def test_redacts_env_secret_values():
    env = {"ANTHROPIC_API_KEY": "supergeheimwert123", "PATH": "/usr/bin"}
    assert "supergeheimwert123" not in redact("Key: supergeheimwert123", environ=env)
    assert "/usr/bin" in redact("PATH=/usr/bin", environ=env)


def test_redacts_known_key_shapes():
    text = "token sk-ant-api03-ABCDEFGHIJKLMNO und ghp_0123456789abcdefghij"
    cleaned = redact(text, environ={})
    assert "sk-ant-api03-ABCDEFGHIJKLMNO" not in cleaned
    assert "ghp_0123456789abcdefghij" not in cleaned
    assert cleaned.count(PLACEHOLDER) == 2


def test_redacts_inline_assignments():
    assert "hunter2xyz" not in redact('api_key = "hunter2xyz"', environ={})


def test_clean_env_removes_secrets():
    env = clean_env({"ANTHROPIC_API_KEY": "x" * 12, "GITHUB_TOKEN": "y" * 12, "HOME": "/root"})
    assert "ANTHROPIC_API_KEY" not in env
    assert "GITHUB_TOKEN" not in env
    assert env["HOME"] == "/root"
