---
name: vault
description: Read, search, and write notes in the user's Obsidian vault (iCloud). Use whenever a note must be found, quoted, appended to, or created — "save this", "put it in my vault", "what did I write about X", "check my notes on Y", "add to today's daily note" — and as the mandatory write path for every other Friday skill (metrics, inbox, trends, plan), which never touch the filesystem themselves. Also use before answering any question that prior notes would settle. Do not use for reading mail or calendar (that is inbox) or for fetching external data (that is metrics or trends).
---

# vault

The single read/write surface for the user's notes. Every other Friday skill produces text and hands it here. Nothing else writes to disk.

## Locating the vault

The vault lives in iCloud Drive. Resolve it fresh each run — do not hardcode a vault name:

```bash
VAULT_PARENT="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents"
ls -1 "$VAULT_PARENT"
```

- Exactly one directory → that is the vault root.
- More than one → **stop and ask which one.** Do not guess.
- Directory missing → iCloud Drive or Obsidian sync is not set up on this machine. Say so and stop. Do not create a substitute vault somewhere else.

Quote the path in every command; it contains spaces.

## Layout

Friday's output is confined to a `Friday/` folder so it never mixes with the user's own notes:

```
<vault>/Friday/Metrics/YYYY-MM-DD.md
<vault>/Friday/Inbox/YYYY-MM-DD.md
<vault>/Friday/Trends/YYYY-MM-DD.md
<vault>/Friday/Plans/YYYY-MM-DD.md
<vault>/Friday/trends-sources.md      # user-maintained, read-only to Friday
```

The user's own notes live outside `Friday/` and are **read-only** unless they ask for a specific edit in that moment.

## The write rule

Writes are allowed inside the resolved vault root and nowhere else.

Before writing **anywhere outside the vault** — a repo, `~/Documents`, `/tmp`, a config file, anything — say what you want to write, where, and why, and wait for a yes. This holds even when another skill asked for it, and even when it seems obviously fine.

Writing inside `<vault>/Friday/` needs no confirmation. Writing to the user's own notes outside `Friday/` needs confirmation naming the exact file.

## Writing

- Files are UTF-8 markdown. Dated files use `YYYY-MM-DD.md`, always today's real date — check it, don't assume.
- Every file Friday creates gets frontmatter:
  ```yaml
  ---
  created: 2026-08-13
  source: friday/metrics
  tags: [friday, metrics]
  ---
  ```
- If the target file already exists, **append under a new `## HH:MM` heading**. Never overwrite a file that has content in it.
- Use Obsidian conventions the vault already uses: `[[wikilinks]]` between Friday notes and to existing notes when the name matches something real. Check that a link target exists before creating the link — a link to nothing is worse than plain text.
- Write in prose. These are notes to be reread, not logs.

## Reading and searching

- Search with `rg` from the vault root, e.g. `rg -il "supabase" "$VAULT/"`.
- When answering from notes, quote the source file so it can be opened: `Friday/Trends/2026-08-11.md`.
- If a search returns nothing, say so plainly rather than answering from memory and implying the vault backed it up.

## Reporting

After a write, state one line: what was written, to which path, appended or created. No summaries of the content that was just saved — it is in the file.
