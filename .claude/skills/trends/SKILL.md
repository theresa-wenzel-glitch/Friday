---
name: trends
description: Scan the user's tracked sources — AI and tech news, named competitor sites, and social/search chatter on their topics — and report only what changed since the last run. Use for "what's new", "anything happen today", "what moved", "check the feeds", "what's happening in AI", "any news on <company or topic>", or a research catch-up. Do not use for the user's own numbers (that is metrics), for mail and calendar (that is inbox), or for one-off research on a question they just asked, which is ordinary web search.
---

# trends

Report the delta, not the landscape. Most days this is short. Some days it is empty, and empty is a valid, useful answer.

## Sources

The source list is user-maintained at `<vault>/Friday/trends-sources.md`, read through the **vault** skill. It has three sections:

```markdown
## AI & tech
## Competitors & sites
## Chatter          # topics, names, and search terms to watch
```

Read it first, every run. It is the source of truth — never substitute your own idea of what is worth watching.

If the file does not exist, do not invent sources. Draft a starter list from what you know of the user's work, show it, and only write it after they approve it.

## Scanning

- **AI & tech** — release notes, changelogs, and announcements from the named projects; model and tool releases relevant to work they actually do. Skip commentary and hot takes; report the thing itself.
- **Competitors & sites** — fetch each and compare against what the last run recorded. New pages, changed pricing, new positioning, shipped features. Cosmetic and copy churn is not a change.
- **Chatter** — search for the tracked topics and names across the web and social. Report a mention only if it has traction or comes from someone who matters in that space; a single low-engagement post is noise.

## The delta

Read the most recent file in `<vault>/Friday/Trends/` and compare. Anything already reported there is not news, even if it is still on the front page today. If there is no prior run, say this is a baseline and keep it to the five most significant items.

## Output

Grouped under the three section names, only sections that have something. Per item: what changed, one line on why it matters to this user specifically — their client work, their content, or their research — and a link.

Rank by what would change a decision. Cap at seven items; if more qualify, report the seven and note the count you dropped.

If nothing moved, say "Nothing moved since yesterday" and stop. Do not fill the space with background, context, or things that were already true.

## Persisting

Hand the report to the **vault** skill for `<vault>/Friday/Trends/YYYY-MM-DD.md`, including the URLs checked so the next run can diff against them. Do not write files directly.
