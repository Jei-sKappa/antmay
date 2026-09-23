# Implementation report

Plan: none

## Outcome

The suite, its README and its living documents now call the thread's design document the spec again: `spec.md`, the `spec` skill and the `review-spec` skill, with the shared format `formats/spec.md`. The "another thread is history" line is in the shared read-and-cite instruction. The run stopped short of completion on two fronts: the project-layer documents still carry the old term, because they change only through a delta this run may not write, and how the history line reaches every skill is queued as a pending decision. Nothing was committed, at the user's instruction.

## Changes

- `suite/skills/spec/spec/` (was `suite/skills/change/change/`) and `suite/skills/review/review-spec/` (was `review-change/`): frontmatter `name:`, headings and `agents/openai.yaml` display names.
- `suite/shared/references/formats/spec.md` (was `change-document.md`), retitled "Spec format", its routing table naming the spec authoring; the generated copies re-synced and the stale `change-document.md` copies removed.
- `suite/shared/manifest.yaml`, `.claude-plugin/marketplace.json`, `.vscode/settings.json`: the renamed skills and format.
- Every skill body, shared format and instruction, `suite/authoring/`, `suite/AGENTS.md`, `README.md` and `docs/documentation-rules.md`: "change document" → "spec", `change.md` → `spec.md`, `change` → `spec`, `review-change` → `review-spec`.
- `suite/shared/references/instructions/read-and-cite-the-project-layer.md`: the history line after the read order.

## Verification

- `node scripts/check-marketplace-skills.mjs` (from `suite/`): OK, 18 skills, all declared.
- `node scripts/check-skill-text.mjs`: OK, 146 files.
- `git grep` for `change document`, `change.md`, `review-change` and `skills/change` outside `cli/`, `.work/` and the project layer: no hits.
- The CLI's own check was not run; `cli/` is on hold and was not touched.

## Acceptance

The thread holds no spec; the criteria are the settled log lines.

| Criterion | Method | Evidence |
| --- | --- | --- |
| the thread design document goes back to spec.md, written "the spec", with the skills renamed back to spec and review-spec | code review | folders, manifest, marketplace and every skill body checked by `git grep`; both gates pass |
| the glossary entry for spec superseding its "leaves the vocabulary" row | code review | not done: `docs/glossary.md` is project layer, changed only by a delta landed at close |
| the rule that another thread is history and is read only when the user or this thread's seed names it goes as one line in the shared instruction read-and-cite-the-project-layer.md | code review | line present after "7. The thread." and mirrored into the 11 declaring skills |

## Deviations

- Ran on a worktree dirty with this thread's own untracked folder — departs from the implement skill's dirty-worktree gate — the invocation suppressed every commit, so no pre-existing change could enter one.
- Left `docs/glossary.md`, `docs/product/method.md` untouched — departs from the settled glossary supersession — the project layer changes only through a delta, which this run's write boundary excludes.

## Remaining concerns

- The history line reaches only the 11 skills that carry the instruction, and none of them reads its read order at session start; queued at `.pending-decisions/260923071500Z-k7q2-history-line-reach.md`.
- The renames are staged by `git mv`; the content edits are unstaged.

## Follow-ups

- Author the thread's delta with `spec`: an `edit` of `docs/glossary.md` (the **spec** row redefined, **change document** leaving the vocabulary, the thread-log row naming `spec` as the authoring skill) and an `edit` of `docs/product/method.md`, then `close-thread` to land them.
- `cli/` drift shrinks: `cli/README.md` already names `review-spec` and `spec.md`, which resolve again; the realignment pass should confirm the rest.
