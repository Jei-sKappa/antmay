# Task 7: Run the suite-wide mechanical sweeps

**Objective:** Apply the uniform mechanical changes across the whole active suite — `## Procedure` heading, `agents/openai.yaml` interface blocks, version bumps — and bring the repo docs and registries into final consistency.

**Input / context:** Settled decisions per `seed/discussions/260715102305Z-v3-skill-review-notes-decision-log.md` P13 (`## Procedure`), P17 (openai.yaml interface block), P19 (terminal outcome — sweep coverage), P8/P7 (registry ripples), plus the repo rule that meaningful skill changes bump `version:`. Runs last so the sweeps cover the files rewritten by tasks 2–6. After Task 2 the active suite is 37 skills.

**Steps:**

1. `## Procedure` sweep (P13): `grep -rln "^## Operation$\|^## Workflow$" skills/workflow --include=SKILL.md`, and in every hit rename that heading to `## Procedure`. Update any in-body cross-references to the old heading names (e.g. "per `## Workflow`", "see `## Operation`"). Do not touch artifact-format headings (such as a `**Steps:**` field inside a plan task template) or the seed's `## Suggested workflow` references.
2. `agents/openai.yaml` sweep (P17): for every active skill under `skills/workflow/`, create or extend `agents/openai.yaml`:
   - `interface.display_name`: the skill name in title case (e.g. `allocate-thread` → "Allocate Thread").
   - `interface.short_description`: a terse 4–7-word human-facing picker line written fresh — not a copy of the SKILL.md `description`.
   - Entry points keep `policy.allow_implicit_invocation: false` below the interface block; the five primitives carry the interface block only (no `policy` key).
3. Version-bump sweep: identify every `skills/**/SKILL.md` modified in tasks 2–6 or by this task's step 1 (use the run's commit history or `git diff --name-only` against the pre-plan state) and bump each `metadata.version` by one minor (e.g. `1.0.0` → `1.1.0`).
4. Update `AGENTS.md` (the `CLAUDE.md` symlink target) to match the end state: the Layout tree's primitives line (five primitives: `allocate-thread`, `append-roadmap-feedback`, `emit-pending-decisions`, `emit-pending-review`, `update-implementation-report`), the "The six skills under `primitives/`" count sentence, the "Invocation roles" section (openai.yaml gains the universal interface block; policy still encodes the role), the SKILL.md-format example frontmatter if it references the old convention, and step 3 of "When adding a new skill" (every skill ships `agents/openai.yaml` with the interface block; entry points add the policy).
5. P19 coverage sweep: list every completion-oriented entry point (exclude dialogue-driven skills, one-shot deliverable skills, and the five primitives) and confirm each ends its terminal paths with the `Outcome: <TOKEN> — <reason>` line; tasks 4–6 covered spec, the eight primary completion skills plus the nine audit files, and the implement trio — apply the line to any completion-oriented entry point they missed.
6. Final consistency pass: `README.md` lists exactly the 37 active skills with correct paths; `.claude-plugin/marketplace.json` plugin arrays match the folders on disk (sorted, `JeisKappa-deprecated` last); `.vscode/settings.json` scopes match the leaf folder names on disk, sorted.
7. Full-suite verification greps (see below) plus a spot-read of three skills of different roles (one entry point, one primitive, one dialogue-driven) end-to-end for coherence after all sweeps.

**Files modified:** every `skills/workflow/**/SKILL.md` still carrying `## Operation` or `## Workflow` after tasks 2–6; every `skills/workflow/**/agents/openai.yaml` (many NEW — all 37 active skills end up with one); `AGENTS.md`; `README.md`; `.claude-plugin/marketplace.json`; `.vscode/settings.json`

**Verification:** `grep -rln "^## Operation$\|^## Workflow$" skills/workflow --include=SKILL.md` returns nothing; `find skills/workflow -name SKILL.md | wc -l` and `find skills/workflow -path "*agents/openai.yaml" | wc -l` both return 37; `grep -rL "interface:" $(find skills/workflow -path "*agents/openai.yaml")` returns nothing; `grep -rln "allow_implicit_invocation" skills/workflow/primitives` returns nothing; `grep -L "Outcome:" <every completion-oriented entry point's SKILL.md from step 5's list>` returns nothing; every SKILL.md changed by this plan shows a bumped `version:` in `git diff` against the pre-plan state.

**Acceptance criteria:**
- Every active skill's execution-sequence heading is `## Procedure`; no `## Workflow`/`## Operation` heading survives.
- All 37 active skills ship `agents/openai.yaml` with a filled interface block; only entry points carry the policy key.
- Every completion-oriented entry point ends its terminal paths with the P19 `Outcome:` line.
- Every modified skill's `version` is bumped one minor.
- `AGENTS.md`, `README.md`, marketplace, and commit scopes agree with the on-disk end state.

**Consumes:** the final file set produced by tasks 2–6 (renamed primitive, dissolved `discussion-point`, rewritten bodies).

**Produces:** none — this is the plan's closing task.
