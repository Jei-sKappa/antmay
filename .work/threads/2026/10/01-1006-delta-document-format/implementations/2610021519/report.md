# Implementation report

Plan: plans/2610021429/

## Outcome

The run completed every task of the plan. The delta-document format, the two scripts, their manifest declarations and the `spec`, `review-spec` and `close-thread` bodies are in place, and the suite's gates pass on the final state.

## Judgment calls

- Task 01 — the format states that a `create` has no wrapper and no frontmatter of its own — fills the brief's silence, which lists the rules without that one — the spec's `create` bullet states it.
- Task 01 — the addition example appends a line after a neighboring list line (`docs/` → `scripts/`) rather than after a heading — fills the brief's freedom in choosing the example — a list line shows neighboring text as the `old_string` most plainly.
- Task 01 — the `thread.md` `delta/` comment shows `delta/docs/adr/<stem>.md`, `delta/docs/glossary.md.json` and `delta/AGENTS.md.json`, without a `docs/pdr/` example — fills the spec's "for example" — one `create` and two `.json` edits cover both shapes within the comment's width.
- Task 02 — an `old_string` made only of spaces or tabs is malformed — fills the format's silence on a string that is empty after normalization — such a string would otherwise match nowhere in particular.
- Task 02 — an edit document whose target is missing still lists its edits, each marked `failed`, with only the document-level conflict reported — fills the report-layout degree of freedom — one conflict per cause keeps the failure list readable.
- Task 02 — the report header reads `<path> -> <target> (<type>[, malformed])`, with the failure lines after all headers — fills the report-layout degree of freedom — each failure line still carries its document, edit position and kind.
- Task 03 — the rendering fence is three tildes, or one more than the longest tilde run in the block, whichever is longer — fills the rendering-layout degree of freedom — a fence must never close inside the quoted text.
- Task 03 — a `words` line is printed only for a well-formed document with no failure — fills the spec's silence on counts for a failing document — an after count exists only when the landing can be computed.
- Task 03 — an extra or repeated argument, and `--landed` on a target with no `create` or `edit`, are usage errors exiting 2 — fills the command-line-shape degree of freedom — they are mistakes in the invocation, not in the delta.
- Task 03 — `landedView` returns `null` for a failed edit, a case `--landed` never reaches because any failure exits 1 first — fills the internal-structure degree of freedom — the export stays total for an importer.
- Task 04 — `apply-delta.mjs` treats an extra argument as a usage error exiting 2 and prints a failed check's report to stdout — fills the command-line-shape degree of freedom — it matches `check-delta.mjs`.
- Task 05 — the `spec` check step restates the script's exit codes and its `malformed:` / `conflict:` lines, and says a failure is repaired in the same run rather than queued — fills the brief's silence on how much of the script's contract the body carries — the drafter acts on those lines directly.
- Task 06 — the `review-spec` check-3 clause that a document's path mirrors its target's path was removed — fills the brief's silence on that clause — the path is the target, and the script's existence checks cover it.
- Task 06 — check 3 states that the script writes nothing, so running it keeps the review read-only — fills the brief's silence — the review's read-only posture depends on it.
- Task 07 — `close-thread` check 4 copies the `spec` body's wording for exit codes and failure lines — fills the brief's silence on wording — the three bodies describe `check-delta.mjs` alike.
- Task 07 — the `supersedes` bullet of check 4 opens "Beyond the script, a `create` under…" — fills the brief's silence on how the body-level check joins the script's — it marks what the script does not check.
- Task 07 — "Re-invocation after either block" became "after any block" — fills the brief's silence — `## Blocked` now names three blocks.
- Task 07 — Writes step 1 routes a landing failure to its own `## Blocked` paragraph, ending `BLOCKED` with the script's report and no bundle — fills the spec's inference that a landing failure is an operational defect — the paragraph gives the route a place to be named.

## Changes

- 01 Rewrite the delta-document format — 9e364e8 feat: describe delta documents as literal files and Edit-model JSON — judgment call
- 02 Build the check-delta core — f5f24de feat: add check-delta.mjs to validate a thread's delta without writing — judgment call
- 03 Add check-delta's rendering, word counts and landed view — 38deca1 feat: render edits, count agents-file words and print the landed view in check-delta.mjs — judgment call
- 04 Add apply-delta and distribute the scripts — 784c839 feat: add apply-delta.mjs and ship the delta scripts as shared references — judgment call
- 05 Update the spec body — 8a87e81 feat(spec): draft delta documents as literal files and Edit-model JSON, checked by check-delta.mjs — judgment call
- 06 Update the review-spec body — 0d9db84 feat(review-spec): judge delta mechanics through check-delta.mjs and its old/new rendering — judgment call
- 07 Update the close-thread body and run the whole-change checks — baf4007 feat(close-thread): dry-run, count, read and land the delta through check-delta.mjs and apply-delta.mjs — judgment call

## Verification

- `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` from `suite/` — both exit 0.
- A fresh `node scripts/sync-shared-references.mjs` — leaves no diff; `apply-delta.mjs` sits only under `close-thread`'s `references/scripts/`, and `check-delta.mjs` under `spec`, `review-spec` and `close-thread`.
- `git diff bd46752 -- cli` — empty.
- A grep of every skill body and shared reference for a delta `hash`, `add`/`replace`/`remove` operation sections and `under`/`after`/`end` anchors — finds none.
- End-to-end run on a scratch fixture outside the repository — `check-delta.mjs` run through a symlink reported a clean `create`/`edit`/`delete` delta with its old/new rendering and `words AGENTS.md: 3 -> 5`, and `--landed AGENTS.md` printed the landed file; `apply-delta.mjs` landed it, applying a `replace_all` edit and an ordered addition; a re-check reported the edits already done and the `create` and `delete` as conflicts; unparsable JSON, an unknown key and an unmirrored path were reported malformed in the same run.
- Running either script against this thread — deliberately skipped: the thread's own delta is in the Markdown format the installed `close-thread` reads, and the plan forbids it.

## Acceptance

| Criterion | Method | Evidence |
| --- | --- | --- |
| `suite/shared/references/formats/delta-document.md` describes a `create` as the literal target file at its mirrored path, and an `edit` or `delete` as a JSON document at the mirrored path plus `.json`, and describes no Markdown operation sections, anchors or hash. | code review | Read `suite/shared/references/formats/delta-document.md`: `## Shape` and `## Rules` describe the literal `create` and the `.json` edit and delete; the vocabulary grep finds no operation section, anchor or hash. |
| A `create` delta document for a decision record has exactly one frontmatter block, the record's own. | code review | `delta-document.md` rules: a `create` has "no wrapper and no frontmatter of its own" and a decision record "carries only the record's own frontmatter". |
| `check-delta.mjs` and `apply-delta.mjs` exist under `suite/shared/references/scripts/` and import only `node:` built-ins and, for `apply-delta.mjs`, `./check-delta.mjs`. | code review | Both files exist; their `import` lines name only `node:fs`, `node:path`, `node:url`, and `./check-delta.mjs` in `apply-delta.mjs`. |
| Running `check-delta.mjs` directly through a symlinked path produces its report rather than exiting silently. | manual check | The fixture run invoked the script through a symlink and printed the full report. |
| `check-delta.mjs` writes no file under any input. | code review | `check-delta.mjs` imports only `readFileSync`, `readdirSync`, `realpathSync` and `statSync` from `node:fs`; the task's checksum comparison of the fixture before and after a run was empty. |
| `check-delta.mjs` exits non-zero and names the edit when an `old_string` occurs more than once without `replace_all`. | manual check | Fixture check of the core: exit 1 with a `conflict:` line naming the document and `edit <N>`. |
| `check-delta.mjs` exits non-zero and names the edit when an `old_string` does not occur and its `new_string` does not occur either. | manual check | Fixture check of the core: exit 1 with a `conflict:` line naming the document and `edit <N>`. |
| `check-delta.mjs` reports an edit whose `old_string` is absent and whose `new_string` is present as already done, not as a failure. | manual check | The fixture re-check after landing reported the `replace_all` edit `already done` with no failure line for it. |
| `check-delta.mjs` reports an addition already in the target, whose `new_string` occurs and every occurrence of whose `old_string` lies inside an occurrence of `new_string`, as already done, and the landing does not apply it again. | manual check | The fixture re-check reported both landed additions `already done`; the core's fixture check confirmed the landed content holds the addition once. |
| `check-delta.mjs` reports a `create` whose target exists, and an `edit` or `delete` whose target does not exist, as conflicts. | manual check | The fixture re-check printed `conflict:` for the `create` whose target existed and the `delete` whose target was gone; the core's fixture check covered an `edit` with a missing target. |
| `check-delta.mjs` reports unparsable JSON, a missing, unknown or mistyped key, an unmirrored path, and two documents for one target as malformed. | manual check | The fixture run printed `malformed:` for unparsable JSON, an unknown key and an unmirrored path; the core's fixture check covered a missing key, a mistyped key and two documents for one target. |
| `check-delta.mjs` reports every failure in the delta in one run, each with its kind. | manual check | One fixture run printed five failures across four documents, each opening `malformed:` or `conflict:`. |
| `check-delta.mjs` renders each edit as an old/new pair of literal text blocks. | manual check | The fixture report showed each edit as a `~~~ old` block and a `~~~ new` block with literal text. |
| `check-delta.mjs` reports before and after word counts, as `wc -w` counts them, for every `AGENTS.md` or `CLAUDE.md` target. | manual check | The fixture report printed `words AGENTS.md: 3 -> 5`, matching `wc -w` on the file before and after; the task's fixture check also covered a `create` (0 before) and a `delete` (0 after). |
| `check-delta.mjs` can print a target as it will stand after landing. | manual check | `--landed AGENTS.md` on the fixture printed the landed file alone. |
| Edits apply in order, each against the result of the previous edit, and a `replace_all` edit replaces every occurrence. | manual check | The fixture glossary landed as `one`, `added`, `TWO`, `TWO`: both occurrences replaced, then the second edit applied to the result. |
| `apply-delta.mjs` writes nothing when any delta document of the thread fails the check. | manual check | The task's fixture check with one failing document exited 1 and left every target's checksum unchanged. |
| `apply-delta.mjs` writes every `create`, writes every edited target, and removes every deleted target when the whole delta passes. | manual check | The fixture landing printed `wrote` for the `create` and both edits and `removed` for the delete, and the files on disk matched. |
| `suite/shared/manifest.yaml` declares `scripts/check-delta.mjs` for `spec`, `review-spec` and `close-thread`, and `scripts/apply-delta.mjs` for `close-thread` only. | code review | `suite/shared/manifest.yaml` carries `scripts/check-delta.mjs` in three skill entries and `scripts/apply-delta.mjs` in `close-thread`'s alone. |
| After the sync, `apply-delta.mjs` exists under `close-thread`'s `references/scripts/` and under no other skill's `references/`. | manual check | After a fresh sync, a listing of every skill's `references/scripts/` shows `apply-delta.mjs` under `close-thread` only. |
| The `spec` body drafts a `create` literally at the mirrored path and an `edit` or `delete` as JSON at the mirrored path plus `.json`, and records no hash. | code review | Read `suite/skills/spec/spec/SKILL.md`'s drafting section; the vocabulary grep finds no hash. |
| The `spec` body runs `check-delta.mjs` on the written delta and repairs every failure before appending its `event` line. | code review | `suite/skills/spec/spec/SKILL.md` procedure step 6, "Check the delta.", runs the script and repairs before the `event` line. |
| The `spec` amendment pass re-reads an edited target and re-quotes moved `old_string` text, and records no hash. | code review | `## Amendment pass` reads the target again before amending an `edit` or `delete` and re-quotes every moved `old_string`. |
| The `review-spec` body runs `check-delta.mjs` and turns every reported failure into a finding. | code review | `suite/skills/review/review-spec/SKILL.md` check 3 runs the script and files each failure as a `delta` finding. |
| The `close-thread` dry run uses `check-delta.mjs`, sending conflicts to `## Blocked` and malformed documents to `## Refusals`. | code review | `suite/skills/close/close-thread/SKILL.md` check 4 and its `## Blocked` and `## Refusals` entries. |
| The `close-thread` agents-file budget uses the word counts `check-delta.mjs` reports. | code review | `close-thread` check 5 reads the `words` lines of the script's report. |
| The `close-thread` passage check reads changed agents-file passages from the landed view `check-delta.mjs` prints. | code review | `close-thread` check 6 runs `check-delta.mjs` with `--landed`. |
| The `close-thread` landing runs `apply-delta.mjs`. | code review | `close-thread` Writes step 1 runs `apply-delta.mjs`. |
| No skill body or shared reference mentions a delta document's `hash`, an `add`/`replace`/`remove` operation section, or an `under`/`after`/`end` anchor. | manual check | The whole-change vocabulary grep over every skill body and shared reference finds none; "anchor" appears only in `review-code` and `review-implementation`, unrelated to delta documents. |
| `formats/thread.md` and `formats/spec.md` show edit delta paths with the `.json` suffix. | code review | `formats/thread.md` shows `delta/docs/glossary.md.json` and `delta/AGENTS.md.json`; `formats/spec.md` lists `delta/docs/glossary.md.json` — edit. |
| `suite/authoring/shared-references.md` names scripts as a kind of shared reference. | code review | Its `**Scripts** (`scripts/`)` paragraph names them as dependency-free Node programs mirrored like the other kinds. |
| `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` pass from `suite/`, and a fresh `node scripts/sync-shared-references.mjs` leaves no diff. | manual check | Run against the final state: both exit 0 and the sync leaves `git status` clean. |
| Nothing under `cli/` changes. | manual check | `git diff bd46752 -- cli` is empty. |

## Remaining concerns

- Normalization strips trailing spaces at the end of an `old_string` with no closing line end, so `"a "` matches the `a` of `ab` mid-line. This follows the plan's normalization rule and the splice stays byte-safe; a stricter rule would strip only before a line end.
- A target with lone-`\r` line ends gets `\n` from an edit, mixing its line ends. This follows the plan's rule for targets with no CRLF.
- When a match spans a line end, trailing spaces or tabs just before that line end are replaced along with the match; bytes outside a match, and CRLF line ends, are kept.
- A malformed document reports `before: null` even when its target exists, since its target is never read.
- Listing `delta/` follows symlinked directories, so a symlink loop would recurse without bound.
- A target that is a directory is reported as a conflict naming it "not a readable file", a case the plan does not cover; `close-thread` check 4 lists four conflict cases, though its "every `conflict:` line stops the close" covers this one.
- An I/O error partway through `apply-delta.mjs`'s landing leaves a partial landing and an uncaught stack trace with an exit code outside 0/1/2; catching around the landing and exiting 1 with the lines written so far would harden it.
- `apply-delta.mjs` writes the `landed` strings `check-delta.mjs` computes; a change to that export's shape would break landing with no check catching it.
- `apply-delta.mjs` prints `wrote` for an edit document whose edits are all already done, so a close records the target as landed when no bytes changed.
- The `spec` check step repairs only documents the run wrote or amended, then loops until exit 0. On an amendment run, a document the run may not touch can fail once its target moves, and exit 2 has no route, so the loop has no exit. The wording is the plan's; a corrected plan would send either case through `## Blocked`.
- The `spec` blocked path writes a partial spec and appends its `event` line without naming the delta check; the check step, placed before every `event` line, is read as covering it.
- The `review-spec` Inputs say each `delete` is read through the old/new rendering, though a delete carries no old/new strings; the wording is the plan's.
- `close-thread` check 5 relies on a `words` line for every agents-file target, including a `CLAUDE.md` symlink; the symlink case was not exercised on a fixture.
- The plan's fixture commands use `echo '…\n…'`, which zsh expands into real newlines; they were run under bash.

## Follow-ups

- Close this thread with the `close-thread` that reads the Markdown delta format, before reinstalling the suite: the new `close-thread` would refuse this thread's delta as malformed.
