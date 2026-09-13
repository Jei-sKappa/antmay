### Task 5: Extract resume lookup and durable identity validation

**Objective:** Make resume state-root resolution, exact run lookup, checkpoint validation, completion refusal, and recorded thread revalidation explicit read-only steps.

**Input / context:** `CommandDeps` from task 1; task 4's command-layer structure; `spec.md`; `decisions.md DR1`, `decisions.md DR2`, `decisions.md DR3`, `decisions.md DR4`, `decisions.md DR5`, and `decisions.md DR7`; existing unknown-run, malformed/completed-checkpoint, thread-revalidation, and read-only assertions in `resume.test.ts`.

**Steps:**

1. Create `cli/src/commands/resume/types.ts` with the resume argument and typed success/refusal facts; refusals contain no renderer callback or selected exit code.
2. Create `resolve-state-root.ts` exporting `resolveResumeStateRoot`; resolve only the state root so a config-root error cannot block a real-runtime state-only resume.
3. Create `locate-run.ts` and `load-checkpoint.ts`, exporting `locateResumeRun` and `loadResumeCheckpoint`; locate exactly the requested run directory without fallback search, then read and validate its checkpoint separately.
4. Create `require-incomplete.ts` exporting `requireIncompleteRun`; call it only after the signal observation following checkpoint loading so completed-run behavior retains its exact boundary.
5. Create `revalidate-thread.ts` exporting `revalidateResumeThread`; re-resolve the checkpoint's active thread and require both repository and thread identities to equal the recorded values.
6. Replace corresponding inline blocks in `resume.ts` with this order: state root, run location, signal, checkpoint load, signal, incomplete-run check, thread revalidation, signal.
7. Keep refusal rendering, streams, exit mapping, signals, runtime/workspace preparation, lock acquisition, startup, engine, and cleanup in `resume.ts`.
8. Ensure these preflight steps neither call one another nor acquire a lock, write a checkpoint, import engine/signal/display/exit owners, or reach either orchestrator.
9. Run the focused resume suite and full gate, retaining the byte-for-byte refusal matrix and config-root independence case.

**Files modified:**

- `cli/src/commands/resume/types.ts` (NEW)
- `cli/src/commands/resume/preflight/resolve-state-root.ts` (NEW)
- `cli/src/commands/resume/preflight/locate-run.ts` (NEW)
- `cli/src/commands/resume/preflight/load-checkpoint.ts` (NEW)
- `cli/src/commands/resume/preflight/require-incomplete.ts` (NEW)
- `cli/src/commands/resume/preflight/revalidate-thread.ts` (NEW)
- `cli/src/commands/resume.ts`

**Verification:** `npm --prefix cli run test -- src/commands/resume.test.ts` exits 0; `npm --prefix cli run check` exits 0; `rg -n 'resolveStateRoot|runDirectoryFor|readCheckpoint|resolveThreadTarget' cli/src/commands/resume.ts` returns no matches.

**Acceptance criteria:**

- `resume.ts` directly sequences state root, exact run location, checkpoint load, incomplete-run validation, and thread identity validation.
- Signal observations remain immediately after run location, after checkpoint load and before completed-run refusal, and after thread revalidation.
- State-only resume is independent of config-root resolution, and no step searches for an alternate run or derives behavior from current pipeline/profile/settings documents.
- Every refusal through these steps preserves checkpoint bytes, acquires no lock, invokes no engine, and retains its diagnostic, stream, and failure code.
- Focused and full gates pass with command-boundary assertions intact.

**Consumes:** Task 1's `CommandDeps`.

**Produces:** `resolveResumeStateRoot`, `locateResumeRun`, `loadResumeCheckpoint`, `requireIncompleteRun`, and `revalidateResumeThread`; validated unchanged checkpoint, state/run paths, and recorded/validated thread identities in `resume.ts`.
