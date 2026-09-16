# Implementation report

Plan: none

## Outcome

Completed. The three auto-committing implement skills — `implement`, `implement-plan`, and `implement-plan-with-subagents` — now commit their run's `report.md` as a closing report commit, its own commit made after the report is written and before the final out-message, at every terminal outcome an executing run reaches. The act lives in one new shared instruction, `suite/shared/references/instructions/commit-the-implementation-report.md`, declared for the three skills and mirrored into each. Four commits carry the work: one for the shared instruction and manifest, one per skill body.

## Changes

- `suite/shared/references/instructions/commit-the-implementation-report.md` (new) — the closing-commit act: stage the run's `report.md` alone, make one new commit with no amend, rebase, or force-push, follow it at completion, partial completion, a `BLOCKED` halt, and a no-op; on failure diagnose first, fix in-footprint causes with at most three fix-and-retry attempts, never bypass a hook, weaken or skip a check, or stash and retry; past the cap the report stays uncommitted and the run's token is unchanged. Defines the uncommitted marker appended to the terminal outcome reason: `; report uncommitted at <report path>: <diagnosis>`, used both after a failure and after a suppression instruction.
- `suite/shared/manifest.yaml` — declares the new instruction for `skills/implement/implement`, `skills/implement/implement-plan`, and `skills/implement/implement-plan-with-subagents`, and for no other skill.
- `suite/skills/implement/*/references/instructions/commit-the-implementation-report.md` — the three mirrored copies the sync script generated.
- `suite/skills/implement/implement/SKILL.md`, `suite/skills/implement/implement-plan/SKILL.md`, `suite/skills/implement/implement-plan-with-subagents/SKILL.md` — each gains: procedure step 8 "Commit the report", pointing at the instruction, naming who performs it (the implementer; under the subagent skill the orchestrator and never a subagent), skipped only under an explicit suppression instruction, and never routed through `## Blocked`; the final out-message (now step 9) names the closing report commit's SHA and subject or states that the report was left uncommitted and why; both `## Blocked` routes commit the report right after writing it and before stopping; `## Commit Policy` gains a closing report commit clause stating that a suppression instruction suppresses it with the uncommitted marker while a cadence instruction does not reach it, and the staging rule now says the closing report commit stages the report alone; `### Failed commit` is scoped to task or cycle commits with a sentence that the closing report commit carries its own failure handling. The subagent body additionally names the closing commit among the commits its final out-message folds.
- `suite/shared/references/instructions/write-implementation-report.md` — untouched; it holds no commit, stage, or Git operation and keeps its statement that `report.md` is the only file that act writes.

## Verification

- `node scripts/check-skill-text.mjs` from `suite/` — OK after every task and on the whole change (113 files, no bare reference, no per-before-path, no indented fence).
- `node scripts/sync-shared-references.mjs` from `suite/` — re-run after the final edit; `git status --porcelain` empty afterwards, so every mirrored copy is present and matches its canonical source (AC-5.4).
- `node scripts/check-marketplace-skills.mjs` from `suite/` — OK, 18 skills (no frontmatter changed; run as a whole-change sanity check).
- `git diff --name-only 82d4f45 HEAD -- cli/` — empty; nothing under `cli/` was touched (AC-7.2).
- Acceptance criteria read against the text: each body carries exactly one pointer to the new instruction, positioned between the report step and the final out-message; each names the suppression and cadence cases; each `## Blocked` route and the operational-defect route reach the closing report commit; no `## Dirty worktree handling` exception was added (AC-3.5).
- No behavioural test exists for skill prose; the suite defines no build. Coherence was confirmed by reading each edited body end to end.

## Deviations

- Task and cycle failed-commit sections were narrowed with one sentence ("A failed task commit…" / "A failed cycle commit…" plus "The closing report commit carries its own failure handling and never reaches `## Blocked`") — departs from nothing in the spec, which lists the `### Failed commit` wording among the degrees of freedom; added because without it the existing "exhausted commit retry ends the run `BLOCKED`" sentence would read as applying to the closing report commit and contradict AC-3.4.
- The `## Blocked` routes cite the closing commit by procedure step (`## Procedure`, step 8) rather than by a second pointer to the instruction — departs from no spec text; chosen so each body carries the pointer once, at the step where the act happens, as `body-structure.md` requires.

## Remaining concerns

- The uncommitted marker duplicates the report path in the `DONE` case, since the reason already is `<report path>`: the line reads `Outcome: DONE — <report path>; report uncommitted at <report path>: <diagnosis>`. This keeps the marker one fixed greppable phrase across the three tokens at the cost of redundancy on one of them.
- The instruction names the terminal outcome reason. Every current declarer emits a terminal outcome, so this holds; a future declarer that emits none would need the marker section rephrased.

## Follow-ups

- **CLI drift, for the realignment pass (AC-7.3).** `cli/src/pipeline/catalog.ts` shares one `implementationPolicy` across the three implementation stages that expects the implementation stage's tracked change to be an uncommitted report at the thread-root path `implementation-report.md`, with `changeRequired: true` and a `docs(<thread-folder>): implementation report` commit made by the executor at the stage boundary. That expectation was already stale — the suite writes `implementations/<yymmddhhmm>[-<slug>]/report.md` — and this change invalidates it further: the skill now commits the report itself, so the executor boundary will find no tracked change and the stage's required-change check will fail. `cli/README.md`'s stage-support table is left as is under the hold. Not repaired here.
- The root `README.md` skill index entries for the three implement skills say "committing per task" / "committing per derived task" / "committing per reviewed task" and describe leaving an implementation folder with its `report.md`; they remain accurate but do not mention that the report is committed too. Worth one clause when the index is next revised; out of this thread's stated scope.
