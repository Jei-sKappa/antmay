# Spec: CLI architecture and code quality improvements

Decision citations refer to records in `decisions.md`. The two audit inputs are
`resources/architecture-review.html` and `resources/code-review.md`.

## Intended outcome

Refactor the Antmay CLI so one execution engine owns every durable transition
after a run has been allocated, with focused modules owning recovery policy,
Git-boundary finalization, harness-runtime resolution, thread artifact
contracts, and phase-specific terminal rendering. A validated checkpoint must
encode enough typed evidence for the engine to recover safely without deriving
control flow from diagnostic reason ordering (per `decisions.md` DR1–DR4 and
DR11).

The completed implementation must eliminate the known path that can finalize a
non-`DONE` or absent attempt, stop loading the scripted developer harness during
ordinary real execution, remove duplicated artifact-contract knowledge, and
split the terminal god module without redesigning the terminal interface (per
DR2, DR5–DR8).

This is one implementation scope. The later strict plan owns its bounded task
decomposition and ordering; this specification defines the complete target,
the dependencies that constrain that plan, and the evidence required at review
(per DR9).

## Context

The thread was opened to resolve a whole-CLI architecture review and code
quality review. The audits found several useful existing seams, but also found
that important protocols remain distributed across their callers:

- `executeRun` and `resumeCommand` independently mutate checkpoints, render
  pauses, apply queue resolutions, advance stages, and finalize recovered work;
- the checkpoint's ordered `WaitingReason` list both explains a pause and
  controls resume, while its optional fields do not prove that the attempt being
  finalized exists or reported `DONE`;
- the runner and resume command both sequence Git observations, evaluation,
  staging, commit, and final `HEAD` reads;
- run and resume independently choose and probe real versus scripted harness
  implementations, and production dispatch imports both adapter families;
- artifact-state types, filesystem meaning, validation, and descriptions have
  different owners; and
- `display/terminal.ts` combines unrelated command phases in one large source
  file.

The checkpoint defect is not theoretical: a structurally accepted contract or
boundary pause can reach resume with a `BLOCKED` attempt or no attempt, after
which the existing recovery path can mark it `done` or skip the stage. The CLI
is pre-release and all checkpoint documents remain at `schemaVersion: 0`, so
the safe state model can replace the current one without migrations or
compatibility machinery.

## Scope

### In scope

1. One execution engine entered by both `run` and `resume` after their
   command-specific preflight and lock acquisition.
2. A required, discriminated waiting-recovery model with exact attempt
   references and attempt-local Git evidence; removal of the global
   `gitCursor`.
3. A pure pause-and-recovery policy that returns domain directives and performs
   no I/O or checkpoint mutation.
4. One semantic Git-boundary finalization operation covering normal attempts,
   first-time finalization after contract repair, and retry after a prior
   boundary or commit failure.
5. A required immutable real-versus-scripted runtime identity in every
   checkpoint, plus one shared lazy harness-runtime resolver.
6. Separation of the scripted provider adapter from its fixed case and effect
   catalog without changing any scripted case.
7. One thread-artifact domain owner for artifact state, serialized contract
   validation, inspection, projection, mismatch evaluation, and descriptions.
8. Focused terminal-rendering modules for shared primitives, listing,
   preflight refusals, startup and developer diagnostics, and execution
   lifecycle output.
9. Regression, architecture, unit, integration, real-Git-fixture, and
   executable UI coverage required by this specification.
10. Updating `cli/AGENTS.md` so its execution model, module map, checkpoint
    recovery, runtime-selection, and display guidance describe the resulting
    architecture.

### Out of scope

- New commands, subcommands, flags, exit codes, pipeline stages, catalog
  entries, providers, harness IDs, queue kinds, terminal-outcome tokens, or
  workspace strategies.
- Changes to stage targets, artifact prerequisites, promised transitions, Git
  policies, queue resolutions, prompt construction, attempt-log content,
  provider-session capture, or continuation commands.
- A full discriminated union for the entire checkpoint. Only waiting recovery
  and the runtime identity require the new discriminated state (per DR2 and
  DR5).
- A single presentation interface spanning `run`, `resume`, `list`, preflight,
  startup, and lifecycle output. The phase-specific seams are intentional (per
  DR8).
- Making artifact state opaque, class-based, or non-serializable. Catalog and
  checkpoint contracts remain plain data (per DR7).
- A checkpoint migration, compatibility shim, deprecation path, schema-version
  bump, or preservation of existing version-zero state files.
- New scripted cases, changes to scenario schema or live-reload behavior, or
  treating scripted mode as a supported provider.
- A terminal redesign or opportunistic wording, styling, ordering, or stream
  changes outside the new real-runtime/scripted-toggle refusal.
- Suite skills, method documentation, the trusted stage catalog, or the
  published CLI stage-support reference. Their invocation and artifact-state
  contracts do not change.
- Arbitrary adjacent cleanup, new dependencies, package-version changes,
  publishing, staging, committing, or pushing.
- The future strict plan's task boundaries. Planning must derive them from this
  specification rather than embedding them here (per DR9).

## Expected behavior

### 1. Command and execution ownership

`runCommand` remains responsible for new-run-only work: arguments and document
resolution, pipeline composition, same-thread-run protection, thread and
workspace preflight, runtime resolution, signal setup, lock acquisition,
under-lock allocation checks, run-directory creation, and creation of the
initial validated `ready` checkpoint. Initial checkpoint creation is allocation,
not a transition of existing state (per DR10).

`resumeCommand` remains responsible for locating and validating one checkpoint,
rejecting a completed run, revalidating its recorded thread and workspace,
resolving the checkpoint's immutable runtime, signal setup, and acquisition of
the recorded workspace lock. This preflight is read-only with respect to the
checkpoint. In particular, the command must not branch on a recovery variant or
waiting-reason kind, apply a worktree exemption based on one, mutate an attempt,
or persist a checkpoint (per DR10).

After allocation or validated resume preflight, both commands call the same
execution engine through a typed entry value. Under the held lock, that engine
is the only owner of:

- recovery of an abandoned executing attempt;
- recovery-sensitive worktree checks;
- queue scanning, refresh, and gating;
- pre-attempt artifact-prerequisite checks;
- harness attempt allocation, invocation, and settlement;
- post-`DONE` promised-artifact checks;
- Git finalization;
- waiting-state construction and refresh;
- attempt mutation, stage advancement, and run completion; and
- every rewrite of an existing checkpoint.

Commands retain startup and preflight presentation, signal-handler lifecycle,
lock release, and mapping of the engine's structured result to the established
process exit codes. The engine emits lifecycle events through the narrow
execution-display seam and does not assemble terminal prose (per DR1, DR8, and
DR10).

The engine may be procedural, but it must coordinate focused collaborators. It
must not absorb Git sequencing, serialized artifact-contract knowledge,
runtime-selection rules, terminal rendering, or the pure decision table of
pause recovery into one replacement god function (per DR1 and DR4).

### 2. Persisted runtime, attempt, and waiting state

Every newly allocated checkpoint carries a required runtime identity whose two
legal meanings are real and scripted. The identity is immutable for that run
(per DR5). Checkpoint validation rejects a missing or unknown identity.

Every attempt records the `HEAD` observed at its start. Once an attempt settles,
it also records the post-attempt `HEAD` observation associated with that attempt.
An executing attempt has not yet acquired the settled observation. A recovery
state that needs to compare human movement across a pause carries its own latest
pause-time `HEAD` observation. The stage-global `gitCursor` is removed from the
checkpoint model (per DR11).

Every `waiting-for-user` checkpoint carries both:

1. its non-empty ordered diagnostic reason list, used to explain everything
   observed at the pause; and
2. exactly one required recovery value, used exclusively to control resume.

Changing the order of diagnostic reasons may change their reading order but
must not change the recovery selected. The engine and commands never select a
recovery by reading reason position or kind (per DR2 and DR11).

The recovery value has exactly these four semantic variants:

- **Retry stage.** After applicable queue, worktree, and artifact gates pass,
  launch a new attempt at the current stage. This variant does not pretend a
  previous attempt is finalizable.
- **Resume finalized `DONE`.** Reference an exact current-stage attempt that
  already has result `done` and terminal token `DONE`, and carry the stage's
  snapshotted `advance` or `rerun` queue resolution. While queues remain
  pending, the checkpoint remains paused; when they clear, apply that recorded
  resolution without finalizing the attempt again.
- **Recheck stage contract.** Reference an exact current-stage attempt whose
  terminal token is `DONE` but whose result remains waiting because its promised
  artifact state was not accepted. Reinspect the promise first. If it now
  holds, enter first-time Git finalization for that attempt. If it is still
  unmet and the worktree is clean, retry the stage. If it remains unmet with a
  dirty worktree, or cannot be inspected, remain paused without discarding the
  attempt or the human's work.
- **Retry Git finalization.** Reference an exact current-stage waiting attempt
  with terminal token `DONE` whose artifact contract has already passed. Retry
  the Git boundary without invoking the harness.

The pure policy may return a remain-paused directive for fresh evidence; there
is no fifth persisted recovery kind for that result (per DR4 and DR11).

Checkpoint validation is exhaustive across the recovery value and attempt
history. It rejects, at minimum, an absent referenced attempt, a reference to a
different stage or attempt number, a non-`DONE` terminal token, an incompatible
attempt result, a queue resolution that does not match the snapshotted current
stage, absent required start/post-attempt/pause `HEAD` evidence, a recovery on a
non-waiting condition, or a waiting checkpoint without recovery. There is no
fallback to the last attempt and no optional attempt or `HEAD` path that can
advance a stage (per DR2 and DR11).

### 3. Pure pause and recovery policy

A focused policy module accepts a validated recovery value plus structured
fresh evidence supplied by the engine. Its closed directive vocabulary covers
retrying the current stage, advancing, requesting Git finalization of the
referenced saved `DONE`, and remaining paused with updated diagnostic facts
(per DR4).

The policy owns the decision table for queue results, artifact-contract
reinspection, worktree cleanliness, finalized-`DONE` queue resolution, and
recoverable versus still-paused states. It returns domain directives, never a
partial checkpoint or serialized patch. It performs no filesystem or Git
access, harness invocation, checkpoint persistence, terminal rendering, or
clock access. The engine collects evidence, invokes the policy, translates one
directive into a complete checkpoint transition, and persists that transition.

A queue scan failure or still-present bundle must preserve the underlying
recovery action so a later resume can continue safely. Refreshing diagnostic
queue reasons must not rewrite the recovery variant merely because reason
precedence or presentation changes. Existing queue-resolution behavior remains
unchanged (per DR2, DR4, and DR12).

### 4. Git-boundary finalization

The Git-boundary module exposes one asynchronous semantic finalization operation
instead of requiring callers to sequence status collection, `HEAD` reads,
policy evaluation, staging, staged-set verification, commit, and final `HEAD`
observation. Its input distinguishes three contexts (per DR3):

1. normal finalization immediately after an attempt reports `DONE` and its
   artifact promise passes;
2. first-time finalization after a saved `DONE` attempt's artifact contract is
   repaired; and
3. retry after an earlier Git-policy violation or commit failure.

The operation resolves allowed selectors, observes all staged, unstaged,
deleted, and untracked paths, applies `headMayChange` and `changeRequired`,
stages only the validated set, verifies that the staged set exactly equals that
validated set, optionally makes the declared boundary commit, and observes the
final `HEAD`. It returns structured success, Git-policy violation, or commit
failure data, including the Git observations the engine must persist and any
diagnostic fact that `HEAD` moved while paused. It never mutates a checkpoint,
advances a stage, chooses a queue resolution, or renders prose.

Normal finalization enforces the stage's `HEAD` rule across the attempt's own
start and post-attempt observations. First-time finalization after contract
repair also evaluates that original attempt interval; a human's later movement
across the pause is diagnostic rather than part of the attempt. Retry after an
already evaluated boundary does not reinterpret movement across the pause as a
new attempt-level violation. Saved-`DONE` recovery retains the existing rule
that a deliberately committed intended change can satisfy `changeRequired`
even when the current worktree is clean. Selector bounding and staged-set
verification remain strict in every context (per DR3 and DR12).

Runner, command, engine, and recovery-policy code must not reproduce any
portion of this Git call protocol. Pure internal helpers may remain separately
unit tested inside the Git-boundary domain.

### 5. Harness runtime identity and lazy resolution

For a new run, the existing developer toggle selects the runtime: unset or
empty selects real, the exact string `1` selects scripted, and every other
non-empty value is an error. The selected identity is persisted in the initial
checkpoint (per DR5 and DR12).

On resume, runtime selection is fail-closed in both directions:

- a scripted checkpoint requires the exact toggle value `1` and a valid live
  scripted scenario;
- a real checkpoint resumes only in real mode and refuses when the toggle is
  `1`; and
- an invalid non-empty toggle value remains an error.

These refusals occur before executable probing, lock acquisition, or checkpoint
mutation. A scripted scenario remains external to the checkpoint and is reread
and validated against the exact snapshotted stage IDs on every scripted resume
(per DR5).

Run and resume share one harness-runtime resolver. It interprets or enforces the
runtime identity, loads and validates the live scripted scenario when
applicable, dynamically imports exactly the selected adapter family, keeps an
invoker paired with its matching executable probe, probes the requested logical
harnesses, rejects missing version results, and returns structured failures,
normalized versions, and runtime metadata. Terminal prose stays in the display
layer; resolved scripted prompts are exposed through an observational callback
(per DR6).

Production dispatch loads only the selected command and the small runtime
resolver. It does not import real and scripted invokers and probes together.
Command dependency bags expose one injectable lazy runtime-loader seam rather
than all concrete adapters. Selecting real mode must not evaluate the scripted
provider adapter or its case/effect catalog; selecting scripted mode need not
load Sandcastle. Help, version, usage errors, and `list` retain their existing
light import and side-effect boundaries (per DR6 and DR12).

The scripted provider-facing adapter is separated from the large fixed case and
effect catalog. Every existing case name, compatibility rule, deterministic
effect, prompt observation, progress event, session behavior, failure mapping,
and scenario contract remains unchanged.

### 6. Thread artifact contract ownership

A cohesive thread-artifact domain becomes the canonical owner of (per DR7):

- artifact-state and plan-state values;
- serializable patterns, prerequisites, transitions, and mismatches;
- canonical dimension and value metadata;
- validation of untrusted serialized patterns and mismatch records;
- filesystem inspection and plan-topology classification;
- prerequisite and promised-state matching;
- simulated transition application; and
- dimension names and plain-language descriptions.

The pipeline catalog and composition import this vocabulary and its operations
from the thread domain. Checkpoint validation delegates artifact-pattern and
mismatch validation to that domain instead of carrying another dimension list.
Display consumes the domain's descriptions while continuing to own layout.
Target resolution may read a declared artifact dimension when its rule
genuinely depends on it.

The representation remains plain, serializable data suitable for trusted
catalog entries and checkpoint snapshots. The meaning of every existing
dimension, filesystem shape, prerequisite, transition, mismatch, and rendered
description remains unchanged. The thread-artifact domain must not depend on
pipeline types merely to define its own vocabulary.

### 7. Terminal rendering by phase

Terminal implementation is split into focused modules for shared painting and
formatting primitives, run listing, structured preflight refusals, startup and
developer diagnostics, and execution lifecycle output. The engine depends only
on the narrow synchronous execution-display interface; commands call the
focused renderers for their own phases (per DR8).

No wide presentation interface is introduced. A test double for the execution
engine is not required to implement listing, startup, or preflight methods, and
the list command does not depend on lifecycle rendering. Shared primitives may
be internal to the display domain, and a small barrel may preserve convenient
imports.

All existing terminal content, stdout/stderr selection, block ordering,
non-color readability, and scenario outcomes remain byte-for-byte or
assertion-for-assertion compatible with their current tests. The one new
distinct refusal—attempting to resume a real-runtime checkpoint while the
scripted toggle is enabled—must clearly identify the mismatch, refuse to switch
the existing run's runtime, and tell the developer how to resume it in real
mode. It receives its own executable UI scenario (per DR5, DR8, and DR12).

## Constraints and integration boundaries

- Preserve Node `>=22`, ESM, strict TypeScript, tsup, Vitest, the sole runtime
  dependency, existing exit codes, and the command surface documented in
  `cli/AGENTS.md`.
- Add no runtime or development dependency for state modeling, validation,
  policy evaluation, module loading, or display splitting.
- Preserve the dynamic-import discipline: bootstrap and command dispatch remain
  light, and non-execution commands do not load configuration, state, Git, or
  harness subsystems.
- Preserve atomic checkpoint writes, workspace-lock exclusivity, manual stale-
  lock recovery, and command ownership of lock release.
- Keep the real and scripted implementations behind the existing
  provider-neutral harness request, event, and outcome boundary.
- Keep runtime and recovery data at `schemaVersion: 0`. Reject incompatible old
  documents; do not add optional fields, fallbacks, migrations, or shims to make
  them validate (per DR1, DR5, DR11, and DR12).
- Keep diagnostic reasons self-contained for checkpoint inspection and terminal
  rendering even though they no longer control resume.
- Keep domain modules structured: the execution engine may coordinate policy,
  Git, artifact, harness, state, and display collaborators but may not duplicate
  their internal rules. Likewise, the Git, policy, artifact, harness, and display
  modules may not persist or advance checkpoints.
- Establish the typed recovery model and its policy and Git collaborators before
  deleting the old resume-transition paths. Replace runtime adapter selection as
  one paired invoker/probe change. Move artifact types and their serialized
  validators together so there is never a second canonical dimension list.
  These are planning dependencies, not a prescribed task list (per DR9).
- Preserve the repository's concurrent-test teardown conventions and cached Git
  fixture strategy in `run.test.ts`, `resume.test.ts`, and runner/engine tests.
- Every intentionally distinct terminal rendering requires a demo scenario.
  Existing renderings are exercised by their current scenarios; the new runtime
  mismatch adds one scenario.
- Update `cli/AGENTS.md` to describe the resulting durable architecture and
  remove descriptions of `startedScripted`, `gitCursor`, reason-driven recovery,
  duplicated command transitions, or monolithic display structure. Do not turn
  it into an inventory of obvious implementation details.
- The CLI stage catalog, artifact prerequisites and transitions, and skill
  invocation posture do not change, so the root rule does not require an edit to
  the published stage-support table.
- Implementation must leave no half-migrated alternate engine, compatibility
  path, unused adapter injection, copied artifact validator, or obsolete
  terminal implementation.

## Functional requirements and acceptance criteria

### FR-1 — One durable execution owner

- **AC-1.1** Command-integration tests prove both a newly allocated `ready`
  checkpoint and a validated resumable checkpoint enter the same execution
  engine, and all established completed, waiting, interrupted, and fatal results
  map to their existing process exit codes (DR1, DR10, DR12).
- **AC-1.2** Resume tests inject a persistence spy and prove every preflight
  refusal—including malformed checkpoint, completed run, identity mismatch,
  runtime mismatch, probe failure, and lock refusal—leaves the checkpoint
  byte-for-byte unchanged (DR10, DR12).
- **AC-1.3** Source-level dependency checks or equivalent architecture tests
  show `resumeCommand` imports or calls no recovery-kind dispatcher, waiting-
  reason control helper, Git finalizer, attempt mutation helper, stage-advance
  helper, or checkpoint writer; after engine entry, production checkpoint writes
  occur only through the engine's persistence boundary (DR1, DR10).
- **AC-1.4** Engine integration tests cover abandoned-executing recovery,
  pre-attempt queue and artifact gates, attempt allocation and settlement,
  post-`DONE` contract checking, pause persistence, stage advancement, and final
  completion under the lock (DR1, DR10).
- **AC-1.5** No production path retains the former resume-owned persistence,
  pause-rendering, boundary-finalization, attempt-replacement, or advancement
  implementation; source search finds one transition owner (DR1).

### FR-2 — Validated explicit recovery state

- **AC-2.1** Checkpoint round-trip tests accept a valid example of each of the
  four waiting recovery variants and preserve its diagnostic reason order and
  recovery data exactly (DR2, DR11).
- **AC-2.2** Table-driven validator tests reject each of these independently:
  missing recovery, unknown recovery kind, absent attempt reference, wrong stage
  index, wrong attempt number, referenced non-`DONE` token, incompatible attempt
  result, mismatched queue resolution, missing attempt start `HEAD`, missing
  settled post-attempt `HEAD`, missing recovery pause-time `HEAD`, waiting
  recovery on another checkpoint condition, and a waiting checkpoint with no
  diagnostic reason (DR2, DR11).
- **AC-2.3** Regression tests reproduce the audit's accepted `BLOCKED`-attempt
  fixture and a no-attempt fixture and prove both are rejected before resume can
  acquire a lock or write state; no path can rewrite either as `done` or advance
  its stage (DR2).
- **AC-2.4** Reordering or adding diagnostic reasons in otherwise identical
  valid checkpoints does not change the policy directive selected in tests
  (DR2, DR4).
- **AC-2.5** Attempt tests require a start `HEAD` on every attempt, require a
  post-attempt `HEAD` on every settled attempt, permit its absence only while
  executing, and bind recovery references to the exact `(stageIndex, attempt)`
  pair (DR11).
- **AC-2.6** The accepted checkpoint schema contains the required runtime and
  recovery data, contains no global `gitCursor`, remains numeric version `0`,
  and rejects representative old documents without a migration or compatibility
  branch (DR5, DR11, DR12).

### FR-3 — Pure recovery decisions

- **AC-3.1** Exhaustive policy tests cover all recovery variants against queue
  success, queue failure, and pending files and show that a held queue preserves
  the underlying recovery action (DR4, DR11).
- **AC-3.2** Contract-recheck policy tests cover promise satisfied, promise
  still unmet with clean worktree, promise still unmet with dirty worktree, and
  inspection failure, yielding respectively Git finalization, stage retry,
  remain paused, and remain paused (DR4, DR11).
- **AC-3.3** Finalized-`DONE` tests prove `advance` advances exactly once and
  `rerun` starts a new attempt at the same stage only after queues clear (DR11,
  DR12).
- **AC-3.4** Git-retry policy tests request finalization of the exact referenced
  attempt without a harness invocation and keep the same recovery when fresh
  Git evidence still fails (DR3, DR4, DR11).
- **AC-3.5** The policy module's tests require no filesystem, Git repository,
  clock, writable stream, harness, or checkpoint writer, and its public results
  contain directives rather than partial `RunCheckpoint` objects (DR4).

### FR-4 — Deep Git finalization

- **AC-4.1** Real Git-fixture tests call one public finalization operation for
  normal, contract-repair, and boundary-retry contexts and cover clean advance,
  allowed commit, out-of-bounds change, forbidden attempt `HEAD` movement,
  required-change failure, deliberately precommitted recovery, staged-set
  mismatch, and commit-hook failure (DR3, DR12).
- **AC-4.2** Normal and contract-repair tests enforce `headMayChange` against the
  saved attempt start/post-attempt pair; boundary-retry tests treat later human
  `HEAD` movement as structured diagnostic evidence rather than a new attempt
  violation (DR3, DR11).
- **AC-4.3** Every success and failure result carries the final Git observation
  needed for the engine's next checkpoint, and the engine persists that evidence
  on the attempt or recovery state identified by the request (DR3, DR11).
- **AC-4.4** Source-level dependency checks show callers outside the Git domain
  do not sequence boundary status, evaluation, staging, staged-set verification,
  commit, and final `HEAD` reads, and the Git domain imports no checkpoint
  persistence or display implementation (DR3).
- **AC-4.5** Existing selector matching, NUL-safe path handling, commit subject,
  active-hook, no-empty-commit, and exact staged-set tests continue to pass
  unchanged in meaning (DR3, DR12).

### FR-5 — Immutable, lazy harness runtime

- **AC-5.1** New-run tests prove unset or empty toggle selects and persists real,
  exact `1` selects and persists scripted, and every other non-empty value fails
  before allocation or adapter loading (DR5, DR6).
- **AC-5.2** Resume tests prove a scripted checkpoint requires exact toggle `1`
  and a valid live scenario, while a real checkpoint refuses exact toggle `1`;
  every mismatch exits `1` before probe, lock acquisition, harness invocation,
  or checkpoint mutation (DR5, DR12).
- **AC-5.3** Scripted resume tests modify the scenario between invocations and
  prove it is reread and revalidated against the full snapshotted stage set
  without storing its path, content, or digest in the checkpoint (DR5).
- **AC-5.4** Runtime-resolver tests inject real and scripted lazy-loader spies
  and prove exactly one adapter family is loaded and paired with its own probe;
  real selection never evaluates the scripted invoker or case/effect catalog,
  and scripted selection does not load Sandcastle (DR6).
- **AC-5.5** Program and command dependency tests prove help, version, usage
  errors, and `list` do not interpret the toggle or load command, runtime, Git,
  state, or harness implementations beyond their existing boundaries (DR6,
  DR12).
- **AC-5.6** Probe tests reject any requested harness without a non-empty
  normalized version and preserve existing aggregate failure diagnostics; the
  display layer, not the resolver, renders multiline terminal prose (DR6,
  DR12).
- **AC-5.7** Existing scripted scenario, case compatibility, deterministic
  effect, prompt observation, progress event, synthetic session, attempt-log,
  and failure-normalization tests pass after the provider adapter and fixed case
  catalog are split (DR6, DR12).

### FR-6 — One thread artifact contract domain

- **AC-6.1** Type and import checks show artifact state, plan state, patterns,
  prerequisites, transitions, mismatches, dimension/value metadata, serialized
  validators, inspection, matching, transition application, and descriptions
  originate from the thread-artifact domain; no parallel artifact dimension
  list remains in pipeline or checkpoint code (DR7).
- **AC-6.2** Checkpoint validator tests exercise artifact patterns and mismatch
  records through the thread-domain validator and reject unknown dimensions or
  values exactly as before (DR7, DR12).
- **AC-6.3** Existing filesystem inspection, plan-topology, semantic-blindness,
  prerequisite, promised-state, transition, pipeline composition, target
  resolution, and artifact-description tests pass unchanged in meaning (DR7,
  DR12).
- **AC-6.4** Catalog stages and checkpoint snapshots remain plain JSON-like
  serializable objects, and a JSON round trip preserves every artifact contract
  consumed by composition and execution (DR7).
- **AC-6.5** The thread-artifact domain has no dependency on pipeline types for
  its own vocabulary; pipeline and checkpoint consumers depend on the domain in
  the intended direction (DR7).

### FR-7 — Phase-specific terminal modules

- **AC-7.1** Display code is divided into focused modules for shared primitives,
  listing, preflight refusals, startup/developer diagnostics, and execution
  lifecycle rendering; no replacement interface requires a consumer to
  implement unrelated command phases (DR8).
- **AC-7.2** Execution-engine tests can use a narrow null or recording display
  without list, startup, or refusal methods, while command and list tests call
  their focused renderers directly (DR8).
- **AC-7.3** Existing terminal tests continue to assert the same text, stream,
  ordering, ANSI gating, wrapping-sensitive content, and non-color meaning for
  every pre-existing rendering (DR8, DR12).
- **AC-7.4** A new demo scenario creates a real-runtime checkpoint, attempts
  resume with the scripted toggle enabled, displays the actionable immutable-
  runtime refusal, exits `1`, and stops without probe, lock, or checkpoint
  mutation (DR5, DR12).
- **AC-7.5** Every existing affected demo scenario retains its declared exit
  code and visual state after the module split; scenarios are not duplicated or
  rewritten solely because implementation files moved (DR8, DR12).

### FR-8 — Preserved CLI contract and complete verification

- **AC-8.1** `npm --prefix cli run check` passes: typecheck, the complete Vitest
  suite, and the production build all succeed with no half-migrated path (DR9,
  DR12).
- **AC-8.2** Regression coverage proves command grammar and help, exit codes,
  pipeline composition, stage snapshots, artifact prerequisites and promises,
  queue resolutions, lock behavior, signals, prompt rendering, logs, session
  capture, continuation commands, and ordinary terminal output remain unchanged
  except where FR-2 and FR-5 explicitly require rejection (DR12).
- **AC-8.3** Affected executable UI scenarios—including ordinary success,
  representative retry and saved-`DONE` recovery, Git and contract pauses,
  startup/listing, and the new runtime mismatch—run successfully; scenarios
  whose rendering depends on color also remain legible with `--no-color`
  (DR8, DR12).
- **AC-8.4** The production build and lazy-loader tests show the scripted adapter
  and case catalog are separate lazy chunks or modules not evaluated during a
  real run or resume (DR6, DR12).
- **AC-8.5** `cli/AGENTS.md` accurately describes the one-engine transition
  model, four waiting recoveries, attempt-local Git evidence, immutable runtime
  resolver, thread-owned artifact contracts, and phase-specific display layout,
  and contains no instruction that teaches the removed architecture (DR5–DR8,
  DR10–DR12).
- **AC-8.6** No suite skill, method document, trusted stage catalog entry, CLI
  stage-support table row, dependency manifest, package version, or command
  surface changes as part of this implementation (DR9, DR12).

## Coverage and traceability

| Expected-behavior area | Requirements | Decision sources |
| --- | --- | --- |
| Command versus engine ownership | FR-1 | DR1, DR10, DR12 |
| Persisted runtime, attempt, and waiting state | FR-2 | DR2, DR5, DR11, DR12 |
| Pure pause and recovery policy | FR-3 | DR2, DR4, DR11, DR12 |
| Complete Git finalization protocol | FR-4 | DR3, DR11, DR12 |
| Runtime identity, selection, probing, and lazy loading | FR-5 | DR5, DR6, DR12 |
| Thread artifact contract ownership | FR-6 | DR7, DR12 |
| Phase-specific terminal rendering | FR-7 | DR5, DR8, DR12 |
| Preserved external behavior and final verification | FR-8 | DR9, DR12 |

Every expected behavior above maps to at least one acceptance criterion. The
later strict plan must preserve these identifiers in its task acceptance and
integration verification so adherence can be checked without recovering this
thread's discussion.

## Degrees of freedom

The implementer and future strict plan may choose:

- exact internal file names, folder layout, exported type names, and function
  names for the execution engine, recovery policy, runtime resolver, artifact
  domain, and focused display modules, provided their ownership and dependency
  directions satisfy the requirements;
- whether the engine is expressed as one procedural loop with focused helpers
  or several internal functions, provided there remains one persistence and
  transition owner and no collaborator policy is duplicated;
- the exact plain-object serialization keys used for the required runtime
  identity, attempt reference, attempt-local Git observations, and four recovery
  variants, provided the validator and round-trip behavior enforce the specified
  semantics;
- whether the display domain exposes a small barrel or consumers import focused
  renderers directly;
- the exact split of the scripted fixed-case catalog into one or more internal
  files, provided the provider adapter stays small and case behavior does not
  change;
- the exact wording and styling of the new real-runtime/scripted-toggle refusal,
  provided it states the immutable mismatch, refuses provider switching, gives
  an actionable real-mode correction, stays understandable without color, and
  satisfies AC-7.4;
- test file placement, fixture factoring, table structure, and architecture-test
  mechanism, provided every AC remains machine-checkable and the repository's
  concurrency and Git-fixture constraints are preserved; and
- the strict plan's task boundaries and detailed ordering, provided it respects
  the material dependencies in this specification and leaves appropriate task
  and integration gates.

These freedoms do not permit changing the four recovery meanings, module
ownership, runtime immutability, checkpoint rejection rules, Git semantics,
observable preservation boundary, or acceptance evidence.
