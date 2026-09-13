# Implementation report

Source: plan.md

## Outcome

All eleven plan tasks are complete. Nothing was left partial, nothing was blocked,
and no task was found already satisfied.

`antmay afk run` and `antmay afk resume` now refuse immediately when a thread's
temporary workspaces are not Git-safe, and a demo scenario exhibits that refusal.
The three inherited dead fields are gone, all five recorded duplications are
resolved behind one new shared module, unmet artifact contracts render in plain
language from a single exhaustive description table, one verification gap is closed
under the test gate and three are recorded as deliberate at the code they concern,
and the glossary, the Standard recipe, and `cli/README.md` describe what the code
actually does.

The work landed as eleven commits on `feat/22-improve-pipeline-ux`, one per plan
task, starting from `f30b4f7` and ending at `f826da8`. The working tree is clean.

## Changes

**The temporary-workspace preflight.** `cli/src/gitops/temporary-workspaces.ts`
(new) exports `checkTemporaryWorkspaces(repoRoot, threadRelPath, gitRunner?)`,
returning `{ ok: true } | { ok: false; message }` where the message carries the
complete user-visible refusal, so callers need no formatting logic. It probes
ignore coverage once per workspace with `git check-ignore -q --no-index` and the
mandatory trailing slash, probes tracked content once with `git ls-files -z` over
the three paths written without trailing slashes, and treats exit `0` as coverage
and `1` as missing coverage while routing any other exit — including `128` — and
any spawn failure to a fail-closed Git error. The two probes are independent, so an
ignore-covered workspace holding tracked content reports only the tracked
correction while an unignored one holding tracked content appears in both groups.
The refusal opens by explaining that Antmay skills write these directories and that
an unignored one makes a later stage fail its Git boundary, then lists the
missing-coverage group with its repository-wide `docs/threads/**/<name>/` rules
followed by the tracked-content group with its `git rm -r --cached` command; a
group with no failures is absent rather than empty. A co-located 13-case suite
covers the exact probe argument vectors, both real-Git ignore-rule forms, NUL
attribution, the grouping, and all three fail-closed paths.

`cli/src/commands/run.ts` calls the check as its new Preflight 11, immediately
before the clean-worktree gate, with the gates after it renumbered.
`cli/src/commands/resume.ts` calls it unconditionally above the `if (requiresClean)`
block, so the clean-worktree exemptions for `git-policy-violation`,
`commit-error`, and `stage-contract-violation` pauses do not extend to it. Position
is load-bearing: running first is what stops the clean-worktree message from
advising a user to commit operational residue. New command-level coverage proves a
refusal leaves no run directory, no `state.json`, no lock, a byte-identical
checkpoint, and zero harness invocations.

`cli/scripts/scenarios/20-temporary-workspace-refusal.mjs` (new) reaches the
refusal by rewriting the fixture `.gitignore` to keep only `.implementation-runs/`
and force-adding a committed file under that surviving rule, so one invocation
renders both groups and both copyable corrections and stops at exit `1`.
`20-list.mjs` moved to `21-list.mjs` byte-identically to keep the aggregate listing
last in reading order, and `cli/README.md`'s scenario table gained the new row.
`cli/AGENTS.md` records the boundary that keeps this consistent: a preflight
refusal earns a scenario when its message is structured, and not when it is a
single sentence.

**Dead fields removed.** `DocumentReference` is now exactly
`{ role, sourcePath }`, with the doc comment naming only the provenance the value
carries; diagnostics were unaffected because they compose from the reference string
on the rejection path, before any `DocumentReference` exists. `gitCursor` is now
exactly `{ stageIndex, observedHead }` in the checkpoint type, its validator, every
production write, every checkpoint literal in the test suite, and the demo seed —
`headAtStageEntry` appears nowhere under `cli/`. That deletes the stage-entry cursor
propagation through the runner and resume, which read the field only to compute the
value written straight back into itself. Resume still compares `observedHead`
against current `HEAD` and reports the difference, and the cross-field invariant
survives keyed to the surviving field with its diagnostic naming it. No migration,
shim, optional field, or `schemaVersion` movement, per the pre-release notice.

**Duplications consolidated.** `cli/src/shared/validation.ts` (new) holds the one
`isPlainObject`, imported by the validators in `config/`, `pipeline/`,
`harness/scripted/`, and `state/`; `cli/AGENTS.md`'s module-layout section names the
new directory and what belongs in it. `HARNESS_IDS` is exported once from
`config/execution.ts` and consumed by `state/checkpoint.ts`, whose parallel `Set` is
gone; the `as HarnessId` cast that sat inside the very check that narrows the value
is resolved through a module-private guard, and the enumerating diagnostic derives
its id list rather than naming the two literally. `runner/classify.ts` now owns and
exports the queue-reason assembly with its gate-error-before-pending-queues
precedence, `gateErrorMessage`, and `pendingQueuesMessage`, with `classifyAttempt`
calling the exported assembly so helper and classification cannot drift; the copies
in `runner.ts` and `resume.ts` are deleted in favour of imports.

**Artifact contracts in plain language.** `cli/src/thread/artifacts.ts` owns
`ARTIFACT_DESCRIPTIONS`, a total mapped type over `keyof ArtifactState` giving all
twelve dimension/value pairs a phrase naming the concrete file or folder and its
shape, together with `describeArtifact`, `formatArtifactMismatch`, and
`describeContractSide` — relocated into this module and rewritten against the table
in one change, as the plan's coupling requires. The `Artifacts:` rows of both the
`stage-prerequisite-unmet` and `stage-contract-violation` banners render from that
table, and so does the `Detail` sentence above them, so the two agree;
`cli/src/display/terminal.ts` composes no artifact phrasing of its own, naming no
dimension and stringifying no dimension value. The table is exhaustive by
construction — an object literal annotated with a total mapped type, with no
`Partial`, no index signature, no cast, and no fallback branch — so a new dimension
leaves a required property missing rather than rendering a raw value.
`describeArtifact` is generic over its dimension, so pairing a dimension with a
foreign value is a type error. The `stage-prerequisite-unmet` action line is one
static constant instructing the user to restore the artifacts listed above and
leave the worktree clean, then resume; the `stage-contract-violation` note is
unchanged.

**Verification gaps.** `cli/src/harness/scripted/demo-timing.test.ts` (new)
dynamically imports `cli/scripts/scenarios/07-runtime-prerequisite.mjs` by URL and
asserts its timed `run` step's `afterMs` is strictly below the imported
`SPEC_CORRECT_DELAY_MS`, so changing either value alone fails `npm run check` —
which is what the binding is for, since `cli/scripts/` sits outside the typecheck
gate. The scenario's comment states what the code does: both a too-early and a
too-late value produce an exit-code mismatch and a failed demo. Three gaps are
recorded as deliberate with their reasoning beside the code — the
unverifiable-postcondition branch in the runner (unreachable end to end because
preflight rejects its only producible cause, and the fail-closed direction), with
the resume-side sibling pointing at that one explanation; the checkpoint validator's
stage-`id` check, whose deliberate silence about the rest of the descriptor keeps the
runner's pipeline-agnosticism provable with synthetic fixtures; and the
documentation test's user-visible-reason assertion, a structural threshold no
expressible assertion could replace. All three remain open by design.

**Living documentation.** `docs/glossary.md`'s **stage** entry names the artifact
prerequisite and the promised transition alongside the id, skill, target, Git
policy, and queue resolution. The pipeline passages in `docs/glossary.md` and
`docs/recipes/standard.md` state that a pipeline is a document the user authors or
saves, with the CLI's README publishing a ready-made Standard one.
`cli/README.md` documents `review-spec` as the one supported read-only stage,
permitting no tracked change at all, and its settings block gained a one-line note
recording that the model strings are examples validated against no provider, placed
outside the fenced JSON so the documentation gate still loads the block. The
fifteen-step manual smoke checklist is deleted; `cli/AGENTS.md` carries a prose
paragraph in its place naming the four properties only a real harness can prove.

## Verification

- `npm --prefix cli run check` — exit `0` before every one of the eleven commits,
  run directly rather than taken on report. Final run: 39 test files, 816 tests,
  typecheck and build clean.
- Every task's own focused suites — all exit `0`.
- Demo scenarios run with `--no-color`: `20-temporary-workspace-refusal` `[PASS]` at
  exit `1` ending on the grouped refusal; `21-list` `[PASS]`; `01-all-done`
  `[PASS]`, confirming the new gate breaks no existing scenario;
  `07-runtime-prerequisite` and `08-stage-contract-violation` both `[PASS]` at exit
  `2` showing the plain-language rows. `npm run demo -- --list` and the README
  scenario table agree at 21 stems and 21 rows.
- Non-vacuity demonstrated by real mutation wherever the plan asked for it. The
  artifact table's exhaustiveness: adding a sixth `ArtifactState` dimension made
  `tsc` fail at the table with TS2741, then `cli/src/pipeline/types.ts` was restored
  byte-for-byte. The demo timing binding, in both directions: raising `afterMs` to
  `4000` failed with "expected 4000 to be less than 3000", and lowering the constant
  to `500` failed with "expected 1000 to be less than 500", both then reverted with
  an empty diff on `invoker.ts`. The workspace check's fail-open fix: reverting only
  the verdict condition made its regression case fail.
- Property sweeps confirmed directly: `headAtStageEntry` absent from `cli/`, no
  `as HarnessId` under `cli/src`, exactly one `isPlainObject` definition, exactly one
  definition site for each queue-reason helper with no match in `runner.ts` or
  `resume.ts`, and `docs/threads/` untouched by the documentation task.

Deliberately not run: the fifteen-step manual smoke checklist, which was deleted
rather than performed. The four properties only a real harness can prove are now
recorded as unproven by automation in `cli/AGENTS.md`. No provider-aware model
allowlist, catalog lookup, availability, authentication, or reachability probe was
introduced anywhere in `cli/src/`; the loaders still validate every `model` field as
a non-empty string and nothing more.

## Deviations and judgment calls

- **A plan fault in the harness-ID task, resolved in favour of the spec.** That
  task's second acceptance criterion asks that "both supported-ID diagnostics derive
  from `HARNESS_IDS`". This is unimplementable: only `config/execution.ts`'s
  diagnostic enumerates harness ids, while the checkpoint validator's two name none,
  so there is no list in them to derive, and injecting one would change user-visible
  text that both the plan's own behavior-preservation constraint and spec AC-8.7
  forbid. Implemented per spec AC-8.4, which is singular. The plan wording needs
  correcting upstream; the shipped code is right.
- **Three pre-existing tests changed how they obstruct a queue scan.** They broke a
  scan by *committing* a regular file at a temporary-workspace path, which the new
  gate now correctly refuses before the scan is reached. They were switched to an
  obstruction that is both untracked and ignored, leaving `ENOTDIR` the only
  reachable refusal. No assertion was weakened; the `run` case, which asserted only
  an exit code and had silently become vacuous under the new gate, was strengthened
  to assert the scan-failure message.
- **Two comments rewritten during the cursor-field removal.** Both justified
  themselves by naming the removed field, so they were rewritten to state the live
  rule rather than left referring to something a fresh reader cannot find.
- **One user-visible string changed.** The cursor invariant's diagnostic now names
  `gitCursor.observedHead` where it previously said "when its HEAD fields are set".
  This is in mild tension with that task's own "no user-visible string changes"
  criterion, but the same task explicitly mandates a diagnostic naming the surviving
  field, so the specific instruction governs. Deliberate, not an oversight.
- **The workspace refusal has a message shape the spec does not describe.** A tracked
  path that attributes to none of the three workspaces is listed under
  `Tracked by Git:` with no correction block and no commit instruction. The
  alternatives were dropping the path — a fail-open in a check whose whole purpose is
  failing closed — or naming a directory Git did not implicate. Naming it without a
  correction is the only reading that keeps both mandates.
- **Deleting the smoke checklist opened two documentation gaps.** Removing the
  section whole was prescribed, and it held `cli/README.md`'s only `npm link`
  instruction and its only `node dist/main.js --version` fallback, so the README now
  documents no install or build-verification path for the binary and the root
  `README.md` only links there. The same deletion removed the only user-facing
  instruction to commit `.gitignore` rules for the three temporary workspaces — which
  this thread just made a hard preflight refusal — so that requirement is now
  undiscoverable before a first run. The refusal itself prints copyable corrections
  and the spec deliberately makes that message the entire remedy, so no user is
  stranded, but both gaps are real and are carried as follow-ups.

## Remaining concerns

- **`cli/src/pipeline/composition.ts` keeps a second, coarser dimension describer.**
  A preflight rejection still reads `plan state "strict"` while a runtime pause now
  reads in concrete files, so one dimension is described in two vocabularies. No gate
  or demo compares them. This is now an easy consolidation, because the exhaustive
  table is exported from a module `composition.ts` already imports from.
- **`splitNul` is duplicated byte-identically** between
  `cli/src/gitops/temporary-workspaces.ts` and `cli/src/gitops/status.ts`. Left open
  deliberately: the recorded duplication list does not include it, and resolving it
  meant touching a file outside the introducing task's footprint.
- **`state/checkpoint.ts` now imports `config/execution.ts` for a value** where it
  previously imported only a type. There is no import cycle, and the help, version,
  and grammar-error paths that the dynamic-import contract protects never reach the
  settings-loader chunk — but `antmay afk list` now parses it, which its previous
  graph did not. `config/execution.ts` has no top-level side effects, so the cost is
  parse-time only on the cheapest real command.
- **`satisfies readonly HarnessId[]` does not enforce exhaustiveness**, so adding a
  member to the `HarnessId` union without adding it to `HARNESS_IDS` typechecks
  clean. Pre-existing, but more consequential now that the diagnostic is derived: an
  omitted id would silently vanish from the user-facing list rather than merely
  disagreeing with a hardcoded one. That list's `" or "` conjunction is likewise
  byte-correct at two ids and renders without list punctuation past that.
- **The artifact table's guarantees have two documented edges.** A caller holding the
  full dimension union instantiates `describeArtifact`'s generic at that union, so
  the in-body lookup goes unchecked there, and the retained justification comment
  slightly overstates the guarantee; it is unreachable today because mismatch
  derivation takes both sides from one key and the checkpoint validator rejects a
  mis-paired deserialized entry. Separately, exhaustiveness is exact only for
  finitely-valued dimensions: a future dimension typed as unbounded `string` would
  collapse the inner mapped type into an index signature that an empty object
  satisfies. Every present dimension is a boolean or a literal union.
- **`cli/scripts/demo.mjs` still frames the conditional scripted-document write** as
  "a scenario that drives no attempt declares no scripted document" — the test
  `cli/AGENTS.md` was corrected away from — and it sits on the very code whose silence
  lets a dropped `scenario:` field produce a mis-reported `[PASS]`.
- **The demo timing guard is one-sided by design.** It pins only `afterMs` below the
  constant, as its acceptance criterion names, so dropping `afterMs` very low still
  passes the gate while the demo fails loudly at exit `1`. Its timed-step selection
  also requires exactly one such step, which a future second timed invocation in that
  scenario will trip — the safe direction, but it will need re-thinking then.
- **Smaller residues, recorded for accuracy.** `cli/AGENTS.md`'s `gitops/` layout line
  does not mention the temporary-workspace preflight; `state/checkpoint.test.ts` still
  uses the retired artifact sentence as an arbitrary `nextAction` fixture; a
  `resume.test.ts` case title still echoes the removed cursor field; the `workspaces`
  locals in `run.ts` and `resume.ts` read as a plural of the CLI's load-bearing
  `workspace`; a comment in `references.test.ts` is accurate for six of its eight
  table rows; the `malformed` plan phrase reads awkwardly and a row can repeat a
  clause both sides share; and `docs/glossary.md` attributes pipeline behavior to the
  pipeline *document*.
- **Some prescribed red-first orderings are unverifiable after the fact.** Several
  tasks asked that new expectations be observed failing before implementation. A
  single working tree carries no evidence of that intermediate state, so those
  orderings rest on report rather than on inspection. Where the plan asked instead for
  a *mutation* demonstration, the mutation was actually performed and the failure
  observed.

## Follow-ups

- Correct the harness-ID task's "both supported-ID diagnostics" wording in the plan.
  This is a plan fault; the shipped code is correct under the spec.
- Add a short install and build-verification note to `cli/README.md`, replacing what
  the checklist deletion removed.
- Give `cli/README.md` a user-facing statement of the temporary-workspace ignore
  requirement, so a user meets it before the refusal rather than through it.
- Route `composition.ts`'s `describeDimension` onto the artifact description table.
- Deduplicate `splitNul` within `cli/src/gitops/`.
- Restate the `cli/scripts/demo.mjs` comment as the driver's own rule.
- Extend `cli/AGENTS.md`'s `gitops/` layout line to name the temporary-workspace
  preflight.
