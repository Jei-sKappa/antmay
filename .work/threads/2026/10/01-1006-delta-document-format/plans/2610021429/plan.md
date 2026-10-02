# Plan: delta documents as literal files and Edit-model JSON, checked and landed by shipped scripts

## Objective

Replace the Markdown-wrapped delta document across the skill suite. A `create` becomes the target file itself at its mirrored path. An `edit` or `delete` becomes a JSON document at the mirrored path plus `.json`, with edits modelled on Claude Code's `Edit` tool. Two dependency-free Node scripts ship as shared references: `check-delta.mjs` checks a thread's delta and writes nothing, and `apply-delta.mjs` lands it all or nothing and is mirrored into `close-thread` alone. The `spec`, `review-spec` and `close-thread` bodies draft, judge, dry-run and land deltas through them.

## Context

- The why behind both choices is in `delta/docs/adr/2610021413-delta-document-format.md` and `delta/docs/adr/2610021413-delta-landed-by-shipped-scripts.md`. The design is `spec.md`.
- All work is under `suite/`, and every suite command runs from `suite/`. The suite's standing gates are `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` (CI's `suite` job). Every task runs both.
- Shared files are edited under `suite/shared/references/` and mirrored with `node scripts/sync-shared-references.mjs`. Copies under a skill's `references/` are never edited by hand.
- `docs/glossary.md` and `suite/AGENTS.md` change only through this thread's delta (`delta/docs/glossary.md`, `delta/suite/AGENTS.md`), which `close-thread` lands. No task edits them.
- This thread's own `delta/` is in the Markdown format the old `close-thread` reads. Never run the new `check-delta.mjs` or `apply-delta.mjs` against this thread, and never rewrite its delta. Every script check in this plan runs on scratch fixtures under a temporary folder, which are not committed.
- The already-done rule follows `spec.md` as amended on 2026-10-02. An edit is already done when its `new_string` occurs in the target and every occurrence of its `old_string` lies inside an occurrence of `new_string`, so an addition already landed is never applied twice.
- This change causes no CLI drift (`spec.md`, `## Context`), so no drift note is owed.

Source: spec.md

## Global Constraints

- **Cross-module CLI rule:** nothing under `cli/` is touched (`AGENTS.md`, `### The CLI is on hold`).
- **Documentation rules:** shipped content describes the new format as if the old one never existed: no "no longer", no before/after contrast (`docs/documentation-rules.md`).
- **Dependencies:** both scripts use only `node:` built-ins, because a skill folder cannot carry `node_modules`.
- **Direct-run guard:** `check-delta.mjs` decides whether it was run directly by comparing `import.meta.url` with `pathToFileURL(realpathSync(process.argv[1])).href`. Without `realpathSync`, the guard silently skips the command when the path goes through a symlink, as macOS temporary paths do (`log.md`).
- **Edits to mirrored copies:** shared files are edited under `suite/shared/references/` and mirrored with `node scripts/sync-shared-references.mjs`. Copies under a skill's `references/` are never edited by hand (`suite/AGENTS.md`).
- **Risk, closing this thread:** this thread's own delta is written in the current Markdown format, because the `spec` and `close-thread` that draft and land it read that format. Close this thread with the `close-thread` that reads the Markdown format, before reinstalling the suite. Once the new `close-thread` is installed, this delta would be refused as malformed, and would first have to be redrafted in the new format.

## Tasks

1. **Rewrite the delta-document format** — describe a `create` as the literal target file and an `edit` or `delete` as Edit-model JSON, and update the delta path examples in the thread and spec formats. → `plan-tasks/01-rewrite-delta-document-format.md`
2. **Build the check-delta core** — add `check-delta.mjs` with parsing, validation, the landing computation, the failure report and the direct-run guard. → `plan-tasks/02-build-check-delta-core.md`
3. **Add check-delta's rendering, word counts and landed view** — give the report its old/new blocks and agents-file word counts, and add the landed view. → `plan-tasks/03-add-check-delta-rendering-counts-landed-view.md`
4. **Add apply-delta and distribute the scripts** — add `apply-delta.mjs`, declare both scripts in the manifest, sync them, and document scripts as a kind of shared reference. → `plan-tasks/04-add-apply-delta-and-distribute-scripts.md`
5. **Update the spec body** — draft deltas in the new format and check them with `check-delta.mjs` before the `event` line. → `plan-tasks/05-update-spec-body.md`
6. **Update the review-spec body** — run `check-delta.mjs` in the well-formedness check and review edits through its rendering. → `plan-tasks/06-update-review-spec-body.md`
7. **Update the close-thread body and run the whole-change checks** — dry-run, count, read and land through the scripts, then confirm the change as a whole. → `plan-tasks/07-update-close-thread-body.md`
