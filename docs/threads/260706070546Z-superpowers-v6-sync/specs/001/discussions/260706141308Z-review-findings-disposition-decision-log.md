# Decision log — disposition of the two reviews on the superpowers v6 sync spec (specs/001/spec.md)

Thread: docs/threads/260706070546Z-superpowers-v6-sync/
Target: specs/001/spec.md
Subject: disposing the findings of the lossless-mapping review (specs/001/reviews/260706135654Z-spec-lossless-mapping-review.md) and the spec quality review (specs/001/reviews/260706135730Z-superpowers-v6-sync-spec-review.md) — how each finding is acted on in the spec revision.

## P1: Rewrite the reviewer method files' sequential-pass framing for the merged dispatch

Point: spec-review finding 1 [issue] — the two reviewer method files still encode a sequential two-pass model ("FIRST review pass", "SECOND review pass", "the plan-compliance reviewer ran first and has already PASSED", "you trust that verdict") that contradicts the merged single-dispatch decision, and the spec's "lossless behavior surface" constraint would instruct an implementer to leave that stale framing intact.

What you need to know: The seed log's P1 decision text already answers the reviewer's open question (independent lanes vs. sequential mental model inside one dispatch): both verdicts come back together and the fix loop routes by lane, so there is no "first pass already passed" fact for the quality lane to trust — a diff can now fail plan-compliance and receive code-quality findings in the same report.

Decision: Accept the finding. Revise spec §5 to add an explicit item: rewrite both method files' pass-ordering framing into two-lane single-dispatch framing — one reviewer, two verdicts, each lane judged independently, no cross-lane trust. Add a matching AC (no first/second-pass or trust-that-verdict framing remains). Reconcile the "lossless behavior surface" constraint so enumerated spec changes explicitly override it.

Rationale: A literal implementer following the spec as written would ship a merged reviewer whose own method text asserts a false precondition and invites the quality lane to skip independent judgment. The fix pins the model the seed log's P1 already chose.

## P2: Teach review-plan the seven-element task shape

Point: spec-review finding 2 [issue] — the spec never instructs review-plan to recognize the new task-file shape, so a task file omitting the mandatory `Consumes:`/`Produces:` lines would pass review (the structural check only covers index↔folder correspondence; the matching check finds nothing to match when the lines are absent).

What you need to know: review-plan today defines a strict task as "SIX labeled fields"; the spec adds a seventh element to the format but assigned review-plan no field-presence check for it.

Decision: Accept the finding. Revise spec §3/FR-2: review-plan's definition of a valid task becomes the seven-element shape (six fields plus both hand-off lines), and a new AC requires flagging any task file lacking either hand-off line.

Rationale: Mandatory-with-explicit-`none` (seed log P6) only holds if some consumer checks presence; review-plan is the natural and already-assigned format checker.

## P3: Assign the Global Constraints drift check to review-plan explicitly

Point: spec-review finding 3 [issue] — seed log P15 accepted the verbatim-copied Global Constraints block on the explicit rationale that it is "verbatim-copied *and review-checked*," but the spec assigns review-plan no check that the index block matches the source's constraints, so the drift P15 fenced is not guaranteed to be caught by any named consumer.

What you need to know: The alternative was relying on review-plan's general adherence pass, which maps acceptance criteria and outcomes onto tasks — not the source's Constraints element onto the index block. The explicit check is cheap and mechanical.

Decision: Accept the finding with the explicit-assignment option: new AC under FR-2 — review-plan verifies the index's Global Constraints block matches the source artifact's stated constraints verbatim and flags drift.

Rationale: P15's accepted rationale relied on this net existing; leaving it implicit under-delivers the decision as logged. The general-adherence alternative was considered and rejected as exactly the gap P15 believed was closed.

## P4: Narrow AC-6.4's model-content check

Point: spec-review finding 4 [nit] — `grep -i "model"` is an over-broad proxy for the no-model-selection criterion; it false-positives on "mental model"/"data model" and invites wording contortions.

What you need to know: The underlying criterion (no model-selection content, seed log P10) is correct; only the mechanical proxy is imprecise.

Decision: Accept. Reword AC-6.4: the criterion is the absence of model-selection content (model choice, tier advice, explicit-model mandates); the grep is demoted to a starting probe whose hits are adjudicated against that criterion, not counted as failures.

Rationale: Keeps the AC checkable without making an innocent substring a spec violation.

## P5: Pin the scratch-folder name for descriptor-bearing lineages

Point: spec-review finding 5 [nit] — `plans-NNN` is ambiguous when a plan lineage carries a descriptor (`plans/001-cli/` → `plans-001` or `plans-001-cli`?), affecting scratch paths and resumed-run ledger lookup.

What you need to know: Two implementers could pick different paths; a resumed run must locate the existing ledger deterministically.

Decision: Accept. One-line rule in the spec: the scratch folder mirrors the full lineage folder name — `.wip/implement/plans-NNN[-<desc>]/` (`plans/001-cli/` → `plans-001-cli`); shorthand `plans-NNN` elsewhere in the spec denotes this mirrored name.

Rationale: Mirroring the lineage folder name verbatim needs no new naming decision at run time and keeps ledger lookup deterministic.

## P6: Ratify the major version bump as a pinned constraint

Point: lossless-mapping review, section-(a) finding — the spec commits the four modified skills to a *major* version bump, a magnitude the seed discussions never raised and the spec does not mark as a Degree of Freedom.

What you need to know: The repo rule mandates only *that* a bump happen on meaningful change, not its magnitude, so "major" was a real unforced choice. The two exits offered by the review: ratify it as a pinned constraint, or move the magnitude into `## Degrees of freedom`. The review judged the other two disclosed derived pins (no-migration of old-format plans; re-reviews return both verdicts + ledger block carries the commit SHA) as clean mechanical derivations, not findings.

Decision: Ratify — "major version bump" stays pinned in the spec's Constraints, now backed by this record (this disposition supplies the user acceptance the lossless bar requires).

Rationale: The format change is unambiguously breaking (old single-file plans fail the new pre-flight), so major is the semver-consistent magnitude, and pinning it keeps the four skills' bumps mutually consistent — a DoF here would invite four implementers to pick four magnitudes.
