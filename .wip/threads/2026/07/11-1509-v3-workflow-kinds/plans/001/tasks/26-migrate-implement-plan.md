# Task 26: Migrate implement-plan

**Objective:** Migrate `implement-plan` to the V3 thread model while textually preserving its execution and commit mechanics.

**Input / context:** Same authorities as Task 25: the cutover spec `specs/001/spec.md` § "Implementation outcome", P50-boundary constraint, AC-9.1–AC-9.4, AC-4.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P50, P40 (`implement-plan` creates only `progress.md` in its run directory), P45, P21, P57, P31. Current file: `skills/workflow/implement/implement-plan/SKILL.md` (211 lines). SURGERY, not a rewrite: keep the Four-State Status Protocol, Dirty Worktree Handling, Single-Agent Topology, Workflow loop, Commit Policy (Failed commit, No history rewriting), and Plan Deviation Policy substance. NOTE the vocabulary trap: the current body calls its progress file a "Run Progress Ledger" — the word "ledger" must disappear entirely (the file is `progress.md`, described as a progress file), because the final sweep greps `\bledger\b` across all skill files.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: implement-plan`; concise human-facing `description` naming the V3 plan artifact; `disable-model-invocation: true`; bump `metadata.version`.
2. Create `skills/workflow/implement/implement-plan/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Inputs: the plan is the thread-root `plan.md` (authoritative index) plus `plan-tasks/NN-<kebab-slug>.md` briefs; remove `plans/NNN/` lineage resolution and ambiguity ceremony tied to it.
4. Run workspace: replace the `.wip/` progress location with an invocation-scoped `.implementation-runs/<UTC>-plan-<ref>/progress.md` (P40 rules: unique per invocation; in-invocation compaction recovery; interrupted runs resumable only by explicit identification; report-then-remove at every normal terminal outcome; no durable references into the workspace). Rename the section and every mention so the file is a progress file — the word "ledger" does not appear.
5. Report: write/update the singleton `implementation-report.md` via `/update-implementation-report` on every normal terminal outcome (success, partial, blocked, no-op), then remove the run directory; drop V2 per-run immutable report emission.
6. Blocked-AFK → `/emit-pending-decisions` bundle; attended intent-settling answers appended to `decisions.md` before use (P57); Roadmap-descendant discoveries with cross-child impact → `/append-roadmap-feedback`.
7. Strip remaining V2 concepts by silence. Do NOT alter: per-task auto-commit default and cadence, the explicit Git-instruction override, dirty-worktree handling, four-state protocol, failed-commit and no-history-rewriting rules, plan-deviation policy substance, self-review-per-task behavior.

**Files modified:** `skills/workflow/implement/implement-plan/SKILL.md` (edited), `skills/workflow/implement/implement-plan/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/implement/implement-plan/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/implement/implement-plan/agents/openai.yaml
grep -n 'plan-tasks/' skills/workflow/implement/implement-plan/SKILL.md
grep -n 'implementation-runs' skills/workflow/implement/implement-plan/SKILL.md
grep -n 'progress.md' skills/workflow/implement/implement-plan/SKILL.md
grep -n 'update-implementation-report' skills/workflow/implement/implement-plan/SKILL.md
git diff --word-diff -- skills/workflow/implement/implement-plan/SKILL.md   # read: commit mechanics unchanged in substance
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/implement/implement-plan/ ; \
grep -riwE 'tier|ledger' skills/workflow/implement/implement-plan/   # both must return nothing
```

**Acceptance criteria:**

- Reads `plan.md` + `plan-tasks/`; invocation-scoped `.implementation-runs/` with `progress.md` per the P40 rules; no `.wip/` (spec AC-9.1); singleton report via the primitive on all normal terminal outcomes (spec AC-9.2); roadmap feedback gated by cross-child impact (spec AC-9.4); P57 present (spec AC-4.4).
- Auto-commit defaults, the Git-instruction override, and orchestration semantics textually preserved (spec AC-9.3).
- The word "ledger" appears nowhere in the folder; the progress file is named and described as `progress.md` (spec AC-1.4).
- Frontmatter/metadata per the P48 pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/update-implementation-report` (Task 6), `/emit-pending-decisions` (Task 3), `/append-roadmap-feedback` (Task 7); the `plan.md` + `plan-tasks/` shape (Task 17).

**Produces:** the V3 `implement-plan` skill.
