# Task 17: Rewrite plan-strict

**Objective:** Rewrite `plan-strict` to emit the thread-root `plan.md` index plus `plan-tasks/` briefs, shedding all V2 lineage, tier, and workspace rules.

**Input / context:** The cutover spec `specs/001/spec.md` § "Planning", § "Workflows" (escalation), AC-5.1 and AC-4.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P23/P62 (`plan.md` index + `plan-tasks/01-<kebab-slug>.md`), P44/P58 (escalation replaces the brief plan atomically; the thread then continues with the full Standard tail), P51 (rewrite scope), P57, P13/P31. Current file: `skills/workflow/plan/plan-strict/SKILL.md` (238 lines). PRESERVE the strict-plan craft that is independent of V2 machinery: the sequential/isolated/independently-implementable/independently-reviewable task contract, the per-task brief fields (objective, input/context, steps, files modified, verification, acceptance, Consumes/Produces hand-off lines), the no-parallelization rule, no frontmatter on plan files, and the self-review discipline. REMOVE: `plans/NNN/` lineage folders, tier/ledger awareness, `.wip/` candidate-draft rules, V2 thread-resolution ceremony, references to V2 artifact grammars.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine. Note the skill legitimately discusses specs and acceptance criteria as its INPUTS — that is its job, not a leak.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: plan-strict`; concise human-facing `description`; `disable-model-invocation: true`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/plan/plan-strict/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — output paths: the index is the thread-root `plan.md`; task briefs are `plan-tasks/NN-<kebab-slug>.md` (two-digit ordinals). No numbered plan lineages, no UTC stamps, no frontmatter anywhere in the plan artifact.
4. Body — inputs: normally the thread-root `spec.md` (the usual upstream), else `proposal.md`, `decisions.md` + `seed.md`, a GitHub issue, or a raw prompt. Settled decisions are cited as `decisions.md D<N>` in task input/context fields.
5. Body — replacement semantics (P44/P58): when a brief `plan.md` already exists and the user is escalating, replace the complete planning artifact — write the strict index over `plan.md` and create `plan-tasks/` together, never mixing strict tasks with stale brief steps.
6. Body — carry over (adapted, not weakened): the task contract, per-task brief fields with hand-off lines, no-parallelization rule, and the in-session self-review checks from the current skill.
7. Body — P57 recording rule as plain behavior; blocked-AFK → `/emit-pending-decisions` bundle and stop.

**Files modified:** `skills/workflow/plan/plan-strict/SKILL.md` (rewritten), `skills/workflow/plan/plan-strict/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/plan/plan-strict/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/plan/plan-strict/agents/openai.yaml
grep -n 'plan-tasks/' skills/workflow/plan/plan-strict/SKILL.md
grep -nE 'plans/[0-9N]' skills/workflow/plan/plan-strict/SKILL.md   # expect no lineage-folder hits
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/plan/plan-strict/ ; \
grep -riwE 'tier|ledger' skills/workflow/plan/plan-strict/   # both must return nothing
```

**Acceptance criteria:**

- The body writes the thread-root `plan.md` plus `plan-tasks/NN-<kebab-slug>.md`; no lineage folders, `NNN` numbering, frontmatter contracts, or `.wip/` references remain (spec AC-5.1).
- Escalation replaces the entire planning artifact atomically (index + `plan-tasks/` together) per P44.
- The strict task contract, brief fields, hand-off lines, no-parallelization rule, and self-review discipline are present.
- The body carries the P57 rule (spec AC-4.4); frontmatter/metadata per the P48 pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/emit-pending-decisions` contract (Task 3); thread-root `spec.md` (Task 13).

**Produces:** the V3 `plan-strict` skill and the `plan.md` + `plan-tasks/` artifact shape that `reconcile-plan` and `implement-plan` consume.
