## References

- Spec under review: `specs/001/spec.md`
- Thread decision log (spec's upstream authority): `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` (records P1–P64, append-only; later records supersede earlier)
- Operative decision-log records checked against specific findings: P48/P49 (invocation roles + the six primitives), P57 (record-before-use for elicited decisions), P40 (workspace audit and caller-owned draft location), P45 (implementation report contract), P13 (interaction posture as authoring principle)
- Current on-disk skill layout verified during review: `skills/workflow/**`, `skills/deprecated/**` (confirms the migration inventory's "current" paths and the retained-skill workspace check)
- No prior reviews exist under `specs/001/reviews/`.

## Verdict

**ready.** All eight semantic-contract elements are present and coherent, the Context supersession map is accurate against the surviving records, and no settled decision is contradicted or silently reversed. The spec is handoff-grade: a downstream planner/implementer can execute the full V3 cutover from this document plus the cited surviving records without re-deriving supersession chains. Findings are one `issue` and four `nit`s — all refinements to the acceptance layer, none blocking downstream planning. Highest-impact finding: the P57 acceptance criterion (AC-4.4) enumerates a closed skill list that omits `propose` and `roadmap`, two authoring skills whose output is later reconciled — an attended elicited decision in either could be stripped by reconciliation, the exact failure mode P57 was written to prevent.

## Findings

### 1. [issue] AC-4.4's P57 skill enumeration omits `propose` and `roadmap` (decision-log consistency; explicit-decisions / expected-behavior element)

AC-4.4 requires the P57 record-before-use rule to appear "in the instructions of the completion-oriented skills that may legitimately ask" and then enumerates a closed list: `spec`, `plan-strict`, `plan-brief`, the implement skills, `merge-artifacts`, `materialize-roadmap-threads`. It omits `propose` and `roadmap`. Both are completion-oriented authoring skills (like `spec`) that can elicit a direction/decomposition decision under P13's "indispensable judgment" allowance, and both produce artifacts subsequently aligned to `decisions.md` by a reconciliation pass (`reconcile-proposal`, `reconcile-roadmap`). Per P57's own rationale, an attended, user-approved decision embedded in `proposal.md`/`roadmap.md` but not recorded in `decisions.md` is indistinguishable from an invented one and would be flagged or stripped by the reconciler — the precise safeguard-turned-against-itself failure P57 exists to close. The universal statement in the Target design ("Any skill, regardless of posture…") and the doc requirement mitigate this, but the machine-checkable per-skill criterion should include `propose` and `roadmap` so an implementer working from the AC does not leave the rule out of those two SKILL.md bodies.

### 2. [nit] Coverage table overstates completeness — the interaction-posture authoring principle has no dedicated criterion (acceptance-guidance / expected-behavior element)

The Coverage section asserts "Every expected behavior in 'Target design' … is enforced by at least one criterion." The Skill-architecture "Interaction posture" behavior (no `interaction:` frontmatter field or mandatory mode sections; explicit AFK invocation overrides posture) is not enforced by any acceptance criterion; it appears only as required *documentation* content in `skill-authoring.md` (AC-11.3), which verifies the doc describes the principle, not that skills conform. No AC forbids a residual `interaction:` field on a migrated skill. The completeness claim is therefore slightly overstated for this one behavior; downstream impact is small because the AFK-blocked-emits-bundle instances are covered elsewhere (AC-6.1, AC-8.5).

### 3. [nit] `update-implementation-report` is the only primitive lacking a dedicated ownership criterion (acceptance-guidance element)

Five of the six P49 primitives get a "`primitives/<name>/SKILL.md` owns X" criterion (discussion-point AC-4.5, emit-pending-decisions AC-4.3, emit-pending-review AC-7.2, create-thread AC-3.3, append-roadmap-feedback AC-8.3). `update-implementation-report` is verified only indirectly through the implement skills (AC-9.2). Its P49-assigned contract — the P45 merge semantics and specifically *keeping task transcripts and `.implementation-runs/` paths out of the durable report* — is not independently asserted. An implementer could satisfy AC-9.2 (skills call the primitive and the report matches P45's shape) while the primitive's own no-leak guarantee is under-specified.

### 4. [nit] FR-2 / P48 "omission is the model-invocable configuration": the acceptance check can pass without delivering the intent, and the residual unknown sits in Degrees of freedom rather than Unresolved questions (cross-element: acceptance-guidance / constraints / unresolved-questions)

AC-2.3 states "omission is the model-invocable configuration" and checks only the *absence* of the two restrictions. Degree of freedom #11 concedes that if a harness's actual default makes omission insufficient, the implementer must add a positive setting for primitives to be implicitly invocable. Consequently a primitive with no `agents/openai.yaml` at all passes AC-2.3 yet might not be model-invocable on Codex — the P48 intent ("primitives reachable by both model and user") is not something any filesystem/grep criterion can confirm. AC-2.3 does cross-reference DoF #11, so the tension is disclosed rather than hidden; and the "Unresolved questions: None" claim is defensible only because this genuine empirical unknown (Codex's real default) is parked under Degrees of freedom. Both are acceptable handoff choices, but the implementer should be aware the acceptance layer cannot catch a non-invocable primitive.

### 5. [nit] "Machine-checkable" overclaims for criteria that require semantic reading (false precision; acceptance-guidance element)

The Acceptance criteria header says "Machine-checkable, per the tier-2 requirement. Each criterion is pass/fail by filesystem inspection, grep, or reading the named file." Many criteria are not automatable — e.g., AC-3.1 ("`open-thread/SKILL.md` instructs: … never infer a workflow from the subject"), AC-6.2 ("states both lossless directions"), AC-7.3, and the AC-11.x doc-content checks require reading and judging whether prose encodes a contract. The "or reading the named file" clause quietly broadens "machine-checkable" to include human judgment. A reviewer or CI author expecting grep-automatable gates would find a large fraction of the ACs need semantic evaluation; softening the header word would prevent that mismatch.

## Evidence

- Finding 1: spec "Acceptance criteria → FR-4 → AC-4.4" (enumerated skill list); Target design "Thread model → decisions.md" ("Any skill, regardless of posture, that elicits a new human decision mid-run appends it…"); decision log P57 (rationale: "an unrecorded attended answer silently violates that assumption and turns the lossless safeguard against its own user"); reconciliation contracts in P39/P43 for `reconcile-proposal` and `reconcile-roadmap`.
- Finding 2: spec "Acceptance criteria → Coverage" (completeness sentence); Target design "Skill architecture → Interaction posture"; AC-11.3 (skill-authoring.md content only).
- Finding 3: spec AC-9.2 vs. the dedicated primitive criteria AC-4.5 / AC-4.3 / AC-7.2 / AC-3.3 / AC-8.3; decision log P49 "`update-implementation-report`" ("preventing task transcripts or `.implementation-runs/` references from leaking into the durable report"); Target design "Implementation outcome" ("no run transcripts, no `.implementation-runs/` references").
- Finding 4: spec AC-2.3 and Degrees of freedom #11; "Unresolved questions" ("None"); decision log P48 (omission clause) and P49 (primitive descriptions/invocability).
- Finding 5: spec "Acceptance criteria" header sentence, contrasted with AC-3.1, AC-6.2, AC-7.3, AC-11.1–AC-11.4.

## Open Questions

- Should AC-4.4's enumeration add `propose` and `roadmap` (and, for symmetry, is there any completion-oriented authoring skill that may elicit and is still unlisted)? This is answerable by the spec author from P57's universal intent.
- Is Codex's actual default implicit-invocation behavior known well enough to close Degree of freedom #11 to a definite instruction, or does it genuinely remain an implementation-time empirical check? This may only be answerable during implementation against the live harness.
- Does the author intend the Coverage completeness claim to be literal (implying an interaction-posture AC is needed), or is documentation coverage via AC-11.3 considered sufficient (implying the claim's wording should be softened)?

## Next Actions

- Revise the spec in place to fold Finding 1 (add `propose` and `roadmap` to AC-4.4) — the only finding with a concrete downstream failure mode; disposition this review as accept-and-revise once done.
- Optionally address the four nits in the same revision: add a dedicated `update-implementation-report` primitive criterion (Finding 3), add or soften the Coverage completeness claim re: interaction posture (Finding 2), and adjust the "machine-checkable" header wording (Finding 5). Finding 4 needs no spec change beyond awareness.
- This spec drives a repository-wide methodology cutover and has had a standard handoff-grade review but not an adversarial pass. Given the stakes, run a separate adversarial/pre-mortem review against the spec (e.g., "what in this cutover silently breaks distribution, the Raycast manifest, or an existing untouched V2 thread") before escalating to planning.
