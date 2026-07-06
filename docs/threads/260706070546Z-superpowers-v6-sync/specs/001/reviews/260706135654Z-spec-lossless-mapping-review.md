---
status:
  disposed: 260706141308Z
  disposition: accepted
  rationale: specs/001/discussions/260706141308Z-review-findings-disposition-decision-log.md
---

# Lossless-mapping review — superpowers v6 sync spec

## References

- Document under review (spec): `specs/001/spec.md`
- Discussion set the spec maps from (one decision log, records P1–P15): `seed/discussions/260706072854Z-superpowers-v6-adoption-decision-log.md`

Records cited by identifier below refer to that decision log.

## Verdict

**Not lossless — one section-(a) finding, section (b) empty.** The mapping is otherwise complete and additive-free: every one of the fifteen decision-log records (P1–P15) is carried into the spec, and no smuggled design choice was found beyond a single low-impact item. The lone finding is the spec's commitment to a **major** version bump for the four modified skills — a choice the discussions never raised and that the spec does not place in `## Degrees of Freedom`. It is defensible as a repo-rule/semver consequence, so the likely disposition is ratify-or-mark-DoF rather than a design reversal; it is flagged because per this review's rules the user never saw-and-accepted it.

## Findings

### (a) Smuggled-in — decisions/assumptions the user never accepted

- **Major version bump (`## Constraints`, spec.md:175; enforced by AC-10.4, spec.md:251).** The spec commits the four modified skills to a **major** version bump, justified as "breaking artifact-format / orchestration-contract change under the repo's 'bump on meaningful change' rule." Versioning is never discussed anywhere in P1–P15 — the log settled the adoption inventory, not release mechanics. The repo rule the spec cites mandates only *that* a bump happen on a meaningful change; it does not fix the *magnitude*, so "major" (vs. minor) is a real, unforced choice among alternatives. It is not declared a Degree of Freedom. This is a genuine section-(a) item, but a low-impact one: given the format change is unambiguously breaking (old plans fail the pre-flight — see the note below), "major" is the semver-consistent reading, so the honest disposition is likely to ratify it as a repo-rule step or to move it into `## Degrees of Freedom`, not to remove a design commitment.

The other two deliberately-derived pins were scrutinized and are **not** findings — each follows mechanically from decisions the user did accept:

- **No-migration of old-format plans (spec.md:45).** "Plans are disposable compiler-IR" is a stated premise the user accepted (P3 rationale; P4 "the plan is disposable compiler-IR with no frontmatter and no status latch"). A disposable, regeneratable artifact has no coherent "migrate" alternative — it is recompiled, not migrated. "An old single-file plan fails the mechanical pre-flight as malformed" follows mechanically from P5 (new index+`tasks/` shape) and P11 (the pre-flight halts on index↔folder mismatch). Legitimate derived consequence, not a new choice.
- **Re-reviews return both verdicts + ledger block carries the commit SHA.** "A fresh merged reviewer (both verdicts again — the diff changed)" (spec.md:104; AC-3.3) is the mechanical consequence of P1's decision to merge into ONE reviewer that returns both verdicts — you cannot re-run half a merged dispatch, and per-lane *routing* (which the spec keeps, AC-3.3) coexists with returning both. The ledger block carrying "the commit SHA + subject" while the commit-message copy "omits the SHA of the commit itself" (spec.md:127–128; AC-5.1) follows from P9: the ledger is the compaction-resume state ("the ledger + `git log` are the resume state"), P9's chat one-liner already carries the SHA (`commit abc1234`), and a commit message cannot contain its own SHA. Legitimate derivations, not smuggled.

### (b) Dropped — decisions the user made that the document failed to capture

None. All fifteen records map into the spec: P1→§4/FR-3; P2→Scope-out + §4 awareness/AC-3.5 + §6; P3→§2/§3/§4/§7/FR-9; P4→§2/§3/§4 deviation-rewording/§7/FR-9 (Task Right-Sizing rubric in both `plan-strict` and `review-plan`); P5→§1/§2/FR-1; P6→§1 task fields + §3 cross-task check/AC-1.3/AC-2.3; P7→§4 scratch + reply cap/FR-4; P8→§4 folder layout/AC-4.3; P9→§4 ledger/FR-5; P10→Scope-out + Constraints/AC-6.4; P11→§4 startup + §1 `Source:` line/FR-6; P12→§5/FR-7; P13→§4 brief-construction + §5 plan-mandated/AC-4.7/AC-7.4; P14→§6/FR-8; P15→§1 Global Constraints + §4 briefs/AC-1.2/AC-4.2. Fine-grained sub-decisions were also carried faithfully (e.g. P8 "gaps are normal," P9 "resolved findings counted, never restated," P12 `NEEDS_CONTEXT` reserved-for-reckless, P13 "never patching the immutable plan mid-run"). Downstream scope items the log did not name explicitly (AGENTS.md Layout update, the repo-wide reference sweep FR-10, `filename-grammar.md`, "no Raycast changes," "no V1 doc edits") are mechanical consistency consequences of the accepted moves/format change or are handled conditionally in `## Degrees of Freedom` (#8) — the DoF pressure valve, correctly used.

## Open Questions

- Is the version-bump magnitude ("major") intended to be a pinned spec constraint, or should it be handed to the implementer as a Degree of Freedom? The repo rule mandates a bump but not the size; the discussions are silent. Settle this in the follow-on disposition rather than autofilling.

## Next Actions

- Dispose the section-(a) finding in a short follow-on discussion: either accept "major" as a repo-rule/semver-mandated step (ratify) or move the magnitude into `## Degrees of Freedom`. Either resolution clears the finding.
- On section (b): nothing to do — the mapping is complete on the loss axis. Once the single (a) item is disposed, the spec carries the user's decisions faithfully and is clear on the lossless-mapping axis to be approved.
