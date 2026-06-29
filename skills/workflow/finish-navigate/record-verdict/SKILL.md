---
name: record-verdict
description: Record a human's explicit lifecycle verdict on a thread artifact by
  setting the matching set-once frontmatter status latch — approve or reject a
  proposal, approve a spec, or accept or reject a review — use when the user has
  explicitly decided an artifact's fate and wants that decision stamped into the
  artifact's status map, never to evaluate or judge the artifact itself.
metadata:
  author: https://github.com/Jei-sKappa
  version: 1.0.0
---

# Record Verdict

Record a human's explicit lifecycle verdict on a single thread artifact by setting the one set-once status latch that matches it, inside the artifact's YAML frontmatter `status:` map. The skill resolves the artifact, detects its type, confirms the verdict is one the artifact's vocabulary allows, captures a UTC stamp, writes the latch nested under `status:`, and reports the artifact's new derived condition. It edits ONLY the frontmatter status latch — never the body — and it NEVER decides the verdict itself.

This skill restates the rules it relies on inline; it does not depend on any document outside its own folder.

## It Records a Decision; It Does Not Make One

This skill is **human-gated**. It records a verdict the user has already reached — it never forms, infers, or rubber-stamps one.

- It NEVER reviews or judges the artifact's content. Whether the proposal is sound, the spec handoff-grade, or the review's findings correct is not this skill's question. Recording a verdict is a clerical act layered on top of a decision that already happened.
- It NEVER infers approval (or rejection, or acceptance) from context, from the artifact looking finished, or from the user's general enthusiasm. The verdict must be **explicit**.
- If the verdict is not explicit, or which artifact it applies to is unclear, **ASK** — do not guess. There is no "approve the obvious one" and no "most recent lineage" fallback.

If the user asks this skill to *evaluate* the artifact and then record the result, decline the evaluation half: surface that the verdict is the user's to make, and record only once the user states it.

## Inputs

Two inputs, both required before anything is written:

1. **The artifact path** — the file whose status latch is to be set. May be passed thread-relative (`specs/001/spec.md`) or repo-relative (`docs/threads/<thread>/specs/001/spec.md`).
2. **The verdict** — what the human decided (e.g. approve, reject, accept). It must be one the artifact's type allows (see `## Per-Artifact Vocabulary`).

Resolve the artifact and **detect its type from the path plus the file's content** (its frontmatter shape):

- `proposals/NNN[-<desc>]/proposal.md` → **proposal** (frontmatter: `version` + a `status:` map).
- `specs/NNN[-<desc>]/spec.md` → **spec** (frontmatter: `version` + a `status:` map).
- a record at `.../reviews/<UTC>-<desc>-review.md` → **review** (a record; its `status:` map carries its disposition).
- `plans/NNN[-<desc>]/plan.md` → **plan** (no `version`, no `status:` map).

If the path is missing, vague ("the proposal", "the spec"), or the thread holds multiple lineages where the reference could match more than one, **ASK which artifact is intended**. There is no "highest `NNN`" or "most recent" fallback — silently picking would hide a real decision behind a sort order. If the type cannot be determined from path and content, ASK.

## Per-Artifact Vocabulary

Each artifact type accepts only its own latches. **Refuse any verdict outside the target's vocabulary** and explain why.

### Proposal — `status.approved` OR `status.rejected`

A proposal takes exactly one of two mutually exclusive latches: `status.approved` (the direction is taken forward) or `status.rejected` (the direction is declined). Setting either **freezes the proposal** (see `## Freeze Awareness`). Because the two are mutually exclusive, a proposal that already carries one cannot take the other — changing direction is a new proposal lineage, never a flipped latch.

### Spec — `status.approved` ONLY

A spec takes exactly one latch this skill may set: `status.approved` (the human signs the spec off as the contract). There is **no "reject a spec" latch** — do not invent one. If the user wants to abandon a spec, explain the two real paths and record nothing:

- **Drop the thread** — abandoning the whole effort is a terminal disposition recorded on the thread's ledger, not a latch on the spec. This skill never writes the ledger; point the user there.
- **Open a new spec lineage** — a different direction for the spec is the next `NNN` lineage folder, authored separately.

The spec's later `status.implemented` latch is **out of scope for this skill** (see `## Hard Exclusions`).

### Review — `status.disposed` + `status.disposition` (+ optional `status.rationale`)

Disposing a review sets, in the review's own frontmatter `status:` map, all of:

- `status.disposed: <stamp>` — the moment it was disposed.
- `status.disposition: accepted | rejected` — `accepted` (the finding is taken; revising the target is a separate authoring act, not performed here) or `rejected` (the finding is declined).
- `status.rationale: <thread-relative path>` — OPTIONAL, set ONLY when the user supplies a path to a record (typically a decision log) that explains the disposition. Never invent it and never require it.

Disposing **freezes the review's frontmatter**. A review carrying no `status.disposed` is open by parse; once disposed it is set-once.

### Plan — no latch exists

A plan carries **no status latch and no `version`** — refuse any verdict against a plan and explain: a plan is a disposable working document, not a signed contract, and nobody approves a plan. Its quality is the derived verdict of a separate downstream adherence review, never a latch recorded here. Touch nothing on a plan.

## Latch Mechanics

Once the artifact and verdict are resolved and the verdict is allowed for the type:

1. **Capture the stamp at write time.** Compute a 12-character `YYMMDDHHMMSSZ` UTC stamp (two-digit year, month, day, hour, minute, second, trailing `Z`) at the moment you write the latch. Never re-derive it afterward, and never bake a stamp into a filename or folder.
2. **Write the latch nested INSIDE the `status:` map.** Every latch lives under the frontmatter `status:` map — never as a loose top-level key, never collapsed into a single status value. If the artifact has no `status:` map yet (an empty `status: {}` or none at all), create the map and add the latch under it. The exact YAML spelling is free as long as the map model holds.
3. **Set-once — refuse if the latch is already present.** A latch records an event that already happened; it does not revert and is never overwritten or flipped. If the relevant latch is already set, **REFUSE** and explain: to change direction, open a new lineage or drop the thread — never flip a latch in place.
4. **Touch only the frontmatter status latch.** Never edit the artifact's body. Recording a verdict changes one lifecycle bit in the frontmatter and nothing else.

The intended frontmatter shapes after this skill writes:

A proposal, after approval (or, alternatively, rejection):

```yaml
status:
  approved: <YYMMDDHHMMSSZ>
```

A spec, after approval (the `implemented` latch is added later, by the thread's terminal sealing step — not here):

```yaml
version: <int>
status:
  approved: <YYMMDDHHMMSSZ>
```

A review, after disposition:

```yaml
status:
  disposed: <YYMMDDHHMMSSZ>
  disposition: accepted
  rationale: <thread-relative path>   # only if the user supplied one
```

## Hard Exclusions

This skill records a small, fixed set of verdict latches and nothing else. It NEVER:

- **Sets `status.implemented` on a spec.** That latch is set later, in one terminal action that also seals the thread on its ledger and brings the project's living docs current — a step this skill never performs. If asked to mark a spec implemented, REFUSE and point the user to that terminal sealing step.
- **Writes any ledger event.** The thread's append-only ledger (its tier and its `deferred` / `resumed` / `closed:` disposition) is never touched here. Abandoning, pausing, resuming, or sealing a thread is a ledger act, not a verdict latch.
- **Touches a plan's frontmatter** — a plan carries no latch (see above).
- **Reviews, judges, or edits the artifact's content.** It records a decision; it does not make one, and it does not rewrite the body.

## Freeze Awareness

After writing the latch, state the resulting freeze state to the user so the consequence is explicit:

- **Approving or rejecting a proposal FREEZES it.** Its body and frontmatter are now frozen history — no further edits. A new direction is a new proposal lineage, never an edit to the frozen one.
- **Approving a spec does NOT freeze it.** The spec stays alive until it is implemented. But approval makes it a **signed contract**: the only legal later change is an owner-approved, record-backed amendment — never an ad-hoc edit, and never "edit the spec to match the code."
- **Disposing a review FREEZES the review's frontmatter.** Its `status:` map is set-once; reconsidering means a new review, not a frontmatter flip-flop.

### Refuse When the Target Is Already Frozen

Before writing, check the target is not already frozen. **REFUSE with a clear explanation** if:

- the **proposal** is already `approved` or `rejected` (frozen at its latch);
- the **spec** is already `implemented` (frozen — its contract is closed; the only way to change behavior now is the living docs, not the spec);
- the **review** is already `disposed` (set-once);
- the **thread is paused or sealed** in its ledger — read the thread's `ledger.md` (the append-only file at the thread root) and refuse if its last disposition line is `deferred` (paused) or `closed: done` / `closed: dropped` (sealed). A paused or sealed thread is frozen against artifact edits, and recording a latch is a frontmatter edit. Resuming a paused thread, or resurrecting sealed work in a new thread, is a ledger / new-thread act this skill never performs.

A set-once latch already present (step 3 of `## Latch Mechanics`) is itself an already-frozen refusal.

## Report the New Derived Condition

After writing, tell the user the artifact's **new derived condition** — folded from the latches present, never a stored word:

- proposal approved → **Approved**; proposal rejected → **Rejected**;
- spec approved → **Approved** (note "+ has open findings" if an undisposed review is open against it);
- review disposed → **disposed (accepted)** or **disposed (rejected)**.

The condition is read by folding the `status:` map; it is never written into the artifact as a word. Example: `specs/001/spec.md is now Approved.`

## Workflow

1. **Resolve the artifact.** Take the supplied path and resolve the thread root (the ancestor folder holding the thread's `ledger.md`). If the path is missing or vague, or multiple lineages could match, ASK — no recency and no highest-`NNN` fallback.
2. **Detect the type** from path + frontmatter content: proposal, spec, review, or plan.
3. **Get the verdict explicitly.** If the user has not stated a verdict, ASK. Never infer it.
4. **Check the verdict against the type's vocabulary.** Refuse and explain if the verdict is outside it (a spec "rejection", any verdict on a plan, an unrecognized verdict word).
5. **Check the target is not already frozen** per `## Freeze Awareness` — including reading the thread's `ledger.md` and refusing if its last disposition is `deferred` or `closed:`. Refuse if the relevant latch is already set.
6. **Capture the UTC stamp** at write time.
7. **Write the latch** nested under the `status:` map (creating the map if absent), set-once, frontmatter only — never the body. For a review, also write `disposition` and, only if the user supplied one, `rationale`.
8. **Report the new derived condition** and the resulting freeze state. Use thread-relative paths for within-thread references. No closing remark.

## Commit Policy

This skill does NOT commit and does NOT stage. Writing the latch to disk is where it stops. Any commit is the surrounding session's decision — the user, an orchestrator, or a separate commit flow. Do not `git add`, commit, push, or branch.

## Path References

Within-thread references this skill emits or echoes are **thread-relative** (`specs/001/spec.md`, `proposals/002/proposal.md`); a review's optional `rationale` path is thread-relative; cross-thread references are repo-relative (`docs/threads/<other>/…`); never absolute.

## Immutability

This skill writes exactly one lifecycle latch into one artifact's frontmatter `status:` map and nothing else. It never edits a body, never adds source-relation or lineage frontmatter, never writes a ledger line, and never sets a spec's `status.implemented`. A latch is set-once: an already-present latch, an already-frozen target, or a paused/sealed thread is a refusal, not an overwrite.
