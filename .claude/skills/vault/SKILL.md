---
name: vault
description: Read, search, and write notes in the user's Obsidian vault (iCloud). Use whenever a note must be found, quoted, appended to, or created — "save this", "put it in my vault", "what did I write about X", "check my notes on Y", "add to today's daily note" — and as the mandatory write path for every other Friday skill (metrics, inbox, trends, plan), which never touch the filesystem themselves. Also use before answering any question that prior notes would settle. Do not use for reading mail or calendar (that is inbox) or for fetching external data (that is metrics or trends).
---

# vault

The single read/write surface for the user's notes. Every other Friday skill produces text and hands it here. Nothing else writes to disk.

## Locating the vault

Resolve fresh each run, in this order:

1. `$FRIDAY_VAULT` if set.
2. The `vault/` directory next to `bin/` in the Friday repo.
3. `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/<name>` — list that folder; exactly one directory means that is it, more than one means **stop and ask.**

Quote every path; the iCloud one contains spaces.

**Read `<vault>/CLAUDE.md` before the first write of a session.** It is the schema contract and it wins over anything in this file.

## Layout

Three folders, one job each. See `CLAUDE.md` for the full rules.

```
<vault>/CLAUDE.md                       the schema — read first, never edited by a skill
<vault>/index.md                        generated; rebuild with bin/vault-index.py
<vault>/log.md                          append-only ledger of every write
<vault>/raw/YYYY-MM-DD-slug.md          captures, verbatim, never edited
<vault>/wiki/topic-slug.md              distilled topics, no dates, rewritten freely
<vault>/outputs/YYYY-MM-DD-<skill>.md   everything shipped, never edited after
```

Material flows `raw/` → `wiki/` → `outputs/` and never backwards.

Skill output **always** lands in `outputs/` with the date in the filename and the producing skill as the suffix: `2026-08-13-metrics.md`, `-inbox.md`, `-trends.md`, `-plan.md`. A skill writes to `raw/` only to record a capture verbatim, and to `wiki/` only when the user asks for it in that moment.

## The write rule

Writes are allowed inside the resolved vault root and nowhere else.

Before writing **anywhere outside the vault** — a repo, `~/Documents`, `/tmp`, a config file, anything — say what you want to write, where, and why, and wait for a yes. This holds even when another skill asked for it, and even when it seems obviously fine.

The one standing exception, already agreed: `~/.friday/` holds runtime assets — STT and TTS models, `audio-state`, logs. Never memory, never notes.

## Writing

- UTF-8 markdown. Dated filenames use today's **real** date — check it, don't assume.
- Every page carries the full six-field frontmatter from `CLAUDE.md`: `title`, `type`, `tags`, `created`, `updated`, `summary`. No exceptions, including stubs.
- `summary` is one sentence, ≤ 200 characters, saying what the page *contains*. It becomes the page's line in `index.md`, so it must read cold and out of context.
- Reuse an existing tag before coining one — check `index.md`, which lists every tag in use.
- **Never overwrite a file with content.** In `raw/` and `outputs/`, append under a new `## HH:MM` heading. In `wiki/`, rewriting in place is correct and expected — that is what those pages are for.
- `[[Wikilinks]]` by page title, not path. **Verify the target exists first**; if the topic deserves a page it doesn't have, create an honest stub rather than leaving a dead link.
- Write prose. These are notes to be reread, not logs.

## After every write, both ledgers

1. Append one line to `log.md`: `YYYY-MM-DD  create|update  path — what and why`. Never edit or reorder existing lines.
2. Rebuild the index: `python3 bin/vault-index.py`. It regenerates `index.md` and audits the schema — missing frontmatter, dead links, orphans, misfiled types. **If it reports problems in a page you just wrote, fix them before reporting done.**

## Reading and searching

- Search with `rg` from the vault root, e.g. `rg -il "supabase" "$VAULT/"`.
- When answering from notes, quote the source file so it can be opened: `Friday/Trends/2026-08-11.md`.
- If a search returns nothing, say so plainly rather than answering from memory and implying the vault backed it up.

## Reporting

After a write, state one line: what was written, to which path, appended or created. No summaries of the content that was just saved — it is in the file.
