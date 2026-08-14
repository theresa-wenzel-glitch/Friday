---
name: plan
description: Decide today's top three priorities and write them to a dated markdown file in the vault. Use for "plan my day", "what should I work on", "top three", "priorities", "set up today", or when the user has just read their morning brief and needs to turn it into a decision. Also use to revise the day when something lands that changes it. Do not use for scanning mail and calendar (that is inbox, which runs first) or for tracking what they finished, which belongs in the daily note via vault.
---

# plan

Three priorities. Not five, not a task list — the three things that, if done, make the day a good one.

## Inputs, in order

1. **Today's brief**, if **inbox** already ran this session — reuse it, do not rescan mail.
2. **Yesterday's plan** — the most recent `<vault>/outputs/*-plan.md`, read via **vault**. Anything unfinished is a candidate, and something that has rolled over twice either goes in first today or gets dropped out loud.
3. What the user says they want. This overrides everything above.

If none of these exist, ask what is on their plate rather than inventing priorities.

## Choosing

The user's work splits three ways: client and freelance, content and audience, research and learning. A good day usually takes one from each, because the three decay at different speeds — client work has other people's deadlines, content has momentum, research has neither and so is always the one that quietly loses.

Break the pattern when the day is genuinely lopsided: a client deadline tomorrow can take two of the three slots. Say when you are doing that and why.

Each priority must be:

- **A finishable thing**, not an area. "Send the revised scope to <client>" — not "client work".
- **Sized to the free hours** the brief reported. Three items that cannot fit in the available time is not a plan.
- **Owned by the user.** Anything blocked on someone else is a follow-up, not a priority.

## Output

```markdown
---
title: Plan YYYY-MM-DD
type: output
tags: [friday, plan]
created: YYYY-MM-DD
updated: YYYY-MM-DD
summary: Three priorities for the day, one line on what each is for.
schedule:
  - 09:00 Client scope revision — send before noon
  - 13:00 Record the walkthrough segment
  - 16:00 Reading block — defended
---

# Plan — YYYY-MM-DD

1. **<Priority>** — why it is today, and what done looks like.
2. **<Priority>** — …
3. **<Priority>** — …

## Rolled over
- …            # from yesterday, with how many days it has been carried

## Not today
- …            # what was consciously dropped, so it is not silently lost
```

Keep "Not today" honest — it is the part that makes the three credible.

## Persisting

Hand the file to the **vault** skill for `<vault>/outputs/YYYY-MM-DD-plan.md`. Do not write it yourself, and do not write a copy anywhere outside the vault without asking first.

The `schedule:` block is what the HUD draws its timeline from, so give each priority a real start time in `HH:MM What it is` form — 24-hour, zero-padded, one list entry per block, in order. Include the fixed commitments the brief surfaced, not only the three priorities; a timeline missing the 11:00 call is worse than no timeline. Omit the block entirely rather than inventing times the user never agreed to.

Then say the three priorities back in one short paragraph. The user should not have to open the file to know what the day is.
