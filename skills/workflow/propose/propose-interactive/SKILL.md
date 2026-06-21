---
name: propose-interactive
description: Walk the user through proposal intent, context, rough shape, and open questions, then assemble a freeform proposal artifact when the user wants to think the proposal through collaboratively.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Propose Interactive

Walk the user through a proposal collaboratively, then assemble a freeform proposal artifact under the active thread's `proposals/` folder. This skill runs a discussion-style loop before writing: it interviews the user element by element, pushes back where warranted, then composes and writes the proposal.

The proposal stage answers "should we do this, and in which direction?" It is an optional, high-ceremony stage that belongs to **tier 3 (initiative)** work — multi-week, architectural, or hard-to-reverse changes. Most work skips the proposal entirely. Before writing, confirm the thread is (or should be) tier 3; see `## Tier Awareness`.

## Anti-Sycophancy Stance

Your job is to help the user reach a proposal that survives later scrutiny, not to make them feel good about whatever rough shape they walk in with. Treat proposal authoring as a mutual attempt to get closer to the right framing: you may be missing context, the user may be missing consequences, and either side may notice something the other overlooked. Sycophancy is a failure mode here — it produces a proposal whose `## Open questions` section is empty because nobody pushed.

Hold these together:

- **Disagree when you disagree.** If the user's intent conflicts with the evidence, your read of the context, or the codebase reality, say so plainly before they commit it to the proposal body. Don't soften it into ambiguity.
- **Push back on weak or incomplete reasoning.** If the user's rough shape rests on an unexamined assumption, ignores a known constraint, or skips an important risk or trade-off, name the gap and bring it into the conversation before writing.
- **Surface what they didn't ask about.** Risks, hidden costs, downstream consequences, alternatives they dismissed too fast — raise them, even if it slows the loop down. Better captured as an Open question now than rediscovered during spec or implementation.
- **Take the user's input seriously.** If they push back, add context, or challenge your framing, evaluate the substance. Update your view when they provide new facts, sharper constraints, or a better argument.
- **Do not treat pushback as correctness.** The user disagreeing with you is not itself evidence. Separate useful new information from preference, frustration, momentum, or wishful thinking. Never soften your read of the proposal just because the user pushed back — only when they give you a real reason to.
- **Make disagreement productive.** When you and the user see the proposal differently, identify the exact assumption or value judgment causing the split, then resolve it before writing the relevant element into the body.
- **Refuse to log a proposal element you believe is wrong without flagging it.** If the user insists, write it, but note the dissent in the proposal body — either inline next to the relevant element or in `## Open questions`. Example: `Open question: recommended <other shape> because <why>; user proceeded with <chosen shape> — flagged for spec phase to revisit.`
- **Keep the proposal owned by the evidence.** The goal is not for either side to win. The goal is to emit a proposal that survives the spec phase because the relevant context, objections, and trade-offs were actually considered.

If you believe the user is about to commit a framing into the proposal that is wrong, refuse to log it silently. Either resolve the disagreement first, or write it with the dissent included in the proposal body's open questions or alongside the relevant element.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ASK the user which one is intended — do not silently pick the most recent UTC stamp; ambiguity here is often a real decision in disguise. If no thread exists, ASK the user where to create one OR auto-create when the calling context makes the slug obvious.

2. **Read the ledger and confirm the tier.** Open the thread's `ledger.md` at the thread root and read the current `tier` (the last `tier:` line wins) and `disposition` (the last of `deferred` / `resumed` / `closed: done` / `closed: dropped`; absence means active). The proposal stage is a tier-3 stage. If the ledger already records tier 3, proceed. If it records a lower tier, the proposal is an escalation: tell the user that proposing implies tier-3 work, confirm with them, then append a dated, justified `tier: 3 @ <UTC> — <why>` line to the ledger before writing the proposal. If the thread is `deferred` or `closed`, STOP and tell the user — a paused or sealed thread is frozen; do not write. See `## Tier Awareness`.

3. **Choose the lineage folder.** Proposals live in a numbered lineage folder `proposals/NNN[-<desc>]/`. `NNN` is a zero-padded 3-digit sequence starting at `001`. If no proposal lineage exists yet, use `001`. If proposals already exist and this is a NEW, distinct proposal subject, use the next free `NNN` and add a short kebab `-<desc>` only when needed to tell the lineages apart (`proposals/001-api/`, `proposals/002-cli/`); adding a slug to a later lineage never renames an earlier one. The full path is the unit of reference. If which existing lineage the work belongs to is ambiguous, ASK the user — there is no "highest number" fallback. Settle the lineage before writing; an emitted lineage folder is the permanent link target.

4. **Walk the four suggested elements, one at a time.** Ask about each element, accept the user's freeform answer, push back per the `## Anti-Sycophancy Stance` when warranted, then move on. The four elements:

   1. **Intent** — what this proposal is trying to do, in one or two sentences. What outcome would make this proposal worth shipping?
   2. **Context** — why it is being raised now. What came before? What triggered the idea? What is the user reacting to?
   3. **Rough shape** — an early sketch of what the change might look like. Not a spec. Not a design. A first sketch worth reacting to.
   4. **Open questions** — what is unresolved, what needs a decision later, what is worth flagging upfront so a reader does not assume it is settled. Add to this list anything that surfaced during the walk and was not closed.

   The four-element structure is SUGGESTED, not enforced. The user may add a fifth element (constraints, prior art, alternatives weighed), drop an element that does not apply (e.g., no open questions yet), reorder them, or reshape them entirely. Adapt to what the conversation produces. This is freeform proposal authoring, not a template fill-in. The skill body is the scaffold; the proposal does not have to be.

5. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time (two-digit year, month, day, hour, minute, second, trailing `Z` for UTC). It is needed to stamp the frontmatter latch when the proposal is later disposed; do not bake any stamp into the folder or filename.

6. **Assemble and write the artifact.** Compose the proposal body from the user's answers, then write to `docs/threads/<thread>/proposals/NNN[-<desc>]/proposal.md`. The file is named exactly `proposal.md` — no UTC stamp, no `v<N>`, no descriptor in the filename. The lineage folder is the stable link target. Initialize the frontmatter status contract per `## Frontmatter Status Contract` (a fresh proposal carries `version: 1` and an empty/absent `status:` map — it is a Draft). Create the `proposals/` parent and the `NNN[-<desc>]/` lineage folder on-demand if they do not yet exist.

7. **Confirm.** Tell the user: `Proposal written: <thread-relative-path-to-the-file>` (e.g. `proposals/001/proposal.md`). No closing remark, no summary.

## Tier Awareness

The proposal stage is a **tier-3 (initiative)** stage. The four tiers, by escalating ceremony:

- **Tier 0 — chore:** no behavior change, reversible in one commit. No thread, no ledger.
- **Tier 1 — patch:** small fix/feature, low blast radius, no open design question.
- **Tier 2 — feature:** anything with a design decision (the default). Seed → discussion → spec → plan → implement.
- **Tier 3 — initiative:** multi-week, architectural, or hard to reverse. Tier 2 plus a proposal stage and adversarial reviews.

The tier is stored in the thread's `ledger.md` (append-only, last `tier:` line wins) with a one-line justification — never derived from which artifacts are present. Read it to learn the tier; if the thread is not yet tier 3 and a proposal is genuinely warranted, confirm with the user and escalate by appending a dated, justified `tier: 3 @ <UTC> — <why>` line. Escalation is cheap and explicit by design — the visible ledger entry is the point. Do not write a proposal into a thread the ledger marks `deferred` or `closed`.

## Lineage Folder and Filename

The proposal is a **versioned artifact**: the file carries no UTC stamp and no `v<N>` in its name, and lives inside a numbered lineage folder.

```text
docs/threads/<thread>/proposals/NNN[-<desc>]/proposal.md
```

- `NNN` — a mandatory zero-padded 3-digit sequence starting at `001`. It is the stable identifier; numbered folders sort in creation order.
- `-<desc>` — an optional kebab slug, added ONLY to distinguish one proposal lineage from another. It never renames an earlier lineage, so links stay stable.
- The file is always literally `proposal.md` — the path carries the type (parent folder) and the subject (thread slug), so the bare filename needs neither a stamp nor a version. The **version lives in frontmatter**, not the filename.
- No `v1/` / `v2/` folder names. A second lineage is a different proposal subject, not a revision of an earlier one.

Examples:

```text
proposals/001/proposal.md
proposals/001-onboarding-overhaul/proposal.md
proposals/002-billing-rewrite/proposal.md
```

Within-thread references in the body are thread-relative (`proposals/001/proposal.md`), never repo-rooted and never absolute. The `proposals/` folder and its lineage subfolder are created on-demand on the first proposal written; do not pre-create empty folders.

## Frontmatter Status Contract

A proposal is a versioned artifact that is **alive while in flight** — edited in place through any review→revise cycles — and freezes at its lifecycle latch, not at emission. Its lifecycle status lives in YAML frontmatter and obeys this contract:

- Frontmatter carries **at most two keys**: `version` (a review-cycle counter, an integer; a fresh proposal is `version: 1`) and `status:` (a **map** of lifecycle event → stamp).
- The proposal's two latches are `status.approved` and `status.rejected`, each nested **inside** the `status:` map — never as a loose top-level key, never collapsed into a single status value. Each latch is **set-once** and stamped with a 12-character `YYMMDDHHMMSSZ` recorded at the moment the event happens.
- A fresh proposal carries no latch — it is a Draft. The latch is set later, by whoever disposes the proposal (the human's approval, or a rejection). This skill writes the proposal in Draft; it does not set a latch itself.
- The in-flight **condition (Draft / In Review / Approved / Rejected) is always DERIVED** from the `status:` map by precedence — never stored. Precedence: a `rejected` or `approved` latch present means the proposal is disposed (Approved/Rejected); otherwise an undisposed review open against it means In Review; otherwise Draft. The condition itself is never written down.
- **Latches are sticky** — a recorded latch is an event that happened and does not revert. New findings do not un-happen an approval.
- The proposal **freezes at `approved` (or `rejected`)**. Once latched it is part of the thread's frozen history and is not edited; `rejected` is a real artifact-level latch independent of the thread's own disposition (in a multi-lineage thread one proposal may be `rejected` while another is `approved` and the thread stays alive).
- Nothing else goes in frontmatter: no source-relation or lineage keys (`Supersedes:`, `Forked from:`, …), and nothing derivable from the file's own location (its thread, its lineage folder, its condition). Supersession, if any, is a forward-link written in prose, not metadata.

The intended frontmatter shape on a fresh Draft proposal:

```yaml
---
version: 1
status: {}
---
```

After disposition the `status:` map carries exactly one of:

```yaml
status:
  approved: <YYMMDDHHMMSSZ>
```

```yaml
status:
  rejected: <YYMMDDHHMMSSZ>
```

The exact YAML spelling is free as long as the map model holds: latches nest under `status:`, set-once, stamped.

## Decision Log

This skill does NOT auto-write a separate decision log. The default behavior is to capture the proposal artifact only. A decision log is written ONLY if durable trade-offs or rejected alternatives emerge during the walk that cannot reasonably be captured in the proposal body itself — for example, a major design alternative the user considered and rejected with rationale that downstream readers will need to understand.

When such a log IS warranted, write it as a **record** in the proposal lineage's `discussions/` folder: `docs/threads/<thread>/proposals/NNN[-<desc>]/discussions/<UTC>-<kebab-desc>-decision-log.md`. The record-form filename keeps its UTC stamp and the MANDATORY `-decision-log` artifact-type suffix. A record carries no frontmatter unless it has a lifecycle status of its own; a decision log does not, so it carries none. Use an append-only single-record shape: sequential `## P<N>: <Title>` headings with `Decision:` and `Rationale:` lines. If a dissent was flagged during the walk per the `## Anti-Sycophancy Stance`, the rationale line carries that dissent verbatim.

When in doubt about whether a side-conversation rises to "durable trade-off" status, ASK the user. The default is no decision log — most proposal authoring is captured fully in the proposal body's `## Open questions` and `## Rough shape` sections.

## Scope Drift

When the user introduces a branch that is outside the proposal being authored, do not silently follow them and do not let the proposal grow into a different shape than the one being discussed. Propose ONE of:

1. **Capture it as a follow-up for a future thread** (PREFERRED for non-blocking side-findings). Name the side-finding clearly so it survives — it becomes the seed of a future thread (or a ticket in the tracker) — without polluting this proposal.
2. **Split into its own proposal lineage or discussion.** When the branch is itself worth a dedicated proposal, start a new proposal lineage (the next free `NNN`) rather than expand the current proposal beyond its intent.
3. **Defer to "later".** When the branch is not yet shaped enough to capture, name it in conversation and let it pass.

ASK the user which. Do not pick silently.

## Commit Policy

This skill NEVER auto-commits the proposal artifact, the optional decision log, or the ledger line. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator skill, or a separate commit-helper flow. Do not stage, do not commit, do not push, do not branch.

## Immutability

A proposal is alive while in flight and is edited in place while it is a Draft (or In Review) — git holds the evolution, and the feeding discussions justify what goes in; no per-edit record is required during authoring. Once the proposal latches at `approved` or `rejected`, it freezes: its body and frontmatter are part of the thread's reviewable history and are not edited. To change direction after a freeze, open a new proposal lineage (the next `NNN`) — never edit a frozen one.

Records are immutable from emission. The optional decision log is append-only — new `## P<N>` entries may be appended, but emitted entries are never rewritten in place.

Drafts under `docs/threads/<thread>/.wip/` are editable scratch and never emitted as reviewable artifacts; competing candidate proposals for the same subject live there and only the chosen one is emitted once as `proposals/NNN[-<desc>]/proposal.md`.
