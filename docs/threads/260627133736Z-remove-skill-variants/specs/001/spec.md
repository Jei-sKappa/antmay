---
version: 1
status:
  approved: 260627162004Z
  implemented: 260627193943Z
---

# Spec: Remove the auto/interactive skill variants

## Intended outcome

The workflow skill suite ships **one skill per job** instead of paired `-auto` / `-interactive` variants. Each of the 14 `*-auto` skills is renamed to its bare name and becomes the sole skill for that job; the 14 `*-interactive` twins are deleted. Interactivity is no longer a dedicated skill variant — it is preserved as a **usage pattern**: run a `discussion` (or `seeded-discussion`) before invoking the skill, or append a steering instruction to the invocation. That pattern is documented in the index/model layer (README + `spine.md`), and every surviving skill is made *receptive* to such steering rather than categorically refusing it. After the change, no live file refers to a `-auto` or `-interactive` skill, and the suite installs/loads cleanly under the new names.

## Context

The suite currently pairs most spine skills as `-auto` (end-to-end, no questions) and `-interactive` (element-by-element interview) twins — 14 pairs across `propose`, `spec`, `plan`, `implement`, `review`, and `merge`. In practice the interactive variants go unused; the real working pattern is to run a `discussion`/`seeded-discussion` and then invoke the autonomous variant. Investigation confirmed the interactive bodies' distinctive content (Anti-Sycophancy Stance, element-by-element interview, Decision Log, Scope Drift) overlaps almost entirely with what the generic `discussion` skill already provides, so removing them is a consolidation rather than a capability loss.

This spec forward-designs the consolidation. It is built directly from the seven settled decisions in `seed/discussions/260627135202Z-remove-skill-variants-decision-log.md` (P1–P7) and the thread seed `seed/seed.md`. The thread ledger records **tier 2**, so machine-checkable acceptance criteria are mandatory (below).

## Scope and non-scope

**In scope — the only files that may be edited or removed** (per `seed/discussions/260627135202Z-remove-skill-variants-decision-log.md` P7):

1. The **14 surviving** `SKILL.md` files (the current `*-auto` skills) — renamed and rewritten.
2. The **14 interactive** skill folders — deleted.
3. `README.md`
4. `.claude-plugin/marketplace.json`
5. `.vscode/settings.json`
6. `AGENTS.md` — the **Layout** code block only (`CLAUDE.md` is a symlink to it; editing `AGENTS.md` updates both).
7. `docs/workflow/v2/spine.md`
8. `skills/workflow/review/review-lossless-mapping/SKILL.md` — **a single-sentence deletion only** (per `…decision-log.md` P8). This skill is **not** one of the 14: it is not renamed and does **not** receive the `3.0.0` bump.

The Raycast manifest `raycast-extension/assets/skills.json` is **regenerated, never hand-edited** (it is generated and git-ignored).

**Explicitly out of scope — must NOT be edited** (P7):

- Anything under `docs/threads/**` (frozen thread artifacts — seeds, specs, plans, reviews, decision logs, including this thread's own prior artifacts).
- Anything under `docs/workflow/v1/**` (grandfathered V1 reference).
- The `skills/deprecated/**` bucket (its `capture-inbox` / `discussion-loop` bodies mention "interactive" in prose, unrelated to these variants).
- `scripts/cleanup-harnesses.py` and `scripts/uninstall-all-skills.sh` — their "interactive terminal" strings are about TTYs, not skill variants.
- Any skill body whose only "interactive" usage is unrelated prose: `research/afk-exploration` ("interactive ideation session"), `finish-navigate/finish` (`rebase --interactive`).

**No repo-wide blind find/replace** of `-auto` / `-interactive` is permitted — it would corrupt frozen records (P7). All edits are confined to the file set above.

## The 14 skills (rename manifest)

Every surviving skill keeps its current group folder; the leaf folder, the frontmatter `name:`, and the `# Title` all change from the `*-auto` form to the bare form. Per `…decision-log.md` P2, the `propose` and `spec` groups intentionally produce a doubled path (`propose/propose`, `spec/spec`) — this is correct, not to be flattened.

| # | Current folder (`skills/workflow/…`) | New folder (`skills/workflow/…`) | New `name:` |
|---|---|---|---|
| 1 | `propose/propose-auto` | `propose/propose` | `propose` |
| 2 | `spec/spec-auto` | `spec/spec` | `spec` |
| 3 | `plan/plan-loose-auto` | `plan/plan-loose` | `plan-loose` |
| 4 | `plan/plan-strict-auto` | `plan/plan-strict` | `plan-strict` |
| 5 | `plan/adjust-plan-granularity-auto` | `plan/adjust-plan-granularity` | `adjust-plan-granularity` |
| 6 | `implement/implement-auto` | `implement/implement` | `implement` |
| 7 | `implement/implement-plan-auto` | `implement/implement-plan` | `implement-plan` |
| 8 | `implement/implement-plan-with-subagents-auto` | `implement/implement-plan-with-subagents` | `implement-plan-with-subagents` |
| 9 | `merge/merge-artifacts-auto` | `merge/merge-artifacts` | `merge-artifacts` |
| 10 | `review/review-proposal-auto` | `review/review-proposal` | `review-proposal` |
| 11 | `review/review-spec-auto` | `review/review-spec` | `review-spec` |
| 12 | `review/review-plan-auto` | `review/review-plan` | `review-plan` |
| 13 | `review/review-implementation-auto` | `review/review-implementation` | `review-implementation` |
| 14 | `review/review-code-auto` | `review/review-code` | `review-code` |

The 14 deleted twins are the same 14 names with `-interactive` instead of `-auto`. `review/review-lossless-mapping` has no variant and is **not** renamed, deleted, or version-bumped; its only change is the single-sentence deletion in B13.

## Expected behavior

**B1 — Delete the interactive twins.** All 14 `*-interactive` skill folders are removed from `skills/workflow/`. None remain on disk. (P1: delete outright, not deprecate.)

**B2 — Rename the surviving skills.** For each of the 14 rows above, the folder is renamed to the bare name and the file's frontmatter `name:` and the `# Title` heading are updated to match (the title drops the "Auto" word, e.g. `# Propose Auto` → `# Propose`). The leaf folder name equals the `name:` field, as the repo requires. (P2.)

**B3 — Rewrite each surviving description.** The frontmatter `description:` is rewritten so that (a) it contains **no reference to the deleted `-interactive` twin** (e.g. the dangling "use `propose-interactive` for that"), and (b) its "use when" trigger routes for **any** need of that skill, not only the autonomous subset — the contrast framing ("without clarifying questions when the user already knows what they want") is removed. The description remains one sentence: what the skill does + when to use it. (P4; `…decision-log.md` P4.)

**B4 — Soften each surviving body's default.** The implementer must read each of the 14 surviving bodies individually (the offending phrasing varies per skill and is not greppable by a single pattern). Where a body categorically refuses interactivity (e.g. `propose`'s "It does not ask clarifying questions, it does not interview the user point-by-point"), that absolute prohibition becomes a **soft default that yields to steering** — autonomous by default, but honoring an invocation that asks the agent to check in or work through it interactively. Any in-body pointer to the deleted twin must also be removed/reworked the same way — notably `review-plan`'s current sentence *"For a collaborative per-finding walk with push-back, run that review interactively instead."* (a prose pointer, not a name, so it will not surface in a name grep). No new sections are added, and **no sibling skill is named**. The interactive-only sections (Anti-Sycophancy Stance, Scope Drift, element-by-element interview) are **not** salvaged into the surviving bodies. (P4.)

**B5 — Version bump.** Each of the 14 surviving skills has its frontmatter `version:` set to `3.0.0`, regardless of its current `2.x` value. (P6.)

**B6 — README.** All variant references in `README.md` are updated to the new world:
- The 28 per-skill `####` sections (currently one per variant) collapse to **14** sections — one per surviving skill — each with its heading, its `./skills/workflow/…` link, its prose, and its `npx skills add … --skill <name>` snippet updated to the bare name; cross-references to the deleted twin are removed.
- The "Layer / Members" table shorthand is debraced: `review-{proposal,spec,plan,implementation,code}-{auto,interactive}` → the bare review names, and `merge-artifacts-{auto,interactive}` → `merge-artifacts`.
- The "Common workflows" table rows are rewritten to bare skill names (no `-auto`/`-interactive`); the discussion-first interactivity pattern is reflected there.
- A short **"Steering interactivity"** note is added documenting the replacement pattern (run a discussion first, or append a steering instruction). (P3; P4; `…decision-log.md` P3.)

**B7 — marketplace.json.** In `.claude-plugin/marketplace.json`, every `-interactive` skill path is removed and every `-auto` path is renamed to its bare path, across the `JeisKappa-implement`, `JeisKappa-merge`, `JeisKappa-plan`, `JeisKappa-propose`, `JeisKappa-review`, and `JeisKappa-spec` plugins. `JeisKappa-propose` and `JeisKappa-spec` end with exactly one skill each; `JeisKappa-review` retains `review-lossless-mapping`. No plugin is added or removed; the existing plugin ordering (alphabetical, `JeisKappa-deprecated` last) is preserved. (P7; repo marketplace rules.)

**B8 — settings.json scopes.** In `.vscode/settings.json`, the 28 variant entries in `conventionalCommits.scopes` are replaced by the 14 bare scope names, inserted in their correct alphabetical positions; all non-variant scope entries are left untouched; the array stays sorted alphabetically. (P7; repo commit-scope rules.)

**B9 — AGENTS.md Layout.** In the `AGENTS.md` Layout code block, the variant shorthands on the `propose`, `spec`, `plan`, `implement`, `review`, and `merge` lines are updated to the bare names (e.g. `propose-{auto,interactive}` → `propose`; `plan-loose-*, plan-strict-*, adjust-plan-granularity-*` → `plan-loose, plan-strict, adjust-plan-granularity`). No other part of `AGENTS.md` is edited. (P7.)

**B10 — spine.md.** In `docs/workflow/v2/spine.md`: the `## Plan` passage is rewritten so `plan-*-auto` becomes the plan skills generically and the *"(`plan-*-interactive` is retained)"* clause is replaced with the new mechanism (run a discussion before planning, or steer the invocation); and **one** general principle sentence is added near the top of the doc stating the suite-wide rule — every spine stage is autonomous by default but steerable, via a prior discussion or an appended instruction. The "plan autonomy is a default, not a law" principle is preserved. (P5; `…decision-log.md` P5.)

**B11 — Raycast manifest.** `raycast-extension/assets/skills.json` is **regenerated** from the updated `skills/**/SKILL.md` (via the repo's sync/build), not hand-edited. (P7.)

**B12 — Boundary holds.** No file outside the in-scope set is modified; in particular nothing under `docs/threads/**` or `docs/workflow/v1/**` changes. (P7.)

**B13 — Remove the stale sentence in `review-lossless-mapping`.** In `skills/workflow/review/review-lossless-mapping/SKILL.md`, delete exactly this sentence from its opening paragraph: *"Because the human-judgment step — disposing the findings, deciding whether a flagged item is acceptable — lands in a follow-on discussion, there is no interactive variant of this skill: an interactive mode would only re-implement that downstream discussion loop."* The preceding sentence ("This review confirms that obligation was met.") and the following sentence ("This skill produces the findings; a separate discussion disposes them.") are kept and now sit adjacent — the paragraph stays coherent with no re-stitching needed. Nothing else in this file changes: it is not renamed and is not bumped to `3.0.0`. (P8.)

## Constraints

- **C1 — Immutability of frozen records.** Files under `docs/threads/**` and `docs/workflow/v1/**` are immutable history and must not be edited, even though they mention the old variant names. (P7.)
- **C2 — Skill self-containment.** Surviving skill bodies must not name a sibling skill, must not add a "when to use this skill" section, and must not couple to another skill by name/command/invocation condition. The interactivity guidance therefore lives only in README + `spine.md`, never in a skill body. (P3; `AGENTS.md` self-containment rules.)
- **C3 — Folder/name invariant.** Each skill's leaf folder name must equal its frontmatter `name:`. The doubled paths `propose/propose` and `spec/spec` are intended and correct. (P2.)
- **C4 — marketplace plugin rules.** One plugin per group; plugins sorted alphabetically by `name` with `JeisKappa-deprecated` last; every surviving skill folder listed under its group's plugin. (Repo `AGENTS.md` rules.)
- **C5 — Commit-scope sync.** Every surviving skill's bare folder name must appear in `conventionalCommits.scopes`; no removed variant name may remain there. (Repo rules.)
- **C6 — No auto-commit.** Producing the edits is the end of the work; do not stage, commit, push, or branch. (This is consistent with the surrounding workflow; committing is a separate decision.)
- **C7 — Content fidelity.** Apart from the description rewrite (B3), the default-softening (B4), the title change (B2), and the version bump (B5), the surviving bodies are otherwise preserved — this is a surgical rewrite, not a rewrite of each skill's substance. (P4.)

## Degrees of freedom

The following *hows* are explicitly left to the implementer:

- **DoF-1 — Rename mechanism.** Use `git mv` (history-preserving, preferred) or delete-and-recreate; either is acceptable. History preservation is desirable, not mandatory.
- **DoF-2 — Exact wording** of each rewritten `description:`, each softened-default sentence, the README "Steering interactivity" note, and the spine.md general-principle sentence. The spec pins their content and constraints (B3, B4, B6, B10, C2); the precise phrasing is the implementer's, provided it stays one sentence for descriptions and names no sibling skill in any skill body.
- **DoF-3 — README "Common workflows" table composition.** Whether each row is rewritten purely to bare names or additionally re-led with `discussion → …` to model the new pattern is the implementer's call, as long as no row names a removed variant and the discussion-first pattern is represented somewhere in the README.
- **DoF-4 — Placement** of the spine.md general-principle sentence (intro paragraph vs. a short lead-in), provided it is prominent and suite-wide rather than buried in the Plan section.
- **DoF-5 — Regeneration command** for the Raycast manifest (`npm run sync` / `npm run dev` / `npm run build` inside `raycast-extension/`) — whichever the implementer runs, so long as `skills.json` ends up regenerated and not hand-edited.
- **DoF-6 — Order of operations** across the edits (which file first) is unconstrained; only the end state is specified.

## Unresolved questions

None open. (U1 — `review-lossless-mapping`'s stale "no interactive variant" sentence — was resolved by the owner: delete the sentence and widen scope to include that file for that one deletion. See B13 / FR-13 and `…decision-log.md` P8.)

## Acceptance criteria

Checks are scoped to the in-scope file set; "live skill files" excludes `docs/threads/**`, `docs/workflow/v1/**`, `skills/deprecated/**`, `scripts/**`, and the generated `skills.json`.

**FR-1 — Interactive twins deleted.** (B1)
- AC-1.1 — None of the 14 `skills/workflow/**/*-interactive/` folders exist.
- AC-1.2 — `find skills/workflow -type d -name '*-interactive'` returns nothing.

**FR-2 — Surviving skills renamed.** (B2, C3)
- AC-2.1 — All 14 target folders in the manifest exist, each containing a `SKILL.md`; none of the 14 `*-auto` folders remain.
- AC-2.2 — For each, the frontmatter `name:` equals the bare name and equals the leaf folder name.
- AC-2.3 — No surviving `# Title` heading contains the word "Auto".

**FR-3 — Descriptions rewritten.** (B3)
- AC-3.1 — No surviving `description:` contains `-interactive` or `-auto` or otherwise names a sibling/twin skill.
- AC-3.2 — No surviving `description:` contains the autonomous-subset contrast framing (e.g. "without clarifying questions", "already know(s) what you want", "use `…-interactive` for that").
- AC-3.3 — Each `description:` is a single sentence stating what the skill does and when to use it.

**FR-4 — Bodies softened, twin pointers removed, no salvage.** (B4, C2, C7)
- AC-4.1 — No surviving body contains a categorical refusal of interactivity (no standalone "it does not ask clarifying questions / does not interview the user" as an absolute rule); each such statement is reframed as an autonomous *default* that yields to an explicit steering instruction.
- AC-4.2 — No surviving body names a sibling skill or points the reader to a deleted twin (e.g. `review-plan` no longer says "run that review interactively instead"); grep for `-interactive`/`-auto` skill-name references in surviving bodies returns nothing.
- AC-4.3 — No surviving body gained an Anti-Sycophancy Stance, Scope Drift, or element-by-element interview section that it did not already have.
- AC-4.4 — Aside from title, description, version, the softened default, and removed twin pointers, each surviving body is otherwise unchanged from its `*-auto` predecessor (diff shows no substantive content rewrite).

**FR-5 — Versions bumped.** (B5)
- AC-5.1 — All 14 surviving `SKILL.md` files carry `version: 3.0.0`.

**FR-6 — README updated.** (B6)
- AC-6.1 — The count of per-skill `####` sections in `README.md` decreases by exactly 14 (the deleted twins; e.g. 43 → 29 if no other sections change); each of the 14 surviving affected skills has exactly one section; `review-lossless-mapping`'s section remains; and no `####` heading references a `-auto` or `-interactive` skill.
- AC-6.2 — Every `npx skills add … --skill <name>` snippet and every `./skills/workflow/…` link in `README.md` uses a bare name; none references a renamed/deleted variant.
- AC-6.3 — The Layer/Members table and the Common workflows table contain no `-auto`/`-interactive` or `{auto,interactive}` shorthand.
- AC-6.4 — `README.md` contains a "Steering interactivity" note describing the run-a-discussion-first / append-a-steering-instruction pattern.

**FR-7 — marketplace.json updated.** (B7, C4)
- AC-7.1 — `.claude-plugin/marketplace.json` contains no path ending in `-auto` or `-interactive`.
- AC-7.2 — Each surviving skill's bare path appears under its correct group plugin; `JeisKappa-propose` and `JeisKappa-spec` list exactly one skill each; `JeisKappa-review` lists the 5 bare review skills plus `review-lossless-mapping`.
- AC-7.3 — The file is valid JSON, the plugin set is unchanged, and plugins remain alphabetically ordered with `JeisKappa-deprecated` last.

**FR-8 — settings.json scopes updated.** (B8, C5)
- AC-8.1 — `conventionalCommits.scopes` contains all 14 bare names and none of the 28 variant names.
- AC-8.2 — All previously-present non-variant scope entries are still present.
- AC-8.3 — The array is valid JSON and sorted alphabetically.

**FR-9 — AGENTS.md Layout updated.** (B9)
- AC-9.1 — The `AGENTS.md` Layout block contains no `{auto,interactive}` shorthand and no `-auto`/`-interactive`/`*-auto` variant forms on the propose/spec/plan/implement/review/merge lines.
- AC-9.2 — No part of `AGENTS.md` outside the Layout block changed.

**FR-10 — spine.md updated.** (B10)
- AC-10.1 — `docs/workflow/v2/spine.md` contains no `plan-*-auto` or `plan-*-interactive` reference.
- AC-10.2 — The Plan passage states that human-in-the-loop planning is supported via running a discussion first or steering the invocation, and the "plan autonomy is a default, not a law" principle is retained.
- AC-10.3 — A single general sentence near the top states the suite-wide autonomous-by-default-but-steerable rule.

**FR-11 — Raycast manifest not hand-edited.** (B11)
- AC-11.1 — `raycast-extension/assets/skills.json` is never hand-edited (binding). Because it is git-ignored, it does not appear in the change set; it regenerates from the updated `SKILL.md` files on the next `npm run sync`/`dev`/`build`. If regenerated locally for verification, it reflects the 14 bare names and none of the variant names.

**FR-12 — Boundary holds.** (B12, C1)
- AC-12.1 — `git status` shows changes only within the in-scope file set; no file under `docs/threads/**` or `docs/workflow/v1/**` is modified.
- AC-12.2 — A repo-wide grep over the in-scope files for the 14 names suffixed with `-auto`/`-interactive` returns nothing; the same grep over `docs/threads/**` and `docs/workflow/v1/**` still returns their original (unchanged) historical references.

**FR-13 — `review-lossless-mapping` sentence removed.** (B13)
- AC-13.1 — `skills/workflow/review/review-lossless-mapping/SKILL.md` no longer contains the string "no interactive variant of this skill" (nor the rest of the deleted sentence); the surrounding paragraph is otherwise intact and reads coherently.
- AC-13.2 — That file is not renamed, and its `version:` is not `3.0.0` (it stays `1.0.0`, or at most a patch bump).

**Coverage / traceability:** Every expected behavior B1–B13 is enforced by FR-1…FR-13 respectively; each FR traces to the behavior and the decision-log point(s) cited inline above (P1→FR-1; P2→FR-2/C3; P3→FR-4(C2)/FR-6/FR-10; P4→FR-3/FR-4/FR-5-adjacent; P5→FR-10; P6→FR-5; P7→FR-1/FR-7/FR-8/FR-9/FR-11/FR-12 and C1; P8→FR-13).
