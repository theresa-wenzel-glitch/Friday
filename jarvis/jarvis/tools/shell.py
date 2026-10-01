"""Kommandoausfuehrung - der Unterschied zwischen 'Code geschrieben' und 'Code laeuft'."""

from __future__ import annotations

import subprocess
from typing import Any

from jarvis.policy import check_command, describe
from jarvis.redact import clean_env, redact
from jarvis.tools.base import ToolContext, ToolResult

#: Zwecke, die als Ausfuehrungsnachweis zaehlen (Abschnitt 13/14).
VERIFYING_PURPOSES = {"test", "run", "build"}


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    head = text[: limit // 2]
    tail = text[-limit // 2:]
    return f"{head}\n... [{len(text) - limit} Zeichen gekuerzt] ...\n{tail}"


class RunCommand:
    name = "run_command"
    description = (
        "Fuehrt ein Shell-Kommando im Arbeitsbereich aus und liefert Exit-Code, stdout und stderr. "
        "Damit werden Builds gestartet, Tests ausgefuehrt und Programme wirklich laufen gelassen. "
        "Setze 'purpose' korrekt: nur test/run/build gelten als Ausfuehrungsnachweis fuer den Abschluss."
    )
    input_schema: dict[str, Any] = {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "Shell-Kommando"},
            "purpose": {
                "type": "string",
                "enum": ["inspect", "setup", "build", "run", "test"],
                "description": "Zweck des Kommandos",
            },
            "cwd": {"type": "string", "description": "Unterverzeichnis relativ zum Arbeitsbereich"},
            "timeout": {"type": "integer", "minimum": 1, "description": "Zeitlimit in Sekunden"},
            "confirmed": {
                "type": "boolean",
                "description": "Nur setzen, wenn der Nutzer eine destruktive Operation ausdruecklich erlaubt hat",
            },
        },
        "required": ["command", "purpose"],
        "additionalProperties": False,
    }

    def run(
        self,
        ctx: ToolContext,
        command: str,
        purpose: str = "inspect",
        cwd: str = ".",
        timeout: int | None = None,
        confirmed: bool = False,
    ) -> ToolResult:
        decision = check_command(
            command, allow_network=ctx.config.allow_network, confirmed=confirmed
        )
        if decision.blocked and decision.needs_confirmation and not confirmed:
            if ctx.confirm(f"Kommando ausfuehren? {command}\nGrund der Rueckfrage: {decision.reason}"):
                decision = check_command(command, allow_network=ctx.config.allow_network, confirmed=True)
        if decision.blocked:
            ctx.journal.append("command_blocked", command=command, reason=decision.reason)
            return ToolResult.error(f"Kommando abgelehnt ({decision.reason}).")

        work_dir = ctx.workspace.resolve(cwd, must_exist=True)
        limit = min(timeout or ctx.config.command_timeout, ctx.config.command_timeout)
        env = clean_env()
        env.update(ctx.config.extra_env)
        env.setdefault("PYTHONDONTWRITEBYTECODE", "1")

        try:
            completed = subprocess.run(
                command,
                shell=True,
                cwd=work_dir,
                env=env,
                capture_output=True,
                text=True,
                timeout=limit,
            )
            exit_code = completed.returncode
            stdout, stderr = completed.stdout, completed.stderr
            timed_out = False
        except subprocess.TimeoutExpired as exc:
            exit_code = 124
            stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
            stderr = (exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or "")) + (
                f"\n[Zeitlimit von {limit}s ueberschritten]"
            )
            timed_out = True

        max_chars = ctx.config.max_output_chars
        stdout = redact(_truncate(stdout, max_chars))
        stderr = redact(_truncate(stderr, max_chars))
        verifies = purpose in VERIFYING_PURPOSES and exit_code == 0 and not timed_out

        ctx.journal.append(
            "command",
            command=command,
            summary=describe(command),
            purpose=purpose,
            cwd=ctx.workspace.relative(work_dir),
            exit_code=exit_code,
            verifies=verifies,
            timed_out=timed_out,
            stdout_tail=stdout[-2000:],
            stderr_tail=stderr[-2000:],
        )

        body = [f"exit_code={exit_code}"]
        body.append(f"--- stdout ---\n{stdout.strip() or '(leer)'}")
        body.append(f"--- stderr ---\n{stderr.strip() or '(leer)'}")
        if exit_code != 0:
            body.append(
                "Das Kommando ist fehlgeschlagen. Analysiere die Ursache, korrigiere den Code "
                "und fuehre es erneut aus."
            )
        return ToolResult("\n".join(body), is_error=exit_code != 0)
