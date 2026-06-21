---
name: open-ticket
description: Create a remote tracker ticket (GitHub Issues, Jira, Linear, ClickUp, …) from a brand-new idea — the only skill in the workflow that writes to the tracker — use when an idea needs a work-item home in the team's tracker before (or instead of) a local thread, so a later thread can link it from its seed.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Open Ticket

Create **one remote tracker ticket** from a brand-new idea. Take the user's idea, turn it into a ticket title and a body that captures the idea, create the ticket in the single owning tracker, and surface the created ticket's URL/identifier back to the user. That URL is what a local thread later links from its seed's `External:` line.

This skill restates the rules it relies on inline; it does not depend on any document outside its own folder.

## This Is the Only Skill That Writes to the Tracker

In this workflow, **exactly one skill writes to the tracker, and it is this one.** Every other skill reads the tracker at most, or links to it one-directionally — through a seed's `External:` line, a one-time backlink comment, or a commit/PR reference. Nothing else creates, updates, or closes a ticket on the agent's behalf.

That makes the contract here narrow and strict: this skill performs **a single creation act** and stops. It does **not** poll the tracker, re-sync status, mirror the repo's state back onto the ticket, or update the ticket after creating it. The terminal close of the ticket happens once, much later, at finish — not here.

## One-Time Creation, Never Ongoing Sync

The repo and the tracker **link once and shake hands exactly once**, never continuously. The single link is a thread seed's `External:` line; the single handshake is at finish (the spec reaches implemented, the ticket is closed, the ledger gains its terminal disposition). Between those two points the two systems **do not mirror**, because continuous mirroring is the dual-tracking that always rots.

This skill lives entirely inside the first half of that picture: it **creates** the ticket. It is forbidden from doing any of the things continuous sync would do:

- It does not keep the ticket and a local artifact in step.
- It does not re-read the ticket to reconcile state.
- It does not write status, progress, or spine position back onto the ticket.
- It does not re-run to "refresh" a ticket it already made.

Create the ticket, hand back its URL, done.

## Single Ownership of Work-Item Status

Work-item / PM status — priority, assignee, In Progress / Blocked / Done — is owned by **exactly one system, and it is never the filesystem.** Create the ticket in the **single owning tracker** and nowhere else:

- **Solo / personal / OSS:** GitHub Issues — adjacent to the code, auto-links commits and PRs, zero process cost.
- **Company contexts with PM/stakeholder visibility:** the company tracker (Jira, Linear, ClickUp, …) — because that is where non-engineers look.

**Never mirror into a second tracker.** Do not create the same ticket in GitHub Issues *and* a company tracker; do not duplicate a ticket across trackers "for visibility." One idea, one ticket, in the one system that owns work-item status. The repo holds the truth, the tracker holds the PM state, and threads hold the thinking — these are different facts, not the same fact stored twice. If which tracker owns status is unclear, ask the user before creating anything.

## Prerequisite Preflight (The Defining Behavior)

This skill **requires the tracker's CLI or API** to do its one job, so it follows the prerequisite-preflight rule: **check the prerequisite is available FIRST, before any side-effecting step, and fail the whole instruction cleanly with a clear warning if it is missing.** Never begin creating the ticket and break partway.

Concretely, before drafting or creating anything:

1. **Confirm the tracker tool is reachable.** Determine which tracker owns status, then verify its CLI is installed and authenticated, or its API token / credentials are present and valid (for example: the relevant CLI responds to an auth/whoami check, or the configured token is set in the environment).
2. **If it is available**, proceed to draft the ticket and create it.
3. **If it is missing or unauthenticated**, STOP immediately. Emit a clear warning that names **exactly what is missing** (which CLI/binary, which credential or token, which tracker) and **how to provide it** (install the CLI, run its auth/login command, set the token env var). Do **not** start composing the ticket, do **not** create a partial ticket, do **not** leave half-built state behind.

Preflight comes before any side-effecting step — the failure mode this prevents is running until something breaks mid-flight and leaving the tracker in an inconsistent state. A clean up-front failure is always preferable to a partial creation.

## Drafting the Ticket From the Idea

The ticket's content comes from the user's brand-new idea:

- **Title** — a concise, descriptive summary of the idea (the work-item's headline).
- **Body / description** — a short narrative capturing the idea: what it is, why it matters, and any context the user gave. Keep it to what the user actually provided or confirmed; do not invent scope, acceptance criteria, or design decisions the user did not state.

Create the ticket in the owning tracker with that title and body, using the tracker's CLI/API. Then **surface the created ticket's URL/identifier back to the user**, plainly, so they can use it to seed a thread's `External:` line.

## Clean Ticket-First Ordering

The clean composition is **ticket-first**: create the ticket here so that when a local thread is opened afterward, the ticket's URL is already in hand and can be baked into the seed's `External:` line at the moment the thread is created. (A thread links its tracker ticket through that single `External:` line — the one join point between the repo and the tracker. The skill that opens the local thread is the one that writes the seed and its `External:` line and posts the one-time backlink comment on the ticket; this skill does none of that.)

Two usage shapes are both valid:

- **Standalone** — the user just wants a ticket created from an idea, with no local thread (yet or ever). Create the ticket, return its URL, stop.
- **First step before a thread** — create the ticket here, hand back its URL, and the user (or a separate thread-opening step) opens the local thread next and links this ticket from the seed.

Either way, this skill's output is the same: one ticket in the owning tracker and its URL returned to the user. It does **not** open a thread, write a seed, write a ledger, or write any thread file — those belong to the local-thread skill.

## UTC Stamp

If you reference a timestamp anywhere (e.g. in the ticket body), use the 12-character UTC stamp `YYMMDDHHMMSSZ` — two-digit year, month, day, hour (24h), minute, second, then a literal trailing `Z`, no separators (e.g. `260612174045Z`). This skill writes no thread files, so it has no filenames to stamp; the stamp grammar is noted only for any timestamp you surface.

## Workflow

1. **Preflight the tracker FIRST.** Determine which single tracker owns work-item status. Verify its CLI/API is installed and authenticated (or its token/credentials are present and valid). If the tracker is unclear, ask the user. If the prerequisite is missing, STOP and fail the whole instruction with a clear warning naming what is missing and how to provide it — do not begin creating the ticket.

2. **Draft the ticket from the idea.** Compose a concise title and a short body/description capturing the user's brand-new idea. Do not invent scope or decisions the user did not state.

3. **Create the ticket — once — in the single owning tracker.** Use the tracker's CLI/API to create exactly one ticket. Do not duplicate it into any second tracker. Do not poll, re-sync, or write status back; creation is the whole job.

4. **Surface the result.** Return the created ticket's URL/identifier to the user plainly, noting that it can seed a thread's `External:` line. No preamble, no closing remark.

## Commit Policy

This skill performs exactly one external action — creating the remote ticket — and **never touches git.** It does not stage, commit, push, or branch, and it writes no files to the repo. Creating the ticket is a tracker action; it is not a commit.

## Discipline

- **Tracker-write only.** The only write this skill performs is creating the one remote ticket. It writes no thread folder, no seed, no ledger, no proposal/spec/plan, and no repo file of any kind.
- **One creation, no sync.** Create once; never poll, re-sync, mirror, or update the ticket afterward.
- **One tracker.** Create in the single owning tracker; never mirror into a second one.
- **Preflight before side effects.** Verify the tracker CLI/API up front; fail cleanly and completely if it is missing, rather than creating partial state.
