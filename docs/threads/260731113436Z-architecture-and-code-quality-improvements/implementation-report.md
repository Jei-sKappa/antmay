# Implementation report

Source: plan.md

## Outcome

All eleven plan tasks are complete and committed on
`refactor/architecture-and-code-quality-improvements`, eleven commits from
baseline `2d920a6` through `ec71bff`. Nothing was blocked, nothing was found
already satisfied, and no task was skipped or reordered.

The CLI now has one execution engine that owns every durable transition after
allocation. `runCommand` still does new-run preflight and writes the initial
`ready` checkpoint; `resumeCommand` is a checkpoint-read-only preflight; both
enter `executeEngine` through a typed entry value, and under the held lock the
engine is the only writer of an existing checkpoint. Recovery is driven by a
required, validated recovery value rather than by diagnostic reason ordering, so
the path that could finalize a non-`DONE` or absent attempt is gone. Recovery
decisions, Git-boundary finalization, harness-runtime resolution, thread-artifact
contracts, and phase-specific rendering each have one owner.

## Changes

**Execution ownership.** `cli/src/execution/engine.ts` holds the runnable stage
loop and its persistence boundary, entered through `ExecutionEntry`
(`allocated` | `resume`) and returning a discriminated `ExecutionResult`
(`completed`, `paused`, `interrupted`, `fatal-checkpoint`, `refused`) that each
command maps to its established exit code. The engine owns abandoned-attempt
recovery, the recovery-sensitive worktree rule, queue gating, pre-attempt
artifact checks, attempt allocation and settlement, post-`DONE` contract
checking, Git finalization, pause construction and rendering, attempt mutation,
stage advancement, and run completion. `writeCheckpoint` has exactly two
production importers: the engine and run's allocation write. The former
`runner/runner.ts` is deleted; `classify.ts`, `outcome.ts`, and `signals.ts`
remain in `runner/`.

**Checkpoint state.** Every checkpoint carries a required immutable `runtime`
identity (real or scripted). Every waiting checkpoint carries its non-empty
ordered diagnostic reasons plus exactly one recovery: `retry-stage`,
`resume-finalized-done`, `recheck-stage-contract`, or
`retry-git-finalization` — each with an exact `(stageIndex, attempt)`
reference, its snapshotted queue resolution where the variant takes one, and a
pause-time `HEAD` required on exactly the two variants that may finalize Git
after a pause and forbidden on the other two. Every attempt records
`headAtStart`, and every settled attempt records `headAfterAttempt` (forbidden
while executing). `gitCursor`, `startedScripted`, and `governingReason` are
removed; the document stays at `schemaVersion: 0` and incompatible older
documents are rejected outright.

**Recovery policy.** `cli/src/execution/recovery-policy.ts` is a pure decision
table: `decideRecovery(recovery, evidence)` returns `retry-stage`,
`advance-stage`, `finalize-boundary` (carrying the whole `FinalizingRecovery`),
or `remain-paused`. It takes no reason list, performs no I/O, and returns no
partial checkpoint. Its exported `holdsPreservedDone` predicate drives both the
clean-worktree exemption and the queue-scan-failure pause on the engine side, so
those two decisions cannot disagree.

**Git boundary.** `cli/src/gitops/boundary.ts` exposes one
`finalizeGitBoundary(request)` owning pause-movement observation, status
collection, policy evaluation, staging, staged-set verification, the declared
commit, and the final `HEAD` read, behind an `attempt` /
`after-contract-repair` / `boundary-retry` context. `evaluateBoundary`,
`finalizeBoundary`, and their boolean options are gone, and a recovered
finalization records the tip its boundary left on the preserved attempt.

**Harness runtime.** `cli/src/harness/runtime.ts` interprets the developer
toggle for a new run, enforces the persisted identity fail-closed in both
directions on resume, rereads and revalidates the live scripted scenario against
the snapshotted stage IDs, dynamically loads exactly one adapter family paired
with its own probe, probes, and normalizes versions. Commands carry one
`HarnessRuntimeLoader` dependency; program dispatch imports neither adapter
family. `cli/src/harness/scripted/cases.ts` owns the fixed case and effect
catalog behind `executeScriptedCase`, leaving `invoker.ts` a small
provider-facing adapter.

**Thread artifacts.** `cli/src/thread/artifacts.ts` is the sole owner of
artifact and plan state, patterns, prerequisites, transitions, mismatches, the
canonical dimension/value metadata, the serialized-pattern and mismatch
validators, inspection, matching, transition application, and descriptions.
Pipeline catalog, composition, and target resolution import that vocabulary, and
checkpoint validation delegates to those validators instead of carrying a second
dimension list. The domain depends on no pipeline type.

**Display.** `cli/src/display/` is `format.ts` (shared primitives and
`DisplayOptions`), `list.ts`, `preflight.ts`, `startup.ts`, and `execution.ts`,
with `terminal.ts` a small re-export barrel no production module imports. The
engine depends only on the narrow `ExecutionDisplay` contract. All pre-existing
renderings are unchanged, including the terminal snapshot. One new rendering was
added: the actionable refusal when a real-runtime checkpoint is resumed with the
scripted toggle enabled.

**Tests, scenarios, and guidance.** `cli/src/architecture.test.ts` adds 25
dependency guards over a source-read import graph covering static, dynamic,
re-export, side-effect, and type-only specifiers in either quote style. The demo
catalog runs `01`–`31`, adding `11-real-runtime-scripted-toggle-refusal` and
`19-saved-done-recovery`. `cli/AGENTS.md` describes the resulting architecture
and teaches none of the removed design. No dependency manifest, package version,
command surface, suite skill, method document, stage-catalog semantic, or
published stage-support-table row changed.

## Verification

`npm --prefix cli run check` (typecheck, full Vitest suite, tsup build) passes on
the final commit: 1024 tests across 43 files, build success. It also passed on
every commit of this implementation, and on the untouched baseline commit as a
pre-change reference.

Each task's own verification block was run and passed, including every negative
`rg` assertion the plan prescribes (no artifact validators left in the checkpoint
module, no removed checkpoint fields, no forbidden import in the recovery policy,
no `state/persist` or transition collaborator in `resume.ts`, no concrete adapter
in program dispatch or the commands).

The closing regression sweep passed in full: the 13-file focused suite
(510 tests); the scripted-harness marker absent from `dist/main.js` and present
only in its own built module; and nineteen executable-UI scenario runs — the
eleven the plan names plus five `--no-color` reruns, plus
`10-temporary-workspace-resume-refusal`, `26-interrupted`, and
`27-checkpoint-write-failure`, which the plan's sweep list omits but AC-7.5
covers. Every scenario exited on its declared code, and the `--no-color` runs
carry no residual escape sequences.

The architecture guards were mutation-tested against six deliberate boundary
violations (a `writeCheckpoint` import in `resume.ts`, a single-quoted static
import of the scripted invoker in dispatch, a type-only pipeline-type import in
the thread domain, a barrel import in `list`, a dynamic execution-display import
in the list renderer, and the engine shelling out to `git add`/`git commit`);
each failed its intended guard and was reverted.

Two checks were deliberately not run. `npm run demo` was skipped on the tasks
that changed no rendering (the Git-boundary deepening, the display split, and the
scripted-case separation), each substantiated instead by a line-level comparison
showing the affected output byte-identical. AC-7.5's "distinct visual state" and
AC-8.3's legibility without color were confirmed by reading the captured
transcripts; the demo driver itself compares exit codes only, so a human at a
live terminal remains the stronger oracle.

## Deviations and judgment calls

- **Eleven tasks touched files their `Files modified` list did not name**, in
  every case a mechanical consequence of the task's own steps: type-only import
  redirects following the artifact-type move; one required `recovery` field and
  one stale comment sentence after the state change; the `AttemptRecord` doc
  comment the recovered-finalization change made inaccurate; the barrel
  re-export the prescribed display test reaches a new renderer through; the
  `SPEC_CORRECT_DELAY_MS` import after the scripted-case move; two id
  references after the scenario renumbering; and, for the engine move,
  `readCheckpoint` relocating from `state/persist.ts` to `state/checkpoint.ts`
  (the task's own grep forbids `state/persist` in `resume.ts` while resume must
  still load and validate) plus the `refused` result variant's mapping in
  `run.ts`. Each was kept minimal.
- **AC-2.3's evidence is filesystem-observed rather than spied.** `RunDeps`
  exposes no lock or checkpoint-writer seam for `resume`, and file-scoped Vitest
  mocking would disturb a `describe.concurrent` file the repository's teardown
  convention protects. The cases hold the workspace lock externally and compare
  `state.json` byte-for-byte, which meets the criterion's own wording.
- **The recovery policy's purity test reads the module's own source.** Step 7 of
  that task mandates an in-test assertion about the import graph while AC-3.5
  says the policy's tests need no filesystem; reading the module text is the only
  mechanism available without a new dependency. The property is also enforced
  filesystem-free by that task's `rg` check and by the architecture guards.
- **`headAfterAttempt` is forbidden while an attempt is executing**, not merely
  optional as AC-2.5 asks, which makes the invariant total.
- **A new run interprets the developer toggle inside preflight rather than ahead
  of it**, because the resolver needs the selected stage IDs. An invalid toggle
  combined with an earlier preflight failure now reports the earlier failure;
  both exit `1`, the earlier preflight is read-only, and the toggle still fails
  before adapter loading and before allocation.
- **The display barrel was kept** rather than deleted, which the spec's degrees
  of freedom permit. It is the cross-phase import point the pre-split assertions
  and snapshot use as the compatibility oracle, and the architecture guards now
  forbid any production module importing it and require it to declare nothing of
  its own.
- **Three resume renderings changed shape** while keeping their exit code,
  stderr text, and checkpoint bytes, as a consequence of moving the transitions
  behind engine entry: a dirty-worktree refusal now prints the startup block and
  takes the lock before refusing; a signal at the resumed durable cursor now
  renders the `INTERRUPTED` block; a fatal checkpoint error on an entry
  transition now renders the `FAILED — checkpoint write` block. Both blocks have
  owning scenarios, and all three scenarios were run.
- **Two latent losses were fixed in passing**: a locked queue-scan failure now
  preserves the pause's underlying recovery instead of downgrading it to
  `retry-stage`, and the saved-`DONE` queue decision reads the preserved
  attempt's own `pendingFiles` rather than the pause's reason list, which the
  re-pause path overwrites.

## Remaining concerns

- **Two unreachable branches remain as fail-closed guards.** The engine's
  `uninspectable` contract evidence and the matching `promise-uninspectable`
  pause prose cannot be reached end to end, because a thread whose artifacts
  cannot be read also fails the queue scan, which is evaluated first. The policy
  test covers the directive directly; the engine test asserts the reachable
  queue-scan hold. Similarly, `attemptInterval` throws a bare `Error` for a
  state checkpoint validation already forbids, which would surface as an
  unhandled rejection rather than a typed exit code.
- **The architecture guards read source text**, so they are comment-blind, the
  staging rule inspects the first Git argument, the parallel-dimension rule keys
  on table-name shape, type-only detection is approximate, and a boundary
  crossed through a third module that re-exports a forbidden symbol would
  escape the import-graph rules. Two guards pin exact module lists, so a
  legitimate new caller fails them by design — the intended prompt to argue the
  direction.
- **`ARTIFACT_VALUE_KINDS` is total by typecheck but not type-linked** to each
  dimension's actual value type, so a mis-keyed or newly added dimension could
  change what the serialized validators accept without a compile error. The
  metadata-coverage test also rests on a hand-maintained pair list rather than
  on `keyof ArtifactState`.
- **Two engine seams are large.** `enterFromDurableCursor` is roughly 360 lines
  of three nested closures inside a ~1450-line `engine.ts`, a faithful move of
  the retired resume block into the module the plan designates as sole
  transition owner. `advanceCursor` and the stage loop's own advance branch both
  compute "increment, persist ready-or-completed" and were left separate because
  the loop's branch also settles the attempt and emits its own events.
- **`validateWaitingRecovery`'s doc comment overstates what it enforces**: it
  claims to gate exactly the evidence each kind acts on, but only the attempt
  reference and the pause-time `HEAD` are checked for forbidden presence, and no
  unknown keys are rejected anywhere in the recovery value.
- **`readCheckpoint` puts filesystem I/O in the schema module**, the trade that
  leaves `state/persist.ts` a pure writer and prevents a read-only consumer from
  reaching the writer through the module it reads from.
- **Scenario 11's assertion surface is one exit code**, so a future
  checkpoint-schema change could leave it green while it no longer reaches the
  rendering it exists to show; "no probe, no lock, no mutation" is asserted in
  `commands/resume.test.ts` instead. It also restates the checkpoint scaffolding
  `31-list.mjs` carries, so a schema change is two edits.
- **Some test `describe` titles cite AC identifiers from an earlier thread**
  (for example `AC-15.4`, `AC-17.1`) that resolve to nothing findable. The
  convention is pre-existing in those files.

## Follow-ups

- Derive `ARTIFACT_VALUE_KINDS` from `ArtifactState` and tie the
  metadata-coverage list to `keyof ArtifactState`, so a new dimension cannot
  silently narrow the serialized validators or escape description coverage.
- Soften or complete `validateWaitingRecovery`'s doc comment — either state the
  two fields actually gated, or add the missing forbidden-key checks.
- Give `attemptInterval`'s unreachable invariant the same typed-failure
  treatment as every other resume-path error, or drop the throw.
- Reconsider whether the per-scenario checkpoint scaffolding duplicated between
  scenario 11 and `31-list.mjs` should move behind a shared seed helper, which
  is a change to the scenario module rule rather than to this implementation.
- Retire the stale cross-thread AC identifiers in test `describe` titles when
  those files are next edited.
