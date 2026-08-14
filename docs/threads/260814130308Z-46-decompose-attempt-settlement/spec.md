# Decompose attempt settlement into the named gates its order encodes

## Intended outcome

`settleAttempt` in `cli/src/execution/phases/settlement.ts` states the order of its
gates and drives named collaborators, with no internal section comments standing in
for names. A reader opening the file sees the safety-critical sequence — what is
read, what is judged, in what order, and which of three endings the attempt settles
into — as straight-line code, and the durable write that ends every settlement
happens in exactly one place.

Nothing observable changes. The same runs produce the same checkpoints, the same
terminal output in the same order, and the same exit codes. What changes is that the
gate order is legible from structure rather than from prose, and that the invariant
"one checkpoint write carries a settled attempt together with the pause it settled
into" is enforced by there being one write site instead of being a property a
reviewer re-verifies in three branches.

Alongside the code change, the trace comparator this refactor's safety argument
rests on becomes part of the repository, so the claim "no cross-module side-effect
sequence moved" can be checked by someone other than its author.

## Context

`settleAttempt` is roughly 200 lines organized by four numbered section comments. It
is the second half of the engine's attempt pair: `cli/src/execution/engine.ts` drives
`launchAttempt` and then `settleAttempt` on adjacent lines, and settlement is where an
attempt the harness returned from becomes durable.

`cli/AGENTS.md` states the rule this violates — "a function long enough to need
internal section comments is a set of collaborators that has not been named yet" —
and the surrounding domain has already been moved to that shape: the engine loop is
one module per phase, `runCommand` and `resumeCommand` were decomposed into named
preflight steps, and settlement's own two sub-steps, `verify-promise.ts` and
`boundary.ts`, already exist as named collaborators driven from it.

This is maintainability work, not an active defect. Settlement is also the densest
safety-critical ordering in a run — the gate order is the product, and the module's
own doc comment says so — which is the argument for naming its steps rather than for
leaving them inline.

Two facts about the thread's starting premises were corrected during discussion and
are load-bearing here. First, settlement is **not** the last function in the
execution domain shaped this way: `launchAttempt` in
`cli/src/execution/phases/attempt.ts` is a ~175-line function carrying two numbered
section comments, and it is deliberately left to a separate ticket (per
`decisions.md` DR1). Second, the comparator the acceptance criteria depend on,
`cli/temp/compare-traces.mjs`, is not in the repository at all — `temp/` is
gitignored and untracked — so the criteria as originally written could only be run on
one working copy (per `decisions.md` DR5).

## Scope

In scope:

- Restructuring `settleAttempt` and its module, `cli/src/execution/phases/settlement.ts`.
- One new module, `cli/src/execution/phases/commit-settlement.ts`, and its row in the
  architecture guard's phase-caller table.
- Promoting the trace comparator into `cli/scripts/trace/compare.mjs` with an
  `npm run trace:compare` script, explicit audited call-name exclusions, and
  normalization of nondeterministic transcript process IDs and supplied-binary
  locations.
- Making the trace runtime persist each event immediately, so the two scenarios
  that deliberately end a child with `SIGKILL` retain every completed trace event.
- Engine-boundary test additions in `cli/src/execution/engine.test.ts` that pin the
  three settled record shapes.

Out of scope:

- **`launchAttempt`** (per `decisions.md` DR1). It carries the same violation and is
  left to its own ticket. Do not touch `cli/src/execution/phases/attempt.ts` beyond
  what a compile error forces.
- Changing the gate order, the classification rules, or which endings exist.
- Any checkpoint schema or persisted-shape change.
- Further decomposing `verify-promise.ts` or `boundary.ts`.
- Changing terminal wording, display event shapes, or emission order.
- Decomposition motivated only by a line-count target rather than a distinct reason
  to change. The orchestrator is expected to land around ninety-five lines and that
  is acceptable (per `decisions.md` DR3); do not extract further to shrink it.
- General trace-analysis features beyond what is required to compare this
  refactor's effectful descendants reproducibly.

## Expected behavior

### The orchestrator

`settleAttempt` keeps its signature, its position as the one settlement phase driven
from `engine.ts`, and its gate order. It reads top to bottom as:

1. **The post-attempt reads.** Re-scan the thread's pending queues, parse the
   terminal outcome when the attempt completed, and read the post-attempt `HEAD`.
   These stay inline as straight-line code in the orchestrator (per `decisions.md`
   DR3) — no observation value is introduced. A failed `HEAD` read still returns a
   refusal.
2. **The signal-abort guard.** A signal-caused abort is an interruption, and this
   guard stays inline as a guard clause immediately after the reads and **before**
   any ordinary non-`DONE` queue or harness-error classification, so a first-signal
   rejection is never relabelled (per `decisions.md` DR3). It retains the
   post-attempt scan's pending paths as its evidence and delegates to the existing
   collaborator in `cli/src/execution/interruption.ts`.
3. **The promise gate.** For a recognized `DONE`, verify the promised artifact state
   through the existing `verify-promise.ts` sub-step, **before** the Git boundary is
   looked at. A violated promise settles as the stopped ending, preserving the
   completed attempt for a human repair to finalize.
4. **The boundary gate.** Only once that promise holds, finalize the stage's Git
   boundary through the existing `boundary.ts` sub-step, and record the tip the
   finalization left behind — boundary commit included — as the settled attempt's
   `headAfterAttempt`.
5. **Classify, then settle.** Call `classifyAttempt`, then construct the `Settlement`
   value for the ending the classification names and hand it to the fold.

The four numbered section comments are removed. The order they narrated is carried
once, by the module's existing doc comment (per `decisions.md` DR3).

The orchestrator's branches construct values and perform nothing durable: after
classification it writes no checkpoint, emits no display event, and builds no
returned ending itself.

### The `Settlement` union and its fold

`cli/src/execution/phases/commit-settlement.ts` declares a closed `Settlement` union
with exactly three arms and exports `commitSettlement`, which folds it exhaustively
(per `decisions.md` DR2 and DR4). The three arms are the three endings:

- **advanced** — the stage advanced.
- **done-pending-queues** — the stage succeeded but its queue holds the run. Carries
  its waiting value.
- **stopped** — the stage stopped and the run pauses. Carries its waiting value, plus
  enough to determine both whether a signal-caused abort ended the attempt and the
  disposition the display event reports.

`commitSettlement` is the single place that amends the executing `AttemptRecord`,
calls `commitCursor` with the settled attempt together with the transition it settled
into, emits the settlement's display event, and produces the return value. Adding a
fourth arm must fail to compile until it states what it records and which event it
draws.

### The three record shapes

The fold reproduces the three shapes exactly as they stand today (per `decisions.md`
DR2):

| ending | `result` | `pendingFiles` | `failure` |
| --- | --- | --- | --- |
| advanced | `done` | key absent | absent |
| done-pending-queues | `done` | present | absent |
| stopped | `interrupted` for a signal-caused abort, otherwise `waiting` | present only when non-empty | taken from the reason its pause leads with |

All three carry `endedAt`, the stored terminal-result candidate, and
`headAfterAttempt` set to the tip observed once the attempt settled.

The `pendingFiles` difference between the first two rows is a real asymmetry in the
current code that becomes visible once the shapes sit together. A done-pending-queues
pause always observes a non-empty queue — that is why it paused — so at that ending
an unconditional and a conditional `pendingFiles` cannot differ, and either form is
correct there. The advanced row's absent key is **not** equivalent and must be
preserved: an advanced attempt observed no pending queue and records no such key.

### Display events

Unchanged in identity, payload, and emission order:

- advanced → `stageSucceeded`, and the phase returns nothing so the loop carries on.
- done-pending-queues → `stageSucceeded`, then the pause is rendered. The stage
  itself succeeded; only the pending bundle keeps the run from advancing.
- stopped → `stageStopped`, then the pause is rendered. Its disposition is `paused`
  when a refused boundary's head movement is advisory, and otherwise the disposition
  read from the attempt's own terminal token rather than from the reason governing
  the run's pause — so a stage refused while a pending bundle holds the run still
  reports `refused`.

Attempt failure telemetry keeps riding on the reason the pause leads with.

### Private helpers

Two pure pieces are extracted as private helpers inside `settlement.ts`, not as
sub-steps (per `decisions.md` DR3): the assembly of the stopped path's
`WaitingDiagnostics` from a failed outcome, and the construction of the
refused-boundary argument the stopped pause builder receives. The module's two
existing private helpers — the one building the stored terminal-result candidate and
the one reading the stage's disposition — stay private to the orchestrator (per
`decisions.md` DR4).

### The trace comparator

`cli/temp/compare-traces.mjs` is promoted to `cli/scripts/trace/compare.mjs`, exposed
as `npm run trace:compare`, and named in the list of trace pieces that
`cli/scripts/trace.mjs` already carries in its doc comment (per `decisions.md` DR5
as superseded by DR7). It stays outside `npm run check`, alongside the tracing and
demo tools. It reads the ordered call sequence from the raw per-call records,
compares by function name filtered to the names the baseline already carried, and
reports newly visible names and re-attributed modules separately rather than as
differences — which is what a moved function and a closure promoted to a top-level
declaration produce.

A repeated `--ignore-call <function-name>` option removes an explicitly named frame
from both compared sequences and reports its before/after count. This refactor uses
that option for the removed `settleIntoPause` orchestration frame and the two pure
value builders whose evaluation moved, while their effectful descendant calls remain
in the comparison. Transcript normalization removes the Node process ID from the
runtime's `NO_COLOR`/`FORCE_COLOR` warning and the trace driver's absolute supplied-
binary path, allowing the baseline revision to be built in an isolated checkout.
The trace runtime writes every event immediately: a child ended by `SIGKILL` has no
exit hook, so an in-memory buffer would make its recorded prefix depend on a flush
threshold rather than on the calls that actually completed before the kill.

## Constraints

- **The gate order is the safety property**, and it is what this change must not
  move: reads and outcome parse first, then the signal-abort guard before any
  ordinary classification, then a recognized `DONE`'s promised artifact state, then —
  only once that promise holds — the Git boundary, then classification, then exactly
  one of three settlements. A promise that is not kept never reaches the boundary.
- **One checkpoint document per settlement.** A settled attempt and the pause it
  settled into are written by one `commitCursor` call carrying both transitions.
  After this change there is exactly one call site in the settlement path.
- **Exactly one clock read per settlement.** Today every settlement reads
  `ctx.clock()` exactly once: the violated-promise branch reads it and returns, the
  signal-abort path reads it inside the interruption collaborator, and every
  remaining path reads it after the boundary. Preserve that: no path may read the
  clock twice, which would put a different `endedAt` on the record than the duration
  was computed from.
- **`cli/src/architecture.test.ts` is a guard, not a formality.** Its phase-caller
  table must name every module under `execution/phases/` and `execution/entry/`, each
  with exactly one driving module. Adding the fold means adding exactly one row
  naming the settlement orchestrator as its caller. If the guard fails, the boundary
  moved — argue the direction rather than relaxing the guard.
- **The ending-construction rule holds.** `cli/src/execution/result.ts` is the only
  module in the execution domain that may construct an ending literal, and any module
  naming `ExecutionResult` must import it. The fold complies by calling the existing
  helpers there.
- **The display seam holds.** The execution domain reaches `display/types.ts` only.
  The fold draws through the context's display seam and imports no concrete renderer.
- **What earns a `phases/` module** is reaching outside the execution domain — the
  filesystem, Git, the checkpoint writer, the attempt log, the harness, or the
  display seam. A pure transformation of values already in hand is a private helper,
  or a pure module in `execution/` root when more than one phase needs it. Caller
  count and length decide nothing (per `decisions.md` DR4).
- **No phase-level test files.** No module under `cli/src/execution/phases/` has one,
  and none is introduced (per `decisions.md` DR6).
- **Trace exclusions are explicit and narrow.** The comparator may omit a named
  orchestration frame or proven-pure call only through `--ignore-call`, removes that
  name from both sequences, and reports its counts. It continues to compare the
  effectful descendants of an ignored orchestration frame.
- **Every emitted trace event is written immediately.** The trace runtime does not
  hold an event buffer that a deliberate `SIGKILL` can discard.
- **The repository's existing lint gate applies.** `npm run lint` is type-aware
  promise safety and runs as its own CI job beside `check`. This change relocates
  `await`ed calls to the checkpoint write and the boundary finalization, which is
  precisely the failure class that gate exists to catch.
- **No backward-compatibility obligation.** The CLI is pre-release with no users, so
  no migration, shim, or deprecation window is written. This licenses redesign, not
  disrepair: the full gate must pass.

## Acceptance criteria

### FR-1 — The orchestrator states its gate order and drives named collaborators

- **AC-1.1** `cli/src/execution/phases/settlement.ts` contains no numbered internal
  section comment (no `// 1.`, `// 2.`, `// 3.`, `// 4.` section headers) inside
  `settleAttempt`.
- **AC-1.2** The module's doc comment states the gate order — the reads, the
  signal-abort guard's precedence, the promise before the boundary, and the three
  endings — as the single narration of that order.
- **AC-1.3** After the call to `classifyAttempt`, `settleAttempt` contains no call to
  `commitCursor`, no emission of a display event, and no construction of a returned
  ending; it constructs a `Settlement` value and calls the fold.
- **AC-1.4** `settleAttempt`'s signature is unchanged, and `engine.ts` calls it at
  the same point in the loop with the same arguments.
- **AC-1.5** No module is introduced for the post-attempt reads, and the signal-abort
  guard remains an inline guard clause in `settleAttempt`, textually before the
  promise gate and the classification call *(traces to `decisions.md` DR3)*.

### FR-2 — The three endings are one closed union folded by one writer

- **AC-2.1** `cli/src/execution/phases/commit-settlement.ts` exists, declares a
  `Settlement` union with exactly three arms corresponding to the advanced,
  done-pending-queues, and stopped endings, and exports `commitSettlement`
  *(traces to `decisions.md` DR2)*.
- **AC-2.2** `commitSettlement` matches the union exhaustively, such that adding a
  fourth arm to `Settlement` without handling it is a compile error under
  `npm run typecheck`.
- **AC-2.3** The settlement path contains exactly one `commitCursor` call site, and
  it is inside `commit-settlement.ts`.
- **AC-2.4** The settlement path contains exactly one site emitting a settlement
  display event, and it is inside `commit-settlement.ts`.
- **AC-2.5** `commit-settlement.ts` constructs no ending literal of its own and
  imports `cli/src/execution/result.ts` for the values it returns; it imports no
  module under `display/` other than `display/types.ts`, directly or transitively
  through the execution context.

### FR-3 — The settled record shapes are unchanged

- **AC-3.1** An advanced settlement's serialized attempt record has `result` `done`
  and **no** `pendingFiles` key. A regression case in
  `cli/src/execution/engine.test.ts` asserts the key's absence
  *(traces to `decisions.md` DR2, DR6)*.
- **AC-3.2** A done-pending-queues settlement's serialized attempt record has
  `result` `done` and carries the observed `pendingFiles`, pinned by an assertion
  in `cli/src/execution/engine.test.ts` *(traces to `decisions.md` DR2, DR6)*.
- **AC-3.3** A stopped settlement's serialized attempt record has `result`
  `interrupted` when a signal-caused abort ended the attempt and `waiting`
  otherwise, carries `pendingFiles` only when non-empty, and carries a `failure`
  whose kind and message come from the reason its pause leads with.
- **AC-3.4** Every settled record carries `headAfterAttempt` set to the tip observed
  once the attempt settled, the boundary commit included when a boundary was
  finalized.
- **AC-3.5** The existing `engine.test.ts` assertions on `pendingFiles`,
  `headAfterAttempt`, and attempt `result` values pass unmodified, except where a
  file move requires an import path change.

### FR-4 — One checkpoint document, one clock read

- **AC-4.1** A settlement that pauses produces one checkpoint document carrying both
  the settled attempt and the pause it settled into, committed by a single
  `commitCursor` call with both transitions.
- **AC-4.2** No path through `settleAttempt` and `commitSettlement` calls
  `ctx.clock()` more than once.

### FR-5 — Display events and their order are unchanged

- **AC-5.1** An advanced settlement emits `stageSucceeded` and the phase returns
  nothing.
- **AC-5.2** A done-pending-queues settlement emits `stageSucceeded` and then renders
  the pause, in that order.
- **AC-5.3** A stopped settlement emits `stageStopped` and then renders the pause, in
  that order.
- **AC-5.4** A stopped settlement's disposition is `paused` when a refused boundary's
  head movement is advisory, and otherwise is derived from the attempt's own terminal
  token — so an attempt whose token is `REFUSED` reports `refused` even when a
  pending bundle is the reason governing the run's pause.
- **AC-5.5** `npm run demo:all` reports the same verdicts as before the change, with
  no scenario's declared markers or exit code altered.

### FR-6 — The architecture guard accounts for the new module

- **AC-6.1** The phase-caller table in `cli/src/architecture.test.ts` gains exactly
  one row, `execution/phases/commit-settlement.ts` → `execution/phases/settlement.ts`
  *(traces to `decisions.md` DR4)*.
- **AC-6.2** `cli/src/architecture.test.ts` passes with no guard weakened, no
  assertion removed, and no exemption added.
- **AC-6.3** No `cli/src/execution/phases/settlement/` directory is created; the new
  module sits directly under `phases/` *(traces to `decisions.md` DR4)*.
- **AC-6.4** No `*.test.ts` file exists under `cli/src/execution/phases/`
  *(traces to `decisions.md` DR6)*.

### FR-7 — The trace comparator is in the repository and the baseline is fresh

- **AC-7.1** `cli/scripts/trace/compare.mjs` is tracked by Git, and
  `cli/temp/compare-traces.mjs` is no longer the path the verification depends on
  *(traces to `decisions.md` DR5)*.
- **AC-7.2** `cli/package.json` exposes `trace:compare` running that script, and
  `npm run check` does not invoke it.
- **AC-7.3** `cli/scripts/trace.mjs`'s doc comment names `trace/compare.mjs` in its
  list of trace pieces.
- **AC-7.4** The comparator accepts repeated `--ignore-call <function-name>` options,
  removes each named call from both sequences, reports each ignored name's
  before/after count, and refuses an ignored name absent from both traces.
- **AC-7.5** Transcript comparison normalizes the Node process ID and the trace
  driver's absolute supplied-binary path, and the trace runtime writes each event
  without an in-memory batch that can be lost to `SIGKILL` *(traces to
  `decisions.md` DR7)*.

### FR-8 — No cross-module side-effect sequence moved

- **AC-8.1** A baseline trace is generated with `npm run trace` from this thread's
  pre-change `HEAD` — not reused from any pre-existing local trace directory
  *(traces to `decisions.md` DR5)*.
- **AC-8.2** After the change, `npm run trace` is re-run over the same scenario set,
  and this comparison exits successfully with zero order, transcript, and structure
  findings:
  `npm run trace:compare -- <baseline-dir> <after-dir> --ignore-call settleIntoPause
  --ignore-call stageDisposition --ignore-call donePendingQueues`.
- **AC-8.3** The implementation report accounts for every ignored call name and
  every name the comparator reports as newly visible or re-attributed. Ignoring
  `settleIntoPause` omits its orchestration frame only; its checkpoint, display, and
  pause-rendering descendants remain in the compared sequence.

### FR-9 — The full gate passes

- **AC-9.1** `npm --prefix cli run check` exits successfully.
- **AC-9.2** `npm --prefix cli run lint` exits successfully.
- **AC-9.3** Focused runs of the tests that cover this change pass:
  `cli/src/execution/engine.test.ts`, which is where settlement itself is proven
  (per `decisions.md` DR6), `cli/src/execution/pause.test.ts`,
  `cli/src/execution/recovery.test.ts`,
  `cli/src/execution/recovery-policy.test.ts`,
  `cli/src/gitops/boundary.test.ts`, and `cli/src/architecture.test.ts`.

## Degrees of freedom

The following *hows* are deliberately left to the implementer. Every admissible
choice satisfies the acceptance criteria unchanged, none produces a user-visible
difference, and each is reversible without revising this spec.

- **The exact field set of the `Settlement` arms**, provided each arm determines the
  information its ending records and draws. In particular, the stopped arm may carry
  the resolved display disposition, or the abort flag plus the advisory-head-movement
  flag, or another encoding — the constraint is that the private helper reading the
  stage's disposition and the one building the stored terminal-result candidate stay
  private to the orchestrator (AC-1.3 and `decisions.md` DR4), and that the emitted
  disposition satisfies AC-5.4.
- **Whether the existing `SettlingAttempt` type keeps its name, is renamed, or is
  absorbed into the fold module's parameter list.**
- **How exhaustiveness is enforced** — a `switch` over the discriminant, a
  never-typed fallthrough, a lookup keyed by the arm's kind — so long as AC-2.2
  holds.
- **The names of the two private helpers** extracted per `decisions.md` DR3, and
  their placement within `settlement.ts`.
- **Where the `Settlement` declaration sits within `commit-settlement.ts`**, and the
  wording of that module's doc comment.
- **Whether the done-pending-queues arm records `pendingFiles` unconditionally or
  conditionally**, since a non-empty queue is what produced that ending and the two
  forms cannot differ there. The advanced arm's absent key is not free (AC-3.1).
- **Where the two trace directories are kept locally** while FR-8 is carried out.
  `cli/temp/` is untracked, and neither directory is committed.
- **The order in which the work is sequenced**, and whether it lands as one commit or
  several — subject to the repository's Conventional Commits rule with the `cli`
  scope, and to the standing instruction not to commit unless asked.

Not free, and pinned above: the module path and export name, the script name, the
guard row, the gate order, the three record shapes, and every display event and its
emission order.
