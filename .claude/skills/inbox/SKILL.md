---
name: inbox
description: The morning brief. Scan Apple Mail and iCloud Calendar and return the three things that genuinely need the user today — nothing else. Use for "morning brief", "what's on today", "anything I need to deal with", "catch me up", "what did I miss", "what's in my inbox", or any first-thing-in-the-morning check-in. Also use when they ask whether a specific person or client has replied. Do not use for choosing what to work on (that is plan, which runs after this) or for business numbers (that is metrics). If the user asks for the brief as a rendered page or artifact, the separate `morning` skill handles presentation — this one produces the text.
---

# inbox

Read mail and calendar, then hand back **exactly three items**. The value is in what gets left out.

## Reading calendar

Prefer `icalBuddy` when installed — it is fast and Calendar.app scripting is not:

```bash
icalBuddy -n -nc -df "%Y-%m-%d" -tf "%H:%M" eventsToday
```

Otherwise fall back to `osascript` against Calendar.app for today's events on the iCloud calendars. If the first Calendar or Mail access of the session triggers a macOS automation permission prompt, tell the user to approve it rather than silently returning empty results — an empty brief that is actually a permissions failure is the worst possible output.

## Reading mail

`osascript` against Mail.app. Pull unread and flagged messages from the last 48 hours across accounts — sender, subject, date, and the first ~200 characters. Do not fetch full bodies for everything; open a message only when it is a candidate for the final three.

## Choosing the three

The user's day is client and freelance work, content and audience, and research. Rank accordingly:

1. **Someone is blocked on a reply.** A client, a collaborator, an editor waiting on the user. Anything with a stated deadline inside 48 hours.
2. **A commitment that is fixed in time today.** A call or meeting that needs preparation, travel, or a decision beforehand — a meeting that needs nothing is not a brief item, it is a calendar entry.
3. **Money or contract.** Invoices, quotes, scope changes, anything unsigned.

Explicitly not brief items: newsletters, notifications, receipts, automated mail, anything the user is cc'd on for information only, and anything already handled. Research reading is never a brief item — it belongs to **trends**.

If fewer than three things qualify, return fewer and say the day is clear. Never pad to three.

## Output

Three items. Each one: what it is, who it is from, why it is today's problem, and the first concrete action — reply, prepare, decide, or send. One or two sentences each, no bullets nested inside bullets.

Then one line for the shape of the day: how many fixed hours are committed and where the free block is.

Never quote email content that looks private beyond what is needed to identify the item.

## Persisting

Hand the brief to the **vault** skill for `<vault>/outputs/YYYY-MM-DD-inbox.md`. Do not write files directly. The output of this skill is the natural input to **plan** — if the user then asks for priorities, pass the three items along rather than re-scanning mail.
