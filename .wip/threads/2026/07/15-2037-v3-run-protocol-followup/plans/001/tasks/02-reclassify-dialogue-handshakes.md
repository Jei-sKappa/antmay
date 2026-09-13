# Task 2: Reclassify the thread handshakes as dialogue-driven

**Objective:** Make `open-thread` and `archive-thread` explicitly dialogue-driven so their required questions and confirmations no longer conflict with completion-oriented behavior.

**Input / context:** `docs/threads/260715094144Z-v3-workflow-fixes/implementation/discussions/260715200148Z-implementation-review-findings-decision-log.md P1` classifies both skills as dialogue-driven handshakes. Start from the canonical posture text produced by Task 1. Preserve each skill's existing write authority and user-confirmation purpose.

**Steps:**

1. In `skills/workflow/capture-discussion/open-thread/SKILL.md`, replace the statement that the operation is completion-oriented with an explicit dialogue-driven handshake description.
2. Preserve the workflow-selection question, the one-round field confirmation before `/allocate-thread`, and the request for pasted ticket context when passive read access is unavailable; clarify that these questions are normal execution, not blocked completion paths.
3. Remove the `Outcome: DONE` terminal line requirement from `open-thread`; keep the successful response focused on the created thread path without introducing any alternate run-status token.
4. In `skills/workflow/finish-navigate/archive-thread/SKILL.md`, state that target disambiguation, unfinished-workspace confirmation, and the abandonment-record suggestion are normal dialogue-driven handshake behavior.
5. Remove the `Outcome: DONE` terminal line requirement from `archive-thread`; keep the successful response focused on the new archive path and the accepted reference-breakage warning.
6. Preserve the single authorized `/allocate-thread` call in `open-thread` and the single confirmed move in `archive-thread`; do not broaden either skill's side effects.
7. Bump `open-thread` from `2.1.0` to `2.2.0` and `archive-thread` from `2.1.0` to `2.2.0`.
8. Read both files end to end to confirm no completion-oriented refusal/blocking language was accidentally applied to their normal questions.

**Files modified:**

- `skills/workflow/capture-discussion/open-thread/SKILL.md`
- `skills/workflow/finish-navigate/archive-thread/SKILL.md`

**Verification:** Run `rg -n "completion-oriented|Outcome:" skills/workflow/capture-discussion/open-thread/SKILL.md skills/workflow/finish-navigate/archive-thread/SKILL.md` and confirm it returns no matches. Run `rg -n "dialogue-driven|ask|ASK|confirmation|confirm" skills/workflow/capture-discussion/open-thread/SKILL.md skills/workflow/finish-navigate/archive-thread/SKILL.md` and confirm each skill still carries its required handshake points. Run `rg -n "version: 2\.2\.0" skills/workflow/capture-discussion/open-thread/SKILL.md skills/workflow/finish-navigate/archive-thread/SKILL.md` and confirm one match per file.

**Acceptance criteria:**

- Both skills identify themselves as dialogue-driven handshakes.
- Their ordinary user questions and confirmation steps remain intact.
- Neither skill emits a completion-run `Outcome:` line.
- `open-thread` still delegates exactly one normalized creation to `/allocate-thread`.
- `archive-thread` still performs one user-authorized move and preserves the existing advisory checks.
- Both skill versions are `2.2.0`.

**Consumes:** Canonical run-protocol baseline — the preflight/refusal, in-run blocking, terminal-outcome, interaction-posture, and internal-progress rules in `docs/project/v3/skill-authoring.md`, `docs/project/v3/thread-model.md`, and the Quick, Standard, and Roadmap workflow documents.

**Produces:** Dialogue-handshake exclusions — the dialogue-driven, no-`Outcome:` contracts in `skills/workflow/capture-discussion/open-thread/SKILL.md` and `skills/workflow/finish-navigate/archive-thread/SKILL.md`.
