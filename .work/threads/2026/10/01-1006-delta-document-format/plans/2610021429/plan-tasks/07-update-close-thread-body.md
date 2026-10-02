### Task 7: Update the close-thread body and run the whole-change checks

**Objective:** Make `close-thread` dry-run, count, read and land the delta through the two scripts, sending conflicts to `## Blocked` and malformed documents to `## Refusals`. Then confirm the whole change: no shipped text names the old format, the gates pass, the sync is clean, and `cli/` is untouched.

**Input / context:**
- Requirements: `spec.md`, `### close-thread`, plus the whole-change lines of `## Acceptance`.
- Format: `suite/shared/references/formats/delta-document.md` (Task 1).
- Commands, mirrored into this skill by Task 4 and run from the project root:
  - `node <skill_path>/references/scripts/check-delta.mjs <thread root>`. It writes nothing, and exits 0 when clean, 1 on any failure, 2 on a usage error. Failure lines start `malformed:` or `conflict:` and name the document and, where it applies, `edit <N>`. For each agents-file target with no failure it reports `words <target>: <before> -> <after>`.
  - `node <skill_path>/references/scripts/check-delta.mjs <thread root> --landed <target path>`. It prints a created or edited target as it will stand after landing.
  - `node <skill_path>/references/scripts/apply-delta.mjs <thread root>`. It re-runs the whole check, writes nothing on any failure (exit 1, with the same report), and otherwise lands every document and prints `wrote <target>` / `removed <target>` (exit 0).
- Out of scope and unchanged: the currency check, the thread-reference search, the roadmap reference, the workspaces check, and the supersede move (Writes step 2).
- Within check 4, two things stay as the body performs them today: resolving `supersedes` stems, and classifying contradictions with project records through `/consult-decisions`.
- A failure of `apply-delta.mjs` after the checks passed is an operational defect of the run. The run stops `BLOCKED`, with the script's report as the diagnosis and no bundle, because nothing has been written.
- Body conventions: `suite/authoring/body-structure.md` and `suite/authoring/interaction-posture.md`, which covers an operational-defect `BLOCKED`. The `<skill_path>/` prefix is required, with no `per` before it.
- Documentation rule (Global Constraints): no before/after wording.
- File to edit: `suite/skills/close/close-thread/SKILL.md`. The line numbers below are as of this plan; locate each passage by its text.

**Steps:**
1. `## Inputs`:
   - Delete the bullet "For every `edit` and `delete` delta document, its target file and that file's current blob hash…" (line 28).
   - In the `delta/` bullet (line 27), add one clause: the scripts named under the checks read every target themselves.
2. Check 4 **Delta dry run** (lines 49–56). Rewrite it:
   - Run `node <skill_path>/references/scripts/check-delta.mjs <thread root>`, which decides without writing whether every delta document lands against the project layer as it stands.
   - Every `conflict:` line it reports stops the close for that file and goes to `## Blocked`, naming the document and the mismatch. A conflict is one of four cases:
     - a `create` whose target exists;
     - an `edit` or `delete` whose target is missing;
     - an edit that is not already done whose `old_string` does not occur;
     - an edit that is not already done whose `old_string` occurs more than once without `replace_all`.
   - Every `malformed:` line is a refusal, per `## Refusals`.
   - Keep, unchanged in substance, the bullet on a `create` under `delta/docs/adr/` or `delta/docs/pdr/` naming `supersedes`: every stem must resolve, and a contradiction is classified as `/consult-decisions` instructs. An unresolved stem or an unnoticed conflict still goes to `## Blocked`.
3. Check 5 **Agents-file budget** (lines 58–65). Rewrite the counting:
   - Before and after counts are the `words <target>: <before> -> <after>` lines of the check-4 report, which count as `wc -w` does.
   - A `create` counts zero before, and a `delete` counts zero after and is never over budget.
   - Keep the rule that a symlinked `CLAUDE.md` is counted once, with the file it links to.
   - Keep the refusal threshold sentence unchanged: over 1,000 and greater than before.
   - Delete every heredoc and per-block counting instruction.
4. Check 6 **Agents-file passages** (lines 67–77). Replace the sentence about how passages "will stand once the landing applies" with this:
   - Read each changed agents file as it will stand after landing from `node <skill_path>/references/scripts/check-delta.mjs <thread root> --landed <agents file>`.
   - Search and judge the matching passages in that output, including the text the delta adds.
   - An agents file the delta deletes has no passages to judge.
   - Keep the rest of the check (the change list, the `grep -n -F` search, the judgment, the refusal) as it is.
5. `## Blocked`, first paragraph (line 83). Replace "a recorded `hash` that no longer matches its target, an operation whose quoted text is not in the target, a `create` whose target already exists" with "a conflict `check-delta.mjs` reports". Keep the opening sentence that a malformed delta document is a refusal.
6. `## Blocked`: add a short paragraph stating that when `apply-delta.mjs` fails at Writes step 1 after every check passed, nothing has been written. The run stops without a bundle and follows `<skill_path>/references/instructions/emit-terminal-outcome.md` with `BLOCKED` and the script's report as the diagnosis.
7. `## Writes`, step 1 **Land each delta document.** (line 97). Rewrite it:
   - Run `node <skill_path>/references/scripts/apply-delta.mjs <thread root>`. It writes every `create`, creating the folders a target needs, writes every edited target, and removes every deleted target, all or nothing.
   - Its `wrote` / `removed` lines are the files step 5's report names.
   - On a non-zero exit, stop per `## Blocked` (the landing-failure paragraph from step 6).
   - Make sure step 4's `landed` value still follows: `landed` when step 1 wrote or removed at least one file, `none` otherwise.
8. `## Refusals`:
   - Replace the four bullets on frontmatter, `type`, `hash` and the non-literal operation (lines 111–115) with one bullet: a delta document `check-delta.mjs` reports as malformed, naming each `malformed:` line. Re-invoke once `spec` has redrafted the document.
   - Fold the existing "path does not mirror a project-layer path" bullet into that one bullet, because the script reports it as malformed.
   - Keep the `superseded/` stem, budget, passage and prior-closure bullets.
9. `## Write boundary`: leave it unchanged. `apply-delta.mjs` writes only delta targets, which the boundary already lists.
10. Read the whole body once more for any other mention of a hash, `add` / `replace` / `remove` operations, anchors or heredoc counts, and rewrite each one in the new format's terms.
11. Run the whole-change checks below.

**Files modified:**
- `suite/skills/close/close-thread/SKILL.md`

**Verification** (from `suite/`):
- ``grep -n -i -E 'hash|anchor|heredoc|## add|## replace|## remove|under:|after:|`add`|`replace`|`remove`' skills/close/close-thread/SKILL.md`` prints nothing.
- `grep -n -F '<skill_path>/references/scripts/check-delta.mjs' skills/close/close-thread/SKILL.md` prints lines in checks 4, 5 (or the check-4 report it cites) and 6.
- `grep -n -F -- '--landed' skills/close/close-thread/SKILL.md` prints a line in check 6.
- `grep -n -F '<skill_path>/references/scripts/apply-delta.mjs' skills/close/close-thread/SKILL.md` prints a line in Writes step 1.
- Whole change, no old-format vocabulary in any skill body or shared reference:
  - ``grep -rn -i -E 'hash|## add|## replace|## remove|under:|after:|`add`|`replace`|`remove`' skills shared/references`` prints nothing;
  - `grep -rl -i 'anchor' skills/*/*/SKILL.md shared/references` prints only `skills/review/review-code/SKILL.md` and `skills/review/review-implementation/SKILL.md`, whose "authority anchor" is unrelated.
- `node scripts/check-skill-text.mjs` exits 0, and `node scripts/check-marketplace-skills.mjs` exits 0.
- Fresh sync leaves no diff:
  - `find skills -path '*/references/*' -type f | sort | xargs shasum > /tmp/refs-before`
  - `node scripts/sync-shared-references.mjs`
  - `find skills -path '*/references/*' -type f | sort | xargs shasum | diff /tmp/refs-before -` prints nothing.
- CLI untouched: `B=$(git log --diff-filter=A --format=%H -- ../.work/threads/2026/10/01-1006-delta-document-format/seed.md | tail -n 1); git diff --stat "$B" -- ../cli; git status --porcelain -- ../cli` prints nothing.

**Acceptance criteria:**
- The `close-thread` dry run uses `check-delta.mjs`, sending conflicts to `## Blocked` and malformed documents to `## Refusals`.
- The `close-thread` agents-file budget uses the word counts `check-delta.mjs` reports.
- The `close-thread` passage check reads changed agents-file passages from the landed view `check-delta.mjs` prints.
- The `close-thread` landing runs `apply-delta.mjs`.
- No skill body or shared reference mentions a delta document's `hash`, an `add`/`replace`/`remove` operation section, or an `under`/`after`/`end` anchor.
- `node scripts/check-skill-text.mjs` and `node scripts/check-marketplace-skills.mjs` pass from `suite/`, and a fresh `node scripts/sync-shared-references.mjs` leaves no diff.
- Nothing under `cli/` changes.
- A failure of `apply-delta.mjs` after the checks passed ends the close `BLOCKED` with the script's report as the diagnosis, and writes no bundle.

**Consumes:**
- `suite/skills/close/close-thread/references/scripts/check-delta.mjs` and `suite/skills/close/close-thread/references/scripts/apply-delta.mjs` (Task 4's sync), with the command lines and report lines named under Input / context.
- Tasks 1–6's edits, for the whole-change checks.

**Produces:** none
