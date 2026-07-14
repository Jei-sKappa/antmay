# Task 30: Rewrite finish

**Objective:** Rewrite `finish` as the interactive, advisory delivery handoff.

**Input / context:** The cutover spec `specs/001/spec.md` § "Finish, navigation, archival" and AC-10.1/AC-10.4 (thread-relative to `docs/threads/260711150919Z-v3-workflow-kinds/`); decision log `seed/discussions/260711154147Z-v3-thread-kind-profiles-decision-log.md` P42 (the complete finish contract), P27 (passive tracker behavior; non-closing `Related to`), P61 (branch-agnostic: operate on the current branch as found; never create/switch/name branches on its own initiative), P60/P11 (archival is a separate optional act). Current file: `skills/workflow/finish-navigate/finish/SKILL.md` (262 lines; V2: implemented-latch setting, ledger closure, ticket closing, review disposition — replace wholesale).

**Skill-body hygiene** — binding for the `SKILL.md` this task writes:

1. The body contains only what a fresh agent needs to execute the skill; every sentence must change the executing agent's behavior. No author commentary, design history, or explanations of how this repository is organized.
2. No repo-internal concepts in the body: no references to the cutover spec or its acceptance criteria, no `P<N>` decision-log citations, no V2/V3, migration, or supersession talk, nothing "we decided". An internal decision that matters at runtime is restated purely as behavior the agent must follow. (IDs that are part of the skill's own emitted artifact format — `D<N>`, `F<N>`, `C<N>` — are fine.)
3. Remove obsolete concepts by silence. Never write disclaimers such as "this skill does not use a ledger/tier/`.wip/`" — a "do not X" belongs in the body only when the skill's own instructions could plausibly lead an agent to do X. (The P42 "never manufacture readiness" prohibitions DO belong: finish's own inspection could plausibly tempt those actions.)
4. State each rule once, in the section where it is operative; do not restate a guideline across sections. Repeat only a genuinely critical safety rule, and sparingly.

**Steps:**

1. Frontmatter: keep `name: finish`; concise human-facing `description`; `disable-model-invocation: true`; bump `metadata.version` (major appropriate).
2. Create `skills/workflow/finish-navigate/finish/agents/openai.yaml` with `policy:` / `  allow_implicit_invocation: false`.
3. Body — readiness inspection (signal-only; the seed's suggested workflow is context, not a checklist): whether the thread's apparent principal outcome exists (`implementation-report.md` for implemented work; `roadmap.md` plus materialization evidence for Roadmap work); `.pending-decisions/`; `.pending-reviews/`; abandoned or interrupted `.implementation-runs/`; obvious unresolved conflict markers; whether relevant living documentation appears current; current branch, recent commits, working-tree state; verification evidence already recorded. Report only non-empty categories; do not rerun test suites or repeat reviews.
4. Body — advice never gates: findings are recommendations; the user may explicitly accept the trade-off and continue. Finish never manufactures readiness — it does not delete pending bundles, rewrite spec/plan, create a missing report, or add completion markers.
5. Body — exactly three branch dispositions: create PR; merge into a confirmed target branch; leave as-is (a valid result). The selected option authorizes the branch operation without redundant per-command confirmation; resolve missing consequential parameters; stop on failure; never rebase, amend, or force-push. Never create, switch, or name a branch on the skill's own initiative.
6. Body — dirty worktree: never silently commit; when delivery needs a commit, ask whether to authorize committing an explicitly identified file set, return so the user prepares commits, or leave as-is.
7. Body — tracker passivity: may include a non-closing `Related to <ticket>` reference in a PR body; no closing keywords, comments, transitions, or status changes without an explicit user request.
8. Body — afterwards: report the outcome and offer `archive-thread` as the normal optional next action; never archive automatically; update no living docs itself.

**Files modified:** `skills/workflow/finish-navigate/finish/SKILL.md` (rewritten), `skills/workflow/finish-navigate/finish/agents/openai.yaml` (NEW).

**Verification:**

```sh
grep -n 'disable-model-invocation: true' skills/workflow/finish-navigate/finish/SKILL.md
grep -n 'allow_implicit_invocation: false' skills/workflow/finish-navigate/finish/agents/openai.yaml
grep -nE 'leave as[- ]is|Related to' skills/workflow/finish-navigate/finish/SKILL.md
grep -nE 'rebase|amend|force' skills/workflow/finish-navigate/finish/SKILL.md   # present only as prohibitions
grep -riE '\.wip|ledger\.md|status\.approved|status\.implemented|record-verdict' skills/workflow/finish-navigate/finish/ ; \
grep -riwE 'tier|ledger' skills/workflow/finish-navigate/finish/   # both must return nothing
```

**Acceptance criteria:**

- The body implements P42: the signal-only inspection list; advisory (non-gating) findings; exactly three branch dispositions with "leave as-is" valid; commit authorization only for an explicitly identified file set; no rebase/amend/force-push; passive tracker behavior (non-closing `Related to` only); offers `archive-thread` afterwards; sets no latches, closes no ledgers, updates no living docs itself (spec AC-10.1).
- No thread-to-branch mapping; no branch created, switched, or named on the skill's initiative (spec AC-10.4).
- Frontmatter/metadata per the P48 pair; semver bump.
- Hygiene: greps return nothing; no `P<N>` citations or cutover/migration references; no disclaimers naming retired concepts (the latch/ledger/ticket-closing machinery disappears silently); no rule stated twice.

**Consumes:** the three-workspace semantics (Tasks 3, 4, 25–27) as read-only inspection targets.

**Produces:** the V3 `finish` skill.
