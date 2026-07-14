# Task 16: Rewrite plan-brief

**Objective:** Rewrite the moved `plan-brief` (formerly deprecated `plan-loose`) to the substantially smaller one-screen plan contract.

**Input / context:** The cutover spec `specs/001/spec.md` § "Planning" and AC-5.2/AC-4.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P44 (the complete plan-brief contract, escalation, and reverse-transition guard), P16 (capability naming), P57, P13/P31. Current file: `skills/workflow/plan/plan-brief/SKILL.md` (still the old `plan-loose` body — use it only as source material; the V3 contract is much smaller: no independently reviewable tasks, no per-step verification, no granular self-review machinery).

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.) Do not describe this skill as a successor of anything.
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: set `name: plan-brief` (must match the folder); concise human-facing `description` (a one-screen implementation plan for lightweight work); `disable-model-invocation: true`; `metadata.author`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/plan/plan-brief/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — the artifact (P44): always write the thread-root `plan.md` with required `Source:` line (thread-relative source), `## Outcome`, `## Steps` (a small numbered list; each step one short paragraph), `## Verification` (the overall checks demonstrating the change works, not per-step contracts), and optional `## Notes` (only genuinely needed constraints/assumptions/cautions). Normally one screen. No task files, per-step acceptance criteria, file inventories, frontmatter, or state.
4. Body — inputs: normally `seed.md`, `decisions.md`, and any explicit code or issue reference; the emitted plan must not depend on the chat.
5. Body — depth escape: when safe planning needs detailed substeps, per-task verification, explicit file ownership, or acceptance criteria, recommend `plan-strict` instead of inflating the brief plan.
6. Body — reverse-transition guard (P44): if `plan-tasks/` already exists, do NOT silently downgrade — require an explicit instruction to replace the strict plan; only then write the brief `plan.md` and remove the obsolete `plan-tasks/`.
7. Body — P57 recording rule as plain behavior; blocked-AFK → `/emit-pending-decisions` bundle and stop.

**Files modified:** `skills/workflow/plan/plan-brief/SKILL.md` (rewritten), `skills/workflow/plan/plan-brief/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'name: plan-brief' skills/workflow/plan/plan-brief/SKILL.md
grep -n 'disable-model-invocation: true' skills/workflow/plan/plan-brief/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/plan/plan-brief/agents/openai.yaml
grep -n 'plan-strict' skills/workflow/plan/plan-brief/SKILL.md    # the recommend rule
grep -n 'plan-tasks' skills/workflow/plan/plan-brief/SKILL.md     # the reverse-transition guard
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/plan/plan-brief/ ; \
grep -riwE 'tier|ledger' skills/workflow/plan/plan-brief/   # both must return nothing
```

**Acceptance criteria:**

- The body matches P44: the required/optional section set (Source, Outcome, Steps, Verification, optional Notes), one-screen guidance, the recommend-`plan-strict` rule, the explicit-instruction requirement before replacing an existing strict plan, and removal of the obsolete `plan-tasks/` in that case (spec AC-5.2).
- The body carries the P57 rule (spec AC-4.4) and the blocked-AFK bundle behavior.
- Frontmatter `name:` matches the folder; P48 metadata pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or successor/migration narration; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** the moved folder (Task 1); `/emit-pending-decisions` contract (Task 3).

**Produces:** the V3 `plan-brief` skill writing thread-root `plan.md` (the optional Quick planning step; the plan `implement` accepts).
