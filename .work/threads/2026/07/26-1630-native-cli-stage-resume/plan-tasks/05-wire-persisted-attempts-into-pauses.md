### Task 5: Wire persisted attempts into initial and resumed pauses

**Objective:** Show the native continuation command on every attempt-backed pause, whether rendered immediately or reconstructed by `antmay afk resume`, and omit it from pre-attempt pauses.

**Input / context:** Start from settled attempts carrying `agentSession` from Task 3 and the command/display surface from Task 4. Implement `spec.md` FR-3 according to `decisions.md` DR11 and DR22: the persisted attempt is the source for both action lines, while its `stageIndex` resolves the authoritative harness from the snapshotted stage.

**Steps:**

1. Refactor the runner's local pause-rendering helper in `cli/src/runner/runner.ts` to accept the persisted `AttemptRecord` the pause concerns, or no attempt for a pre-attempt queue/gate pause.
2. Derive the `Log` path from that record and, when it has `agentSession`, resolve `checkpoint.stages[attempt.stageIndex].profile.harness` and call `nativeContinuationCommand` for the display's optional `Continue` value.
3. Pass the just-persisted settled attempt on DONE-with-pending, non-DONE, boundary-failure, and every allocated-attempt interruption pause, including both pre-launch and post-launch interruptions. Pass no attempt only on the two pre-attempt queue-gate paths. Do not source presentation from the live `AttemptOutcome`.
4. Refactor the corresponding helper in `cli/src/commands/resume.ts` to accept an `AttemptRecord` or no attempt and derive both `Log` and `Continue` from that same record.
5. Preserve the existing six resume pause associations: the four paths currently given `lastAttempt` or `preserved` remain attempt-backed, and the two paths currently given no log remain attempt-free.
6. Leave queue scanning, queue resolution, checkpoint mutations, clean-worktree validation/error text, boundary finalization, lock behavior, and exit-code selection unchanged.
7. Extend `cli/src/runner/runner.test.ts` to assert that immediate attempt-backed pauses supply a continuation command using the persisted ID and snapshotted harness, while a pre-attempt pause supplies neither `Log` nor `Continue`.
8. Extend `cli/src/commands/resume.test.ts` to seed both Codex and Claude Code attempt-backed pauses, re-render each through `resume`, and assert the exact safely quoted command. Also cover an attempt with no session and a pause with no attempt, both omitting `Continue` while retaining existing `Log`/`Resume` behavior where applicable.

**Files modified:**

- `cli/src/runner/runner.ts`
- `cli/src/runner/runner.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`

**Verification:**

1. `npm --prefix cli run test -- src/runner/runner.test.ts src/commands/resume.test.ts`
2. `npm --prefix cli run check`

**Acceptance criteria:**

- Every initial pause about a persisted session-carrying attempt renders one `Continue` command from that attempt's ID and snapshotted harness.
- Re-rendering the same durable pause through `antmay afk resume` produces the same native command.
- Codex and Claude Code pause commands use their respective syntax and centralized quoting helper.
- A pause whose attempt has no session omits `Continue` but keeps its `Log` and `Resume` lines.
- A pre-launch interrupted attempt keeps its `Log` line and omits `Continue`; only pauses taken before any attempt was allocated omit both.
- A pre-attempt pause omits both `Log` and `Continue`.
- No pause renderer reads a live outcome, duplicates the attempt's harness, probes transcripts, launches a provider, or adds a clean-worktree caution.
- Resume's mutations, validation, queue/boundary decisions, locks, error text, and exit codes remain unchanged.

**Consumes:** settled `AttemptRecord.agentSession?: { id: string }`; `nativeContinuationCommand(harness: HarnessId, sessionId: string): string`; optional continuation-command input on `Display.runPaused`.

**Produces:** persisted-attempt-derived `Log` and native `Continue` actions for initial and resume-rendered pauses.
