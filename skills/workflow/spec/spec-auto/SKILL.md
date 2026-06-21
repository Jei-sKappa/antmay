---
name: spec-auto
description: Turn a proposal, decision log, GitHub issue, or raw prompt into a handoff-grade spec markdown file without clarifying questions when the user has upstream input in hand and wants a complete forward-designed spec.
metadata:
  author: https://github.com/Jei-sKappa
  version: 2.0.0
---

# Spec Auto

Forward-design a handoff-grade spec artifact from a single upstream input, end-to-end. Read the input, draft the spec body covering all eight required semantic-contract elements plus the two spec obligations (machine-checkable acceptance criteria and a Degrees-of-freedom section), write the artifact into its lineage folder, and confirm its path. Do not ask clarifying questions; do not interview the user element-by-element; do not commit.

The spec is the centerpiece of the workflow and **the last artifact the human reads and approves** — it is written so the plan can follow mechanically. The spec stays alive from approval until implementation (it can be amended only via owner-approved, record-backed amendments) and freezes only at `status.implemented`; see `## Frontmatter Status Contract`.

## Inputs

Accept ONE of the following four input forms. Detect which form was passed before drafting:

1. **A proposal artifact path** — a proposal document on disk, typically `proposals/NNN[-<desc>]/proposal.md` in the active thread. The proposal is a common upstream input; it carries intent, context, and a rough shape that the spec elaborates into expected behavior, constraints, and acceptance guidance.
2. **A decision-log artifact path** — a record carrying one or more settled decisions with sequential `## D<N>: <Title>` headings. Each settled decision becomes a citation in the spec body, NOT a copy-paste into a separate spec section — see `## Semantic Contract` below.
3. **A GitHub issue URL or identifier** — accepted forms include a full URL (`https://github.com/<owner>/<repo>/issues/<NNN>`) or the short `owner/repo#NNN` form. The issue body becomes the upstream input; treat the issue title and labels as additional context.
4. **A raw user prompt** — when no artifact is referenced, the user's prompt is itself the input; the spec is forward-designed directly from it.

If the input is ambiguous — multiple plausible proposal lineages could be meant (`proposals/001-api/` vs `proposals/002-cli/`), multiple decision logs cover overlapping topics, the issue identifier is incomplete, or the prompt references "the proposal" or "the spec" with no clear referent — **ask the user which artifact is intended**. There is no "highest number" or "most recent" fallback; do not silently pick by recency or by `NNN`.

## Semantic Contract

The emitted spec MUST cover all EIGHT of the following elements in its body, regardless of section names used. The handoff-grade requirement is that a downstream reader with no prior context can read the spec alone and know what to build:

1. **Intended outcome** — what this spec, when implemented, produces for the user.
2. **Context** — why this is being built; what came before; what triggered the spec.
3. **Scope / non-scope** — the boundary statement, INCLUDING what is explicitly out.
4. **Expected behavior** — the observable behaviors a future executor needs.
5. **Constraints** — tech, repo, harness, and safety constraints that bind the implementation.
6. **Explicit decisions** — settled trade-offs INLINED into the body where operative (in scope, in constraints, in expected behavior, in acceptance). When a settled decision comes from a referenced decision log, cite the SOURCE by path + `D<N>` ID — e.g., `(per discussions/<UTC>-<slug>-decision-log.md D3)` for a same-thread log, or the repo-relative `docs/threads/<other>/…` path for a cross-thread one — rather than copying the decision text.
7. **Unresolved questions** — open issues that do NOT block emission. The spec is shipped with these flagged.
8. **Acceptance guidance** — how a reviewer will know the implementation is right. At tier ≥2 this is the machine-checkable acceptance-criteria model required below, not loose prose.

The eight elements MAY be presented as a copy-paste template, OR they MAY be interleaved into a freeform structure appropriate to the input — section names and ordering are at the executor's discretion. What is NOT at the executor's discretion: every one of the eight must appear, the two spec obligations below must appear, and the spec must read as handoff-grade.

There is NO mandatory `## Decisions` section heading. Forcing a separate decisions section produces dead weight — settled decisions belong INLINED into the elements they govern (scope notes, constraint statements, expected-behavior caveats, acceptance preconditions), with a citation back to the source decision log by path + `D<N>`. Do not introduce a `## Decisions` section just to satisfy an implicit template.

## The Two Spec Obligations

Beyond the eight semantic-contract elements, every spec carries two obligations that make downstream plan autonomy *safe* rather than hopeful:

1. **Machine-checkable acceptance criteria (required at tier ≥2).** When the thread is tier 2 or tier 3, the spec's acceptance guidance MUST be expressed as machine-checkable acceptance criteria following the FR/AC + coverage + traceability model:
   - **FR/AC** — enumerate functional requirements as `FR-<id>` and, under each, one or more acceptance criteria as `AC-<id>.<n>`, each phrased as a concrete, checkable assertion (an observable outcome a reviewer or a test can verify pass/fail), not a vague aspiration.
   - **Coverage** — every expected behavior in the spec body is covered by at least one AC; nothing observable is left without a check.
   - **Traceability** — each AC traces back to the requirement (and, where relevant, the settled decision) it enforces, so a reviewer can follow each check to its origin.

   This is what lets an automated adherence review clear the downstream plan without the human re-reading it. At tier 0 or tier 1 the criteria may be lighter prose, but write machine-checkable criteria whenever the work carries a design decision.

2. **A "Degrees of freedom" section (required, every spec).** Include an explicit `## Degrees of freedom` section that lists the *hows* deliberately left to the implementer's free choice. The *what* is handoff-grade and pinned; the listed *hows* are explicitly granted as open. This section is what lets an automated adherence review distinguish "the plan deviated from the spec" from "the plan chose within granted freedom." If there are genuinely no degrees of freedom, say so explicitly rather than omitting the section.

## The Lossless Authoring Constraint

The spec must commit to **no decision or assumption** the user did not see and accept in the discussions or upstream input **unless the spec explicitly marks it a Degree of Freedom.** The unit of this bar is **a decision or an assumption — never a sentence**: a spec freely elaborates discussed decisions into prose, structure, and derived acceptance criteria. Elaboration of a discussed decision is allowed and expected; what is forbidden is *introducing a new decision or assumption* the user never saw.

When forward-designing surfaces a specific the upstream input did not settle, there are exactly two legal moves — never silently bake it in:

1. **Take it back to discussion** — leave the gap as an `## Unresolved question`, or stop and flag that the spec cannot be completed without the user settling it, so the decision is made before it is committed.
2. **Mark it a Degree of Freedom** — record it explicitly in the `## Degrees of freedom` section as a *how* left open to the implementer, so it is visibly granted rather than smuggled in as a pinned commitment.

Choosing silently — pinning an undiscussed decision into expected behavior or a constraint as if it were settled — is the failure this constraint prevents. This is the prevention side of the downstream lossless-mapping review the spec may later face.

## Workflow

1. **Resolve the thread.** Identify the active thread root at `docs/threads/<YYMMDDHHMMSSZ-slug>/`. If `cwd` already sits inside a thread root, that is the thread. If multiple thread roots exist and which is "active" is ambiguous, ask the user — do not silently pick the most recent UTC stamp. If no thread exists, ask where to create one or auto-create when the input's slug is obvious.

2. **Read the ledger and confirm the tier.** Open the thread's `ledger.md` at the thread root and read the current `tier` (the last `tier:` line wins) and `disposition` (the last of `deferred` / `resumed` / `closed: done` / `closed: dropped`; absence means active). The spec is the tier-2+ centerpiece. If the ledger records no tier yet, propose a tier (the default for anything carrying a design decision is tier 2) and confirm it before writing — append a dated, justified `tier: <N> @ <UTC> — <why>` line to the ledger. If the recorded tier is below what the spec implies, escalate the same way. If the thread is `deferred` or `closed`, STOP — a paused or sealed thread is frozen; do not write. The tier governs whether machine-checkable acceptance criteria are mandatory (tier ≥2). See `## Tier Awareness`.

3. **Resolve and read the input.** Detect which of the four `## Inputs` forms was passed. For a path input, read the file. For a GitHub issue, fetch the issue body and title. For a raw prompt, the prompt itself is the input. If multiple plausible inputs match the reference, ask which is intended. Do not pick by recency or by `NNN`.

4. **Reference, do not copy, settled decisions from the upstream input.** When the input is a decision log, do not paste decision text into a freestanding spec section. Instead, cite the source by path + `D<N>` at the inline location where each decision becomes operative — in the constraint statement, in the expected-behavior bullet, or in the acceptance criterion that depends on it. Same-thread references are thread-relative; cross-thread references are repo-relative.

5. **Choose the lineage folder.** Specs live in a numbered lineage folder `specs/NNN[-<desc>]/`. `NNN` is a zero-padded 3-digit sequence starting at `001`. If no spec lineage exists yet, use `001`. If specs already exist and this is a NEW, distinct spec subject, use the next free `NNN` and add a short kebab `-<desc>` only when needed to tell the lineages apart (`specs/001-api/`, `specs/002-cli/`); adding a slug to a later lineage never renames an earlier one. The full path is the unit of reference. If which existing lineage the work belongs to is ambiguous, ask — there is no "highest number" fallback.

6. **Capture the UTC stamp.** Compute the 12-character `YYMMDDHHMMSSZ` stamp at write time (two-digit year, month, day, hour, minute, second, trailing `Z` for UTC). It is needed to stamp the frontmatter latch when the spec is later approved and implemented; do not bake any stamp into the folder or filename.

7. **Draft the body, honoring the lossless constraint.** Cover all eight elements, inline settled decisions where operative, cite source decision logs by path + `D<N>`, and add the two spec obligations: machine-checkable acceptance criteria (FR/AC + coverage + traceability) at tier ≥2, and a `## Degrees of freedom` section. Commit no decision or assumption the user did not see and accept — for any specific the input did not settle, either leave it an `## Unresolved question` (take it back to discussion) or mark it a Degree of Freedom; never bake it in silently. Keep the spec readable end-to-end by a stranger with no prior context.

8. **Write the artifact.** Create `docs/threads/<thread>/specs/NNN[-<desc>]/spec.md`. The file is named exactly `spec.md` — no UTC stamp, no `v<N>`, no descriptor in the filename. The lineage folder is the stable link target. Initialize the frontmatter status contract per `## Frontmatter Status Contract` (a fresh spec carries `version: 1` and an empty/absent `status:` map — it is a Draft). Create the `specs/` parent and the `NNN[-<desc>]/` lineage folder on-demand; do not pre-create empty folders.

9. **Confirm.** Tell the user: `Spec written: <thread-relative-path-to-the-file>` (e.g. `specs/001/spec.md`). Nothing else — no preamble, no summary, no closing remark.

## Tier Awareness

The tier scales the spec's required rigor and is stored in the thread's `ledger.md` (append-only, last `tier:` line wins) with a one-line justification — never derived from which artifacts are present. The four tiers, by escalating ceremony:

- **Tier 0 — chore:** no behavior change, reversible in one commit. No thread, no ledger — a spec does not belong here.
- **Tier 1 — patch:** small fix/feature, low blast radius, no open design question. Acceptance criteria may be light prose.
- **Tier 2 — feature:** anything with a design decision (the default). The spec is reviewed and approved; **machine-checkable acceptance criteria are mandatory.**
- **Tier 3 — initiative:** multi-week, architectural, or hard to reverse. Tier 2 plus a proposal stage and adversarial reviews; machine-checkable acceptance criteria still mandatory.

Read the ledger to learn the tier. If no tier is recorded, propose one (default tier 2 for design-decision work) and confirm it, appending a dated, justified `tier: <N> @ <UTC> — <why>` line. If the recorded tier is too low for the spec being written, escalate the same way — escalation is cheap and explicit by design; the visible ledger entry is the point. Do not write a spec into a thread the ledger marks `deferred` or `closed`.

## Lineage Folder and Filename

The spec is a **versioned artifact**: the file carries no UTC stamp and no `v<N>` in its name, and lives inside a numbered lineage folder.

```text
docs/threads/<thread>/specs/NNN[-<desc>]/spec.md
```

- `NNN` — a mandatory zero-padded 3-digit sequence starting at `001`. It is the stable identifier; numbered folders sort in creation order.
- `-<desc>` — an optional kebab slug, added ONLY to distinguish one spec lineage from another. It never renames an earlier lineage, so links stay stable.
- The file is always literally `spec.md` — the path carries the type (parent folder) and the subject (thread slug), so the bare filename needs neither a stamp nor a version. The **version lives in frontmatter**, not the filename.
- No `v1/` / `v2/` folder names. A second lineage is a different spec subject, not a revision of an earlier one.

Examples:

```text
specs/001/spec.md
specs/001-onboarding/spec.md
specs/002-billing/spec.md
```

Within-thread references in the body are thread-relative (`specs/001/spec.md`, `discussions/<UTC>-<slug>-decision-log.md`), never repo-rooted and never absolute; cross-thread references are repo-relative (`docs/threads/<other>/…`). The `specs/` folder and its lineage subfolder are created on-demand on the first spec written; do not pre-create empty folders.

## Frontmatter Status Contract

A spec is a versioned artifact that is **alive while in flight** — edited in place through any review→revise cycles — and freezes only at its `status.implemented` latch, not at emission. Its lifecycle status lives in YAML frontmatter and obeys this contract:

- Frontmatter carries **at most two keys**: `version` (a review-cycle counter, an integer; a fresh spec is `version: 1`) and `status:` (a **map** of lifecycle event → stamp).
- `version` counts **completed review→revise cycles**, not edits. `version: 1` is the first content put up for review; after a review's findings are disposed and the spec is revised in place, it becomes `version: 2`. Editorial fixes (typos, formatting, no semantic shift) never bump it.
- The spec's two latches are `status.approved` **then later** `status.implemented`, each nested **inside** the `status:` map — never as a loose top-level key, never collapsed into a single status value. Each latch is **set-once** and stamped with a 12-character `YYMMDDHHMMSSZ` recorded at the moment the event happens. `approved` is the human's sign-off; `implemented` is set at finish.
- A fresh spec carries no latch — it is a Draft. This skill writes the spec in Draft; it does not set a latch itself. The human's approval sets `status.approved`; the finish stage sets `status.implemented`.
- The in-flight **condition (Draft → In Review → Approved → Implemented) is always DERIVED** from the `status:` map plus open reviews — never stored. Precedence: `status.implemented` present → Implemented; else `status.approved` present → Approved (plus "has open findings" if an undisposed review exists against it); else an undisposed review open against it → In Review; else Draft. The condition itself is never written down anywhere.
- **Latches are sticky** — a recorded latch is an event that happened and does not revert. When a review opens during planning, an `approved` spec does NOT fall back to In Review; it is the derived condition "Approved + has open findings." New findings do not un-happen an approval.
- The spec **stays alive from `approved` until `implemented`** and freezes only at `status.implemented`. This is the asymmetry with a proposal (which freezes at `approved`): downstream stages can still surface spec faults that route *back to the human and edit the spec*. The ONLY legal post-approval spec edit is an **owner-approved, record-backed amendment** — never "edit the spec to match the code." After `implemented` the spec is frozen.
- Nothing else goes in frontmatter: no source-relation or lineage keys (`Supersedes:`, `Forked from:`, …), and nothing derivable from the file's own location (its thread, its lineage folder, its condition). Supersession, if any, is a forward-link written in prose, not metadata.

The intended frontmatter shape on a fresh Draft spec:

```yaml
---
version: 1
status: {}
---
```

After the human approves, and later after finish marks it implemented, the `status:` map accrues the two latches in order:

```yaml
status:
  approved: <YYMMDDHHMMSSZ>
  implemented: <YYMMDDHHMMSSZ>
```

The exact YAML spelling is free as long as the map model holds: latches nest under `status:`, set-once, stamped.

## Commit Policy

This skill NEVER auto-commits the spec artifact or the ledger line. Writing the file is where the skill stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit flow. Do not stage, do not commit, do not push, do not branch.

## Immutability

A spec is alive while in flight and is edited in place while it is a Draft or In Review — git holds the evolution, and the feeding discussions justify what goes in; no per-edit record is required during authoring. Once approved, the spec stays alive but a *substantive* change requires an owner-approved, record-backed amendment (the only legal post-approval edit); an editorial fix is allowed but must be marked. Once `status.implemented` latches, the spec freezes: its body and frontmatter are part of the thread's frozen history and are not edited. To change how the system works after that, update the living docs — never an implemented spec.

Drafts under `docs/threads/<thread>/.wip/` are editable scratch and never emitted as reviewable artifacts; competing candidate specs for the same subject (e.g. parallel multi-model drafts) live there, and only the chosen-or-merged result is emitted once as `specs/NNN[-<desc>]/spec.md`.
