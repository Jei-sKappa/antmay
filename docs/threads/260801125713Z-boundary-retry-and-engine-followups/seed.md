# Boundary-retry recovery and engine follow-ups from code review

A code review of the CLI architecture and code-quality refactor recorded its findings in the pending-review bundle at `docs/threads/260731113436Z-architecture-and-code-quality-improvements/.pending-reviews/260801115548Z-906d-cli-architecture-refactor-code-quality.md`. That bundle is the specification of the work: it names the reviewed target, and for each finding the severity, the evidence, and the impact.

This thread exists to act on the findings in that bundle, with one exclusion: FND3 — the execution engine's function size and nested-closure structure — is tracked as a GitHub issue and is not part of this thread's scope. The remaining findings span one Git-boundary recovery gap, one accreting pause message, and three smaller weaknesses in the engine and its context type.

The intended outcome is that each in-scope finding is either resolved in the CLI or deliberately settled as something not to change, with the reasoning recorded.

Verbatim from the pending-review bundle:
<reviewer-artifact>
# Pending review: CLI architecture and code-quality refactor

Reviewer: /review-code
Target: `172587d3cc3d0065f6ad4eaa7dc038b55f1e051f..HEAD` (the CLI refactor; `cli/src/**`, `cli/scripts/**`)
Created: 2026-08-01T11:55:48Z
Findings: 6

## Context

The refactor is strong on its own merits: the module boundaries it claims are
mechanically enforced by `cli/src/architecture.test.ts`, the recovery model is
exhaustively validated at the checkpoint boundary, and the recovery policy is
genuinely pure and table-tested. The findings below are one reachable
Git-policy gap, two maintainability weaknesses in the engine, and three nits.
Nothing here is a coverage check of the specification's acceptance criteria —
that belongs to the fidelity review.

## Findings

### FND1: A refused boundary always records `retry-git-finalization`, and the retry judges no `HEAD` rule

Severity: issue
Category: safety

Finding: The engine records `retry-git-finalization` for *every* boundary that
was evaluated and refused, without distinguishing which policy rule refused it
(`engine.ts:1440-1449`, keyed only on `boundary.evaluated && !boundary.ok`).
The `boundary-retry` context then judges no attempt interval at all
(`boundary.ts:125` returns `null` for `context.kind === "boundary-retry"`) and
also waives `changeRequired` (`boundary.ts:181-186`, gated on
`context.kind === "attempt"`). A refusal caused by the attempt's *own* recorded
`HEAD` movement is therefore cleared by a bare `antmay afk resume` with no
human correction: the same worktree that was refused during the run is accepted,
committed, and the stage advances. The root cause is that
`GitBoundaryResult`'s `git-policy-violation` carries only a `message` string,
so the engine cannot tell a refusal a human can repair (out-of-bounds paths,
missing required change, commit error) from one that is immutable (the
attempt's recorded `headAtStart`/`headAfterAttempt` pair). Note the converse
trap: simply enforcing the interval on retry would make such a run permanently
unfinalizable, because the recorded pair never changes — so the recovery *kind*
is what is wrong, not only the context.

Evidence: `cli/src/execution/engine.ts:1440-1449`;
`cli/src/gitops/boundary.ts:121-129` and `181-190`;
`cli/src/execution/recovery-policy.ts:260-264`. Reachability is one step past an
existing test: `cli/src/commands/resume.test.ts:1269-1300` drives a `spec`-stage
attempt that commits on its own, repairs the promise, and asserts the resulting
`git-policy-violation` pause with `"forbids HEAD movement"` — that pause's
recovery is `retry-git-finalization`, and a further resume finalizes it. The
same path exists without a contract violation (`engine.ts:1279-1307` →
`1440-1449`). No test resumes twice from a `HEAD`-rule refusal;
`boundary.test.ts:418-438` asserts the skip as intended behavior, and
`engine.test.ts:868-887` exercises retry only for an out-of-bounds file.
Anchor: `spec.md` "Expected behavior §4" asks only that retry "does not
reinterpret movement **across the pause** as a new attempt-level violation",
and DR3 likewise scopes the diagnostic treatment to "human `HEAD` movement
across the pause"; neither asks that the attempt's own recorded interval stop
being judged. The retired implementation had the same effect via
`enforceHead: false`, so this is preserved behavior rather than a regression
this change introduced.

Impact: A stage's `headMayChange: false` rule and its `changeRequired` rule are
advisory rather than enforced across a pause. An agent that commits its own
work — the exact misbehavior the rule exists to catch — produces a pause that
clears itself on the next resume, so the executor's central promise (per-stage
Git boundaries a stage cannot escape) does not hold on the recovery path. A
maintainer reading `boundary.ts:120-129` and its test comment
("the run already judged that boundary under the stage's `HEAD` rule") will
believe the rule was enforced once and stands; it was enforced once and then
discarded.

Suggested action: Make the violation reason a discriminated field on
`GitBoundaryResult` (at minimum: `head-rule`, `out-of-bounds`,
`change-required`, `unresolvable-selector`) and let the engine record
`retry-stage` rather than `retry-git-finalization` when the refusal was the
immutable `HEAD` rule, keeping `UNVALIDATED_CHANGES_NOTE` as the instruction.
Add a two-resume regression test starting from the fixture at
`resume.test.ts:1269`.

### FND2: Refreshed pause messages accrete a duplicate sentence on every resume

Severity: issue
Category: quality

Finding: Two `remain-paused` branches build the persisted governing reason's
message by appending to the message already on the checkpoint, then persist that
result — so the next resume reads the already-appended text as its base and
appends again. `queue-scan-failed` on a preserved-`DONE` pause appends
`"… The pending-queue scan failed again and must be repeated before finalizing: <err>"`
(`engine.ts:660`), and `promise-uninspectable` appends
`"… It could not be re-verified on resume either."` (`engine.ts:700`). Neither
checks whether the sentence is already present, and neither restates from a
pristine base the way the sibling `promise-unmet` branch does
(`engine.ts:711-729`, which recomputes the message from
`stillUnmetContractMessage`).

Evidence: `cli/src/execution/engine.ts:648-671` and `689-709`; `governing` is
`pausedWaiting.reasons[0]` read from the live checkpoint at
`engine.ts:620`. Coverage stops at one resume:
`cli/src/execution/engine.test.ts:571-599` and `741-768`, and
`cli/src/commands/resume.test.ts:918-951` and `1344-1357`, each resume once and
assert `toContain("scan failed again")`, which stays true no matter how many
copies are present.

Impact: A developer who resumes three times while a queue path is still
unreadable ends with the sentence three times in the durable checkpoint and in
the rendered pause block, with no way to tell repetition from a genuine count of
failures. The reason message is also the field a later reader of `state.json`
relies on to understand the pause, and it grows without bound.

Suggested action: Recompute the refreshed message from the pause's own
invariant base (as `promise-unmet` does) rather than from the persisted
message, and assert idempotence by resuming twice in the existing tests.

### FND3: `executeEngine` is one ~1,150-line function with mutually recursive nested closures over mutable state

Severity: issue
Category: quality

Finding: `executeEngine` spans `engine.ts:347-1492` as a single function body.
Inside it, `enterFromDurableCursor` (`531-917`) is itself ~390 lines and
declares three further closures — `remainPaused` (`615-748`),
`finalizeSavedDone` (`764-848`), and `applyDirective` (`851-866`) — two of which
are mutually recursive (`finalizeSavedDone` → `applyDirective` →
`finalizeSavedDone`) and all of which close over the outer mutable `checkpoint`
plus `pausedWaiting`, `pausedRecovery`, `recoveryAttempt`, and `stage`. Reading
any one of them requires holding the enclosing scope's mutation history in mind:
`persist` reassigns the captured `checkpoint` (`364-373`), so what a nested
closure sees depends on which persists have already run on the path that reached
it. The specification's degrees of freedom permit a procedural engine, so this
is not a contract violation — it is a maintainability cost the design did not
have to pay, since the same collaborators could be driven from module-level
functions over an explicit state value.

Evidence: `cli/src/execution/engine.ts:347-1492`, `531-917`, `615-748`,
`764-848`, `851-866`; the shared mutable binding at `353` and its reassignment
at `368`.

Impact: The one module that owns every durable transition is the one hardest to
reason about locally. A future change to the recovery half cannot be reviewed
without re-deriving which of the enclosing scope's ten-plus captured bindings
are still current at that point, which is exactly the condition under which
ordering bugs in checkpoint mutation get introduced — and checkpoint mutation is
the safety-critical thing this thread centralized.

Suggested action: Lift the entry-recovery block and its directive application to
module-level functions taking an explicit state object (checkpoint, pause,
resolved attempt, stage, collaborators) and returning the next state plus a
result, leaving `executeEngine` as the loop plus persistence boundary.

### FND4: `ExecutionContext.lock` and `ExecutionContext.stateRoot` are required and never read

Severity: nit
Category: quality

Finding: The engine's public context declares `lock: LockHandle` and
`stateRoot: string` as required fields (`engine.ts:98-114`), and no code in
`engine.ts` reads either one. The engine uses only `entry`, `runDir`, `invoker`,
`display`, `harnessVersions`, `signal`, `clock`, and `persistCheckpoint`. The
`lock` field's doc comment ("The caller owns the lock's acquire/release
symmetry; the engine never releases it") documents a rule the field does not
participate in.

Evidence: `cli/src/execution/engine.ts:98-114`; a grep for `ctx.` in that file
matches only `ctx.clock`, `ctx.persistCheckpoint`, `ctx.entry`, and
`ctx.harnessVersions`. Both callers compute and pass the dead fields:
`cli/src/commands/run.ts:537-547`, `cli/src/commands/resume.ts:292-302`, and
the test helper at `cli/src/execution/engine.test.ts:221-232`.

Impact: Two required fields that mean nothing invite the next reader to assume
the engine touches the lock or the state root, and any new caller or test double
has to fabricate both. It also sits against the specification's constraint that
the implementation leave no unused injection behind.

Suggested action: Drop both fields, or keep `lock` only if a subsequent change
gives the engine a genuine reason to hold it.

### FND5: Git reads inside the engine throw out of it, while the worktree check three lines away is guarded

Severity: nit
Category: safety

Finding: The engine wraps `isWorktreeClean` in `try`/`catch` and turns a failure
into a structured `refused` result (`engine.ts:542-556`, `896-904`), but the
`readHead` calls and `finalizeGitBoundary` calls beside them are unguarded, so a
`git` failure escapes `executeEngine` as a rejected promise. `readHead` runs
unguarded at `engine.ts:570`, `1025`, and `1174`;
`finalizeGitBoundary` can throw from `collectBoundaryStatus`, `runGit`, or
`stagedPaths` (`boundary.ts:196-209` throws on a non-zero `git diff --cached`).
Nothing between there and `main.ts` catches it — the commands only wrap the call
in `finally { await lock.release() }`.

Evidence: `cli/src/execution/engine.ts:542-556` and `896-904` (guarded) versus
`570`, `1025`, `1174`, `791`, `1280` (unguarded);
`cli/src/gitops/boundary.ts:196-209`; `cli/src/main.ts` has no top-level
handler. The retired runner behaved the same way
(`git show 172587d^{tree}:cli/src/runner/runner.ts:457,612`), so this is
carried-over behavior, not a regression.

Impact: A `git` failure mid-run (unreadable repository, contended `index.lock`,
missing binary) ends the run with a raw Node stack trace instead of the
engine's own `refused`/`fatal-checkpoint` diagnostic, in a module whose stated
design is that every outcome is one of five structured results. The lock is
still released and the exit code is still `1`, so the damage is diagnostic
quality rather than state corruption.

Suggested action: Route these calls through the same guard shape
`isWorktreeClean` already uses, so a Git failure becomes `refused` (before any
mutation) or `fatal-checkpoint` (after one).

### FND6: The gate-error refresh drops `nextAction` along with the reason list

Severity: nit
Category: quality

Finding: When a resume's queue scan fails on a pause that is *not* holding a
preserved `DONE`, the refreshed waiting object is built from scratch and carries
only `reasons` and `recovery` (`engine.ts:673-687`) — so the pause's
`nextAction` is dropped. The sibling branch for a preserved `DONE` spreads
`...pausedWaiting` and keeps it (`engine.ts:654-671`), as do the
`promise-uninspectable` and `promise-unmet` branches, which set `nextAction`
explicitly. The comment above the branch explains the reason replacement but
says nothing about the instruction.

Evidence: `cli/src/execution/engine.ts:672-688` versus `654-671`, `694-708`, and
`712-728`; the dropped constant is `UNVALIDATED_CHANGES_NOTE`
(`state/checkpoint.ts:63-65`), which every non-`DONE` pause sets
(`engine.ts:1450`). `cli/src/execution/engine.test.ts:542-569` asserts the
replaced reasons and preserved recovery but not the instruction.

Impact: On that intermediate pause the reader loses the one line telling them
the attempt's file changes are unvalidated and must be reverted or deliberately
committed — while those changes are still sitting in the worktree. The
asymmetry with the neighbouring branch reads as an oversight rather than a
decision, so a future reader cannot tell which behavior is intended.

Suggested action: Carry `nextAction` through this branch as the neighbouring one
does, and assert it in the existing test.
</reviewer-artifact>
