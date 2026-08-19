"""Statussystem, Journal und Snapshots."""

from __future__ import annotations

from jarvis.journal import Journal
from jarvis.status import Phase, Status
from jarvis.vcs import VersionControl


def test_status_renders_checkboxes():
    status = Status(goal="Aufgaben-App")
    status.enter(Phase.UNDERSTAND)
    status.enter(Phase.BUILD, "Backend")
    rendered = status.render()
    assert "[x] Anforderungen analysiert" in rendered
    assert "[~] Projekt implementiert  - Backend" in rendered
    assert "[ ] Tests ausgefuehrt" in rendered


def test_status_reports_verification_state():
    status = Status(goal="X")
    assert "laufend" in status.render()
    status.finished = True
    assert "ohne Ausfuehrungsnachweis" in status.render()
    status.verified = True
    assert "fertig und verifiziert" in status.render()


def test_status_roundtrip(tmp_path):
    status = Status(goal="Ziel")
    status.enter(Phase.TEST, "Tests laufen")
    status.check("Tests gruen", True)
    status.save(tmp_path / "status.json")
    loaded = Status.load(tmp_path / "status.json")
    assert loaded.goal == "Ziel"
    assert loaded.current is Phase.TEST
    assert loaded.checks == {"Tests gruen": True}


def test_journal_is_append_only_and_ordered(tmp_path):
    journal = Journal(tmp_path / "journal.jsonl")
    journal.append("a", value=1)
    journal.append("b", value=2)
    reopened = Journal(tmp_path / "journal.jsonl")
    reopened.append("c", value=3)
    events = list(reopened.read())
    assert [e.kind for e in events] == ["a", "b", "c"]
    assert [e.seq for e in events] == [1, 2, 3]


def test_journal_redacts_secrets(tmp_path, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-journalgeheim")
    journal = Journal(tmp_path / "journal.jsonl")
    journal.append("command", command="curl -H 'x: sk-ant-journalgeheim'")
    assert "sk-ant-journalgeheim" not in (tmp_path / "journal.jsonl").read_text()


def test_journal_evidence_filters(tmp_path):
    journal = Journal(tmp_path / "journal.jsonl")
    journal.append("command", exit_code=0, verifies=False, summary="ls")
    journal.append("command", exit_code=1, verifies=False, summary="pytest")
    journal.append("command", exit_code=0, verifies=True, summary="pytest")
    assert len(journal.successful_commands()) == 2
    assert len(journal.failed_commands()) == 1
    assert [e.data["summary"] for e in journal.verification_evidence()] == ["pytest"]


def test_vcs_snapshot_and_rollback(tmp_path):
    root = tmp_path / "repo"
    root.mkdir()
    vcs = VersionControl(root)
    if not vcs.available:  # pragma: no cover - nur ohne git
        return
    assert vcs.init()
    (root / "a.txt").write_text("erste Fassung", encoding="utf-8")
    first = vcs.snapshot("erster Stand")
    assert first is not None
    (root / "a.txt").write_text("zweite Fassung", encoding="utf-8")
    assert vcs.snapshot("zweiter Stand") is not None
    assert vcs.snapshot("nichts geaendert") is None
    assert vcs.rollback(first.commit)
    assert (root / "a.txt").read_text() == "erste Fassung"
    # Nach dem harten Rollback ist der zweite Stand nicht mehr Teil der Historie.
    assert [s.message for s in vcs.log()] == ["erster Stand"]
