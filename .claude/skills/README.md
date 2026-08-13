# Friday — skill layer

Five small, single-purpose Claude Code skills. Only the one matching the request
loads, so the context stays clean.

| Skill | Job | Fires on |
|---|---|---|
| `vault` | Read/write the Obsidian vault. The only thing that writes to disk. | "save this", "what did I write about…", and every other skill's persist step |
| `inbox` | Morning brief from Apple Mail + iCloud Calendar. Three items, no padding. | "what's on today", "catch me up", "anything I need to deal with" |
| `plan` | Today's top three priorities → dated markdown. | "plan my day", "what should I work on", "top three" |
| `metrics` | Stripe, Supabase, Instagram, YouTube → short written summary with deltas. | "my numbers", "how are we doing", "weekly review" |
| `trends` | Tracked sources → only what moved since yesterday. | "what's new", "anything happen today", "check the feeds" |

## Install

These live in the repo so they survive; Claude Code reads them from home:

```sh
mkdir -p ~/.claude/skills
cp -r .claude/skills/{vault,metrics,inbox,trends,plan} ~/.claude/skills/
```

## Setup on a new machine

**Vault** — resolved at runtime from
`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/`. If more than one
vault is there, `vault` asks rather than guessing. Friday's output is confined
to a `Friday/` subfolder; the rest of the vault is read-only unless you ask for
a specific edit.

**Credentials** — macOS Keychain only. Nothing is stored in this repo, in a
`.env`, or in the vault.

```sh
security add-generic-password -s friday-stripe    -a secret-key        -w
security add-generic-password -s friday-supabase  -a connection-string -w
security add-generic-password -s friday-instagram -a access-token      -w
security add-generic-password -s friday-instagram -a user-id           -w
security add-generic-password -s friday-youtube   -a api-key           -w
security add-generic-password -s friday-youtube   -a channel-id        -w
```

`metrics` skips any platform whose key is missing and reports the gap instead
of failing the run.

**Trend sources** — `metrics` and `inbox` need no config, but `trends` reads its
source list from `<vault>/Friday/trends-sources.md`, with sections
`## AI & tech`, `## Competitors & sites`, `## Chatter`. It will draft one for
approval if the file doesn't exist.

**macOS permissions** — the first `inbox` run triggers automation prompts for
Mail and Calendar. Approve both, or the brief comes back empty.

## The rule that matters

Nothing writes outside the vault without telling you first — including these
skills writing to each other, to the repo, or to a config file.
