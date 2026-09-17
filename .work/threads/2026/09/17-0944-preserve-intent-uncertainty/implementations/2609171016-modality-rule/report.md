# Implementation report

Plan: none — the input was this thread's discussion outcome, carried in the invocation prompt.

## What was delivered

The modality rule from this thread's discussion (issue #74) is now in `open-thread`:

- `suite/skills/capture-discussion/open-thread/SKILL.md` — the composed-intent bullet now carries, immediately after the impersonal-rewrite instruction: the rewrite changes voice, not certainty; what the invocation supplied tentatively stays tentative, restated as tentativeness in impersonal words ("is an option under consideration", "is a possible approach", phrasings like these rather than fixed wording); a question or an alternative the user mentioned is never restated as a settled direction.
- No worked example was kept. The run initially added `references/rewrite-modality.md` (three illustrative before/after pairs) with a pointer to it from the bullet; on reviewing the staged changes, the user judged it overkill and removed both the file and the pointer. The body rule stands alone, which the authoring conventions permit — an example is optional, the rule is not.

Shared references were untouched — the composed-intent rules live only in this skill's body, and `create-thread.md` carries the write mechanics, not the composition rules.

## Progress record

Task 1 — modality rule in the open-thread body
Changes made: added the voice-not-certainty rule to the composed-intent bullet, form B with the sample phrasings marked illustrative.
Verification: re-read the bullet against the discussion's settled points — form B, illustrative phrasings, question and alternative class covered; house style matched (straight quotes, em dashes).
Concerns: the rule's exact wording was an inference held back at closure (non-binding); this draft is the implementer's.
Commit: none — run suppressed by instruction.
Next action: ready for next task.

Task 2 — worked example under references/ (added, then removed by the user)
Changes made: wrote `references/rewrite-modality.md` with three illustrative before/after pairs and pointed at it from the rewrite step; the user then deleted the file and the pointer in their post-run review as overkill. Nothing of it remains.
Verification: file and pointer confirmed absent from the final state.
Concerns: none.
Commit: none — run suppressed by instruction.
Next action: ready for next task.

Task 3 — standing text gates, re-run on the final state
Changes made: none.
Verification: after the user's edit, `node scripts/check-skill-text.mjs` — OK (113 files, no bare reference, no per-before-path, no indented fence); `node scripts/check-marketplace-skills.mjs` — OK (18 skills, manifest in agreement).
Concerns: none.
Commit: none — run suppressed by instruction.
Next action: ready for review.

## Deviations

None. The change stays within the discussion's settled points; no thread ADR or spec decision exists to contradict. The example's removal was the user's own post-run edit, not a run decision, and is recorded above rather than as a deviation.

## Remaining concerns

- The change is prose in a skill body; its effectiveness is verified by reading, not by a mechanical check — the suite has no test that exercises a composed intent.
- If the same modality-strengthening failure is ever observed in another composing skill (for example `spec`), the rule should be hoisted to a shared reference then; the discussion settled to confine it to `open-thread` for now.

## Follow-ups

None surfaced at parent or sibling level.
