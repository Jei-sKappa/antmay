# antmay

`antmay` is a strict, non-interactive command-line executor that drives the
Modular Agentic Workflow unattended: it runs a built-in recipe stage by stage
against one selected thread through an agentic harness, with durable
checkpoints, workspace locking, and per-stage Git boundaries.

> **Platform support (v0):** macOS only. The executor uses platform-neutral
> Node APIs where convenient, but Linux and Windows behavior is incidental and
> undocumented.

## Settings

Settings are read from `~/.config/antmay/settings.json` (the resolved default
path). The executor never creates this file for you. It is optional strict
JSON: every field is validated exhaustively, unknown fields are rejected, and
all problems are reported together.

Copy the following complete example to get started:

```json
{
  "afk": {
    "defaults": {
      "harness": "codex",
      "model": "gpt-5-codex"
    },
    "stages": {
      "implement-plan-with-subagents": {
        "prompt": "Prefer small, well-tested changes.",
        "idleTimeoutSeconds": 3600
      }
    }
  }
}
```

- `afk.defaults` applies to every stage; `afk.stages.<stage-id>` overrides it
  for one stage. Both may be omitted or left empty.
- A profile may contain only `harness`, `model`, `prompt`,
  `idleTimeoutSeconds`, and `heartbeatSeconds`. `harness` is `codex` or
  `claude-code`; `model` is a non-empty string; `prompt` is a string; the two
  duration fields are positive finite integers.
- `heartbeatSeconds` sets how often a live attempt prints that it is still
  working, and defaults to `300`. Lower it to keep a quiet unattended run
  visibly alive; raise it to keep long runs out of a CI log.
- Stage overrides use the exact stage IDs from the selected recipe. The
  built-in `standard` recipe ends with `implement-plan-with-subagents`; its
  `prompt` is appended to that skill invocation. This unattended recipe uses
  the subagent implementation variant in place of the human-run Standard
  workflow's `implement-plan` step.
- Settings perform no environment interpolation and store no credentials.

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

## Scripted demo

`npm run demo` drives the built CLI through the Standard recipe without
contacting Codex or Claude Code, so you end up with a real disposable
repository and run directory to inspect. It runs `npm run build` without tests,
then executes the scenario you pick.

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
routinely, then the ways a stage fails, then the rare and the cosmetic. `--list`
prints them all:

| Scenario | Ends on |
| --- | --- |
| `01-all-done` | `SUCCESS` after six clean stages |
| `02-blocked` | the `BLOCKED` banner |
| `03-refused` | the `REFUSED` banner |
| `04-waiting-for-user` | `WAITING FOR USER` and its pending list |
| `05-multiple-reasons` | two stacked reason banners under a `2 reasons` header |
| `06-retry` | a resumed stage's `· attempt 2` header, then `SUCCESS` |
| `07-failed-no-outcome` | `FAILED — no terminal outcome`, quoting the offending line |
| `08-failed-harness-error` | `FAILED — harness error` |
| `09-failed-idle-timeout` | `FAILED — idle timeout` |
| `10-failed-git-policy` | `FAILED — git policy violation` |
| `11-failed-commit` | `FAILED — commit failed` |
| `12-failed-queue-scan` | `FAILED — queue scan error` |
| `13-interrupted` | `INTERRUPTED`, after a signal lands mid-stage |
| `14-checkpoint-write-failure` | `FAILED — checkpoint write` |
| `15-permissions-warning` | a clean run opening on the boxed unrestricted warning |
| `16-heartbeat` | the repeating `· still working` line |
| `17-long-content` | oversized reasons, paths and tool arguments |
| `18-list` | `afk list`, one row per condition, sorted newest first |

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
setup that one scenario needs. Only `06-retry`, `12-failed-queue-scan` and
`14-checkpoint-write-failure` invoke `resume` at all; everything else is a single
invocation. A scenario whose shape is not self-evident carries a `note` the demo
prints before running, so the reason for a second invocation is on screen rather
than in the source. A scenario may also declare `settingsDefaults`, merged over
`afk.defaults` in the copied settings file — how `16-heartbeat` shortens its
interval, using the same field a real user would set.

Each run gets a unique directory under `/tmp/antmay-demo-<scenario>-*` holding
an isolated config root, an isolated state root, and the disposable Git
repository. Your real `settings.json` is copied into that config root so the
demo exercises your own harness and model profiles; nothing under your real
config or state root is written, and no run record or workspace lock of yours is
touched.

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
   throwaway repo, make an initial commit, and add a Standard-shaped thread
   under `docs/threads/<YYMMDDHHMMSSZ-slug>/` containing a non-empty `seed.md`
   and a non-empty `decisions.md`.
3. [ ] **Commit ignore rules for the operational directories.** Add and commit a
   `.gitignore` that ignores the three workflow operational directories so they
   never enter the boundary status set: `.pending-decisions/`,
   `.pending-reviews/`, and `.implementation-runs/`. Confirm `git status` is
   clean afterward.
4. [ ] **Provide a minimal settings file.** Write a minimal, valid
   `settings.json` at the resolved config path (see "Settings" above) — at least
   `afk.defaults.harness` and `afk.defaults.model` — and confirm preflight
   accepts it.
5. [ ] **Real run through Codex.** In a fresh disposable run, invoke at least one
   installed skill through the Codex harness (for example, the `spec` stage with
   `afk.defaults.harness` set to `codex`) via
   `antmay afk run standard --thread <thread>`. Confirm the stage actually
   launches a real Codex session.
6. [ ] **Real run through Claude Code.** In a *separate* disposable run (a fresh
   repo or a reset checkout), invoke at least one installed skill through the
   Claude Code harness (for example, `spec` with `afk.defaults.harness` set to
   `claude-code`). Confirm the stage launches a real Claude Code session.
7. [ ] **Streaming vs. log, side by side.** While a stage runs, watch the curated
   live terminal stream (normalized assistant text, concise tool-call lines, the
   elapsed-time heartbeat) and open the corresponding verbose attempt log under
   the run's `logs/` directory. Confirm the curated stream is readable and
   truncated for display while the attempt log holds the full verbose record,
   and that raw provider JSON never reaches the terminal.
8. [ ] **Recognized outcome advances the stage and commits the boundary.** Let a
   stage complete so the skill prints a recognized `Outcome: DONE` final line.
   Confirm the executor advanced the stage and produced the declared boundary
   commit for that stage (for the `spec` stage, a commit whose subject is
   `docs(<thread-folder>): spec`), staging only the validated thread paths.
9. [ ] **Exercise one real pause and resume.** Mid-recipe, drop a file into the
   thread's `.pending-decisions/` directory so the next queue gate finds it.
   Confirm the run pauses (exit `2`) and prints the pending file path, the pause
   reason, the log path, the run ID, and the exact `antmay afk resume <run-id>`
   command. Remove the pending file, then run the printed resume command and
   confirm the run continues.
10. [ ] **List shows the run.** Run `antmay afk list` and confirm the disposable
    run appears with its condition, run ID, recipe, stage position, and paths.
