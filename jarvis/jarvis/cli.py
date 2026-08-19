"""Kommandozeile von JARVIS II."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Sequence

from jarvis import __version__
from jarvis.agent import Agent
from jarvis.config import DEFAULT_EFFORT, DEFAULT_MODEL, Config
from jarvis.errors import JarvisError
from jarvis.journal import Journal
from jarvis.status import Status
from jarvis.vcs import VersionControl
from jarvis.workspace import Workspace

BANNER = "JARVIS II. - autonomer KI-Software-Engineer"


def _printer(verbose: bool):
    def emit(kind: str, data: dict[str, Any]) -> None:
        if kind == "assistant":
            print(f"\n[{data['step']}] {data['text']}")
        elif kind == "tool_call":
            detail = data["input"].get("command") or data["input"].get("path") or data["input"].get("phase") or ""
            print(f"    -> {data['name']} {str(detail)[:110]}")
        elif kind == "tool_result" and (verbose or data["is_error"]):
            mark = "!!" if data["is_error"] else "  "
            preview = data["preview"].strip().replace("\n", "\n       ")
            print(f"    {mark} {preview[:600]}")
        elif kind == "error":
            print(f"    !! {data['message']}", file=sys.stderr)
        sys.stdout.flush()

    return emit


def _confirmer(assume_yes: bool):
    def confirm(prompt: str) -> bool:
        if assume_yes:
            print(f"    ?? {prompt} -> automatisch bestaetigt (--yes)")
            return True
        if not sys.stdin.isatty():
            return False
        answer = input(f"    ?? {prompt} [j/N] ").strip().lower()
        return answer in ("j", "ja", "y", "yes")

    return confirm


def _config_from_args(args: argparse.Namespace, **extra: Any) -> Config:
    return Config.from_env(
        args.workspace,
        model=getattr(args, "model", DEFAULT_MODEL),
        effort=getattr(args, "effort", DEFAULT_EFFORT),
        max_steps=getattr(args, "max_steps", 60),
        command_timeout=getattr(args, "timeout", 300),
        allow_network=getattr(args, "allow_network", False),
        **extra,
    )


# -- Befehle -----------------------------------------------------------------
def cmd_build(args: argparse.Namespace) -> int:
    from jarvis.providers import build_provider

    config = _config_from_args(args)
    print(BANNER)
    print(f"Auftrag:       {args.goal}")
    print(f"Arbeitsbereich {config.workspace}")
    print(f"Modell:        {config.model} (effort={config.effort})")
    print("-" * 72)
    try:
        provider = build_provider(config)
    except JarvisError as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        return 2

    agent = Agent(config, provider, confirm=_confirmer(args.yes), on_event=_printer(args.verbose))
    result = agent.build(args.goal)
    print("\n" + "=" * 72)
    print(result.status.render())
    print("=" * 72)
    print(result.report.render())
    return 0 if result.verified else (1 if result.finished else 3)


def cmd_demo(args: argparse.Namespace) -> int:
    """Offline-Demo: vollstaendiger Zyklus ohne API-Key, echte Dateien und Kommandos."""
    from jarvis.demo_script import build_demo_provider

    config = _config_from_args(args).with_(offline=True, max_steps=30)
    agent = Agent(config, build_demo_provider(), on_event=_printer(args.verbose))
    print(BANNER + " - Offline-Demo")
    result = agent.build("Baue ein Kommandozeilen-Werkzeug 'wordstats' mit Tests.")
    print("\n" + result.status.render())
    print("\n" + result.report.render())
    return 0 if result.verified else 1


def cmd_status(args: argparse.Namespace) -> int:
    path = Path(args.workspace) / ".jarvis" / "status.json"
    if not path.exists():
        print(f"Kein Lauf in {args.workspace} gefunden.", file=sys.stderr)
        return 2
    print(Status.load(path).render())
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    path = Path(args.workspace) / ".jarvis" / "report.txt"
    if not path.exists():
        print(f"Kein Bericht in {args.workspace} gefunden.", file=sys.stderr)
        return 2
    print(path.read_text(encoding="utf-8"))
    return 0


def cmd_journal(args: argparse.Namespace) -> int:
    path = Path(args.workspace) / ".jarvis" / "journal.jsonl"
    if not path.exists():
        print(f"Kein Journal in {args.workspace} gefunden.", file=sys.stderr)
        return 2
    events = list(Journal(path).read())
    selected = [e for e in events if not args.kind or e.kind == args.kind][-args.tail:]
    for event in selected:
        if args.json:
            print(event.to_json())
        else:
            detail = {k: v for k, v in event.data.items() if k not in ("stdout_tail", "stderr_tail")}
            print(f"{event.seq:>4} {event.kind:<14} {json.dumps(detail, ensure_ascii=False)[:160]}")
    return 0


def cmd_snapshots(args: argparse.Namespace) -> int:
    for snapshot in VersionControl(args.workspace).log(limit=args.limit):
        print(f"{snapshot.commit}  {snapshot.message}")
    return 0


def cmd_rollback(args: argparse.Namespace) -> int:
    vcs = VersionControl(args.workspace)
    if not vcs.rollback(args.commit):
        print(f"Rollback auf '{args.commit}' fehlgeschlagen.", file=sys.stderr)
        return 2
    print(f"Arbeitsbereich auf {args.commit} zurueckgesetzt.")
    return 0


def cmd_doctor(args: argparse.Namespace) -> int:
    import os
    import shutil

    checks: list[tuple[str, bool, str]] = []
    try:
        import anthropic  # noqa: F401

        checks.append(("anthropic-SDK", True, "installiert"))
    except ImportError:
        checks.append(("anthropic-SDK", False, "fehlt: pip install 'jarvis-ii[llm]'"))
    key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    checks.append(("API-Zugang", key, "ANTHROPIC_API_KEY gesetzt" if key
                   else "kein ANTHROPIC_API_KEY (SDK sucht sonst ein Profil)"))
    checks.append(("git", shutil.which("git") is not None, "fuer Snapshots und Rollback"))
    checks.append(("python3", shutil.which("python3") is not None, "fuer Tests im Workspace"))
    workspace = Workspace(args.workspace)
    checks.append(("Arbeitsbereich", workspace.root.is_dir(), str(workspace.root)))

    print(BANNER + " - Umgebungspruefung\n")
    for name, ok, note in checks:
        print(f"[{'x' if ok else '!'}] {name:<16} {note}")
    required_ok = all(ok for name, ok, _ in checks if name != "API-Zugang")
    print("\nBereit fuer autonome Laeufe." if required_ok else "\nEs fehlen Voraussetzungen.")
    return 0 if required_ok else 1


# -- Parser ------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="jarvis", description=BANNER)
    parser.add_argument("--version", action="version", version=f"JARVIS II. {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    def add_workspace(p: argparse.ArgumentParser) -> None:
        p.add_argument("-w", "--workspace", default="workspace", help="Arbeitsbereich (Sandbox)")

    build = sub.add_parser("build", help="Autonom ein Projekt bauen")
    build.add_argument("goal", help="Was soll gebaut werden?")
    add_workspace(build)
    build.add_argument("--model", default=DEFAULT_MODEL)
    build.add_argument("--effort", default=DEFAULT_EFFORT,
                       choices=["low", "medium", "high", "xhigh", "max"])
    build.add_argument("--max-steps", type=int, default=60, dest="max_steps")
    build.add_argument("--timeout", type=int, default=300, help="Zeitlimit je Kommando (s)")
    build.add_argument("--allow-network", action="store_true", dest="allow_network")
    build.add_argument("-y", "--yes", action="store_true", help="Rueckfragen automatisch bestaetigen")
    build.add_argument("-v", "--verbose", action="store_true")
    build.set_defaults(func=cmd_build)

    demo = sub.add_parser("demo", help="Offline-Demo des kompletten Zyklus (ohne API-Key)")
    add_workspace(demo)
    demo.add_argument("-v", "--verbose", action="store_true")
    demo.set_defaults(func=cmd_demo)

    status = sub.add_parser("status", help="Status des letzten Laufs")
    add_workspace(status)
    status.set_defaults(func=cmd_status)

    report = sub.add_parser("report", help="Abschlussbericht des letzten Laufs")
    add_workspace(report)
    report.set_defaults(func=cmd_report)

    journal = sub.add_parser("journal", help="Ereignisjournal anzeigen")
    add_workspace(journal)
    journal.add_argument("--tail", type=int, default=30)
    journal.add_argument("--kind", default="", help="Nur Ereignisse dieser Art")
    journal.add_argument("--json", action="store_true")
    journal.set_defaults(func=cmd_journal)

    snapshots = sub.add_parser("snapshots", help="Git-Snapshots des Arbeitsbereichs")
    add_workspace(snapshots)
    snapshots.add_argument("--limit", type=int, default=20)
    snapshots.set_defaults(func=cmd_snapshots)

    rollback = sub.add_parser("rollback", help="Arbeitsbereich auf einen Snapshot zuruecksetzen")
    add_workspace(rollback)
    rollback.add_argument("commit")
    rollback.set_defaults(func=cmd_rollback)

    doctor = sub.add_parser("doctor", help="Umgebung pruefen")
    add_workspace(doctor)
    doctor.set_defaults(func=cmd_doctor)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except KeyboardInterrupt:
        print("\nAbgebrochen.", file=sys.stderr)
        return 130
    except JarvisError as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
