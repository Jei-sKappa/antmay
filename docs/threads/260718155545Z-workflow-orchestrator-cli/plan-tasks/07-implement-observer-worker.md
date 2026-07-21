### Task 7: Implement reconciliation and the private observer worker

**Objective:** Observe one registered run in a detached private process, reconcile transcript and endpoint evidence honestly, and finalize its registry record exactly once.

**Input / context:** Atomic registry store from Task 3, transcript evidence from Task 5, and adapter liveness from Task 6; `spec.md` §§3.1–3.3 and 4.2 plus FR-5, FR-6, and FR-8; `decisions.md DR15`, `decisions.md DR18`, `decisions.md DR21`, and `decisions.md DR22`.

**Steps:**
1. Add core reconciliation logic that prioritizes reliable structured transcript outcomes, keeps a run active on indeterminate evidence, and yields `unknown` only after positive ended/absent evidence plus a final transcript reconciliation.
2. Implement `reconcileRun(runId)` in the CLI to load one record, read its harness transcript, query its execution adapter, atomically apply any terminal transition, and otherwise update health/diagnostics without touching the pane.
3. Implement a private `worker.ts` entry point that accepts only a package-internal run ID contract, monitors that one run with bounded backoff, writes heartbeat/lease data, and exits after a terminal or unknown classification.
4. Package `dist/worker.js` alongside the CLI without adding it to Commander or `bin`, and add a detached worker launcher that uses the current Node executable, detached stdio, and an `unref()`-style parent-independent lifetime.
5. Implement stale/degraded worker detection and `ensureObserver(runId)` so a later status reconciliation can restore observation without creating another run or regressing state.
6. Ensure every worker and status race is idempotent, and ensure terminalization stops only the observer—never closing, exiting, sending input to, or mutating the retained harness pane.
7. Add tests for worker parent survival, one-run scope, heartbeats, stale recovery, duplicate reconciliation, transient transcript/adapter failures, positive ended-without-outcome, terminal outcomes, and retained-pane non-mutation.

**Files modified:**
- `packages/core/src/reconcile.ts` (NEW)
- `packages/core/src/index.ts`
- `packages/core/test/reconcile.test.ts` (NEW)
- `packages/cli/package.json`
- `packages/cli/src/observer/reconcile-run.ts` (NEW)
- `packages/cli/src/observer/worker-launcher.ts` (NEW)
- `packages/cli/src/observer/ensure-observer.ts` (NEW)
- `packages/cli/src/worker.ts` (NEW)
- `packages/cli/test/reconcile-run.test.ts` (NEW)
- `packages/cli/test/worker-lifecycle.test.ts` (NEW)
- `packages/cli/test/ensure-observer.test.ts` (NEW)

**Verification:** `bun run test -- packages/core/test/reconcile.test.ts packages/cli/test/reconcile-run.test.ts packages/cli/test/worker-lifecycle.test.ts packages/cli/test/ensure-observer.test.ts`, `bun run build`, `bun run typecheck`, and `bun run check` all exit 0; `test -f packages/cli/dist/worker.js` succeeds; `node packages/cli/dist/index.js --help | rg -q worker` exits 1.

**Acceptance criteria:**
- Each worker observes only its registered run, survives the parent CLI, records health, and exits after terminal/unknown finalization.
- Reliable transcript evidence produces immutable DONE/BLOCKED/REFUSED records with complete reasons.
- Indeterminate evidence leaves the run active with degraded health; only positive endpoint end plus final no-outcome reconciliation produces unknown.
- Repeated worker/status reconciliation yields one terminal record and never regresses it.
- Terminal detection leaves the harness pane and process unmodified.
- The worker is packaged privately and absent from public CLI help.

**Consumes:** `FilesystemRegistryStore`, `readTranscriptEvidence(run)`, `ExecutionAdapter` liveness, and core terminal transition helpers from Tasks 2–6.

**Produces:** core `reconcileEvidence()`; CLI `reconcileRun(runId)`, private `dist/worker.js`, `launchObserver(runId)`, and `ensureObserver(runId)`.
