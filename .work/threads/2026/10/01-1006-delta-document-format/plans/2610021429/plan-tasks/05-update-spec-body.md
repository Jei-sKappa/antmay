### Task 5: Update the spec body

**Objective:** Make `spec` draft delta documents in the new format, record no hash, and check what it wrote with `check-delta.mjs`, repairing every failure in its own draft before it appends its `event` line.

**Input / context:**
- Requirements: `spec.md`, `### spec`.
- Format: `suite/shared/references/formats/delta-document.md` (Task 1).
- Command: `node <skill_path>/references/scripts/check-delta.mjs <thread root>`, mirrored into this skill by Task 4. It prints a report, and exits 0 on a clean delta, 1 on any failure, and 2 on a usage error. Each failure line starts `malformed:` or `conflict:` and names the document and, where it applies, `edit <N>`.
- `spec` repairs a failure in its own draft within the same run and does not queue it. Two typical repairs: add surrounding context to an `old_string` that occurs more than once, and re-quote an `old_string` whose text moved.
- The check runs after writing and before the log line. That applies to authoring and to amendment alike, because both append an `event` line.
- Body conventions: `suite/authoring/body-structure.md`. A pointer into the skill's own files carries the `<skill_path>/` prefix and is never preceded by `per`.
- Documentation rule (Global Constraints): describe the format as the only one, with no before/after wording.
- File to edit: `suite/skills/spec/spec/SKILL.md`. The line numbers below are as of this plan; locate each passage by its text.

**Steps:**
1. `## Inputs`, the bullet "The target file of each `edit` and `delete` delta document…" (line 28): rewrite it so that the target is read at drafting time for the exact text each `old_string` quotes. Drop the clause about the blob hash.
2. `## Draft the delta documents`, first paragraph (line 56): change "one delta document, or one operation within one," to "one delta document, or one edit within one,".
3. Same section, the glossary bullet (line 59): an `edit` is written at `delta/docs/glossary.md.json`, and a `create`, when the file is absent, at `delta/docs/glossary.md`.
4. Same section, the agents-file bullet (line 60): an `edit` or `delete` is written at the agents file's mirrored path plus `.json` (for example `delta/AGENTS.md.json`), and a `create` at the mirrored path itself (for example `delta/AGENTS.md`).
5. Same section, the paragraph "Every delta document follows…" (line 63). Rewrite it to say:
   - every delta document follows the `<skill_path>/references/formats/delta-document.md` format;
   - a `create` is written literally at the mirrored path;
   - an `edit` or `delete` is written as JSON at the mirrored path plus `.json`;
   - for an `edit` or `delete`, the target is read at drafting time, which is what lets each `old_string` quote its existing text exactly and uniquely;
   - a `create` targets a file that does not exist, so there is nothing to read.

   Mention no hash.
6. `## Audit pass` (line 87): change "has its delta document, or its operation within one," to "has its delta document, or its edit within one,".
7. `## Amendment pass` (line 99): replace the sentence about re-recording the hash with this. Before amending an `edit` or `delete`, read its target again, and re-quote every `old_string` whose exact text moved. Nothing re-records a hash, and the sentence does not mention one.
8. `## Procedure`: insert a new step between step 5 (**Write the artifacts.**) and step 6 (**Append the log line.**), and renumber the steps after it:
   - Title it **Check the delta.**
   - When the thread holds a `delta/`, run `node <skill_path>/references/scripts/check-delta.mjs <thread root>` from the project root.
   - Repair every failure it reports in the delta documents this run wrote or amended, then run it again until it exits 0. Typical repairs: extend a non-unique `old_string` with neighboring text, or re-quote text that moved.
   - Only then append the `event` line.
   - Update every in-body reference to the renumbered steps (for example "`## Procedure` step 1" stays correct; check the others).
9. Read the whole body once more for any other mention of a hash, `add` / `replace` / `remove` operations, or anchors, and rewrite each one in the new format's terms.

**Files modified:**
- `suite/skills/spec/spec/SKILL.md`

**Verification** (from `suite/`):
- `grep -n -i -E 'hash|anchor|## add|## replace|## remove|under:|after:|operation within' skills/spec/spec/SKILL.md` prints nothing.
- `grep -n -F 'delta/docs/glossary.md.json' skills/spec/spec/SKILL.md` and `grep -n -F 'delta/AGENTS.md.json' skills/spec/spec/SKILL.md` each print at least one line.
- `grep -n -F '<skill_path>/references/scripts/check-delta.mjs' skills/spec/spec/SKILL.md` prints the new procedure step.
- `grep -n -E '^[0-9]+\. \*\*' skills/spec/spec/SKILL.md` lists the procedure steps numbered 1–8 with no gap, with **Check the delta.** directly before **Append the log line.**
- `test -f skills/spec/spec/references/scripts/check-delta.mjs` succeeds.
- `node scripts/check-skill-text.mjs` exits 0, and `node scripts/check-marketplace-skills.mjs` exits 0.

**Acceptance criteria:**
- The `spec` body drafts a `create` literally at the mirrored path and an `edit` or `delete` as JSON at the mirrored path plus `.json`, and records no hash.
- The `spec` body runs `check-delta.mjs` on the written delta and repairs every failure before appending its `event` line.
- The `spec` amendment pass re-reads an edited target and re-quotes moved `old_string` text, and records no hash.
- The glossary and agents-file examples name `delta/docs/glossary.md.json` and `delta/AGENTS.md.json` for edits.

**Consumes:**
- `suite/skills/spec/spec/references/scripts/check-delta.mjs` (Task 4's sync), invoked as `node <skill_path>/references/scripts/check-delta.mjs <thread root>`.
- The format's path forms (Task 1).

**Produces:** none
