#!/usr/bin/env python3
"""Friday HUD — a single-screen instrument panel over the vault.

    bin/hud.py             live, redraws once a second, q to quit
    bin/hud.py --once      render one frame and exit (for piping or screenshots)
    bin/hud.py --no-color  plain text

Every number on this screen is read from a file at render time. The HUD holds
no state and caches nothing: kill it mid-frame and nothing is lost, edit a page
in the vault and the next tick shows it.

Sources
    vitals    vault/outputs/*-metrics.md   frontmatter `vitals:` -> value + trend
    schedule  icalBuddy if present, else today's vault/outputs/*-plan.md
    deck      ~/.claude/skills/*/SKILL.md  + a liveness probe per skill
    audio     ~/.friday/audio-state        written by the voice layer
    log       vault/log.md                 last recorded write
"""

from __future__ import annotations

import datetime as dt
import os
import re
import shutil
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from friday_md import load_vault, parse_frontmatter, vault_root  # noqa: E402

# ── palette ──────────────────────────────────────────────────────────────────
# Calm and dim on purpose. Colour marks state, never decoration.
COLOR = True
DIM, TEXT, BRIGHT = "38;5;240", "38;5;249", "38;5;255"
GOOD, WARN, BAD, LIVE = "38;5;108", "38;5;179", "38;5;167", "38;5;80"

SPARK = "▁▂▃▄▅▆▇█"
GLYPH = {"ready": ("●", GOOD), "partial": ("◐", WARN), "idle": ("○", DIM),
         "blocked": ("✕", BAD), "live": ("●", LIVE), "unknown": ("·", DIM)}


def c(code: str, s: str) -> str:
    return f"\033[{code}m{s}\033[0m" if COLOR else s


def vis(s: str) -> int:
    """Printable width, ignoring SGR escapes."""
    return len(re.sub(r"\033\[[0-9;]*m", "", s))


def pad(s: str, w: int) -> str:
    d = w - vis(s)
    return s + " " * d if d > 0 else s


def spark(series: list[float]) -> str:
    if len(series) < 2:
        return ""
    lo, hi = min(series), max(series)
    if hi == lo:
        return SPARK[3] * len(series)
    return "".join(SPARK[min(7, int((v - lo) / (hi - lo) * 7.99))] for v in series)


def human(v) -> str:
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    if isinstance(v, int):
        if abs(v) >= 1_000_000:
            return f"{v/1_000_000:.1f}M"
        if abs(v) >= 10_000:
            return f"{v/1000:.1f}k"
        return f"{v:,}".replace(",", " ")
    return str(v)


# ── data ─────────────────────────────────────────────────────────────────────
def read_vitals(root: str) -> list[tuple[str, list[float]]]:
    """Every `vitals:` series across dated metrics outputs, oldest first."""
    files = [p for p in load_vault(root)          # load_vault sorts by path,
             if p.folder == "outputs" and "metrics" in p.path]   # so dates are chronological
    series: dict[str, list[float]] = {}
    for page in files:
        for k, v in (page.meta.get("vitals") or {}).items():
            if isinstance(v, (int, float)):
                series.setdefault(k, []).append(float(v))
    return sorted(series.items())


def read_schedule(root: str) -> tuple[list[tuple[str, str]], str]:
    """(blocks, source). Live calendar wins; today's plan is the fallback."""
    if shutil.which("icalBuddy"):
        try:
            raw = subprocess.run(
                ["icalBuddy", "-n", "-nc", "-nrd", "-b", "", "-tf", "%H:%M",
                 "-po", "datetime,title", "eventsToday"],
                capture_output=True, text=True, timeout=6).stdout
            blocks = []
            for line in raw.splitlines():
                m = re.match(r"\s*(\d{2}:\d{2})\s+(.*)", line.strip())
                if m:
                    blocks.append((m.group(1), m.group(2).strip()))
            if blocks:
                return sorted(blocks), "calendar"
        except (subprocess.SubprocessError, OSError):
            pass

    today = dt.date.today().isoformat()
    path = os.path.join(root, "outputs", f"{today}-plan.md")
    if os.path.exists(path):
        meta, _ = parse_frontmatter(open(path, encoding="utf-8").read())
        blocks = []
        for entry in meta.get("schedule") or []:
            m = re.match(r"(\d{1,2}:\d{2})\s+(.*)", str(entry).strip())
            if m:
                blocks.append((m.group(1).rjust(5, "0"), m.group(2)))
        if blocks:
            return sorted(blocks), "plan"
    return [], "none"


def read_audio() -> dict:
    """State the voice layer writes. Stale by >10s counts as offline."""
    path = os.path.expanduser("~/.friday/audio-state")
    state = {"mic": "unknown", "tts": "unknown", "level": 0.0, "stale": True}
    try:
        for line in open(path, encoding="utf-8"):
            k, _, v = line.strip().partition("=")
            if k in ("mic", "tts", "last"):
                state[k] = v
            elif k == "level":
                try:
                    state["level"] = float(v)
                except ValueError:
                    pass
            elif k == "updated":
                try:
                    state["stale"] = (time.time() - float(v)) > 10
                except ValueError:
                    pass
    except OSError:
        return state
    return state


def probe_skills(root: str) -> list[tuple[str, str, str]]:
    """(name, status, note) for each installed skill."""
    home = os.path.expanduser("~/.claude/skills")
    known = ["vault", "inbox", "plan", "metrics", "trends"]
    installed = [d for d in known if os.path.isfile(os.path.join(home, d, "SKILL.md"))]
    today = dt.date.today().isoformat()
    mac = sys.platform == "darwin"
    out = []
    for name in known:
        if name not in installed:
            out.append((name, "blocked", "not installed"))
            continue
        ran = os.path.exists(os.path.join(root, "outputs", f"{today}-{name}.md"))
        if name == "vault":
            ok = os.path.isdir(root) and os.access(root, os.W_OK)
            out.append((name, "ready" if ok else "blocked",
                        "vault writable" if ok else "vault unreachable"))
        elif name == "metrics":
            if not mac:
                out.append((name, "unknown", "keychain needs macOS"))
            else:
                items = [("friday-stripe", "secret-key"), ("friday-supabase", "connection-string"),
                         ("friday-instagram", "access-token"), ("friday-youtube", "api-key")]
                have = sum(subprocess.run(
                    ["security", "find-generic-password", "-s", s, "-a", a],
                    capture_output=True).returncode == 0 for s, a in items)
                st = "ready" if have == len(items) else ("partial" if have else "blocked")
                out.append((name, st, f"{have}/{len(items)} keys" + (" · ran today" if ran else "")))
        elif name == "inbox":
            ok = mac and os.path.isdir("/System/Applications/Mail.app")
            out.append((name, "ready" if ok else "unknown",
                        ("ran today" if ran else "mail + calendar") if ok else "needs macOS"))
        elif name == "trends":
            has_src = any("trend" in p.path and p.folder == "wiki" for p in load_vault(root))
            out.append((name, "ready" if has_src else "partial",
                        "ran today" if ran else ("sources set" if has_src else "no source list")))
        else:  # plan
            out.append((name, "ready" if ran else "idle",
                        "written today" if ran else "no plan yet"))
    return out


def last_log(root: str) -> str:
    try:
        lines = [l.strip() for l in open(os.path.join(root, "log.md"), encoding="utf-8")
                 if re.match(r"\d{4}-\d{2}-\d{2}\s", l.strip())]
        return lines[-1] if lines else "no writes recorded"
    except OSError:
        return "log.md unreadable"


# ── panels ───────────────────────────────────────────────────────────────────
def rule(title: str, w: int) -> str:
    head = f"─── {title} "
    return c(DIM, head + "─" * max(0, w - vis(head)))


def panel_vitals(root: str, w: int) -> list[str]:
    vitals = read_vitals(root)
    if not vitals:
        return [c(DIM, "  no metrics output in the vault yet — run the metrics skill")]
    rows = []
    label_w = max(len(k) for k, _ in vitals) + 2
    for key, series in vitals:
        now, trend = series[-1], spark(series[-24:])
        if len(series) > 1 and series[-2]:
            pct = (now - series[-2]) / abs(series[-2]) * 100
            col = GOOD if pct > 0 else (BAD if pct < 0 else DIM)
            delta = c(col, f"{pct:+.1f}%".rjust(7))
        else:
            delta = c(DIM, "     ··")
        rows.append("  " + pad(c(TEXT, key.replace("_", " ")), label_w)
                    + pad(c(BRIGHT, human(now)), 12)
                    + pad(c(LIVE, trend), 26) + delta
                    + c(DIM, f"  {len(series)}d"))
    return rows


def panel_deck(root: str, w: int) -> list[str]:
    rows = []
    for name, status, note in probe_skills(root):
        g, col = GLYPH[status]
        rows.append("  " + c(col, g) + " " + pad(c(TEXT, name), 10)
                    + pad(c(DIM, status), 10) + c(DIM, note))
    return rows


def panel_schedule(root: str, w: int) -> list[str]:
    blocks, source = read_schedule(root)
    if not blocks:
        return [c(DIM, "  nothing scheduled — no calendar, no plan for today")]
    now = dt.datetime.now().strftime("%H:%M")
    current = -1
    for i, (start, _) in enumerate(blocks):
        if start <= now:
            current = i
    rows = []
    for i, (start, what) in enumerate(blocks):
        live = i == current
        bar = c(LIVE, "▐") if live else c(DIM, "│")
        t = c(BRIGHT if live else DIM, start)
        label = c(BRIGHT, what) if live else c(TEXT if i > current else DIM, what)
        tail = c(LIVE, "  ◀ now") if live else ""
        rows.append(f"  {bar} {t}  {label}{tail}")
    rows.append(c(DIM, f"  source: {source}"))
    return rows


def panel_audio(w: int) -> list[str]:
    a = read_audio()
    if a["stale"]:
        return ["  " + c(DIM, "· mic  offline") + "      "
                + c(DIM, "· out  offline") + "      "
                + c(DIM, "voice layer not running")]
    mic_state = "live" if a["mic"] == "listening" else ("ready" if a["mic"] == "ready" else "idle")
    g, col = GLYPH[mic_state]
    meter_w = 24
    filled = int(max(0.0, min(1.0, a["level"])) * meter_w)
    meter = c(LIVE, "▓" * filled) + c(DIM, "░" * (meter_w - filled))
    tg, tcol = GLYPH["live" if a["tts"] == "speaking" else "ready"]
    return [
        "  " + c(col, g) + " " + pad(c(TEXT, f"mic  {a['mic']}"), 22) + meter,
        "  " + c(tcol, tg) + " " + pad(c(TEXT, f"out  {a['tts']}"), 22)
        + c(DIM, (a.get("last") or "")[:w - 30]),
    ]


def columns(left: list[str], right: list[str], lw: int, gap: int = 3) -> list[str]:
    n = max(len(left), len(right))
    left += [""] * (n - len(left))
    right += [""] * (n - len(right))
    return [pad(l, lw) + " " * gap + r for l, r in zip(left, right)]


def frame(root: str) -> str:
    w = max(80, min(shutil.get_terminal_size((110, 40)).columns, 160))
    now = dt.datetime.now()
    head = (c(BRIGHT, "FRIDAY") + c(DIM, "  ·  ") + c(TEXT, now.strftime("%a %d %b"))
            + c(DIM, "  ·  ") + c(BRIGHT, now.strftime("%H:%M:%S")))
    right = c(DIM, os.path.basename(root) + "/")
    lines = [pad(head, w - vis(right)) + right, ""]

    lines += [rule("SYSTEM VITALS", w), ""] + panel_vitals(root, w) + [""]

    deck = [rule("COMMAND DECK", 52), ""] + panel_deck(root, 52)
    sched = [rule("SCHEDULE", w - 55), ""] + panel_schedule(root, w - 55)
    lines += columns(deck, sched, 52) + [""]

    lines += [rule("AUDIO I/O", w), ""] + panel_audio(w) + [""]
    lines += [c(DIM, "─" * w), c(DIM, "  last write  " + last_log(root)[:w - 16])]
    return "\n".join(lines)


def main() -> int:
    global COLOR
    argv = sys.argv[1:]
    if "--no-color" in argv or not sys.stdout.isatty():
        COLOR = "--color" in argv
    root = vault_root(next((a for a in argv if not a.startswith("--")), None))
    if not os.path.isdir(root):
        print(f"no vault at {root}\nset FRIDAY_VAULT or pass a path", file=sys.stderr)
        return 2

    if "--once" in argv or not sys.stdout.isatty():
        print(frame(root))
        return 0

    import select
    import termios
    import tty
    fd = sys.stdin.fileno()
    saved = termios.tcgetattr(fd)
    sys.stdout.write("\033[?1049h\033[?25l")            # alt screen, hide cursor
    try:
        tty.setcbreak(fd)
        while True:
            sys.stdout.write("\033[H\033[2J" + frame(root))
            sys.stdout.flush()
            if select.select([sys.stdin], [], [], 1.0)[0]:
                if sys.stdin.read(1).lower() in ("q", "\x03"):
                    break
    except KeyboardInterrupt:
        pass
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, saved)
        sys.stdout.write("\033[?25h\033[?1049l")        # restore
        sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
