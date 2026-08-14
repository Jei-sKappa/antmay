# Implementation report

Source: spec.md

## Outcome

The reconciled spec was implemented in full. Settlement is decomposed into a gate
orchestrator and one named fold, the three settled record shapes are pinned at
the engine boundary, the architecture guard accounts for the new module, and the
trace comparison now establishes the intended effect-order invariant through one
reproducible command. Nothing is partial or blocked. No commit was made; the
whole change sits in the working tree.

## Changes

**Settlement decomposed.** `cli/src/execution/phases/commit-settlement.ts` is a
new module declaring the closed three-arm `Settlement` union — advanced,
done-pending-queues, stopped — together with the shared `SettlingAttempt` type
moved out of the orchestrator, and exporting `commitSettlement`. Its exhaustive
`switch` returns the settled `AttemptRecord` and the cursor `Transition` the
ending needs; one shared tail then makes the single `commitCursor` call carrying
both transitions, draws the stage event, and produces the return value.

`settleAttempt` in `cli/src/execution/phases/settlement.ts` is now straight-line
gates: the three post-attempt reads, the inline signal-abort guard clause, the
promise gate through `verify-promise.ts`, the Git boundary through `boundary.ts`,
`classifyAttempt`, then one of three `commitSettlement` calls. The four numbered
section comments are gone and the module doc comment carries the gate order as
the single narration of it. The signature is unchanged and `engine.ts` was not
touched. Two pure private helpers were extracted — `stoppedDiagnostics`, which
assembles the stopped path's `WaitingDiagnostics` from a failed outcome, and
`refusedBoundary`, which builds the refused-boundary argument the stopped pause
builder receives — while `terminalResultFrom` and `stageDisposition` stay private
to the orchestrator. `BoundaryOutcome` in `cli/src/execution/pause.ts` became an
exported type so `refusedBoundary` can state its return type.

After `classifyAttempt` the orchestrator makes no `commitCursor` call, emits no
display event, and constructs no ending. Exactly one `ctx.clock()` read per path
is preserved: the violated-promise branch reads and returns, the signal-abort
path reads inside the interruption collaborator, and every remaining path reads
once after the boundary.

**Architecture guard.** The phase-caller table in `cli/src/architecture.test.ts`
gained exactly one row, `execution/phases/commit-settlement.ts` →
`execution/phases/settlement.ts`. No guard was weakened, no assertion removed,
no exemption added; no `phases/settlement/` directory was created and no test
file exists under `phases/`.

**Record shapes pinned.** `cli/src/execution/engine.test.ts` gained a new
advanced-ending regression case asserting the settled record has `result` `done`
and no `pendingFiles` key at all; an attempt-record `pendingFiles` assertion on
the done-pending-queues case; and no-`pendingFiles`-key plus
`failure`-equals-the-governing-reason assertions on the parametrized non-DONE
stopped cases. The validated checkpoint object is the parsed `state.json`
document itself, so `Object.hasOwn` on it asserts the serialized shape.

**Trace comparison made reproducible.** `cli/scripts/trace/compare.mjs` is part of
the repository and `cli/package.json` exposes it as `trace:compare`, outside
`npm run check`. The comparator accepts repeated `--ignore-call` options, removes
each named frame from both sequences, reports its before/after count, and treats
an ignored name absent from both traces as a structure finding. Transcript
normalization removes the nondeterministic Node process ID and the trace driver's
absolute supplied-binary path. `cli/scripts/trace/runtime.ts` writes every event
immediately, so the two scenarios that deliberately use `SIGKILL` lose no buffered
tail. `cli/scripts/trace.mjs` names the comparator alongside the other trace pieces.

The trace comparison for this refactor excludes the removed `settleIntoPause`
orchestration frame and the pure `stageDisposition` and `donePendingQueues`
builders. Calls beneath the removed wrapper remain in the sequence, including the
checkpoint write, display emission, and pause rendering. `decisions.md` DR7 records
that contract, superseding only DR5's unchanged-comparator clause, and `spec.md`
states the exact accepted command and its zero-finding result.

## Verification

- `npm --prefix cli run check` — exit 0; 56 test files and 1209 tests passed,
  followed by a successful build.
- `npm --prefix cli run lint` — exit 0.
- Focused suites — `engine`, `pause`, `recovery`, `recovery-policy`,
  `gitops/boundary`, `architecture`: 6 files and 248 tests passed.
- `npm run demo:all` — 42/42 scenarios passed.
- `node --check scripts/trace/compare.mjs` — exit 0.
- The comparator's absent-exclusion guard was probed with an ignored name present
  in neither trace; it reported a structure finding and exited nonzero.
- A baseline trace was freshly generated from the thread's pre-change `HEAD`
  (`6883dcb`) in an isolated snapshot using the lossless trace runtime. The current
  implementation was traced over the same 42 scenarios. This command exited 0:

  `npm run trace:compare -- temp/trace-baseline-reconciled
  temp/trace-after-reconciled --ignore-call settleIntoPause
  --ignore-call stageDisposition --ignore-call donePendingQueues`

  It reported 0 order findings, 0 transcript findings, and 0 structure findings.
  The ignored counts were `settleIntoPause` 23 → 0, `stageDisposition` 22 → 22,
  and `donePendingQueues` 2 → 2. It reported five newly visible functions —
  `commitSettlement`, `settledBy`, `settledFields`, `refusedBoundary`, and
  `stoppedDiagnostics` — with no relocated functions and no functions no longer
  called after the declared exclusions.

## Deviations and judgment calls

- **No commit was made.** The repository's standing rule — "Never commit unless
  explicitly asked to do so", which the spec's degrees of freedom restate — was
  treated as an explicit Git instruction overriding the implementation skill's
  default per-task commit cadence, and the invocation carried nothing overriding
  it.
- **The trace contract was reconciled before changing its checker.** The user's
  decision is recorded in DR7, and the spec now requires the explicit exclusions,
  environment normalization, lossless event writes, and a zero-finding comparator
  exit. Production settlement code was not contorted to retain the removed wrapper
  or the old evaluation positions of pure builders.
- **"One call site" was read as one literal call expression, not one module.**
  AC-2.3 and the constraint that there be exactly one call site in the settlement
  path cannot mean one module, because the three `commitCursor` calls already sat
  in one module before this change, which would make the constraint vacuous. The
  fold is therefore shaped so its exhaustive switch returns the record and the
  cursor movement and one shared tail performs the single write.
- **AC-2.4 was met as one place rather than one expression.** A stopped ending
  draws `stageStopped` and the other two draw `stageSucceeded` — two display
  methods with different payloads — so a single call expression is not
  constructible without dynamic dispatch. The emission is one contiguous branch
  inside the fold, which is the only thing in the settlement path that draws.
- **`BoundaryOutcome` was exported from `pause.ts`** so the refused-boundary
  helper states its return type instead of restating the shape. Pause assembly
  still happens only in `pause.ts`.
- **The settled records are built per arm rather than from one shared literal**,
  deliberately: each arm ends with `headAfterAttempt` in the position the
  previous code wrote it, so the serialized key order of a settled attempt is
  unchanged as well as its field set.

## Remaining concerns

- `--ignore-call` is intentionally a human-audited exception mechanism: the
  comparator reports every excluded name and count but cannot itself prove that a
  named helper is pure or that an omitted orchestration frame's effectful
  descendants remain sufficient. The exact three exclusions are therefore part
  of this thread's durable decision and spec rather than an implicit local filter.

## Follow-ups

- `launchAttempt` in `cli/src/execution/phases/attempt.ts` carries the same
  violation and is out of scope here by decision; it awaits its own ticket. The
  `phases/` placement criterion this thread settled and the promoted comparator
  are both available to it.
