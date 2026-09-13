# Decompose attempt launch into the named steps its section comments stand in for

## Intended outcome

`launchAttempt` in `cli/src/execution/phases/attempt.ts` states the order of a
launch by its shape instead of by prose. After this change the phase reads as
three things — reserve the attempt, check for a signal, invoke the harness — and
the constraint that the harness is contacted only for an attempt the checkpoint
durably records is expressed in a signature rather than explained in a comment.
Nothing a user observes changes: no persisted field, no terminal line, no
ordering, no exit code.

## Context

`launchAttempt` is roughly 175 lines inside a 247-line file, organized by two
numbered section comments — `// 1. Attempt setup` and `// 2. Invoke`.
`cli/AGENTS.md` states the rule this violates: a function long enough to need
internal section comments is a set of collaborators that has not been named yet.

The ordering inside it is safety-critical, and those comments plus the prose
beside them are what currently carry it. The attempt-start `HEAD` is read first.
The executing attempt is persisted *before* its log is created, so a persistence
failure creates no log and prevents the launch. A log-header failure leaves the
durable executing attempt recoverable and reports a fatal checkpoint. A signal
arriving after the attempt is reserved and its log created, but before the
harness launches, finishes the reserved attempt as interrupted without ever
invoking the harness.

This is the second instance of one problem. The settlement half of the same
engine step pair was decomposed first and deliberately scoped to settlement
alone, so that its trace-comparison verification covered one safety-critical
ordering at a time. Two conventions it settled are in force here and are applied
rather than re-decided: a module under `cli/src/execution/phases/` earns its
place by reaching outside the execution domain — Git, the checkpoint writer, the
attempt log, the harness, or the display seam — while a pure transformation of
values in hand is a private helper; and a gate whose position in the sequence is
itself the safety claim stays inline in the orchestrator. It also left behind the
committed trace comparator this thread's evidence rests on.

No defect is known. Launch behaves correctly; what it lacks is a structure that
states its order without relying on prose to do it.

The settled decisions this spec encodes are recorded in `decisions.md` as DR1
through DR6 and are cited inline below where each becomes operative.

## Scope

The internal shape of one execution phase: `cli/src/execution/phases/attempt.ts`,
the two sub-step modules extracted from it, and the two rows they add to the
architecture guard's phase table.

### Out of scope

DR6 fences the thread to launch's internal shape; each exclusion below is that
fence, or the decision cited beside it:

- **Renaming `attempt.ts` or the `launchAttempt` entry point.** It pairs with
  `settlement.ts` as the loop's two attempt phases; a rename would move the
  engine's import and the guard's phase row for no reading gain.
- **Editing `cli/src/execution/engine.ts`.** The orchestrator's signature and
  outcome type are unchanged, so the loop is untouched. A loop edit turning out
  to be necessary means something changed that this thread excluded.
- **A `phases/attempt/` subfolder.** A directory holding an orchestrator and two
  sub-steps adds nesting and conveys nothing.
- **Heartbeat and session-capture semantics.** The interval source and its
  `unref`, the deliberate direct `run.commit` in place of `commitCursor`, the
  warn-rather-than-fail response to a failed provisional write, the
  at-most-one-capture guard, and the outcome session winning over the live
  capture are preserved exactly. The capture is named, not changed (DR3).
- **What the checkpoint records and everything the terminal draws.** No field,
  wording, payload, or emission order changes.
- **`cli/src/execution/interruption.ts`.** The pre-launch path keeps calling
  `settleInterrupted` with the same arguments.
- **Any further extraction justified by length alone**, in launch or in a
  neighbouring phase.
- **New test coverage and new demo scenarios.** No rendering is added or
  changed, and every invariant launch owns is already pinned (DR4).
- **`cli/README.md` and the `AGENTS.md` files.** The stage catalog, target
  resolution, artifact-state interpretation, and stage prerequisites are
  untouched, so the published stage-support table cannot move; the module layout
  description in `cli/AGENTS.md` states that each step is one module under
  `phases/` driven from one caller, which stays true and enumerates no modules.

## Target shape

### The orchestrator

`launchAttempt` keeps its signature, its `LaunchOutcome` return type, and its
place as the phase the engine drives. Its body becomes a reservation call, the
pre-launch signal guard, and an invocation call (DR1). Both numbered section
comments are removed, and the order they narrated is carried once by the module's
own doc comment.

The pre-launch signal guard stays inline here, between the two calls, because its
position is the safety claim it establishes (DR1). It keeps calling
`settleInterrupted` with the same arguments, including the attempt-start `HEAD`
as `headAfterAttempt` and an empty `pendingFiles` evidence list.

`attempt.ts` declares both `LaunchOutcome` and `LaunchedAttempt` (DR5). The
engine and `settlement.ts` keep naming `attempt.ts` and learn nothing about
launch having internal parts. That the invocation step is what produces a
`LaunchedAttempt` is stated in the type's doc comment rather than carried by
file placement (DR5).

### Reservation

One new module under `phases/`, driven from the launch orchestrator alone. It:

1. reads the attempt-start `HEAD`, returning a refusal when that read fails;
2. computes the next attempt number and the attempt's log paths, and builds the
   executing `AttemptRecord`;
3. persists that record through `commitCursor`, returning the write's failure
   result when it fails;
4. only then exclusively creates the attempt log with its header, returning a
   fatal checkpoint result when that fails;
5. ends by emitting `attemptStarted` (DR2).

It declares and is the only producer of `ReservedAttempt`, carrying the executing
`AttemptRecord` and the attempt log's absolute path — everything invocation
needs, since the attempt number, start time, and attempt-start `HEAD` are already
fields of that record. `ReservedAttempt` is plain data whose sole-producer role is
stated in its doc comment; it is not made nominally unforgeable by a branded
field or a private constructor (DR1).

Announcing the attempt belongs here because every field of that line is a
reservation output — stage position, harness, model, attempt number, and the
absolute path of the log it has just created — and because that emission is the
only seam through which a test reaches the pre-launch signal window (DR2).

### Harness invocation

One new module under `phases/`, driven from the launch orchestrator alone,
accepting the stage context and a `ReservedAttempt` and nothing else by which to
name the attempt (DR1). It renders the prompt, starts the heartbeat, makes the
harness call, stops the heartbeat and settles the session capture in its
`finally`, and returns a `LaunchedAttempt`. It type-imports `LaunchedAttempt`
from `attempt.ts` (DR5).

The live-session capture becomes one private helper in this module (DR3). The
helper supplies the `onSessionCaptured` callback, owns the at-most-one-capture
guard and the single direct provisional write, awaits that write and warns when
it failed, and reports the session captured — so resolving which session the
attempt held belongs to the same helper rather than to a free function reading a
mutated local. `resolveAttemptSession` stays a named function called at the same
point rather than being inlined (DR4). The heartbeat stays inline, and
`MS_PER_SECOND` travels with it into this module as its only reader.

The prompt render moves here, because it is the harness call's input. That places
it after the pre-launch signal guard, where it currently runs before; the function
is pure, so nothing observable changes.

### The architecture guard

`cli/src/architecture.test.ts` gains exactly two rows in `PHASE_CALLERS`, one per
new module, each naming `execution/phases/attempt.ts` as its one caller (DR1). No
guard is weakened, no assertion removed, no exemption added. No test file is
created under `phases/`.

Nothing extracted here becomes a third `phases/` module. Reaching outside the
execution domain is a necessary condition for such a module, not a sufficient
one: the phase table names steps in the run's order, and a fragment of one step
is not such a step even when it writes a checkpoint or draws to the display
(DR3).

> Read together, DR1 and DR4 admit one consistent reading of "no test file is
> edited": the two phase-table rows DR1 requires are the sole test-file edit in
> the change, and DR4's unedited-suite claim governs every behavioral test.

## Preserved behavior

Every observable behavior below holds unchanged after the change, and each is
already pinned by a named case in `cli/src/execution/engine.test.ts`.

- An attempt-start `HEAD` read failure refuses the invocation **before** any
  attempt is reserved: no checkpoint write, no log, no harness call — "refuses an
  attempt-start HEAD failure before reserving an attempt".
- A failed reservation write creates no log and launches nothing — "creates no
  log and launches nothing when the pre-launch checkpoint write fails".
- A log-header failure reports a fatal checkpoint with the message
  `Failed to initialize the attempt log: <error>` and leaves the durable
  executing attempt recoverable — "leaves a recoverable executing attempt when
  the log header cannot be written".
- A signal arriving after reservation and its log, but before the harness call,
  finishes the reserved attempt as interrupted and makes no harness call —
  "finishes the reserved attempt interrupted when a signal arrives before
  launch" and "does not invent a session on pre-launch interruption".
- The live-session paths are unchanged: a session is retained across completed,
  provider-error, idle-timeout, and post-launch interruption outcomes; an
  outcome-only fallback session skips the provisional write; a failed provisional
  write warns exactly once and does not stop the attempt; a settlement checkpoint
  failure stays fatal after a successful provisional write; and the outcome's
  session wins over the live-captured value.
- The harness request is byte-identical in every field: harness, model, prompt,
  the stage payload including its attempt number, idle timeout,
  `dangerouslySkipPermissions`, execution workspace, log file path, the event
  callback, and the signal.
- The `attemptStarted` payload and its position ahead of the pre-launch guard are
  unchanged, as is every other terminal emission and its order.

## Constraints

- **`npm --prefix cli run check` must pass** — typecheck, tests, and build. The
  CLI's pre-release freedom licenses redesign, never a broken gate.
- **`npm run lint` must pass.** The invocation step keeps a retained promise
  awaited in a `finally`; type-aware promise safety is exactly what that lint
  job exists to judge.
- **No new dependency**, and no change to the sole runtime dependency.
- **The trace comparator is a developer tool outside `npm run check`** and stays
  there.
- **Commit only if the invocation asks.** The repository rule stands: never
  commit unless explicitly asked, which overrides any default per-task commit
  cadence.
- **Follow the existing `phases/` conventions**: one purpose per file, plain data
  passed between modules, pure helpers private to the module that branches on
  them (DR1), and doc comments that state contracts and rationale rather than
  narrating sections.

## Acceptance criteria

### FR-1 — Launch is three named pieces

- **AC-1.1** `launchAttempt`'s body consists of the reservation call, the
  pre-launch signal guard, and the invocation call; it performs no `HEAD` read,
  no `commitCursor` call, no log creation, no display emission, no prompt render,
  and no harness call itself. (DR1)
- **AC-1.2** No numbered section comment remains in `attempt.ts` or in either new
  module, and `attempt.ts`'s doc comment states the launch order once. (DR1)
- **AC-1.3** Exactly two modules are added under `cli/src/execution/phases/`; no
  `phases/attempt/` directory and no test file under `phases/` is created.
  (DR1, DR6)
- **AC-1.4** `PHASE_CALLERS` in `cli/src/architecture.test.ts` gains exactly two
  rows, each mapping a new module to `execution/phases/attempt.ts`, and the
  architecture suite passes with no assertion removed, weakened, or exempted.
  (DR1)

### FR-2 — The launch ordering is carried by a type

- **AC-2.1** The invocation step's exported entry point accepts the stage context
  and a `ReservedAttempt`, and has no other parameter or import by which to name
  the attempt; it derives no attempt number, start time, log path, or
  attempt-start `HEAD` of its own. (DR1)
- **AC-2.2** `ReservedAttempt` is declared by the reservation module and carries
  the executing `AttemptRecord` and the attempt log's absolute path; the
  reservation module is the only place in `cli/src/` that constructs one. (DR1)
- **AC-2.3** `ReservedAttempt` is plain data: no `unique symbol` field, no brand
  field, and no private constructor anywhere in the change. (DR1)

### FR-3 — Reservation preserves both durable-write orderings

- **AC-3.1** The named case "refuses an attempt-start HEAD failure before
  reserving an attempt" passes unedited.
- **AC-3.2** The named case "creates no log and launches nothing when the
  pre-launch checkpoint write fails" passes unedited.
- **AC-3.3** The named case "leaves a recoverable executing attempt when the log
  header cannot be written" passes unedited, and the fatal message text is
  unchanged.
- **AC-3.4** The reservation step emits `attemptStarted` as its final action,
  with the same payload fields, before returning. (DR2)

### FR-4 — The pre-launch signal guard keeps its position

- **AC-4.1** The `signalReason` check appears in `launchAttempt` itself,
  textually between the reservation call and the invocation call, and in neither
  sub-step. (DR1)
- **AC-4.2** The named cases "finishes the reserved attempt interrupted when a
  signal arrives before launch" and "does not invent a session on pre-launch
  interruption" pass unedited, including the harness receiving zero calls.
- **AC-4.3** The `settleInterrupted` call is unchanged in every argument,
  including the attempt-start `HEAD` as `headAfterAttempt` and an empty
  `pendingFiles`. (DR6)

### FR-5 — Invocation preserves harness contact and session capture

- **AC-5.1** The heartbeat remains inline in the invocation step, with the same
  interval derived from the binding's heartbeat seconds, the same `unref`, and
  the same `clearInterval` in the `finally`. (DR3, DR6)
- **AC-5.2** One private helper in the invocation module owns the
  `onSessionCaptured` callback, the at-most-one-capture guard, the single direct
  `run.commit` of the `attach-session` transition, the await-and-warn of that
  write, and reporting the captured session; the invocation body declares no
  mutable capture state of its own. (DR3)
- **AC-5.3** `resolveAttemptSession` remains a named function, called at the same
  point in the sequence, and is not inlined into the helper. (DR4)
- **AC-5.4** The named cases "retains the session on completed, provider-error,
  idle-timeout, and post-launch interruption", "skips provisional persistence for
  an outcome-only fallback session", "warns once on provisional failure,
  continues the harness, and settles with the session", "keeps settlement
  checkpoint failure fatal after a successful provisional write", and "prefers
  the outcome session over the live-captured value at settlement" all pass
  unedited.
- **AC-5.5** Every field of the harness invocation request is unchanged, and
  `MS_PER_SECOND` is declared in the invocation module as its only reader.

### FR-6 — The phase's outward types stay at its front door

- **AC-6.1** `attempt.ts` declares `LaunchOutcome` and `LaunchedAttempt`, and
  `LaunchedAttempt`'s doc comment names the invocation step as its producer;
  `engine.ts` and `settlement.ts` import them from `attempt.ts` and from no
  sub-step. (DR5)
- **AC-6.2** The invocation module's reference to `LaunchedAttempt` is type-only,
  so `driversOf` still reports `execution/engine.ts` as the sole driver of
  `attempt.ts`. (DR5)

### FR-7 — The move is evidenced as a move

- **AC-7.1** No test file is edited other than the two `PHASE_CALLERS` rows in
  `cli/src/architecture.test.ts`; in particular `engine.test.ts` is byte-for-byte
  unchanged. (DR4)
- **AC-7.2** `npm --prefix cli run check` exits 0, `npm run lint` exits 0, and
  the engine and architecture suites pass when run focused.
- **AC-7.3** `npm run demo:all` reports every scenario green, with no scenario
  added or edited. (DR4)
- **AC-7.4** A baseline trace is generated freshly from this thread's pre-change
  `HEAD`, the change is traced over the same scenarios, and
  `npm run trace:compare <baseline> <after> --ignore-call renderStagePrompt`
  exits 0 with zero order findings, zero transcript findings, and zero structure
  findings. That single exclusion is the only one used, and it is justified in the
  implementation report as a pure call whose evaluation point moved behind the
  pre-launch signal guard. (DR4)
- **AC-7.5** The comparison reports no instrumented name the baseline carried as
  absent afterwards; the names it reports as relocated are exactly the pure
  helpers this change moves between modules — `nextAttemptNumber`,
  `errorMessage`, and `resolveAttemptSession` — and the names it reports as newly
  visible are the two extracted steps and the private capture helper's own
  functions, with nothing else in either set. (DR4)

## Degrees of freedom

Left to the implementer, each satisfying every acceptance criterion above
unchanged and visible to no user:

- **The two new modules' filenames and their exported function names**, provided
  they follow the naming style of the existing `phases/` modules and each states
  its one purpose. Nothing above depends on a particular name.
- **The private capture helper's exact surface** — an object with methods, a
  returned pair of functions, or a small factory — provided it owns the four
  responsibilities AC-5.2 names and leaves no mutable capture state in the
  invocation body.
- **The field name for the log path inside `ReservedAttempt`**, and whether the
  type is declared above or below the function that produces it.
- **The wording of every doc comment**, including how `attempt.ts`'s module
  comment phrases the launch order, so long as it states that order once, names
  the reservation step as `ReservedAttempt`'s only producer, and names the
  invocation step as `LaunchedAttempt`'s producer.
- **Import grouping and ordering** within each file.
- **The order in which the two extractions are performed**, and whether the trace
  baseline is captured in a git worktree or a separate snapshot checkout.

Not free, because each is pinned above: which pieces exist, what crosses between
them, where the signal guard and the announcement sit, what the trace exclusion
set contains, and which files may be edited.

## Risks and notes

- **The pre-launch signal window has exactly one test seam**, the
  `attemptStarted` display callback. Keeping that emission ahead of the guard is
  what preserves it (DR2); a later change that moves the announcement behind the
  guard silently removes the only coverage of that window rather than failing a
  test.
- **`--ignore-call` is a human-audited exception mechanism.** The comparator
  reports every excluded name and its counts but cannot prove that a named
  function is pure, which is why the exclusion set is fixed at one name here and
  why the implementation report has to state the justification rather than leave
  it in a command line.
- **The enforcement ceiling of `ReservedAttempt` is known and accepted**: because
  it is plain data, the guarantee is that invocation cannot proceed without being
  handed a reservation, not that a reservation must have happened. The
  architecture guard already restricts the invocation step to one caller, so
  forging one would require that caller to assemble an executing `AttemptRecord`
  by hand (DR1).
