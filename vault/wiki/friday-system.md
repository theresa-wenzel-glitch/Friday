---
title: Friday system
type: wiki
tags: [meta, friday, architecture]
created: 2026-08-13
updated: 2026-08-13
summary: The personal AI operating system — five skills, one markdown vault, a terminal HUD, and a local voice layer, and how they connect.
---

# Friday system

A personal operating system assembled from four layers that only touch each other
through files. No service, no daemon holding state, nothing that stops working
when a process dies.

## The layers

**Skill layer** — five single-purpose Claude Code skills in `~/.claude/skills/`.
Only the one matching a request loads, so context stays clean. `metrics` pulls
numbers, `inbox` reads mail and calendar, `trends` watches sources, `plan` picks
the day's three priorities, and `vault` is the only one that writes to disk.

**Memory layer** — this vault. See [[Vault schema]]. Every other layer reads from
it and writes through it. Because it is plain markdown, the system's entire
memory can be read, edited, or thrown away with a text editor.

**Display layer** — a terminal HUD (`bin/hud.py`) that reads the vault directly
and renders vitals, skill status, today's schedule, and audio state. It holds no
state of its own; kill it and nothing is lost.

**Voice layer** — local push-to-talk. Speech to text and text to speech both run
on-machine, so audio never leaves it. The transcript goes into Claude Code as a
prompt and the reply is spoken back.

## How a day flows through it

`inbox` reads mail and calendar and hands back the three things that need a
response → `plan` turns those into three priorities and ships
`outputs/YYYY-MM-DD-plan.md` → the HUD picks that file up and lights the current
block → work happens against [[Client work]], [[Content and audience]], and
[[Research]] → `metrics` and `trends` write their own dated outputs → anything
worth keeping gets distilled from `raw/` into a `wiki/` page.

## Design commitments

- **One job per skill.** A large prompt that does everything loads everything; five small ones load only what matched.
- **Files over state.** Every layer's contract is a file on disk in a documented format. Any layer can be rewritten in a different language without touching the others.
- **Secrets stay in the macOS Keychain.** Never the vault, never a `.env`, never the repo.
- **Nothing writes outside the vault without asking first.**

## Known gaps

- The HUD's audio panel reads a state file the voice layer writes; before the voice layer is installed it shows `unknown`, which is correct rather than broken.
- `trends` has no source list until `wiki/` gets a page naming the feeds to watch.
- Nothing yet distils `raw/` into `wiki/` automatically. That is deliberate for now — distillation is the part worth doing by hand.
