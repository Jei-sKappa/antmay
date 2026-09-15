# User-composable AFK pipelines

## Intended outcome

`antmay afk run` executes a user-selected, ordered sequence of trusted Antmay
stages instead of relying on an executor-bundled runnable pipeline. A user can
load a portable pipeline document by config-root name or explicit path, enter
that pipeline at a named stage, and optionally select a local execution profile.
Before any run is allocated, the CLI proves that the selected stages can execute
from the thread's current artifact state and that every stage has a complete
local agent binding. During execution it enforces the same artifact contracts at
each stage boundary, so configuration and filesystem drift pause safely instead
of launching the wrong skill or advancing past missing output.

The result gives users control over entry point, ordering, omission, and
execution policy while keeping skill selection, targets, Git boundaries, queue
handling, prerequisites, and outputs inside a trusted CLI-owned catalog (per
`decisions.md` DR1).

## Context

The linked CLI ticket was opened because every run currently selects one fixed
Standard sequence and begins at its first stage. That makes already-completed
work repeat and leaves no supported way to construct a shorter, reordered, or
otherwise purpose-shaped unattended run. The desired capability is control over
the executed stage sequence, not a second inline composition language or a way
to configure safety-sensitive stage behavior.

Pipeline structure is portable intent, while harness choice, model choice, and
operational timing are local policy. The design therefore gives pipeline
documents and execution profiles symmetric reference forms but keeps their
contents separate (per `decisions.md` DR2 and DR4).

## Scope

This work includes:

- a trusted catalog for the nine initially supported stage IDs;
- strict external JSON documents for runnable pipelines;
- required pipeline-reference resolution by config-root name or explicit path;
- optional `--from <stage-id>` suffix selection;
- optional execution-profile resolution by config-root name or explicit path;
- per-stage local bindings in optional `settings.json`, with no catch-all;
- strict pipeline, profile, and settings validation;
- bounded inspection and simulation of thread artifact state;
- state-resolved targeting for `plan-brief`;
- checkpoint snapshots of the selected executable stages and all resolved local
  execution data;
- a non-interactive startup summary of the fully resolved execution;
- concrete prerequisite and postcondition checks at runtime, including
  deterministic resume behavior after a stage-contract violation;
- CLI help, README examples, the complete skill support/prerequisite matrix,
  repository maintenance guidance, automated coverage, and demo coverage for
  new terminal renderings.

The initial catalog contains exactly `spec`, `reconcile-spec`, `review-spec`,
`plan-brief`, `plan-strict`, `reconcile-plan`, `implement`,
`implement-plan`, and `implement-plan-with-subagents` (per `decisions.md` DR9).

This work does not include:

- user-defined skills, targets, prerequisites, outputs, Git policies, queue
  policies, or other catalog overrides;
- a bundled runnable pipeline document;
- automatic pipeline provisioning, an initialization command, or an
  installation hook;
- inline arbitrary omission, insertion, or reordering flags beyond `--from`;
- an `antmay afk stages` discovery command;
- unattended proposal or Roadmap stages in this release;
- semantic assessment of freeform Markdown, decision sufficiency, strict-plan
  index/task consistency, or artifact quality beyond the bounded structural
  rules in this spec;
- changes to the invoked suite skills or to the suite/CLI terminal-outcome
  protocol;
- changes to the behavior of `antmay afk list` or the user-facing purpose of
  `antmay afk resume`, except where their checkpoint reads must understand the
  new snapshot.

The exclusions for provisioning, a bundled pipeline, and inline composition
follow `decisions.md` DR3 and DR4. Stage discovery remains documentation-only
per `decisions.md` DR14. Proposal and Roadmap capabilities are planned rather
than catalog stages per `decisions.md` DR9.

## Expected behavior

### Pipeline and profile references

The run grammar is:

```text
antmay afk run <pipeline-ref> --thread <path> [--from <stage-id>] [--profile <profile-ref>] [--dangerously-skip-permissions]
```

`<pipeline-ref>` is required. `<profile-ref>` is optional. Both use the same
syntax-directed resolution rules (per `decisions.md` DR4):

| Reference shape | Pipeline resolution | Profile resolution |
| --- | --- | --- |
| bare name matching the shared name grammar | `<config-root>/pipelines/<name>.json` | `<config-root>/profiles/<name>.json` |
| relative reference with an explicit directory component | path relative to the invocation working directory | path relative to the invocation working directory |
| absolute path | that absolute path | that absolute path |
| bare filename such as `standard.json` | invalid; direct the user to `standard` or `./standard.json` | invalid; direct the user to the equivalent name or explicit path |

The shared pipeline and profile name grammar is
`^[a-z0-9]+(?:-[a-z0-9]+)*$` (per `decisions.md` DR16). Validation applies to
the raw string with no trimming, case folding, Unicode normalization, or other
rewriting. Lowercase ASCII letters and digits are allowed within segments,
including at the beginning; single hyphens separate non-empty segments.
Uppercase or non-ASCII characters, whitespace, underscores, and leading,
trailing, or repeated hyphens are invalid.

Resolution is determined only by syntax. A missing explicit path does not fall
back to config-root name lookup, and a missing named document does not search
the working directory. The declared document name is its display identity and
need not match its filename, but it must satisfy the same shared name grammar.
An explicit path remains a path regardless of its filename. Its resolved path
is separate source provenance.

No runnable pipeline is compiled into the executor. A run always loads its
required pipeline document through this path. The trusted stage catalog remains
compiled into the CLI (per `decisions.md` DR4).

### Pipeline document

A pipeline is a strict JSON object with exactly this schema:

```json
{
  "schemaVersion": 0,
  "name": "standard",
  "stages": [
    {
      "stage": "spec",
      "instructions": "Optional portable instructions for this stage."
    }
  ]
}
```

- `schemaVersion` is required and must equal `0`.
- `name` is required and its raw value must match the shared name grammar.
- `stages` is required and non-empty.
- Each stage entry is an object with required `stage` and optional
  `instructions`; there is no string shorthand.
- `stage` must name a catalog stage and may occur only once in one pipeline.
- `instructions`, when present, is a non-empty string.
- Unknown root fields and unknown stage-entry fields are validation errors.
- There are no pipeline-wide instructions.
- Harnesses, models, idle timeouts, heartbeat intervals, prompts, targets, Git
  policies, queue policies, prerequisites, and output contracts are not
  pipeline fields.

These requirements are the one canonical representation defined by
`decisions.md` DR7. At invocation time, stage instructions are appended after
the catalog-owned skill trigger and concrete target. They are opaque to the CLI
and cannot change catalog behavior.

### Trusted stage catalog

Every catalog entry is a serializable definition of one completion-oriented
skill adapter with a catalog-owned, deterministic target rule. It owns the skill
name, target rule, artifact prerequisite, promised state transition, Git policy,
queue resolution, and base prompt. Pipeline documents select and order entries;
they never copy or alter these fields (per `decisions.md` DR1).

The catalog's artifact contracts and targets are:

| Stage ID | Invocation target | Prerequisite | Promised state after `DONE` |
| --- | --- | --- | --- |
| `spec` | thread root | valid thread | `spec.md` present |
| `reconcile-spec` | `spec.md` | spec present | spec present |
| `review-spec` | `spec.md` | spec present | spec present |
| `plan-brief` | `spec.md` when spec is present in the simulated state; otherwise thread root | valid thread | plan state `brief` |
| `plan-strict` | `spec.md` | spec present | plan state `strict` |
| `reconcile-plan` | `plan.md` | spec present and plan state `strict` | plan state `strict` |
| `implement` | `plan.md` | plan state `brief` | implementation report present |
| `implement-plan` | `plan.md` | plan state `strict` | implementation report present |
| `implement-plan-with-subagents` | `plan.md` | plan state `strict` | implementation report present |

The prerequisite and target rules follow `decisions.md` DR10. In particular:

- `spec` does not require a proposal or a non-empty set of decision records.
- `plan-brief` may begin with an absent, brief, or strict plan. If a strict plan
  is present, replacement authorization may be supplied through its stage
  instructions; the skill, not the CLI, interprets and enforces that
  authorization.
- `plan-brief` is targeted from the simulated state after preceding selected
  transitions, so `spec` followed by `plan-brief` targets `spec.md`.
- `reconcile-plan` requires both its strict-plan target and the governing spec.
- The CLI checks structural prerequisites only. Each skill remains responsible
  for deciding whether its input content is sufficient.

The fixed Git and queue policies retain the existing stage-class boundaries:

| Stage ID | `HEAD` may move | Allowed post-`DONE` tracked changes | Change required | Executor boundary subject | Queue resolution |
| --- | --- | --- | --- | --- | --- |
| `spec` | no | `spec.md` | yes | `docs(<thread-folder>): spec` | advance |
| `reconcile-spec` | no | `spec.md` | no | `docs(<thread-folder>): reconcile spec` when changed | rerun |
| `review-spec` | no | none | no | none | rerun |
| `plan-brief` | no | `plan.md`, `plan-tasks/` subtree | yes | `docs(<thread-folder>): plan` | advance |
| `plan-strict` | no | `plan.md`, `plan-tasks/` subtree | yes | `docs(<thread-folder>): plan` | advance |
| `reconcile-plan` | no | `plan.md`, `plan-tasks/` subtree | no | `docs(<thread-folder>): reconcile plan` when changed | rerun |
| `implement` | yes | `implementation-report.md` | yes | `docs(<thread-folder>): implementation report` | rerun |
| `implement-plan` | yes | `implementation-report.md` | yes | `docs(<thread-folder>): implementation report` | rerun |
| `implement-plan-with-subagents` | yes | `implementation-report.md` | yes | `docs(<thread-folder>): implementation report` | rerun |

For `plan-brief`, allowing the `plan-tasks/` subtree includes removal of obsolete
strict-plan tasks after the skill has accepted explicit replacement
authorization. For the three implementation stages, `HEAD` movement consists
of skill-owned implementation commits; the report is the only tracked change
left for the executor boundary.

The catalog keeps these policies static and bounded; a pipeline or profile
document cannot widen them. This applies the eligibility boundary from
`decisions.md` DR6 and the release catalog chosen in DR9.

### Artifact-state model

The preflight and runtime boundary engine use one declarative, serializable
artifact-state model with at least these dimensions (per `decisions.md` DR5):

- valid active thread;
- proposal absent or present;
- spec absent or present;
- plan `absent`, `brief`, `strict`, or `malformed`;
- implementation report absent or present.

For presence dimensions, only a non-empty regular artifact file counts as
present. The CLI does not parse prose or decide whether a file is semantically
adequate.

Plan state is recognized exactly as follows (per `decisions.md` DR13):

| State | Structural rule |
| --- | --- |
| `absent` | neither `plan.md` nor `plan-tasks/` exists |
| `brief` | `plan.md` is a non-empty regular file and `plan-tasks/` is absent |
| `strict` | `plan.md` is a non-empty regular file and `plan-tasks/` is a directory containing at least one non-empty regular Markdown task file |
| `malformed` | every other combination, including inspection failure |

`malformed` therefore includes task storage without an index, an empty or
non-regular index, a non-directory `plan-tasks` path, and a task directory with
no recognizable non-empty Markdown task. When a selected stage's validation or
target resolution depends on plan state, `malformed` refuses preflight.

The CLI does not parse the strict index's task list, verify ordinals or
cross-file references, inspect decision-record count, require `proposal.md`, or
judge any artifact's semantic consistency. Those checks remain with the
catalogued skills.

### Suffix selection and composition validation

The CLI strictly validates the complete source pipeline document before
applying `--from` (per `decisions.md` DR3). With no `--from`, all document stages
are selected. With `--from <stage-id>`, the named stage is included along with
every later stage, in document order. An unknown stage ID refuses before run
allocation.

The selected suffix is the executable run:

- only selected stages are snapshotted and assigned run positions;
- skipped stages are not recorded as completed;
- the pipeline's declared identity and resolved source provenance remain
  available for display;
- simulated state begins with a fresh concrete inspection of the selected
  thread;
- outputs promised by skipped stages receive no credit;
- each selected stage checks its prerequisite against the current simulated
  state, then applies its promised transition for the next stage;
- unrelated state dimensions remain unchanged by a transition;
- the first impossible composition refuses with a diagnostic naming the stage,
  its required state, the observed or simulated state, and relevant preceding
  selected stages.

This allows a later stage to start when its prerequisite already exists in the
thread and rejects the same entry point when it does not. It also rejects
incompatible compositions such as `plan-brief` followed by either strict-plan
implementation stage, while accepting a strict-plan implementation stage when
a strict plan already exists or is promised by an earlier selected
`plan-strict` stage (per `decisions.md` DR5).

All document, reference, thread, artifact-state, target, binding, harness,
worktree, queue, and unfinished-run checks complete before run allocation.
Workspace-lock acquisition and the under-lock queue recheck remain part of
allocation. A preflight or allocation refusal creates no run directory or
checkpoint.

### Local stage bindings and execution profiles

Pipeline documents remain portable by containing no local agent or timing
selection. Local execution data comes from an optional selected profile and an
optional settings file (per `decisions.md` DR2 and DR8).

`<config-root>/settings.json` is optional. A missing file behaves as an empty
stage map. When present, it is a strict object with exactly one required root
field, `afk`; `afk` is a strict object with exactly one required field,
`stages`; and `stages` is an object that may be empty (per `decisions.md`
DR17). Consequently, `{}` and `{"afk": {}}` are invalid, while
`{"afk": {"stages": {}}}` is a valid empty settings document.

Non-empty `afk.stages.<stage-id>` entries use this binding shape:

```json
{
  "afk": {
    "stages": {
      "spec": {
        "agent": {
          "harness": "codex",
          "model": "gpt-5.6-sol"
        },
        "idleTimeoutSeconds": 86400,
        "heartbeatSeconds": 300
      }
    }
  }
}
```

There is no `afk.defaults`. A named or explicitly pathed execution-profile
document is strict JSON with this shape:

```json
{
  "schemaVersion": 0,
  "name": "maximum-quality",
  "stages": {
    "spec": {
      "agent": {
        "harness": "codex",
        "model": "gpt-5.6-sol"
      },
      "idleTimeoutSeconds": 86400,
      "heartbeatSeconds": 300
    }
  }
}
```

Profile `schemaVersion` must equal `0`, the raw `name` must match the shared
name grammar, and `stages` is a non-empty object. Settings and profiles share
one stage-binding schema:

- `agent` is required, contains required `harness` and required non-empty
  `model`, and permits no other fields;
- `harness` must be a CLI-supported harness;
- optional `idleTimeoutSeconds` and `heartbeatSeconds` are positive integers;
- omitted timing fields resolve to intrinsic defaults of 86,400 and 300 seconds
  respectively;
- prompt and instructions fields are forbidden;
- unknown fields are rejected at every document, container, and binding level.

Settings and profiles may contain unused supported catalog stage IDs so one
document can be reused across pipelines. Any unknown catalog stage ID
invalidates the containing document.

For each selected stage, the entire profile binding is used when the selected
profile has that stage; otherwise the entire settings binding is used. Fields
never merge across the two sources. Harness and model therefore remain an
atomic pair. If neither source supplies a complete binding for any selected
stage, preflight refuses before run allocation. A complete selected profile can
run without a settings file (per `decisions.md` DR8).

### Snapshot, startup display, and resume

The checkpoint snapshots only the selected executable stages. Each snapshot
contains the catalog-owned descriptor, promised artifact contract, resolved
repository-relative target, portable stage instructions, and fully resolved
local binding. The run also retains the pipeline's declared name and resolved
source provenance, the selected profile's declared name and resolved source
provenance or `settings only`, and the `--from` entry point when present.

Resume uses these snapshots. It does not reread the pipeline document,
execution-profile document, or settings file and is unaffected by later edits
to them (per `decisions.md` DR2, DR3, and DR4).

After preflight succeeds and before the first agent attempt launches, the CLI
prints an informational startup summary containing:

- pipeline declared name and resolved source;
- selected execution-profile declared name and resolved source, or
  `settings only`;
- the `--from` stage when present;
- every selected stage in execution order, with its resolved harness, model,
  and concrete repository-relative target.

The summary never asks for confirmation, preserving unattended execution (per
`decisions.md` DR11).

### Runtime contract enforcement and recovery

Immediately before each stage attempt, the executor re-inspects concrete
artifact state and verifies the stage prerequisite. If it is unmet, the run
pauses on that stage before invoking an agent and reports the required and
observed state (per `decisions.md` DR15).

After a recognized `DONE`, the executor re-inspects artifact state and verifies
the stage's promised postcondition before applying the Git boundary, committing,
or advancing. An unmet postcondition pauses on the same stage with a
`stage-contract-violation` that reports expected and observed state.

Resume handles these pauses deterministically:

- a prerequisite pause is rechecked and launches the stage once its
  prerequisite is restored;
- a postcondition pause whose output was repaired proceeds directly to the
  saved stage's Git finalization without invoking the agent again;
- a still-unsatisfied postcondition with a clean worktree launches a fresh
  attempt of the same stage;
- a still-unsatisfied postcondition with a dirty worktree remains paused and
  instructs the user to repair or revert those changes.

Existing safety behavior remains binding: a run stays non-interactive; queue
gates, clean-worktree preflight, workspace locking, catalog Git boundaries,
terminal-outcome classification, durable pause exit code `2`, signal exit
codes, and manual stale-lock recovery continue to operate. Contract checks add
an earlier safety boundary and do not substitute for those controls.

### User and maintainer documentation

`cli/README.md` is the official discovery surface. It must:

- publish a complete Standard pipeline document using the strict schema, ready
  to copy to `<config-root>/pipelines/standard.json`;
- document the exact pipeline/profile name grammar, name and path references,
  `--from`, the canonical settings and profile schemas, settings fallback,
  binding precedence, intrinsic timing defaults, and startup display;
- provide examples for a full run, a suffix run, a custom pipeline path, and a
  named or explicitly pathed profile;
- contain one support matrix covering every published Antmay skill;
- show the prerequisite artifact state for each of the nine supported stage
  IDs (per `decisions.md` DR12);
- mark proposal and Roadmap capabilities as planned because their unattended
  behavior is still being evaluated, and explain every other unsupported skill
  through its user-visible limitation rather than internal implementation
  rationale (per `decisions.md` DR9).

Root `AGENTS.md` gains the single cross-module synchronization rule from
`decisions.md` DR14: the README support/prerequisite matrix is updated in the
same change whenever suite skill invocation posture, accepted inputs, durable
outputs, or side-effect boundaries affect stage eligibility or prerequisites,
and whenever CLI catalog, target, artifact interpretation, or prerequisite
behavior changes. The rule is not duplicated in module-level agent files.

Help text and the manual smoke checklist describe the new run grammar and
external documents. There is no stage-discovery or initialization command.

## Constraints

- The CLI remains a strict non-interactive TypeScript/ESM application on Node
  `>=22`, with the repository's documented macOS v0 support.
- Pipeline, profile, settings, stage, artifact-state, and checkpoint data used
  for deterministic resume must remain serializable. Catalog definitions may
  not depend on executable callbacks stored in checkpoints (per
  `decisions.md` DR5).
- JSON documents are strict: schema failures and all discoverable field errors
  are reported clearly; no environment interpolation or credential storage is
  introduced.
- Explicit filesystem references are resolved predictably and must not escape
  established thread-relative target and Git-selector safety.
- The CLI is pre-release at `schemaVersion: 0`; this work redesigns current
  settings and checkpoint shapes directly and adds no migrations, compatibility
  shims, or deprecated aliases.
- Existing command dispatch remains lazy so help, version, and grammar errors
  perform no configuration, state, Git, or harness I/O.
- Existing exit-code meanings, workspace-lock ownership, per-stage Git
  boundaries, append-only implementation commits, pending-queue semantics, and
  terminal-outcome protocol are preserved.
- The suite skill names and terminal outcomes are part of the suite/CLI
  contract. This work adapts the nine named skills without editing their
  published behavior.
- User-facing prose uses the repository vocabulary: recipes have steps;
  pipelines have stages; a run has a terminal outcome and condition rather than
  a status.
- Every distinct new terminal rendering has a scripted demo scenario or an
  extension to an existing scenario. Scripted-harness validation operates on
  the selected stage IDs and exercises the same resolved checkpoint data as a
  real run.
- `npm --prefix cli run check` remains the full automated gate and must pass.
- Documentation describes the resulting system as its current design, with
  historical rationale confined to this thread artifact's context.

## Functional requirements and acceptance criteria

### FR-1 — Resolve external pipeline and profile documents unambiguously

- **AC-1.1:** Parsing accepts the documented run grammar with a required
  `<pipeline-ref>`, optional `--from`, optional `--profile`, required
  `--thread`, and the existing permissions flag; missing values, duplicates
  rejected by the parser, and extra positionals return usage errors.
- **AC-1.2:** Tests prove that raw bare pipeline and profile names matching
  `^[a-z0-9]+(?:-[a-z0-9]+)*$` resolve only below their respective config-root
  directories; `standard-2`, `2-stage`, and the invalid uppercase, non-ASCII,
  whitespace, underscore, edge-hyphen, and repeated-hyphen forms exercise the
  grammar without normalization. Absolute paths and relative paths with
  directory components resolve as explicit paths regardless of filename (DR4,
  DR16).
- **AC-1.3:** Tests prove that `standard.json` is rejected with guidance naming
  `standard` and `./standard.json`, and that neither missing reference form
  falls back to the other lookup strategy (DR4).
- **AC-1.4:** Tests prove that declared names need not match filenames and that
  both declared identity and resolved source provenance survive resolution
  (DR4).
- **AC-1.5:** A repository search and run-command tests demonstrate that no
  runnable built-in pipeline remains and that every run requires a successfully
  loaded external pipeline document (DR4).

### FR-2 — Validate one canonical pipeline schema and trusted catalog

- **AC-2.1:** Pipeline validator tests accept the exact object schema in this
  spec and reject wrong schema versions, every name that fails the shared raw
  name grammar, empty stages, string stage shorthand, empty instructions,
  duplicate IDs, unknown IDs, and every unknown root or entry field (DR3, DR7,
  DR16).
- **AC-2.2:** Catalog tests assert that the supported ID set is exactly the nine
  stages listed in Scope and that proposal and Roadmap stage IDs are rejected
  (DR9).
- **AC-2.3:** Catalog contract tests assert each stage's skill, target rule,
  prerequisite, promised transition, bounded Git policy, queue resolution, and
  base prompt, including all rows and boundary rules in Trusted stage catalog
  (DR1, DR10).
- **AC-2.4:** Prompt tests assert that non-empty portable instructions are
  appended after the catalog trigger and resolved target, while a stage without
  instructions adds no extra text (DR7).
- **AC-2.5:** Pipeline validation rejects every attempt to place agent, timing,
  target, Git, queue, prerequisite, output, prompt, or pipeline-wide instruction
  fields in a pipeline document (DR1, DR2, DR7).

### FR-3 — Recognize bounded artifact state

- **AC-3.1:** Filesystem-table tests cover every `absent`, `brief`, `strict`, and
  `malformed` plan rule listed in Artifact-state model, including all enumerated
  malformed examples and inspection errors (DR13).
- **AC-3.2:** Tests prove that proposal, spec, and implementation-report
  presence require non-empty regular files and that the model also records valid
  thread state (DR5).
- **AC-3.3:** Tests prove that state inspection does not parse Markdown prose,
  strict-plan index entries, task ordinals, decision counts, or semantic
  consistency, and does not require `proposal.md` (DR5, DR10, DR13).
- **AC-3.4:** The artifact predicates and transitions can be serialized into and
  validated from checkpoint data without executable functions (DR5).

### FR-4 — Select and validate the executable stage sequence

- **AC-4.1:** A malformed or structurally invalid source pipeline refuses even
  when the fault is in a prefix that `--from` would skip (DR3).
- **AC-4.2:** With no `--from`, all stages are selected; with `--from`, tests
  prove the named stage is included, only its suffix is snapshotted, and no
  skipped stage is recorded as completed (DR3).
- **AC-4.3:** An unknown `--from` ID refuses before run allocation and names the
  unknown ID (DR3).
- **AC-4.4:** Composition tests begin from concrete thread state, apply selected
  transitions in order, never credit skipped outputs, preserve unrelated state,
  and admit a later entry point only when its prerequisite is already present
  (DR3, DR5).
- **AC-4.5:** The first impossible composition diagnostic names the failing
  stage, required state, observed or simulated state, and relevant preceding
  selected stages (DR5).
- **AC-4.6:** Tests prove `spec → plan-brief` targets `spec.md`, direct
  `plan-brief` without a spec targets the thread root, and the resolved
  repository-relative target is snapshotted (DR10).
- **AC-4.7:** Tests reject `plan-brief → implement-plan` and
  `plan-brief → implement-plan-with-subagents`, while accepting strict-plan
  implementation after either an existing strict plan or selected
  `plan-strict` output (DR5, DR10).
- **AC-4.8:** A strict starting plan does not cause CLI preflight to reject
  `plan-brief`; the stage receives any portable instructions and its skill
  remains responsible for the explicit replacement guard (DR10).

### FR-5 — Resolve local execution bindings atomically

- **AC-5.1:** A missing `settings.json` and a canonical
  `{"afk": {"stages": {}}}` document each load as an empty stage map, and a
  profile that covers every selected stage can start without settings (DR8,
  DR17).
- **AC-5.2:** Settings validator tests require exactly the `afk.stages`
  containers in a present document, permit an empty stage map, and reject `{}`,
  `{"afk": {}}`, and unknown fields at every level. Profile validator tests
  enforce their exact strict schema and the shared raw name grammar. Both
  validators enforce the atomic `agent.harness`/`agent.model` pair, positive
  timing values, and rejection of prompt, instructions, and unknown fields
  (DR8, DR16, DR17).
- **AC-5.3:** For each selected stage, a profile entry replaces the entire
  settings entry; tests prove fields never merge across sources and an omitted
  profile stage falls back to its whole settings binding (DR2, DR8).
- **AC-5.4:** Omitted timing fields resolve to 86,400 idle-timeout seconds and
  300 heartbeat seconds (DR8).
- **AC-5.5:** Any selected stage without one complete resolved binding refuses
  before allocation and names that stage (DR2, DR8).
- **AC-5.6:** Documents may contain unused supported stage bindings, while an
  unknown catalog stage invalidates the settings or profile document (DR8).
- **AC-5.7:** Pipeline validator and type-level tests prove portable pipelines
  carry neither local execution data nor a local prompt (DR2, DR7, DR8).

### FR-6 — Snapshot and show the fully resolved execution

- **AC-6.1:** Failure-path tests for pipeline, profile, settings, thread,
  artifact composition, target, harness, worktree, queue, and unfinished-run
  preflight assert that no run directory or checkpoint is allocated.
- **AC-6.2:** Checkpoint tests assert that only selected stages are stored and
  that every stored stage contains its catalog contract, resolved target,
  portable instructions, and fully resolved binding; pipeline/profile identity,
  source provenance, and `--from` are retained as specified (DR2, DR3, DR4).
- **AC-6.3:** Resume tests mutate or remove the source pipeline, selected
  profile, and settings after allocation and prove resume uses only snapshotted
  execution data (DR2, DR3).
- **AC-6.4:** Startup-rendering tests assert the pipeline name/source, profile
  name/source or `settings only`, optional `--from`, and every selected stage's
  ordered harness/model/target appear before the first attempt (DR11).
- **AC-6.5:** The startup path emits no confirmation prompt and launches
  unattended once the summary has been printed (DR11).

### FR-7 — Enforce artifact contracts at runtime

- **AC-7.1:** Before every attempt, tests mutate concrete artifacts after
  preflight and prove an unmet prerequisite pauses on the same stage without a
  harness invocation, reporting required and observed state (DR15).
- **AC-7.2:** After a recognized `DONE`, tests prove the promised output is
  checked before Git evaluation, executor commit, stage advancement, or queue
  advancement (DR5, DR15).
- **AC-7.3:** A missing or structurally mismatched promised output produces a
  durable same-stage `stage-contract-violation` containing expected and observed
  state (DR15).
- **AC-7.4:** Resume of a prerequisite pause rechecks state and starts the stage
  only after its prerequisite is restored (DR15).
- **AC-7.5:** Resume of a postcondition pause whose artifact was repaired
  continues the saved `DONE` through Git finalization without invoking the
  agent again (DR15).
- **AC-7.6:** Resume of a still-unsatisfied postcondition starts a fresh
  same-stage attempt when the worktree is clean and remains paused with repair
  or revert guidance when it is dirty (DR15).
- **AC-7.7:** Regression tests preserve terminal-outcome handling, queue gates,
  allowed-change enforcement, implementation `HEAD` movement, boundary commits,
  lock ownership, signal behavior, and exit-code meanings.

### FR-8 — Make stage authoring discoverable and maintainable

- **AC-8.1:** `cli/README.md` contains a complete copyable Standard pipeline
  document that passes the production validator when saved at the documented
  config-root path (DR4).
- **AC-8.2:** A documentation check asserts the README matrix contains every
  published Antmay skill exactly once, lists prerequisite state for all nine
  supported stages, labels the five deferred proposal/Roadmap capabilities as
  planned, and gives a user-visible reason for every other unsupported skill
  (DR9, DR12).
- **AC-8.3:** CLI help, examples, settings/profile documentation, and the manual
  smoke checklist use the new required pipeline reference, optional `--from`,
  and optional `--profile` grammar.
- **AC-8.4:** Root `AGENTS.md` contains the single synchronization rule described
  in User and maintainer documentation, and neither module-level `AGENTS.md`
  duplicates it (DR14).
- **AC-8.5:** Help and command parser tests prove there is no `afk stages` or
  initialization subcommand (DR4, DR14).
- **AC-8.6:** Every new terminal shape introduced by startup or contract pauses
  is covered by a scripted demo scenario or an explicit extension of an
  existing rendering-equivalent scenario.

### FR-9 — Pass the repository verification gate

- **AC-9.1:** `npm --prefix cli run check` exits `0`, covering TypeScript
  typechecking, the complete Vitest suite, and the production build.
- **AC-9.2:** Tests include named config-root references, explicit relative and
  absolute paths, complete-profile/no-settings execution, settings fallback,
  `--from` success and refusal, malformed plan shapes, impossible composition,
  runtime prerequisite drift, every postcondition recovery branch, and
  checkpoint-only resume.
- **AC-9.3:** A manual smoke pass can copy the documented Standard pipeline and
  local bindings, run a full pipeline and a later-stage suffix through real
  harnesses, see the resolved startup summary, pause on a deliberately broken
  contract, repair it, and resume according to this spec.

## Acceptance coverage

| Expected-behavior area | Covered by |
| --- | --- |
| reference syntax and source identity | FR-1 |
| strict pipeline schema and trusted catalog | FR-2 |
| bounded artifact recognition | FR-3 |
| suffix selection, target resolution, and composition | FR-4 |
| settings/profile schemas and atomic precedence | FR-5 |
| allocation boundary, snapshots, display, and resume | FR-6 |
| concrete runtime checks and recovery | FR-7 |
| README, support matrix, help, maintenance rule, and demos | FR-8 |
| automated and manual verification | FR-9 |

## Degrees of freedom

- The internal TypeScript module split, type names, and helper boundaries are
  free choices, provided the catalog and all persisted data remain declarative,
  serializable, strictly validated, and behaviorally identical to this spec.
- The implementation may use hand-written validators or an internal validation
  abstraction already acceptable to the CLI codebase, provided the accepted
  documents, rejected documents, and collected diagnostics are unchanged.
- Artifact inspection and transition simulation may share one engine or use
  separate preflight/runtime adapters, provided both apply the same canonical
  predicates and runtime checks operate on fresh concrete state.
- Checkpoint field names and nesting may be chosen to fit the existing
  checkpoint model, provided all required provenance, selected stages,
  contracts, targets, instructions, and bindings are durably snapshotted and
  resume performs no forbidden source rereads.
- Automated cases may be distributed among existing test files or new focused
  test files, and rendering-equivalent behavior may extend an existing demo
  scenario instead of creating a new one.
