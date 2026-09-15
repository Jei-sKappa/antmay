# Task 27: Migrate implement-plan-with-subagents

**Objective:** Migrate `implement-plan-with-subagents` to the V3 thread model, preserving its subagent orchestration, review loop, and commit checkpoints exactly.

**Input / context:** Same authorities as Task 25: the cutover spec `specs/001/spec.md` § "Implementation outcome", P50-boundary constraint, AC-9.1–AC-9.4, AC-4.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P50 (retain commit checkpoints, task-scoped implementation + merged review loop, fix iterations, subagent boundaries, per-task orchestration), P40 (this skill's run directory holds `progress.md` plus per-task subagent outcome/review files, e.g. `task-01/01-implementer-outcome.md`, `task-01/02-review.md`), P45, P21, P57, P31. Current files: `skills/workflow/implement/implement-plan-with-subagents/SKILL.md` (318 lines) and its two references `references/code-quality-reviewer.md`, `references/plan-compliance-reviewer.md` (both mention `.wip` and V2 concepts — they are covered by the final vocabulary sweep and must be cleaned too). SURGERY: the subagent topology, brief-construction rules, reply caps, merged-reviewer design, fix loops, and commit policy stay as they are.

**Skill-body hygiene** — binding for the `SKILL.md` (and reference files) this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine; the reviewer references legitimately discuss the thread's spec/plan acceptance criteria — that is their job.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: implement-plan-with-subagents`; concise human-facing `description`; `disable-model-invocation: true`; bump `metadata.version`.
2. Create `agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Inputs: thread-root `plan.md` + `plan-tasks/` (drop lineage resolution).
4. Scratch workspace: move the current `.wip/` scratch and "Run Progress Ledger" into the invocation-scoped `.implementation-runs/<UTC>-plan-<ref>/` directory — `progress.md` plus per-task subagent outcome and internal review files — under the P40 rules (unique per invocation; explicit-only resumption; report-then-remove on normal terminal outcomes; no durable references into it). Eliminate the word "ledger" everywhere; the progress file is `progress.md`.
5. Report: singleton `implementation-report.md` via `/update-implementation-report` on every normal terminal outcome, then remove the run directory.
6. Blocked-AFK → `/emit-pending-decisions`; attended intent-settling answers → `decisions.md` before use (P57); Roadmap-descendant cross-child discoveries → `/append-roadmap-feedback`.
7. Update `references/code-quality-reviewer.md` and `references/plan-compliance-reviewer.md`: repoint scratch/report paths to the run directory and V3 artifact locations (`spec.md`, `plan.md`, `plan-tasks/`), and purge V2 vocabulary — WITHOUT changing the reviewers' briefs, axes, reply shapes, or caps.
8. Strip remaining V2 concepts by silence. Do NOT alter: subagent capability precondition, no-worktree-isolation rule, four-state protocol with subagent audit, dirty-worktree handling, brief-construction rules, merged-reviewer semantics, fix-iteration caps, commit checkpoints, failed-commit and no-history-rewriting rules, plan-deviation policy substance.

**Files modified:** `skills/workflow/implement/implement-plan-with-subagents/SKILL.md` (edited), `skills/workflow/implement/implement-plan-with-subagents/references/code-quality-reviewer.md` (edited), `skills/workflow/implement/implement-plan-with-subagents/references/plan-compliance-reviewer.md` (edited), `skills/workflow/implement/implement-plan-with-subagents/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/implement/implement-plan-with-subagents/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/implement/implement-plan-with-subagents/agents/openai.yaml
grep -n 'implementation-runs' skills/workflow/implement/implement-plan-with-subagents/SKILL.md
grep -n 'update-implementation-report' skills/workflow/implement/implement-plan-with-subagents/SKILL.md
git diff --word-diff -- skills/workflow/implement/implement-plan-with-subagents/   # read: orchestration + commit text unchanged in substance
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/implement/implement-plan-with-subagents/ ; \
grep -riwE 'tier|ledger' skills/workflow/implement/implement-plan-with-subagents/   # both must return nothing (SKILL.md AND references)
```

**Acceptance criteria:**

- Invocation-scoped `.implementation-runs/` (progress + subagent outcome/review files) per the P40 rules; no `.wip/` anywhere in the folder including references (spec AC-9.1, AC-1.4); singleton report via the primitive on all normal terminal outcomes (spec AC-9.2); roadmap feedback gated by cross-child impact (spec AC-9.4); P57 present (spec AC-4.4).
- Commit checkpoints, task-scoped implementation and merged review loop, fix iterations, subagent boundaries, and the Git-instruction override are textually preserved (spec AC-9.3).
- Frontmatter/metadata per the P48 pair; semver bump; the word "ledger" appears nowhere in the folder.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/update-implementation-report` (Task 6), `/emit-pending-decisions` (Task 3), `/append-roadmap-feedback` (Task 7); the `plan.md` + `plan-tasks/` shape (Task 17).

**Produces:** the V3 `implement-plan-with-subagents` skill with cleaned reviewer references.
