# Decision Log

## DR1: Split launch into reservation and invocation, joined by a reserved-attempt value

Scope: `cli/src/execution/phases/attempt.ts` and the sub-steps extracted from it

Context: `launchAttempt` is roughly 175 lines organized by two numbered section comments, and the constraint that the harness is contacted only once the checkpoint durably records the attempt and its log exists is carried by that prose rather than by the shape of the code. Two conventions already hold for any decomposition under `cli/src/execution/phases/` and are applied here rather than re-decided: a module under `phases/` earns its place by reaching outside the execution domain — Git, the checkpoint writer, the attempt log, the harness, or the display seam — while a pure transformation of values in hand is a private helper; and a gate whose position in the sequence is itself the safety claim stays inline in the orchestrator, because moving it behind a call hides the one thing the decomposition exists to make legible. The open question was how launch splits under those conventions and how its ordering constraint is carried.

Decision: `launchAttempt` remains the phase the engine drives and becomes a short orchestrator whose body is a reservation call, the pre-launch signal guard, and an invocation call. Two new modules are extracted under `phases/`, each driven from the launch orchestrator alone and each carrying its own row in the architecture guard's phase table naming that orchestrator as its one caller:

- **Reservation** reads the attempt-start `HEAD`, builds the executing `AttemptRecord`, persists it, and only then exclusively creates its log. Both durable-write failure paths are its own: a persistence failure creates no log and prevents the launch, and a log-header failure leaves the durable executing attempt recoverable and reports a fatal checkpoint.
- **Invocation** announces the attempt, renders the prompt, runs the heartbeat, makes the harness call including live-session capture with its provisional checkpoint write, and resolves the session the attempt ended holding.

Each qualifies as a sub-step because it reaches outside the execution domain; neither is justified by length.

The reservation step declares, and is the only producer of, a `ReservedAttempt` value carrying the executing `AttemptRecord` and the attempt log's absolute path — everything invocation needs, since the attempt number, start time, and attempt-start `HEAD` are already fields of that record. The invocation step accepts that value and has no other way to name the attempt, so it derives no identity of its own and cannot be handed a bare stage context. `ReservedAttempt` is plain data whose sole-producer role is stated in its doc comment, in the same construction `LaunchedAttempt` already uses one level down; it is not made nominally unforgeable by a branded field or a private constructor.

The pre-launch signal guard stays inline in the orchestrator between the two calls, so that a signal arriving once the attempt is reserved and its log created finishes the reserved attempt as interrupted without ever contacting the harness. Both numbered section comments are removed and the order they narrated is carried once by the module's own doc comment. Pure helpers stay private to the module that branches on them.

Rationale: The ticket's complaint is that safety-critical ordering is explained in comments instead of expressed in the code, and a boundary value only one step produces is that expression: the invocation step cannot name an attempt it was not handed, which is the ordering constraint restated as a signature. Naming the two effect-reaching regions follows the criterion already in force, and keeping the signal guard between them preserves the property that its position is what establishes. The chief trade-off is the enforcement ceiling: because the value is plain data, the guarantee is that invocation cannot proceed without being handed a reservation, not that a reservation must have happened — the sole legal caller could still construct an executing record by hand. That residual risk is accepted because the architecture guard already restricts the invocation step to one caller, so forgery would require that caller to deliberately assemble an executing `AttemptRecord`, a far more visible act than a misordered statement, and closing it would introduce the only nominally-typed value in a codebase whose execution types are all plain data.

## DR2: Reservation ends by announcing the attempt it reserved

Scope: `cli/src/execution/phases/attempt.ts` and its reservation sub-step

Context: The launch decomposition has to place the `attemptStarted` display emission, which sits ahead of the pre-launch signal guard: an attempt is announced, and only then does the guard decide whether the harness is contacted at all. That emission is also the only seam into the pre-launch signal window — `cli/src/execution/engine.test.ts` reaches it by installing a display whose `attemptStarted` callback aborts the run, and no demo scenario covers that window, since the interruption scenarios abort during a live attempt or between stages.

Decision: The reservation step ends by emitting `attemptStarted`, so the announcement stays ahead of the pre-launch signal guard and the emission order is unchanged. The launch orchestrator draws nothing. `ReservedAttempt` still carries the log's absolute path, because the harness invocation also needs it as the attempt's log file.

Rationale: Every field of the announcement is a reservation output — stage position, harness, model, attempt number, and the absolute path of the log reservation has just created — and the path is only meaningful once that file exists, so the announcement belongs to the step that made it true. Keeping the emission ahead of the guard also preserves the test seam that makes the pre-launch window reachable at all; emitting after the guard would delete the hook and leave a safety-critical window needing a newly invented seam. The trade-off is that the announcement-before-guard order is no longer visible in a single file, which is accepted because the alternative puts a display call into an orchestrator that otherwise states nothing but sequence, and would make reservation hand back the log path solely so its caller could draw with it.

## DR3: Name the live-session capture inside the harness invocation

Scope: `cli/src/execution/phases/attempt.ts` and its harness-invocation sub-step

Context: The harness invocation is around ninety lines and carries no internal section comments, so its internal shape is a separate question from the split itself. One thing in it is non-linear: the live-session capture is a state machine spread across four sites — two mutable locals, a callback that guards against a second capture and starts exactly one direct `run.commit`, a `finally` that awaits that retained promise and warns on failure, and a return that reads the captured session back to resolve which session the attempt held. The heartbeat beside it is symmetric, with no state beyond its interval handle.

Decision: The live-session capture becomes one private helper inside the harness-invocation module. It supplies the `onSessionCaptured` callback, owns the at-most-one-capture guard and the single direct provisional write, awaits that write and warns when it failed, and reports the session captured, so resolving the session the attempt held belongs to the same helper rather than to a free function reading a mutated local. The invocation body then reads as start the heartbeat, invoke, stop the heartbeat, settle the capture, return. The heartbeat stays inline. No further piece of launch is extracted on length grounds.

Nothing here becomes a third module under `phases/`. Reaching outside the execution domain is a necessary condition for a `phases/` module, not a sufficient one: the architecture guard's phase table names steps in the run's order, and a fragment of one step is not such a step even when it writes a checkpoint or draws to the display.

Rationale: State written from inside a callback and read in two later places is the only thing in launch a reader cannot follow top to bottom, and that rather than the line count is what the extraction addresses; naming it turns "at most one provisional write, awaited before settlement" into a property of one small named thing instead of a convention held across four sites. The heartbeat is left alone because a helper wrapping two symmetric lines would be indirection that returns nothing. The trade-off is one closure-returning idiom in a module family that otherwise passes plain data, and a `finally` that still calls the helper, so the teardown ordering is named rather than eliminated.

## DR4: Accept the decomposition on an unedited test suite and a single-exclusion trace comparison

Scope: verification of the launch decomposition

Context: Every invariant launch has to preserve is already pinned by cases in `cli/src/execution/engine.test.ts`: an attempt-start `HEAD` failure refusing before an attempt is reserved, a pre-launch checkpoint write failure creating no log and launching nothing, a log-header failure leaving a recoverable executing attempt, a pre-launch signal finishing the reserved attempt interrupted with no harness call, and the session-capture paths covering retention across outcomes, the absence of an invented session on pre-launch interruption, the outcome-only fallback that skips the provisional write, the single warning on provisional failure, and the outcome session winning at settlement. The trace comparator is part of the repository as `npm run trace:compare` and accepts audited `--ignore-call` exclusions. The question is what evidence accepts this thread's change.

Decision: The change adds no test coverage, and its central claim is that **no test file is edited**: a case needing adjustment to accommodate the move is the signal that behavior moved with the code, not an expected cost of the refactor. The accepted evidence is `npm --prefix cli run check` passing, `npm run lint` passing, `npm run demo:all` reporting every scenario green, the engine and architecture suites run focused, and a trace comparison against a baseline generated freshly from this thread's pre-change `HEAD` reporting zero order, transcript, and structure findings under exactly one exclusion — `--ignore-call renderStagePrompt`.

That single exclusion is justified because the prompt render belongs to the harness call it feeds and therefore moves into the invocation step, which places it after the pre-launch signal guard where it currently runs before. The function is pure, so nothing observable changes, but its evaluation point swaps with `signalReason` on every traced attempt. Expected non-findings the comparison should report instead: three newly visible names — the reservation step, the invocation step, and the capture helper — and three relocated pure helpers, `nextAttemptNumber`, `errorMessage`, and `resolveAttemptSession`.

One rule follows for the implementation: no instrumented name the baseline carries may disappear. In particular `resolveAttemptSession` stays a named function called at the same point, moved into the module holding the capture helper rather than inlined into it, since inlining would turn a pure relocation into a sequence difference for no gain.

Rationale: The existing cases already cover every ordering and session path launch owns, so writing new ones would duplicate coverage while the property actually at risk — that no cross-module effect changed order — is exactly what the committed comparator judges. Holding the suite unedited is the strongest claim available here and is cheap to check, whereas a suite that had to be adjusted would leave no way to tell a mechanical accommodation from a behavior change. Keeping the exclusion set to one name, and requiring every other existing name to survive, is what keeps the comparison auditable: the mechanism cannot itself prove a named helper pure, so each exclusion is a human-audited exception rather than a filter that quietly grows.

## DR5: Declare the launch phase's outward types at the phase's front door

Scope: `cli/src/execution/phases/attempt.ts`

Context: `LaunchOutcome` is produced by the launch orchestrator and stays with it, but `LaunchedAttempt` is produced by the extracted harness-invocation step while its consumers sit outside launch altogether: the engine reads the launched attempt off the outcome and hands it to settlement, whose signature names the type. The settlement decomposition's sub-step declares the types it owns, but those never leave that phase, so it does not settle where a phase's published output type belongs.

Decision: `cli/src/execution/phases/attempt.ts` declares both `LaunchOutcome` and `LaunchedAttempt`, and the harness-invocation step type-imports `LaunchedAttempt` from it to state its return type. Settlement and the engine keep naming `attempt.ts` and learn nothing about launch having internal parts. The invocation step's role as the producer is stated in the type's doc comment rather than carried by file placement.

Rationale: `LaunchedAttempt` is the shape launch promises the rest of the run, which makes it contract rather than implementation, and a phase's contract belongs with the module the engine drives. Declaring it in the sub-step would have settlement reach past the phase boundary into one of launch's internals for a type it merely consumes, and re-exporting it through `attempt.ts` would add a hop whose only purpose is to undo the placement. The trade-off is a type-only reference from a sub-step back to its own caller; it invokes nothing at runtime, and the architecture guard counts only non-type-only references when deciding which module drives a phase, so it neither creates a cycle nor a second driver.

## DR6: Fence the decomposition to launch's internal shape

Context: The thread's boundaries were not stated when it opened, and the split is now specified tightly enough that the ways it could grow are visible. Two facts bound it from outside: `launchAttempt`'s signature and outcome type are unchanged, so the engine loop has no reason to be edited; and every other module under `cli/src/execution/phases/` is a fraction of launch's size, so no function in the execution domain carries this shape once launch is decomposed.

Decision: The following are out of scope, each for the reason given.

- **Renaming `attempt.ts` or the `launchAttempt` entry point.** It pairs with `settlement.ts` as the loop's two attempt phases, and a rename would move the engine's import and the architecture guard's phase row for no reading gain.
- **Editing `cli/src/execution/engine.ts`.** The orchestrator's signature and outcome type are unchanged, so the loop is untouched; a loop edit turning out to be necessary means something changed that this thread excluded.
- **A `phases/attempt/` subfolder.** A directory holding an orchestrator and two sub-steps adds nesting and conveys nothing.
- **Heartbeat and session-capture semantics.** The interval source and its `unref`, the deliberate direct `run.commit` in place of `commitCursor`, the warn-rather-than-fail response to a failed provisional write, the at-most-one-capture guard, and the outcome session winning over the live capture are all preserved exactly. The capture is named, not changed.
- **What the checkpoint records and everything the terminal draws.** No field, wording, payload, or emission order changes; the announcement remaining ahead of the pre-launch signal guard is one case of that.
- **`cli/src/execution/interruption.ts`.** The pre-launch path keeps calling `settleInterrupted` with the same arguments, including the empty pending-files evidence.
- **Any further extraction justified by length alone**, in launch or in a neighbouring phase.

`MS_PER_SECOND` is not an exception to the above: it travels with the heartbeat into the invocation module, which is the only thing that reads it.

Rationale: Each fence marks a change that is adjacent, cheap to make, and would dilute the evidence the thread rests on — an unedited test suite and a trace comparison carrying one audited exclusion. A rename or a loop edit would enlarge the diff without changing what a reader learns; a semantic change to the heartbeat or the capture would put a behavior change inside a refactor whose whole claim is that behavior did not move; and admitting length as a reason to extract would reopen the criterion that decides what earns a module.
