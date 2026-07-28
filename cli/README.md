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
stages after it. The walk stops at the first stage that cannot run, naming what
it required, what the state at that point actually holds, and which earlier
selected stages bear on the dimensions that failed.

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
tracked changes may reach. `spec`, `reconcile-spec`, and `review-spec` may touch
only `spec.md`; `plan-brief`, `plan-strict`, and `reconcile-plan` may touch
`plan.md` and `plan-tasks/`; the three implementation stages make their own
per-task code commits and leave `implementation-report.md` for the stage boundary
to commit.

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

```json
{
  "afk": {
    "stages": {
      "spec": { "agent": { "harness": "codex", "model": "gpt-5.6-sol" } },
      "reconcile-spec": { "agent": { "harness": "codex", "model": "gpt-5.6-sol" } },
      "review-spec": { "agent": { "harness": "claude-code", "model": "claude-sonnet-5" } },
      "plan-strict": { "agent": { "harness": "codex", "model": "gpt-5.6-sol" } },
      "reconcile-plan": { "agent": { "harness": "codex", "model": "gpt-5.6-sol" } },
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
    "plan-strict": { "agent": { "harness": "codex", "model": "gpt-5-codex" } },
    "reconcile-plan": {
      "agent": { "harness": "codex", "model": "gpt-5-codex" },
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
    1. plan-strict                     codex · gpt-5-codex           → docs/threads/260727135009Z-my-feature/spec.md
    2. reconcile-plan                  codex · gpt-5-codex           → docs/threads/260727135009Z-my-feature/plan.md
    3. implement-plan-with-subagents   claude-code · claude-sonnet-5 → docs/threads/260727135009Z-my-feature/plan.md
```

`Profile:` reads `settings only` when the invocation named none, and the `From:`
line appears only for a suffix run. Everything shown here is snapshotted into the
run's checkpoint, so a resume continues on exactly these values without reading
the pipeline, profile, or settings documents again.

## Artifact contracts at runtime

Preflight proves the selection is possible against the state it saw. Concrete
state can move afterwards, so each stage is checked twice more against freshly
inspected state.

**Before an attempt.** The stage's prerequisite is re-evaluated. If it is unmet —
someone deleted `spec.md` between stages, a plan went malformed — the run pauses
with `stage prerequisite unmet`, having allocated no attempt, written no log, and
invoked no harness. Restore the state it names and resume; the stage starts once
its requirement is back.

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

The session identity is also discoverable in the attempt log: a real run retains
the provider's raw session event in its verbose stream, while the scripted demo
writes an explicit `Scripted session: scripted-session-<stage-id>-<attempt>`
metadata line. The scripted line stays out of the terminal's agent transcript.

Typical journey after an attempt-backed `WAITING FOR USER` pause:

1. Read the pending decision bundle and settle it outside Antmay.
2. Optionally paste the printed `Continue` command to reopen the provider
   conversation for context while you decide.
3. Commit or revert any repository changes that conversation made, so the
   worktree is clean.
4. Run the printed `antmay afk resume <run-id>` to continue the pipeline.

`antmay afk list` adds the run's **most recent attempt that carries a session**,
rendered as `<snapshotted-harness>/<session-id>`. That value can belong to an
earlier stage than the row's currently displayed stage position; when no attempt
captured a session, the column is omitted.

## Scripted demo

`npm run demo` drives the built CLI through a pipeline document it writes into a
throwaway config root, without contacting Codex or Claude Code, so you end up
with a real disposable repository and run directory to inspect. It runs
`npm run build` without tests, then executes the scenario you pick.

Every launched scripted attempt prints a `[DEV] Resolved prompt` block directly
from its invocation request after the attempt header and before simulated agent
output. Multiline prompts remain readable, with every physical line marked
`[DEV]`; real-harness runs do not print this developer block.

From `cli/` run:

```sh
npm run demo -- --scenario 01-all-done
```

From the repository root, the equivalent command is:

```sh
npm --prefix cli run demo -- --scenario 01-all-done
```

Each scenario drives the run to one distinct visual state and stops there, so
whatever it exists to show is the last thing on screen. Ids carry an ordering
prefix and are listed in reading order — a normal run, then the pauses you meet
routinely, then the ways a stage fails, then the rare and the cosmetic. Attempt-
backed pauses and the run listing already show native-session surfaces through
existing scenarios (`04-waiting-for-user` for `Continue`, `20-list` for the
latest-session column); neither needs a separate scenario. `--list` prints them
all:

| Scenario | Ends on |
| --- | --- |
| `01-all-done` | `SUCCESS` after six clean stages on a selected execution profile, with all six resolved prompts shown as `[DEV]` input |
| `02-blocked` | the `BLOCKED` banner |
| `03-refused` | the `REFUSED` banner |
| `04-waiting-for-user` | `WAITING FOR USER`, its pending list, and native `Continue` with `scripted-session-reconcile-spec-1` |
| `05-multiple-reasons` | two stacked reason banners under a `2 reasons` header |
| `06-retry` | a `--from` suffix run's resumed `· attempt 2` header, then `SUCCESS` |
| `07-runtime-prerequisite` | `FAILED — stage prerequisite unmet` and its `Artifacts:` list |
| `08-stage-contract-violation` | `FAILED — promised artifact state unmet` and its `Artifacts:` list |
| `09-failed-no-outcome` | `FAILED — no terminal outcome`, quoting the offending line |
| `10-failed-harness-error` | `FAILED — harness error` |
| `11-failed-idle-timeout` | `FAILED — idle timeout` |
| `12-failed-git-policy` | `FAILED — git policy violation` |
| `13-failed-commit` | `FAILED — commit failed` |
| `14-failed-queue-scan` | `FAILED — queue scan error` |
| `15-interrupted` | `INTERRUPTED`, after a signal lands mid-stage |
| `16-checkpoint-write-failure` | `FAILED — checkpoint write` |
| `17-permissions-warning` | a clean run opening on the boxed unrestricted warning |
| `18-heartbeat` | the repeating `· still working` line |
| `19-long-content` | oversized reasons, paths and tool arguments |
| `20-list` | `afk list`, one row per condition, sorted newest first, with latest-session values `claude-code/scripted-session-review-spec-1`, `codex/scripted-session-reconcile-spec-1`, `claude-code/scripted-session-plan-strict-1`, and `claude-code/scripted-session-implement-plan-with-subagents-1` |

`--scenario` takes any of three forms, so you need not remember a number to ask
for a scenario by name:

```sh
npm run demo -- --scenario 3            # by number
npm run demo -- --scenario refused      # by name
npm run demo -- --scenario 03-refused   # by full id
```

Adding a scenario means adding one `scripts/scenarios/<NN>-<name>.mjs` file
exporting `{ label, scenario, steps }`, numbered where it belongs in the reading
order. Without `--scenario`, the demo prompts on a terminal — type a number, a
name, or an id and press Enter, or press Enter alone for `01-all-done` — and
otherwise exits non-zero listing the ids.

A scenario's steps are `run`, `resume` and `list` invocations, each checked
against an expected exit code, interleaved with `action` steps holding whatever
setup that one scenario needs. Only `06-retry`, `14-failed-queue-scan` and
`16-checkpoint-write-failure` invoke `resume` at all; everything else is a single
invocation. A scenario whose shape is not self-evident carries a `note` the demo
prints before running, so the reason for a second invocation is on screen rather
than in the source. A scenario may also declare `pipeline` (a pipeline document
of its own, in place of the six-stage Standard one), `profile` (an execution
profile written under `profiles/`, which its `run` step then selects with
`--profile`), and `settingsStages` (per-stage binding overrides merged into the
settings document — how `18-heartbeat` shortens its interval, through the same
field a real user would set).

Each run gets a unique directory under `/tmp/antmay-demo-<scenario>-*` holding
an isolated config root, an isolated state root, and the disposable Git
repository. The config root is built from scratch out of the same documents you
would write — a `settings.json` binding every stage, the scenario's pipeline
under `pipelines/`, and its profile under `profiles/` — so the demo needs no
configuration of yours: nothing under your real config or state root is read or
written, and no run record or workspace lock of yours is touched.

The only thing the demo verifies is each invocation's exit code, reported as one
`[PASS]` or `[FAIL]` line; a `[FAIL]` skips the remaining invocations and exits
non-zero. Behavior beyond the exit code is covered by the automated suite. Every
built-CLI stream is enclosed by `ANTMAY DEMO STARTED` and `ANTMAY DEMO FINISHED`
separator lines, and an `[SETUP]` line names each action step. Pass
`--show-demo-summary` for a closing summary printing the commit list, the
working-tree state, and the paths (plus a copy-pasteable environment) you need
to keep poking at the result by hand. Pass `--no-color` to strip color from the
CLI's output and check that the rendering still reads without it.
The demo is developer-run and is not part of `npm run check` or CI.

## Manual smoke checklist

This checklist is **human-run documentation, not an automated gate and not part
of CI.** It exercises the executor against *real* agentic harnesses, so it needs
working local credentials for both Codex and Claude Code and the actual Antmay
skills installed. Run it by hand in disposable, throwaway Git repositories; the
automated `npm --prefix cli run check` suite covers everything reproducible
without paid model calls or credentials, and this checklist proves the pieces
that only a real harness can prove. Nothing here should ever run unattended in
an automated pipeline.

Work through the steps in order, checking each box as you confirm it:

1. [ ] **Build and install.** From the `cli/` directory, run `npm run check`
   and confirm it exits `0` (typecheck, tests, build). Then run `npm link`
   and confirm `antmay --version` resolves the linked binary on `PATH` and
   exits `0`. (If you prefer not to mutate global npm state, run
   `node dist/main.js --version` instead and confirm it exits `0`; the
   `npm link` path is still the documented install and should be verified at
   least once.)
2. [ ] **Create a disposable repository.** In a scratch directory, `git init` a
   throwaway repo, make an initial commit, and add a thread under
   `docs/threads/<YYMMDDHHMMSSZ-slug>/` containing a non-empty `seed.md`
   and a non-empty `decisions.md`.
3. [ ] **Commit ignore rules for the operational directories.** Add and commit a
   `.gitignore` that ignores the three thread operational directories so they
   never enter the boundary status set: `.pending-decisions/`,
   `.pending-reviews/`, and `.implementation-runs/`. Confirm `git status` is
   clean afterward.
4. [ ] **Install the Standard pipeline.** Copy the Standard pipeline document
   from "The Standard pipeline, ready to copy" above to
   `<config-root>/pipelines/standard.json`, and copy the `settings.json` example
   to `<config-root>/settings.json`, editing the models to ones your accounts can
   actually reach. Confirm `antmay afk run standard --thread <thread>` gets past
   preflight rather than reporting a rejected document.
5. [ ] **Full run through both harnesses.** Start a full run of `standard`
   against the thread and let it reach at least the second stage. With the
   settings above, the early stages contact Codex and `review-spec` contacts
   Claude Code; confirm each stage launches a real session on the harness its
   binding names.
6. [ ] **The resolved startup summary is accurate.** On that run's opening `Run
   details` block, confirm the `Pipeline:` line shows `standard` with the exact
   config-root source path, `Profile:` reads `settings only`, and every stage row
   shows the harness, model, and resolved target you expect — `spec.md` for
   `plan-strict`, `plan.md` for `reconcile-plan`.
7. [ ] **A named profile overrides the whole binding.** Write a profile like the
   `codex-planning` example above to `<config-root>/profiles/codex-planning.json`
   and start a run with `--profile codex-planning`. Confirm the summary's
   `Profile:` line names it with its source path, that the profile-bound stages
   show the profile's agent, and that every other stage still shows its settings
   agent. Repeat once with `--profile ./profiles/codex-planning.json` (an explicit
   path) and confirm it resolves the same document.
8. [ ] **Reference errors are unambiguous.** Run `antmay afk run standard.json
   --thread <thread>` and confirm it is rejected with guidance offering both
   `standard` and `./standard.json`, and that no run directory is created.
9. [ ] **Suffix run.** In a repository whose thread already holds a spec, run
   `antmay afk run standard --thread <thread> --from plan-strict`. Confirm the
   summary shows the `From:` line and only the three remaining stages, and that
   the run starts at `plan-strict` through a real harness.
10. [ ] **Streaming vs. log, side by side.** While a stage runs, watch the curated
    live terminal stream (normalized assistant text, concise tool-call lines, the
    elapsed-time heartbeat) and open the corresponding verbose attempt log under
    the run's `logs/` directory. Confirm the curated stream is readable and
    truncated for display while the attempt log holds the full verbose record,
    and that raw provider JSON never reaches the terminal.
11. [ ] **Recognized outcome advances the stage and commits the boundary.** Let a
    stage complete so the skill prints a recognized `Outcome: DONE` final line.
    Confirm the executor advanced the stage and produced the declared boundary
    commit for that stage (for the `spec` stage, a commit whose subject is
    `docs(<thread-folder>): spec`), staging only the validated thread paths.
12. [ ] **Break a contract deliberately, then repair it.** Start a run whose first
    stage is `spec` and, while that attempt is still executing, delete the
    thread's `spec.md` if the skill has already written it — or let the stage
    finish and delete the file before the next stage begins. Confirm the run
    pauses (exit `2`) reporting either `stage prerequisite unmet` or
    `promised artifact state unmet`, with the expected and observed artifact state
    listed. Restore the file yourself, confirm the worktree is otherwise clean,
    then run the printed `antmay afk resume <run-id>` and confirm the executor
    finalizes the saved stage (a contract pause) or restarts it (a prerequisite
    pause) rather than reporting the same failure again.
13. [ ] **Exercise one real pause and resume.** Mid-pipeline, drop a file into the
    thread's `.pending-decisions/` directory so the next queue gate finds it.
    Confirm the run pauses (exit `2`) and prints the pending file path, the pause
    reason, the log path, the run ID, and the exact `antmay afk resume <run-id>`
    command. Remove the pending file, then run the printed resume command and
    confirm the run continues.
14. [ ] **List shows the run.** Run `antmay afk list` and confirm the disposable
    run appears with its condition, run ID, pipeline, stage position, and paths.
    When any attempt captured a session, confirm the row's latest-session value
    is `<harness>/<session-id>` for the most recent session-carrying attempt.
15. [ ] **Native session capture and out-of-band continue.** Against whichever
    real provider a stage is bound to (`codex` or `claude-code`), start a
    disposable run and, while a stage attempt is still executing, open that
    run's `state.json` and confirm the current attempt already carries
    `agentSession.id`. Reach an attempt-backed pause (for example by leaving a
    `.pending-decisions/` bundle so the queue gate pauses after `DONE`). Confirm
    the pause prints a `Continue:` line with `codex resume '<id>'` or
    `claude --resume '<id>'` matching that ID. Paste the command in a separate
    terminal and confirm the **same** provider conversation opens. Deliberately
    commit or revert any repository changes that conversation made so the
    worktree is clean, then invoke the printed `antmay afk resume <run-id>` and
    confirm the Antmay pipeline continues. This step is human-run only — it is
    not an automated or credential-dependent gate.
