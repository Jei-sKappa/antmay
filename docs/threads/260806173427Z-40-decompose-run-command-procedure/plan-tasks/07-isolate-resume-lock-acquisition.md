### Task 7: Isolate resume lock acquisition and handoff

**Objective:** Give acquisition of the recorded workspace lock a distinct resume-owned boundary while keeping lifecycle and release ownership visible in `resume.ts`.

**Input / context:** Task 6's fully prepared resume facts; `spec.md`; `decisions.md DR2`, `decisions.md DR4`, and `decisions.md DR7`; existing lock, signal, handoff, and cleanup assertions in `resume.test.ts`.

**Steps:**

1. Create `commands/resume/acquire-lock.ts` exporting `acquireResumeLock` and explicit success/refusal types; accept only state root, recorded workspace path, run ID, and clock.
2. Call the shared lock primitive once and return either the still-held handle or contention facts. Do not generate IDs, create directories, mutate checkpoints, render, choose exits, inspect signals, or call engine.
3. Replace direct acquisition in `resume.ts` after the pre-lock signal with one collaborator call; preserve exact contention prose and mapping in the command.
4. Transfer release ownership immediately on success. Keep the post-acquisition signal inside `try`/`finally`, then startup, snapshotted summary, one resume engine entry, result mapping, lock release, and signal uninstall.
5. Extend task 6's signal matrix with the post-acquisition case, proving conventional exit, no engine, unchanged checkpoint, and released lock.
6. Retain command-level contention and engine-result tables; add thrown-engine cleanup coverage if it is absent.
7. Run the focused resume suite and full gate.

**Files modified:**

- `cli/src/commands/resume/acquire-lock.ts` (NEW)
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`

**Verification:** `npm --prefix cli run test -- src/commands/resume.test.ts` exits 0; `npm --prefix cli run check` exits 0; `rg -n 'acquireWorkspaceLock' cli/src/commands/resume.ts` returns no matches; `rg -n 'writeCheckpoint|createRunDirectory|executeEngine|installSignalHandlers' cli/src/commands/resume/acquire-lock.ts` returns no matches.

**Acceptance criteria:**

- `acquireResumeLock` returns contention facts or a still-held lock over the existing primitive.
- It cannot allocate, create a run, mutate checkpoint state, render, inspect signals, invoke engine, or share run allocation.
- `resume.ts` visibly checks signals immediately before and after acquisition; the latter leaves unchanged state and no lock.
- `resume.ts` remains the complete resume order and owns presentation, one resume engine handoff, mapping, and cleanup.
- Contention, all engine results, and thrown failures preserve behavior and lock release; focused/full gates pass.

**Consumes:** Task 6's `stateRoot`, `checkpoint.workspace.path`, `checkpoint.runId`, and command clock.

**Produces:** `acquireResumeLock(...)`; a thin pre-lock-to-engine sequence in `resume.ts`.
