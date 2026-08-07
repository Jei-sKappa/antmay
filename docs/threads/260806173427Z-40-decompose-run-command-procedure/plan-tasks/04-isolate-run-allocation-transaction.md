### Task 4: Isolate the new-run allocation transaction

**Objective:** Make `commands/run/allocate.ts` the transactional owner of new-run identity, lock, under-lock queue evidence, directory creation, and initial checkpoint persistence.

**Input / context:** Tasks 1–3's prepared and safety-checked run facts; `spec.md`; `decisions.md DR4` and `decisions.md DR6`; allocation-race and engine-handoff coverage in `run.test.ts`; checkpoint-writer guards in `architecture.test.ts`.

**Steps:**

1. Create `commands/run/allocate.ts` exporting `allocateRun` and explicit input, success, and refusal types. Success returns run directory, initial checkpoint, and still-held lock together; refusals contain no exit code or renderer.
2. Move canonical workspace resolution and candidate generation into `allocateRun`, preserving clock and random-ID defaults.
3. Implement one candidate loop: acquire the candidate lock, rescan both queues under it, create that candidate directory, release and restart on collision, and repeat lock plus queue checks for every new ID.
4. Construct and write the initial `ready` checkpoint only after directory creation, preserving every field and optional `fromStage` exactly.
5. Release the lock on queue failure, pending files, collision, and checkpoint-write failure. Preserve the existing durable directory after a write failure; transfer lock ownership only on success.
6. Add a narrowly run-specific injectable initial-checkpoint writer to `RunDeps` so the command suite can deterministically cover write failure while `allocateRun` still owns the call.
7. Replace inline allocation in `run.ts` with one `allocateRun` call. Keep refusal prose, the signal checks on either side, startup, one allocated engine entry, result mapping, and successful-lock cleanup in `run.ts`.
8. Add command regressions for a post-allocation signal, initial-checkpoint write failure, and thrown engine failure, proving exact checkpoint/directory, harness, diagnostic, and lock effects.
9. Update architecture assertions so `commands/run/allocate.ts` owns the allocation-time checkpoint write and `updatedAt`; retain `execution/run-state.ts` as the post-allocation owner.
10. Run focused run/architecture tests and the full gate.

**Files modified:**

- `cli/src/commands/run/allocate.ts` (NEW)
- `cli/src/commands/run/types.ts`
- `cli/src/commands/run.ts`
- `cli/src/commands/run.test.ts`
- `cli/src/architecture.test.ts`

**Verification:** `npm --prefix cli run test -- src/commands/run.test.ts src/architecture.test.ts` exits 0; `npm --prefix cli run check` exits 0; `rg -n 'writeCheckpoint|createRunDirectory|acquireWorkspaceLock|resolveCurrentCheckoutWorkspace' cli/src/commands/run.ts` returns no matches.

**Acceptance criteria:**

- `allocateRun` owns canonical workspace, candidate ID, lock, locked queue scan, directory creation, checkpoint construction, and initial persistence.
- Collision releases the old lock and repeats lock plus queue checks for the fresh candidate.
- Queue failures create no directory; all post-lock failures release; write failure preserves baseline directory state without a held lock.
- Success returns `runDir`, exact persisted `checkpoint`, and `lock` together; refusals contain neither exit nor executable presentation.
- `run.ts` retains both signal checkpoints, one allocated engine handoff, identical result mapping, and cleanup on signals, results, and throws.
- Focused and full gates pass with the updated writer/timestamp ownership guard.

**Consumes:** Task 3's fully prepared allocation facts and `RunDeps.generateId`.

**Produces:** `allocateRun(...)`; its `{ runDir, checkpoint, lock }` success; the initial-writer seam on `RunDeps`; a thin allocation-to-engine sequence in `run.ts`.
