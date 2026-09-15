### Task 6: Expose the latest captured session in run listings

**Objective:** Make `antmay afk list` recover the most recently captured provider conversation for every valid run condition.

**Input / context:** Use the ID-only `AttemptRecord.agentSession` from Task 2 and the immutable stage snapshots already stored in each checkpoint. Implement `spec.md` FR-4 and the list/demo portion of FR-5 according to `decisions.md` DR6, DR8, and DR22.

**Steps:**

1. Add a pure selection helper in `cli/src/commands/list.ts` that scans attempts from newest to oldest and returns the first attempt carrying `agentSession`.
2. Resolve that attempt's harness through `checkpoint.stages[attempt.stageIndex].profile.harness` and format the optional row value as `<harness>/<session-id>`.
3. Add the value as a row column immediately before the repository and thread paths for `ready`, `executing`, `waiting-for-user`, and `completed` checkpoints; omit the column entirely when no attempt captured a session.
4. Keep the displayed current stage position and harness/model logic unchanged. Do not imply that the selected session belongs to the current displayed stage.
5. Extend `cli/src/commands/list.test.ts` with checkpoints containing multiple session-carrying attempts whose harnesses differ by snapshotted stage. Prove latest selection, stage-index harness resolution, rendering across all four conditions, completed-run support, and omission when absent.
6. Update the shared attempt seed shape in `cli/scripts/scenarios/18-list.mjs` to use `agentSession: { id }`, ensuring the four rows exercise the ID-only schema and show the latest-session column. Include more than one session on at least one run so the newest-selection rule is visible in the fixture.
7. Keep the scenario's seeded checkpoints valid under the production validator and leave its declared list exit code at `0`.

**Files modified:**

- `cli/src/commands/list.ts`
- `cli/src/commands/list.test.ts`
- `cli/scripts/scenarios/18-list.mjs`

**Verification:**

1. `npm --prefix cli run test -- src/commands/list.test.ts`
2. `npm --prefix cli run demo -- --scenario 18-list --no-color`
3. `npm --prefix cli run check`

**Acceptance criteria:**

- A run with several captured sessions shows only the newest attempt's `<snapshotted-harness>/<session-id>`.
- The selected harness comes from the session-carrying attempt's `stageIndex`, not the run's current stage.
- Ready, executing, waiting, and completed rows can display a latest session.
- A run with no captured session has no session column value.
- Existing condition, stage, current harness/model, repository, thread, sorting, color, corruption-warning, and exit-code behavior remains intact.
- Demo scenario `18-list` passes checkpoint validation, exits `0`, and visibly includes latest-session values using the ID-only attempt shape.

**Consumes:** `AttemptRecord.agentSession?: { id: string }`; `checkpoint.stages[attempt.stageIndex].profile.harness`.

**Produces:** the optional latest-session `<harness>/<session-id>` list column and a validated demo fixture exercising it.
