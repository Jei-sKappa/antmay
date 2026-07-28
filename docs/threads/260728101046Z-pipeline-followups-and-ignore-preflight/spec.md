# Spec: pipeline follow-ups and the operational-workspace ignore preflight

## Intended outcome

A user running `antmay afk run` or `antmay afk resume` against a repository whose
thread operational directories are not ignored by Git is refused immediately,
before any run state is allocated or any harness is contacted, with a message
that names each failing directory and hands them the exact ignore rules or
`git rm` command that fixes it. A user who reaches an artifact-contract pause
reads which concrete file is missing and in what shape, instead of the
executor's internal dimension vocabulary, and is told the whole of what resume
requires. A reader of the published documentation and of the repository glossary
finds them describing what the code actually does. A maintainer opening the
codebase finds no dead fields, one copy of each helper that had several, and a
comment at each accepted verification gap explaining why it is accepted.

## Context

The preceding thread `docs/threads/260727135009Z-choose-compose-run-stages/`
replaced the CLI's executor-bundled pipeline with user-authored pipeline
documents: a trusted nine-stage catalog, a bounded artifact-state engine with
per-stage prerequisites and promised transitions, syntax-directed document
references, `--from` suffix selection, a redesigned checkpoint, a full ordered
run preflight, and runtime contract enforcement with four deterministic resume
recoveries. Every one of its plan tasks shipped. Its `implementation-report.md`
closed with a list of concerns and follow-ups deliberately left outside that
plan's scope — published prose that understates a policy, method documentation
that was out of scope, dead fields, five duplications, four accepted
verification gaps, and an internal vocabulary leaking into user-facing output.

This thread worked that list down entry by entry, deciding each on its merits
rather than executing it as a checklist: some entries are defects to fix, some
are deliberate trade-offs to record rather than change. It also folds in
https://github.com/Jei-sKappa/antmay/issues/18, which belongs to the same
preflight that thread rebuilt: Antmay skills create three thread-local
operational directories — `.pending-decisions/`, `.pending-reviews/`, and
`.implementation-runs/` — and when a repository does not ignore them, preflight
passes while they are absent and a later stage's Git boundary then fails on
operational files whose creation was entirely correct. `seed.md` records the
list as the report left it; `decisions.md` records the twelve decisions this
spec encodes.

## Scope

In scope, as six bodies of work:

1. **The operational-workspace preflight** — a new check on `antmay afk run` and
   `antmay afk resume` covering all three directories, and its refusal message.
2. **Demo coverage for that refusal** — one scenario, plus the boundary rule
   that says which preflight refusals earn one.
3. **The inherited verification gaps** — closing one and recording three as
   deliberate at the code they concern.
4. **Dead field removal and duplication consolidation** — three unread fields
   deleted, five duplications resolved, one new shared module.
5. **Artifact-contract reporting in plain language** — one description table
   behind every rendering of an unmet artifact contract, and a prerequisite-pause
   action line that states the whole of what resume requires.
6. **Documentation** — the glossary, the Standard recipe, and `cli/README.md`
   corrected to describe the code; the never-run manual smoke checklist replaced
   by a verification note where a maintainer will meet it.

Explicitly out of scope:

- **Narrowing the workspace check to the directories the selected stages could
  create.** All three are checked on every run unconditionally (per
  `decisions.md` DR1); no per-stage workspace mapping is introduced.
- **Any model validation.** The CLI cannot know a provider's catalog, so no
  allowlist, probe, or warning beyond the one-line note is added anywhere (per
  DR11).
- **Closing the other three verification gaps.** No test is written for the
  unverifiable-postcondition branch, the checkpoint validator is not tightened
  beyond its stage-`id` check, and the documentation test's "user-visible
  reason" assertion is not made semantic (per DR6).
- **Teaching the demo driver to assert output.** It keeps verifying exactly one
  exit code per invocation (per DR7).
- **Scenarios for the thirteen existing single-sentence preflight refusals.** The
  boundary DR5 records is what stops this change from obliging them.
- **Importing the CLI's contract into the method documentation.** `docs/` gains
  the meaning change only — not the document schema, the config-root layout, the
  reference grammar, or the stage-support table (per DR11).
- **Running the manual smoke checklist.** It is deleted rather than performed
  (per DR12); the four properties only a real harness can prove are recorded as
  unproven by automation.
- **`pendingQueuesMessage` in `cli/src/commands/resume.ts`.** DR9's queue-reason
  consolidation covers the `runner.ts`/`classify.ts` pair it names; `resume.ts`
  holds a third verbatim copy of that one function which DR9 does not reach. It
  is left as it is, deliberately — a reviewer should not read it as an oversight.
- **New commands, subcommands, or flags.** The surface stays `antmay afk run`,
  `antmay afk resume`, `antmay afk list`.
- **Checkpoint migrations.** See `## Constraints`.

## Expected behavior

### 1. The operational-workspace check

Both `antmay afk run` and `antmay afk resume` verify, for the selected or
snapshotted thread, two independent properties of each of the three operational
directories `<thread>/.pending-decisions/`, `<thread>/.pending-reviews/`, and
`<thread>/.implementation-runs/`: that the path is covered by Git's ignore rules,
and that Git tracks no content under it. All three are checked on every
invocation, unconditionally, whatever stages the run selects (per DR1). Either
property failing for any of the three refuses the invocation.

Ignore coverage is probed as a directory —
`git check-ignore -q --no-index -- "<thread-rel-path>/<workspace-name>/"`, one
invocation per workspace, the trailing slash mandatory (per DR2). Exit code `0`
is coverage; `1` is missing coverage for that workspace; `128` or a spawn failure
aborts the invocation as a Git error and is never read as missing coverage.
`--no-index` keeps the probe purely about pattern coverage, so a workspace that
holds tracked content reports only the tracked-content problem rather than both
problems for one root cause.

Tracked content is probed separately with a single
`git ls-files -z -- <p1> <p2> <p3>` over the three paths written without trailing
slashes; any emitted path names a workspace with tracked content. A Git error
from this probe likewise aborts the invocation as a Git error rather than being
read as "no tracked content", which is the same fail-closed treatment DR2 fixes
for the coverage probe.

Both probes run before anything is reported: the refusal names every failing
workspace from both probes together rather than stopping at the first (per DR2).

The check is a preflight gate, so a refusal exits `1`, leaves no run directory,
no checkpoint, and no held lock on `run`, and mutates no checkpoint and acquires
no lock on `resume`.

### 2. Where the check sits

In `run` it is the first gate of the repository-state block, immediately before
the clean-worktree gate, and the gates after it shift down by one (per DR3). In
`resume` it runs immediately before that command's clean-worktree gate and
applies unconditionally: the exemptions that skip the clean-worktree check for
`git-policy-violation`, `commit-error`, and `stage-contract-violation` pauses do
not extend to it. Both commands call one shared implementation.

Position relative to the clean-worktree gate is load-bearing behavior, not
ordering taste. When a workspace is both unignored and holds leftover files, the
clean-worktree message tells the user to commit what they want to keep or revert
the rest — advice that, followed literally, commits operational residue into the
repository. Running first is what makes the refusal diagnostic instead of
damaging.

### 3. The refusal message

One message, listing every failing workspace grouped by failure kind, each group
followed by its own copyable correction (per DR4). It opens by stating that
Antmay skills write these directories during a run and that an unignored
workspace makes a later stage fail its Git boundary, so it explains itself to a
user who has never read the CLI's documentation.

The missing-coverage group comes first, followed by the repository-wide
`docs/threads/**/<workspace-name>/` rules to add, named against the resolved
repository root. The tracked-content group follows, listing the offending file
paths exactly as `git ls-files` reported them, followed by a `git rm -r --cached`
command targeting the workspace directory and an instruction to commit. Only
failing workspaces appear in either group, so a workspace already covered is
never implied to be wrong.

The repository-wide rule form is correct for every thread the CLI can be pointed
at, because thread resolution already enforces that a thread sits at exactly
`<repoRoot>/docs/threads/<thread-folder>`. The CLI provisions no configuration
and cannot write the correction itself; the message is the entire remedy.

### 4. Demo coverage and the scenario boundary

One demo scenario exercises the refusal and covers both failure kinds in a single
message: it strips the ignore rules for two workspaces and force-adds a tracked
file under the third, so the rendering shows the missing-coverage group, its
rules block, the tracked group, and its `git rm` block together, and stops at
exit code `1` (per DR5). Both the test fixture and the demo fixture already
write trailing-slash ignore rules for all three workspaces, so the gate breaks
nothing that exists and the scenario must remove that coverage deliberately.

`cli/AGENTS.md` records the boundary that keeps this consistent: a preflight
refusal earns a scenario when its message is structured — grouped lists or
copyable blocks — and not when it is a single sentence.

### 5. The verification gaps

The governing rule is that a gap is closed when a future change could silently
break something a user depends on, and recorded as deliberate when what it fails
to check is either structurally unreachable or load-bearing by design (per DR6).

**Closed: the demo timing coupling.** A gated test dynamically imports
`cli/scripts/scenarios/07-runtime-prerequisite.mjs` and asserts that its `run`
step's `afterMs` is strictly less than `SPEC_CORRECT_DELAY_MS`, so changing
either value alone fails `npm run check` (per DR7). The scenario's comment states
what the code actually does: both a too-early and a too-late value produce an
exit-code mismatch and a failed demo. It claims no silent false pass — the
scenario declares exit `2`, a late value lets both stages complete and exits `0`,
an early value makes preflight composition refuse and exits `1`, so either miss
already fails the demo loudly.

**Recorded as deliberate, each with its reasoning as a comment at the code it
concerns:**

- the unverifiable-postcondition branch, which is unreachable end to end because
  preflight rejects its only producible cause, and which fails closed;
- the checkpoint validator's stage-`id` check, whose deliberate silence about the
  rest of the descriptor is what keeps the runner's pipeline-agnosticism provable
  with synthetic fixtures;
- the documentation test's "user-visible reason" assertion, a length-and-
  punctuation threshold that no expressible assertion could replace, because
  whether prose is user-facing is not mechanically decidable.

The reasoning lives at the code rather than only in this thread's artifacts, so a
future maintainer does not re-raise a concern whose answer sits in a document
they will never open.

### 6. Removed fields

`DocumentReference.form`, `DocumentReference.raw`, and
`gitCursor.headAtStageEntry` are removed (per DR8). `DocumentReference` becomes
`{ role, sourcePath }`; `gitCursor` becomes `{ stageIndex, observedHead }`. The
type's doc comment loses the claim that `form` and `raw` exist for a diagnostic,
because every diagnostic in that module is composed before a `DocumentReference`
is constructed.

`headAtStageEntry` was read in exactly one place, to compute the value written
straight back into itself, and printed nowhere; its removal deletes that
stage-entry cursor propagation through the runner and resume. Its sibling
`observedHead` is genuinely consumed — resume compares it against current `HEAD`
and reports the difference — and that behavior is unchanged. The cross-field
invariant tying the cursor's stage index to the current stage when its HEAD
observation is set survives over the surviving field, with its diagnostic naming
that field accurately.

Every checkpoint literal in the test suite is updated in the same change; the
type checker drives that sweep to completion.

### 7. Consolidated duplications

All five recorded duplications are resolved (per DR9), with no change to any
message text or classification order:

- The queue-reason functions — the reason assembly and its precedence
  (gate-error before pending-queues), `gateErrorMessage`, and
  `pendingQueuesMessage` — are exported from `cli/src/runner/classify.ts`, and
  their copies in `cli/src/runner/runner.ts` are deleted in favor of imports.
- `describeContractSide` moves to `cli/src/thread/artifacts.ts`, which owns the
  type it formats, and both `runner.ts` and `cli/src/commands/resume.ts` import
  it.
- `HARNESS_IDS` is exported from `cli/src/config/execution.ts` and consumed by
  `cli/src/state/checkpoint.ts`, which already imports the `HarnessId` type from
  that module; the parallel `Set` literal is gone.
- The `as HarnessId` cast inside the very check that narrows it is resolved, and
  the adjacent diagnostic's harness list derives from `HARNESS_IDS` rather than
  naming the two ids literally.
- `isPlainObject` moves into a new shared module under `cli/src/`, imported by
  all four validators that each held a byte-identical copy, and that directory is
  added to the layout section of `cli/AGENTS.md` in the same change.

### 8. Artifact contracts in plain language

One description table, defined beside the artifact-state dimensions in
`cli/src/thread/artifacts.ts`, maps each dimension and value to a plain-language
phrase naming the concrete file and its shape — so a reader learns that a brief
plan means `plan.md` at the thread root with no `plan-tasks/` folder, rather than
reading `plan: expected "brief", found "absent"` (per DR10).

The `Artifacts:` list in the closing block renders its rows from that table, for
both the `stage-prerequisite-unmet` and the `stage-contract-violation` banners,
which render the identical list. `describeContractSide` — relocated to this
module by DR9 — is built on the same table, so the `Detail` sentence above the
list and the list itself agree. The display layer composes no phrasing of its
own. The table is exhaustive over the artifact-state dimensions by construction,
so adding a dimension fails the typecheck rather than silently falling back to a
raw value.

The `stage-prerequisite-unmet` pause's action line stays a single static
constant and becomes: *restore the artifacts listed above and leave the worktree
clean, then resume.* Both halves are required. That pause is not among the kinds
exempt from the clean-worktree rule, so a human must leave the tree clean before
resume is accepted; and how the artifact was lost decides the remedy — a deleted
tracked file is restored with a checkout and needs no commit, a newly written or
modified tracked artifact does need one, and a gitignored artifact needs neither
— which is why the line states the constraint rather than prescribing a remedy.
The `stage-contract-violation` pause's action line is unchanged.

### 9. Documentation

Four surfaces are corrected (per DR11):

- `docs/glossary.md`'s **stage** definition gains the artifact prerequisite and
  the promised transition the catalog now owns.
- The two passages reading as though the executor ships the `standard` pipeline —
  one in `docs/glossary.md`, one in `docs/recipes/standard.md` — state that a
  pipeline is a document the user authors or saves, with the CLI's README
  publishing a ready-made Standard one, and say nothing further.
- `cli/README.md` moves `review-spec` out of the group of stages permitted to
  touch `spec.md` and states that it permits no tracked change at all: its
  allowed-changes list is empty, its change requirement false, and its
  commit-subject template absent, making it the one supported read-only stage.
- The README's copyable settings block gains a one-line note at the block itself
  recording that the models are examples validated against no provider.

The fifteen-step manual smoke checklist is deleted from `cli/README.md`, and a
short paragraph in `cli/AGENTS.md` — roughly four sentences, no checkboxes and no
numbered ceremony — records that the test suite fakes every harness and names the
four things only a real harness can prove: a real session launching on the
harness its binding names, the curated live stream against the verbose attempt
log, a real boundary commit following a genuine `DONE`, and native session
capture with out-of-band continuation. It sits with that file's existing
test-suite and scripted-harness material, claims no schedule, and asserts that
nobody runs it periodically. The phrase listing the checklist among the README's
contents is removed from `cli/AGENTS.md` in the same edit (per DR12).

## Constraints

**One task, not two, for `describeContractSide`.** DR9 relocates it into
`cli/src/thread/artifacts.ts` and DR10 rewrites it there against the new
description table. They touch the same function, and splitting them across two
units of work lets the second undo the first's placement. They must land
together.

**The settings note must sit outside the fenced JSON block.**
`cli/src/pipeline/documentation.test.ts` writes that block verbatim to a resolved
config root and feeds it to the production settings loader, which accepts no
comments. A note inside the fence breaks the gate; a note immediately before or
after it does not.

**Vocabulary.** `docs/glossary.md` is the repository's naming authority and its
term for these three directories is **temporary workspace**. This thread's
artifacts call them operational workspaces informally; user-visible output and
published prose must not coin a competing canonical term for them. The refusal
message can name the three directories concretely and needs no collective noun
at all.

**The published stage-support reference.** `cli/README.md` carries the one table
of which skills run as CLI stages and what each supported stage requires; the
root `AGENTS.md` rule keeping it current governs the `review-spec` correction.
No table row's skill list or prerequisite changes here — only the Git-policy
prose beneath it — and `documentation.test.ts` continues to hold the rows to the
published skill list and to the catalog's own prerequisites.

**Pre-release licence, and its limit.** Per `cli/AGENTS.md`, the CLI has no users
and no backward-compatibility obligation: `gitCursor` loses a field with no
migration, no shim, and no `schemaVersion` bump, and whether a previously written
`state.json` still validates is not a design consideration. That licences
redesign, never disrepair — `npm run check` must pass on every change, with no
failing test, no type error, no half-migrated code, and no red scenario.

**Behavior preservation where the work is internal.** The consolidations (DR9)
and the field removals (DR8) change no message text, no classification order, no
exit code, and no rendering. The only intended user-visible changes in the CLI
are the new refusal, the plain-language artifact rows, and the prerequisite
pause's action line.

**Git access.** All Git goes through the package's single `execFile`-based
wrapper, which provides no stdin, which is why `git check-ignore` is invoked once
per workspace rather than batched through `--stdin` (per DR2). The trailing
slash, `--no-index`, and the `1`-versus-`128` distinction are each silently wrong
in a way a permissive fixture would not catch.

**Describe the current state.** Per the root `AGENTS.md`, every documentation and
skill-body edit here describes the corrected state as though it had always been
so, with no note of what the text previously said and no before/after contrast.

**Commit scoping.** Changes confined to the CLI use the `cli` scope; changes
spanning `cli/` and `docs/` or touching shared root files omit the scope.

*Risk note, no action implied:* the README's execution-profile example also names
concrete model strings, and DR11 places the caveat on the settings block only. A
reader who copies the profile example alone meets no warning.

## Acceptance criteria

### FR-1 — The operational-workspace check (DR1, DR2)

- **AC-1.1** Both `run` and `resume` check all three of
  `.pending-decisions/`, `.pending-reviews/`, `.implementation-runs/` under the
  target thread on every invocation, independent of which stages are selected or
  snapshotted.
- **AC-1.2** Ignore coverage is probed with
  `git check-ignore -q --no-index -- "<thread-rel-path>/<workspace-name>/"`, one
  invocation per workspace, with the trailing slash present. A repository whose
  only rule is the trailing-slash directory form (as both fixtures write) passes;
  a repository whose rule covers only some filenames under the directory (for
  example one ending `/*.md`) is reported as missing coverage.
- **AC-1.3** Exit code `0` is coverage and `1` is missing coverage for that
  workspace; exit code `128` and a spawn failure each abort the invocation
  reporting a Git error, and neither is reported as missing coverage.
- **AC-1.4** Tracked content is probed with one
  `git ls-files -z -- <p1> <p2> <p3>` over the three paths written without
  trailing slashes, and every emitted path is attributed to the workspace it
  falls under. A Git error from this probe aborts the invocation reporting a Git
  error.
- **AC-1.5** Given a repository failing on more than one workspace and on both
  failure kinds at once, one refusal reports every failing workspace from both
  probes; it does not stop at the first.
- **AC-1.6** A workspace that is ignore-covered *and* holds tracked content is
  reported under the tracked-content group only. A workspace that holds tracked
  content and is *not* covered is reported under both groups, because those are
  two corrections.
- **AC-1.7** A refusal from either command exits `1`. After a `run` refusal no
  run directory, no `state.json`, and no lock file exists; after a `resume`
  refusal the checkpoint is byte-identical to before and no lock was acquired.

### FR-2 — Gate placement (DR3)

- **AC-2.1** In `run`, the check executes after thread resolution and
  immediately before the clean-worktree gate, and every gate after it is
  renumbered accordingly in the command's own ordered commentary.
- **AC-2.2** In `resume`, the check executes immediately before that command's
  clean-worktree gate and refuses for a `git-policy-violation`, a
  `commit-error`, and a `stage-contract-violation` pause as well — the
  clean-worktree exemptions do not extend to it.
- **AC-2.3** Exactly one implementation of the check exists, and both commands
  call it.
- **AC-2.4** For each command, a repository with an unignored workspace *and* a
  dirty worktree produces the workspace refusal, not the clean-worktree message.

### FR-3 — The refusal message (DR4)

- **AC-3.1** The message opens by stating that Antmay skills write these
  directories during a run and that an unignored workspace makes a later stage
  fail its Git boundary; it references no documentation to be actionable.
- **AC-3.2** The missing-coverage group appears first, lists exactly the
  workspaces failing that probe, and is followed by a copyable block of
  `docs/threads/**/<workspace-name>/` rules — repository-wide, one per failing
  workspace — named against the resolved repository root.
- **AC-3.3** The tracked-content group lists the offending file paths exactly as
  `git ls-files` emitted them, and is followed by a copyable
  `git rm -r --cached` command targeting the workspace directory plus an
  instruction to commit.
- **AC-3.4** No workspace that passed both probes appears anywhere in the
  message, and a group with no failures is absent rather than empty.

### FR-4 — Demo coverage and the scenario boundary (DR5)

- **AC-4.1** One scenario file under `cli/scripts/scenarios/` drives the refusal
  and declares exit code `1`; running it reports `[PASS]` and its terminal output
  ends on the refusal.
- **AC-4.2** That scenario's own setup strips the ignore rules for two
  workspaces and force-adds a tracked file under the third, so one message shows
  the missing-coverage group, its rules block, the tracked group, and its
  `git rm` block together.
- **AC-4.3** The scenario table in `cli/README.md` gains a row for it, its id
  carries an ordering prefix placing it in reading order, and `npm run demo --
  --list` matches the table.
- **AC-4.4** `cli/AGENTS.md` states that a preflight refusal earns a scenario
  when its message is structured — grouped lists or copyable blocks — and not
  when it is a single sentence.

### FR-5 — The demo timing coupling is closed (DR7)

- **AC-5.1** A test under the `npm run check` gate dynamically imports
  `cli/scripts/scenarios/07-runtime-prerequisite.mjs` and asserts its `run`
  step's `afterMs` is strictly less than the imported `SPEC_CORRECT_DELAY_MS`.
- **AC-5.2** Mutating either value alone — raising `afterMs` above the constant,
  or lowering the constant below `afterMs` — fails `npm run check`, verified by
  performing both mutations and observing the failure.
- **AC-5.3** The scenario's comment states that both a too-early and a too-late
  `afterMs` produce an exit-code mismatch and a failed demo, and asserts no
  outcome in which the demo passes while showing another scenario's rendering.
- **AC-5.4** `cli/scripts/demo.mjs` and `cli/scripts/demo/steps.mjs` gain no
  output assertion; the demo still verifies exactly one exit code per invocation.

### FR-6 — Three gaps recorded as deliberate (DR6)

- **AC-6.1** A comment beside the unverifiable-postcondition branch records that
  it is unreachable end to end because preflight rejects its only producible
  cause, and that it is the fail-closed direction.
- **AC-6.2** A comment beside the checkpoint validator's stage-`id` check records
  that checking no more of the descriptor is what keeps the runner's
  pipeline-agnosticism provable with synthetic fixtures.
- **AC-6.3** A comment beside the documentation test's "user-visible reason"
  assertion records that the threshold is structural and that no expressible
  assertion can judge whether prose is user-facing.
- **AC-6.4** No test is added for the unreachable branch, the validator's
  descriptor checking is not widened, and the "user-visible reason" assertion
  remains the same structural threshold.

### FR-7 — Removed fields (DR8)

- **AC-7.1** `DocumentReference` is exactly `{ role, sourcePath }`; `form` and
  `raw` appear nowhere under `cli/`, including in
  `cli/src/config/references.test.ts`, and the type's doc comment no longer
  claims a diagnostic reads them.
- **AC-7.2** `gitCursor` is exactly `{ stageIndex, observedHead }` in the
  checkpoint type, its validator, and every writer and reader;
  `headAtStageEntry` appears nowhere under `cli/`.
- **AC-7.3** Every checkpoint literal in the test suite is updated, and
  `npm --prefix cli run typecheck` is clean.
- **AC-7.4** Resume still compares `observedHead` against current `HEAD` and
  reports a difference, unchanged; the cursor's stage-index cross-field invariant
  still holds over `observedHead`, and its diagnostic names that field
  accurately.

### FR-8 — Consolidated duplications (DR9)

- **AC-8.1** `cli/src/runner/classify.ts` exports the queue-reason assembly,
  `gateErrorMessage`, and `pendingQueuesMessage`; `cli/src/runner/runner.ts`
  defines none of them and imports all it uses. Gate-error-before-pending-queues
  precedence is preserved, and every existing runner and classifier test passes
  with its expectations unchanged.
- **AC-8.2** `describeContractSide` is defined once, in
  `cli/src/thread/artifacts.ts`, and imported by `runner.ts` and
  `cli/src/commands/resume.ts`.
- **AC-8.3** `HARNESS_IDS` is exported from `cli/src/config/execution.ts` and
  imported by `cli/src/state/checkpoint.ts`; no second harness membership
  collection is defined anywhere.
- **AC-8.4** No `as HarnessId` cast remains inside the check that narrows the
  value, and the adjacent diagnostic's list of harness ids is derived from
  `HARNESS_IDS` rather than written literally.
- **AC-8.5** `isPlainObject` is defined once, in a new shared module under
  `cli/src/`, and imported by the validators in `config/`, `pipeline/`,
  `harness/scripted/`, and `state/`; `grep` finds no other definition under
  `cli/`.
- **AC-8.6** `cli/AGENTS.md`'s module-layout section names that new directory and
  says what belongs in it.
- **AC-8.7** No user-visible string changes: the messages produced by the
  consolidated helpers are identical to those produced before, evidenced by the
  existing tests passing without expectation edits.

### FR-9 — Artifact contracts in plain language (DR10)

- **AC-9.1** One description table is defined in `cli/src/thread/artifacts.ts`
  beside the artifact-state dimensions, and maps every dimension-and-value pair
  to a phrase naming the concrete file or folder and its shape (for example, the
  `brief` plan phrase names `plan.md` and `plan-tasks/`).
- **AC-9.2** The table is exhaustive by construction: adding a dimension to the
  artifact state fails `npm --prefix cli run typecheck`, verified by performing
  that mutation. No code path renders a raw dimension value as a fallback.
- **AC-9.3** The `Artifacts:` rows of both the `stage-prerequisite-unmet` and the
  `stage-contract-violation` closing blocks are composed from that table; no row
  renders `expected "<value>", found "<value>"` or a bare dimension name.
- **AC-9.4** `cli/src/display/terminal.ts` composes no artifact phrasing of its
  own — it neither names a dimension nor stringifies a dimension value.
- **AC-9.5** `describeContractSide` draws on the same table, so the `Detail`
  sentence and the `Artifacts:` list describe the same dimensions in the same
  words.
- **AC-9.6** The `stage-prerequisite-unmet` pause's `Next:` line renders one
  static constant instructing the user to restore the artifacts listed above and
  leave the worktree clean, then resume; it is not composed from the unmet
  dimensions. The `stage-contract-violation` note is unchanged.
- **AC-9.7** Demo scenarios `07-runtime-prerequisite` and
  `08-stage-contract-violation` run at their declared exit codes and their
  `Artifacts:` lists show the plain-language phrasing.

### FR-10 — Documentation corrections (DR11)

- **AC-10.1** `docs/glossary.md`'s **stage** entry names the artifact
  prerequisite and the promised transition alongside the id, skill, target, Git
  policy, and queue resolution.
- **AC-10.2** The pipeline passages in `docs/glossary.md` and
  `docs/recipes/standard.md` state that a pipeline is a document the user authors
  or saves, with the CLI's README publishing a ready-made Standard one, and add
  no document schema, config-root layout, reference grammar, or stage-support
  table to `docs/`.
- **AC-10.3** `cli/README.md` no longer groups `review-spec` with the stages
  permitted to touch `spec.md`, and states that it permits no tracked change at
  all.
- **AC-10.4** A one-line note at the settings block records that its model
  strings are examples validated against no provider. The note sits outside the
  fenced JSON, `documentation.test.ts` still loads that block through the
  production settings loader successfully, and no model validation exists
  anywhere in `cli/src/`.
- **AC-10.5** No edited passage in `docs/` or `cli/README.md` contains a
  before/after contrast or a negation whose only referent is the removed wording.

### FR-11 — The smoke checklist is replaced (DR12)

- **AC-11.1** `cli/README.md` has no `## Manual smoke checklist` section, and no
  file in the repository refers to one.
- **AC-11.2** `cli/AGENTS.md` carries a short paragraph — prose, no checkboxes
  and no numbered steps — stating that the test suite fakes every harness and
  naming the four properties only a real harness can prove: a real session
  launching on the harness its binding names, the curated live stream against the
  verbose attempt log, a real boundary commit after a genuine `DONE`, and native
  session capture with out-of-band continuation. It claims no schedule and states
  that nobody runs it periodically.
- **AC-11.3** That paragraph sits with `cli/AGENTS.md`'s existing test-suite and
  scripted-harness material, and the phrase listing the checklist among the
  README's contents is gone from that file.

### FR-12 — The gate (repository-wide)

- **AC-12.1** `npm --prefix cli run check` exits `0`: typecheck clean, all tests
  passing, build succeeding.
- **AC-12.2** The new scenario and every scenario whose rendering this work
  changes are executed with `--no-color` and each reports `[PASS]` at its
  declared exit code.
- **AC-12.3** Every new test is shown non-vacuous: for each behavior this thread
  introduces or changes, the corresponding test is observed to fail against the
  pre-change behavior.

## Degrees of freedom

The *what* above is pinned. These *hows* are deliberately left to the
implementer; each is reversible, changes nothing a reviewer checks, and produces
no user-visible difference.

- **Where the shared workspace check lives** — which module and file hold it, and
  its exported shape and result type, provided exactly one implementation serves
  both commands.
- **Internal symbol and module names**, including the name and directory of the
  new shared module DR9 introduces, provided `cli/AGENTS.md`'s layout section
  describes whatever is chosen.
- **The exact prose of the refusal** beyond the content FR-3 requires — sentence
  wording, indentation, and how the copyable blocks are delimited.
- **How the description table is represented** — a mapped type, a nested record,
  a lookup function — provided it is single-sourced in
  `cli/src/thread/artifacts.ts` and exhaustive by construction, and the exact
  plain-language phrasing of each entry provided it names the concrete file or
  folder and its shape.
- **The scenario's number, filename stem, and fixture mechanics** — whether it
  rewrites or appends to `.gitignore`, and whether it commits the change or
  leaves the tree dirty, since the workspace gate precedes the clean-worktree
  gate either way.
- **Test placement and naming**, including which file holds the `afterMs` binding
  test and whether new cases join existing suites or new ones, subject to
  `cli/AGENTS.md`'s concurrency and fixture conventions.
- **Whether the resume-side sibling of the unverifiable-postcondition branch
  carries its own copy of the DR6 reasoning or a pointer to it** — both branches
  fail closed for the same cause, and AC-6.1 is satisfied either way.
- **Task decomposition and commit granularity**, subject to the one coupling
  named in `## Constraints`.
