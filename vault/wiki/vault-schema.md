---
title: Vault schema
type: wiki
tags: [meta, vault, schema]
created: 2026-08-13
updated: 2026-08-13
summary: Why the vault is three folders of markdown, what each one is for, and which rules exist to stop it rotting.
---

# Vault schema

The enforceable version of this lives in `CLAUDE.md` at the vault root, which
every session reads before writing. This page is the reasoning behind it.

## Three folders

`raw/` is **append-only and never edited**. It holds captures exactly as they
arrived — transcripts, pastes, clips, dumps. The value of a capture is that it is
unaltered; the moment it gets tidied it becomes a summary of unknown fidelity. A
bad capture is corrected by a *new* page that links to it, never by editing it.

`wiki/` is **rewritten constantly**. One page per topic, no dates in filenames,
because a topic is continuous while a capture belongs to a moment. These pages
are supposed to change — a wiki page that hasn't been touched since it was
created is either finished or abandoned, and it's worth knowing which.

`outputs/` is **everything shipped**, dated, and never edited afterwards. A
report is a record of what was said on a particular day. Editing it retroactively
destroys the only thing it was good for.

Material flows `raw/` → `wiki/` → `outputs/` and never backwards.

## Why frontmatter on every page

Six fields — `title`, `type`, `tags`, `created`, `updated`, `summary` — make the
vault queryable with `rg` and nothing else. `summary` is load-bearing: it is what
lands in `index.md`, so it has to make sense read cold, out of context, months
later.

## Why wikilinks instead of folders

Folders force one hierarchy. A page about Stripe revenue belongs equally to
money, to clients, and to reporting, and any folder tree has to pick one. Links
let it belong to all three, and the graph that emerges is the actual shape of the
knowledge rather than the shape of a filing decision made on day one.

The cost is dead links, which is why the schema forbids linking to a page that
doesn't exist. A stub with honest frontmatter is cheap; a link to nothing teaches
the system a topic exists when it doesn't.

## Why an append-only log

`log.md` is what makes the rest trustworthy. `wiki/` pages are rewritten in place,
so without a ledger there is no way to know whether a claim was there yesterday or
appeared this morning. An audit trail that can itself be rewritten is not an audit
trail, so the log is append-only and corrections are new lines.

## The failure mode this is built against

The thing that kills a knowledge vault is not disk failure, it is **plausible
filler** — a paragraph written to complete a section rather than because it was
known. It reads exactly like a fact a week later. Hence the rule: an empty section
is information, and saying "unknown" is always allowed.

See also [[Friday system]].
