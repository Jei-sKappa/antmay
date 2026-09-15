# Make the durable execution vocabularies express only legal states

## Intended outcome

The two closed vocabularies `cli/src/state/checkpoint/types.ts` describes in
prose — the disposition of an attempt and the reason a run pauses — become types
that admit only the states a run can actually be in. After this change an
`executing` attempt carrying an ending timestamp, a `done` attempt carrying
none, a `pending-queues` reason with no pending files, and a `waiting-for-user`
checkpoint with no pause object are all unconstructible rather than merely
undetected. The invariants stop being upheld by convention across the validator,
the transitions, pause assembly, and pause equality, and start being upheld by
the compiler at every one of those sites at once.

Two consequences reach behavior. A settled attempt's post-attempt queue
observation stops collapsing "the scan found nothing" and "the scan could not
run" into the same absent key, and the finalization of a saved `DONE` answers
the second case by applying the stage's declared queue resolution instead of
silently reading it as "nothing pending". Nothing else a user observes changes:
no terminal rendering, no exit code, no command surface, no ordering.

## Context

`AttemptResult` names four dispositions — `executing`, `done`, `waiting`,
`interrupted` — and `WaitingKind` names thirteen reasons a run pauses. Both are
documented as closed vocabularies and neither is enforced as one:
`AttemptRecord` and `WaitingReason` each carry the state-specific data for every
variant as optional fields on a single flat shape, so nothing correlates a field
with the discriminant it belongs to.

Validation does not close the gap. `cli/src/state/checkpoint/validate.ts` checks
each optional field's own shape when the field is present — `endedAt` parses as
an ISO-8601 UTC timestamp, `pendingFiles` is sorted and unique — and never asks
whether the discriminant required it at all. An untrusted checkpoint holding a
settled attempt without an ending timestamp, or a pending-queue pause with no
pending files, is read back as valid.

What these invariants exist as instead is behavior spread across four places:
the validator, the transitions that construct attempt and run state, pause
assembly in `cli/src/execution/pause.ts`, and the equality logic beside it,
where `reasonEquals` compares every optional field of every kind because the
shape cannot say which ones a given kind has. Each new execution state has to be
threaded through all four correctly, with nothing at the type level checking
that it was.

`WaitingRecovery`, in the same file, is already a discriminated union whose
per-variant data is required exactly where it applies — the `attempt` reference
the three recoveries that name one carry, the `pausedAtHead` only the two that
may finalize a boundary across a pause carry. It is the shape the rest of the
vocabulary lacks, and it is the model this thread applies to the rest.

No incorrect behavior is reported in the states a run constructs today. The
exposure is that nothing prevents one: extending the execution vocabulary can
silently produce a checkpoint that contradicts itself, and both the type checker
and the validator will accept it.

The thread originates from https://github.com/Jei-sKappa/antmay/issues/63. Its
settled decisions are recorded in `decisions.md` as DR1 through DR6 and are
cited inline below where each becomes operative.

## Scope

The durable checkpoint vocabulary and every site that constructs, validates,
compares, renders, or branches on a value of it:

- `cli/src/state/checkpoint/types.ts` — the declarations themselves.
- `cli/src/state/checkpoint/validate.ts` — the untrusted-input boundary that
  constructs those values from parsed JSON.
- `cli/src/execution/` — `pause.ts` (assembly and equality), `run-state.ts`
  (the transition reducer), `attempts.ts`, `interruption.ts`,
  `phases/reserve-attempt.ts`, `phases/attempt.ts`, `phases/settlement.ts`,
  `phases/commit-settlement.ts`, `phases/prerequisite.ts`,
  `phases/queue-gate.ts`, `phases/verify-promise.ts`, `entry/recover.ts`,
  `entry/refresh.ts`, `entry/finalize.ts`.
- `cli/src/runner/classify.ts` — the precedence function that builds reasons.
- `cli/src/display/execution.ts` — the pause renderer and its banner table.
- `cli/src/commands/` — any site that reads a checkpoint field whose type moved.
- The `*.test.ts` fixtures and the seeded-checkpoint demo scenario that build
  values of these shapes.
- `cli/AGENTS.md`, in the two places it names the `stage-contract-violation`
  kind DR4 retires.

### Out of scope

- **`WaitingRecovery`, `AttemptReference`, `TerminalResult`, `WaitingInfo`,
  `WaitingReasons`, `SnapshottedStage`, `ProfileSelection`, and
  `HarnessRuntimeIdentity`.** Each already states what it carries, or carries
  nothing this thread's decisions reach.
- **`WaitingInfo.nextAction`.** DR5's scope is `WaitingReason`'s shared optional
  fields and `WaitingDiagnostics`; `nextAction` belongs to the pause as a whole
  and is left exactly as it is.
- **`AttemptRecord.agentSession`, `RunCheckpoint.fromStage`, and
  `SnapshottedStage.instructions`.** Optional keys whose absence carries no
  second meaning, outside every decision here.
- **The relation between an `executing` condition and the history's final
  attempt.** DR6 deliberately leaves it with checkpoint validation; the
  trailing-element tuple that would express it is not written.
- **The gap DR3 names and leaves open:** an `advance`-resolution final stage
  reaches completion without any queue check, because the engine's completion
  path runs no gate. Not addressed here.
- **The stage catalog, target resolution, artifact prerequisites and promises,
  Git policy, queue resolutions, and the pipeline and profile document
  schemas.** Untouched, so `cli/README.md`'s stage-support table cannot move.
- **The command surface, exit codes, and every terminal rendering.** No banner
  label, message, section, ordering, or payload changes.
- **New demo scenarios.** The change introduces no distinct rendering (see
  *Terminal banners* below).
- **`cli/README.md` and the root `AGENTS.md`.** Nothing they state stops being
  true, and what this change establishes is stated by the types themselves
  rather than by a note about them. `cli/AGENTS.md` is reached only where it
  names the retired kind (see *Scope*); nothing else it states moves.
- **Any further precision the same reading suggests but no decision settles** —
  a `schemaVersion` bump, a branded or nominal attempt type, a runtime table
  mirroring the type-level one for its own sake.

## Target shape

### The attempt record is a union over its four dispositions (DR1)

`AttemptResult` keeps its four values and `AttemptRecord` becomes a
discriminated union over them, keyed on `result`.

Every arm carries the fields an attempt has whatever became of it: `attempt`,
`stageIndex`, `stageId`, `startedAt`, `headAtStart`, `logPath`, and the optional
`agentSession`.

- **`executing`** carries `terminalResult: null`, and declares neither `endedAt`
  nor `headAfterAttempt` nor a queue observation — the observation is made at
  settlement (DR2).
- **`done`** requires `endedAt`, `headAfterAttempt`, and a `terminalResult`
  whose `token` is `DONE`.
- **`waiting`** and **`interrupted`** require `endedAt`, `headAfterAttempt`, and
  `failure`, whose `kind` is typed as `WaitingKind` rather than as a bare
  string. Their `terminalResult` stays `TerminalResult | null`: an attempt can
  stop before producing terminal text.

`execution/attempts.ts:attemptInterval` is removed (DR1). Its two callers —
`entry/finalize.ts` for the `after-contract-repair` boundary context and
`entry/refresh.ts` for the advisory-`HEAD`-movement wording — read `headAtStart`
and `headAfterAttempt` directly off the settled attempt they already hold, and
thread no `InvariantResult` for it. `referencedAttempt` and `withAgentSession`
stay.

The `done`-implies-`DONE`-token check that
`attemptsAgreeWithSnapshottedStages` performs as a cross-field invariant moves
into the `done` arm's own validation. It is still enforced; it is no longer a
separate pass.

### A settled attempt states its queue observation explicitly (DR2)

The optional `pendingFiles` key on an attempt is replaced by a required
two-case value on each settled arm:

- **observed** — carries the sorted list of pending files the post-attempt scan
  found, which may be empty;
- **unavailable** — carries no list, and no message: the scan's failure is
  already reported as the pause's `gate-error` reason.

The `executing` arm carries no observation at all.

Which case each producer records follows from what it observed:

- `phases/settlement.ts` records **observed** with the sorted list when the
  post-attempt scan succeeded, and **unavailable** when it failed. This is where
  the two cases stop being conflated: settlement currently turns a failed scan
  into an empty list, and `commit-settlement.ts` then records an empty list as
  no key at all.
- `interruption.ts` records the same two cases from the same scan result, which
  `phases/settlement.ts` hands it at the abort guard. Its other caller, the
  pre-launch signal check in `phases/attempt.ts`, records **unavailable**: the
  attempt never ran, so no post-attempt scan was made.
- `entry/recover.ts`'s abandoned-attempt settlement records **unavailable**: it
  performs no queue scan, so it observed nothing.
- `entry/finalize.ts` carries the preserved attempt's own observation through
  unchanged onto the finalized `done` arm; it makes no observation of its own.

### An unavailable observation applies the stage's declared resolution (DR3)

`entry/finalize.ts` reads the preserved attempt's recorded observation to decide
between the stage's declared `rerun` resolution and advancing. That decision
becomes:

| Recorded observation | Effect |
| --- | --- |
| observed, non-empty list | the stage's declared queue resolution applies |
| observed, empty list | the run advances |
| unavailable | the stage's declared queue resolution applies |

So a `rerun` stage becomes ready and runs again on an unavailable observation,
and an `advance` stage advances. Finalization performs no queue scan of its own:
the re-entered stage's queue gate makes the fresh observation, so bundles still
present are caught there and a scan that fails again pauses with a `gate-error`
on current evidence.

This is the one behavioral change in the thread. It gives the same answer the
engine already gives an unavailable scan one branch over — a `DONE` attempt
whose post-attempt scan fails while its Git boundary holds settles as `waiting`
under a governing `gate-error` with a `retry-stage` recovery — so the
finalization path stops being the one place an unknown queue resolves to
"nothing pending".

### Building the finalized `done` arm (DR1, DR6)

`finalizeSavedDone` constructs a `done` arm rather than spreading the preserved
`waiting` record: it keeps the attempt's identity fields, `startedAt`,
`endedAt`, `headAtStart`, `logPath`, `agentSession`, and queue observation,
takes `headAfterAttempt` from the finalization, and carries no `failure`.

Its `terminalResult` must be the `DONE`-token shape the `done` arm requires.
Checkpoint validation already proves the referenced attempt's terminal token is
`DONE` for both finalizing recoveries, and DR6 leaves that relation with
validation, so finalization narrows the value it holds and reports a fatal
checkpoint if the narrow fails — the same species of invalid-entry report the
function already makes when a finalization directive resolves to no attempt at
all.

### Every waiting kind determines one evidence shape (DR4)

Two kinds are split, because a kind that is assembled by builders carrying
different evidence cannot key a union without leaving every evidence field
optional again — which is the flat shape over. The distinction hiding under each
is whether the check ran and failed or could not run at all:

| Today | Becomes |
| --- | --- |
| `stage-prerequisite-unmet` | `stage-prerequisite-unmet`, `stage-prerequisite-uninspectable` |
| `stage-contract-violation` | `stage-contract-unmet`, `stage-contract-uninspectable` |

`WaitingKind` therefore holds fifteen values. The pairing of each kind with the
evidence shape it carries is declared **exactly once**, as one table total over
the kind union, and `WaitingReason` is derived from that table rather than
written out beside it. Every kind carries `message`; the table says what else
it carries:

| Kind | Evidence beyond `message` |
| --- | --- |
| `outcome-blocked` | the agent's own reason text, required and nullable |
| `outcome-refused` | the agent's own reason text, required and nullable |
| `pending-queues` | the sorted list of pending bundle files |
| `malformed-outcome` | the candidate final line, required and nullable |
| `harness-error` | none |
| `idle-timeout` | none |
| `interrupted` | the abort's signal origin, required |
| `gate-error` | the failed scan's error text, required |
| `unexpected-head-movement` | none |
| `git-policy-violation` | none |
| `commit-error` | none |
| `stage-prerequisite-unmet` | the artifact mismatches |
| `stage-prerequisite-uninspectable` | the failed inspection's error text, required |
| `stage-contract-unmet` | the artifact mismatches, and the preservation note, required and nullable |
| `stage-contract-uninspectable` | the failed inspection's error text, required |

`cli/src/state/checkpoint/types.ts` is guarded as a declarations-only module —
`architecture.test.ts` rejects any `const`, `let`, `var`, `function`, `class`,
or `new` in it — so the table is declared at the type level, not as a runtime
value, and that guard is not weakened to accommodate it.

Every site that must act per kind reads that one declaration rather than
restating the pairing. Pause assembly and the classifier build each reason
against the arm the table declares for its kind, and the three sites that decide
per kind — the validator, pause equality, and the display banner table — each
branch through a structure total over the kind union, so adding a sixteenth kind
fails to compile until the table and each of those three says what it does with
it.

One illegal state this closes today: `runner/classify.ts:queueReasons` builds a
`gate-error` reason with no error text while `execution/pause.ts:gateErrorReason`
builds the same kind with one. Under the table both carry it, and the caller
already holds the value.

### The fields the table leaves over (DR5)

- **`detail` ceases to exist as a shared field.** It carries two unrelated
  meanings today — the agent's own reason text after a `BLOCKED` or `REFUSED`
  token, and a canned note about who owns the uncommitted changes on a refreshed
  contract violation — which the terminal prints under one key. The blocked and
  refused evidence carries the agent's reason text under its own name; the
  contract-unmet evidence carries the preservation note under its own.
- **`candidateLine` is carried by `malformed-outcome` alone**, where it is that
  kind's evidence, and is removed from the blocked, refused, contract, and
  boundary kinds. The renderer already draws it for `malformed-outcome` only.
- **Both it and the agent's reason text are required and nullable** rather than
  optional, and that treatment applies wherever an absent value is a real state
  rather than a missing key — which is why the preservation note is likewise
  required and nullable, absent on a fresh violation and present on a refresh.
- **`WaitingDiagnostics` is removed**, replaced by the two producing situations
  naming their own required fields: a signal origin for an interruption, and
  error text for a check that could not run. There is no union or table over the
  two; they have nothing in common beyond being diagnostic. Diagnostics are
  deliberately left lighter than the rest of the vocabulary, because nothing
  reads them.

The `harness-error` and `idle-timeout` kinds therefore carry no structured
evidence. Their error class and error message are already written verbatim into
`message` by `runner/classify.ts:harnessMessage`, and the settled attempt's own
`failure.message` records the same text.

### The display seam

Because `candidateLine` leaves the blocked, refused, contract, and boundary
kinds, `entry/refresh.ts` stops reading the attempt's
`terminalResult.candidateLine` in order to copy it onto the reason it rebuilds,
and the four refresh builders stop accepting it. The paused display event is not
widened to carry it: the reason renderer receives no attempt, and holding the
seam where it is means a pause read in isolation from its attempt no longer
shows that line — which is what the terminal already did.

### Terminal banners

`REASON_BANNER` in `cli/src/display/execution.ts` is total over `WaitingKind`
and gains a row for each new kind. Each new row carries the same `label`, `icon`,
`color`, and `group` as the kind it split from: the split is a difference in
evidence, not in what the pause is called (DR4). No banner text changes, no
rendering becomes distinct, and no scenario's assertions move — scenarios 21 and
22 keep asserting the same markers over the same screens.

### The checkpoint states its own pause correlation (DR6)

`RunCheckpoint` becomes a union over `condition`. The `waiting-for-user` arm
carries a non-null `WaitingInfo`; the `ready`, `executing`, and `completed` arms
carry `null`. Every other field is shared and unchanged.

`execution/run-state.ts:applyTransition` constructs arms rather than assigning
two independent fields, so `pause` produces the `waiting-for-user` arm and
`reserve-attempt`, `become-ready`, and `advance` produce null-pause arms.

Checkpoint validation keeps proving both attempt-history relations — that an
`executing` run's final attempt exists and is the executing one, and that a
recovery reference resolves to the final active attempt with a compatible
result, terminal token, and queue resolution — since it reads untrusted JSON and
constructs the value the union describes.

## Preserved behavior

Everything below holds unchanged, and each is already pinned by the existing
suites and scenarios:

- Every terminal rendering: banners, labels, icons, colors, reason ordering
  (stage group before queue group), the `Detail`, `Pending:`, `Artifacts:`, and
  candidate-line sections, the `What to do` block, warnings, and the printed
  resume command.
- Every exit code, the three-subcommand surface, and `antmay afk list`'s
  projection of a checkpoint.
- The order of the engine's gates: signal at rest, queue gate, artifact
  prerequisite, launch, settlement; and within settlement, queues and terminal
  outcome, the post-attempt `HEAD`, the abort guard, the promised artifact
  state, then the Git boundary.
- Every durable write ordering: an attempt persisted before its log is created,
  a settled attempt and the pause it settled into in one document, an unchanged
  pause writing nothing and restamping no `updatedAt`.
- The recovery vocabulary, its evidence table, and every directive
  `recovery-policy.ts` decides. DR3's change lands past that decision, in the
  transition `entry/finalize.ts` commits once a `finalize-boundary` directive has
  run: an unavailable observation on a `rerun` stage commits `become-ready` where
  it commits `advance` today.
- The clean-worktree exemption for the two recoveries holding a saved `DONE`,
  and the fail-closed simulated-runtime rules.

## Constraints

- **`npm --prefix cli run check` must pass** — typecheck, tests, and build. The
  CLI's pre-release freedom licenses redesign, never a broken gate.
- **`npm run lint` must pass.**
- **The CLI has no backward-compatibility obligation.** `schemaVersion` stays
  `0`, no migration or compatibility shim is written, and existing run
  directories becoming unreadable is acceptable and is stated plainly in the
  commit message. Do not weaken a field to optional so a previously written
  checkpoint still validates.
- **`architecture.test.ts` is not weakened.** In particular
  `state/checkpoint/types.ts` stays a declarations-only module reaching neither
  the execution nor the display domain; pauses stay assembled in
  `execution/pause.ts` alone and compared field by field rather than by
  serializing; `waitingEquals` stays the one equality; and every pause builder
  stays a pure function of the facts it is handed. If a guard fails, argue the
  direction rather than relaxing it.
- **No new dependency**, and no change to the sole runtime dependency
  `@ai-hero/sandcastle`.
- **The validator stays transitively filesystem- and path-free** through its
  source imports, as its own guard requires.
- **Commit only if the invocation asks.** The repository rule stands: never
  commit unless explicitly asked.
- **Follow the module's existing conventions**: doc comments that state
  contracts and rationale rather than narrating sections, structured facts
  returned by domain modules with multiline prose left to `display/`, and each
  fact documented at the narrowest scope that matches it.

## Acceptance criteria

### FR-1 — The attempt record admits only legal dispositions

- **AC-1.1** `AttemptRecord` is a discriminated union over `result` with exactly
  four arms named by the four `AttemptResult` values, and `AttemptResult` still
  declares exactly those four. (DR1)
- **AC-1.2** The `executing` arm declares `terminalResult` as `null` and
  declares no `endedAt`, no `headAfterAttempt`, and no queue-observation
  property. (DR1, DR2)
- **AC-1.3** The `done`, `waiting`, and `interrupted` arms each declare
  `endedAt` and `headAfterAttempt` as required, non-optional properties. (DR1)
- **AC-1.4** The `done` arm's `terminalResult` is required and its `token` is
  the literal `"DONE"`; the `waiting` and `interrupted` arms each declare a
  required `failure` whose `kind` is typed `WaitingKind`, and no arm types that
  `kind` as `string`. (DR1)
- **AC-1.5** A test file asserts, with `@ts-expect-error` comments that
  `tsc --noEmit` verifies, that at minimum an `executing` record carrying
  `endedAt` or `headAfterAttempt`, a `done` record carrying neither, a `done`
  record whose terminal token is not `DONE`, and a `waiting` record carrying no
  `failure` are each unconstructible. (DR1)
- **AC-1.6** `attemptInterval` is absent from `cli/src/`, no call site remains,
  and neither `entry/finalize.ts` nor `entry/refresh.ts` threads an
  `InvariantResult` for the post-attempt `HEAD` observation. (DR1)
- **AC-1.7** The cross-field invariant list in `validate.ts` no longer contains
  a `done`-implies-`DONE`-token check, and an untrusted document whose `done`
  attempt carries a non-`DONE` or null `terminalResult` is still rejected with a
  validation error. (DR1)

### FR-2 — A settled attempt states its queue observation

- **AC-2.1** No property named `pendingFiles` is declared on any arm of
  `AttemptRecord`. (DR2)
- **AC-2.2** Each settled arm declares one required queue-observation property
  whose type has exactly two cases: one carrying a `string[]` of pending files,
  one carrying no list and no message. (DR2)
- **AC-2.3** A `@ts-expect-error` assertion verified by `tsc --noEmit` shows a
  settled arm omitting that observation is unconstructible, and shows the
  unavailable case cannot carry a file list. (DR2)
- **AC-2.4** Given a post-attempt queue scan that succeeded with zero pending
  files, the settled attempt records the **observed** case with an empty list —
  not the unavailable case and not an absent key. (DR2)
- **AC-2.5** Given a post-attempt queue scan that failed, the settled attempt
  records the **unavailable** case, and the pause it settles into still carries
  the `gate-error` reason with the scan's message. (DR2)
- **AC-2.6** The abandoned-attempt settlement in `entry/recover.ts` records the
  unavailable case and performs no queue scan. (DR2)
- **AC-2.7** `validate.ts` rejects a settled attempt with no queue observation,
  rejects an observed case whose list is unsorted or holds duplicates, and
  rejects an `executing` attempt carrying an observation at all. (DR2)

### FR-3 — Finalization answers an unavailable observation with the declared resolution

- **AC-3.1** Finalizing a saved `DONE` whose recorded observation is
  **unavailable** on a stage declaring `rerun` leaves the run ready at the same
  stage, and the stage runs again. (DR3)
- **AC-3.2** Finalizing a saved `DONE` whose recorded observation is
  **unavailable** on a stage declaring `advance` advances the cursor. (DR3)
- **AC-3.3** Finalizing a saved `DONE` whose observation is **observed and
  empty** advances the cursor on either resolution — the answer that case gets
  today. (DR3)
- **AC-3.4** Finalizing a saved `DONE` whose observation is **observed and
  non-empty** applies the stage's declared resolution — the answer that case
  gets today. (DR3)
- **AC-3.5** `entry/finalize.ts` calls no queue-scanning function and reaches no
  filesystem read of its own; the re-entered stage's queue gate is what makes
  the fresh observation. (DR3)
- **AC-3.6** The rule that an unavailable observation is answered as though
  pending work had been observed is stated once, in a doc comment at the site
  where it applies, and nowhere else. (DR3)

### FR-4 — Every waiting kind determines one evidence shape, declared once

- **AC-4.1** `WaitingKind` holds exactly fifteen values: the eleven unchanged
  kinds, plus `stage-prerequisite-unmet` and `stage-prerequisite-uninspectable`,
  plus `stage-contract-unmet` and `stage-contract-uninspectable`. The name
  `stage-contract-violation` appears nowhere in `cli/src/` or `cli/scripts/`.
  (DR4)
- **AC-4.2** One table in `cli/src/state/checkpoint/types.ts` pairs each kind
  with the evidence it carries, it is total over the kind union, and
  `WaitingReason` is derived from it rather than written out beside it. No other
  module in `cli/src/` declares a kind-to-evidence pairing. (DR4)
- **AC-4.3** `cli/src/state/checkpoint/types.ts` still passes the
  declarations-only guard: no `const`, `let`, `var`, `function`, `class`, or
  `new`, every non-indented line opening a type import or an exported type or
  interface declaration, and no import from `execution/` or `display/`. (DR4)
- **AC-4.4** Each kind's evidence matches the table in *Target shape* above,
  each listed evidence field is required on its arm, and `@ts-expect-error`
  assertions verified by `tsc --noEmit` show at minimum that a `pending-queues`
  reason without a file list, a `gate-error` reason without error text, and a
  `pending-queues` reason carrying artifact mismatches are each
  unconstructible. (DR4)
- **AC-4.5** Adding a sixteenth kind to `WaitingKind` alone fails `tsc --noEmit`
  until the table, the validator, pause equality, and the display banner table
  each state what they do with it — demonstrated by each of those sites being
  written as a structure total over the kind union rather than as a default
  branch or a partial map. (DR4)
- **AC-4.6** `validate.ts` rejects a reason carrying an evidence field its kind
  does not declare, and rejects a reason missing an evidence field its kind
  requires, for every one of the fifteen kinds. (DR4)
- **AC-4.7** `queueReasons` in `runner/classify.ts` builds its `gate-error`
  reason carrying the scan's error text, and the pause builders and the
  classifier produce identical `gate-error` reasons for the same scan
  failure. (DR4)
- **AC-4.8** Both split pairs behave as one pause today did: an unreadable
  thread at the pre-attempt prerequisite check produces the prerequisite
  uninspectable kind, an unreadable thread at post-`DONE` promise verification
  produces the contract uninspectable kind, and an evaluated-but-unmet check
  produces the corresponding unmet kind — with the same recovery, the same
  `nextAction`, and the same message text in each case. (DR4)
- **AC-4.9** `cli/AGENTS.md` names the retired kind nowhere. Its two references
  become the split kinds that hold at each site: the unmet kind where a verified
  promise failed, and both kinds where the clean-worktree exemption follows from
  the recovery they share. (DR4)

### FR-5 — The leftover reason fields are named by their meaning

- **AC-5.1** No property named `detail` is declared on any arm of
  `WaitingReason`. The blocked and refused arms declare the agent's reason text
  under a name of its own, typed `string | null` and required; the
  contract-unmet arm declares the preservation note under a name of its own,
  typed `string | null` and required. (DR5)
- **AC-5.2** `candidateLine` is declared on the `malformed-outcome` arm alone,
  typed `string | null` and required, and on no other arm. (DR5)
- **AC-5.3** `WaitingDiagnostics` is absent from `cli/src/`. The `interrupted`
  arm declares a required signal-origin field; the `gate-error`,
  prerequisite-uninspectable, and contract-uninspectable arms each declare a
  required error-text field; and no union, table, or shared type spans those two
  shapes. (DR5)
- **AC-5.4** The `harness-error` and `idle-timeout` arms declare no evidence
  beyond `message`, and their rendered output is unchanged. (DR5)
- **AC-5.5** `entry/refresh.ts` reads no `terminalResult.candidateLine`, and
  none of the refresh builders in `pause.ts` accepts a candidate line. The
  paused display event is unchanged in every field. (DR5)
- **AC-5.6** `reasonEquals` compares each kind's own evidence, is total over the
  kind union, and serializes nothing; `waitingEquals` remains the one exported
  equality and every comparer still depends on it. An unchanged refresh still
  writes no checkpoint and restamps no `updatedAt`. (DR5)

### FR-6 — The checkpoint states its own pause correlation

- **AC-6.1** `RunCheckpoint` is a union over `condition` whose `waiting-for-user`
  arm declares `waiting: WaitingInfo` and whose `ready`, `executing`, and
  `completed` arms each declare `waiting: null`. (DR6)
- **AC-6.2** `@ts-expect-error` assertions verified by `tsc --noEmit` show that a
  `waiting-for-user` checkpoint with a null pause and a `completed` checkpoint
  carrying a pause are both unconstructible. (DR6)
- **AC-6.3** `applyTransition` in `run-state.ts` produces the correct arm for
  each of the seven transitions, and `validate.ts` still rejects both an
  untrusted `waiting-for-user` document with a null pause and any other
  condition carrying one. (DR6)
- **AC-6.4** `RunCheckpoint` carries no trailing-element tuple for its attempt
  history, and `validate.ts` still contains both the executing-attempt-is-final
  invariant and the recovery-resolves-against-history invariant, each rejecting
  every case it rejects today. (DR6)

### FR-7 — Nothing else moves

- **AC-7.1** `npm --prefix cli run check` exits 0 and `npm run lint` exits 0.
- **AC-7.2** `npm run demo:all` reports every scenario green, with no scenario
  file added and no scenario's `label`, `markers`, or expected exit code
  changed. Two scenario changes are permitted: the seeded checkpoints in
  `43-list.mjs`, to satisfy the new shapes, and the rename of the scenario file
  whose name carries the retired kind, whose contents stay byte-identical.
- **AC-7.3** `REASON_BANNER` is total over the fifteen kinds, and each new row's
  `label`, `icon`, `color`, and `group` are identical to those of the kind it
  split from. No existing banner row changes.
- **AC-7.4** `architecture.test.ts` passes with no assertion removed, weakened,
  or exempted, and no module added to any guard's exemption list.
- **AC-7.5** No file under `cli/src/pipeline/`, `cli/src/config/`,
  `cli/src/harness/`, `cli/src/gitops/`, or `cli/src/workspace/` changes;
  `cli/README.md` and the root `AGENTS.md` are unedited; and `cli/AGENTS.md`
  changes only where AC-4.9 requires.
- **AC-7.6** `schemaVersion` remains `0`, and no migration, shim, or
  compatibility branch for a previously written checkpoint exists.

## Degrees of freedom

Left to the implementer. Each satisfies every acceptance criterion above
unchanged and is invisible to a user of the CLI:

- **Every new identifier**: the property names for the queue observation and its
  two case discriminants, for the agent's reason text, the preservation note,
  the signal origin, and the error text; the names of any derived type aliases
  (a settled-arm alias, a per-kind evidence alias); and whether an arm is
  declared inline in the union or as a named type above it. The criteria are
  written over structure, not over these names.
- **The type-level encoding of the kind-to-evidence table** — an interface whose
  keys are the kinds with `WaitingKind` derived from it, a mapped type over a
  written-out `WaitingKind`, or another form — provided it is one declaration,
  total over the kind union, the sole statement of the pairing, and leaves
  `types.ts` declarations-only.
- **How each per-kind site achieves totality** — a `Record<WaitingKind, …>`, an
  exhaustive `switch` with a `never` check, or an equivalent — provided a
  sixteenth kind fails to compile there.
- **How a settled attempt is established for the two former `attemptInterval`
  call sites** — narrowing at the resolution site in `entry/recover.ts`, a
  settled-arm type on `PausedCursor`, or another form — provided no runtime
  re-check of the post-attempt `HEAD` observation survives.
- **The exact wording of the fatal-checkpoint message** finalization reports when
  the preserved attempt's terminal token cannot be narrowed to `DONE`, and of
  every new or revised doc comment.
- **How the `@ts-expect-error` assertions are organized** — one new test file, or
  additions to the existing `validate.test.ts` and `run-state.test.ts` — and
  which further unconstructible states beyond the listed minimum they cover.
- **The order the six decisions are implemented in**, and whether the change
  lands as one commit or several.
- **Fixture-helper shape in the test suites**: whether per-arm builders replace
  the current partial-override helpers, and how the seeded checkpoints in
  `43-list.mjs` are restructured.

Not free, because each is pinned above: which arms exist and what each requires;
the fifteen kinds and their names; which evidence each kind carries and whether
it is required, nullable, or absent; that the pairing is declared once at the
type level in `types.ts`; the finalization table in FR-3; that no banner text,
rendering, or scenario marker changes; and that no architecture guard is
weakened.

## Risks and notes

- **`22-contract-unverifiable` reaches a branch its own source comment calls
  unreachable.** `phases/verify-promise.ts` states that no end-to-end path
  reaches its uninspectable branch, while that scenario reaches it by making the
  thread directory unreadable mid-attempt. The comment is inaccurate today and
  becomes more misleading once the branch has a kind of its own; correcting it
  is within scope as part of touching that file. The parallel comment in
  `phases/prerequisite.ts` is accurate — the queue gate runs first — and its
  branch stays unreachable end-to-end after the split, which is exactly why the
  new prerequisite kind shares its sibling's banner rather than earning a
  rendering no scenario could show.
- **DR3 trades a wasted rerun for a missed queue.** When the scan failed and
  nothing was in fact pending, a `rerun` stage runs again for nothing, which for
  an implementation stage is a real expense. That is the accepted cost of never
  carrying a run past work that may exist.
- **`harness-error` and `idle-timeout` lose their structured error class and
  message.** Both are already written verbatim into the reason's `message` and
  into the settled attempt's `failure.message`, and nothing reads the structured
  form, so no information a reader can reach is lost. It is called out because it
  is the one place DR5's enumeration of two diagnostic situations removes a field
  rather than renaming one.
- **One runtime re-check survives that the type cannot delete.** Finalization has
  to narrow the preserved attempt's terminal token to build the `done` arm,
  because a `waiting` arm cannot promise a `DONE` token. DR6 assigns that
  relation to validation deliberately; the narrow is the cost of that assignment,
  and it is the reason the same function's existing fatal-checkpoint path is
  reused rather than a new failure mode introduced.
- **The fixture churn is the visible cost of a durable vocabulary change.** Every
  hand-written attempt record, waiting reason, and checkpoint in the suites and
  in `43-list.mjs` is rewritten to the new shapes. That churn is not evidence of
  a design problem, and it is the reason per-arm fixture builders are offered as
  a degree of freedom rather than prescribed.
