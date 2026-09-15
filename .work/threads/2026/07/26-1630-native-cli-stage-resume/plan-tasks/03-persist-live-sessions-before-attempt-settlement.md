### Task 3: Persist live sessions before attempt settlement

**Objective:** Persist the first live session on an executing attempt without racing settlement, then retain the final session on every post-launch settlement path.

**Input / context:** Start from the harness callback/outcome surface produced by Task 1 and the attempt schema produced by Task 2. Implement `spec.md` FR-2 according to `decisions.md` DR13, DR16, DR21, and DR22: one provisional write begins at live capture, later writes await it, early failure warns and continues, and settlement persistence remains authoritative and fatal on failure.

**Steps:**

1. Add an optional checkpoint-writer dependency to `RunnerContext` (for example `persistCheckpoint?: typeof writeCheckpoint`) and default it to the production atomic `writeCheckpoint`, so ordering and failure behavior can be controlled mechanically in runner tests without changing production callers.
2. After the initial executing checkpoint succeeds and before invoking the harness, initialize per-attempt live-session state and one retained provisional-write promise.
3. Pass `onSessionCaptured` to the invoker. On the first reported non-empty ID, record it in memory and start exactly one provisional persistence operation that replaces only the current final attempt with an `executing` copy carrying `agentSession: { id }`; ignore later callback invocations.
4. Do not await from the synchronous callback. Retain the provisional operation and, once `invoke()` resolves or rejects, await it before any interruption or ordinary settlement checkpoint write can begin.
5. If the provisional operation fails, emit exactly one clear `display.warn` message and continue processing the harness outcome. Add no retry loop, cancellation, durable warning field, or special waiting reason.
6. Treat the settlement-time `outcome.session` as final, falling back to the live-captured value only if the outcome omitted it. Attach that session to `done`, `waiting`, idle-timeout, provider-error, and post-launch interrupted records; keep it absent on a pre-launch interruption that never invoked the harness.
7. Ensure an outcome-only fallback session causes no provisional write and is persisted only with the settlement.
8. Extend `cli/src/runner/runner.test.ts` with a controlled writer/deferred-promise test proving settlement persistence does not start while the provisional write is pending and that the final `state.json` remains settled after both complete.
9. Add runner coverage proving one provisional write across repeated callbacks, preservation of all other executing checkpoint state, session retention for every settlement category, no provisional write for fallback-only capture, recoverable early-write failure with one warning, successful settlement after that failure, and unchanged fatal behavior when the final write fails.

**Files modified:**

- `cli/src/runner/runner.ts`
- `cli/src/runner/runner.test.ts`

**Verification:**

1. `npm --prefix cli run test -- src/runner/runner.test.ts`
2. `npm --prefix cli run check`

**Acceptance criteria:**

- The first live callback starts exactly one atomic checkpoint write while the attempt and run remain `executing`.
- Repeated callbacks start no additional provisional writes.
- No settlement checkpoint write overlaps the retained provisional write.
- After settlement, the checkpoint contains the settled condition/result and the final session rather than stale executing state.
- Completed, provider-error, idle-timeout, and post-launch interruption records retain the session; pre-launch interruption does not invent one.
- A fallback session delivered only on the outcome skips provisional persistence and appears at settlement.
- One failed provisional write produces one warning, does not abort the harness, and is followed by the ordinary settlement write carrying the session.
- Final checkpoint failure continues through the runner's existing fatal path.

**Consumes:** `AttemptRequest.onSessionCaptured?: (session: { id: string }) => void`; `AttemptOutcome.session?: { id: string }`; `AttemptRecord.agentSession?: { id: string }`.

**Produces:** durably serialized provisional and settlement-time `agentSession` persistence for each post-launch attempt.
