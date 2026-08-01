# Boundary-Retry Recovery and Engine Follow-ups Decision Log

## DR1: A `HEAD`-rule refusal is advisory, and its pause must say so

Context: FND1 reports that the engine records `retry-git-finalization` for every
refused Git boundary without distinguishing which policy rule refused it, and
that a `boundary-retry` skips the `HEAD` rule — so a stage that forbids `HEAD`
movement and whose agent committed its own work is accepted, committed, and
advanced by a bare `antmay afk resume` with no human repair. The finding treats
that as a safety hole and proposes recording `retry-stage` instead. This thread
had to settle whether the executor should block such a resume or whether the
pause is a notification the human clears by inspecting and resuming.

Decision: The `HEAD` rule stays advisory across a pause. A refusal caused by the
attempt's own recorded `HEAD` movement pauses the run, informs the human that
the stage committed where it was not expected to, and is cleared by the next
resume — the recovery stays `retry-git-finalization` and the retry keeps
skipping the `HEAD` rule. The `retry-stage` alternative is rejected and must not
be implemented. What does change is the presentation, which today cannot
distinguish an advisory refusal from a blocking one:

- `GitBoundaryResult`'s `git-policy-violation` gains a discriminated reason
  field — at minimum `head-rule`, `out-of-bounds`, `change-required`, and
  `unresolvable-selector` — so a caller can tell which rule refused instead of
  parsing a message string.
- A `head-rule` refusal gets its own pause presentation: it states that the
  stage did not expect a commit, names the attempt's `headAtStart` and
  `headAfterAttempt` so the human can inspect that range before deciding, and
  states plainly that the next resume accepts the stage and moves on. It does
  not carry `UNVALIDATED_CHANGES_NOTE`, whose instruction to revert or commit
  the attempt's file changes describes uncommitted work that an agent which
  committed everything has already removed from the worktree.
- Every other `git-policy-violation` keeps today's blocking language, because
  the path selectors and the unresolvable-selector check are judged on a retry
  and genuinely hold until a human repairs them.

Rationale: The executor has no acknowledgement mechanism, and adding one could
not distinguish a human who read the pause from one who typed resume, so a hard
block would buy no real safety at the cost of stranding runs. Keeping
`retry-git-finalization` also preserves the natural repair — `git reset --soft
HEAD~1`, after which the retry makes the stage's own declared boundary commit —
which `retry-stage` would discard in favor of re-launching the agent, with a
second refusal likely on a `changeRequired` stage whose re-run finds its work
already committed. The residual risk is accepted deliberately and is why the
presentation change is not optional: the boundary observes worktree paths only
and never inspects commit contents, so an agent that commits everything leaves a
clean worktree that satisfies the selectors vacuously, and the human is the only
check on what that commit touched. A pause that renders as a red failure, cannot
be told apart from a refusal that actually blocks, and points at a worktree
instead of at the commit leaves that human unable to perform the one check the
design depends on.

## DR2: A boundary retry re-verifies the promised artifact state; the `changeRequired` waiver stays

Context: FND1 also reports that a Git boundary finalized in either recovery
context waives the stage's `changeRequired` rule, so an empty boundary is
accepted where a fresh attempt would be refused. The question was whether an
empty boundary on a recovery should be refused, and the finding's framing invited
treating an unmet `changeRequired` as something to flag wherever it occurs.

Decision: The `changeRequired` waiver stays exactly as it is in both recovery
contexts. Instead, a `retry-git-finalization` recovery gains the fresh
promised-artifact evidence that a contract recheck already has: the engine
inspects the thread for it, and the recovery decision consults that evidence
before requesting the finalization. A satisfied promise finalizes as a
`boundary-retry`, unchanged. An unmet or uninspectable promise leaves the run
paused on a `recheck-stage-contract` recovery carrying the
`stage-contract-violation` reason and `CONTRACT_REPAIR_NOTE`, so the human's
repair then finalizes the same saved `DONE` through the existing
`after-contract-repair` path.

Rationale: `changeRequired` reads the worktree, so it asks whether anything is
present to commit — not whether the stage did its job. The promised-artifact
verification is the real requirement, and it runs separately. Refusing an empty
boundary on a recovery would therefore strand a correctly repaired run, whose
promise was just verified and whose artifact a human already committed, and it
would refuse the case DR1 settled, where an agent that committed everything
leaves a clean worktree that must clear on a bare resume. The genuine
inconsistency was elsewhere: a contract repair finalizes against a promise
verified in the same pass, while a boundary retry finalized against the original
attempt's stale verification and re-read nothing. Closing that makes the waiver
sound on every path, because a verified promise is what turns an empty boundary
into "already committed, nothing to do". The trade-off is that the engine now
inspects the thread on a path that previously performed no artifact read, and one
more transition exists between a retry and its finalization; both are paid with
existing recovery vocabulary, so no new pause rendering appears.

## DR3: A refreshed pause reason is computed from its own facts, never from the persisted message

Context: FND2 reports that two `remain-paused` branches build a refreshed pause
message by appending to the message already on the checkpoint and then persisting
the result, so every further resume reads the appended text as its base and
appends again — the durable reason message grows one duplicate sentence per
resume. The question was how a refreshed message should be built instead.

Decision: A waiting reason's message is a pure function of that reason's own
facts. A refresh never reads the persisted message, so refreshing a pause any
number of times leaves a byte-identical checkpoint. Two branches follow from
this:

- A pending-queue scan that fails again on a pause holding a preserved `DONE`
  leaves the governing reason untouched and carries the scan failure as its own
  `gate-error` reason positioned after it. Each pass replaces the existing
  `gate-error` reason rather than adding another, so exactly one is ever present.
  The governing reason stays first, which is what keeps the pause's own kind and
  stops the diagnostic from describing away the saved `DONE` it holds.
- An uninspectable promised-artifact state has one canonical message, set
  identically when the pause is first built and on every refresh. The sentence
  reporting that re-verification also failed is dropped.

Both existing tests resume twice and assert the checkpoint is unchanged by the
second pass.

Rationale: The message is the field a later reader of `state.json` relies on to
understand a pause, and an accumulator makes repetition indistinguishable from a
genuine count of failures while growing without bound. The invariant already
existed in the sibling branch for an unmet promise, which recomputes from the
mismatch set; this applies it evenly. The scan-failure branch cannot recompute
its base the way that sibling does, because the governing reason it was folding
into may be any pause kind and its message is not derivable at the refresh site —
so the fix is to stop folding, which the reason list already supports: order is
presentation only, the recovery is decided independently of it, and the display
already renders several reasons under a count. The dropped re-verification
sentence is the one place information is lost, and it carries close to nothing: a
human who just ran resume and got the same pause back already knows the failure
persists. Both changes stay inside existing vocabulary — no new waiting kind, no
new banner — so the preserved-`DONE` pause becomes a two-reason pause whose shape
the demo catalog already covers.

## DR4: A failed `git` invocation is a structured, resumable stop — never an exception crossing the engine

Context: FND5 reports that the engine guards `isWorktreeClean` and turns a
failure into a `refused` result, while the `readHead` and `finalizeGitBoundary`
calls beside it are unguarded, so a `git` failure escapes the engine as a
rejected promise and ends the run with a raw stack trace. The question was what
the engine should report instead. The sites are not equivalent: two `readHead`
calls run before anything is mutated, one runs after the attempt executed and
after its `executing` record was persisted, and a boundary finalization can fail
before observing anything or after `git add` has already staged the index.

Decision: The Git module owns its own failures and the engine reports a
resumable stop.

- `finalizeGitBoundary` never throws. A failed `git` invocation inside it becomes
  a variant of `GitBoundaryResult`, so the engine handles it through the boundary
  failure path it already has: a pause carrying a `retry-git-finalization`
  recovery. This is the one result variant that may carry no observation, because
  a failure to collect the boundary status is precisely the inability to observe.
- The engine's own `readHead` calls are guarded. The two that run before any
  mutation return `refused`, matching the worktree check beside them: nothing
  changed and the pause the run sits at still stands. The post-attempt one pauses
  with a `retry-stage` recovery and a `gate-error` reason carrying the Git error.

No new execution-result kind is introduced and none is renamed.

Rationale: Every failure in this class leaves a run that resume genuinely
recovers — a checkpoint left `executing` through the abandoned-attempt path, a
half-finalized boundary through `retry-git-finalization` — so the user-facing
outcome should be the one that says so: exit `2` and the resume command, rather
than exit `1` and a message with no instruction. Classifying instead by whether
mutation had begun would have to report the post-mutation cases through
`fatal-checkpoint`, naming a Git fault after a checkpoint write and calling a
recoverable run fatal. Adding a dedicated Git result kind would stay honest about
the fault but adds terminal vocabulary and a new rendering for a rare
environmental failure while still exiting without a resume instruction. Removing
the throw at its source is also what makes the engine's guard unnecessary there
at all: the asymmetry the finding names exists because the module owning the Git
protocol throws across its own boundary. The trade-off is that this is the
largest of the options considered, and that a `readHead` failure after the
attempt now discards a possibly-`DONE` attempt by running the stage again, which
is the fail-closed direction when the post-attempt tip — the evidence every
later boundary judgement reads — cannot be established. Both pause renderings
already exist in the demo catalog, so no scenario is added.

## DR5: A refreshed gate-error pause preserves the pause's own instruction

Context: FND6 reports that when a resume's pending-queue scan fails on a pause
not holding a preserved `DONE`, the refreshed waiting object is built from
scratch with only its reasons and recovery, so the pause's `nextAction` is
dropped while its sibling branches all keep or set theirs.

Decision: That branch carries the pause's own `nextAction` through unchanged. It
does not set a constant instruction, because the branch is reached from two kinds
of pause with different truths: a `retry-stage` pause carries
`UNVALIDATED_CHANGES_NOTE` and its unvalidated changes are still in the worktree,
while a `resume-finalized-done` pause deliberately carries no instruction — its
stage succeeded and its boundary is already committed. The existing test asserts
the instruction alongside the replaced reasons and preserved recovery.

Rationale: A pause exists to leave the human able to act, so dropping the one
line naming what is in their worktree defeats it — the same principle as DR1.
Preserving rather than recomputing is what keeps the finalized-`DONE` case
correct: hard-coding the unvalidated-changes note there would tell a human to
revert or commit changes the stage's boundary already committed.

## DR6: The engine's execution context drops its unread `lock` and `stateRoot` fields

Context: FND4 reports that `ExecutionContext` declares `lock` and `stateRoot` as
required fields that no code in the engine reads, while both callers and the test
helper compute and pass them.

Decision: Both fields are removed from `ExecutionContext`, together with the
type-only `LockHandle` import that existed solely to type one of them and the
sentence on the context type describing the lock's ownership. Both callers and the
test helper stop computing and passing them. The rule that the caller owns the
lock's acquire/release symmetry and the engine never releases it stays stated on
`executeEngine` itself, which is where it constrains the reader who can act on
it.

Rationale: A required field the engine never reads makes the next reader assume
the engine participates in the lock's lifecycle or the state root's layout, and
forces every new caller and test double to fabricate a value that means nothing.
Nothing settled in this thread gives the engine a reason to hold either one.

## DR7: A failed post-attempt `HEAD` read refuses the run and leaves the attempt abandoned

Context: supersedes the part of DR4 that pins a `readHead` failure after the
attempt executed to a `waiting-for-user` pause carrying a `retry-stage` recovery
and a `gate-error` reason. That pause cannot be written. Checkpoint validation
forbids an attempt with result `executing` on any run whose condition is not
`executing`, so writing the pause requires settling the live attempt, and a
settled attempt must carry `headAfterAttempt` — precisely the value the failed
read could not produce. Substituting another tip is excluded, because a stage's
`headMayChange` rule is judged across the `headAtStart`/`headAfterAttempt` pair,
so a fabricated tip would make that rule pass spuriously and would corrupt the
evidence DR1 and DR2 both rest on.

Decision: Every one of the engine's `readHead` calls, including the one after the
attempt executed, returns `refused` when the read fails. The checkpoint is left
untouched, so the run stays in the `executing` condition with its attempt still
live, and the refusal message names the repository, the underlying Git error, and
the `antmay afk resume <run-id>` command that recovers the run. No checkpoint
schema or validation rule changes. Recovery is the abandoned-attempt path that
already exists: a later resume settles the live attempt as `interrupted`, records
the tip it reads at that moment, and returns the cursor to `ready` at the same
stage — the same stage re-run DR4 intended. A resume attempted while Git is still
unreadable refuses again at the entry guard, before any transition.

Rationale: This keeps the invariant that every settled attempt records the tip its
settlement left behind, rather than weakening it to a conditional rule that would
also require validation to reject any attempt-referencing recovery naming a
tip-less attempt and would turn a currently unreachable guard into a live path.
The run lands in a state the system already models and the terminal already names:
an abandoned attempt is exactly what the entry recovery exists for, and the run
listing renders that condition as `EXECUTING (UNVERIFIED)`. DR4's decision is
preserved in substance — no exception crosses the engine, the stop is structured,
and the run is resumable — and only the form of the record at this one site
changes. The trade-off accepted is that this site exits `1` rather than `2` and
reads as an unverified in-flight run rather than a pause, so the resume
instruction rides in the refusal message instead of in the pause renderer; the
exit code is defensible on its own terms, since the run is not waiting on a human
decision.
