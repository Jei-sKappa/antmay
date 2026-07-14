---
status: {}
---

# Lossless-mapping review — Project V3 cutover spec

## References

- Document under review (spec): `specs/001/spec.md`
- Discussion set (single append-only decision log, 64 records P1–P64): `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md`
- Spec's own escape hatch checked against for section (a): `specs/001/spec.md` → `## Degrees of freedom` (items 1–11) and `## Scope → Out of scope`
- Supersession chains verified against the log: P10⊃P4/P5/P6; P18⊃P1/P2/P15(variant); P24⊃P18(seed line)/P22(child selection); P31⊃P13(`.wip/needs-decision.md`)/broadens P28; P33⊃P32; P40⊃P28(`.drafts/`,`.runs/`); P47⊃P33(`Resume:`)/P34(auto-resume); P54⊃P8/P19/P29/P31(review clauses); P53 narrows P26; P58 clarifies P44; P55/P64 template canonicalization, P64⊃P55(canonical-copy clause); P62⊃P23(layout tree as depiction)

## Verdict

**Lossless — the review passes.** Both Findings sections below are empty. Every choice and presupposition in the spec traces to a surviving (non-superseded) decision the user accepted in the log or to an item the spec openly declares a Degree of freedom, and every surviving user decision is carried into the spec. One low-stakes Open Question is recorded for the human to settle; it is not a blocking finding.

## Findings

### (a) Smuggled-in — decisions/assumptions the user never accepted

None. Every committed choice and presupposition in the spec was checked against the log or the spec's own `## Degrees of freedom` / `## Scope` sections and found either accepted or legitimately handed to the implementer. Specifically:

- The three workflow sequences (Quick/Standard/Roadmap) reproduce P43 verbatim including bracketing (discussion unbracketed in Standard/Roadmap, bracketed in Quick; reconciliation unbracketed; reviews bracketed); the escalation tail matches P44+P58.
- The thread layout tree reproduces P62 (not P23's stale `.wip/` tree); the three temporary workspaces match P40 (`.implementation-runs/`), P31–P34/P47 (`.pending-decisions/`), P36/P38 (`.pending-reviews/`).
- The reconcile/review taxonomy and skill dispositions match P35/P37/P39/P43; anchors match P56; bundle shapes match P33/P47 (no `Resume:`, required `## Suggested action…`) and P36 (Reviewer/Target/Created/Findings + `F<N>`).
- The migration inventory (renames, retirements, additions, deep rewrites, retain list, 15-group layout, 7-item deprecated set), primitives (six per P49), metadata scheme (P48), docs tree (P17), derived files, and sync tooling (P64/P55) all trace to their cited records; counts like "fifteen groups" and the `.vscode`/`.gitignore`/marketplace edits are mechanical derivations, not new commitments.
- Items that could look additive are explicitly parked in `## Degrees of freedom`: the legacy `.wip/` ignore-rule fate (DoF #9), the Codex positive-setting fallback beyond P48's "omission" default (DoF #11), collision-suffix schemes (DoF #6), and all prose/wording/versioning freedoms (DoF #1–5, #7–8, #10) — so they are legal moves, not smuggled decisions.

### (b) Dropped — decisions the user made that the document failed to capture

None. Every surviving user decision has a home in the spec. Spot-checks of decisions most at risk of being dropped:

- P57 (record every elicited human decision before use) → `Target design → decisions.md` + AC-4.4.
- P58 (escalated threads adopt the *complete* Standard tail incl. `reconcile-plan`) → Escalation bullet + AC (not silently reduced).
- P60 (archival warns about live pending state, deletes nothing) → Lifecycle/archive + AC-10.3.
- P61 (branch-agnostic) → External references and branches + AC-10.4.
- P63 (no V2-awareness; mismatch → agent judgment) → Skill architecture + AC-1.4/AC-15.2.
- P21 descendant-feedback loop **both** directions (append authority + child consumption) → Roadmap artifacts + AC-8.5.
- P54's consolidated supersession is honored (no pre-P35 auto-fixing "review" or review-writes-to-`.pending-decisions/` semantics leak into the reconcile/review section).
- P52 (archival-link repair), P14's future public rebaseline, and P30 (dependency-aware installation) are **not** dropped omissions — they are captured as explicit `## Scope → Out of scope` items with their owning future work, matching the user's stated exclusion to the spec author. Recording them as out-of-scope is the lossless outcome, not a loss.

## Open Questions

1. **Raycast generator: "no generator redesign" (P51) vs. AC-14.1's "minimally adjusted only if the new layout breaks it."** The spec body (`Cutover work → Derived repository files → Raycast`) restates P51 as "through the existing sync script only; no manual manifest edits, no generator redesign," but AC-14.1 relaxes to "functionally unchanged (or minimally adjusted only if the new layout breaks it)." P51 only authorizes *using* the existing generator; it does not explicitly authorize editing it. This is most likely a faithful necessity-derivation (a generator that breaks on the new group layout cannot "regenerate through it" without a minimal fix, and "minimal adjustment" ≠ "redesign"), so it is filed here rather than as a section-(a) finding — but the user should confirm the minimal-adjustment allowance is intended and not an over-grant, and if so consider having `reconcile-spec` reconcile the small wording tension between the body ("no generator redesign") and AC-14.1.

## Next Actions

- On the lossless-mapping axis the spec is ready to be approved: it commits to nothing the user did not accept in the log and drops no surviving decision.
- Optionally, in the follow-on discussion, settle Open Question 1 (confirm the AC-14.1 generator-adjustment allowance and, if desired, tighten the wording so the body and AC agree). This is a single low-stakes clarification, not a blocker; no other disposition action is required for this review.
