"""Append-only Ereignisjournal (Nachvollziehbarkeit, Abschnitt 9).

Jede Aktion - Modellantwort, Werkzeugaufruf, Kommando, Fehler, Phasenwechsel -
landet als JSON-Zeile in `<workspace>/.jarvis/journal.jsonl`. Der Abschlussbericht
wird ausschliesslich aus diesem Journal erzeugt: JARVIS behauptet nur, was
belegbar passiert ist.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator

from jarvis.redact import redact


@dataclass
class Event:
    seq: int
    kind: str
    ts: float = field(default_factory=time.time)
    data: dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps(
            {"seq": self.seq, "ts": round(self.ts, 3), "kind": self.kind, **self.data},
            ensure_ascii=False,
            sort_keys=False,
        )

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Event":
        data = {k: v for k, v in raw.items() if k not in ("seq", "ts", "kind")}
        return cls(seq=int(raw.get("seq", 0)), kind=str(raw.get("kind", "unknown")),
                   ts=float(raw.get("ts", 0.0)), data=data)


class Journal:
    """Schreibt und liest das Ereignisjournal eines Laufs."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._seq = self._last_seq()

    def _last_seq(self) -> int:
        if not self.path.exists():
            return 0
        last = 0
        for event in self.read():
            last = max(last, event.seq)
        return last

    def append(self, kind: str, **data: Any) -> Event:
        self._seq += 1
        cleaned = {k: (redact(v) if isinstance(v, str) else v) for k, v in data.items()}
        event = Event(seq=self._seq, kind=kind, data=cleaned)
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(event.to_json() + "\n")
        return event

    def read(self) -> Iterator[Event]:
        if not self.path.exists():
            return iter(())

        def _iter() -> Iterator[Event]:
            with self.path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        yield Event.from_dict(json.loads(line))
                    except json.JSONDecodeError:
                        continue

        return _iter()

    def events(self, kind: str | None = None) -> list[Event]:
        return [e for e in self.read() if kind is None or e.kind == kind]

    # -- Belege --------------------------------------------------------------
    def successful_commands(self) -> list[Event]:
        """Alle Kommandos, die tatsaechlich mit Exit-Code 0 gelaufen sind."""
        return [e for e in self.events("command") if e.data.get("exit_code") == 0]

    def failed_commands(self) -> list[Event]:
        return [e for e in self.events("command") if e.data.get("exit_code") not in (0, None)]

    def verification_evidence(self) -> list[Event]:
        """Erfolgreiche Kommandos, die als Test-/Startnachweis gelten."""
        return [e for e in self.successful_commands() if e.data.get("verifies")]
