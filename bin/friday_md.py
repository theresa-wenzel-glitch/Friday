"""Minimal markdown/frontmatter reader for the Friday vault.

Standard library only, on purpose: the vault has to stay readable and its tools
have to keep running on a machine with no pip install. This is not a general
YAML parser — it handles exactly the subset the vault schema uses.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field

FRONTMATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n?(.*)\Z", re.S)
WIKILINK = re.compile(r"\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]")


def _scalar(raw: str):
    """Coerce a YAML scalar. Numbers become numbers so vitals can be plotted."""
    v = raw.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    if v in ("true", "false"):
        return v == "true"
    if v in ("", "null", "~"):
        return None
    try:
        return int(v)
    except ValueError:
        pass
    try:
        return float(v)
    except ValueError:
        pass
    return v


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Return (frontmatter dict, body). Missing frontmatter yields ({}, text)."""
    m = FRONTMATTER.match(text)
    if not m:
        return {}, text
    data: dict = {}
    key = None          # current key awaiting a block value
    listbuf: list | None = None
    mapbuf: dict | None = None

    def flush():
        nonlocal key, listbuf, mapbuf
        if key is not None:
            if listbuf is not None:
                data[key] = listbuf
            elif mapbuf is not None:
                data[key] = mapbuf
        key, listbuf, mapbuf = None, None, None

    for line in m.group(1).split("\n"):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indented = line[0] in " \t"
        stripped = line.strip()

        if indented and key is not None:
            if stripped.startswith("- "):
                listbuf = listbuf if listbuf is not None else []
                listbuf.append(_scalar(stripped[2:]))
            elif ":" in stripped:
                mapbuf = mapbuf if mapbuf is not None else {}
                k, _, v = stripped.partition(":")
                mapbuf[k.strip()] = _scalar(v)
            continue

        flush()
        if ":" not in stripped:
            continue
        k, _, v = stripped.partition(":")
        k, v = k.strip(), v.strip()
        if v == "":
            key = k                       # block value on following lines
        elif v.startswith("[") and v.endswith("]"):
            inner = v[1:-1].strip()
            data[k] = [_scalar(x) for x in inner.split(",")] if inner else []
        else:
            data[k] = _scalar(v)
    flush()
    return data, m.group(2)


@dataclass
class Page:
    path: str                  # vault-relative, e.g. "wiki/research.md"
    meta: dict
    body: str
    links: list[str] = field(default_factory=list)

    @property
    def folder(self) -> str:
        return self.path.split("/")[0] if "/" in self.path else ""

    @property
    def title(self) -> str:
        return str(self.meta.get("title") or os.path.basename(self.path)[:-3])

    @property
    def summary(self) -> str:
        return str(self.meta.get("summary") or "").strip()

    def missing_fields(self) -> list[str]:
        return [f for f in ("title", "type", "tags", "created", "updated", "summary")
                if f not in self.meta or self.meta.get(f) in (None, "", [])]


def load_vault(root: str, skip=("CLAUDE.md", "index.md")) -> list[Page]:
    """Every .md page under the vault root, sorted by path."""
    pages = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for fn in filenames:
            if not fn.endswith(".md"):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root)
            if rel in skip:
                continue
            try:
                text = open(full, encoding="utf-8").read()
            except OSError:
                continue
            meta, body = parse_frontmatter(text)
            pages.append(Page(rel, meta, body, WIKILINK.findall(text)))
    return sorted(pages, key=lambda p: p.path)


def vault_root(explicit: str | None = None) -> str:
    """Resolve the vault: explicit arg, then $FRIDAY_VAULT, then repo-relative."""
    if explicit:
        return os.path.abspath(os.path.expanduser(explicit))
    env = os.environ.get("FRIDAY_VAULT")
    if env:
        return os.path.abspath(os.path.expanduser(env))
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(os.path.dirname(here), "vault")
