"""Anbindung an die Messages API - geprueft mit einem Stub-Client (kein Netz)."""

from __future__ import annotations

import pytest

from jarvis.config import Config
from jarvis.errors import ProviderError
from jarvis.providers.anthropic_provider import AnthropicProvider

anthropic = pytest.importorskip("anthropic")


class Block:
    def __init__(self, **fields):
        self.__dict__.update(fields)

    def model_dump(self, exclude_none: bool = False):
        return dict(self.__dict__)


class Response:
    def __init__(self, content, stop_reason="end_turn"):
        self.content = content
        self.stop_reason = stop_reason
        self.stop_details = None
        self.usage = Block(input_tokens=10, output_tokens=5)


@pytest.fixture
def provider(tmp_path):
    return AnthropicProvider(Config(workspace=tmp_path, api_key="sk-ant-test-key"))


def test_request_uses_configured_model_and_effort(provider, monkeypatch):
    captured = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return Response([Block(type="text", text="Hallo")])

    monkeypatch.setattr(provider.client.messages, "create", fake_create)
    provider.complete(system="S", messages=[{"role": "user", "content": "x"}], tools=[])

    assert captured["model"] == "claude-opus-5"
    assert captured["output_config"] == {"effort": "xhigh"}
    assert captured["thinking"] == {"type": "adaptive"}
    assert captured["system"] == "S"


def test_tool_use_blocks_become_tool_calls(provider, monkeypatch):
    blocks = [
        Block(type="thinking", thinking="", signature="sig"),
        Block(type="text", text="Ich schreibe die Datei."),
        Block(type="tool_use", id="tu_1", name="write_file",
              input={"path": "a.py", "content": "x"}),
    ]
    monkeypatch.setattr(provider.client.messages, "create",
                        lambda **kwargs: Response(blocks, stop_reason="tool_use"))
    result = provider.complete(system="S", messages=[], tools=[])

    assert result.text == "Ich schreibe die Datei."
    assert [c.name for c in result.tool_calls] == ["write_file"]
    assert result.tool_calls[0].input["path"] == "a.py"
    # Alle Bloecke - auch thinking - gehen unveraendert in die Historie zurueck.
    assert [b["type"] for b in result.as_message()["content"]] == ["thinking", "text", "tool_use"]
    assert result.usage == {"input_tokens": 10, "output_tokens": 5}


def test_refusal_raises_provider_error(provider, monkeypatch):
    monkeypatch.setattr(provider.client.messages, "create",
                        lambda **kwargs: Response([], stop_reason="refusal"))
    with pytest.raises(ProviderError):
        provider.complete(system="S", messages=[], tools=[])


def test_connection_error_is_wrapped(provider, monkeypatch):
    def boom(**kwargs):
        raise anthropic.APIConnectionError(request=None)

    monkeypatch.setattr(provider.client.messages, "create", boom)
    with pytest.raises(ProviderError, match="Verbindung"):
        provider.complete(system="S", messages=[], tools=[])


def test_missing_credentials_produce_clear_message(provider, monkeypatch):
    def no_auth(**kwargs):
        raise TypeError("Could not resolve authentication method. Expected one of api_key, ...")

    monkeypatch.setattr(provider.client.messages, "create", no_auth)
    with pytest.raises(ProviderError, match="Keine Zugangsdaten"):
        provider.complete(system="S", messages=[], tools=[])


def test_unrelated_type_errors_are_not_swallowed(provider, monkeypatch):
    def boom(**kwargs):
        raise TypeError("unexpected keyword argument 'quatsch'")

    monkeypatch.setattr(provider.client.messages, "create", boom)
    with pytest.raises(TypeError):
        provider.complete(system="S", messages=[], tools=[])
