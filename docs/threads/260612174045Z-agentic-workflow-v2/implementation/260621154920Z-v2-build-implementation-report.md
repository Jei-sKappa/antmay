# Implementation Report — Modular Agentic Workflow V2 build

A consolidated, post-build implementation report for the in-repo V2 build (branch
`workflow-v2`): the nine `docs/workflow/v2/` reference docs, the skill changes, and
the repo upkeep. The build was executed across orchestrated multi-session handoffs
rather than a single `implement-*` run; this record is emitted retroactively at the
finish stage so the deviations, surprises, problems, and — most importantly — the
deferred follow-ups have one discoverable home before the thread seals. It is a
record: immutable once emitted.

## References

Within-thread references are thread-relative; deliverables outside the thread are
repo-relative; none absolute.

- The build contract — spec `version: 2`, Approved: `specs/001/spec.md`
- The build plan (three phases, 30 tasks): `plans/001/plan.md`
- The verify-stage review (PASS): `implementation/reviews/260621153015Z-v2-build-implementation-review.md`
- Spec-review decision log (owner-flag dispositions SR-P1–P10, incl. the FR-R5 amendment): `specs/001/discussions/260620171014Z-spec-review-and-flags-decision-log.md`
- Proposal decision log (design decisions P1–P21): `proposals/001/discussions/260612201354Z-proposal-v1-review-findings-decision-log.md`
- Deliverable A — the V2 reference docs: `docs/workflow/v2/`
- Deliverable B — the skills: `skills/workflow/`, plus the relocated `skills/deprecated/capture-inbox/`

## Deviations from the plan (with justification)

1. **Executed via orchestrated handoffs, not a single `implement-*` run.** Phase 1
   (docs) was authored in one coherent session for cross-reference integrity; Phase 2
   (skills) ran through a sequential sub-agent orchestrator (one focused agent per
   task, verified from disk, committed per task); Phase 3 + FR-R5 + the GSD chore ran
   as focused handoffs. *Justification:* scale (≈32 FRs across docs, skills, upkeep)
   and context-window management. The plan's tasks were deliberately written
   independently-implementable to permit exactly this.

2. **Per-phase / per-task commit batching.** Phase 1 = one commit; Phase 2 = ~18
   per-task commits; Phase 3 = its own commits; FR-R5 and the GSD removal = two
   commits; the self-containment scrub = one. *Justification:* the plan delegated
   sequencing and commit-batching to the implementer (spec §5 degree-of-freedom #12).

3. **Mid-build spec amendment (FR-R5).** FR-R as approved under-scoped the
   documentation work: it covered the README skill-index mechanics but not the README
   *overview prose*, the per-entry "V1/v1" phrasing on unchanged-frontmatter skills,
   or the `AGENTS.md` Layout block. Per the spine's outcome-3 (a build surfacing a
   spec fault routes to the owner and fixes the *spec*), this was handled by an
   owner-approved, record-backed **amendment** adding FR-R5 (SR-P10) — the first use
   of the post-Approved amendment mechanism — rather than by silently V2-ifying
   outside the contract.

## Surprises

1. **Decision-log misattribution (flag F-7).** The proposal decision log (P5)
   attributed the "update past logs on explicit request" behavior to the active
   `discussion` skill; it actually lived in the *deprecated* `discussion-loop`. Caught
   by the spec-authoring session. No build impact — the records-immutable rule was
   correctly encoded in the active `discussion` / `seeded-discussion`.

2. **Orphaned V1 state caught at the Phase-2 exit gate.** A leftover
   `spec-interactive/references/` folder still held V1 docs, and the
   `implement-plan-with-subagents-*` reviewer briefs still cited the V1 plan path.
   Both fixed inside Phase 2.

## Problems hit

1. **Leaked tool-call tags.** A fresh-session author left `</content>` / `</invoke>`
   tags at the end of the revised proposal; caught on from-disk verification and
   removed. Reinforced the standing discipline used at every gate: verify the files,
   never trust a session's self-report.

2. **Ledger basename collision.** The per-thread ledger and the lifecycle *rules* doc
   both wanted `lifecycle.md`. Resolved by renaming the per-thread ledger to
   `ledger.md` (SR-P2), freeing `lifecycle.md` for `docs/workflow/v2/lifecycle.md`.

3. **Verify-stage self-containment advisory.** Twelve active skill bodies named
   "V1"/"V2" in prose (an `AGENTS.md` self-containment violation, outside every spec
   AC). Scrubbed editorially with behavior preserved and no version bumps (commit
   `8413641`).

## Follow-ups (deferred — route to future threads or the tracker)

These are deferred by design ("build the mechanism when the pain is real"). They are
already recorded in the approved spec's §6 and the decision logs; this list
consolidates them as the single discoverable hand-off for future work.

1. **Freeze-guard tooling** (F-2). V2 immutability/freeze is *convention-enforced
   only* until a pre-commit / CI guard is built. The guard's rules (closed → reject
   all; deferred → reject all but a ledger-only `resumed`/`deferred`; pre-image check)
   are fully specified in `docs/workflow/v2/lifecycle.md`; only the mechanism is
   unbuilt.

2. **PR-enforcement CI gate** (P10). Tier-≥2 PR discipline is a strong recommendation;
   mechanical forcing (a CI check reading the ledger tier) is deferred.

3. **`whats-next` CLI and materialized `state.json` projection** (F-6). The skill
   derives status now; a standalone CLI and an on-demand materialized projection are
   deferred until needed.

4. **skillrouter variant unification** (P5/P6). Collapse the `-auto` / `-interactive`
   skill pairs — and the broader "interactive ≈ discussion-loop + auto" redundancy —
   into single flag-driven skills via the skillrouter tool. New skills already default
   to auto-only to stay aligned with this direction.

5. **Pre-V2 thread migration — intentionally not done.** Pre-V2 threads are
   grandfathered (never migrated, never mixed); only this standard-setting thread was
   made V2-conformant. Recorded for clarity; no action.
