---
phase: 07-merge-finish-navigation-distribution
plan: 02
subsystem: skills
tags: [finish, whats-next, v1-workflow, anti-sycophancy, single-skill-exception, chat-first-advisory, opt-in-capture, no-history-rewrite]

# Dependency graph
requires:
  - phase: 01-foundations
    provides: V1 workflow canonical docs (thread-layout.md, filename-grammar.md, immutability.md, README.md) cited by both new skills
  - phase: 02-capture-discussion
    provides: skills/discussion/SKILL.md (4 anti-sycophancy markers carried verbatim into both new skills), skills/capture-inbox/SKILL.md (whats-next's optional opt-in output route)
  - phase: 05-implementation-family
    provides: skills/implement-plan-auto/SKILL.md + skills/implement-plan-interactive/SKILL.md (pattern source for finish's git-discipline language — NEVER --amend / NEVER rebase / NEVER force-push / NEVER rewrite history)
  - phase: 06-review-family
    provides: skills/review-spec-interactive/SKILL.md (pattern source for the 4-marker anti-sycophancy stance + stage-specific amplifier format reused in finish)
  - phase: 07-merge-finish-navigation-distribution (intra-phase)
    provides: skills/merge-artifacts-auto/SKILL.md + skills/merge-artifacts-interactive/SKILL.md (sequential serialization — Plan 07-02 depends on 07-01 for shared marketplace.json + .vscode/settings.json + README.md modifications)
provides:
  - skills/finish/SKILL.md (V1 single-skill closure — D97 exception to mode-variant convention; lightweight 4-item thread check; 4-option closure question with per-command confirmation; NEVER force-push, NEVER rewrite history; 4-marker anti-sycophancy stance + closure-stance amplifier)
  - skills/whats-next/SKILL.md (V1 advisory chat-first navigation skill; inspects thread context READ-ONLY; suggests 2-4 next actions in chat; NEVER writes an artifact by default; opt-in inbox capture only via capture-inbox; thin OK per D33; 4-marker anti-sycophancy stance with no stage-specific amplifier)
  - JeisKappa-workflow plugin grown 31 -> 33 (Phase 7 V1 plugin target REACHED)
  - .vscode conventionalCommits.scopes grown 38 -> 40 alphabetical (Phase 7 V1 scopes target REACHED)
  - README Available skills grown 38 -> 40 (entries inserted before Retired skills; existing verification-coverage note + the-fool delegation note + Retired entries + Plan 07-01 merge-artifacts-* entries preserved untouched)
affects: [07-03-readme-hybrid-redesign]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "V1 single-skill exception per D97 — finish is the ONLY V1 workflow skill WITHOUT -auto / -interactive siblings; explicit V1 EXCEPTION to the mode-variant convention because branch disposition is inherently user-directed (the closure question requires a human choice; no autonomous default would be safe across users / repos / branch contexts)"
    - "Chat-first advisory navigation — whats-next's primary output is a chat reply with 2-4 next-action suggestions; NEVER writes an artifact by default; opt-in inbox capture routed through capture-inbox only on EXPLICIT affirmative user consent"
    - "Closure-stance amplifier on finish — 'Branch operations are hard to undo — push back if the user picks an option that would lose work'; ties the 4-marker anti-sycophancy stance to the irreversibility of branch ops"
    - "No stage-specific amplifier on whats-next — the skill is advisory, not opinion-driven; the 4-marker stance is carried for V1 convention uniformity without an amplifier"
    - "Git-discipline language carried from Phase 5 implement-plan-* pair — NEVER --amend / NEVER rebase (any flavor) / NEVER push --force / NEVER push --force-with-lease / NEVER reset --hard against pushed history / NEVER filter-branch / NEVER filter-repo"
    - "Thin-body-OK rule per D33, NAV-03 — whats-next is allowed to be thin and to point the agent at the canonical README hybrid (forthcoming in Plan 07-03) for the full workflow map"

key-files:
  created:
    - skills/finish/SKILL.md
    - skills/whats-next/SKILL.md
  modified:
    - .claude-plugin/marketplace.json
    - .vscode/settings.json
    - README.md

key-decisions:
  - "finish enumerates the FOUR closure options by literal token (merge into main / merge into other branch / create PR / leave as is) — the exact phrasing the user can choose from MUST appear verbatim in the body so a downstream reader of this skill body can grep them out; the suggested chat presentation in `## Closure Question` shows the four labels side by side"
  - "finish documents the forbidden-constructs list for history-rewriting explicitly (--amend / rebase any flavor / push --force / --force-with-lease / reset --hard against pushed history / filter-branch / filter-repo) so the discipline survives partial readers — mirrors the Phase 5 implement-plan-* git-discipline pattern"
  - "whats-next's opt-in inbox capture routes through capture-inbox rather than inlining the capture logic — preserves the V1 single-responsibility convention (capture-inbox owns the inbox-item shape and folder routing; whats-next owns the advisory framing) and makes the opt-in path discoverable in chat"
  - "Both skills cite all four Phase 1 canonical docs by absolute path on first invocation, matching the Phase 6 review-* + Phase 7 merge-artifacts-* citation-first voice"
  - "Both skill bodies acknowledge the V1 single-skill exception (finish) and the V1 single advisory skill statement (whats-next) explicitly in the description AND in the opening clarifier — the exception is intentional and the body documents WHY"

patterns-established:
  - "Single-skill V1 exception pattern (D97) — when an operation is inherently user-directed and no autonomous default would be safe, the V1 mode-variant convention does NOT apply; the skill ships as ONE skill with no auto/interactive siblings, and both the description and opening clarifier acknowledge the exception explicitly"
  - "Chat-first advisory navigation pattern — primary output is the chat reply (not an artifact); artifact creation gated on EXPLICIT affirmative user opt-in; the skill body MAY be thin per D33 when its content is essentially derived from canonical workflow guidance maintained elsewhere"
  - "Closure-stance amplifier pattern — when a stance-carrying skill operates on hard-to-undo actions (branch ops in finish), the 4-marker anti-sycophancy stance is paired with a stage-specific amplifier that names the irreversibility explicitly"
  - "Advisory-skill stance pattern (no amplifier) — when a stance-carrying skill is advisory (not opinion-driven on settled work), the 4-marker stance is carried for V1 convention uniformity WITHOUT a stage-specific amplifier; the body documents the absence-of-amplifier choice explicitly"

requirements-completed: [FNSH-01, FNSH-02, FNSH-03, NAV-01, NAV-02, NAV-03]

# Metrics
duration: 9min
completed: 2026-05-21
---

# Phase 07 Plan 02: Finish & What's Next Pair Summary

**V1 closing skills shipped — `finish` (SINGLE V1 skill, intentional D97 exception to mode-variant convention; lightweight 4-item thread check per D98 / FNSH-02; 4-option closure question per D98 / FNSH-03; NEVER force-push, NEVER rewrite history; 4-marker anti-sycophancy stance + closure-stance amplifier) and `whats-next` (V1 advisory chat-first navigation per NAV-01..03; inspects thread context READ-ONLY; suggests 2-4 next actions in chat; NEVER writes an artifact by default; opt-in inbox capture only via `capture-inbox`; thin OK per D33; 4-marker anti-sycophancy stance with no stage-specific amplifier); JeisKappa-workflow plugin 31 -> 33 (Phase 7 V1 plugin target REACHED); .vscode scopes 38 -> 40 (Phase 7 V1 scopes target REACHED); README Available skills 38 -> 40. Phase 7 V1 SKILL ARTIFACTS COMPLETE — only the README hybrid redesign (Plan 07-03) remains in the milestone.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-21T15:00:16Z
- **Completed:** 2026-05-21T15:09:50Z
- **Tasks:** 3
- **Files modified:** 5 (2 created + 3 registration files updated)

## Accomplishments

- **`skills/finish/SKILL.md`** authored (180 lines) — V1 single-skill closure: the ONLY V1 workflow skill without `-auto` / `-interactive` siblings per D97 (intentional V1 exception to the mode-variant convention because branch disposition is inherently user-directed and there is no autonomous default that would be safe across users / repos / branch contexts). Lightweight 4-item Thread Check enumerated per D98 / FNSH-02 (final artifacts under `proposals/` / `specs/` / `plans/` / `discussions/`, open Inbox items in `inbox/open/`, recent implementation commits / branch state, obvious unresolved workflow concerns). 4-option Closure Question enumerated per D98 / FNSH-03 (`merge into main` / `merge into other branch` / `create PR` / `leave as is`) — ASKED with per-command confirmation before any git command runs. Anti-Sycophancy Stance with the 4 markers verbatim from `skills/discussion/SKILL.md` ("Disagree when you disagree", "Push back on weak or incomplete reasoning", "Do not treat pushback as correctness", "Refuse to log") plus the closure-stance amplifier ("Branch operations are hard to undo — push back if the user picks an option that would lose work"). Explicit NEVER force-push / NEVER rewrite history with the forbidden-constructs list enumerated explicitly (`--amend`, `rebase` any flavor, `push --force` and `--force-with-lease`, `reset --hard` against pushed history, `filter-branch`, `filter-repo`) — mirrors the Phase 5 `implement-plan-*` git-discipline pattern.
- **`skills/whats-next/SKILL.md`** authored (150 lines) — V1 advisory chat-first navigation skill per NAV-01..03: inspects the current thread context READ-ONLY (artifacts present under `proposals/` / `specs/` / `plans/` / `discussions/` / `inbox/open/` and recent commits on the current branch) and suggests 2-4 coherent next actions in chat with each suggestion citing the V1 skill that would execute the action. PRIMARY output is the chat reply; the skill NEVER writes an artifact by default (`never writes an artifact by default` phrase appears verbatim, the default-off rule is unambiguous). Optional Inbox capture per NAV-02 / D105 — ONLY on EXPLICIT affirmative user opt-in does the skill route to `skills/capture-inbox/SKILL.md` (no auto-capture, no default capture, no capture without affirmative user consent). Thin body OK per D33 / NAV-03 — body explicitly allowed to be thin and to point the agent at the canonical README hybrid (lands in Plan 07-03) for the full workflow map. 4-marker anti-sycophancy stance carried verbatim from `skills/discussion/SKILL.md` with NO stage-specific amplifier (the skill is advisory, not opinion-driven; the 4-marker stance is carried for V1 convention uniformity without an amplifier).
- **Registration files updated atomically:** `.claude-plugin/marketplace.json` `JeisKappa-workflow` array grew 31 -> 33 (`./skills/finish` inserted alphabetically between `./skills/discussion` and `./skills/implement-auto`; `./skills/whats-next` appended at the end after `./skills/spec-interactive`) — **Phase 7 V1 plugin target of 33 REACHED**. `.vscode/settings.json` `conventionalCommits.scopes` grew 38 -> 40 alphabetically (`finish` inserted between `discussion` and `implement-auto`; `whats-next` appended after `the-librarian`; whole array confirmed sorted via `jq -e '."conventionalCommits.scopes" == (."conventionalCommits.scopes" | sort)'`) — **Phase 7 V1 scopes target of 40 REACHED**. `README.md` "Available skills" grew 38 -> 40 with both entries inserted immediately after the Plan 07-01 `merge-artifacts-interactive` entry and before `## Retired skills`; both entries carry substantive descriptions per DIST-05 explicitly stating interaction mode (`finish`: SINGLE V1 skill no variants per D97 exception; `whats-next`: advisory chat-first with optional opt-in inbox capture) plus fenced `npx skills add Jei-sKappa/skills --skill <name>` install snippets. The Plan 06-04 verification-coverage note, the Plan 06-05 the-fool delegation note, the Plan 07-01 `merge-artifacts-auto` + `merge-artifacts-interactive` entries, and the two Retired skills entries (`discussion-loop`, `review-decision-document`) all preserved untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author `skills/finish/SKILL.md`** — `3cfd132` (feat)
2. **Task 2: Author `skills/whats-next/SKILL.md`** — `6972cc3` (feat)
3. **Task 3: Register `finish` + `whats-next` in marketplace.json, .vscode/settings.json, README.md** — `8752037` (chore)

**Plan metadata commit:** Pending after this SUMMARY is written.

## Files Created/Modified

- **`skills/finish/SKILL.md`** (created, 180 lines) — V1 single-skill closure body covering: opening clarifier explicitly stating the V1 single-skill exception per D97 with the rationale (branch disposition is inherently user-directed; no autonomous default safe across users / repos / branch contexts); Anti-Sycophancy Stance with all four verbatim markers from `skills/discussion/SKILL.md` + closure-stance amplifier; Thread Check section enumerating the 4 inspection items per D98 / FNSH-02 (final artifacts present in `proposals/` / `specs/` / `plans/` / `discussions/`; open Inbox items in `inbox/open/`; implementation commits / branch status; obvious unresolved workflow concerns); Closure Question section enumerating the 4 options per D98 / FNSH-03 (`merge into main` / `merge into other branch` / `create PR` / `leave as is`) with the literal option-name labels in a side-by-side presentation; Branch Operations section documenting per-option behaviors with named git commands, user-confirmation requirement BEFORE each command, failure-handling rule (REPORT verbatim, STOP, do NOT retry, do NOT attempt recovery), and the explicit NEVER force-push / NEVER rewrite history language with the forbidden-constructs list enumerated; Workflow section with 7 numbered steps; Commit Policy section; Immutability section. All 4 Phase 1 canonical docs cited by absolute path (`docs/workflow/v1/README.md` + `thread-layout.md` + `filename-grammar.md` + `immutability.md`); `.library/sources/obra_superpowers/skills/finishing-a-development-branch/SKILL.md` mentioned as design inspiration only per D97 (not loaded or referenced at runtime).
- **`skills/whats-next/SKILL.md`** (created, 150 lines) — V1 advisory chat-first navigation body covering: opening clarifier (advisory chat-first; primary output is chat reply with 2-4 next-action suggestions; NEVER writes an artifact by default; thin OK per D33); Anti-Sycophancy Stance with all four verbatim markers from `skills/discussion/SKILL.md` and an explicit no-amplifier statement (the skill is advisory, not opinion-driven; the 4-marker stance is carried for V1 convention uniformity); Inputs section (optional user hint shapes advisory framing; default thread-context pass when no hint; ambiguity fallback per `docs/workflow/v1/immutability.md`); Thread Inspection section (READ-ONLY inspection of V1 folders + recent commits per `docs/workflow/v1/thread-layout.md`); Chat-First Answer section (chat reply IS the deliverable; NEVER writes an artifact by default; each suggestion cites the V1 skill that would execute the action); Optional Inbox Capture section (opt-in only per NAV-02 / D105; routes through `skills/capture-inbox/SKILL.md`; no auto-capture / no default capture / no capture without affirmative user consent); Thin Body OK Per D33 section (explicit D33 / NAV-03 citation; body allowed to point at the canonical README hybrid forthcoming in Plan 07-03); Workflow section with 7 numbered steps; Commit Policy section (no artifacts written = nothing to commit); Immutability section (chat reply is ephemeral, not a V1 artifact; inbox state transitions remain manual file moves outside this skill). All 4 Phase 1 canonical docs cited by absolute path plus `skills/capture-inbox/SKILL.md` for the opt-in capture route.
- **`.claude-plugin/marketplace.json`** (modified) — `JeisKappa-workflow.skills` array length 31 -> 33 (**Phase 7 V1 plugin target REACHED**); `./skills/finish` inserted alphabetically between `./skills/discussion` and `./skills/implement-auto`; `./skills/whats-next` appended at the end of the alphabetical list (after `./skills/spec-interactive`); `JeisKappa-skills` unchanged at 7.
- **`.vscode/settings.json`** (modified) — `conventionalCommits.scopes` array length 38 -> 40 (**Phase 7 V1 scopes target REACHED**); `"finish"` inserted alphabetically between `"discussion"` and `"implement-auto"`; `"whats-next"` appended after `"the-librarian"` at the end; whole array confirmed sorted alphabetically via `jq -e '."conventionalCommits.scopes" == (."conventionalCommits.scopes" | sort)'`.
- **`README.md`** (modified) — Two new entries (`### [\`finish\`](./skills/finish/SKILL.md)` + `### [\`whats-next\`](./skills/whats-next/SKILL.md)`) inserted before `## Retired skills`, immediately after the Plan 07-01 `merge-artifacts-interactive` entry. Each entry carries a substantive description sentence stating interaction mode explicitly per DIST-05 (finish: SINGLE V1 skill no variants D97 exception; whats-next: advisory chat-first with optional opt-in inbox capture), the 4-marker anti-sycophancy stance framing, the closure-stance amplifier (finish only — whats-next has none), the NEVER force-push / NEVER rewrite history discipline (finish only), the thin-OK-per-D33 statement and opt-in-only inbox capture (whats-next only), plus a fenced `npx skills add Jei-sKappa/skills --skill <name>` install snippet. Total `### [\`...\`]` count grew 38 -> 40. The Plan 06-04 verification-coverage note, the Plan 06-05 the-fool delegation note, the Plan 07-01 `merge-artifacts-auto` + `merge-artifacts-interactive` entries, and the two Retired skills entries (`discussion-loop`, `review-decision-document`) preserved untouched.

## Decisions Made

- **finish enumerates the 4 closure options by literal token in a side-by-side presentation.** The body presents `merge into main` / `merge into other branch` / `create PR` / `leave as is` in a code-fenced four-row list (`1. merge into main ...`, `2. merge into other branch ...`, etc.) so the option labels appear verbatim and a downstream reader can grep them out. The plan's verifier checks each label as a separate grep pattern — keeping them in one canonical block makes the labels stable across future README hybrid restructures.
- **finish documents the forbidden-constructs list for history-rewriting explicitly.** The `### NEVER force-push, NEVER rewrite history` subsection lists every forbidden git invocation by literal token: `git commit --amend`, `git rebase` (with the variants `rebase -i`, `rebase --onto`, `rebase --interactive`, autosquash, autostash named explicitly), `git push --force` and `git push --force-with-lease` (and the `-f` shorthand), `git reset --hard` against pushed history, `git filter-branch`, `git filter-repo`. This mirrors the Phase 5 `implement-plan-*` git-discipline pattern and makes the discipline survivable for partial readers — a reader who skims the body and only catches the `### NEVER` heading still gets the full forbidden list. The choice was to enumerate exhaustively rather than rely on the catch-all phrase "no history rewriting" because the verifier grep patterns (`amend`, `rebase`) need anchors in the body.
- **whats-next's opt-in capture routes through capture-inbox rather than inlining.** The `## Optional Inbox Capture` section makes the routing explicit ("the skill itself does NOT bypass `capture-inbox`") — preserves V1's single-responsibility convention where `capture-inbox` owns the inbox-item shape, folder routing, and `**Why:**` body discipline. The alternative (inlining the capture logic) would have duplicated `capture-inbox`'s body inside `whats-next` and broken the V1 thin-OK pattern. Routing also makes the opt-in path discoverable in chat — the user invoking `whats-next` learns about `capture-inbox` if they opt in.
- **whats-next's body documents the absence-of-amplifier choice explicitly.** The `## Anti-Sycophancy Stance` section names the design choice in prose ("This is the V1 voice — the four-marker stance is carried for V1 convention uniformity. The skill is ADVISORY, not opinion-driven: there is NO stage-specific amplifier"). Without this explicit framing, a future maintainer might add a "navigation-stance amplifier" by analogy with the merge / closure amplifiers and miss the design intent that `whats-next` is advisory by design. Documenting the absence prevents drift.
- **Both new skills cite all four Phase 1 canonical docs by absolute path on first invocation.** Matches the citation-first voice established in Phase 6 review-* + Phase 7 merge-artifacts-* skills. Both skills cite `docs/workflow/v1/README.md`, `docs/workflow/v1/thread-layout.md`, `docs/workflow/v1/filename-grammar.md`, `docs/workflow/v1/immutability.md`. `whats-next` additionally cites `skills/capture-inbox/SKILL.md` (opt-in capture route); `finish` additionally mentions `.library/sources/obra_superpowers/skills/finishing-a-development-branch/SKILL.md` as design inspiration only (not loaded at runtime).

## Deviations from Plan

None — plan executed exactly as written.

The plan was unusually thorough: the action blocks enumerated the exact behavioral tokens both skill bodies needed to carry (the four anti-sycophancy markers verbatim, the closure-stance amplifier near-verbatim for finish, the four closure-option labels by literal token for finish, the chat-first rule + opt-in capture rule + thin-OK rule for whats-next), the registration counts were stated up front (31 -> 33, 38 -> 40, 38 -> 40 as Phase 7 V1 targets), and the alphabetical-position rule was stated verbatim for each registration file. No Rule 1/2/3 auto-fixes were needed. The 4 anti-sycophancy markers landed verbatim in both skill bodies. The closure-stance amplifier landed near-verbatim in finish ("Branch operations are hard to undo — push back if the user picks an option that would lose work" appears unchanged from the plan's required token). The no-amplifier choice for whats-next was documented explicitly. The git-discipline forbidden-constructs list landed exhaustively in finish. The opt-in-only capture rule in whats-next routes through `capture-inbox` per the plan. Both skills cite all four Phase 1 canonical docs by absolute path.

## Issues Encountered

None. The plan's verifier blocks ran clean on the first attempt for all three tasks. The full plan-level verification at the end of execution returned all OK lines (skill files exist, finish behavioral tokens including the 4 markers + D97 exception + 4 closure options + NEVER force-push + history-rewrite forbidden constructs + closure-stance amplifier, whats-next behavioral tokens including the 4 markers + chat-first rule + default-off artifact creation + opt-in capture + D33 thin-OK + capture-inbox citation, registration counts at workflow=33 / skills=7 / scopes=40 / README=40, documentation preservation across the-fool + verification-coverage + discussion-loop + review-decision-document + merge-artifacts-auto + merge-artifacts-interactive).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 07-03 (README hybrid redesign — DIST-01..03 + DIST-05) unblocked.** It will REPLACE the entire "Available skills" simple-list with the hybrid layout (toolbox model + layered workflow map + recommended common paths + per-module catalog grouped by module/family + retired skills + installation note) per D34 / D109. All 40 current "Available skills" entries (including the 2 new entries this plan added: `finish` + `whats-next`) need to surface in the per-module catalog; the Plan 06-04 verification-coverage note + Plan 06-05 the-fool delegation note get integrated as one-line callouts inside the Review module family per the CONTEXT.md guidance. **Plan 07-03 is the LAST plan in the milestone — after it lands, V1 is COMPLETE.**
- **Phase 7 V1 SKILL ARTIFACTS COMPLETE.** All 4 new V1 skills (`merge-artifacts-auto`, `merge-artifacts-interactive`, `finish`, `whats-next`) have shipped. JeisKappa-workflow plugin is at 33 (Phase 7 V1 target REACHED); .vscode scopes at 40 (Phase 7 V1 target REACHED). The remaining work in the milestone is purely documentation (the README hybrid redesign).
- **No blockers or concerns.** The closing skill family is now complete; finish + whats-next + merge-artifacts-* together cover the V1 cross-cutting closing surface (reconcile, close, navigate).

## Self-Check: PASSED

- `skills/finish/SKILL.md` — FOUND (180 lines, 25793 bytes)
- `skills/whats-next/SKILL.md` — FOUND (150 lines, 20384 bytes)
- Commit `3cfd132` (feat(finish): add V1 single-skill closure skill (D97 exception)) — FOUND in `git log --oneline -6`
- Commit `6972cc3` (feat(whats-next): add V1 advisory chat-first navigation skill) — FOUND
- Commit `8752037` (chore: register finish + whats-next skills) — FOUND
- marketplace.json JeisKappa-workflow length 33 — confirmed by `jq -e '.plugins[] | select(.name=="JeisKappa-workflow") | .skills | length == 33'`
- marketplace.json JeisKappa-skills length 7 — confirmed unchanged
- .vscode/settings.json scopes length 40 + alphabetical — confirmed via `jq -e '."conventionalCommits.scopes" == (."conventionalCommits.scopes" | sort)'`
- README.md `^### \[` count 40 — confirmed
- README.md finish + whats-next entries inserted BEFORE `## Retired skills` — confirmed via line-number comparison (F < R && W < R)
- Documentation notes preserved (the-fool, verification-coverage, discussion-loop, review-decision-document, merge-artifacts-auto, merge-artifacts-interactive) — confirmed

---
*Phase: 07-merge-finish-navigation-distribution*
*Completed: 2026-05-21*
