### Task 7: Document and demonstrate the native-session journey

**Objective:** Make the provider-conversation continuation journey accurate and human-verifiable in living CLI documentation and the existing demo catalog.

**Input / context:** Start from the scripted live session behavior from Task 1, pause rendering from Task 5, and list rendering from Task 6. Complete `spec.md` FR-5 and FR-6 according to `decisions.md` DR6, DR8, DR9, DR18, and DR19. Historical artifacts under `docs/threads/260723121015Z-afk-workflow-executor/` are provenance only and remain untouched.

**Steps:**

1. Add a concise native-session section to `cli/README.md` that distinguishes `antmay afk resume <run-id>` from `codex resume '<session-id>'` and `claude --resume '<session-id>'`, explains that every Antmay attempt still starts a fresh harness conversation, and describes the DONE-with-pending human journey.
2. Document the `antmay afk list` selection rule: the row shows the most recent attempt carrying a session, which may differ from the currently displayed stage, and omits the value when no session was captured.
3. Update the demo scenario table and surrounding prose so `04-waiting-for-user` names its native `Continue` line and `18-list` names its latest-session values without adding a new scenario.
4. Extend the human-run manual smoke checklist for whichever real provider is configured: confirm a live executing checkpoint receives `agentSession.id`, reach an attempt-backed pause, paste the emitted native command, verify the same conversation opens, and deliberately commit or revert any conversation-made repository changes before invoking `antmay afk resume`.
5. State that the native command is an out-of-band convenience and does not verify transcript existence, mutate the Antmay checkpoint, reuse a session for a stage attempt, or launch automatically.
6. Update `cli/AGENTS.md` in its scripted-harness section to record the deterministic `scripted-session-<stage-id>-<attempt>` callback/outcome behavior and its role in the existing pause/list demo coverage.
7. Run both affected no-color demo scenarios and confirm `04-waiting-for-user` contains `Continue` with `scripted-session-reconcile-spec-1` without any change to that scenario, while `18-list` contains the seeded latest-session values and both declared exit-code checks pass.
8. Confirm the change adds no credential-dependent manual test, `verify:session` package script, feature-specific Vitest configuration, fourth CLI subcommand, pause-time clean-worktree warning, edit to `cli/scripts/scenarios/04-waiting-for-user.mjs`, or edit under the earlier executor thread.
9. Run the complete deterministic CLI gate after the living documentation and scenario descriptions match the delivered behavior.

**Files modified:**

- `cli/README.md`
- `cli/AGENTS.md`

**Verification:**

1. `npm --prefix cli run demo -- --scenario 04-waiting-for-user --no-color`
2. `npm --prefix cli run demo -- --scenario 18-list --no-color`
3. `rg -n "native|Continue|codex resume|claude --resume|most recent|agentSession|scripted-session" cli/README.md cli/AGENTS.md`
4. `test ! -e cli/src/harness/session-id.manual.ts`
5. `test ! -e cli/vitest.manual.config.ts`
6. `node -e 'const p = require("./cli/package.json"); process.exit(Object.hasOwn(p.scripts, "verify:session") ? 1 : 0)'`
7. `git diff --exit-code -- cli/scripts/scenarios/04-waiting-for-user.mjs`
8. `git status --short -- docs/threads/260723121015Z-afk-workflow-executor`
9. `npm --prefix cli run check`

**Acceptance criteria:**

- `cli/README.md` documents the separate Antmay/native resume commands, the pending-decision journey, latest-session list rule, opaque/transcript caveat, and clean-worktree instruction.
- The manual checklist covers early checkpoint capture and reopening the same real provider conversation without becoming an automated or credential-dependent gate.
- `cli/AGENTS.md` records the deterministic scripted session callback/outcome behavior.
- Demo `04-waiting-for-user` visibly renders the native `Continue` line without scenario-specific session setup.
- Demo `18-list` visibly renders the latest-session values, and both scenarios pass their declared exit-code checks.
- No manual provider test file, `verify:session` script, feature-specific Vitest configuration, fourth subcommand, clean-worktree pause warning, `04-waiting-for-user` scenario edit, or historical-thread edit is introduced.
- `npm --prefix cli run check` passes without credentials or paid model calls.

**Consumes:** scripted `scripted-session-<stage-id>-<attempt>` capture; persisted-attempt pause continuation behavior; latest-session list rendering and demo seed.

**Produces:** none
