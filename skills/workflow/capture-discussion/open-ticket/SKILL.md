---
name: open-ticket
description: Create a remote tracker ticket (GitHub Issues, Jira, Linear, ClickUp, …) from a brand-new idea — use when an idea needs a work-item home in the team's tracker before (or instead of) a local thread, so a later thread can link it as read-context.
disable-model-invocation: true
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.3.0
---

# Open Ticket

Create **one remote tracker ticket** from a brand-new idea. Take the user's idea, turn it into a ticket title and a body that captures the idea, create the ticket in the single owning tracker, and surface the created ticket's URL/identifier back to the user. That URL is what a local thread later links from its seed's `External:` line.

This skill restates the rules it relies on inline; it does not depend on any document outside its own folder.

## This Is the Only Skill That Writes to the Tracker

In this workflow, **exactly one skill writes to the tracker, and it is this one.** Being invoked here is the only thing that authorizes creating a ticket. Every other skill reads the tracker at most, or links to it one-directionally — a thread seed's `External:` field is a passive read-context pointer to the ticket, and a commit or PR may reference it. No workflow operation comments on, transitions, or closes a ticket on the agent's behalf; that happens only when the user explicitly asks for it.

That makes the contract here narrow and strict: this skill performs **a single creation act** and stops. It does **not** poll the tracker, re-sync status, mirror the repo's state back onto the ticket, or update the ticket after creating it. It never closes the ticket — no workflow operation transitions or closes it without an explicit user request.

## One-Time Creation, Never Ongoing Sync

The repo and the tracker **link once**, never continuously. The single link is a thread seed's `External:` field — a passive, read-only pointer to the ticket, not a live sync. The two systems **do not mirror**, because continuous mirroring is the dual-tracking that always rots.

This skill lives entirely inside the first half of that picture: it **creates** the ticket. It is forbidden from doing any of the things continuous sync would do:

- It does not keep the ticket and a local artifact in step.
- It does not re-read the ticket to reconcile state.
- It does not write status or progress back onto the ticket.
- It does not re-run to "refresh" a ticket it already made.

Create the ticket, hand back its URL, done.

## Single Ownership of Work-Item Status

Work-item / PM status — priority, assignee, In Progress / Blocked / Done — is owned by **exactly one system, and it is never the filesystem.** Create the ticket in the **single owning tracker** and nowhere else:

- **Solo / personal / OSS:** GitHub Issues — adjacent to the code, auto-links commits and PRs, zero process cost.
- **Company contexts with PM/stakeholder visibility:** the company tracker (Jira, Linear, ClickUp, …) — because that is where non-engineers look.

**Never mirror into a second tracker.** Do not create the same ticket in GitHub Issues *and* a company tracker; do not duplicate a ticket across trackers "for visibility." One idea, one ticket, in the one system that owns work-item status. The repo holds the truth, the tracker holds the PM state, and threads hold the thinking — these are different facts, not the same fact stored twice. If which tracker owns status is unclear, resolving it is part of preflight: refuse, name the missing ownership choice, and create nothing (see `## Prerequisite Preflight`).

## Prerequisite Preflight (The Defining Behavior)

This skill runs a mandatory preflight before any substantive execution — before it drafts or creates anything. Ticket drafting and creation start **only** after the complete preflight passes; a clean up-front failure is always preferable to a partial creation that leaves the tracker in an inconsistent state.

The preflight has two gates, both checked before any side-effecting step:

1. **Resolve the owning tracker.** Determine which single tracker owns work-item status (see `## Single Ownership of Work-Item Status`). If which tracker owns status is unclear, that is a preflight failure — do not ask and wait: refuse, naming the missing ownership choice and how to supply it, and create nothing.
2. **Confirm the tracker tool is reachable.** Verify the owning tracker's CLI is installed and authenticated, or its API token / credentials are present and valid (for example: the relevant CLI responds to an auth/whoami check, or the configured token is set in the environment).

If either gate fails, STOP immediately and refuse: emit a clear message naming **exactly what is missing** (the ownership choice, or which CLI/binary, credential, or token) and **how to provide it** (choose the owning tracker, install the CLI, run its auth/login command, set the token env var), write nothing, and end with exactly one terminal line: `Outcome: REFUSED — <what is missing and how to supply it>`. Do **not** start composing the ticket, do **not** create a partial ticket, do **not** leave half-built state behind. A preflight refusal is never a pending decision — the run never started, so no bundle is emitted.

## Drafting the Ticket From the Idea

The ticket's content comes from the user's brand-new idea:

- **Title** — a concise, descriptive summary of the idea (the work-item's headline).
- **Body / description** — a short narrative capturing the idea: what it is, why it matters, and any context the user gave. Keep it to what the user actually provided or confirmed; do not invent scope, acceptance criteria, or design decisions the user did not state.

Create the ticket in the owning tracker with that title and body, using the tracker's CLI/API. Then **surface the created ticket's URL/identifier back to the user**, plainly, so they can use it to seed a thread's `External:` line.

## Clean Ticket-First Ordering

The clean composition is **ticket-first**: create the ticket here so that when a local thread is opened afterward, the ticket's URL is already in hand and can be recorded in the seed's `External:` field at the moment the thread is created. (A thread references its tracker ticket through that `External:` field — a passive read-context pointer, the one join point between the repo and the tracker. The skill that opens the local thread is the one that writes the seed and its `External:` field; this skill does none of that.)

Two usage shapes are both valid:

- **Standalone** — the user just wants a ticket created from an idea, with no local thread (yet or ever). Create the ticket, return its URL, stop.
- **First step before a thread** — create the ticket here, hand back its URL, and the user (or a separate thread-opening step) opens the local thread next and links this ticket from the seed.

Either way, this skill's output is the same: one ticket in the owning tracker and its URL returned to the user. It does **not** open a thread, write a seed, or write any thread file — those belong to the local-thread skill.

## UTC Stamp

If you reference a timestamp anywhere (e.g. in the ticket body), use the 12-character UTC stamp `YYMMDDHHMMSSZ` — two-digit year, month, day, hour (24h), minute, second, then a literal trailing `Z`, no separators (e.g. `260612174045Z`). This skill writes no thread files, so it has no filenames to stamp; the stamp grammar is noted only for any timestamp you surface.

## Procedure

1. **Preflight FIRST, before any substantive execution.** Run both preflight gates from `## Prerequisite Preflight`: resolve which single tracker owns work-item status, and verify its CLI/API is installed and authenticated (or its token/credentials are present and valid). If the owning tracker is unclear, or the prerequisite is missing, STOP and refuse — do not begin drafting or creating the ticket. End with exactly one terminal line: `Outcome: REFUSED — <what is missing and how to supply it>`.

2. **Draft the ticket from the idea.** Compose a concise title and a short body/description capturing the user's brand-new idea. Do not invent scope or decisions the user did not state.

3. **Create the ticket — once — in the single owning tracker.** Use the tracker's CLI/API to create exactly one ticket. Do not duplicate it into any second tracker. Do not poll, re-sync, or write status back; creation is the whole job.

4. **Surface the result.** Return the created ticket's URL/identifier to the user plainly, noting that it can seed a thread's `External:` line. No preamble, no closing remark. End with exactly one terminal line: `Outcome: DONE — Ticket created: <URL/identifier>`.

## Commit Policy

This skill performs exactly one external action — creating the remote ticket — and **never touches git.** It does not stage, commit, push, or branch, and it writes no files to the repo. Creating the ticket is a tracker action; it is not a commit.

## Discipline

- **Tracker-write only.** The only write this skill performs is creating the one remote ticket. It writes no thread folder, no seed, no proposal/spec/plan, and no repo file of any kind.
- **One creation, no sync.** Create once; never poll, re-sync, mirror, or update the ticket afterward.
- **One tracker.** Create in the single owning tracker; never mirror into a second one.
- **Preflight before side effects.** Verify the tracker CLI/API up front; fail cleanly and completely if it is missing, rather than creating partial state.
