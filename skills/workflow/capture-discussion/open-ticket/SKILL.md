---
name: open-ticket
description: Create a remote tracker ticket (GitHub Issues, Jira, Linear, ClickUp, …) from a brand-new idea — use when an idea needs a work-item home in the team's tracker before (or instead of) a local thread, so a later thread can link it as read-context.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.3.1
---

# Open Ticket

Create **one remote tracker ticket** from a brand-new idea. Take the user's idea, turn it into a ticket title and a body that captures the idea, create the ticket in the single owning tracker, and surface the created ticket's URL/identifier back to the user. That URL is what a local thread later links from its seed's `External:` line.

## Procedure

1. **Preflight first, before any substantive execution.** Run both gates from `## Prerequisite Preflight`. If either fails, stop and refuse without drafting or creating anything, ending with exactly one terminal line: `Outcome: REFUSED — <what is missing and how to supply it>`.

2. **Draft the ticket from the idea.** Compose the title and body described in `## Drafting the Ticket From the Idea`.

3. **Create the ticket — once — in the owning tracker.** Use the tracker's CLI/API to create exactly one ticket, per `## The Only Tracker Write, Made Once` and `## Single Ownership of Work-Item Status`.

4. **Surface the result.** Return the created ticket's URL/identifier to the user plainly, so it can seed a thread's `External:` line. No preamble, no closing remark. End with exactly one terminal line: `Outcome: DONE — Ticket created: <URL/identifier>`.

## The Only Tracker Write, Made Once

Being invoked here is the sole authorization to create a ticket: in this workflow exactly one skill writes to the tracker, and it is this one. Its only write anywhere is that single remote ticket — it touches no repo file and no git (no staging, committing, pushing, or branching).

The skill creates the ticket, hands back its URL, and stops. There is no ongoing sync between the repo and the tracker — two systems kept in continuous step always rot — so once the ticket exists the skill leaves it in place: it does not poll, re-sync, write repo state back onto the ticket, update it, re-run to refresh it, or close it. Any comment, transition, or close on a ticket happens only when the user explicitly asks.

## Single Ownership of Work-Item Status

Work-item / PM status — priority, assignee, In Progress / Blocked / Done — is owned by **exactly one system, and it is never the filesystem.** Create the ticket in the **single owning tracker** and nowhere else:

- **Solo / personal / OSS:** GitHub Issues — adjacent to the code, auto-links commits and PRs, zero process cost.
- **Company contexts with PM/stakeholder visibility:** the company tracker (Jira, Linear, ClickUp, …) — because that is where non-engineers look.

One idea, one ticket, in the one system that owns work-item status. The repo holds the code, the tracker holds the PM state, and threads hold the thinking — different facts, not the same fact stored twice, so there is never a second copy of the ticket in another tracker. If which tracker owns status is unclear, that is a preflight failure (see `## Prerequisite Preflight`).

## Prerequisite Preflight (The Defining Behavior)

This skill runs a mandatory preflight before any substantive execution — before it drafts or creates anything. Ticket drafting and creation start **only** after the complete preflight passes; a clean up-front failure is always preferable to a partial creation that leaves the tracker in an inconsistent state.

The preflight has two gates, both checked before any side-effecting step:

1. **Resolve the owning tracker.** Determine which single tracker owns work-item status (see `## Single Ownership of Work-Item Status`).
2. **Confirm the tracker tool is reachable.** Verify the owning tracker's CLI is installed and authenticated, or its API token / credentials are present and valid (for example: the relevant CLI responds to an auth/whoami check, or the configured token is set in the environment).

If either gate fails, STOP immediately and refuse: emit a clear message naming **exactly what is missing** (the ownership choice, or which CLI/binary, credential, or token) and **how to provide it** (choose the owning tracker, install the CLI, run its auth/login command, set the token env var), write nothing, and end with exactly one terminal line: `Outcome: REFUSED — <what is missing and how to supply it>`. Do not compose the ticket or leave any half-built state behind. A preflight refusal is never a pending decision — the run never started, so no bundle is emitted.

## Drafting the Ticket From the Idea

The ticket's content comes from the user's brand-new idea:

- **Title** — a concise, descriptive summary of the idea (the work-item's headline).
- **Body / description** — a short narrative capturing the idea: what it is, why it matters, and any context the user gave. Keep it to what the user actually provided or confirmed; do not invent scope, acceptance criteria, or design decisions the user did not state. If you surface a timestamp in the body, write it as the 12-character UTC stamp `YYMMDDHHMMSSZ` — two-digit year, month, day, hour (24h), minute, second, then a literal trailing `Z`, no separators (e.g. `260612174045Z`).

## Clean Ticket-First Ordering

The clean composition is **ticket-first**: create the ticket here so that when a local thread is opened afterward, the ticket's URL is already in hand and can be recorded in the seed's `External:` field at the moment the thread is created. A thread references its tracker ticket through that `External:` field — a passive read-context pointer, the one join point between the repo and the tracker.

Two usage shapes are both valid:

- **Standalone** — the user just wants a ticket created from an idea, with no local thread (yet or ever). Create the ticket, return its URL, stop.
- **First step before a thread** — create the ticket here, hand back its URL, and the user (or a separate thread-opening step) opens the local thread next and links this ticket from the seed.

Either way, this skill's output is the same: one ticket in the owning tracker, with its URL returned to the user. Opening the thread, writing the seed, and filling in its `External:` field all belong to the separate thread-opening skill.
