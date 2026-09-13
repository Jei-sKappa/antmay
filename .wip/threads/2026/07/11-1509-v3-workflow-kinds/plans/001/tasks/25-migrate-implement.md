# Task 25: Migrate implement

**Objective:** Migrate `implement` to the V3 thread model while textually preserving its execution and commit mechanics.

**Input / context:** The cutover spec `specs/001/spec.md` § "Implementation outcome", the P50-boundary constraint, AC-9.1–AC-9.4, AC-5.3, AC-4.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P50 (preserve per-task auto-commit, the explicit Git-instruction override, dirty-worktree ceremony; changes limited to the enumerated migrations), P44 (`implement` explicitly accepts `plan.md`; runs from seed/decisions/reference/prompt otherwise), P40 (invocation-scoped run directories), P45 (singleton report), P21 (roadmap feedback), P57, P31 (blocked-AFK bundles). Current file: `skills/workflow/implement/implement/SKILL.md` (152 lines). This is SURGERY, not a rewrite: keep the Four-State Status Protocol, Dirty Worktree Handling, Workflow loop, Commit Policy (including Failed commit and No history rewriting), and Plan Deviation Policy essentially as they are; replace only what the migrations below name.

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X.
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: implement`; update the `description` to name `plan.md` among accepted inputs (concise, human-facing); add `disable-model-invocation: true`; bump `metadata.version`.
2. Create `skills/workflow/implement/implement/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Inputs section: explicitly accept the thread-root `plan.md` (brief plan) as input — its numbered steps become the implementation steps, with freedom to derive obvious substeps — and support running straight from `seed.md` + `decisions.md`, an explicit code/issue reference, or the user's prompt when no plan exists.
4. Run workspace: keep operational progress in an invocation-scoped `.implementation-runs/<UTC>-<ref>/` directory in the active thread (unique per invocation; never silently adopt an existing run directory; recovery within an invocation reads its own run directory; interrupted runs survive for explicit resumption only; no durable artifact references a path inside it). Name any progress file `progress.md`.
5. Report: on EVERY normal terminal outcome — success, partial, blocked, no-op — write/update the singleton thread-root `implementation-report.md` via `/update-implementation-report`, then remove the run directory. Remove the old immutable per-run report emission and any V2 report paths.
6. Blocked-AFK: an indispensable human decision under an explicit AFK invocation becomes an `/emit-pending-decisions` bundle (after finishing everything safely derivable), and the run ends with a concise notification. Attended asks that settle intent are appended to `decisions.md` before use (P57).
7. Roadmap descendants: when running in a thread whose seed carries a `Parent:` roadmap reference and a discovery has parent- or sibling-level impact, append it via `/append-roadmap-feedback`; local surprises stay in the implementation report.
8. Strip remaining V2 concepts (tier/ledger/latch/lineage/`.wip/`/immutable-record language) — by silence, not disclaimers. Do NOT alter: per-task auto-commit default, the explicit Git-instruction override, dirty-worktree handling, four-state protocol, failed-commit and no-history-rewriting rules, plan-deviation policy substance.

**Files modified:** `skills/workflow/implement/implement/SKILL.md` (edited), `skills/workflow/implement/implement/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/implement/implement/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/implement/implement/agents/openai.yaml
grep -n 'plan.md' skills/workflow/implement/implement/SKILL.md
grep -n 'implementation-runs' skills/workflow/implement/implement/SKILL.md
grep -n 'update-implementation-report' skills/workflow/implement/implement/SKILL.md
grep -nE 'auto-commit|Commit Policy' skills/workflow/implement/implement/SKILL.md   # commit mechanics still present
git diff --word-diff -- skills/workflow/implement/implement/SKILL.md   # read: Commit Policy / override / dirty-worktree text unchanged in substance
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/implement/implement/ ; \
grep -riwE 'tier|ledger' skills/workflow/implement/implement/   # both must return nothing
```

**Acceptance criteria:**

- The body explicitly accepts `plan.md` and supports seed/decisions/reference/prompt runs (spec AC-5.3).
- Invocation-scoped `.implementation-runs/` per the P40 rules; no `.wip/` usage (spec AC-9.1); singleton report via `/update-implementation-report` on every normal terminal outcome including blocked and no-op (spec AC-9.2); roadmap feedback only under the cross-child-impact rule (spec AC-9.4).
- Per-task auto-commit, the Git-instruction override, dirty-worktree handling, and the no-history-rewriting rule are textually preserved (spec AC-9.3); the P57 rule is present (spec AC-4.4).
- Frontmatter/metadata per the P48 pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts; no rule stated twice.

**Consumes:** `/update-implementation-report` (Task 6), `/emit-pending-decisions` (Task 3), `/append-roadmap-feedback` (Task 7); the brief `plan.md` shape (Task 16).

**Produces:** the V3 `implement` skill.
