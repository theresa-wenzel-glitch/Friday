#!/usr/bin/env python3
"""Friday HUD, browser edition — a local server over the same vault readers.

    bin/hud-server.py                 serve on 127.0.0.1:8765
    bin/hud-server.py --open          serve and open a browser
    bin/hud-server.py --port 9000
    bin/hud-server.py --snapshot out.html   freeze current state into one file

The data layer is imported from hud.py rather than reimplemented, so the terminal
panel and the browser panel can never drift apart.

Binds to loopback only. The vault is personal and this server has no auth — it
must not be reachable from the network, so the host is not configurable.
"""

from __future__ import annotations

import argparse
import datetime as dt
import http.server
import json
import os
import socketserver
import sys
import webbrowser

BIN = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BIN)

import hud  # noqa: E402  — the shared data layer
from friday_md import vault_root  # noqa: E402

WEB = os.path.join(BIN, "hud-web")


def build_state(root: str) -> dict:
    now = dt.datetime.now()

    vitals = []
    for key, series in hud.read_vitals(root):
        delta = None
        if len(series) > 1 and series[-2]:
            delta = (series[-1] - series[-2]) / abs(series[-2]) * 100
        vitals.append({
            "key": key,
            "label": key.replace("_", " "),
            "display": hud.human(series[-1]),
            "series": series[-30:],
            "delta": delta,
            "days": len(series),
        })

    blocks, source = hud.read_schedule(root)
    hhmm = now.strftime("%H:%M")
    current = max((i for i, (t, _) in enumerate(blocks) if t <= hhmm), default=-1)
    schedule = [{"time": t, "what": w,
                 "state": "now" if i == current else ("past" if i < current else "next")}
                for i, (t, w) in enumerate(blocks)]

    return {
        "time": now.strftime("%H:%M:%S"),
        "date": now.strftime("%a %d %b"),
        "vault": os.path.basename(root),
        "vitals": vitals,
        "skills": [{"name": n, "status": s, "note": note}
                   for n, s, note in hud.probe_skills(root)],
        "schedule": schedule,
        "scheduleSource": source,
        "audio": hud.read_audio(),
        "log": hud.last_log(root),
    }


def snapshot(root: str, out: str) -> None:
    """One standalone file with the state frozen in — no server, no polling."""
    page = open(os.path.join(WEB, "index.html"), encoding="utf-8").read()
    state = json.dumps(build_state(root), ensure_ascii=False)
    frozen = f"<script>window.__FRIDAY_STATE__ = {state};</script>\n"
    marker = "<!--STATE-->"
    page = page.replace(marker, frozen) if marker in page else frozen + page
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(page)
    print(f"snapshot written to {out}")


def make_handler(root: str):
    class Handler(http.server.BaseHTTPRequestHandler):
        def _send(self, body: bytes, ctype: str, code: int = 200):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            path = self.path.split("?")[0]
            try:
                if path == "/api/state":
                    body = json.dumps(build_state(root), ensure_ascii=False).encode()
                    return self._send(body, "application/json; charset=utf-8")
                if path in ("/", "/index.html"):
                    page = open(os.path.join(WEB, "index.html"), "rb").read()
                    return self._send(page, "text/html; charset=utf-8")
                self._send(b"not found", "text/plain", 404)
            except BrokenPipeError:
                pass                      # browser navigated away mid-response
            except Exception as e:        # a bad page must not take the panel down
                self._send(json.dumps({"error": str(e)}).encode(),
                           "application/json", 500)

        def log_message(self, *a):
            pass                          # a HUD polling every 2s would flood the terminal

    return Handler


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--open", action="store_true", help="open a browser window")
    ap.add_argument("--snapshot", metavar="FILE", help="freeze state to a standalone file")
    ap.add_argument("vault", nargs="?")
    a = ap.parse_args()

    root = vault_root(a.vault)
    if not os.path.isdir(root):
        print(f"no vault at {root}", file=sys.stderr)
        return 2

    if a.snapshot:
        snapshot(root, a.snapshot)
        return 0

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", a.port), make_handler(root)) as srv:
        url = f"http://127.0.0.1:{a.port}/"
        print(f"Friday HUD  {url}\nvault: {root}\nctrl-c to stop")
        if a.open:
            webbrowser.open(url)
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
