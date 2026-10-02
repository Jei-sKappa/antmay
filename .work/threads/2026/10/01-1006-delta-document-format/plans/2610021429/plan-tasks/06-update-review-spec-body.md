### Task 6: Update the review-spec body

**Objective:** Make `review-spec`'s well-formedness check run `check-delta.mjs` and turn every failure it reports into a finding, keep the judgments the script cannot make with the reviewer, and have edits read through the script's old/new rendering.

**Input / context:**
- Requirements: `spec.md`, `### review-spec`.
- Format: `suite/shared/references/formats/delta-document.md` (Task 1).
- Command: `node <skill_path>/references/scripts/check-delta.mjs <thread root>`, mirrored into this skill by Task 4. It writes nothing, so running it keeps the review strictly read-only. Its report shows each edit as a tilde-fenced `old` / `new` pair of literal blocks. Each failure is a line starting `malformed:` or `conflict:`, naming the delta document and, where it applies, `edit <N>`.
- `check-delta.mjs` checks delta mechanics only. Three judgments stay with the reviewer:
  - one document per target;
  - each `create` against its kind's format;
  - literal edits rather than instructions.
- Body conventions: `suite/authoring/body-structure.md`. The `<skill_path>/` prefix is required on every `references/` path, with no `per` before it.
- Documentation rule (Global Constraints): no before/after wording.
- File to edit: `suite/skills/review/review-spec/SKILL.md`. The line numbers below are as of this plan; locate each passage by its text.

**Steps:**
1. `## Inputs`, the `delta/` bullet (line 25): keep the shapes it names. Add that each `edit` and `delete` is read through the old/new rendering `check-delta.mjs` prints for it, rather than as escaped JSON strings.
2. The spec checks, item 3 **Every delta document is well-formed.** (line 66). Replace its body with:
   - Run `node <skill_path>/references/scripts/check-delta.mjs <thread root>` from the project root.
   - Every failure it reports is a finding, under the `delta` category, with the delta document's path as the finding's target. Its message (malformed or conflict, and the edit position where one is named) is the evidence.
   - Beyond the script, the reviewer checks three things: the thread holds one document per target; each `create` conforms to its kind's format (a decision record carries only its own frontmatter); and every edit is literal text rather than an instruction to make a change.
   - Mention no `hash`, no `add` / `replace` / `remove`, and no anchor.
3. Item 5 (line 70): change "has its delta document, or its operation within one," to "has its delta document, or its edit within one,".
4. Read the whole body once more for any other mention of a hash, operation sections or anchors, and rewrite each one in the new format's terms. The `## Write boundary`-style sentence stating what the review never writes stays as it is.

**Files modified:**
- `suite/skills/review/review-spec/SKILL.md`

**Verification** (from `suite/`):
- ``grep -n -i -E 'hash|anchor|## add|## replace|## remove|under:|after:|operation within|`add`|`replace`|`remove`' skills/review/review-spec/SKILL.md`` prints nothing.
- `grep -n -F '<skill_path>/references/scripts/check-delta.mjs' skills/review/review-spec/SKILL.md` prints at least one line, inside check 3.
- `grep -n -i 'rendering' skills/review/review-spec/SKILL.md` prints at least one line.
- `test -f skills/review/review-spec/references/scripts/check-delta.mjs && test ! -e skills/review/review-spec/references/scripts/apply-delta.mjs` succeeds.
- `node scripts/check-skill-text.mjs` exits 0, and `node scripts/check-marketplace-skills.mjs` exits 0.

**Acceptance criteria:**
- The `review-spec` body runs `check-delta.mjs` and turns every reported failure into a finding.
- Check 3 leaves one document per target, each `create` against its kind's format, and literal edits rather than instructions with the reviewer.
- The `review-spec` body has edits read through the script's old/new rendering.

**Consumes:**
- `suite/skills/review/review-spec/references/scripts/check-delta.mjs` (Task 4's sync), invoked as `node <skill_path>/references/scripts/check-delta.mjs <thread root>`.
- Its report shape (Tasks 2–3).

**Produces:** none
