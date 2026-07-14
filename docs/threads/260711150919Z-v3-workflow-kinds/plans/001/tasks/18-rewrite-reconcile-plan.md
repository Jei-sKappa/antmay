# Task 18: Rewrite reconcile-plan

**Objective:** Rewrite the moved `reconcile-plan` (formerly `review-plan`) as the reconciliation operation that aligns the strict plan with its spec.

**Input / context:** The cutover spec `specs/001/spec.md` § "Reconciliation versus review" and AC-6.1/AC-6.3 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P35 (reconciliation semantics), P39 (`reconcile-plan` responsibility: align the plan with the specification and repair plan faults; the old auto-correcting behavior already matches reconciliation — preserve and simplify it), P43 (unbracketed normal step after `plan-strict`). Current file: `skills/workflow/reconcile/reconcile-plan/SKILL.md` (still the V2 `review-plan` body with four-outcome sorting, durable review reports, and latch checks — replace those with the plain reconciliation contract; keep the plan-versus-spec adherence analysis and the plan-fault auto-fix craft).

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine; the skill legitimately reasons about the thread's spec and its degrees of freedom — that is its job.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: set `name: reconcile-plan` (must match the folder); concise human-facing `description`; `disable-model-invocation: true`; `metadata.author`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/reconcile/reconcile-plan/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — operation: read the thread-root `spec.md` (the authority), `decisions.md`, and the plan (`plan.md` index plus `plan-tasks/`, its declared editable target); check that executing the plan satisfies the spec within the spec's stated degrees of freedom; FIX plan faults directly (missing coverage, contradiction of a pinned contract, invented commitments, broken index/task consistency); recheck the plan after fixing.
4. Body — spec faults: when the discrepancy originates in the spec, or resolving it requires new human intent, emit one coherent bundle via `/emit-pending-decisions` (producer `reconcile-plan`, target the plan) — never patch the spec or plan around a source fault.
5. Body — output: no review report and no file on a clean pass; a concise chat summary of what was checked and fixed. No invocation-time report-only/auto-fix modes.

**Files modified:** `skills/workflow/reconcile/reconcile-plan/SKILL.md` (rewritten), `skills/workflow/reconcile/reconcile-plan/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'name: reconcile-plan' skills/workflow/reconcile/reconcile-plan/SKILL.md
grep -n 'disable-model-invocation: true' skills/workflow/reconcile/reconcile-plan/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/reconcile/reconcile-plan/agents/openai.yaml
grep -n 'emit-pending-decisions' skills/workflow/reconcile/reconcile-plan/SKILL.md
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/reconcile/reconcile-plan/ ; \
grep -riwE 'tier|ledger' skills/workflow/reconcile/reconcile-plan/   # both must return nothing
```

**Acceptance criteria:**

- The body: edits its declared target (the plan) when corrections follow from the spec and decisions; rechecks after fixing; emits `/emit-pending-decisions` bundles for irreducible or spec-fault intent; never edits its authority source; produces no review report (spec AC-6.1).
- No invocation-time mode switches (spec AC-6.3).
- Frontmatter `name:` matches the folder; P48 metadata pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or rename/migration narration; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** the moved folder (Task 1); `/emit-pending-decisions` contract (Task 3); the `plan.md` + `plan-tasks/` shape (Task 17).

**Produces:** the V3 `reconcile-plan` skill.
