# Plan: Migrate the workflow skill suite to composable jastr templates

Compiles `specs/001/spec.md` (approved). The migration converts the 29 active
`skills/workflow/**/SKILL.md` files from hand-authored sources into outputs
**generated** from a committed `.jastr/` catalog (one template per skill, shared
boilerplate in `include` partials), driven by a regenerate/`--check` script, with
the one-time rebaseline proven content-preserving per skill.

The order below is the execution graph. Tasks run sequentially; each one assumes
its predecessors landed. Foundational analysis comes first (tool relocation,
binary, reconciliation decision), then catalog scaffolding and a single
de-risking pilot, then the generation script, then bulk template authoring, then
the one-time rebaseline + per-skill review, then governance docs and a final
machine-checkable sweep.

## Source

- Spec: `specs/001/spec.md` (tier 3; `status.approved`). All `FR-N`/`AC-N.M`
  references below point into its Acceptance criteria.
- Genesis decision log (cited `DL P<N>`):
  `seed/discussions/260628151324Z-rendering-distribution-model-decision-log.md`.
- Review-disposition decision log (cited `RD P<N>`):
  `specs/001/discussions/260629080603Z-spec-review-disposition-decision-log.md`.

Repo paths (`.jastr/`, `scripts/`, `skills/`, `AGENTS.md`) are repo-relative;
thread artifacts (`specs/…`, `seed/…`) are thread-relative.

## Tasks

### Task 1: Relocate the drift-analysis tool into committed `scripts/`

**Objective:** Make the drift metrics reproducible by moving the analysis tool out of the gitignored `temp/` into the committed `scripts/`, so every later task (the reconciliation matrix, AC-3.2) runs the same canonical tool.

**Input / context:** `RD P5`/`RD P2` (per `specs/001/spec.md` Scope and FR-13) require `scripts/skill_header_stats.py` to exist as the committed source of the Context metrics and the AC-3.2 / AC-13.1 gate. The tool currently lives at `temp/skill_header_stats.py` (`temp/` is gitignored). A stale `temp/skill_header_stats.py.bak` sits beside it.

**Steps:**
1. Copy `temp/skill_header_stats.py` to `scripts/skill_header_stats.py` (do not move from a gitignored path with `git mv` — the source is untracked; a plain copy + `git add` is correct).
2. `chmod +x scripts/skill_header_stats.py`.
3. Open the new file and update any in-file usage/docstring examples that hard-code `temp/skill_header_stats.py` to read `scripts/skill_header_stats.py` (the docstring shows `python3 temp/skill_header_stats.py …` invocations).
4. Confirm the tool resolves the skills tree by repo-relative discovery (it walks `skills/**`), not by a path relative to `temp/`; adjust the root resolution only if it was anchored to `temp/`.
5. Leave `temp/` untouched otherwise; do not delete `temp/` (it holds unrelated scratch and is gitignored).

**Files modified:** `scripts/skill_header_stats.py` (NEW)

**Verification:**
- `test -x scripts/skill_header_stats.py` succeeds.
- `python3 scripts/skill_header_stats.py --drift --bucket workflow` prints the same summary line as the pre-move tool — `drift candidates (>1 variant, sim >= 50%): 19` — and lists the 19 candidate sections.
- `git status --porcelain scripts/skill_header_stats.py` shows it staged/added (tracked), and `git check-ignore scripts/skill_header_stats.py` returns nothing.

**Acceptance criteria:**
- `scripts/skill_header_stats.py` exists, is executable, and is git-tracked.
- Its `--drift --bucket workflow` output is byte-equivalent (modulo any path strings in the docstring) to the `temp/` tool's output.
- No in-file reference to `temp/` remains.

---

### Task 2: Establish an inline-capable `JASTR_BIN`

**Objective:** Pin and verify the jastr binary the migration uses, and capture the reproducible-build recipe that the generation script's preflight (Task 7) and the `AGENTS.md` update (Task 15) will both depend on.

**Input / context:** `specs/001/spec.md` Constraints + `DL P4`, `RD P8`. The installed `jastr-dev` on PATH is stale and must NOT be used; the binary is the freshly built vendored bundle at `.library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js`, reached through a `JASTR_BIN` env var (never a hard-coded checkout path). `.library/` is gitignored, so the binary is a local build artifact, not committed. The required floor is version `0.1.0 (6674fd3)` or later with `generate agent-skill --mode` present.

**Steps:**
1. Define the convention `JASTR_BIN="node .library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js"` (the dist entry is a Node bundle; invoke via `node`). Record this exact value as the script's documented default.
2. Run `$JASTR_BIN --version` and confirm it prints `0.1.0 (6674fd3)` or a later commit. If the dist is missing or older, rebuild it: in `.library/sources/Jei-sKappa_jastr/` run `bun install && bun run build`, then re-check `--version`.
3. Run `$JASTR_BIN generate agent-skill --help` and confirm the help text exposes `--mode <mode>` with values `router` / `inline` (default `router`). This is the inline-capability signal the preflight keys on.
4. Write down the build recipe (`bun install && bun run build` in the vendored repo) and the `JASTR_BIN` default verbatim into the scratchpad note carried into Task 7 and Task 15 — these two facts are reused there, not re-derived.

**Files modified:** none (verification + recorded recipe only)

**Verification:**
- `$JASTR_BIN --version` contains `6674fd3` (or a later sha).
- `$JASTR_BIN generate agent-skill --help` contains the substring `--mode`.
- `which jastr-dev` (if present) is confirmed *not* used by any later command — every jastr invocation in this plan goes through `$JASTR_BIN`.

**Acceptance criteria:**
- A working `JASTR_BIN` invocation is established and verified inline-capable (version floor met, `--mode` present).
- The reproducible-build recipe and the `JASTR_BIN` default value are recorded for reuse by Tasks 7 and 15.

---

### Task 3: Produce and review the reconciliation matrix (gates the rebaseline)

**Objective:** Front-load the DL P10 reconcile-vs-keep judgment for every drifted/duplicated section into one reviewed matrix, so the partial set (Task 5) and the per-skill version bumps (Task 14) are decided up front rather than rediscovered hunk-by-hunk.

**Input / context:** `RD P5` → FR-13 (AC-13.1, AC-13.2); `DL P10` → FR-3. Depends on Task 1 (the committed `scripts/skill_header_stats.py`). The DL P10 criterion: a section is reconciled into a shared partial **only when its differences are incidental** (wording drift) **or an artifact-noun absorbable by interpolation**; a **semantic** difference stays skill-specific; **when in doubt, keep it separate**. Note the discrepancy this matrix must bridge: `--drift --bucket workflow` reports **19** candidates (highest-scoring: Disposition Frontmatter ×5, Lineage Folder and Filename ×4, Tier Awareness ×4, the implement-trio worktree/commit sections ×3, Plan Artifact Contract ×3, No Parallelization ×3, Plan Deviation Policy ×3, down to Frontmatter Status Contract ×2), but `Commit Policy` (20 skills) and `Immutability` (15 skills) are scored **divergent** (too many low-similarity variants) and do **not** appear in the `--drift` view — even though `specs/001/spec.md` §3 and its Illustrative example name both as headline partial candidates. The matrix must therefore cover the `--drift` set **plus** these spec-named sections.

**Steps:**
1. Run `python3 scripts/skill_header_stats.py --drift --bucket workflow` and `python3 scripts/skill_header_stats.py --drift --diff --bucket workflow` to get the 19 candidates with their per-variant diffs.
2. Run `python3 scripts/skill_header_stats.py --bucket workflow` and locate `Commit Policy` (20) and `Immutability` (15); pull their bodies for inspection (they are the spec-named divergent sections to also judge).
3. For each candidate section, read its variants across the affected skills and classify it per DL P10 into one row recording: **candidate section**, **decision** (`partial` | `keep-specific`), **reason** (`incidental` | `artifact-noun` | `semantic`), **affected skills** (list), **expected version-bump set** (the skills whose rendered content will change if reconciled — i.e. the skills that get a category-(a) hunk in Task 14).
4. Apply the tie-breaker explicitly: any section whose cross-skill differences are semantic is `keep-specific`; "when in doubt, keep separate."
5. For each `partial`+`artifact-noun` row, note the absorption mechanism the partial will use (a defaulted template input interpolated as `{{…}}`, or an internal `::::if` conditional) so Task 5 has a concrete target. `Commit Policy` is the canonical `artifact-noun` case (the section differs only by "the spec artifact" / "the emitted plan" / "the review artifact").
6. Write the matrix to a dedicated reconciliation record. **Location is a Degree of freedom** (`specs/001/spec.md` Degrees of freedom + FR-13); pin it at `.jastr/workflow/RECONCILIATION.md` (committed beside the catalog it documents; inert to jastr — it is neither a `.jastrgroup`, a `templates/*` entry, nor an included partial). The implementer may instead fold it into this plan as a section.
7. Have the matrix reviewed before proceeding. No partial is authored in Task 5 that the matrix does not classify `partial` with an `incidental` or `artifact-noun` reason.

**Files modified:** `.jastr/workflow/RECONCILIATION.md` (NEW)

**Verification:**
- The record exists and contains one row per `--drift` candidate (19) **plus** rows for `Commit Policy` and `Immutability`.
- Every row carries all five fields (section, decision, reason, affected skills, expected version-bump set).
- `grep -c "keep-specific\|partial" .jastr/workflow/RECONCILIATION.md` accounts for every row (each row has exactly one decision).
- No row is decided `partial` with reason `semantic`.

**Acceptance criteria:**
- A reconciliation matrix exists and is reviewed **before** any skill is rebaselined (AC-13.1).
- Each row classifies the section `partial` (reason `incidental`|`artifact-noun`) or `keep-specific`, with affected skills and expected bump set (AC-13.1).
- No `semantic`-classified section is slated for a shared partial (AC-13.2).

---

### Task 4: Scaffold the `.jastr/workflow` group skeleton

**Objective:** Create the empty single-group catalog structure that templates and partials will populate, established as committed source of truth with no `config.yml`.

**Input / context:** FR-1 (AC-1.1, AC-1.2, AC-1.3, AC-1.5); `DL P2`, `DL P3`, `RD P3`. jastr requires a one-level group marked by a `.jastrgroup` file; cross-skill partial sharing requires all templates in one group with partials at the group root (the `root="group"` include boundary). Under the C approach no `config.yml` is shipped (no variants, no required inputs → nothing for it to hold).

**Steps:**
1. Create directory `.jastr/workflow/`.
2. Create the marker file `.jastr/workflow/.jastrgroup`. Its contents are ignored by jastr; leave it empty (or a one-line comment marker).
3. Create directories `.jastr/workflow/partials/` and `.jastr/workflow/templates/` (a `.gitkeep` in each is acceptable until populated, removed once real files land).
4. Confirm `.jastr/` is NOT covered by `.gitignore` (the repo gitignores `temp/`, `.library/`, `.claude/`, etc., and the thread `.wip/`; `.jastr/` must be tracked).
5. Do NOT create `.jastr/config.yml`.

**Files modified:** `.jastr/workflow/.jastrgroup` (NEW), `.jastr/workflow/partials/` (NEW dir), `.jastr/workflow/templates/` (NEW dir)

**Verification:**
- `test -f .jastr/workflow/.jastrgroup` succeeds.
- `test -d .jastr/workflow/partials && test -d .jastr/workflow/templates` succeeds.
- `git check-ignore .jastr` returns nothing (tracked).
- `test ! -e .jastr/config.yml` succeeds.

**Acceptance criteria:**
- `.jastr/workflow/.jastrgroup` exists as a file (AC-1.1).
- `.jastr/workflow/partials/` and `.jastr/workflow/templates/` both exist as directories (AC-1.2).
- `.jastr/` is git-tracked (AC-1.3).
- No `.jastr/config.yml` is present (AC-1.5, AC-11.1).

---

### Task 5: Author the canonical shared partials

**Objective:** Create one file per reconciled section under `.jastr/workflow/partials/`, with any per-skill variation absorbed inside the partial, so every including template pulls a single canonical source.

**Input / context:** Depends on Task 3 (the reviewed matrix) and Task 4 (the skeleton). FR-3 (AC-3.1, AC-3.3); `DL P2`, `DL P10`. Only `partial`-classified rows from `.jastr/workflow/RECONCILIATION.md` are authored here. High-confidence set from the matrix + `specs/001/spec.md` §3: `commit-policy`, `immutability`, `tier-awareness`, `disposition-frontmatter`, `lineage-folder-and-filename`, plus matrix-confirmed lower-scoring ones (e.g. plan-artifact-contract, no-parallelization, plan-deviation-policy, the implement-trio worktree/dirty-worktree/failed-commit sections) — **the matrix is authoritative; this list is the starting point, not a fixed set** (`specs/001/spec.md` Degrees of freedom).

**Steps:**
1. For each `partial`-classified row, create `.jastr/workflow/partials/<name>.md`, where `<name>` is a kebab descriptor of the section. The file content is the canonical section heading + body.
2. Each partial **starts cleanly** (no leading blank line): a partial placed at the top of a template body would otherwise produce a double blank line under the closing `---` (`specs/001/spec.md` Constraints; `RD P10`). Author every partial as if it could appear first.
3. For an `incidental` row, the partial is plain shared prose (pick the canonical wording the matrix designated).
4. For an `artifact-noun` row, absorb the variation **inside** the partial via interpolation against a defaulted template input — e.g. `commit-policy.md` references `{{commit-artifact}}` ("the spec artifact" / "the emitted plan" / "the review artifact"), and each including template declares that input with `required: false` and its skill-specific `default:` so the regen command stays flag-free. An internal `::::if{condition="${…} == '…'"}` block is the alternative when the variation is structural rather than a single noun. Do NOT duplicate a partial per skill to dodge a difference (AC-3.3).
5. Choose partial granularity and naming freely (`specs/001/spec.md` Degrees of freedom), provided each reconciled section is exactly one file.

**Files modified:** `.jastr/workflow/partials/<name>.md` × (one per `partial` row) (all NEW)

**Verification:**
- Every `partial` row in `.jastr/workflow/RECONCILIATION.md` has a matching file under `.jastr/workflow/partials/`, and no `keep-specific` row does.
- `for f in .jastr/workflow/partials/*.md; do head -c1 "$f" | grep -qv '^$' || echo "LEADING BLANK: $f"; done` prints nothing (no partial begins with a blank line).
- For every partial absorbing variation: `grep -l '{{' .jastr/workflow/partials/*.md` and/or `grep -l '::::if' …` confirms interpolation/conditional is used in-file, and no two partials are near-duplicates (re-running the drift tool over the rendered output in Task 16 is the end-to-end check).

**Acceptance criteria:**
- Each reconciled section exists as exactly one `partials/<name>.md` (AC-3.1).
- Every partial that absorbs per-skill variation does so via interpolation or an internal conditional within the one file — no per-skill partial duplication (AC-3.3).
- No partial begins with a leading blank line (Constraints; RD P10).

---

### Task 6: Pilot one skill end-to-end to lock the pattern

**Objective:** Author, generate, and diff a single real template (`review-spec`) before scaling, proving the catalog wiring, the `root="group"` includes, interpolated-partial resolution, and the content-preservation bar against one skill.

**Input / context:** Depends on Tasks 4–5. FR-2, FR-4, FR-7; `DL P1`, `DL P8`, `DL P6`. `review-spec` is chosen because it is the spec's own Illustrative example and exercises an `artifact-noun` partial (its `Commit Policy` says "the review artifact"), so the pilot validates interpolation-in-partial. Existing source: `skills/workflow/review/review-spec/SKILL.md`. Generate command shape confirmed against the binary: `$JASTR_BIN generate agent-skill workflow/<skill> --out <path> --mode=inline`.

**Steps:**
1. Read `skills/workflow/review/review-spec/SKILL.md`. Lift its YAML frontmatter (`name`, `description`, `metadata.author`, `metadata.version`) into the new template's `targets.agent-skill.frontmatter`.
2. Create `.jastr/workflow/templates/review-spec/TEMPLATE.md`. Frontmatter declares `targets.agent-skill.frontmatter: {name: review-spec, description: <unchanged>, metadata: {author: …, version: <current>}}`; declare a `required: false` defaulted input for each interpolated partial the matrix assigned to this skill (e.g. `commit-artifact` defaulting to `the review artifact`). Declare no other inputs (keep the regen command flag-free).
3. Compose the body: the skill's unique prose verbatim, with each reconciled section **replaced** by `::include{root="group", path="partials/<name>.md"}`. The body's first line is non-blank.
4. Validate: `$JASTR_BIN validate workflow/review-spec` exits 0.
5. Generate inline: `$JASTR_BIN generate agent-skill workflow/review-spec --out skills/workflow/review/review-spec/SKILL.md --mode=inline --force`.
6. Diff against the committed version: `git diff -- skills/workflow/review/review-spec/SKILL.md`. Classify every hunk as (a) a deliberate drift-reconciliation or (b) benign renderer formatting (frontmatter key order via `YAML.stringify`; blank-line/trailing-newline normalization). Any third category is a defect — fix the template and regenerate until only (a)/(b) remain.
7. Confirm the emitted file contains no `jastr` substring and no unresolved `::include`/`::if`, and has exactly one blank line between the closing `---` and the body.

**Files modified:** `.jastr/workflow/templates/review-spec/TEMPLATE.md` (NEW), `skills/workflow/review/review-spec/SKILL.md` (regenerated)

**Verification:**
- `$JASTR_BIN validate workflow/review-spec` exits 0.
- `$JASTR_BIN generate agent-skill workflow/review-spec --out skills/workflow/review/review-spec/SKILL.md --check --mode=inline` exits 0 after generation.
- `grep -c 'jastr\|::include\|::if' skills/workflow/review/review-spec/SKILL.md` returns 0.
- `git diff -- skills/workflow/review/review-spec/SKILL.md`: every hunk is classifiable as (a) or (b); reviewer confirms no instruction is added, dropped, or reworded outside those categories.

**Acceptance criteria:**
- `.jastr/workflow/templates/review-spec/TEMPLATE.md` exists and validates (AC-1.4 for this template).
- The regenerated `SKILL.md` is self-contained: no `jastr`, no unresolved directive, one blank line after frontmatter (AC-4.1, AC-4.4).
- Its diff vs the pre-migration file is fully classified (a)/(b) with no unclassified content change (AC-7.1, AC-7.2 for this skill).
- An interpolated partial resolves correctly against the template's defaulted input (proves the Task 5 absorption mechanism).

---

### Task 7: Write the generation/check script

**Objective:** Provide `scripts/generate-skills.sh` that regenerates every skill (and mirrors references) in default mode and gates freshness in `--check` mode, with the binary preflight and the guarded, realpath-contained reference deletion required by the spec.

**Input / context:** Depends on Task 2 (`JASTR_BIN` + recipe) and Task 6 (a working template to test against). FR-5 (AC-5.1–5.5), FR-6, FR-12 (AC-12.3, AC-12.5, AC-12.6); `DL P4`, `RD P7`, `RD P8`. Script internals (language, loop, path-map mechanism) are a Degree of freedom; the externally observable contract below is not.

**Steps:**
1. Create `scripts/generate-skills.sh`, `chmod +x`. Accept an optional `--check` flag (default = regenerate).
2. Resolve the binary from `$JASTR_BIN`, defaulting to the Task 2 value (`node .library/sources/Jei-sKappa_jastr/packages/cli/dist/index.js`). No hard-coded absolute checkout path (AC-5.4).
3. **Preflight, before writing anything (AC-5.5, RD P8):** run `$JASTR_BIN --version` and fail (non-zero, no output written) unless it reports `6674fd3` or later; run `$JASTR_BIN generate agent-skill --help` and fail unless it contains `--mode`. This guards against the stale `jastr-dev` and against silently emitting a router wrapper when `--mode=inline` is omitted.
4. Build the skill→phase path map (walk `skills/workflow/**` for `SKILL.md` dirs, or read `.claude-plugin/marketplace.json`, or an explicit map — implementer's choice). Fail on an ambiguous skill-id→phase mapping (AC-12.5).
5. For each template directory `.jastr/workflow/templates/<skill>/`: compute `out=skills/workflow/<phase>/<skill>/SKILL.md`. Default mode: `"$JASTR_BIN" generate agent-skill workflow/<skill> --out "$out" --mode=inline --force`. Check mode: same with `--check --mode=inline` and **without** `--force` (the binary rejects `--check --force`).
6. **Reference mirror (FR-12):** after writing each `SKILL.md`, if `.jastr/workflow/templates/<skill>/references/` exists, mirror it into `skills/workflow/<phase>/<skill>/references/` so the skill folder is an exact copy — files removed from the template are deleted from the skill folder. Copy bytes verbatim; never inline references into `SKILL.md`.
7. **Guard the destructive delete (AC-12.5):** delete only inside a realpath-contained `skills/workflow/<phase>/<skill>/references/`; on the first migration, **fail without mutating anything** if a skill that currently has a `references/` folder has no catalog `references/` directory.
8. **Check-mode reference reporting (AC-12.6):** in `--check`, report an orphan (present in skill folder, absent in template) or missing/drifted reference and exit non-zero **without** deleting or writing anything.
9. On any per-skill generate/check failure, print the offending skill name and exit non-zero (AC-5.3).
10. Test the script against the pilot: run `--check` (expect 0 for `review-spec`), then a default run (expect idempotent — `review-spec` byte-stable).

**Files modified:** `scripts/generate-skills.sh` (NEW)

**Verification:**
- `test -x scripts/generate-skills.sh` succeeds (AC-5.1).
- With `JASTR_BIN` unset to a deliberately stale/old binary, the script exits non-zero and writes nothing (AC-5.5) — confirm working tree unchanged via `git status --porcelain`.
- `scripts/generate-skills.sh --check` exits 0 for the already-generated `review-spec` and non-zero (naming the skill) if its `SKILL.md` is hand-edited to drift (AC-5.3).
- `grep -n 'JASTR_BIN' scripts/generate-skills.sh` shows binary resolution via the env var; `grep -n '/Users/' scripts/generate-skills.sh` returns nothing (no hard-coded checkout path) (AC-5.4).

**Acceptance criteria:**
- `scripts/generate-skills.sh` exists and is executable (AC-5.1).
- Default mode writes inline `SKILL.md` outputs into existing phase-bucket paths (AC-5.2, validated fully at Task 13).
- `--check` exits 0 when current, non-zero (naming the skill) when stale/missing (AC-5.3).
- Binary resolved via `JASTR_BIN`, no hard-coded path (AC-5.4); inline-capability preflight fails closed without writing (AC-5.5).
- Reference deletion is realpath-contained and fails-without-mutating on a missing catalog `references/`; `--check` reports orphan/missing references without mutating (AC-12.3, AC-12.5, AC-12.6).

---

### Task 8: Author templates — review family + spec + propose

**Objective:** Author templates for the review skills (minus the piloted `review-spec`) plus `spec` and `propose`, which share the review-record / frontmatter-status / lineage / disposition partials.

**Input / context:** Depends on Tasks 5–6 (partials + locked pattern). FR-2, FR-4; `DL P3`, `DL P8`. Skills: `review-code`, `review-implementation`, `review-lossless-mapping`, `review-plan`, `review-proposal`, `spec`, `propose`. Existing sources at `skills/workflow/review/<skill>/SKILL.md`, `skills/workflow/spec/spec/SKILL.md`, `skills/workflow/propose/propose/SKILL.md`. Follow the pilot's template shape exactly.

**Steps:**
1. For each skill, create `.jastr/workflow/templates/<skill>/TEMPLATE.md`.
2. Lift the existing `name`, `description`, `metadata.{author,version}` into `targets.agent-skill.frontmatter` unchanged (no genericization of `description`; `name` = leaf dir name).
3. Compose the body from the skill's unique prose, replacing each matrix-`partial` section with `::include{root="group", path="partials/<name>.md"}`; declare a `required: false` defaulted input per interpolated partial the matrix assigned to that skill. No template-level routing inputs (AC-11.2). Body's first line non-blank.
4. Do not generate or diff here (that is the Task 13 rebaseline + Task 14 review); this task ends at a validating template per skill.

**Files modified:** `.jastr/workflow/templates/{review-code,review-implementation,review-lossless-mapping,review-plan,review-proposal,spec,propose}/TEMPLATE.md` (all NEW)

**Verification:**
- `for s in review-code review-implementation review-lossless-mapping review-plan review-proposal spec propose; do $JASTR_BIN validate workflow/$s || echo "FAIL $s"; done` prints no FAIL.
- `grep -L 'targets:' .jastr/workflow/templates/{review-code,review-implementation,review-lossless-mapping,review-plan,review-proposal,spec,propose}/TEMPLATE.md` returns nothing (every template declares a target).
- No `TEMPLATE.md` body begins with a blank line (`head -1` of each body is non-blank).

**Acceptance criteria:**
- Seven templates exist and each `$JASTR_BIN validate workflow/<skill>` exits 0 (AC-1.4 for these).
- Each declares `targets.agent-skill.frontmatter` with the skill's unchanged `name`/`description`/`metadata` (AC-2.1, AC-4.2, AC-4.3).
- Reconciled sections appear only as `::include`; no template-level routing input (AC-3.1, AC-11.2).

---

### Task 9: Author templates — plan family + implement family

**Objective:** Author templates for the plan and implement trios, which share the plan-artifact-contract, no-parallelization, plan-deviation, and worktree/commit/dirty-worktree partials.

**Input / context:** Depends on Tasks 5–6. FR-2, FR-4; `DL P3`. Skills: `plan-loose`, `plan-strict`, `adjust-plan-granularity`, `implement`, `implement-plan`, `implement-plan-with-subagents`. `implement-plan-with-subagents` carries `references/` — author only its `TEMPLATE.md` here; its reference files are authored in Task 12. Existing sources under `skills/workflow/plan/**` and `skills/workflow/implement/**`.

**Steps:**
1. For each skill, create `.jastr/workflow/templates/<skill>/TEMPLATE.md` following the pilot shape (frontmatter lifted unchanged; body = unique prose + `::include` of assigned partials; defaulted inputs only for interpolated partials; non-blank first body line).
2. For `implement-plan-with-subagents`, keep the body's `references/<name>.md` links **as plain text** (they resolve at runtime; never inlined) — the template body is unchanged in how it references them; only the files themselves move to the catalog in Task 12.
3. End at a validating template per skill; no generation here.

**Files modified:** `.jastr/workflow/templates/{plan-loose,plan-strict,adjust-plan-granularity,implement,implement-plan,implement-plan-with-subagents}/TEMPLATE.md` (all NEW)

**Verification:**
- `for s in plan-loose plan-strict adjust-plan-granularity implement implement-plan implement-plan-with-subagents; do $JASTR_BIN validate workflow/$s || echo "FAIL $s"; done` prints no FAIL.
- `grep -c 'references/' .jastr/workflow/templates/implement-plan-with-subagents/TEMPLATE.md` is non-zero and the matched lines are plain-text links (no `::include` of a reference file).

**Acceptance criteria:**
- Six templates exist and each validates (AC-1.4 for these).
- `implement-plan-with-subagents` template keeps `references/*.md` as plain-text body links, not includes (AC-12.4).
- Reconciled sections appear only as `::include`; no routing input (AC-3.1, AC-11.2).

---

### Task 10: Author templates — capture-discussion family + finish-navigate family

**Objective:** Author templates for the capture-discussion and finish-navigate skills, which share tier-awareness, lineage, disposition-frontmatter, and target-scoped-p-numbering partials.

**Input / context:** Depends on Tasks 5–6. FR-2, FR-4; `DL P3`. Skills: `discussion`, `open-thread`, `open-ticket`, `seeded-discussion`, `finish`, `record-verdict`, `whats-next`. Existing sources under `skills/workflow/capture-discussion/**` and `skills/workflow/finish-navigate/**`.

**Steps:**
1. For each skill, create `.jastr/workflow/templates/<skill>/TEMPLATE.md` following the pilot shape (frontmatter lifted unchanged; body = unique prose + `::include`; defaulted inputs only where an interpolated partial needs one; non-blank first body line).
2. End at a validating template per skill.

**Files modified:** `.jastr/workflow/templates/{discussion,open-thread,open-ticket,seeded-discussion,finish,record-verdict,whats-next}/TEMPLATE.md` (all NEW)

**Verification:**
- `for s in discussion open-thread open-ticket seeded-discussion finish record-verdict whats-next; do $JASTR_BIN validate workflow/$s || echo "FAIL $s"; done` prints no FAIL.
- No template body begins with a blank line.

**Acceptance criteria:**
- Seven templates exist and each validates (AC-1.4 for these).
- Each declares the unchanged `name`/`description`/`metadata`; reconciled sections only as `::include`; no routing input (AC-2.1, AC-4.3, AC-3.1, AC-11.2).

---

### Task 11: Author templates — handoff + research + merge + documentation + support

**Objective:** Author templates for the remaining skills, which are mostly unique-body with light partial usage.

**Input / context:** Depends on Tasks 5–6. FR-2, FR-4; `DL P3`. Skills: `brief-the-recipient`, `consult-the-expert`, `report-to-the-owner`, `afk-exploration`, `the-librarian`, `merge-artifacts`, `take-snapshot`, `meta-prompting`. `afk-exploration` and `the-librarian` carry `references/` — author only their `TEMPLATE.md` here; reference files come in Task 12. Note: `consult-the-expert`, `report-to-the-owner`, `brief-the-recipient`, and `meta-prompting` are deliverable skills whose "no preamble / chat-IS-the-deliverable" rule lives in their unique body — preserve that prose verbatim.

**Steps:**
1. For each skill, create `.jastr/workflow/templates/<skill>/TEMPLATE.md` following the pilot shape.
2. For `afk-exploration` and `the-librarian`, keep all `references/<name>.md` body links as plain text (resolved at runtime).
3. End at a validating template per skill.

**Files modified:** `.jastr/workflow/templates/{brief-the-recipient,consult-the-expert,report-to-the-owner,afk-exploration,the-librarian,merge-artifacts,take-snapshot,meta-prompting}/TEMPLATE.md` (all NEW)

**Verification:**
- `for s in brief-the-recipient consult-the-expert report-to-the-owner afk-exploration the-librarian merge-artifacts take-snapshot meta-prompting; do $JASTR_BIN validate workflow/$s || echo "FAIL $s"; done` prints no FAIL.
- After this task, `find .jastr/workflow/templates -name TEMPLATE.md | wc -l` equals `find skills/workflow -name SKILL.md | wc -l` (29 = 29) (AC-2.2).

**Acceptance criteria:**
- Eight templates exist and each validates (AC-1.4 for these).
- The total template count equals the active skill count, 29 (AC-2.2).
- Deliverable-skill bodies retain their no-preamble rule verbatim; references stay plain-text links (AC-12.4).

---

### Task 12: Author the reference files into the catalog

**Objective:** Move the three reference-bearing skills' `references/` files into the catalog co-located with their templates, so the catalog is the single source of truth before the script's first mirror run.

**Input / context:** Depends on Tasks 9 and 11 (those skills' templates exist). FR-12 (AC-12.1, AC-12.2); `RD P1`, `RD P7`. The nine files today: `implement/implement-plan-with-subagents/references/{code-quality-reviewer,plan-compliance-reviewer}.md` (2); `research/afk-exploration/references/{pre-mortem-analysis,red-team-adversarial,socratic-questioning,throwaway-prototyping}.md` (4); `research/the-librarian/references/{consult,research,stock}.md` (3). The script's mirror guard (Task 7) **fails without mutating** if a reference-bearing skill has no catalog `references/`, so this task must precede the rebaseline (Task 13).

**Steps:**
1. For each of the three skills, create `.jastr/workflow/templates/<skill>/references/` and copy each existing `skills/workflow/<phase>/<skill>/references/<name>.md` into it **byte-for-byte** (`cp` preserving bytes; jastr ignores these files — they are not includes).
2. Do not modify the file contents and do not inline them anywhere.
3. Leave the skill-folder `references/` in place for now; Task 13's mirror will round-trip them and Task 14/16 will assert byte-identity.

**Files modified:** `.jastr/workflow/templates/implement-plan-with-subagents/references/{code-quality-reviewer,plan-compliance-reviewer}.md` (NEW); `.jastr/workflow/templates/afk-exploration/references/{pre-mortem-analysis,red-team-adversarial,socratic-questioning,throwaway-prototyping}.md` (NEW); `.jastr/workflow/templates/the-librarian/references/{consult,research,stock}.md` (NEW)

**Verification:**
- For each of the 9 files: `diff .jastr/workflow/templates/<skill>/references/<name>.md skills/workflow/<phase>/<skill>/references/<name>.md` reports no difference.
- `find .jastr/workflow/templates -path '*/references/*' -type f | wc -l` equals 9.

**Acceptance criteria:**
- Each reference-bearing skill has a catalog `references/` directory mirroring its current skill-folder references byte-for-byte (AC-12.1 precondition; AC-12.2).
- No reference content is altered or inlined (AC-12.4).

---

### Task 13: Run the one-time rebaseline

**Objective:** Regenerate all 29 `SKILL.md` files and mirror the reference folders in a single script run, replacing the hand-authored outputs with generated ones.

**Input / context:** Depends on Tasks 6–12 (all 29 templates, references, and the script). FR-6, FR-7 (generation half), FR-12 (mirror); `DL P4`, `DL P6`. This is the destructive one-time replacement; the per-hunk review and version bumps are the next task.

**Steps:**
1. Ensure the working tree is clean except for the catalog/script additions (so the rebaseline diff is attributable). Confirm the current `SKILL.md` files are the committed pre-migration versions.
2. Run `scripts/generate-skills.sh` (default mode) with the verified `JASTR_BIN`. It preflights, then regenerates all 29 `SKILL.md` and mirrors the three skills' `references/`.
3. If the run aborts naming a skill, fix that template/partial and re-run; do not hand-edit any `SKILL.md` (they are generated outputs now).

**Files modified:** all 29 `skills/workflow/**/SKILL.md` (regenerated); the three `skills/workflow/**/references/**` trees (round-tripped via mirror)

**Verification:**
- The script exits 0.
- `find skills/workflow -name SKILL.md | wc -l` is still 29 and `git status --porcelain skills/workflow` lists the regenerated files as modified (not added/deleted) — no skill added, removed, or relocated (AC-10.2, AC-2.2).
- `grep -rl 'jastr\|::include\|::if' skills/workflow --include=SKILL.md` returns nothing (every directive resolved) (AC-4.1).
- `for f in $(find skills/workflow -name SKILL.md); do awk 'NR==1&&!/^---/{print "NO FM: "FILENAME} END{}' "$f"; done` confirms each starts with frontmatter; spot-check that each has exactly one blank line after the closing `---` (AC-4.2, AC-4.4).
- `git diff --stat skills/workflow/**/references/` shows the reference trees round-tripped with no path added/removed (full byte-identity asserted in Task 14/16).

**Acceptance criteria:**
- All 29 `SKILL.md` regenerated in place via inline mode; reference folders mirrored (AC-5.2, AC-6.1 precondition).
- No emitted `SKILL.md` contains `jastr` or an unresolved directive; each begins with a valid frontmatter block and one blank line (AC-4.1, AC-4.2, AC-4.4).
- The set of `SKILL.md` paths is unchanged from pre-migration (AC-10.2).

---

### Task 14: Per-skill diff review, hunk classification, and version bumps

**Objective:** Prove the rebaseline is content-preserving by classifying every diff hunk per skill, and bump `metadata.version` exactly for the skills whose content actually changed.

**Input / context:** Depends on Task 13 (the rebaseline diff) and Task 3 (the expected version-bump set). FR-7 (AC-7.1, AC-7.2), FR-8 (AC-8.1), FR-12 (AC-12.1); `DL P6`, `DL P7`, `RD P4`. Two allowed hunk categories: (a) a deliberate drift-reconciliation (a section normalized to its partial), (b) benign renderer formatting (`YAML.stringify` key order; blank-line/trailing-newline normalization). Any other change is a migration defect. **`specs/001/spec.md` Unresolved questions** flags that the magnitude of category-(b) formatting diffs is unknown until this run — if the diffs are large, split this review by phase bucket into separate sittings.

**Steps:**
1. For each of the 29 skills, run `git diff -- skills/workflow/<phase>/<skill>/SKILL.md` and read every hunk.
2. Classify each non-empty hunk as (a) reconciliation or (b) benign formatting. If any hunk is neither, it is a defect: fix the template/partial, regenerate that skill via `scripts/generate-skills.sh` (or `$JASTR_BIN generate … --mode=inline --force`), and re-diff until only (a)/(b) remain.
3. Cross-check the set of skills showing a category-(a) hunk against the matrix's **expected version-bump set** (Task 3). Reconcile any discrepancy (an unexpected (a) hunk, or a predicted bump that did not materialize) before bumping.
4. For each skill with a category-(a) hunk, bump `metadata.version` in that skill's `.jastr/workflow/templates/<skill>/TEMPLATE.md` (semver: minor for added/changed instruction, patch for wording reconciliation — match the repo's existing bump convention), then regenerate that skill so the emitted `SKILL.md` carries the new version. A skill whose only diff is category-(b) is **not** bumped.
5. Assert reference byte-identity: `git diff -- skills/workflow/**/references/` is empty (the round-trip preserved all 9 files).

**Files modified:** `metadata.version` in the bumped skills' `.jastr/workflow/templates/<skill>/TEMPLATE.md` (and their regenerated `skills/workflow/**/SKILL.md`)

**Verification:**
- Every skill's diff is annotated (a)/(b) with no unclassified hunk (reviewer sign-off) (AC-7.1, AC-7.2).
- The set of bumped skills equals the set with a category-(a) hunk, which equals the matrix's expected bump set (AC-8.1).
- `git diff -- skills/workflow` for any non-bumped skill shows only frontmatter-formatting and blank-line hunks (no body wording change).
- `git diff --quiet -- skills/workflow/**/references/` exits 0 (references byte-identical) (AC-12.1).

**Acceptance criteria:**
- Every migrated skill's diff is reviewed and every hunk classified (a) or (b); nothing changes outside those two categories (AC-7.1, AC-7.2).
- `metadata.version` is bumped iff the skill has a content change; formatting-only skills are not bumped (AC-8.1).
- All `references/**` files are byte-identical to their pre-migration versions (AC-12.1).

---

### Task 15: Update `AGENTS.md` for the template-authoring model

**Objective:** Rewrite the governance docs so future maintainers edit templates (not `SKILL.md`), understand the rendered-output self-containment guarantee, can obtain `JASTR_BIN` and run the scripts, and know the C→B upgrade trigger.

**Input / context:** Depends on Tasks 2 (build recipe + `JASTR_BIN` default) and 7 (script contract). FR-9 (AC-9.1–9.4); `DL P2`, `DL P3`, `DL P4`. `AGENTS.md` is the one governance file that changes; `README.md`, `.claude-plugin/marketplace.json`, `.vscode/settings.json` must NOT change (FR-10).

**Steps:**
1. State that **nothing under `skills/workflow/` is hand-edited** — the whole skill folder (`SKILL.md` plus any `references/`) is materialized from `.jastr/workflow/templates/<skill>/`; to change a skill, edit the template (or its `references/`) and regenerate (AC-9.1).
2. Restate the self-containment guarantee as applying to **rendered output** (enforced by the renderer's inline mode), while authoring templates/partials may compose via includes (AC-9.2).
3. Rewrite the "Layout" and "When adding a new skill" sections around the template-authoring flow (author a `TEMPLATE.md` + regenerate, register the skill in the existing registries as before), and document obtaining an inline-capable `JASTR_BIN` (the `node .library/.../dist/index.js` default and the `bun install && bun run build` rebuild recipe from Task 2) and running `scripts/generate-skills.sh` / `--check` (AC-9.3).
4. Record the **C→B upgrade trigger**: consider promoting a family to one template + variants when sibling templates have become a mostly-parametrized-identical body, or when the same logical section has been edited across 3+ siblings in one change (AC-9.4).
5. Do not edit `README.md`, `.claude-plugin/marketplace.json`, or `.vscode/settings.json`.

**Files modified:** `AGENTS.md` (`CLAUDE.md` is a symlink to it — no separate edit)

**Verification:**
- `grep -n 'hand-edited\|materialized\|TEMPLATE' AGENTS.md` shows the no-hand-edit statement (AC-9.1).
- `grep -n 'JASTR_BIN\|generate-skills' AGENTS.md` shows the binary + script docs (AC-9.3).
- `grep -ni 'C→B\|variants' AGENTS.md` shows the upgrade trigger (AC-9.4).
- `git diff --quiet -- README.md .claude-plugin/marketplace.json .vscode/settings.json` exits 0 (AC-10.1).

**Acceptance criteria:**
- `AGENTS.md` states the no-hand-edit / edit-template-and-regenerate model (AC-9.1).
- It restates self-containment as a rendered-output guarantee permitting authoring-side includes (AC-9.2).
- Its "Layout" and "When adding a new skill" sections describe the template flow and document `JASTR_BIN` + the generation/check script (AC-9.3).
- It records the C→B upgrade trigger (AC-9.4).

---

### Task 16: Final machine-checkable verification sweep

**Objective:** Run the whole-change gates once over the finished migration — freshness, validity, self-containment, drift collapse, consumer-surface invariance, reference integrity, and no scope creep — confirming every remaining acceptance criterion.

**Input / context:** Depends on all prior tasks. Closing gate for FR-1 (AC-1.4, AC-1.5), FR-3 (AC-3.2), FR-4 (AC-4.1, AC-4.3), FR-6 (AC-6.1), FR-10 (all), FR-11 (all), FR-12 (AC-12.2, AC-12.3, AC-12.6), FR-2 (AC-2.3). These are the expensive whole-change checks deferred from per-task verification.

**Steps:**
1. **Freshness (AC-6.1):** `scripts/generate-skills.sh --check` exits 0 and `git status --porcelain skills/workflow` shows no working-tree changes.
2. **Validity (AC-1.4):** `for s in $(find .jastr/workflow/templates -maxdepth 1 -mindepth 1 -type d -exec basename {} \;); do $JASTR_BIN validate workflow/$s || echo "FAIL $s"; done` prints no FAIL. Confirm no `config.yml` (AC-1.5).
3. **Self-containment (AC-4.1):** `grep -rl 'jastr\|::include\|::if' skills/workflow --include=SKILL.md` returns nothing. `name` = leaf dir and `description` unchanged per skill (AC-4.3) — compare against the pre-migration committed frontmatter.
4. **Drift collapse (AC-3.2):** re-run `python3 scripts/skill_header_stats.py --drift --bucket workflow` over the regenerated tree; the matrix's `partial`-reconciled sections no longer report multiple near-identical variants (collapsed or absent as standalone duplicates).
5. **Consumer surface (FR-10):** `git diff --quiet -- README.md .claude-plugin/marketplace.json .vscode/settings.json` exits 0 (AC-10.1); the post-migration `skills/workflow/**/SKILL.md` path set equals the pre-migration set (AC-10.2); run the Raycast sync (`cd raycast-extension && npm run sync` or the documented sync entrypoint) and confirm it produces a manifest covering all skills, **and** confirm the default-path `npx skills add` install is unaffected by the new `.jastr/` directory — `find .jastr -name SKILL.md` returns nothing, so default-path skill discovery still surfaces exactly the 29 `skills/**/SKILL.md` and no catalog file (the supported check is the default install path, not `--full-depth`) (AC-10.3).
6. **Reference integrity (FR-12):** each `skills/workflow/<phase>/<skill>/references/` exactly mirrors its template `references/` (same files, same bytes, no orphan) (AC-12.2); a deliberately introduced orphan/drift makes `--check` exit non-zero without mutating, then revert it (AC-12.3, AC-12.6).
7. **No scope creep (FR-11):** confirm no `.jastr/config.yml`, no template + variants collapse, no template-level routing input (`grep -rn 'inputs:' .jastr/workflow/templates` shows only defaulted absorption inputs, never required routing), and no `SKILL.md` instructs installing/running `jastr` (AC-11.1, AC-11.2, AC-11.3).
8. **Deprecated untouched (AC-2.3):** `git status --porcelain skills/deprecated` is empty and no `.jastr/workflow/templates/*` corresponds to a deprecated skill.

**Files modified:** none (verification only; revert any temporary drift introduced for AC-12.3 checks)

**Verification:** (each step above is its own pass/fail assertion)
- `scripts/generate-skills.sh --check` → exit 0, clean tree.
- All templates validate; no `config.yml`.
- No `jastr`/directive substring in any `SKILL.md`; names/descriptions unchanged.
- Drift tool shows reconciled sections collapsed.
- Registries unchanged; path set equal; Raycast sync succeeds; no `SKILL.md` under `.jastr/`, so the default-path install surface is unchanged.
- Reference mirrors exact; `--check` catches orphan/drift without mutating.
- No config/variants/routing-input/jastr-install instruction; `skills/deprecated/**` unmodified.

**Acceptance criteria:**
- AC-1.4, AC-1.5, AC-2.3, AC-3.2, AC-4.1, AC-4.3, AC-6.1, AC-10.1, AC-10.2, AC-10.3, AC-11.1, AC-11.2, AC-11.3, AC-12.2, AC-12.3, AC-12.6 all hold.
- The migration is provably content-preserving, fresh, self-contained, and consumer-surface-neutral.

## Notes

**Sequencing rationale.** Analysis and decisions precede mutation: the drift tool
is committed (T1) and the reconciliation matrix reviewed (T3) before any partial
(T5) or skill (T13) is touched, satisfying the RD P5 "matrix gates the
rebaseline" ordering. One skill is piloted end-to-end (T6) before the other 28
are authored, so a wrong partial-absorption mechanism is caught against one diff,
not 29. The destructive rebaseline (T13) is a single script run after every
template (T6–T11) and reference (T12) exists, so the reference-mirror guard never
trips on a half-built catalog.

**Degrees of freedom carried forward** (from `specs/001/spec.md`): the exact
final partial set and each partial's absorption mechanism (T3/T5); partial
granularity/naming and intra-template section order (T5/T8–T11); the script's
language, loop, and path-map mechanism and `JASTR_BIN`'s default (T2/T7); the
reconciliation record's physical home (T3, pinned to `.jastr/workflow/RECONCILIATION.md`
as a recommendation); whether to add the optional pre-commit `--check` hook (not
included; add under T7 if desired); exact `AGENTS.md` wording (T15); and the
batching/order of conversion (T8–T11, batched by skill family here).

**Unresolved question carried forward** (`specs/001/spec.md`): the magnitude of
benign formatting diffs is unknown until T13 runs; if per-skill diffs are large,
split T14's review by phase bucket. The diffs are accepted as benign formatting
under DL P6 regardless of size.
