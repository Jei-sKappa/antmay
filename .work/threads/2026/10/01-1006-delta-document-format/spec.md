# Delta documents as literal files and Edit-model JSON, checked and landed by shipped scripts

## Goal

Replace the Markdown-wrapped delta document with a format an agent cannot confuse with its target: a `create` is the target file itself, and an `edit` or `delete` is a JSON document of edits modelled on Claude Code's `Edit` tool. Two dependency-free scripts check and land it mechanically, and only `close-thread` holds the one that writes.

## Context

The ticket (`seed.md`) found the current format unsatisfactory without pinning why. The discussion established it (`log.md`):

- A delta document is a Markdown file whose sections describe changes to another Markdown file.
- A `create` of a decision record carries two frontmatter blocks, the wrapper's and the record's, and agents get them confused.
- `add` anchors (`under`, `after`, `end`) are ambiguous about placement, and quoted text has to be found but never has to be unique.
- The recorded blob hash blocks every close that follows an unrelated parallel change to the glossary or an agents file.

Why the new format and the scripts were chosen is recorded in `delta/docs/adr/2610021413-delta-document-format.md` and `delta/docs/adr/2610021413-delta-landed-by-shipped-scripts.md`. This spec covers what the implementer builds.

The delta format is read and written in four places in the suite:

- the format file `suite/shared/references/formats/delta-document.md`;
- `spec`, which drafts deltas;
- `review-spec`, which judges them;
- `close-thread`, which dry-runs and lands them.

Other skills read a thread's `delta/` for its content and name no format detail. The examples in `formats/thread.md` and `formats/spec.md` name delta paths.

Facts checked while authoring:

- `cli/src` does not mention delta documents, so this change causes no CLI drift.
- Every existing thread with a `delta/` is closed. Their deltas stay as historical snapshots in the old format, and nothing migrates.
- `suite/scripts/check-skill-text.mjs` walks only `.md` files, so shipped `.mjs` files pass it unchanged.
- `suite/scripts/sync-shared-references.mjs` copies any declared file byte for byte, so it mirrors scripts unchanged.

## Scope and non-scope

In scope:

- the delta-document format;
- the two scripts and their manifest declarations;
- the `spec`, `review-spec` and `close-thread` bodies where they draft, judge, dry-run or land a delta;
- the delta path examples in `formats/thread.md` and `formats/spec.md`;
- the shared-references authoring convention.

Out of scope:

- anything under `cli/`, which is on hold;
- rewriting the deltas of closed threads;
- operations that know a document's structure (term-level edits for the glossary, section-level edits for agents files). These were mentioned as a possible later layer and not settled.
- `close-thread`'s non-delta checks: currency, thread-reference search, roadmap reference and workspaces.
- the supersede move.

## Constraints

- **Cross-module CLI rule:** nothing under `cli/` is touched (`AGENTS.md`, `### The CLI is on hold`).
- **Documentation rules:** shipped content describes the new format as if the old one never existed: no "no longer", no before/after contrast (`docs/documentation-rules.md`).
- **Dependencies:** both scripts use only `node:` built-ins, because a skill folder cannot carry `node_modules`.
- **Direct-run guard:** `check-delta.mjs` decides whether it was run directly by comparing `import.meta.url` with `pathToFileURL(realpathSync(process.argv[1])).href`. Without `realpathSync`, the guard silently skips the command when the path goes through a symlink, as macOS temporary paths do (`log.md`).
- **Edits to mirrored copies:** shared files are edited under `suite/shared/references/` and mirrored with `node scripts/sync-shared-references.mjs`. Copies under a skill's `references/` are never edited by hand (`suite/AGENTS.md`).
- **Risk, closing this thread:** this thread's own delta is written in the current Markdown format, because the `spec` and `close-thread` that draft and land it read that format. Close this thread with the `close-thread` that reads the Markdown format, before reinstalling the suite. Once the new `close-thread` is installed, this delta would be refused as malformed, and would first have to be redrafted in the new format.

## The change

### The delta-document format

Rewrite `suite/shared/references/formats/delta-document.md` to the format `delta/docs/adr/2610021413-delta-document-format.md` decides, describing it as the only format:

- **`create`:** the target file itself, written literally at `delta/<target path>`. It has no wrapper and no frontmatter of its own; a decision record carries only its own frontmatter. Its target does not exist.
- **`edit`:** a JSON document at `delta/<target path>.json` *(Inference: the `.json` suffix on the mirrored path; the project layer holds only `.md` files, so the suffix alone tells an edit or delete document from a `create`)*. Its target exists.

  ```json
  {
    "type": "edit",
    "edits": [
      { "old_string": "<exact text in the target>", "new_string": "<its replacement>", "replace_all": false }
    ]
  }
  ```

- **`delete`:** `{ "type": "delete" }` at `delta/<target path>.json`. Its target exists.

Rules the format states:

- Keys and types:
  - `type` is always present and is `"edit"` or `"delete"` *(Inference: `type` stays explicit rather than implied by whether `edits` is present)*.
  - An edit document carries `type` and a non-empty `edits` array. A delete carries `type` alone.
  - Each edit carries a non-empty `old_string`, a `new_string` that may be empty, and an optional boolean `replace_all` that defaults to `false`. No other key is allowed *(Inference: a non-empty `old_string` and a non-empty `edits` array, because an empty `old_string` matches nowhere in particular and an empty edit list changes nothing)*.
- Matching:
  - `old_string` occurs exactly once in the target, unless `replace_all` is `true`, in which case it occurs at least once and every occurrence is replaced.
  - An addition is an edit whose `old_string` is neighboring text and whose `new_string` is that text plus the addition. A removal is an edit with an empty `new_string`.
  - Edits apply in order, each against the result of the previous one. The document lands all or nothing.
  - ~~An edit whose `old_string` does not occur but whose `new_string` does occur counts as already done, and changes nothing. This holds for a `replace_all` edit too *(Inference: the already-done rule applies to `replace_all` edits exactly as to single edits)*.~~ *(Superseded 2026-10-02: an addition already landed keeps its `old_string` inside the landed text, so this rule would apply it a second time and duplicate it. Replaced by the rule below (`log.md`).)*
  - An edit counts as already done, and changes nothing, when its `new_string` occurs in the target and every occurrence of its `old_string` lies inside an occurrence of `new_string`.
    - When `old_string` does not occur at all, this is the case of an absent `old_string` and a present `new_string`.
    - It also covers an addition already landed, whose `old_string` still occurs inside the landed text.
    - The already-done test comes before the occurrence count, so an edit that is already done is never applied and never a conflict.
    - This holds for a `replace_all` edit too *(Inference: the already-done rule applies to `replace_all` edits exactly as to single edits)*.
  - Exact means exact after normalizing line ends and trailing spaces *(Inference: the normalization rule carries over unchanged)*.
- One delta document per target per thread: a `delta/<target>` and a `delta/<target>.json` for the same target together are malformed *(Inference: one document per target carries over)*.

### The scripts

Add two shared references under `suite/shared/references/scripts/`, as `delta/docs/adr/2610021413-delta-landed-by-shipped-scripts.md` decides.

**`check-delta.mjs`** takes a thread root and reads its `delta/` against the project layer from the project root. It writes nothing.

- **Failures.** It reports every failure, not just the first. Each failure names the delta document, the edit's position when it concerns one edit, and one of two kinds *(Inference: the two kinds map onto `close-thread`'s existing split between a refusal for a malformed document and a block for a mismatch)*:
  - **malformed:** the JSON doesn't parse; a key is missing, unknown or of the wrong type; the path mirrors no project-layer path; or a target has two documents.
  - **conflict:** a `create` whose target exists; an `edit` or `delete` whose target doesn't exist; an `old_string` that doesn't occur (and the edit isn't already done); or an `old_string` that occurs more than once without `replace_all`.
- **Exit code:** 0 when there's no failure, non-zero otherwise.
- **Rendering.** It shows each edit as an old/new pair of literal text blocks, so a reader reviews that rendering rather than escaped JSON strings.
- **Agents-file word counts.** For each target named `AGENTS.md` or `CLAUDE.md`, it reports the word count before landing (zero for a `create`) and after landing (zero for a `delete`). Words are counted the way `wc -w` counts them.
- **Landed view.** On request, it prints a target as it will stand after landing. *(Inference: the word counts and the landed view move into the script, because `close-thread`'s budget and passage checks cannot extract blocks from JSON strings with heredocs.)*
- **Exports.** It exports its parsing, validation and landing computation for `apply-delta.mjs`, and runs as a command only when run directly, using the guard under `## Constraints`.

**`apply-delta.mjs`** imports `./check-delta.mjs` and runs the whole check. On any failure, it writes nothing and exits non-zero with the same report. Otherwise:

- it writes every `create` (creating folders it needs), writes every edited target, and removes every deleted target;
- it reports the files it wrote and exits 0.

It does nothing beyond landing the documents *(Inference: moving superseded records and every other closing write stays with `close-thread`'s body)*.

**Manifest.** In `suite/shared/manifest.yaml`:
- `scripts/check-delta.mjs` is declared for `skills/spec/spec`, `skills/review/review-spec` and `skills/close/close-thread`;
- `scripts/apply-delta.mjs` is declared for `skills/close/close-thread` only.

Run the sync so each skill carries its copies. No other skill is given either script *(Inference: skills that only read a delta read the JSON directly)*.

### `spec`

In `suite/skills/spec/spec/SKILL.md`:

- **Inputs:** the target of each `edit` and `delete` is read for the exact text an `old_string` quotes. Nothing records a hash.
- **Drafting:**
  - A `create` is written literally at the mirrored path.
  - An `edit` or `delete` is written as JSON at the mirrored path plus `.json`.
  - The glossary and agents-file examples name `delta/docs/glossary.md.json` and `delta/AGENTS.md.json` for edits.
- **Checking the draft:** after writing the delta, the run executes `node <skill_path>/references/scripts/check-delta.mjs <thread root>`. It repairs every failure in its own draft before appending its `event` line *(Inference: a failure in the run's own draft is repaired in that run, by adding context to a non-unique `old_string` or re-quoting moved text, rather than queued)*.
- **Amendment pass:** an `edit` or `delete` is amended after its target is read again, re-quoting any `old_string` whose text moved. Nothing re-records a hash.

### `review-spec`

In `suite/skills/review/review-spec/SKILL.md`:

- The well-formedness check runs `check-delta.mjs` on the thread, and every failure it reports is a finding.
- The other parts of that check stay with the reviewer *(Inference: `check-delta.mjs` checks delta mechanics only, and whether a document is written well for its kind stays with the review)*:
  - one document per target;
  - each `create` against its kind's format;
  - literal edits rather than instructions.
- The reviewer reads edits through the script's old/new rendering.

### `close-thread`

In `suite/skills/close/close-thread/SKILL.md`:

- **Inputs:** the input listing every target's current blob hash goes away. The scripts read the targets.
- **Check 4 (delta dry run)** runs `check-delta.mjs`:
  - a conflict goes to `## Blocked`, naming the document and the mismatch;
  - a malformed document goes to `## Refusals`.
  - Resolving `supersedes` stems, and classifying contradictions with project records, stay as the body performs them today.
- **Check 5 (agents-file budget)** takes its before and after counts from `check-delta.mjs` instead of heredoc counts of operation blocks.
- **Check 6 (agents-file passages)** reads each changed agents-file passage as it will stand after landing, from the script's landed view.
- **Write step 1** lands the delta with `node <skill_path>/references/scripts/apply-delta.mjs <thread root>`. If it fails after the checks passed, nothing has been written: the run stops `BLOCKED` with the script's report as the diagnosis *(Inference: a failure at landing time is an operational defect of the run, because the same check passed moments before)*.
- **Refusals and `## Blocked`:** their delta entries describe the new failures, with no hash entry and no Markdown-operation entry.

### Formats and authoring convention

- `suite/shared/references/formats/thread.md`: the `delta/` comment shows a `create` path and a `.json` edit path, for example `delta/docs/adr/<stem>.md` and `delta/docs/glossary.md.json`.
- `suite/shared/references/formats/spec.md`: the delta-index example lists an edit under its `.json` path.
- `suite/authoring/shared-references.md`:
  - Scripts become a fourth kind under `shared/references/`: dependency-free Node using only `node:` built-ins, mirrored like the others.
  - A script that imports another is declared together with it for every skill that runs it.
  - The opening "passive material" wording covers scripts.

### Project layer

- `delta/docs/glossary.md` redefines **delta document** and **shared reference**.
- `delta/suite/AGENTS.md` adds `shared/references/scripts/` to the layout tree.

No one-off migration is needed.

## Acceptance

- `suite/shared/references/formats/delta-document.md` describes a `create` as the literal target file at its mirrored path, and an `edit` or `delete` as a JSON document at the mirrored path plus `.json`, and describes no Markdown operation sections, anchors or hash.
- A `create` delta document for a decision record has exactly one frontmatter block, the record's own.
- `check-delta.mjs` and `apply-delta.mjs` exist under `suite/shared/references/scripts/` and import only `node:` built-ins and, for `apply-delta.mjs`, `./check-delta.mjs`.
- Running `check-delta.mjs` directly through a symlinked path produces its report rather than exiting silently.
- `check-delta.mjs` writes no file under any input.
- `check-delta.mjs` exits non-zero and names the edit when an `old_string` occurs more than once without `replace_all`.
- `check-delta.mjs` exits non-zero and names the edit when an `old_string` does not occur and its `new_string` does not occur either.
- `check-delta.mjs` reports an edit whose `old_string` is absent and whose `new_string` is present as already done, not as a failure.
- `check-delta.mjs` reports an addition already in the target, whose `new_string` occurs and every occurrence of whose `old_string` lies inside an occurrence of `new_string`, as already done, and the landing does not apply it again.
- `check-delta.mjs` reports a `create` whose target exists, and an `edit` or `delete` whose target does not exist, as conflicts.
- `check-delta.mjs` reports unparsable JSON, a missing, unknown or mistyped key, an unmirrored path, and two documents for one target as malformed.
- `check-delta.mjs` reports every failure in the delta in one run, each with its kind.
- `check-delta.mjs` renders each edit as an old/new pair of literal text blocks.
- `check-delta.mjs` reports before and after word counts, as `wc -w` counts them, for every `AGENTS.md` or `CLAUDE.md` target.
- `check-delta.mjs` can print a target as it will stand after landing.
- Edits apply in order, each against the result of the previous edit, and a `replace_all` edit replaces every occurrence.
- `apply-delta.mjs` writes nothing when any delta document of the thread fails the check.
- `apply-delta.mjs` writes every `create`, writes every edited target, and removes every deleted target when the whole delta passes.
- `suite/shared/manifest.yaml` declares `scripts/check-delta.mjs` for `spec`, `review-spec` and `close-thread`, and `scripts/apply-delta.mjs` for `close-thread` only.
- After the sync, `apply-delta.mjs` exists under `close-thread`'s `references/scripts/` and under no other skill's `references/`.
- The `spec` body drafts a `create` literally at the mirrored path and an `edit` or `delete` as JSON at the mirrored path plus `.json`, and records no hash.
- The `spec` body runs `check-delta.mjs` on the written delta and repairs every failure before appending its `event` line.
- The `spec` amendment pass re-reads an edited target and re-quotes moved `old_string` text, and records no hash.
- The `review-spec` body runs `check-delta.mjs` and turns every reported failure into a finding.
- The `close-thread` dry run uses `check-delta.mjs`, sending conflicts to `## Blocked` and malformed documents to `## Refusals`.
- The `close-thread` agents-file budget uses the word counts `check-delta.mjs` reports.
- The `close-thread` passage check reads changed agents-file passages from the landed view `check-delta.mjs` prints.
- The `close-thread` landing runs `apply-delta.mjs`.
- No skill body or shared reference mentions a delta document's `hash`, an `add`/`replace`/`remove` operation section, or an `under`/`after`/`end` anchor.
- `formats/thread.md` and `formats/spec.md` show edit delta paths with the `.json` suffix.
- `suite/authoring/shared-references.md` names scripts as a kind of shared reference.
- `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` pass from `suite/`, and a fresh `node scripts/sync-shared-references.mjs` leaves no diff.
- Nothing under `cli/` changes.

## Degrees of freedom

- The command-line shape of `check-delta.mjs`: how the thread root is passed, and how the landed view and the rendering are requested, as long as every skill body invokes it the same way.
- The layout of the script's report and its old/new rendering, as long as each failure carries its document, its edit position and its kind.
- How line ends and trailing spaces are normalized internally, as long as matching is exact after that normalization and written files keep the target's content otherwise byte for byte.
- Whether a JSON Schema file ships next to the scripts.
- How the scripts' internal code is structured, beyond `apply-delta.mjs` importing `check-delta.mjs`.

## Inferences

- The `.json` suffix on the mirrored path for edit and delete documents. Shapes `### The delta-document format`.
- `type` stays explicit in edit and delete documents. Shapes `### The delta-document format`.
- An `old_string` and the `edits` array are non-empty. Shapes `### The delta-document format`.
- The already-done rule applies to `replace_all` edits. Shapes `### The delta-document format`.
- Matching normalizes line ends and trailing spaces, as before. Shapes `### The delta-document format`.
- One delta document per target, including across a `create` and a `.json` document for the same target. Shapes `### The delta-document format`.
- `check-delta.mjs` classifies each failure as malformed or conflict, mapping onto `close-thread`'s split between a refusal and a block. Shapes `### The scripts` and `### close-thread`.
- `apply-delta.mjs` only lands documents, and the supersede move stays with `close-thread`. Shapes `### The scripts`.
- The word counts and the landed view live in `check-delta.mjs`. Shapes `### The scripts` and `### close-thread`.
- `check-delta.mjs` checks delta mechanics only, and conformance of a document to its kind's format stays with `review-spec`. Shapes `### review-spec`.
- Skills that read a delta without landing or judging it (`plan`, `implement`, the other reviews) read edit documents as JSON directly and are given neither script. Shapes `### The scripts` (manifest).
- `spec` repairs failures in its own draft in the same run rather than queueing them. Shapes `### spec`.
- A failure at landing time, after the checks passed, ends `close-thread` `BLOCKED` as an operational defect. Shapes `### close-thread`.

## Delta index

- `delta/docs/adr/2610021413-delta-document-format.md` — create
- `delta/docs/adr/2610021413-delta-landed-by-shipped-scripts.md` — create
- `delta/docs/glossary.md` — edit
- `delta/suite/AGENTS.md` — edit
