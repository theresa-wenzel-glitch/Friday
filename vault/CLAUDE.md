# Vault schema — read this before writing anything

This vault is the memory of the Friday system. It is plain markdown and nothing
else: no database, no cache, no index that isn't itself a file. Everything the
system knows must be readable in a text editor by a person who has never heard
of Friday.

If a rule here conflicts with something a skill wants to do, this file wins.

## Three folders, one job each

| Folder | Holds | Edited after writing? |
|---|---|---|
| `raw/` | Everything captured, unedited. Transcripts, clips, pastes, dumps, scrapes. | **Never.** Append-only. Fix nothing, tidy nothing. |
| `wiki/` | Distilled knowledge. One page per topic, rewritten in place as understanding improves. | **Constantly.** That is the point. |
| `outputs/` | Everything the system ships. Reports, briefs, drafts, plans. | **Never.** A shipped thing is a record of what was said on a day. |

The direction of travel is one-way: `raw/` → `wiki/` → `outputs/`. Raw material
gets distilled into topic pages; topic pages get drawn on to ship things.
Nothing flows backwards.

## Frontmatter — required on every page, no exceptions

```yaml
---
title: Stripe revenue reporting
type: wiki                    # raw | wiki | output | index | log
tags: [metrics, stripe, money]
created: 2026-08-13
updated: 2026-08-13
summary: How revenue is pulled from Stripe, what the numbers mean, what breaks.
---
```

- `title` — sentence case, human. Not the filename.
- `type` — one of the five above. Determines which folder it belongs in.
- `tags` — lowercase, hyphenated, a flat list. Reuse existing tags before coining one; check `index.md` first.
- `created` — the real date, `YYYY-MM-DD`. Never changes.
- `updated` — the real date of the last edit. On `raw/` and `outputs/` pages this equals `created` forever.
- `summary` — one sentence, ≤ 200 characters, stating what the page *contains*. Not what it is "about". This line is the hook that lands in `index.md`, so write it to be read out of context.

Check today's real date before stamping it. Do not infer it from another file.

## Wikilinks

Pages connect with `[[wikilinks]]`, so the vault is a graph rather than a
folder. Link by page title, not path: `[[Stripe revenue reporting]]`.

- Link on **first mention** of a topic that has its own page, then stop. Repeat links are noise.
- **Never link to a page that doesn't exist.** Verify the target before writing the link. If a topic deserves a page it doesn't have, create the page — a stub with real frontmatter and two honest sentences beats a dead link.
- Every `output/` page links back to what it drew on. Every `wiki/` page links to the `raw/` captures it was distilled from. A page nothing links to and that links to nothing is a leak; find its neighbours or delete it.

## Naming

- `raw/YYYY-MM-DD-short-slug.md` — dated, because a capture belongs to a moment.
- `wiki/topic-slug.md` — **no date**, because a topic is continuous. Renaming one means updating every wikilink that points to it.
- `outputs/YYYY-MM-DD-kind.md` — dated, always. `kind` is the producing skill: `metrics`, `inbox`, `plan`, `trends`.

Lowercase, hyphenated, ASCII. No spaces, no umlauts in filenames — put those in `title`.

**Anything a skill produces lands in `outputs/` with the date in the filename.**
A skill never writes to `wiki/` on its own initiative and never writes to `raw/`
except to record a capture verbatim.

## The two ledgers

**`index.md`** — every page in the vault, one line each, with its hook. Regenerate
the affected section on every write; a stale index is worse than none, because it
gets trusted. `bin/vault-index.py` rebuilds it from the files themselves.

**`log.md`** — append-only. One line per write: date, what changed, which file.
Never edit or reorder existing lines. Never delete one. This is the audit trail
that makes the rest of the vault trustworthy; if it can be rewritten it is
worthless.

## Machine-readable vitals

Metrics outputs carry their numbers in frontmatter under `vitals:` so the HUD can
draw trend lines without a database:

```yaml
vitals:
  mrr: 4280
  stripe_net_30d: 5120
  instagram_followers: 3410
  youtube_subscribers: 1180
```

Flat `key: number` pairs only. Same keys every day — a renamed key breaks its own
history. Prose still goes in the body; the frontmatter is the series.

## Rules that are not negotiable

1. **Markdown only.** If something can't be expressed as readable text, it doesn't belong in the vault.
2. **Nothing is written outside this vault without asking first** — not a config file, not a scratch file, not a repo.
3. **`raw/` and `log.md` are append-only.** Correct a bad capture with a new page that links to it and explains the error; never by editing the original.
4. **No secrets, ever.** No API keys, tokens, connection strings, or passwords — not in a page, not in frontmatter, not in a code block, not in an example. Credentials live in the macOS Keychain. If a capture contains one, redact it before it lands and note the redaction.
5. **Say when you don't know.** An empty section is information. A plausible-sounding filler paragraph is corruption, and this vault is the system's memory.
