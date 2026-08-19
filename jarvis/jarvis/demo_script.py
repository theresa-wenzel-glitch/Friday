"""Offline-Demo: der komplette Zyklus ohne API-Key.

Der `ScriptedProvider` spielt eine feste Folge von Modellantworten ab, aber alles
darunter ist echt: Dateien werden wirklich geschrieben, `python3 -m unittest` wird
wirklich ausgefuehrt, der erste Testlauf schlaegt wirklich fehl, die Korrektur wird
wirklich angewendet und der zweite Lauf ist wirklich gruen.

Damit ist der Loop nachvollziehbar - und die Demo laeuft auch dort, wo kein
Modellzugang existiert.
"""

from __future__ import annotations

from typing import Any

from jarvis.providers.base import AssistantTurn
from jarvis.providers.scripted import ScriptedProvider, turn

BUGGY_APP = '''"""wordstats - Worthaeufigkeiten aus einer Textdatei."""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter

WORD = re.compile(r"[\\w'-]+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    """Zerlegt Text in Woerter."""
    return WORD.findall(text)


def top_words(text: str, limit: int = 5) -> list[tuple[str, int]]:
    """Haeufigste Woerter, absteigend nach Anzahl, bei Gleichstand alphabetisch."""
    counts = Counter(tokenize(text))
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:limit]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="wordstats", description="Worthaeufigkeiten zaehlen")
    parser.add_argument("path", help="Textdatei")
    parser.add_argument("-n", "--limit", type=int, default=5)
    args = parser.parse_args(argv)

    try:
        text = open(args.path, encoding="utf-8").read()
    except OSError as exc:
        print(f"Datei nicht lesbar: {exc}", file=sys.stderr)
        return 2

    for word, count in top_words(text, args.limit):
        print(f"{count:>6}  {word}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''

TESTS = '''"""Tests fuer wordstats (Standardbibliothek, kein pytest noetig)."""

import unittest

from wordstats import top_words, tokenize


class TokenizeTest(unittest.TestCase):
    def test_splits_on_punctuation(self):
        self.assertEqual(tokenize("Hallo, Welt!"), ["Hallo", "Welt"])

    def test_empty_text(self):
        self.assertEqual(tokenize(""), [])


class TopWordsTest(unittest.TestCase):
    def test_counts_case_insensitive(self):
        # "Der" und "der" sind dasselbe Wort.
        self.assertEqual(top_words("Der der DER Hund", 1), [("der", 3)])

    def test_orders_by_count_then_alphabetically(self):
        self.assertEqual(top_words("b b a a c", 3), [("a", 2), ("b", 2), ("c", 1)])

    def test_limit_is_respected(self):
        self.assertEqual(len(top_words("a b c d e f", 2)), 2)

    def test_empty_input(self):
        self.assertEqual(top_words("", 3), [])


if __name__ == "__main__":
    unittest.main()
'''

README = """# wordstats

Kleines Kommandozeilen-Werkzeug, das die haeufigsten Woerter einer Textdatei zaehlt.

## Start

    python3 wordstats.py text.txt -n 5

## Tests

    python3 -m unittest discover -v

## Bekannte Einschraenkungen

- Nur UTF-8-Textdateien.
- Keine Stoppwortliste; haeufige Fuellwoerter dominieren das Ergebnis.
"""

FIX_OLD = "    counts = Counter(tokenize(text))"
FIX_NEW = "    counts = Counter(word.lower() for word in tokenize(text))"


def _fix_after_failure(messages: list[dict[str, Any]]) -> AssistantTurn:
    """Reagiert auf das Ergebnis des ersten Testlaufs.

    Genau wie das echte Modell sieht dieser Schritt nur den Inhalt der Historie -
    er korrigiert nur, wenn der Testlauf tatsaechlich fehlgeschlagen ist.
    """
    last = messages[-1]
    blob = str(last.get("content", ""))
    failed = "exit_code=0" not in blob
    if not failed:
        return turn(
            "Tests waren unerwartet sofort gruen - ich dokumentiere und schliesse ab.",
            ("record_check", {"name": "Unittests gruen", "passed": True,
                              "evidence": "python3 -m unittest discover"}),
        )
    return turn(
        "Der Test zur Gross-/Kleinschreibung schlaegt fehl: top_words zaehlt 'Der' und 'der' "
        "getrennt. Ursache ist die fehlende Normalisierung vor dem Zaehlen. Ich korrigiere das.",
        ("set_phase", {"phase": "debug", "note": "Zaehlung normalisiert Gross-/Kleinschreibung nicht"}),
        ("replace_in_file", {"path": "wordstats.py", "old_text": FIX_OLD, "new_text": FIX_NEW}),
    )


def demo_steps() -> list:
    return [
        turn(
            "Auftrag verstanden: ein CLI-Werkzeug, das Worthaeufigkeiten einer Textdatei ausgibt. "
            "Annahmen: UTF-8-Text, Ausgabe der Top-N, keine externen Abhaengigkeiten.",
            ("set_phase", {"phase": "understand", "note": "CLI, stdlib-only, Top-N Worthaeufigkeiten"}),
        ),
        turn(
            "Plan: ein Modul wordstats.py mit tokenize() und top_words(), CLI ueber argparse, "
            "Tests mit unittest, README fuer Bedienung.",
            ("set_phase", {"phase": "plan", "note": "wordstats.py + test_wordstats.py + README"}),
        ),
        turn(
            "Ich lege Implementierung und Tests an.",
            ("set_phase", {"phase": "build", "note": "Implementierung und Tests schreiben"}),
            ("write_file", {"path": "wordstats.py", "content": BUGGY_APP}),
            ("write_file", {"path": "test_wordstats.py", "content": TESTS}),
        ),
        turn(
            "Jetzt fuehre ich die Tests wirklich aus.",
            ("set_phase", {"phase": "run", "note": "Erster Testlauf"}),
            ("run_command", {"command": "python3 -m unittest discover -v", "purpose": "test"}),
        ),
        _fix_after_failure,
        turn(
            "Erneuter Testlauf nach der Korrektur.",
            ("set_phase", {"phase": "test", "note": "Testlauf nach Korrektur"}),
            ("run_command", {"command": "python3 -m unittest discover -v", "purpose": "test"}),
        ),
        turn(
            "Zusaetzlich pruefe ich das Programm an echten Daten (Ende-zu-Ende).",
            ("write_file", {"path": "beispiel.txt", "content": "Der Hund. Der Kater! DER hund?\n"}),
            ("run_command", {"command": "python3 wordstats.py beispiel.txt -n 2", "purpose": "run"}),
        ),
        turn(
            "Alles gruen. Ich dokumentiere und schliesse ab.",
            ("record_check", {"name": "Unittests gruen (6 Tests)", "passed": True,
                              "evidence": "python3 -m unittest discover -v"}),
            ("record_check", {"name": "CLI liefert Top-N Ausgabe", "passed": True,
                              "evidence": "python3 wordstats.py beispiel.txt -n 2"}),
            ("set_phase", {"phase": "finalize", "note": "README und Abschluss"}),
            ("write_file", {"path": "README.md", "content": README}),
        ),
        turn(
            "Fertig.",
            ("finish", {
                "summary": "wordstats: CLI-Werkzeug fuer Worthaeufigkeiten (Standardbibliothek, "
                           "tokenize/top_words, argparse-Frontend, 6 Unittests).",
                "how_to_run": "python3 wordstats.py beispiel.txt -n 5",
                "tests": "python3 -m unittest discover -v - 6 Tests, alle gruen. Zusaetzlich ein "
                         "Ende-zu-Ende-Lauf des CLI mit beispiel.txt.",
                "known_limitations": "Nur UTF-8-Text, keine Stoppwortliste, keine Sprachen ohne "
                                     "Wortgrenzen (z. B. Chinesisch).",
            }),
        ),
    ]


def build_demo_provider() -> ScriptedProvider:
    return ScriptedProvider(demo_steps())
