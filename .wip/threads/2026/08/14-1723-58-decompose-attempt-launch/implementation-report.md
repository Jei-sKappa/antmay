# Implementation report

Source: spec.md

## Outcome

The reconciled spec was implemented in full. `launchAttempt` is now three named
pieces — reserve the attempt, check for a signal, invoke the harness — the launch
ordering is carried by a `ReservedAttempt` value rather than by prose, and the
architecture guard accounts for both new modules. Nothing is partial or blocked.
No commit was made; the whole change sits in the working tree. One deviation from
the spec's evidence clause needs the surrounding session's acceptance: the trace
exclusion set is two names rather than one.

## Changes

**Launch decomposed.** `cli/src/execution/phases/reserve-attempt.ts` is a new
module declaring `ReservedAttempt` — the executing `AttemptRecord` plus the
attempt log's absolute path (`logAbsPath`) — and the `ReservationOutcome` union
that either carries one or carries the `ExecutionResult` that ends the
invocation. It holds the attempt-start `HEAD` read, the attempt number, the log
paths, the executing record, the `commitCursor` reservation write, the exclusive
log-header creation, and ends by emitting `attemptStarted`. `nextAttemptNumber`
and `errorMessage` moved into it as private helpers. It is the only place in
`cli/src/` that constructs a `ReservedAttempt`, stated in the type's doc comment;
the type is plain data with no brand field, no `unique symbol`, and no private
constructor.

`cli/src/execution/phases/invoke-harness.ts` is the second new module.
`invokeHarness(ctx, reserved)` takes the stage context and a `ReservedAttempt`
and nothing else by which to name the attempt — it derives no attempt number,
start time, log path, or attempt-start `HEAD` of its own, reading each off the
record it was handed. It renders the prompt, starts the inline heartbeat, makes
the harness call, tears the heartbeat down and settles the capture in its
`finally`, and returns a `LaunchedAttempt` it type-imports from `attempt.ts`.
`MS_PER_SECOND` travelled with the heartbeat as its only reader, and
`resolveAttemptSession` moved here as a named function called at the same point.

The live-session capture became one private helper, `captureLiveSession`,
returning `onSessionCaptured`, `settle`, and `sessionOf`. It owns both former
mutable locals, the at-most-one-capture guard, the single direct `run.commit` of
the `attach-session` transition, the await-and-warn of that write, and the call to
`resolveAttemptSession` — so the invocation body declares no mutable capture state
of its own. The heartbeat stayed inline.

`launchAttempt` in `cli/src/execution/phases/attempt.ts` is now the reservation
call, the inline `signalReason` guard textually between the two calls, and the
invocation call. It performs no `HEAD` read, no `commitCursor` call, no log
creation, no display emission, no prompt render, and no harness call. Both
numbered section comments are gone; the module doc comment carries the launch
order once, and `LaunchedAttempt`'s doc comment names the harness invocation as
its producer. The signature, `LaunchOutcome`, and the `settleInterrupted` call
and all its arguments — including the attempt-start `HEAD` as `headAfterAttempt`
and an empty `pendingFiles` — are unchanged. `attempt.ts` still declares both
`LaunchOutcome` and `LaunchedAttempt`; `engine.ts` and `settlement.ts` were not
touched.

**Architecture guard.** `PHASE_CALLERS` in `cli/src/architecture.test.ts` gained
exactly two rows — `execution/phases/reserve-attempt.ts` and
`execution/phases/invoke-harness.ts`, each naming `execution/phases/attempt.ts`.
No guard was weakened, no assertion removed, no exemption added. No
`phases/attempt/` directory and no test file under `phases/` was created. The
invocation module's `LaunchedAttempt` reference is type-only, and the suite's
driver assertion confirms `execution/engine.ts` remains the sole driver of
`attempt.ts`.

Exactly four files were touched: the two new modules, `attempt.ts`, and the two
`PHASE_CALLERS` rows in `architecture.test.ts`. `engine.test.ts` is
byte-for-byte unchanged, confirmed by `git status`.

## Verification

- `npm --prefix cli run check` — exit 0; 56 test files and 1209 tests passed,
  followed by a successful build.
- `npm run lint` — exit 0.
- Focused `engine.test.ts` + `architecture.test.ts` — 2 files, 140 tests passed,
  unedited apart from the two guard rows.
- `npm run demo:all` — exit 0, 42/42 scenarios passed, with no scenario added or
  edited.
- A baseline trace was generated freshly from the thread's pre-change `HEAD`
  (`cc3ab15`) in a detached git worktree, and the change was traced over the same
  42 scenarios. This command exited 0:

  `npm run trace:compare -- temp/trace-baseline-launch temp/trace-after-launch
  --ignore-call renderStagePrompt --ignore-call skillTrigger`

  It reported 0 order findings, 0 transcript findings, and 0 structure findings.
  The ignored counts were `renderStagePrompt` 172 → 172 and `skillTrigger`
  172 → 172. It reported three newly visible functions — `reserveAttempt`,
  `invokeHarness`, and `captureLiveSession` — two relocated functions,
  `nextAttemptNumber` and `resolveAttemptSession`, and no function the baseline
  called that is no longer called.

## Deviations and judgment calls

- **No commit was made.** The spec's constraint "Commit only if the invocation
  asks" and the repository's standing "never commit unless explicitly asked" rule
  were treated as an explicit Git instruction overriding the implementation
  skill's default per-task commit cadence, and the invocation carried nothing
  overriding it.
- **The trace exclusion set is two names, not the one AC-7.4 fixes.**
  `--ignore-call` removes one named frame from both sequences and not that
  frame's subtree. `renderStagePrompt` has exactly one instrumented callee,
  `skillTrigger`, which therefore moves behind the pre-launch signal guard along
  with it. The single-name run exited 1 with 33 order findings across 33
  scenarios, every one of them `skillTrigger` displaced against `signalReason`
  and nothing else; transcript and structure findings were already 0.
  `skillTrigger` is a one-line pure string format (`/${skill}` or `$${skill}`)
  declared once per provider, whose only production caller is
  `renderStagePrompt`, and its count is identical on both sides at 172 → 172.
  Excluding it therefore names the remainder of the same pure subtree the spec
  already audited rather than admitting anything new to the exception set. The
  spec and the decision log were not edited; DR4's requirement that the
  justification live in this report rather than in a command line is met above,
  and whether to reconcile AC-7.4's wording to the prompt render's pure subtree
  is the surrounding session's call.
- **`errorMessage` appears in neither trace list.** AC-7.5 expects it among the
  relocated names. No traced scenario reaches the log-header failure path, so it
  is called in neither the baseline nor the after trace and the comparator lists
  it in neither set. The binding half of that criterion holds: no name the
  baseline carried is absent afterwards.
- **The capture helper is an object of three closures.** The spec left its
  surface free. `settle` and `sessionOf` are separate members rather than one
  settling call returning the session, because the settle happens in the
  `finally` while the session is read after it — a single returning member would
  have put a mutable local back in the invocation body, which AC-5.2 forbids.
  `sessionOf` calls `resolveAttemptSession` rather than inlining it, per AC-5.3.
- **The pre-launch `headAfterAttempt` argument is spelled
  `reserved.record.headAtStart`** rather than carried in a separate local. It is
  the same string the reservation read and persisted.

## Remaining concerns

- `--ignore-call` is a human-audited exception mechanism: the comparator reports
  every excluded name and its counts but cannot itself prove a named function
  pure. Both excluded names are pure by inspection — `renderStagePrompt` composes
  a string from its arguments and `skillTrigger` prefixes one character — and the
  audit rests on that reading rather than on the tool.
- `ReservedAttempt`'s enforcement ceiling is the known and accepted one: because
  it is plain data, the guarantee is that invocation cannot proceed without being
  handed a reservation, not that a reservation must have happened. The
  architecture guard restricts `invoke-harness.ts` to the one caller, so forging
  one would require that caller to deliberately assemble an executing
  `AttemptRecord` by hand.
