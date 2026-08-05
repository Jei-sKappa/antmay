# antmay

`antmay` is a strict, non-interactive command-line executor that drives the
Antmay method unattended: it runs a pipeline you author stage by stage against
one selected thread through an agentic harness, with durable checkpoints,
workspace locking, and per-stage Git boundaries.

A **pipeline** is a JSON document you write. It selects and orders stages from
the executor's trusted stage catalog — the nine Antmay skills the executor knows
how to run unattended — and travels with your repository or your config root.
Everything safety-critical about a stage (where the skill is pointed, what
artifact state it needs, what it must leave behind, how far its Git changes may
reach) belongs to the catalog, so a pipeline document can be shared without
carrying any authority.

> **Platform support (v0):** macOS only. The executor uses platform-neutral
> Node APIs where convenient, but Linux and Windows behavior is incidental and
> undocumented.

## Commands

```text
antmay afk run <pipeline-ref> --thread <path> [--from <stage-id>] [--profile <profile-ref>] [--dangerously-skip-permissions]
antmay afk resume <run-id>
antmay afk list
```

`run` starts a new run of one pipeline against one thread. `resume` continues a
paused or interrupted run from its durable checkpoint, reading only that
checkpoint — never the pipeline, profile, or settings documents again. `list`
prints every run the state root holds.

- `<pipeline-ref>` is required and selects the pipeline document.
- `--thread <path>` is required and names the thread the run targets.
- `--from <stage-id>` enters the pipeline at that stage and runs it and every
  later stage. The named stage must be one the document selects.
- `--profile <profile-ref>` selects an execution profile whose stage bindings
  take precedence over `settings.json`.
- `--dangerously-skip-permissions` grants the run unrestricted host access, and
  opens the run on a boxed warning saying so.

### Examples

```sh
# Full run of the pipeline named `standard` in the config root.
antmay afk run standard --thread docs/threads/260727135009Z-my-feature

# The same pipeline entered at a later stage: `plan-strict` and everything after it.
antmay afk run standard --thread docs/threads/260727135009Z-my-feature --from plan-strict

# A pipeline document checked into the repository, by relative path.
antmay afk run ./pipelines/spec-only.json --thread docs/threads/260727135009Z-my-feature

# The same, by absolute path.
antmay afk run /Users/you/code/project/pipelines/spec-only.json \
  --thread docs/threads/260727135009Z-my-feature

# A named execution profile from the config root.
antmay afk run standard --thread docs/threads/260727135009Z-my-feature --profile codex-planning

# An execution profile by explicit path.
antmay afk run standard --thread docs/threads/260727135009Z-my-feature \
  --profile ./profiles/codex-planning.json
```

## The config root

Named references and `settings.json` resolve below one config root:

1. `ANTMAY_CONFIG_HOME`;
2. else `$XDG_CONFIG_HOME/antmay`;
3. else `~/.config/antmay`.

A rung is taken only when the variable above it is unset or empty. A variable
that is set must be an absolute path — a relative one, or a literal `~…` or
`$VAR…` value, since nothing is expanded, ends the command with an error naming
that variable rather than falling through to the next rung.

Its layout is:

```text
<config-root>/
  settings.json          optional local stage bindings
  pipelines/<name>.json  pipeline documents addressable by bare name
  profiles/<name>.json   execution profiles addressable by bare name
```

The executor creates none of these files or directories, and reads no file
outside the exact paths a reference resolves to.

## The state root

Run state — checkpoints, attempt logs, and workspace locks — lives below one
state root, resolved by the same rungs and the same absolute-path requirement:

1. `ANTMAY_STATE_HOME`;
2. else `$XDG_STATE_HOME/antmay`;
3. else `~/.local/state/antmay`.

Its layout is:

```text
<state-root>/
  afk-runs/<run-id>/state.json  the durable checkpoint `resume` reads
  afk-runs/<run-id>/logs/       one log per stage attempt
  afk-locks/                    one lock file per locked checkout
```

The executor creates these as it needs them, at mode `0700`. A run's directory
is what `antmay afk list` reports and what `antmay afk resume <run-id>` reads,
so deleting it discards the run.

## References

A pipeline or profile reference is resolved by its **syntax alone**, before any
filesystem access:

- A **bare name** matching `^[a-z0-9]+(?:-[a-z0-9]+)*$` resolves to
  `<config-root>/pipelines/<name>.json` or `<config-root>/profiles/<name>.json`,
  according to what the reference is for.
- A reference carrying an **explicit directory component** — absolute like
  `/srv/pipelines/standard.json`, or relative like `./standard.json` or
  `pipelines/standard.json` — resolves as a filesystem path, relative references
  against the working directory you invoked from, whatever its filename.
- Anything else is rejected. A bare filename such as `standard.json` is the
  common case: it is invalid, and the error offers both legal readings —
  `standard` for the config-root document, `./standard.json` for the file in the
  working directory.

The two strategies never fall back to each other. A named document that does not
exist is reported at its config-root path rather than searched for in the
working directory, and a path that does not exist is reported as that path rather
than retried as a name. An invocation therefore means the same thing regardless
of what happens to be on disk next to you.

The name grammar is exact and is applied to the raw string: lowercase ASCII
letters and digits in non-empty segments joined by single hyphens. Uppercase and
non-ASCII characters, whitespace, underscores, dots, path separators, and
leading, trailing, or repeated hyphens are all invalid. Nothing is trimmed,
case-folded, or Unicode-normalized first. The same grammar governs the `name`
field declared inside a pipeline or profile document — including a document you
load by path, whose filename is free but whose declared name is not.

A document's declared `name` and the source it was read from are independent
identities: moving or renaming the file changes the provenance and not the name.
Both are printed before the run.

## Pipeline documents

A pipeline document is strict JSON with exactly three root fields:

| Field | Value |
| --- | --- |
| `schemaVersion` | exactly `0` |
| `name` | the pipeline's declared display identity, matching the name grammar |
| `stages` | a non-empty array of stage entries, in execution order |

A stage entry is an object with a required `stage` — a catalog stage ID — and an
optional non-empty `instructions` string. There is no string shorthand for an
entry, no pipeline-wide instructions field, and no other root field. A pipeline
may select each catalog stage at most once.

`instructions` is opaque text the executor never interprets. It is appended to
the stage's skill invocation, after the trigger and the resolved target, so it
travels with the pipeline and stays portable: it names no agent, no model, and no
local path.

Every other property of a stage is the catalog's, and an entry that tries to
carry one — `agent`, `model`, `idleTimeoutSeconds`, `prompt`, `target`,
`gitPolicy`, `queueResolution`, `prerequisite`, `promises` — is rejected as an
unrecognized field. Validation is exhaustive: one load reports every problem the
document has, against the source path it was read from.

### The Standard pipeline, ready to copy

Save this as `<config-root>/pipelines/standard.json` and it is addressable as
`standard`. It is the pipeline the CLI's own demo runs, and it automates the
automatable core of the [Standard recipe](../docs/recipes/standard.md): it starts
from a thread that already exists, omits every recipe step that needs a human,
and substitutes `implement-plan-with-subagents` for the recipe's `implement-plan`
step.

```json
{
  "schemaVersion": 0,
  "name": "standard",
  "stages": [
    { "stage": "spec" },
    { "stage": "reconcile-spec" },
    { "stage": "review-spec" },
    { "stage": "plan-strict" },
    { "stage": "reconcile-plan" },
    { "stage": "implement-plan-with-subagents" }
  ]
}
```

A shorter pipeline is just a shorter `stages` array, and portable per-stage
guidance rides along as `instructions`:

```json
{
  "schemaVersion": 0,
  "name": "spec-only",
  "stages": [
    { "stage": "spec", "instructions": "Keep the acceptance criteria testable." },
    { "stage": "review-spec" }
  ]
}
```

### How a selection is validated

Before the run is allocated, the executor inspects the thread's concrete artifact
state and walks the selected stages in order. Each stage is checked against the
state as it stands at that position, then its promised state is applied for the
stages after it. The walk stops at the first stage that cannot run and prints a
structured dependency projection: the pipeline and failing stage, the relevant
thread state before the run, every earlier stage that would change each failed
dependency, what the failing stage requires, and why those values are
incompatible. The refusal states explicitly that no stages ran.

`--from` selects a suffix, and a skipped stage is never credited: entering at
`plan-strict` means the thread itself must already hold the `spec.md` that the
skipped `spec` stage would have produced.

Artifact state is read from bounded filesystem structure, never from prose:

- **valid thread** — the thread folder holds a non-empty `seed.md` and a
  non-empty `decisions.md`;
- **proposal / spec / implementation report** — `proposal.md`, `spec.md`, and
  `implementation-report.md` count as present when each is a non-empty regular
  file;
- **plan** — `absent` when neither `plan.md` nor `plan-tasks/` exists; `brief`
  when `plan.md` is a non-empty regular file and `plan-tasks/` is absent;
  `strict` when `plan.md` is a non-empty regular file and `plan-tasks/` holds at
  least one non-empty Markdown task file; and `malformed` for every other
  combination, which no stage accepts.

Each stage's target is resolved from that same state. Most targets are fixed —
the thread root, `spec.md`, or `plan.md`. `plan-brief` is the one state-sensitive
target: it is pointed at `spec.md` when the thread has a spec or an earlier
selected stage promises one, and at the thread root otherwise.

## Antmay skill support

Pipelines select from a closed catalog of nine stages. Every published Antmay
skill appears below exactly once, with the artifact state a supported stage
requires or the reason the skill is not available as a stage.

| Skill | Support | Prerequisite state, or why not |
| --- | --- | --- |
| [`open-thread`](../suite/skills/capture-discussion/open-thread/SKILL.md) | Unsupported | Interviews you for the thread's founding intent and then creates the thread folder; a run is invoked against a thread that already exists. |
| [`open-ticket`](../suite/skills/capture-discussion/open-ticket/SKILL.md) | Unsupported | Settles the ticket's wording with you and writes it to your issue tracker, outside the repository a run guards. |
| [`discussion`](../suite/skills/capture-discussion/discussion/SKILL.md) | Unsupported | An open-ended interview that discovers its questions live; the conversation with you is the deliverable. |
| [`resolve-pending-decisions`](../suite/skills/capture-discussion/resolve-pending-decisions/SKILL.md) | Unsupported | Walks you through each queued decision interactively. A run pauses on a non-empty `.pending-decisions/` queue and hands it to you instead. |
| [`propose`](../suite/skills/propose/propose/SKILL.md) | Planned | Its unattended pipeline behavior is still being evaluated while the proposal workflow matures. |
| [`spec`](../suite/skills/spec/spec/SKILL.md) | Supported | A valid thread. |
| [`plan-brief`](../suite/skills/plan/plan-brief/SKILL.md) | Supported | A valid thread. |
| [`plan-strict`](../suite/skills/plan/plan-strict/SKILL.md) | Supported | A valid thread holding `spec.md`. |
| [`reconcile-proposal`](../suite/skills/reconcile/reconcile-proposal/SKILL.md) | Planned | Its unattended pipeline behavior is still being evaluated while the proposal workflow matures. |
| [`reconcile-spec`](../suite/skills/reconcile/reconcile-spec/SKILL.md) | Supported | A valid thread holding `spec.md`. |
| [`reconcile-plan`](../suite/skills/reconcile/reconcile-plan/SKILL.md) | Supported | A valid thread holding `spec.md` and a strict plan. |
| [`reconcile-roadmap`](../suite/skills/reconcile/reconcile-roadmap/SKILL.md) | Planned | Its unattended pipeline behavior is still being evaluated while the Roadmap workflow matures. |
| [`roadmap`](../suite/skills/roadmap/roadmap/SKILL.md) | Planned | Its unattended pipeline behavior is still being evaluated while the Roadmap workflow matures. |
| [`materialize-roadmap-threads`](../suite/skills/roadmap/materialize-roadmap-threads/SKILL.md) | Unsupported | Creates one sibling thread per roadmap brief, outside the single thread a run targets. |
| [`implement`](../suite/skills/implement/implement/SKILL.md) | Supported | A valid thread holding a brief plan. |
| [`implement-plan`](../suite/skills/implement/implement-plan/SKILL.md) | Supported | A valid thread holding a strict plan. |
| [`implement-plan-with-subagents`](../suite/skills/implement/implement-plan-with-subagents/SKILL.md) | Supported | A valid thread holding a strict plan. |
| [`review-spec`](../suite/skills/review/review-spec/SKILL.md) | Supported | A valid thread holding `spec.md`. |
| [`review-roadmap`](../suite/skills/review/review-roadmap/SKILL.md) | Planned | Its unattended pipeline behavior is still being evaluated while the Roadmap workflow matures. |
| [`review-implementation`](../suite/skills/review/review-implementation/SKILL.md) | Unsupported | Audits delivered work over a scope you name when you invoke it; a stage is pointed at one fixed thread artifact. |
| [`review-code`](../suite/skills/review/review-code/SKILL.md) | Unsupported | Judges code quality over a scope you name when you invoke it; a stage is pointed at one fixed thread artifact. |
| [`merge-artifacts`](../suite/skills/merge/merge-artifacts/SKILL.md) | Unsupported | You supply the exact candidate drafts to collapse, which may live anywhere inside or outside the thread. |
| [`finish`](../suite/skills/finish-navigate/finish/SKILL.md) | Unsupported | An interactive delivery handoff: it asks how to dispose of the branch, then performs the Git operation you choose. |
| [`whats-next`](../suite/skills/finish-navigate/whats-next/SKILL.md) | Unsupported | Read-only navigation advice whose whole deliverable is the chat reply; it leaves nothing on disk. |
| [`archive-thread`](../suite/skills/finish-navigate/archive-thread/SKILL.md) | Unsupported | Relocates the whole thread folder on your explicit say-so — applied to the very thread a run is executing against. |
| [`emit-pending-decisions`](../suite/skills/primitives/emit-pending-decisions/SKILL.md) | Unsupported | A model-invoked primitive: the skill that discovered the open decisions hands them over. You never invoke it yourself. |
| [`emit-pending-review`](../suite/skills/primitives/emit-pending-review/SKILL.md) | Unsupported | A model-invoked primitive: the reviewer that validated the findings hands them over. You never invoke it yourself. |
| [`allocate-thread`](../suite/skills/primitives/allocate-thread/SKILL.md) | Unsupported | A model-invoked primitive that creates a thread folder from a caller's authorization block; a run targets a thread that already exists. |
| [`update-implementation-report`](../suite/skills/primitives/update-implementation-report/SKILL.md) | Unsupported | A model-invoked primitive an implementation skill calls with its verified outcome; the supported implement stages already reach it that way. |
| [`append-roadmap-feedback`](../suite/skills/primitives/append-roadmap-feedback/SKILL.md) | Unsupported | A model-invoked primitive that writes into a parent thread, outside the single thread a run targets. |

A **planned** capability is one whose unattended pipeline contract has not been
fixed yet; it is expected to become a stage once the underlying workflow has been
exercised enough to settle what a stage of it must promise.

Each supported stage also declares what it must leave behind and how far its
tracked changes may reach. `spec` and `reconcile-spec` may touch only `spec.md`;
`review-spec` is the one read-only stage and permits no tracked change at all;
`plan-brief`, `plan-strict`, and `reconcile-plan` may touch `plan.md` and
`plan-tasks/`; the three implementation stages make their own per-task code
commits and leave `implementation-report.md` for the stage boundary to commit.

## Local execution bindings

A pipeline says *what* runs; a **stage binding** says *how* — which harness, which
model, and how patient the executor is with a quiet attempt. Bindings are local:
they never travel inside a pipeline document.

A binding is one object per stage:

| Field | Value |
| --- | --- |
| `agent` | required object with exactly `harness` (`"codex"` or `"claude-code"`) and a non-empty `model` |
| `idleTimeoutSeconds` | optional positive integer; how long an attempt may go without output before it is abandoned |
| `heartbeatSeconds` | optional positive integer; how often a live attempt prints that it is still working |

`harness` and `model` are one indivisible pair inside `agent`, so a model can
never end up paired with a harness you did not choose. Omitted timing fields take
the intrinsic defaults: **86,400 seconds** (one day) of idle timeout, and a
**300-second** heartbeat. Lower the heartbeat to keep a quiet unattended run
visibly alive; raise it to keep a long run out of a CI log.

Every stage a run selects must end up with a binding. A selected stage that no
source binds is a preflight failure naming that stage.

### `settings.json`

`<config-root>/settings.json` is optional and holds your default bindings. When
it is absent the executor behaves exactly as if it read the canonical empty
document `{"afk": {"stages": {}}}`, so a complete execution profile can run with
no settings file at all.

A file that is present is validated strictly. Its shape is exactly one root field
`afk`, holding exactly one field `stages`, holding a possibly empty map of
catalog stage IDs to bindings — so `{}` and `{"afk": {}}` are both rejected,
while `{"afk": {"stages": {}}}` is valid. Unknown fields at the root, under
`afk`, inside a binding, or inside `agent` are errors, and one load reports every
problem it finds. No environment interpolation is performed and no credential is
ever read or stored.

The model strings below are examples and are not validated against any provider.

```json
{
  "afk": {
    "stages": {
      "spec": { "agent": { "harness": "codex", "model": "gpt-5.6-terra" } },
      "reconcile-spec": { "agent": { "harness": "codex", "model": "gpt-5.6-terra" } },
      "review-spec": { "agent": { "harness": "claude-code", "model": "claude-sonnet-5" } },
      "plan-strict": { "agent": { "harness": "codex", "model": "gpt-5.6-terra" } },
      "reconcile-plan": { "agent": { "harness": "codex", "model": "gpt-5.6-terra" } },
      "implement-plan-with-subagents": {
        "agent": { "harness": "claude-code", "model": "claude-sonnet-5" },
        "idleTimeoutSeconds": 3600,
        "heartbeatSeconds": 60
      }
    }
  }
}
```

You may bind a stage no pipeline of yours selects; a binding is only consulted
for the stages a run actually selects.

### Execution profiles

An execution profile is a separate document you select per invocation with
`--profile`, for a run that should use different agents than your defaults — a
planning pass on another provider, a cheaper model for a long implementation.

Its shape is `schemaVersion` exactly `0`, a declared `name` matching the name
grammar, and a non-empty `stages` map of the same bindings. Save it as
`<config-root>/profiles/<name>.json` to address it by bare name, or anywhere you
like and address it by path.

```json
{
  "schemaVersion": 0,
  "name": "codex-planning",
  "stages": {
    "plan-strict": { "agent": { "harness": "codex", "model": "gpt-5.6-sol" } },
    "reconcile-plan": {
      "agent": { "harness": "codex", "model": "gpt-5.6-sol" },
      "idleTimeoutSeconds": 7200
    }
  }
}
```

**A profile entry replaces the whole settings entry for that stage.** Fields never
merge across the two documents: a profile entry cannot inherit a settings timing
value, and its model can never be paired with a settings harness. A stage the
profile does not bind keeps its settings binding untouched. Only the intrinsic
defaults ever fill a timing field the winning entry omitted.

## What a run requires of your repository

Antmay skills write three directories inside a thread while a run is in progress:
`.pending-decisions/`, `.pending-reviews/`, and `.implementation-runs/`. They hold
work in progress rather than thread artifacts, so Git has to ignore all three and
track nothing under them — otherwise the files a skill writes there make a later
stage fail its Git boundary.

Commit these repository-wide rules once and every thread is covered:

```text
docs/threads/**/.pending-decisions/
docs/threads/**/.pending-reviews/
docs/threads/**/.implementation-runs/
```

Each rule has to cover the directory itself. A rule restricted to filenames inside
one — `docs/threads/**/.implementation-runs/*.md`, say — leaves that directory
uncovered, and the check refuses.

Both `run` and `resume` check this ahead of the clean-worktree gate, lock
acquisition, and stage execution. For a new run, rejection happens before a run
directory or checkpoint exists; for a resume, the existing checkpoint remains
unchanged. A repository that does not satisfy the check exits `1` with a
structured Git-safety refusal: command and thread context, separate sections for
missing ignore coverage and tracked temporary content, the correction for each,
the reason the check is required, and an explicit result.

## What a run prints before it starts

Once preflight passes, the run opens on the fully resolved execution — both
document identities with the sources they were read from, the entry point when
you named one, and every selected stage with the agent and target it resolved to:

```text
Run details
  Run:         20260727T214637000Z-2b9c8f8c
  Pipeline:    standard (/Users/you/.config/antmay/pipelines/standard.json)
  Profile:     codex-planning (/Users/you/.config/antmay/profiles/codex-planning.json)
  From:        plan-strict
  Thread:      docs/threads/260727135009Z-my-feature
  Workspace:   /Users/you/code/project
  Permissions: restricted
  Stages:
    1. plan-strict                     codex · gpt-5.6-sol           → docs/threads/260727135009Z-my-feature/spec.md
    2. reconcile-plan                  codex · gpt-5.6-sol           → docs/threads/260727135009Z-my-feature/plan.md
    3. implement-plan-with-subagents   claude-code · claude-sonnet-5 → docs/threads/260727135009Z-my-feature/plan.md
```

`Profile:` reads `settings only` when the invocation named none, and the `From:`
line appears only for a suffix run. Everything shown here is snapshotted into the
run's checkpoint, so a resume continues on exactly these values without reading
the pipeline, profile, or settings documents again.

## Color

Color never carries meaning: every line reads the same with the escape codes
stripped. By default it is emitted only when stdout is a terminal, and two
environment variables override that:

- **`FORCE_COLOR`** — any value other than empty or `0` emits color even when
  stdout is not a terminal, which is what you want when piping a run into a pager
  or a CI log. No color level is interpreted; color is on or off.
- **`NO_COLOR`** — any non-empty value keeps color off, and outranks
  `FORCE_COLOR` when both are set.

## Artifact contracts at runtime

Preflight proves the selection is possible against the state it saw. Concrete
state can move afterwards, so each stage is checked twice more against freshly
inspected state.

**Before an attempt.** The stage's prerequisite is re-evaluated. If it is unmet —
someone deleted `spec.md` between stages, a plan went malformed — the run pauses
before that stage with `STAGE CANNOT START — requirements not met`, having
allocated no attempt, written no log, and invoked no harness. The diagnostic
identifies the stage, shows the thread files it found and the files the stage
requires, explains why execution stopped, and confirms that the pipeline is
paused at that stage. Fix the named files, leave the worktree clean, and resume;
the stage starts once its requirements are satisfied.

**After a recognized `DONE`.** The stage's promised artifact state is verified
before anything else happens — before the Git boundary is evaluated, before the
boundary commit, before the stage advances. A `DONE` that did not leave what it
promised pauses the run with `promised artifact state unmet`, reporting expected
and observed state side by side. The completed attempt is preserved, so a repair
can finalize it later without running the stage again.

Resuming a contract pause rechecks the promise first, and what that check finds
picks one of four deterministic recoveries:

| What resume finds | What it does |
| --- | --- |
| The promise now holds | Finalizes the saved `DONE` — Git boundary and commit — without invoking the agent again |
| The promise is unmet and the worktree is clean | Starts a fresh attempt of the same stage |
| The promise is unmet and the worktree is dirty | Stays paused; those changes are the attempt's own and only you can say whether they are the repair or something to revert |
| The state could not be inspected at all | Stays paused, so the saved `DONE` remains finalizable once the thread can be read again |

The Git boundary is the separate, later check: it fires once the promise holds,
and reports `git policy violation` when the stage's tracked changes fall outside
its allowed selectors, when `HEAD` moved where the stage forbids it, or when the
stage requires a change and the worktree holds none.

**Pauses** surface as exit code `2` (waiting). Every pause prints its reason, the
log path, the run ID, and the exact `antmay afk resume <run-id>` command.

## Listing runs

`antmay afk list` prints every valid run checkpoint as a labeled summary, sorted
globally by `updatedAt` from newest to oldest. Conditions are never grouped, so
two runs with the same condition can have a differently conditioned run between
them when its update time falls between theirs.

Each summary begins with one of the four possible run conditions:

| Label | Meaning |
| --- | --- |
| `READY` | The run has a current stage but no active attempt; that stage can start or be retried. |
| `EXECUTING (UNVERIFIED)` | The checkpoint records an executing attempt. `list` does not verify that its process is still alive. |
| `WAITING FOR USER` | The run is durably paused for a recorded reason and requires human attention before it can continue. |
| `COMPLETED` | Every selected stage finished and the run is terminal. |

The summary also identifies the pipeline, current stage and agent when one
exists, thread, workspace, and most recent captured provider session.

## Stale workspace locks

While a run holds the workspace, `antmay` writes an exclusive lock file under
`<state-root>/afk-locks/`. A second `run` or `resume` against the same checkout
exits `1` and prints the existing lock's record and exact path.

`antmay` never reclaims a lock automatically. After a crash or power loss, the
lock file remains even though no executor still owns it. To recover, inspect the
printed lock record and path, verify that the recorded process (its `pid`) is no
longer running, and only then manually remove that exact file. Do not remove a
lock whose process may still be alive — doing so allows two executors to mutate
the same checkout at once.

## Native provider conversations

Every Antmay stage attempt starts a **fresh** harness conversation. Capturing a
provider session ID does not change that: `antmay afk resume <run-id>` continues
the Antmay pipeline (queues, Git boundaries, checkpoints) and never reopens or
reuses a prior Codex or Claude Code conversation for the next attempt.

When a pause concerns an attempt that captured a session, the pause action block
prints a paste-ready native command under `Continue`:

- Codex: `codex resume '<session-id>'`
- Claude Code: `claude --resume '<session-id>'`

That command is an **out-of-band convenience**. Antmay does not verify that a
provider transcript still exists, does not mutate the checkpoint when you paste
it, does not reuse the session on a later stage attempt, and never launches the
provider CLI for you. You paste it in your own terminal when you want the same
conversation back (for example after a `DONE` that left `.pending-decisions/`
work for a human).

The session identity is also discoverable in the attempt log, whose verbose
stream retains the provider's raw session event.

Typical journey after an attempt-backed `WAITING FOR USER` pause:

1. Read the pending decision bundle and settle it outside Antmay.
2. Optionally paste the printed `Continue` command to reopen the provider
   conversation for context while you decide.
3. Commit or revert any repository changes that conversation made, so the
   worktree is clean.
4. Run the printed `antmay afk resume <run-id>` to continue the pipeline.

The `Latest session` field in `antmay afk list` selects the run's **most recent
attempt that carries a session** and renders its snapshotted harness beside the
session ID. That value can belong to an earlier stage than the summary's current
stage; when no attempt captured a session, the field is omitted.

## Scripted demo

`npm run demo` drives the built CLI through a real run against a disposable
repository, with a scripted stand-in for the harness, so every terminal state the
executor can produce is visible without contacting Codex or Claude Code. It
builds the CLI first, then runs the scenario you pick. Each scenario stops at one
distinct state — a closing block, a pause, a refusal — so that state is the last
thing on screen.

From `cli/`, or from the repository root by replacing `npm` with
`npm --prefix cli`:

```sh
npm run demo -- --list                  # every scenario, and the state it ends on
npm run demo -- --scenario 13-refused   # by full id
npm run demo -- --scenario refused      # by name
npm run demo -- --scenario 11           # by number
npm run demo:all                        # the whole catalog, as one verdict
```

Without `--scenario` the demo prompts when it has a terminal, taking the first
scenario when answered with Enter alone.

Every invocation a scenario makes declares the exit code it must produce and the
output that identifies the state it ends on, so a scenario that reaches the wrong
state fails instead of passing on a shared exit code. `npm run demo:all` builds
once and runs the whole catalog serially, printing a line per scenario, the full
transcript of any that failed, and its own wall clock.

Each run gets a unique directory under `/tmp/antmay-demo-<scenario>-*` holding an
isolated config root, an isolated state root, and the disposable Git repository,
so the demo needs no configuration of yours: nothing under your real config or
state root is read or written, and no run record or workspace lock of yours is
touched. Everything it writes is left in place for you to inspect, and
`--show-demo-summary` closes with the commit list, the working-tree state, and
the paths you need to keep poking at the result by hand.
