---
name: metrics
description: Pull the user's business and audience numbers from Stripe, Supabase/Postgres, Instagram, and YouTube, and report them as a short written summary with deltas since the last run. Use when they ask for "my metrics", "my numbers", "how are we doing", "how did last week go", revenue or MRR, subscriber or follower counts, signups or new rows, or ask for a weekly/monthly review. Credentials come from the macOS Keychain, never from the user. Do not use for mail or calendar (that is inbox), for what changed in the outside world (that is trends), or for writing files directly (that is vault).
---

# metrics

Fetch the numbers, compare them to the last run, and write four to eight sentences of prose. Not a dashboard, not a table dump.

## Credentials — macOS Keychain only

Never ask the user to paste a key, never read `.env` files, never echo a secret into the transcript or a note.

```bash
security find-generic-password -s <service> -a <account> -w
```

| Platform | service | account |
|---|---|---|
| Stripe | `friday-stripe` | `secret-key` |
| Supabase/Postgres | `friday-supabase` | `connection-string` |
| Instagram | `friday-instagram` | `access-token` |
| Instagram | `friday-instagram` | `user-id` |
| YouTube | `friday-youtube` | `api-key` |
| YouTube | `friday-youtube` | `channel-id` |

Assign the result to a shell variable and pass it as an env var or header. It must never appear in a command line that gets logged, and never in a file.

If an item is missing, `security` exits non-zero. **Skip that platform, continue with the rest, and report the gap at the end** with the exact command to fix it:

```bash
security add-generic-password -s friday-stripe -a secret-key -w
```

One missing key never aborts the whole run.

## What to pull

- **Stripe** — gross volume and net for the period, new and canceled subscriptions, current MRR. This is the freelance and client income line; it matters most.
- **Supabase/Postgres** — the product counts: new rows since the last run in the tables that represent real activity (signups, submissions, whatever the schema shows). Inspect the schema first if unfamiliar; do not assume table names.
- **Instagram Graph API** — follower count, and reach or engagement on anything posted in the window.
- **YouTube Data API** — subscriber count, views in the window, and which video moved.

Default window: since the previous metrics run. If there is no previous run, use the last 7 days and say it is a baseline.

## Deltas

Read the most recent file in `<vault>/Friday/Metrics/` (via the **vault** skill) and diff against it. A number with no comparison is close to useless — always report the direction and size of the move, or state that this is the first run.

## The summary

Written English, in this order: money, then product, then audience. Lead with what actually moved. Name the one number that should change what the user does today, and say why. If nothing moved meaningfully, say that in a sentence instead of padding.

Flag anything that looks broken — a count at zero that is usually not, an API returning stale data — as a caveat, not as a real result.

## Persisting

Hand the finished summary to the **vault** skill for `<vault>/Friday/Metrics/YYYY-MM-DD.md`. Raw numbers go in the note, secrets never do. Do not write any file yourself.
