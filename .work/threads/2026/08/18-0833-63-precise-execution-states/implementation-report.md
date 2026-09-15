# Implementation report

Source: `spec.md`

## Outcome

Implemented end to end. Every functional requirement and acceptance criterion in
the spec is satisfied, across five commits on branch
`refactor/architecture-and-code-quality-improvements`.

The durable execution vocabulary now admits only legal states. An `executing`
attempt carrying an ending timestamp, a `done` attempt carrying none, a
`pending-queues` reason with no pending files, and a `waiting-for-user`
checkpoint with no pause object are all unconstructible rather than merely
undetected, and the invariants that were upheld by convention across the
validator, the transitions, pause assembly, and pause equality are upheld by the
compiler at all four sites at once.

One behavioral change reached the run, as the spec intended: the finalization of
a saved `DONE` whose recorded queue observation is unavailable now applies the
stage's declared queue resolution instead of reading the absent scan as "nothing
pending". Nothing else a user observes changed — no terminal rendering, exit
code, command surface, or ordering.

## Changes

**The attempt record is a union over its four dispositions (DR1, DR2).**
`AttemptRecord` in `cli/src/state/checkpoint/types.ts` became a four-arm
discriminated union over `result`, assembled from new declarations
`AttemptIdentity`, `AttemptSettlement`, `DoneTerminalResult`, `AttemptFailure`,
and `QueueObservation`, with `ExecutingAttemptRecord` and `SettledAttemptRecord`
aliases for the sites that hold one. The `executing` arm declares
`terminalResult: null` and carries no ending, no post-attempt `HEAD`, and no
queue observation; the three settled arms require `endedAt` and
`headAfterAttempt`; `done` requires a terminal result whose token is `DONE`; the
two non-DONE arms require a `failure` whose `kind` is typed `WaitingKind`. The
optional `pendingFiles` key was replaced by a required two-case `queues`
observation on every settled arm — observed, carrying a sorted list that may be
empty, or unavailable, carrying nothing. `execution/attempts.ts:attemptInterval`
was deleted with its unreachable failure branch; `referencedAttempt` now returns
a settled arm and a new `latestSettledAttempt` supplies the record a pause
describes, so neither `entry/finalize.ts` nor `entry/refresh.ts` threads an
`InvariantResult` for the post-attempt `HEAD`. Settlement records the two queue
cases apart; the pre-launch signal check in `phases/attempt.ts` and the
abandoned-attempt settlement in `entry/recover.ts` record unavailable, having
made no scan; finalization carries the preserved attempt's own observation
through.

**Finalization answers an unavailable observation with the declared resolution
(DR3).** `entry/finalize.ts` treats a non-observed recorded observation as though
pending work had been observed, so a `rerun` stage commits `become-ready` where
it committed `advance` before and an `advance` stage advances. An observed
non-empty list applies the declared resolution and an observed empty list
advances, as both did before. Finalization performs no queue scan and reaches no
filesystem read of its own; the re-entered stage's queue gate makes the fresh
observation. The rule is stated once, in a doc comment at that branch.

**Every waiting kind determines one evidence shape (DR4, DR5).** `WaitingKind`
holds fifteen values: `stage-prerequisite-unmet` gained
`stage-prerequisite-uninspectable`, and `stage-contract-violation` became
`stage-contract-unmet` and `stage-contract-uninspectable`. A new
`WaitingEvidence` interface is the single statement of the kind-to-evidence
pairing, and `WaitingReason` is a mapped type derived from it, leaving `types.ts`
declarations-only. `detail` ceased to exist — the blocked and refused arms carry
`agentReason` and the contract-unmet arm carries `preservationNote`, both
required and nullable. `candidateLine` is carried by `malformed-outcome` alone,
so `entry/refresh.ts` no longer reads it off the attempt and the four refresh
builders stopped accepting it. `WaitingDiagnostics` was removed in favour of
`origin` on `interrupted` and `errorMessage` on `gate-error` and the two
uninspectable kinds, with no type spanning the two shapes.
`runner/classify.ts:queueReasons` now builds its `gate-error` reason with the
scan's error text, so the classifier and the pause builder agree.
`REASON_BANNER` in `cli/src/display/execution.ts` gained a row for each new kind
carrying the same label, icon, color, and group as the kind it split from, and
`reasonEquals` in `cli/src/execution/pause.ts` became a switch total over the
kind union.

**The checkpoint states its own pause correlation (DR6).** `RunCheckpoint` split
into shared `RunCheckpointFields` plus a four-arm union over `condition`: the
`waiting-for-user` arm carries a non-null `WaitingInfo`, and the `ready`,
`executing`, and `completed` arms carry `null`. `applyTransition` constructs
arms. No trailing-element tuple was written for the attempt history — both
attempt-history relations stay with checkpoint validation, as DR6 assigns them.

**Validation.** `cli/src/state/checkpoint/validate.ts` validates attempts per arm
with per-arm allowed keys, rejecting an `executing` attempt that carries an
ending, a post-attempt `HEAD`, or a queue observation; a settled attempt missing
any of the three; a `done` attempt whose terminal result is null or non-`DONE`; a
`waiting` or `interrupted` attempt with no failure; and a failure naming no known
waiting kind. The `done`-implies-`DONE`-token check moved out of the cross-field
invariant list into that arm's own validation. Reasons validate through a table
keyed by `WaitingEvidence[K]`, so the compiler requires one check per field a
kind declares and refuses one for a field it does not, and the key set that makes
a foreign field a rejection is derived from the one declaration of the pairing
rather than restated.

**Living documents and scenarios.** `cli/AGENTS.md`'s two references to the
retired kind became the split kinds that hold at each site. The scenario file
whose name carried the retired kind was renamed to
`cli/scripts/scenarios/21-stage-contract-unmet.mjs` with byte-identical contents,
and the seeded checkpoints in `43-list.mjs` moved to the new attempt and reason
shapes. The inaccurate unreachability comment in `phases/verify-promise.ts` was
corrected: scenario 22 does reach that branch.

**Tests.** A new `cli/src/state/checkpoint/types.test.ts` holds the
`@ts-expect-error` unconstructibility assertions for all four groups — the
attempt arms, the queue observation, the reason evidence, and the checkpoint's
pause correlation — verified by `tsc --noEmit`. New validator suites cover the
attempt union per disposition and every one of the fifteen kinds' evidence,
accepting its own, rejecting a field another kind declares, and rejecting each
required field's absence. Six new `engine.test.ts` cases cover the finalization
table: four seed an unavailable or observed-empty observation onto a preserved
`DONE`, and two drive the observed, non-empty rows from a bundle the attempt's
own scan saw, resolved before the resume finalizes. `pause.test.ts` gained a
per-kind evidence-equality matrix and a split-pair equivalence case, and
`display/terminal.test.ts` a case pinning the uninspectable contract kind to its
sibling's banner. A shared `reasonOf` helper in `test-helpers/waiting.ts` and a
`settledHead` helper in `test-helpers/resume-harness.ts` are how the suites read
a union's own fields.

## Verification

- `npm --prefix cli run check` — typecheck, 1288 tests across 63 files, and
  build: passes. Run before each of the five commits and again on the final tree.
- `npm --prefix cli run lint` — exit 0. Run before each commit.
- `npm --prefix cli run demo:all` — 43/43 scenarios green. Run at the close; it
  caught one shape the unit gate could not, a seeded pause in `43-list.mjs` still
  carrying `detail`, which was fixed before the final commit.
- `architecture.test.ts` — 76/76, with no assertion removed, weakened, or
  exempted and no module added to any exemption list.
  `state/checkpoint/types.ts` still passes the declarations-only guard.
- Totality checked by experiment: a sixteenth `WaitingKind` value added on its
  own fails `tsc --noEmit` at exactly four sites — the derived `WaitingReason`,
  the validator's evidence table, `reasonEquals`, and `REASON_BANNER` — and was
  then reverted.
- Scope spot checks: no file under `cli/src/pipeline/`, `config/`, `harness/`,
  `gitops/`, or `workspace/` changed; `cli/README.md` and the root `AGENTS.md`
  are unedited; `schemaVersion` remains `0` with no migration, shim, or
  compatibility branch; `WaitingKind` holds exactly fifteen values and
  `stage-contract-violation` appears nowhere under `cli/src` or `cli/scripts`.

No check was skipped.

## Deviations and judgment calls

- **`Classification` carries the advancing verdict.** `runner/classify.ts` gained
  a `done: DoneTerminalResult` field on its `advance` and `pause-done` arms and a
  matching `done` input, which no acceptance criterion names. It was forced: once
  the `done` attempt arm requires a `DONE`-token terminal result, settlement
  cannot otherwise prove that the two actions settling as `done` were reached
  from a parsed `DONE`, and the alternative was a runtime re-check of exactly the
  kind DR1 exists to delete. `classify.ts` is inside the spec's stated scope.
- **`referencedAttempt` narrows by searching settled attempts only**, reporting
  the existing invalid-checkpoint message reworded to name a settled attempt.
  This is the narrowing at the resolution site the spec offers as a degree of
  freedom; no runtime re-check of the post-attempt `HEAD` observation survives.
- **An aborted attempt's harness error class and message are no longer recorded
  on the pause.** DR5 replaces `WaitingDiagnostics` with a signal origin for an
  interruption and nothing else. The same text is already written verbatim into
  the reason's `message` and the settled attempt's `failure.message`, so nothing
  a reader can reach is lost — but this is a field removed rather than renamed,
  alongside the two the spec's risks already call out.
- **One engine case was retargeted rather than deleted.** The case that asserted
  a fatal result when a finalizable attempt had no settled `HEAD` tested
  `attemptInterval`'s unreachable branch, which DR1 removes. It now tests the one
  runtime re-check that survives: finalization narrowing the preserved attempt's
  terminal token to `DONE`.
- **A synthetic `rerunPromisingStage` fixture was added to `engine.test.ts`,**
  because no existing fixture paired a `rerun` queue resolution with a boundary
  that can finalize after a contract repair and then again on the rerun attempt.

## Remaining concerns

- **The unavailable and observed-empty rows of the finalization table are tested
  by seeding the observation onto a preserved `DONE` rather than producing it.**
  The unavailable branch is reachable only with an observation made by a run that
  has since ended — the same reason DR2 gives for reading the record rather than
  rescanning. The observed, non-empty rows are covered end to end, by an
  observation the attempt's own scan made.
- **The display's per-section helpers are not total over the kind union.**
  `detailOf` and the pending, artifacts, and candidate-line blocks in
  `display/execution.ts` would compile against a sixteenth kind and simply render
  nothing extra for it. The three sites the spec requires to be total — the
  banner table, the validator, and pause equality — are.
- **`entry/recover.ts` still spreads the history tail into the abandoned-attempt
  settlement,** which typechecks over the whole union rather than over the
  executing arm. Checkpoint validation is what makes that tail the live attempt,
  and the spread sets every field the `interrupted` arm needs, so no illegal
  record can result.
- **Previously written run directories become unreadable.** This is stated
  plainly in each commit message, as the pre-release notice in `cli/AGENTS.md`
  requires; `schemaVersion` stays `0` and no migration or shim was written.
