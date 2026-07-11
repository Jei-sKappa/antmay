---
name: open-thread
description: Open a local workflow thread from either a brand-new idea or an existing tracker ticket — writing the thread folder, the one frozen seed, and the lifecycle ledger with its initial tier line — use when a unit of work needs a durable home on disk before any proposal, spec, or plan exists.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.2.0
---

# Open Thread

Open a local workflow thread: create the thread folder, write the **one seed** (the thread's frozen genesis narrative), and write the **`ledger.md`** lifecycle ledger with its initial `tier:` line. Two input modes flow through this one skill — a **brand-new idea** or an **existing tracker ticket** — and either way the result is a real thread on disk, never an inbox item. When the thread links a ticket, post the one permalink backlink comment on that ticket.

This skill restates the rules it relies on inline; it does not depend on any document outside its own folder.

## What a Thread Is

A thread is the single durable root that holds every artifact for one feature, bug, investigation, or decision. It lives at:

```text
docs/threads/<YYMMDDHHMMSSZ-slug>/
```

- `YYMMDDHHMMSSZ` is the **12-character UTC stamp** captured at the moment the thread is opened — two-digit year, month, day, hour (24h), minute, second, then a literal trailing `Z`. No separators. Example: `260518200115Z` parses to `2026-05-18 20:01:15 UTC`. Capture it **once** at open time and reuse it; never re-derive it.
- `<slug>` is a short **kebab-case** description of the subject (`auth-cutover`, `rate-limit-fix`).

Opening a thread writes exactly two things, both **on demand** (empty placeholder folders are never pre-created):

1. **The seed** — `seed/seed.md`, the frozen genesis narrative, inside the `seed/` genesis bucket (a fixed-name singleton — no stamp, no slug).
2. **The ledger** — `ledger.md` at the **thread root** (NOT in `seed/`), with its initial `tier:` line.

Nothing else is created. A freshly opened thread contains `ledger.md` and `seed/` and nothing more until a proposal, spec, plan, or implementation actually lands later.

## Why This Is a Thread, Not an Inbox Item

There is no inbox — status-by-folder broke links, so status is derived from the artifacts and the ledger instead. This skill writes a **real thread** (a seed plus a ledger), never an `inbox/` item and never an `open/` / `processed/` / `dropped/` folder. Capturing a tangential idea mid-work is served by opening a fresh thread (or a ticket in the tracker), not by an inbox.

## The Two Input Modes

This is **one** skill that accepts two input forms — like the suite's plan and spec skills that take "a raw idea OR an issue URL." Detect which mode applies before writing; do not split the work by input shape.

- **Mode A — a brand-new idea.** The user describes the idea in prose. The seed's `External:` line is then either:
  - `External: none` plus a short why — **the default when the user supplies no ticket URL** (any tier), OR
  - a **user-supplied tracker URL**, if the user already has a ticket they want this thread to link (this overrides the default).
- **Mode B — an existing tracker ticket.** The user passes a ticket URL or identifier. **Read the ticket** (title + body) and let it seed the trigger narrative; the ticket's **URL becomes the seed's `External:` line.**

In both modes the output is identical in shape: one thread, one seed, one ledger with a tier line.

## The Seed Format

The seed is **mandatory** for any thread (a thread is tier ≥1 by definition, since it carries a ledger). It is a **frozen narrative record** — written once, never edited afterward — and carries **no frontmatter** (a record with no lifecycle status of its own carries none) and **no owner field** (ownership is work-management; it belongs to the tracker's assignee, and duplicating it here would only drift).

The format requires three things; the rest is free:

```markdown
# Seed: <title>
External: <tracker URL | "none" + why>

<1–5 lines: what triggered this — the idea, the bug, the request>
```

1. **A title** — `# Seed: <title>`.
2. **An `External:` line** — the tracker URL, or `none` followed by a short why.
3. **1–5 lines of trigger narrative** — what triggered this: the idea, the bug, the request. In Mode B this narrative is drawn from the ticket's title and body.

The seed has **no tier and no disposition** — those live in the ledger, not the seed. Optionally, if this thread is known to replace an older one, you MAY add a free-form forward-link breadcrumb in plain prose (a line starting `Supersedes…` / `Invalidates…`); it is offered as a grep aid, never mandated, and never stored as frontmatter.

The seed is a **fixed-name singleton**: it is always written as **`seed.md`** inside the thread's `seed/` bucket — no UTC stamp, no slug, no version suffix.

```text
seed/seed.md
```

There is exactly one seed per thread, so the `seed/` folder already identifies it: the path carries the type (`seed/`) and the subject (the thread slug), and a stamp or a copied slug would only duplicate the thread-root folder name. This mirrors the ledger, which is the fixed-name `ledger.md` at the thread root.

## The `External:` Line Is the Join Point

The `External:` line is the **single join point** between the repo's thread and the external tracker (Jira, Linear, ClickUp, GitHub Issues). It is the only place the two link — they shake hands again exactly once, later, at finish; they never continuously mirror, because continuous mirroring is the dual-tracking that rots.

- **Mode B** — the ticket's URL fills the `External:` line.
- **Mode A** — `External: none` (+ a short why) is the **default** when the user supplies no URL; a user-supplied ticket URL overrides it.

**No ticket is assumed by default** — when the user gives none, write `External: none` with a short why and do not block to ask. A tracker still buys visibility and audit (the point of a team tracker), which matters most for tier ≥2 work; if the user wants that, they can link one. The closing summary states the no-ticket default plainly and invites exactly this. If the user supplies a ticket in response (the open-time correction window), rewrite the seed's `External:` line and post the backlink.

## The Ledger and Its Initial Tier Line

Write `ledger.md` at the **thread root**. It is the thread's lifecycle ledger — the one file that holds the two facts no artifact can derive: the thread's **tier** and its **disposition**. It is **append-only** with a strict line grammar. The current value of each key is its **last** line; only transitions are written, never the resting default.

Every event line is exactly:

```text
<event> @ <YYMMDDHHMMSSZ> — <justification>
```

where `<event>` is one of `tier: <0–3>`, `deferred`, `resumed`, `closed: done`, `closed: dropped`. The `— <justification>` is **mandatory on every line**. A free Markdown header above the event lines is permitted — parsers read only grammar-matching lines.

Opening a thread writes the **initial tier line**:

```text
tier: <0–3> @ <YYMMDDHHMMSSZ> — <why>
```

The justification is mandatory. Example ledger after open:

```text
# Lifecycle: auth cutover

tier: 2 @ 260612174045Z — new pipeline facet; carries a design decision
```

## Assign the Tier (Default Tier 2)

**When the user specifies no tier, assign tier 2** — do not block to confirm, and do not guess between tiers from the work in front of you. If the user explicitly states a tier, honor it (1, 2, or 3).

The four tiers:
- **Tier 0 — chore:** no behavior change, reversible in one commit. **Tier 0 leaves no thread and no ledger** — the commit message is its only record. If the work is genuinely tier 0, do NOT open a thread; tell the user so and stop. (A behavior-changing dependency bump is tier 1, not tier 0.)
- **Tier 1 — patch:** small fix/feature, low blast radius, no open design question.
- **Tier 2 — feature:** anything carrying a design decision. **This is the default** — assign tier 2 whenever the user does not specify a tier.
- **Tier 3 — initiative:** multi-week, architectural, or hard to reverse.

A thread is therefore always tier ≥1 (it has a ledger). Tier 0 chores leave no thread — the tier-0 gate is the one pre-check that can still stop the skill before it opens anything. Past that gate, the default is tier 2. The `— <justification>` on the tier line is still mandatory. The assigned tier is reported in the closing summary, where the user can correct it (the open-time correction window); recording the tier with its justification is what makes later escalation or de-escalation cheap, explicit, and auditable — a future appended `tier:` line, never a silent rewrite.

## The Ticket-Backlink Convention

When this thread **links a ticket** — Mode B, or Mode A with a user-supplied URL — post **exactly one** comment on that ticket carrying a **permalink back to the thread folder**. This is a **one-time backlink**, not continuous mirroring.

- Post it **only when the thread links a ticket.** If `External: none`, there is no ticket and nothing to post.
- Post **exactly one.** First check whether a backlink comment already exists; post one only if none does. **Do not double-post.**
- This skill posts the backlink when it links the ticket. If for any reason it does not (e.g. the tracker is unavailable), the finish stage posts it later — so a linked ticket always ends up with exactly one backlink. Because both stages can post it, the existence check before posting is what prevents a duplicate.

The backlink's permalink points at the thread folder from an external system, so it uses whatever stable URL the tracker requires — this is the one exception to the never-absolute path rule.

## Prerequisite Preflight (Tracker Steps)

Two steps touch the tracker: **reading the ticket in Mode B** and **posting the backlink comment**. Both need the tracker's CLI/API. Before any side-effecting tracker step, **check the tool is available up front.** If it is missing:

- In **Mode B**, the ticket cannot be read — fail the whole instruction with a clear warning naming what is missing, rather than partially creating state. (Falling back to asking the user to paste the ticket title/body is acceptable if they offer; otherwise stop cleanly.)
- For the **backlink** in either mode, do NOT fail mid-way: warn cleanly, tell the user the backlink could not be posted (and on which ticket), and continue — the finish stage will post it later. Still write the thread, seed, and ledger.

Preflight comes before any side-effecting step — never run until something breaks mid-flight.

## Path References

Within-thread references in any artifact body are **thread-relative** (`seed/seed.md`, `ledger.md`), never repo-rooted and never absolute, so the thread can be moved or archived without breaking its internal links. Cross-thread and external references are **repo-relative** (`docs/threads/<other>/…`). The single exception is the ticket backlink's permalink, which is an external URL pointing at the thread folder.

## Workflow

1. **Detect the input mode.** Mode A (a brand-new idea in prose) or Mode B (an existing tracker ticket URL/identifier). One skill handles both; do not split by input form.

2. **In Mode B, preflight the tracker, then read the ticket.** Check the tracker CLI/API is available first; if it is missing, fail cleanly with a clear warning (or accept a user-pasted title/body if offered). Read the ticket's title and body — they seed the trigger narrative — and capture its URL for the `External:` line.

3. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp once, at open time. Reuse it for the thread-root folder name and the initial ledger line; never re-derive it. (The seed filename is the fixed `seed.md` and carries no stamp.)

4. **Choose the slug and assign the tier.** Pick a short kebab slug for the subject. Assign tier 2 unless the user explicitly specified a tier (then honor it) — do not confirm upfront. If the work is genuinely tier 0, do not open a thread — tell the user and stop.

5. **Create the thread root on demand.** `docs/threads/<YYMMDDHHMMSSZ-slug>/`. Do not pre-create empty subfolders.

6. **Write the seed.** Create `seed/seed.md` per `## The Seed Format`: a `# Seed: <title>` line, an `External:` line (the ticket URL in Mode B; in Mode A, a user-supplied URL, or `none` + why as the default when no URL was supplied), and 1–5 lines of trigger narrative. No frontmatter, no owner field. Create the `seed/` folder on demand.

7. **Write the ledger.** Create `ledger.md` at the thread root with the initial line `tier: <0–3> @ <YYMMDDHHMMSSZ> — <why>` per `## The Ledger and Its Initial Tier Line`. The justification is mandatory.

8. **Post the backlink if a ticket is linked.** If the `External:` line carries a ticket URL (Mode B, or Mode A with a user-supplied URL), preflight the tracker, check no backlink already exists, then post **exactly one** comment with a permalink back to the thread folder. If the tracker is unavailable, warn and continue — finish will post it later. If `External: none`, skip this step.

9. **Confirm, and invite correction.** Tell the user where the thread was opened, e.g. `Thread opened: docs/threads/<YYMMDDHHMMSSZ-slug>/` plus the seed's thread-relative path (`seed/seed.md`). **State the assigned tier explicitly** — e.g. "Assigned **tier 2** (the default)." — and, when no ticket was linked, **state the no-ticket default** — e.g. "No external ticket linked — `External: none`." Then **invite the user to correct either**: if that wasn't the tier they wanted, or they want to link a ticket, they can say so now. If the user corrects the tier, **rewrite the initial `tier:` line in place**; if they supply a ticket, **rewrite the seed's `External:` line and post the backlink** (step 8). If the backlink was posted, say so; if it was skipped (no ticket) or deferred (tracker unavailable), note that. No preamble, no closing remark.

## Commit Policy

This skill NEVER auto-commits. It writes the thread folder, the seed, and the ledger to disk and stops there. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit flow. Do not stage, commit, push, or branch. (Posting the ticket backlink is a tracker action, not a git commit, and is the one external write this skill performs.)

## Immutability

The seed is a **frozen narrative record**: once written, its body is not edited. A change of understanding is captured downstream (a discussion, a later artifact), never by rewriting the seed. The ledger is **append-only**: this skill writes the initial `tier:` line and never rewrites it; later tier or disposition changes are new appended lines. The one exception across records is an explicit, owner-authorized in-place correction, which must be **visibly marked** (an erratum note) so it stays auditable — never a silent edit.

**Open-time correction window.** There is one narrow, bounded exception scoped to this skill: during the *same* open-thread run, before handoff and before any commit (this skill never auto-commits), the just-written initial `tier:` line and the seed's `External:` line MAY be rewritten in place to apply a user correction to the open-time defaults surfaced in the closing summary. This is not an erratum edit and needs no erratum note — the values were written moments ago in this same run and are still open-time state, not a settled artifact. Once the run returns, this window closes: the seed is frozen, and all future tier or disposition changes are new appended ledger lines.
