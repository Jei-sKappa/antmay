---
status:
  disposed: 260629115823Z
  disposition: accepted
---

# Lossless-mapping review — spec 001 (jastr template migration)

## References

- Document under review (spec): `specs/001/spec.md`
- Genesis decision log it maps from (P1–P10): `seed/discussions/260628151324Z-rendering-distribution-model-decision-log.md`
- Seed that opened the thread: `seed/seed.md`
- Source-set note: the spec self-declares its source — "All settled decisions in this spec are cited as `DL P<N>`, referring to the genesis decision log" — so the in-scope discussion set is unambiguous: the one genesis decision log plus the seed. There is no `specs/001/discussions/` folder and only one spec lineage (`specs/001`), so no lineage or thread disambiguation was needed.

## Verdict

**Lossless — the review passes.** Both Findings sections below are empty: every decision and assumption the spec commits to traces to a P1–P10 decision the user saw and accepted (or is explicitly handed to the implementer in `## Degrees of freedom`), and every decision in P1–P10 is carried somewhere in the spec. The single point where the spec was most tempted to over-commit — versioning of the one-time rebaseline — it correctly declined to decide and routed to `## Unresolved questions` instead of smuggling a choice (see (a) below). One incidental, non-mapping editorial defect is noted under Next Actions; it does not affect the verdict.

## Findings

### (a) Smuggled-in — decisions/assumptions the user never accepted

**None.** Every committed choice and presupposition in the spec maps to an accepted decision or is openly declared a Degree of freedom. Spot-checks of the items most likely to be additive:

- **The unsettled rebaseline-versioning case is NOT smuggled.** P7 settles "bump `metadata.version` iff rendered output changed," but never addresses the one-time rebaseline where every file carries at least a benign-formatting diff. Expected behavior §8 and AC-8.1 both explicitly carve the rebaseline case out and route it to `## Unresolved questions` ("do not bump all 29 versions on that basis without confirming it first"). This is the correct handling — declining to commit rather than picking a default — so it is a pass, not a finding.
- **Tool-capability presuppositions check out against the vendored jastr.** AC-1.4 presupposes a `jastr validate <ref>` subcommand and AC-4.1 presupposes `::include` / `::if` directive tokens. Both were verified to exist in the vendored jastr at `.library/sources/Jei-sKappa_jastr/` (`makeValidateCommand` is registered in `program.ts`; `if`/`else-if`/`else`/`include` are the engine's directive names). They are therefore legitimate *derived acceptance criteria* mechanically realizing P1's "valid `targets.agent-skill` or generation fails" and the self-containment guarantee — not presuppositions of capabilities the discussions never established.
- **The C→B upgrade-trigger text is accepted material, not invented.** Expected behavior §9's trigger wording ("sibling templates … mostly a parametrized-identical body, or … the same logical section … edited across 3+ siblings in one change") matches the example the user accepted in P2's rationale, which directed the spec to record exactly such a trigger.
- **The named partial set is correctly demoted to a starting point, not pinned.** P2 names specific drift candidates and P10 supplies the reconcile-vs-keep criterion ("when unsure, keep separate"). The spec carries both: §3 lists the high-confidence candidates *and* makes the exact final set a Degree of freedom governed by the P10 criterion, while AC-3.2 still holds the line that the targeted candidates must collapse. This is a faithful synthesis of P2 and P10, not an over- or under-commitment.

### (b) Dropped — decisions the user made that the document failed to capture

**None.** Each of P1–P10 is carried in the spec:

- P1 (build-time inline render, no consumer jastr, router rejected) → Intended outcome, Scope (out-of-scope router wrappers), Constraints (inline contract, no consumer-side jastr), FR-4/FR-10/FR-11.
- P2 (start at C; single group from day one; reconcile drift candidates, don't relocate verbatim; record C→B trigger) → Scope (B deferred), Constraints (single flat group), Expected behavior §3 and §9, FR-3.
- P3 (single committed `.jastr/workflow/` group, partials at group root, AGENTS.md (a)/(b)/(c), consumer surface unchanged) → Expected behavior §1/§3/§9/§10, FR-1/FR-9/FR-10.
- P4 (`generate-skills.sh` two modes, `JASTR_BIN` indirection, `.library` bundle, prefer `default:` over `required:`, clean template start, optional hook) → Constraints and Expected behavior §5, FR-5.
- P5 (convert all 29; batching deferred to plan) → Scope (out-of-scope batching), Expected behavior §2/§6, Degrees of freedom (conversion order).
- P6 (git-diff content-preserving rebaseline, classify every hunk, not byte-identity) → Constraints, Expected behavior §7, FR-7.
- P7 (bump version iff rendered output changed) → Expected behavior §8, FR-8 (rebaseline case correctly excluded).
- P8 (`metadata: {author, version}` passthrough) → Expected behavior §4, AC-4.2.
- P9 (deprecated skills not migrated) → Scope, Expected behavior §2, AC-2.3.
- P10 (reconcile-vs-keep criterion, when-unsure-keep-separate) → Expected behavior §3, FR-3, Degrees of freedom.

## Next Actions

- **On the lossless-mapping axis, the spec is ready to be approved.** It faithfully carries every decision the user made and smuggles in none — the human's sign-off would be an approval of a document that maps cleanly to what was decided.
- **Incidental (outside the lossless axis — does not gate approval):** the Out-of-scope bullet on family-merging points the reader to "(see Expected behavior §8)" for the C→B trigger, but the trigger is recorded in **§9** (§8 is Versioning). This is a one-off internal cross-reference typo, not a mapping defect; worth correcting in the same revision pass if the spec is touched, but it changes no decision and requires no discussion to dispose.
