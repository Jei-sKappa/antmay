# Boundary-retry recovery and engine follow-ups

## Intended outcome

An Antmay CLI operator who hits a Git-boundary refusal, a repeated resume, or a
`git` failure mid-run reads a pause that tells them the truth about what happened
and what the next resume will do. Specifically: a stage that committed where its
policy does not expect a commit produces a pause that says so, names the two
commits to inspect, and states that resuming proceeds — instead of a red failure
banner indistinguishable from a refusal that actually blocks; a boundary retry
never finalizes against a promise that has since stopped holding; resuming a stuck
pause repeatedly leaves the durable checkpoint unchanged instead of growing a
duplicate sentence per resume; and a broken `git` ends the run with the executor's
own diagnostic and a resume command instead of a raw Node stack trace.

Nothing about the pipeline's stage sequence, the command surface, or the artifact
contracts changes. The work is confined to how the engine and the Git-boundary
module report and recover.

## Context

A code review of the preceding CLI architecture and code-quality refactor recorded
six findings in the pending-review bundle quoted verbatim in `seed.md`. FND3 — the
execution engine's function size and nested-closure structure — is tracked as a
GitHub issue and is out of scope here. The remaining five were discussed and
settled as `DR1`–`DR6` in `decisions.md`; this spec elaborates those records into
implementable behavior.

Two of the settled decisions deliberately depart from the review's own suggested
actions. The review recommends that a refusal caused by the attempt's recorded
`HEAD` movement record a `retry-stage` recovery so the stage runs again; `DR1`
rejects that and keeps the rule advisory. The review frames the `changeRequired`
waiver as part of the same hole; `DR2` keeps the waiver and closes a different gap
instead. Because `seed.md` quotes the bundle in full, a reader will encounter both
suggestions — the decision records override them.

## Scope

In scope, all within `cli/`:

- The Git-boundary module's result vocabulary (`cli/src/gitops/boundary.ts`): a
  discriminated refusal cause, and a structured result for a failed `git`
  invocation in place of a thrown error.
- The engine's pause construction, pause refresh, boundary handling, and Git-read
  guards (`cli/src/execution/engine.ts`).
- The pause-recovery decision table's evidence inputs (`cli/src/execution/recovery-policy.ts`).
- The waiting-reason vocabulary (`cli/src/state/checkpoint.ts`), which gains the
  kind §2 introduces. No schema shape and no validation rule changes (per
  `decisions.md` DR7).
- The pause banner table (`cli/src/display/execution.ts`).
- The engine's public context type and its two callers plus test helper.
- Tests for all of the above, and one demo scenario for the new pause rendering.

Explicitly out of scope:

- **FND3.** No restructuring of `executeEngine`, its nested closures, or its
  mutable-checkpoint style. Changes here are made in the existing shape.
- **Inspecting commit contents.** The Git boundary continues to observe worktree
  paths only. `DR1` accepts that a stage which commits everything leaves a clean
  worktree that satisfies the path selectors vacuously, and that the human is the
  only check on what that commit touched; this spec improves what the human is
  told, not what the executor verifies.
- **Any change to the enforcement posture of the `headMayChange` rule during an
  attempt.** It is judged exactly as it is today across the attempt's own
  interval; only the recovery path's reporting changes.
- **The stage catalog, pipeline documents, target resolution, artifact
  prerequisites and promises, the command surface, exit-code assignments, and the
  workspace lock's lifecycle.**
- **Migrations or compatibility shims** for run directories written by earlier
  builds.

## Expected behavior

### 1. A boundary refusal names its cause

`GitBoundaryResult`'s `git-policy-violation` carries a discriminated cause
alongside its message, distinguishing at minimum a `HEAD`-rule refusal, an
out-of-bounds path set, an unmet `change-required` rule, and an unresolvable
allowed-change selector (per `decisions.md` DR1). Each refusal path in
`policyViolation` produces its own cause. No caller infers the cause by matching
on message text.

The module continues to read only policy data and observed paths — it learns
nothing about pipelines, stages, or skills.

### 2. A `HEAD`-rule refusal pauses advisorily

When a boundary is refused because the attempt's own recorded interval moved
`HEAD` on a stage that forbids it, the run pauses and the next resume clears it.
The recovery stays `retry-git-finalization` naming that attempt, and a
`boundary-retry` continues to skip the `HEAD` rule entirely, so a bare `antmay afk
resume` finalizes the boundary and advances the stage (per `decisions.md` DR1).

What changes is the pause itself. Its governing reason is a waiting kind distinct
from `git-policy-violation`, and its banner does not present the stage as failed —
a reader can tell it apart from a refusal that genuinely blocks. The pause
conveys three things: that the stage produced a commit where its policy does not
expect one, both ends of the movement (`headAtStart` and `headAfterAttempt`, so
the human can inspect that range before deciding), and that the `HEAD` movement
will not block the next resume.

It does not carry `UNVALIDATED_CHANGES_NOTE` when the boundary observed no paths,
because that instruction describes uncommitted work an agent which committed
everything has already removed from the worktree (per `decisions.md` DR1). When
the boundary did observe paths, the note is carried: those changes are genuinely
unvalidated and still in the worktree, and `DR1`'s reason for dropping the note
does not hold. This is the one place where `DR1`'s text, written for the clean
case, is applied conditionally on a fact the boundary already reports.

### 3. Other refusals keep blocking language

An out-of-bounds, `change-required`, or unresolvable-selector refusal keeps
today's `git-policy-violation` reason kind, its banner, and
`UNVALIDATED_CHANGES_NOTE` (per `decisions.md` DR1). The path selectors and the
selector-resolution check continue to be judged on a `boundary-retry`, so such a
refusal holds until a human repairs it.

### 4. A boundary retry re-verifies the promise

A `retry-git-finalization` recovery whose queues are clear, and whose finalization
has not already been attempted and failed in the same pass, is decided against
freshly inspected promised-artifact state — the evidence a contract recheck
already gathers (per `decisions.md` DR2). A satisfied promise requests the
finalization in the `boundary-retry` context, unchanged. An unmet or
uninspectable promise leaves the run paused on a `recheck-stage-contract` recovery
naming the same attempt, carrying the `stage-contract-violation` reason and
`CONTRACT_REPAIR_NOTE`, so the human's repair then finalizes that same saved
`DONE` through the existing `after-contract-repair` path.

A `retry-git-finalization` whose finalization already ran and failed in this pass
is still re-decided from that failure alone, without consulting artifact evidence.

The `changeRequired` waiver is unchanged: the rule continues to be applied only in
the `attempt` context, so an empty boundary satisfies it in both recovery contexts
(per `decisions.md` DR2). With the promise verified on every finalizing path, an
empty boundary means "already committed, nothing to do".

### 5. A refreshed pause reason is computed from its own facts

No pause refresh reads the message already persisted on the checkpoint, so
refreshing the same pause any number of times leaves the persisted `waiting` value
identical from the second refresh onward (per `decisions.md` DR3).

A pending-queue scan that fails again on a pause holding a preserved `DONE` leaves
the governing reason untouched and reports the failure as its own `gate-error`
reason positioned after it. Each pass replaces the existing `gate-error` reason
rather than adding another, so exactly one is present however many times the scan
fails. The governing reason stays first, which is what keeps the pause's own kind
and stops the diagnostic from describing away the saved `DONE`.

An uninspectable promised-artifact state has one message shape, composed
identically when the pause is first built and on every refresh, from the
inspection error observed in that same pass. The sentence reporting that
re-verification also failed is gone.

### 6. A failed `git` invocation is a structured, resumable stop

`finalizeGitBoundary` never rejects. A failed `git` invocation inside it becomes a
variant of `GitBoundaryResult`, so the engine handles it through the boundary
failure path it already has (per `decisions.md` DR4). That variant is the one
result that may carry no observation, because a failure to collect the boundary
status is precisely the inability to observe. Where it carries none, the tip read
before finalization stands as the attempt's `headAfterAttempt` and as the pause's
`pausedAtHead`, and a recovery-path failure keeps the recovery's existing
`pausedAtHead` rather than inventing one.

Every one of the engine's own `readHead` calls is guarded, and each returns
`refused` when the read fails, matching the worktree check beside them (per
`decisions.md` DR7). For the two that run before any mutation, nothing changed and
the pause the run sits at still stands.

For the one that runs after the attempt executed, the checkpoint is deliberately
left untouched, so the run stays in the `executing` condition with its attempt
still live, and the message names the repository, the underlying Git error, and
the `antmay afk resume <run-id>` command that recovers it. Recovery is the
abandoned-attempt path that already exists: a later resume settles that attempt as
`interrupted`, records the tip it reads at that moment, and returns the cursor to
`ready` at the same stage. A resume attempted while Git is still unreadable
refuses again at the entry guard, before any transition. Settling the attempt at
the moment of failure is what this avoids, because a settled attempt must record
the post-attempt tip and that tip is exactly what could not be read; no schema or
validation rule is relaxed to accommodate it.

No execution-result kind is added, and none is renamed. No `git` failure from any
of these paths escapes `executeEngine` as a rejected promise.

### 7. A refreshed gate-error pause keeps its instruction

When a resume's queue scan fails on a pause not holding a preserved `DONE`, the
refreshed waiting object carries the pause's own `nextAction` through unchanged
rather than dropping it or substituting a constant (per `decisions.md` DR5). A
`retry-stage` pause therefore keeps `UNVALIDATED_CHANGES_NOTE`, whose changes are
still in the worktree, and a `resume-finalized-done` pause keeps its absence of an
instruction, its boundary having already been committed.

### 8. The engine's context declares only what it reads

`ExecutionContext` no longer declares `lock` or `stateRoot`, the `LockHandle`
import that existed only to type one of them is gone, and the sentence describing
the lock's ownership on the context type goes with it (per `decisions.md` DR6).
The rule that the caller owns the lock's acquire/release symmetry stays stated on
`executeEngine`, where it constrains the reader who can act on it. Both callers
and the test helper stop computing and passing the removed fields.

## Constraints

- `npm --prefix cli run check` must pass: no type errors, no failing tests, no
  half-migrated code.
- The CLI is pre-release with no users. No migration, compatibility shim, or
  deprecation window is written; `schemaVersion` stays `0`. A change that makes
  existing run directories unreadable is acceptable.
- `cli/src/execution/recovery-policy.ts` stays pure: no filesystem, Git, clock,
  harness, rendering, or persistence. The artifact evidence §4 adds is gathered by
  the engine and passed in.
- `cli/src/gitops/boundary.ts` remains the sole owner of the Git protocol and
  reads only policy data and paths — never pipeline, stage, or skill identity.
- `cli/src/architecture.test.ts` enforces the module dependency directions. If it
  fails, the boundary moved: argue the direction rather than relaxing the guard.
- Multiline operational diagnostics belong to `cli/src/display/`. The engine emits
  lifecycle events through the `ExecutionDisplay` seam and assembles no prose
  itself.
- The pause's ordered reasons are presentation only. What a resume does is decided
  by `recovery` alone, so no code added here may read a recovery out of reason
  order or reason kind.
- Every distinct terminal rendering has a demo scenario. §2 introduces one, which
  `23-failed-git-policy.mjs` does not cover — it reaches the blocking variant only.
  The renderings §4, §5, §6, and §7 touch are already in the catalog
  (`18-stage-contract-violation.mjs`, `19-saved-done-recovery.mjs`,
  `24-failed-commit.mjs`, `25-failed-queue-scan.mjs`, `15-multiple-reasons.mjs`).
- Test-suite conventions in `commands/resume.test.ts`, `commands/run.test.ts`, and
  `execution/engine.test.ts` hold: `describe.concurrent`, allocation through the
  existing helpers, and no per-case teardown.
- Checkpoint equality assertions must compare the persisted `waiting` value, not
  the whole document: `persist` stamps `updatedAt` on every write, so a literal
  byte comparison of the checkpoint can never hold across two resumes.
- Both uninspectable-promise code paths (`engine.ts:1208` and `engine.ts:884`) are
  documented as unreachable end to end, and the change in §5 does not make them
  reachable. Tests reach them by injection, as they do today.
- Platform support is macOS only.

## Acceptance criteria

### FR-1 — A boundary refusal names its cause

- **AC-1.1** A `git-policy-violation` result carries a discriminated cause field
  whose values distinguish at least: the `HEAD` rule, an out-of-bounds path set,
  an unmet `change-required` rule, and an unresolvable allowed-change selector.
  (§1, DR1)
- **AC-1.2** Each of the four refusal returns in `policyViolation` is covered by a
  test asserting the cause it produces together with its message. (§1, DR1)
- **AC-1.3** No production code branches on the content of a
  `git-policy-violation` message string. (§1, DR1)

### FR-2 — A `HEAD`-rule refusal pauses advisorily and clears on resume

- **AC-2.1** A `spec`-stage attempt that reports `DONE` after committing its own
  work pauses with a `recovery` of `retry-git-finalization` naming that attempt.
  (§2, DR1)
- **AC-2.2** That pause's governing reason kind is not `git-policy-violation`, and
  its banner text does not describe the stage as failed. (§2, DR1)
- **AC-2.3** The pause reports both `headAtStart` and `headAfterAttempt` of the
  refused attempt. (§2, DR1)
- **AC-2.4** The pause states that the stage produced a commit its policy does not
  expect, and that the `HEAD` movement will not block the next resume. (§2, DR1)
- **AC-2.5** With a clean worktree at the boundary, the pause carries no
  `UNVALIDATED_CHANGES_NOTE`; with at least one observed path, it carries it.
  (§2, DR1)
- **AC-2.6** Starting from the fixture at `cli/src/commands/resume.test.ts:1269`,
  a second resume with the worktree untouched finalizes the boundary and advances
  the stage. (§2, DR1)
- **AC-2.7** `headRuleViolation` still returns no violation for a `boundary-retry`
  context, whatever the attempt's recorded interval was. (§2, DR1)
- **AC-2.8** The run's exit code at this pause is `2`. (§2, DR1)

### FR-3 — Other refusals still block

- **AC-3.1** An out-of-bounds refusal keeps the `git-policy-violation` reason kind
  and carries `UNVALIDATED_CHANGES_NOTE`. (§3, DR1)
- **AC-3.2** Resuming from an out-of-bounds refusal with the offending path still
  present refuses again rather than finalizing. (§3, DR1)

### FR-4 — A boundary retry re-verifies the promise

- **AC-4.1** `decideRecovery` given a `retry-git-finalization` recovery, clear
  queues, and no prior finalization failure requires fresh promised-artifact
  evidence, and the engine gathers it on that path. (§4, DR2)
- **AC-4.2** With that evidence satisfied, the directive is `finalize-boundary` in
  the `boundary-retry` context. (§4, DR2)
- **AC-4.3** With that evidence unmet, the directive leaves the run paused on a
  `recheck-stage-contract` recovery naming the same attempt, with a
  `stage-contract-violation` reason and `CONTRACT_REPAIR_NOTE`. (§4, DR2)
- **AC-4.4** With that evidence uninspectable, the outcome is the same as
  AC-4.3. (§4, DR2)
- **AC-4.5** The checkpoint written by AC-4.3 passes checkpoint validation, and a
  subsequent resume after the artifact is repaired finalizes the same attempt in
  the `after-contract-repair` context. (§4, DR2)
- **AC-4.6** A `retry-git-finalization` recovery whose evidence carries a
  finalization failure from the same pass is still re-decided from that failure
  and consults no artifact evidence. (§4, DR2)
- **AC-4.7** `policyViolation` applies `changeRequired` only in the `attempt`
  context; an empty boundary finalizes in both `after-contract-repair` and
  `boundary-retry`. (§4, DR2)

### FR-5 — Refreshed pause reasons do not accrete

- **AC-5.1** After a queue scan fails on a pause holding a preserved `DONE`, the
  governing reason's message is identical to the one the pause already carried,
  and the scan failure is present as a separate `gate-error` reason ordered after
  it. (§5, DR3)
- **AC-5.2** Resuming three times while the queue remains unreadable leaves
  exactly one `gate-error` reason, and the persisted `waiting` value after the
  third resume is deep-equal to the value after the second. (§5, DR3)
- **AC-5.3** The message for an uninspectable promised-artifact state is composed
  from that pass's inspection error and contains no sentence about
  re-verification also having failed. (§5, DR3)
- **AC-5.4** Resuming twice on a still-uninspectable promise leaves the persisted
  `waiting` value deep-equal across the two passes. (§5, DR3)

### FR-6 — Git failures are structured and resumable

- **AC-6.1** A `git` invocation failing anywhere inside `finalizeGitBoundary`
  returns a result rather than rejecting; the function has no path that throws.
  (§6, DR4)
- **AC-6.2** When that result carries no observation, the settled attempt's
  `headAfterAttempt` and the pause's `pausedAtHead` are the tip read before
  finalization began. (§6, DR4)
- **AC-6.3** On the attempt path, such a failure pauses with a
  `retry-git-finalization` recovery naming that attempt. (§6, DR4)
- **AC-6.4** On the recovery path, such a failure keeps the recovery's existing
  `pausedAtHead` and leaves the attempt as finalizable as it was. (§6, DR4)
- **AC-6.5** A `readHead` failure before any mutation returns `refused` naming the
  repository and the underlying error, and writes no checkpoint. (§6, DR4)
- **AC-6.6** A `readHead` failure after the attempt executed returns `refused`,
  writes no checkpoint — so the run is left in the `executing` condition with its
  attempt unsettled — and its message names the repository, the underlying Git
  error, and the `antmay afk resume <run-id>` command. (§6, DR7)
- **AC-6.7** `ExecutionResult` has the same five kinds, with the same names, as
  before this change. (§6, DR4)
- **AC-6.8** No test in the suite observes a rejected promise escaping
  `executeEngine` from a Git failure on any guarded path. (§6, DR4)
- **AC-6.9** Resuming a run left by AC-6.6 with Git readable again settles the
  abandoned attempt as `interrupted`, records the tip read at that moment as its
  `headAfterAttempt`, and re-runs the same stage; resuming while Git is still
  unreadable returns `refused` at the entry guard without writing a checkpoint.
  (§6, DR7)
- **AC-6.10** No rule in `cli/src/state/checkpoint.ts` governing attempt records or
  run conditions is added, removed, or relaxed by this work. (§6, DR7)

### FR-7 — A refreshed gate-error pause keeps its instruction

- **AC-7.1** A queue-scan failure refreshing a `retry-stage` pause produces a
  pause carrying `UNVALIDATED_CHANGES_NOTE`, asserted in the existing test at
  `cli/src/execution/engine.test.ts:542-569`. (§7, DR5)
- **AC-7.2** The same refresh applied to a `resume-finalized-done` pause produces
  a pause carrying no `nextAction`. (§7, DR5)

### FR-8 — The engine's context declares only what it reads

- **AC-8.1** `ExecutionContext` declares neither `lock` nor `stateRoot`, and
  `cli/src/execution/engine.ts` imports no lock type. (§8, DR6)
- **AC-8.2** `cli/src/commands/run.ts`, `cli/src/commands/resume.ts`, and the
  engine test helper construct the context without those fields, and
  `npm --prefix cli run check` passes. (§8, DR6)

### FR-9 — The new rendering is covered by the demo catalog

- **AC-9.1** A demo scenario ends on the pause rendering from FR-2, appears in
  `npm run demo -- --list` in reading order, and declares exit code `2`. (§2,
  constraint on renderings)
- **AC-9.2** That scenario reads correctly under `--no-color`, since the banner
  change in AC-2.2 is partly carried by color. (§2)

### Coverage

Every behavior in §1–§8 is covered: §1 by FR-1, §2 by FR-2 and FR-9, §3 by FR-3,
§4 by FR-4, §5 by FR-5, §6 by FR-6, §7 by FR-7, §8 by FR-8. No criterion is left
open.

## Degrees of freedom

Left to the implementer, because every admissible choice satisfies the criteria
above unchanged, none produces a behavioral difference a reviewer or operator
would weigh differently, and each is reversible without revising this spec:

- The identifier of the new waiting kind from AC-2.2, and its banner label, icon,
  and color — bounded by the pinned requirement that it not present the stage as
  failed and be distinguishable from the blocking `git-policy-violation` banner.
- The exact prose of the `HEAD`-rule pause, and whether the two commits are
  rendered as a runnable `git diff` command or named plainly, provided all content
  AC-2.3 and AC-2.4 require is present.
- Which field of the waiting structure carries which sentence of that pause —
  reason `message`, `detail`, or `nextAction` — provided AC-2.5 holds for the
  unvalidated-changes note specifically.
- The name of the discriminated cause field in FR-1 and the spelling of its
  variants, provided the four causes are distinguishable without reading a message.
- The name and shape of the `GitBoundaryResult` variant added in AC-6.1, including
  how it represents an absent observation.
- How the engine factors the artifact-evidence gathering added in AC-4.1 —
  extracted helper or inline — and how `RecoveryEvidence` documents the widened
  requirement.
- Whether the new demo scenario is a new file or an extension of an existing one
  that can be made to end on the FR-2 rendering, and its number within the reading
  order.
- Test file placement, fixture construction, and whether AC-5.2's third resume is
  a new case or an extension of an existing one.

Not degrees of freedom, stated because they are the plausible places to assume
otherwise: whether the `HEAD` rule is judged on a retry (it is not), whether the
`changeRequired` waiver stays (it does), whether a new execution-result kind may
be introduced (it may not), and whether a failed post-attempt `HEAD` read may be
recorded as a pause by relaxing an attempt-record rule (it may not — it refuses and
leaves the attempt abandoned, per `decisions.md` DR7).
