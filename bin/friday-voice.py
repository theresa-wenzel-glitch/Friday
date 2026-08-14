#!/usr/bin/env python3
"""Friday voice layer — push to talk, fully local STT and TTS.

Hold the key, speak, release. The recording is transcribed on-machine, sent to
Claude Code as a prompt, and the reply is spoken back on-machine. Audio never
leaves the machine; the only network call is Claude Code's own.

    bin/friday-voice.py                 hold Right-Option to talk
    bin/friday-voice.py --key ctrl_r    different hold key
    bin/friday-voice.py --toggle        press Return to start/stop (no permissions needed)
    bin/friday-voice.py --check         verify the pipeline and exit

Writes ~/.friday/audio-state so the HUD can show when it is listening, and
appends every exchange to vault/raw/YYYY-MM-DD-voice.md as a verbatim capture.
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import shutil
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from friday_md import vault_root  # noqa: E402

HOME = os.path.expanduser(os.environ.get("FRIDAY_HOME", "~/.friday"))
STATE = os.path.join(HOME, "audio-state")
WAV = os.path.join(HOME, "turn.wav")
REPLY_WAV = os.path.join(HOME, "reply.wav")
MODEL = os.environ.get("FRIDAY_STT_MODEL",
                       os.path.join(HOME, "models", "ggml-large-v3-turbo-q5_0.bin"))
VOICE = os.environ.get("FRIDAY_TTS_VOICE",
                       os.path.join(HOME, "voices", "en_GB-alba-medium.onnx"))


def set_state(mic="ready", tts="ready", level=0.0, last=""):
    """The HUD reads this file. Plain key=value so it stays human-readable."""
    os.makedirs(HOME, exist_ok=True)
    tmp = STATE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(f"mic={mic}\ntts={tts}\nlevel={level:.2f}\n"
                 f"last={last[:120]}\nupdated={time.time():.0f}\n")
    os.replace(tmp, STATE)          # atomic: the HUD never reads a half-written file


def say(msg: str, dim=False):
    print(("\033[2m" if dim else "") + msg + "\033[0m", flush=True)


# ── audio ────────────────────────────────────────────────────────────────────
def start_recording() -> subprocess.Popen:
    os.makedirs(HOME, exist_ok=True)
    if shutil.which("rec"):
        cmd = ["rec", "-q", "-r", "16000", "-c", "1", "-b", "16", WAV]
    elif shutil.which("ffmpeg"):
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
               "-f", "avfoundation", "-i", ":default", "-ar", "16000", "-ac", "1", WAV]
    else:
        raise SystemExit("no recorder: brew install sox (or ffmpeg)")
    return subprocess.Popen(cmd, stdin=subprocess.PIPE,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def stop_recording(proc: subprocess.Popen):
    try:
        proc.terminate()
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()


def transcribe() -> str:
    binary = next((b for b in ("whisper-cli", "whisper-cpp", "main")
                   if shutil.which(b)), None)
    if not binary:
        raise SystemExit("whisper.cpp not found — run bin/voice-setup.sh")
    if not os.path.exists(MODEL):
        raise SystemExit(f"STT model missing: {MODEL}")
    r = subprocess.run([binary, "-m", MODEL, "-f", WAV, "-nt", "-np", "-l", "auto"],
                       capture_output=True, text=True)
    text = " ".join(l.strip() for l in r.stdout.splitlines() if l.strip())
    # whisper emits these for silence; treat them as nothing said.
    for noise in ("[BLANK_AUDIO]", "(silence)", "[silence]", "[MUSIC]"):
        text = text.replace(noise, "")
    return text.strip()


def speak(text: str):
    if not text.strip():
        return
    if shutil.which("piper") and os.path.exists(VOICE):
        subprocess.run(["piper", "--model", VOICE, "--output_file", REPLY_WAV],
                       input=text, text=True, capture_output=True)
        player = "afplay" if shutil.which("afplay") else "play"
        subprocess.run([player, REPLY_WAV], capture_output=True)
    elif shutil.which("say"):
        say("  (piper not installed — falling back to macOS 'say')", dim=True)
        subprocess.run(["say", text])
    else:
        say("  (no TTS available; reply printed only)", dim=True)


# ── claude ───────────────────────────────────────────────────────────────────
def ask_claude(prompt: str) -> str:
    if not shutil.which("claude"):
        raise SystemExit("claude CLI not found")
    r = subprocess.run(["claude", "-p", prompt], capture_output=True, text=True,
                       cwd=os.path.dirname(vault_root()))
    if r.returncode != 0:
        return f"Claude Code returned an error: {(r.stderr or '').strip()[:200]}"
    return r.stdout.strip()


def capture(prompt: str, reply: str):
    """Append the exchange to raw/ — a transcript is a capture, never edited."""
    root = vault_root()
    today = dt.date.today().isoformat()
    path = os.path.join(root, "raw", f"{today}-voice.md")
    new = not os.path.exists(path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        if new:
            fh.write(f"---\ntitle: Voice transcript {today}\ntype: raw\n"
                     f"tags: [voice, transcript]\ncreated: {today}\nupdated: {today}\n"
                     f"summary: Verbatim push-to-talk exchanges from {today}, "
                     f"unedited.\n---\n\n# Voice — {today}\n")
        fh.write(f"\n## {dt.datetime.now():%H:%M}\n\n**Said** {prompt}\n\n**Reply** {reply}\n")


def turn(rec_proc):
    stop_recording(rec_proc)
    set_state(mic="processing", tts="ready")
    text = transcribe()
    if not text:
        say("  … nothing heard", dim=True)
        set_state(mic="ready")
        return
    say(f"\n\033[1m> {text}\033[0m")
    set_state(mic="ready", tts="thinking", last=text)
    reply = ask_claude(text)
    say(reply)
    set_state(mic="ready", tts="speaking", last=text)
    speak(reply)
    set_state(mic="ready", tts="ready", last=text)
    try:
        capture(text, reply)
    except OSError as e:
        say(f"  (could not write capture: {e})", dim=True)


# ── loops ────────────────────────────────────────────────────────────────────
def loop_hold(keyname: str):
    from pynput import keyboard
    key = getattr(keyboard.Key, keyname)
    say(f"Hold \033[1m{keyname}\033[0m to talk. Ctrl-C to quit.")
    set_state(mic="ready")
    state = {"proc": None}

    def on_press(k):
        if k == key and state["proc"] is None:
            say("\n\033[36m● listening\033[0m", dim=False)
            set_state(mic="listening", level=0.6)
            state["proc"] = start_recording()

    def on_release(k):
        if k == key and state["proc"] is not None:
            proc, state["proc"] = state["proc"], None
            turn(proc)

    with keyboard.Listener(on_press=on_press, on_release=on_release) as l:
        l.join()


def loop_toggle():
    say("Press \033[1mReturn\033[0m to start, Return again to stop. Ctrl-C to quit.")
    set_state(mic="ready")
    while True:
        input()
        say("\033[36m● listening — Return to stop\033[0m")
        set_state(mic="listening", level=0.6)
        proc = start_recording()
        input()
        turn(proc)


def check() -> int:
    rows = [
        ("recorder", shutil.which("rec") or shutil.which("ffmpeg")),
        ("whisper", shutil.which("whisper-cli") or shutil.which("whisper-cpp")),
        ("stt model", MODEL if os.path.exists(MODEL) else None),
        ("piper", shutil.which("piper")),
        ("tts voice", VOICE if os.path.exists(VOICE) else None),
        ("claude", shutil.which("claude")),
        ("vault", vault_root() if os.path.isdir(vault_root()) else None),
    ]
    bad = 0
    for name, val in rows:
        print(f"  {'ok' if val else 'no'}  {name:<10} {val or '— missing'}")
        bad += not val
    print("\nready" if not bad else f"\n{bad} missing — run bin/voice-setup.sh")
    return 1 if bad else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", default="alt_r", help="hold key (pynput name), default alt_r = Right Option")
    ap.add_argument("--toggle", action="store_true", help="Return-to-toggle instead of hold")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    if a.check:
        return check()
    os.makedirs(HOME, exist_ok=True)
    try:
        if a.toggle:
            loop_toggle()
        else:
            try:
                loop_hold(a.key)
            except ImportError:
                say("pynput not installed — using Return-to-toggle instead.", dim=True)
                say("For true hold-to-talk: pip install pynput, then grant Accessibility.", dim=True)
                loop_toggle()
    except KeyboardInterrupt:
        pass
    finally:
        set_state(mic="offline", tts="offline")
        print("\nvoice layer stopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
