# Task 12: Rewrite reconcile-proposal

**Objective:** Rewrite the moved `reconcile-proposal` (formerly `review-proposal`) as a mutating reconciliation operation that aligns `proposal.md` with the thread's decisions.

**Input / context:** The cutover spec `specs/001/spec.md` § "Reconciliation versus review" and AC-6.1/AC-6.3 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P35 (reconciliation semantics; one fixed mutation contract, no invocation-time modes), P39 (`reconcile-proposal` responsibility: align the proposal with existing decisions, fix supported discrepancies, queue missing intent; no separate read-only proposal review exists), P43 (proposal + reconcile-proposal form one optional group). Current file: `skills/workflow/reconcile/reconcile-proposal/SKILL.md` (still the V2 read-only `review-proposal` body — replace wholesale).

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: set `name: reconcile-proposal` (must match the folder); concise human-facing `description`; `disable-model-invocation: true`; `metadata.author`; bump `metadata.version` (major appropriate for the rename + contract change).
2. Create `skills/workflow/reconcile/reconcile-proposal/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — reconciliation contract: read `seed.md`, `decisions.md`, and the thread-root `proposal.md` (its declared, editable target); correct the proposal wherever the fix follows from authoritative existing decisions (omissions, contradictions, unsupported additions); recheck the proposal after fixing.
4. Body — irreducible intent: where resolving a discrepancy requires a NEW human decision, emit one coherent bundle via `/emit-pending-decisions` (producer `reconcile-proposal`, target `proposal.md`) instead of inventing an answer; genuinely unresolved risks or ambiguities in the proposal become pending decision points, not silent edits.
5. Body — authority boundary: never edit `decisions.md` or `seed.md` to make the proposal look consistent — a source fault is itself a pending human decision. Produce no review report and no file on a clean pass (a concise chat summary of what was checked/fixed suffices).
6. Body — no invocation-time modes: the skill has exactly this mutation contract; do not offer report-only or check-only variants.

**Files modified:** `skills/workflow/reconcile/reconcile-proposal/SKILL.md` (rewritten), `skills/workflow/reconcile/reconcile-proposal/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'name: reconcile-proposal' skills/workflow/reconcile/reconcile-proposal/SKILL.md
grep -n 'disable-model-invocation: true' skills/workflow/reconcile/reconcile-proposal/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/reconcile/reconcile-proposal/agents/openai.yaml
grep -n 'emit-pending-decisions' skills/workflow/reconcile/reconcile-proposal/SKILL.md
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/reconcile/reconcile-proposal/ ; \
grep -riwE 'tier|ledger' skills/workflow/reconcile/reconcile-proposal/   # both must return nothing
```

**Acceptance criteria:**

- The body: edits its declared target (`proposal.md`) when corrections follow from existing decisions; rechecks after fixing; emits `.pending-decisions/` bundles via `/emit-pending-decisions` for irreducible human intent; never edits its authority source; produces no review report (spec AC-6.1).
- No invocation-time report-only/auto-fix mode switches exist (spec AC-6.3).
- Frontmatter `name:` matches the folder; P48 metadata pair present; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts (no "this is no longer a review" narration); no rule stated twice.

**Consumes:** the moved folder (Task 1); `/emit-pending-decisions` contract (Task 3); thread-root `proposal.md` (Task 11).

**Produces:** the V3 `reconcile-proposal` skill.
