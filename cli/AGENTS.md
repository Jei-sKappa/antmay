# AGENTS.md — Antmay CLI

This file provides guidance to AI Agents working on the CLI under `cli/`. Paths
below are `cli/`-relative, and the npm scripts are meant to run from `cli/`.

## Update rule

This file is the memory for the CLI. While working under `cli/`, update this
file — not the root one, not the skill suite's — when:

- You make significant changes that needs to be remembered across session.
- You made a mistake that should not be repeated.
- The user told you a new rule that should be remembered.

A fact that holds for the skill suite too, or for the repository as a whole,
belongs in the root `AGENTS.md` instead. Every fact lives in exactly one of the
three files.

> Note: `CLAUDE.md` is a symlink to `AGENTS.md`.

## Antmay CLI

`antmay` is a strict, non-interactive command-line executor that drives the
Antmay method unattended. It runs a user-authored pipeline document stage by
stage against one selected thread through an agentic harness (Codex or Claude
Code), with durable checkpoints, workspace locking, and per-stage Git
boundaries. See `README.md` for the user-facing contract (document schemas, the
stage-support reference, lock recovery); this section is the map for agents
editing the code.

> **Platform support (v0):** macOS only. Linux/Windows behavior is incidental
> and undocumented.

### ⚠️ Pre-release: no backward-compatibility obligation

**The CLI is in active development and has no users.** The author is the only
person running it, on throwaway state they can delete at any time. Until it is
marked released and stable, nothing it writes to disk is a compatibility
surface, and no past version has to keep working.

So design each change for the shape the code should have now:

- **Redesign any schema, config key, or on-disk format outright.** Every schema
  sits at `schemaVersion: 0` and stays there while it is unstable. Renumber it
  only once the format actually settles.
- **Write no migrations, no compatibility shims, no deprecation windows.** An
  executor that reads a document it does not recognize reports that clearly and
  stops. That is the intended behavior, not a gap to fill.
- **Add required fields as required.** Never weaken a field to optional just so
  a previously written checkpoint still validates. Such a checkpoint is one
  `rm -rf` away and is worth nothing next to a type that states the truth.
- **Rename and remove freely.** Settings keys, fields, and state layout are all
  fair game.

Treat "but this might invalidate existing state" as a non-argument, and spend no
design budget on hypothetical users who do not exist. A change that makes
existing run directories unreadable is fine — say so plainly in the commit
message and move on. When this notice is removed, all of the above reverses at
once.

**This licenses redesign, never disrepair.** `npm run check` must pass on every
change: no failing tests, no type errors, no half-migrated code left behind, no
scenario left red. Freedom from old formats is not freedom from a working build.

This section covers the CLI only. The skills under `suite/skills/` **are** published
and installed by real users through `npx skills add`, so their formats and
behavior stay stable.

### Toolchain

- TypeScript, ESM, Node `>=22`. Bundled with `tsup`, tested with `vitest`.
- The sole runtime dependency is `@ai-hero/sandcastle`, which supplies the
  agentic harness invoker.
- Commands: `npm --prefix cli run check` (typecheck + test + build) is the full
  gate; `npm run build`, `npm run typecheck`, `npm run test` run the pieces.
  `npm run demo` builds without tests and executes one scripted scenario in a
  unique disposable repository under `/tmp`; `npm run demo:all` runs the whole
  scenario catalog and reports it as one verdict.
  The binary is `dist/main.js`, exposed as `antmay` via the `bin` field.

### Command surface

One top-level namespace, three subcommands:

- `antmay afk run <pipeline-ref> --thread <path> [--from <stage-id>] [--profile <profile-ref>] [--dangerously-skip-permissions]`
- `antmay afk resume <run-id>`
- `antmay afk list`

All usage/help/version strings are pure constants in `src/cli/help.ts` and must
never touch config, state, Git, or harnesses.

The surface is exactly these three subcommands. Stage discovery is documentation
(`README.md`), never a command, and the CLI provisions no configuration: it
creates no config root, no `settings.json`, and no pipeline or profile document.

### Execution model

- The **trusted catalog** (`src/pipeline/catalog.ts`) holds the nine stages the
  executor can run: `spec`, `reconcile-spec`, `review-spec`, `plan-brief`,
  `plan-strict`, `reconcile-plan`, `implement`, `implement-plan`, and
  `implement-plan-with-subagents`. Each entry is plain JSON — no functions — so
  a checkpoint persists it verbatim, and it owns everything safety-critical: the
  skill name the trigger renders from, the declarative **target rule**, the
  **artifact prerequisite** and promised **transition**, the three-part **Git
  policy** (`headMayChange`, `allowedChanges` selectors, `changeRequired`,
  `commitSubjectTemplate` with the literal `<thread-folder>` placeholder), and
  the **queue resolution** (`advance` vs `rerun`).
- A **pipeline document** is a user-authored JSON file: `schemaVersion`, a
  declared `name`, and an ordered `stages` array whose entries carry only a
  catalog `stage` ID and optional opaque `instructions`. An entry selects; it
  never defines. Widening what an entry may carry is what would let author text
  reach a contract the catalog owns, so unknown-field rejection in
  `pipeline/documents.ts` is load bearing.
- A pipeline automates the automatable core of a **recipe** — one of the three
  documented paths under `docs/recipes/`. The two are deliberately not 1:1, and
  `docs/glossary.md` owns how they differ. What binds the executor: a recipe
  guides and never governs, while a pipeline enforces Git boundaries and queue
  gates. Never call a pipeline a recipe.
- **Composition** (`pipeline/composition.ts`) walks the selected suffix against
  the thread's freshly inspected artifact state, checking each stage's
  prerequisite at its position, applying its promise for the stages after it, and
  resolving its concrete target from that simulated state. A refusal carries a
  structured dependency projection — the initial value, ordered earlier
  transitions, projected value, and requirement — which the terminal renderer
  explains without exposing the internal simulated-state vocabulary. A `--from`
  suffix credits nothing a skipped stage would have promised.
- **Local bindings** (`config/execution.ts`) supply the agent and timings the
  pipeline deliberately does not: one binding per selected stage, from the
  selected execution profile when it binds that stage and from `settings.json`
  otherwise. The whole binding comes from one document — fields never merge
  across the two — and only the intrinsic defaults fill an omitted timing.
- **One engine owns every durable transition.** A command's own work ends at
  allocation (`run`) or validated read-only preflight (`resume`); both then hand
  their starting cursor to `executeEngine` (`src/execution/engine.ts`) through a
  typed entry. Under the held lock the engine alone recovers an abandoned
  attempt, gates on queues and prerequisites, launches and settles attempts,
  checks promised artifact state, finalizes Git, builds and refreshes waiting
  state, advances stages, completes the run, and writes every checkpoint after
  the allocation write. Commands keep startup and preflight presentation, the
  signal-handler lifecycle, lock release, and the mapping of the engine's
  structured result to an exit code. The engine coordinates collaborators and
  reimplements none of them: Git sequencing, artifact contracts, runtime
  selection, terminal prose, and the pause decision table each stay with their
  owner.
- The engine rechecks the stage's prerequisite against fresh concrete state
  immediately before every attempt, and verifies the promised artifact state
  after a recognized `DONE`. That verification runs **before** the Git boundary,
  so a `DONE` implement attempt that left no `implementation-report.md` reports
  `stage-contract-violation` and never reaches boundary evaluation.
- Once the promise holds, the **Git boundary** (`src/gitops/boundary.ts`)
  validates that post-DONE changes fall within the stage's allowed selectors and
  produces the declared boundary commit. Each refusal carries a structured cause:
  unexpected attempt-owned `HEAD` movement is an advisory pause that one resume
  may accept, while out-of-bounds changes and an unresolvable selector are
  judged in every context and hold their blocking `git-policy-violation` pause
  until a human repairs them. An unmet `changeRequired` presents as the same
  blocking violation, but the rule is applied only to a fresh attempt: a
  finalization after a repaired contract or a boundary retry accepts an empty
  boundary, because the intended diff may already be committed deliberately
  there and the verified promise is the requirement that actually governs. This
  includes the implementation stages: the skill makes its own per-task code
  commits and leaves the thread's `implementation-report.md` uncommitted, and
  the stage boundary is what commits that report. One call finalizes a boundary
  in every context — a fresh attempt, first-time finalization after a repaired
  contract, or a retry after an earlier boundary or commit failure — and returns
  structured Git failures, so no caller sequences or catches status collection,
  evaluation, staging, commit, and the final `HEAD` read itself.
- **Pauses** surface as exit code `2` (waiting): when a queue gate finds pending
  work (e.g. a file under the thread's `.pending-decisions/`), the run
  checkpoints and prints the exact `antmay afk resume <run-id>` command.
- **A pause records what resume may do, separately from what it explains.** The
  ordered diagnostic reasons exist to explain everything observed at the pause;
  exactly one required recovery value decides the resume, and it is one of four —
  retry the stage, apply a finalized `DONE`'s recorded queue resolution, recheck a
  stage contract, or retry a Git boundary. Reading a recovery out of reason order
  or reason kind is what the split exists to prevent, so reordering or adding
  reasons never changes the action taken. Each attempt-referencing recovery
  names the final active `(stageIndex, attempt)` in the ordered history, and
  checkpoint validation rejects a reference the history does not bear out — an
  absent attempt, another stage, a stale earlier attempt, a non-`DONE` token, an
  incompatible result, or a queue resolution that is not the current stage's.
  The decision table
  (`src/execution/recovery-policy.ts`) turns a validated recovery plus fresh
  evidence into a directive and touches nothing: no filesystem, Git, clock,
  harness, or checkpoint. A Git-boundary retry re-inspects the saved `DONE`'s
  promised artifact first; an unmet or unreadable promise returns to contract
  repair without discarding that attempt. Refreshed diagnostics are rebuilt from
  current facts, and an unchanged waiting object is rendered without rewriting
  the checkpoint or restamping `updatedAt`.
- **Git evidence belongs to the attempt that produced it.** Every attempt
  records the `HEAD` it was launched from and, once settled, the `HEAD` its
  settlement left behind, so a boundary is judged across its own attempt's
  interval. A recovery that may finalize a boundary after a human worked across
  the pause carries the pause's own latest `HEAD` as well, which is what tells
  that movement apart from the attempt's. Engine-owned `HEAD` reads fail as
  structured refusals. If the post-attempt read fails, the checkpoint remains
  `executing`; a later resume settles it through abandoned-attempt recovery once
  Git is readable.
- **Resume reads only the checkpoint.** Every resolved value a run needs — both
  document identities and their source paths, the selected stages with their
  catalog definitions, resolved targets, instructions, and bindings — is
  snapshotted at allocation, so `resume` rereads no pipeline, profile, or
  settings document. Its preflight is read-only with respect to that checkpoint:
  it never branches on a recovery variant or reason kind, applies no worktree
  exemption of its own, and persists nothing. A `stage-contract-violation` pause
  or Git-boundary pause whose recovery preserves a saved `DONE` is exempt from
  the clean-worktree rule, because the repair or boundary diff it waits for is
  uncommitted.

### Module layout (`src/`)

- `main.ts` — minimal bootstrap: enforces the Node `>=22` guard, then
  dynamically imports `program.js` so nothing heavy loads before the guard.
- `program.ts` — parses argv and dispatches; each real subcommand handler
  dynamically imports its own dependencies on selection, keeping the
  pre-dispatch import graph light (help/version/usage errors load nothing).
- `cli/` — argument parsing (`parse.ts`), help text (`help.ts`), and the fixed
  exit codes (`exit-codes.ts`).
- `commands/` — the three subcommand implementations (`run`, `resume`, `list`).
- `config/` — root path resolution (`roots.ts`), syntax-directed pipeline/profile
  reference resolution (`references.ts`), and the local binding documents:
  settings and execution-profile loading plus per-stage binding resolution
  (`execution.ts`).
- `pipeline/` — the shared declarative types (`types.ts`), the trusted stage
  catalog (`catalog.ts`), pipeline-document loading and validation
  (`documents.ts`), suffix selection and artifact-state composition
  (`composition.ts`), and target-rule resolution (`targets.ts`).
- `execution/` — the run, as a loop over named phases.
  `engine.ts` is that loop and only that loop: it states the order — recover a
  resumed cursor, then per stage a signal at rest, the queue gate, the artifact
  prerequisite, the attempt's launch, its settlement — and reaches no
  collaborator itself. Each step is one module under `phases/`, driven from
  exactly one caller, so the order above is the only order there is; the
  resume-only recovery is the same shape under `entry/`. Both trees are guarded:
  a phase with a second caller, or a loop that imports a collaborator, fails
  `architecture.test.ts` rather than quietly making the sequence unreadable.
  Four modules carry what more than one phase needs and no phase owns —
  `context.ts` (what a command hands the engine, and the context every phase
  reads it through), `result.ts`, `observations.ts`, `attempts.ts`.
  `result.ts` is where an invocation ends: each of the five results is returned
  together with the terminal event it is only correct alongside, and the one
  `commitCursor` there is what turns a failed write into a fatal ending.
  `run-state.ts` is the run's durable cursor and the whole persistence boundary
  of a run in flight: every way a cursor can move is one named `Transition`,
  applied through one reducer, and committing them is the one place `updatedAt`
  is stamped, the one place the atomic writer is called after allocation, and the
  one place a pause the checkpoint already records is recognized as needing no
  write. Several transitions in one commit are one document, which is what keeps
  a settled attempt and the pause it settled into a single write. Three modules
  are pure. `recovery.ts` is the recovery vocabulary: one table, total over the
  recovery union, declares what fresh evidence each recovery kind is decided
  from, and a recovery reaches the decision already paired with exactly that
  evidence — so a new recovery kind fails to compile until it states what its
  decision rests on, and neither the resume that observes the world nor the table
  that decides it may test a kind for itself. `recovery-policy.ts` is that
  decision table, total over those pairs, so nothing can ask it to decide on
  evidence no one observed. `pause.ts` holds one builder per pause situation plus
  the field-by-field `waitingEquals` the durable-write decision rests on. A phase
  decides which situation holds and asks for the value; it assembles no waiting
  object and no checkpoint itself, so every pause the terminal can draw is
  enumerable from one file and every durable transition from another.
- `runner/` — attempt classification, signal handling, and the terminal-outcome
  protocol. `outcome.ts` is the sole declaration of the outcome tokens, the
  `Outcome: ` prefix, and the line they compose into, so moving the protocol
  cannot leave a hand-written copy watching for a string that never appears
  again. It is held to importing nothing, which is what lets the four domains
  that derive from it — `runner/`, `state/`, `harness/`, `execution/` — depend
  on a module in one of them without a cycle.
- `gitops/` — the Git wrapper and its NUL-output splitter (`git.ts`),
  working-tree status (`status.ts`), the temporary-workspace ignore and
  tracked-content preflight (`temporary-workspaces.ts`), and the one
  Git-boundary finalization operation (`boundary.ts`).
- `harness/` — the provider-neutral request, event, and outcome boundary
  (`types.ts`), prompt assembly, and the lazy runtime resolver (`runtime.ts`),
  over two independent axes. **What a harness is** lives in `provider.ts` (the
  `AgentHarness` face) and `providers/`, one file per harness plus the
  `HARNESSES` record that is total over `HarnessId`; a harness declares only
  SDK-free facts, so the engine reaches one statically without loading an
  adapter. **How a harness is driven** lives in the two adapter families — the
  real one under `backends/` (the Sandcastle adapter and the executable probe)
  and the developer scripted one under `scripted/` — which the resolver pairs
  and loads one of. Availability belongs to the family rather than the harness,
  because the scripted family establishes it without contacting anything. Across
  both axes, **which harnesses exist** is `id.ts`: the id union, the ids
  themselves, and the one predicate that narrows an untrusted value into the
  union. The settings parser and checkpoint validation reach it rather than
  `provider.ts`, so a module needing only which ids exist does not depend on the
  declaration of what a harness is, and the widening an untrusted test needs
  stays inside the predicate.
- `state/` — durable run state: the checkpoint, split three ways under
  `checkpoint/` — the declarations every consumer is written in terms of
  (`types.ts`), the exhaustive validator of an untrusted document
  (`validate.ts`), and the load of one run's `state.json` from disk (`read.ts`) —
  plus the atomic writer (`persist.ts`), logs, run records, and the exclusive
  workspace lock. No barrel spans the three: a consumer imports the one it
  needs, so its import list says whether it loads a checkpoint, validates one,
  or only names the shape. Loading is deliberately apart from writing, which is what
  leaves a read-only consumer unable to reach a writer through the module it
  reads from.
- `thread/` — thread resolution, queue gates, and the artifact domain
  (`artifacts.ts`): the canonical owner of artifact-state vocabulary, the
  validators that accept it as untrusted serialized data, filesystem inspection,
  prerequisite and promise matching, simulated transition application, and the
  plain-language descriptions display renders. The catalog, composition,
  checkpoint validation, the engine, and display all depend on it, and it depends
  on nothing but the domain-free primitives in `shared/` — the direction that
  keeps a second dimension list from ever existing.
- `workspace/` — current-checkout detection.
- `display/` — the curated terminal stream, one module per phase: shared
  painting and formatting primitives (`format.ts`), run listing (`list.ts`),
  structured preflight refusals (`preflight.ts`), startup and developer
  diagnostics (`startup.ts`), and execution lifecycle output (`execution.ts`)
  behind the narrow `ExecutionDisplay` interface (`types.ts`) the engine sees.
  `terminal.ts` re-exports all of them for a reader or test that spans phases.
- `shared/` — low-level validation primitives with no domain knowledge, used by
  more than one module: `validation.ts` holds the plain-object guard every
  document validator narrows parsed JSON with. Only a primitive that answers a
  question about a raw value belongs here; anything that knows about stages,
  threads, checkpoints, or configuration lives in the module that owns it.
- `test-helpers/` — a fake harness and Git fixtures for the co-located `*.test.ts`.
- `scripts/demo.mjs` + `scripts/demo/` + `scripts/scenarios/` —
  dependency-free developer demo: a generic driver, its step/fixture/pipeline
  helpers, and one self-contained file per scenario, driving a selected scripted
  scenario through a unique `/tmp` repository.

### Test suite shape

The suite drives real `git` subprocesses and real fsynced checkpoints, which
dominates its runtime on macOS. Two conventions keep it fast; both are load
bearing.

- `createRepoFixture` returns a **filesystem copy of a cached template
  repository**, built once per distinct set of fixture options. Do not
  reintroduce a per-test `init`/`config`/`add`/`commit` path — that was ~400 ms
  of subprocess time per test case.
- `commands/resume.test.ts`, `commands/run.test.ts`, and
  `execution/engine.test.ts` declare their suites with **`describe.concurrent`**,
  so their cases overlap. Each case owns an independent repository, config root,
  and state root, and every temporary resource is collected in a module-level
  array released by a single `afterAll`. In these files, teardown must never run
  between cases: an `afterEach` hook would delete a repository a still-running
  case is using, and `onTestFinished` is unusable because Vitest 2 attributes it
  to the wrong test when cases run concurrently. Any new case in these files
  allocates through the existing helpers and registers no teardown of its own.
- `testTimeout`/`hookTimeout` in `vitest.config.ts` are deliberately generous.
  A Git-backed case needs seconds of wall clock under concurrent load; the
  budget exists so contention alone never fails a test.

### Contracts to preserve

- **Exit codes** are fixed in `src/cli/exit-codes.ts` and must not be
  repurposed: `0` ok, `1` failure, `2` waiting/paused, `130`/`143`/`129` for
  SIGINT/SIGTERM/SIGHUP.
- **`VERSION` in `src/cli/help.ts` is kept in sync by hand** with the `version`
  field in `cli/package.json` — bump both together.
- **The dynamic-import discipline is deliberate**, not incidental: keep the
  Node guard, dispatch, and per-command dependency loading lazy so help,
  version, and grammar errors stay cheap.
- **`src/architecture.test.ts` enforces the dependency directions** the modules
  above are built on: one checkpoint writer outside allocation, a checkpoint
  vocabulary holding nothing but type declarations, a resume preflight that
  reaches no transition collaborator, the terminal-outcome protocol spelled out
  nowhere but the leaf module that declares it, the Git protocol behind its one
  operation, artifact contracts declared only in the thread domain, pauses
  assembled in one module and compared field by field, each recovery kind's
  declared evidence read from one table rather than tested for by comparison,
  durable state changed only by committing a named transition, one caller per
  execution phase and one module that ends an invocation, phase-specific display
  consumers, and adapter families loaded only through the runtime resolver. It
  reads source
  text, so a static, dynamic, re-export, or type-only import is judged for what
  it is. When it fails, the boundary moved — argue the direction, do not relax
  the guard to match the new import.
- **The workspace lock is never reclaimed automatically.** Do not add logic
  that silently removes another executor's lock.
- **Every distinct terminal rendering has a demo scenario.** Give the terminal
  something new to draw and you add or extend one in the same change — see
  "Scenarios are the executable UI contract" below.
- **Multiline operational diagnostics belong to `display/`.** Domain modules
  return structured facts, and commands add the run or resume context before
  calling the renderer for their own phase; the engine emits lifecycle events
  through the narrow `ExecutionDisplay` seam and assembles no prose itself. A
  short single-line diagnostic may remain a message, but never assemble a
  paragraph/list/command wall in a checker and pass it through a command's
  generic failure printer.
- **Artifact-prerequisite diagnostics form one interface across execution
  phases.** Both a composition refusal and a runtime recheck identify the
  affected stage, show the concrete thread files found and required, explain
  why the requirement is not satisfied, and state the result. Preflight reports
  that no stages ran; runtime reports that the affected stage did not run,
  marks the pipeline as paused there, and closes with recovery and resume
  instructions.

### Scripted test harness (developer-only)

Scripted mode is gated exclusively by the environment variable
`ANTMAY_TEST_ENABLE_SCRIPTED_HARNESS`. Only the exact string `1` enables it;
unset or empty preserves ordinary real-harness behavior; every other non-empty
value is a configuration error that must not fall through to a real harness.

When enabled, a new `run` and a scripted run's `resume` read the live scenario
from `<resolved-config-root>/scripted-harness.json` (fixed filename; never
created by the CLI). The scenario is validated once per command against the
selected or snapshotted stage IDs and reread on every resume — never copied into
the checkpoint.

`run` and `resume` resolve their runtime through one resolver, which loads
exactly one adapter family and keeps its invoker paired with that same family's
executable probe — no caller can pair a provider with another provider's
availability check, and selecting one family never evaluates the other. Logical
stage profiles (Codex / Claude Code harness id and configured model) stay
unchanged in settings, snapshots, prompts, and attempt headers; only the provider
contact is bypassed.

The runtime a run contacts is fixed at allocation, recorded in its checkpoint,
and immutable for the run's whole life. Resume is fail-closed in both
directions: a scripted run continues only while the toggle is exactly `1`, a
real run refuses to be switched to the scripted harness, and either refusal
lands before probe, lock acquisition, or any mutation. Scripted resume still
requires a valid live scenario even on queue/boundary paths that make no harness
call.

Built-in scripted cases only — no arbitrary code, shell commands, or
scenario-supplied operations outside the fixed case and effect catalog in
`harness/scripted/cases.ts`, which the provider-facing adapter
(`harness/scripted/invoker.ts`) is the only caller of. Help, version, grammar
errors, and `list` never interpret the toggle or touch scenario/state/Git/harness
modules.

Scripted output imitates an ordinary attempt rather than announcing itself:
progress lines stream through the invoker's event seam so the terminal renders
them like real agent output, and each describes only filesystem work the case
genuinely performs. Nothing written to the terminal or the attempt log fabricates
provider JSON, a sandbox, a branch, or a timing. The one announcement is a single
dim line ahead of the run details block.

Most cases end by reporting the final message carrying the terminal outcome line.
A case may instead end without a result: a failure the adapter normalizes into an
`idle-timeout` or `provider-error` outcome, or a wait that settles only when the
attempt is aborted — the seam that lets a signal land mid-attempt. That wait
holds a referenced timer open, because an abort listener alone keeps nothing
alive and the process would otherwise drain its event loop and exit before any
signal arrived.

Every launched scripted attempt reports a deterministic synthetic session ID on
every path a real capture would take. Its shape is deliberately
non-provider-like, which is what lets the demo cover the pause `Continue` line
and the list's `Latest session` field with no real harness and no per-scenario
session setup.

The demo driver is generic and holds no scenario-specific knowledge: it builds
the CLI, stands up the fixture, executes the scenario's ordered steps, and checks
each invocation against the exit code and the output that step declares. Anything
a single scenario needs — a rejecting Git hook, an unreadable queue, a revoked
permission, a hook that changes the world while a child is live — belongs in that
scenario's own file, never in the driver. A
scenario needing different executor configuration declares its own pipeline,
profile, or per-stage binding overrides rather than reaching for a demo-only
hook, so the demo exercises the same path a user would.

Two rules about a scenario's scripted document are not apparent from a scenario
that happens to work. A scenario that invokes `run` or `resume` declares one even
when it stops before any attempt launches, because the document is loaded and
validated in preflight, ahead of the checks such a scenario ends on; a
`list`-only scenario declares none and is given no scripted-harness file. And the
document is keyed by exactly the stage IDs the run selects, which is what the
executor validates it against, so a `--from` suffix scenario names only its
suffix.

Most scenarios reach their rendering by running the executor. A rendering that
draws an aggregate over many runs cannot be reached that way — one invocation
produces one run, and conditions like `ready` survive only microseconds between
two checkpoint writes — so such a scenario seeds checkpoints into `ctx.stateRoot`
from an `action` instead. Seed from one shape with per-row overrides, so a schema
change is one edit rather than one per row, and require the exit code the command
returns when every checkpoint is valid: the executor validates each one it reads
and fails on an invalid document, which is what stops a seeded fixture from
quietly drifting away from the schema it imitates.

Discovery is automatic: a scenario's id is its filename stem under
`scripts/scenarios/`, so a new scenario is a new file and nothing else. The
zero-padded prefix each id carries (`13-refused`) is what puts the catalog in
reading order everywhere it appears — on disk, in `--list`, and in the prompt —
rather than in the alphabetical order the names alone would give. Run
`npm run demo -- --list` to read the catalog.

Each demo run allocates a unique `/tmp` directory holding an isolated config
root, an isolated state root, and the disposable repository, and injects
`ANTMAY_CONFIG_HOME`, `ANTMAY_STATE_HOME`, and the scripted toggle only into the
child CLI processes. That config root is built from scratch out of the same
production-schema documents a user writes, so the demo depends on no
configuration of the developer's: nothing under their real config or state root
is read or written. Everything temporary is preserved for inspection.

### Scenarios are the executable UI contract

Real-harness runs cost time and money, so the scenario catalog is the developer
end-to-end suite for Antmay's terminal interface. A scenario drives the built CLI
through its public command surface against isolated configuration, state, and
repository fixtures, using the scripted harness whenever execution reaches an
agent.

Every change that introduces or modifies user-visible terminal output must be
exercised by a scenario that reaches that output. This applies to every command
and execution phase, including startup, success, pauses, failures, warnings,
preflight refusals, and listings. Output length, rarity, and whether an agent was
invoked do not affect the requirement. When an existing scenario already
exercises the changed rendering, run it; nothing needs editing.

A supported rendering without a scenario is a UI coverage gap: developers
cannot readily discover, run, or review an interface the CLI claims to support.
Close such a gap by adding a scenario or by removing or consolidating the
distinct rendering.

Use one scenario for each distinct visual or explanatory state. Outputs that
differ only in interpolated values may share a scenario; outputs with different
sections, ordering, causal explanations, corrections, wrapping-sensitive
content, or interaction paths require separate scenarios. Then:

- **If an existing scenario already covers it, run that scenario and change
  nothing.**
- **If an existing scenario nearly covers it, extend that one.** Two scenarios
  that end on renderings a reader cannot tell apart are one scenario too many.
- **Otherwise add a file**, and give it a number that places it where it belongs
  in the reading order — routine before rare, and after anything it builds on.
  Renumbering neighbours to open a slot is expected and costs nothing; appending
  to the end merely to dodge that is what puts the catalog back in arbitrary
  order.
- **Keep the scenario at one visual state.** It stops as soon as it has shown
  what it exists to show, so that thing is the last output on screen and needs no
  scrolling to find. Add a `note` if its shape needs explaining, such as needing
  a second invocation.
- **Keep the scenario's own `label` accurate**, naming the state it exists to
  show. That label is the catalog: `--list` and the selection prompt render every
  row from it, so no document repeats them. Then run the affected scenario to
  confirm the exit code and the required output it declares.

Run the scenario with `--no-color` as well whenever the rendering leans on color,
to confirm it still reads when color carries nothing. Markers are matched with
ANSI escapes stripped, so a colored and an uncolored run assert the same thing.

**A scenario asserts the rendering it reaches.** Each invocation declares the
output that identifies that rendering next to the exit code it must produce,
because the code alone identifies no screen: every pause exits `2` and every
preflight refusal exits `1`. What identifies a rendering is the *conjunction* of a
scenario's markers, so pair the banner with the line that separates this scenario
from its neighbours — `BLOCKED` alone appears in most transcripts. A marker list is
required where the step is constructed, and two scenarios declaring the same
plain-string set are refused before anything runs, so a declaration can decay
neither by omission nor into a banner every neighbour shares. What a marker may be
lives in `scripts/demo/markers.mjs`.

What a scenario does not assert is exactness. Unit tests keep exact terminal text
and edge cases, and behavior with no visible output at all belongs to the
`*.test.ts` suite alone: a marker claims that a rendering was reached, never that
every character of it is right. `npm run demo` and `npm run demo:all` sit outside
the CLI grammar and outside `npm run check`, so neither substitutes for running
the built CLI and reading its interface yourself.

### What only a real harness proves

Every harness under test is fake: the `*.test.ts` suite drives a fake invoker and
the demo drives the scripted one, so no gate ever contacts Codex or Claude Code.
Four properties therefore rest on construction alone, and only a human driving
the built binary against real provider credentials in a throwaway repository can
establish them: that a stage attempt launches a real session on the harness its
binding names; that the curated live terminal stream agrees with the verbose
attempt log written for the same attempt; that a genuine `DONE` produces the
stage's declared boundary commit over the real worktree; and that native session
capture supports out-of-band continuation, the printed `codex resume` or
`claude --resume` command reopening the very conversation the attempt held. Nobody
runs that by hand periodically and no schedule asks anyone to — it is a standing
gap, worth spending a disposable repository on when a change reaches one of those
four paths.

## Engineering philosophy

### Principles

These principles guide all implementation decisions in this project:

- **Law of Demeter**: A module should know as little as possible about the internal structure of other modules. Reduce coupling.
- **Principle of Least Astonishment**: Code should behave in a way other developers would reasonably expect.
- **Separation of Concerns**: Split a system into distinct parts, each handling a specific concern.
- **Premature Optimization is the Root of All Evil**: Optimize only when there is evidence it matters. Readability and correctness come first.
- **Defensive Programming**: Assume inputs, dependencies, and environments may fail or misbehave. Validate and safeguard at system boundaries.
- **Design for Testability**: Structure code so it is easy to verify automatically. Testable code tends to be more modular and loosely coupled.
- **DRY**: Avoid duplication. Code that repeats itself is harder to maintain.
- **YAGNI**: Do not build application features until they are actually needed.

### Structure is a deliverable

Working code is half of what a change delivers. The other half is a shape the
next change can land in safely, because most of a system's life is spent being
modified by someone who was not there when it was written.

In the core of a system — the modules that carry its central workflow, that
every feature change touches, and that a mistake in is expensive — a seam is
justified by extensibility alone, before there is a second implementation to
justify it. The point of the seam is that adding the second one is a new file
rather than a hunt through an old one.

- **One file states one purpose.** A function long enough to need internal
  section comments is a set of collaborators that has not been named yet.
- **Prefer a closed set of cases with exhaustive matching** over a boolean, a
  bare string, or a chain of conditionals. Adding a case should fail to build,
  never fail at runtime.
- **Prefer polymorphism, or a lookup keyed by identity, over branching on that
  identity.** The same branch appearing in more than one module means the
  abstraction it implies is missing.
- **Make a state change a value rather than an assignment.** A transition that
  can be named, passed, and inspected is one that can be tested; the same
  transition buried in a long procedure is not.
- **Make illegal states unrepresentable** where the type system allows it, in
  preference to validating them after they have been constructed.

Two limits keep this from becoming its own failure mode. It licenses no
speculative capability: a feature, option, or configuration nobody asked for is
still YAGNI, and this is about the shape of code that already exists rather than
about how much of it there is. And a seam with no plausible second
implementation, sitting outside that core, is decoration — indirection that
costs a reader a jump and returns nothing.

When these goals genuinely conflict with delivering the change at hand, say so
and name the trade-off rather than silently resolving it in either direction.
