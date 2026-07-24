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
      "implement": {
        "prompt": "Prefer small, well-tested changes.",
        "idleTimeoutSeconds": 3600
      }
    }
  }
}
```

- `afk.defaults` applies to every stage; `afk.stages.<stage-id>` overrides it
  for one stage. Both may be omitted or left empty.
- A profile may contain only `harness`, `model`, `prompt`, and
  `idleTimeoutSeconds`. `harness` is `codex` or `claude-code`; `model` is a
  non-empty string; `prompt` is a string; `idleTimeoutSeconds` is a positive
  finite integer.
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

1. [ ] **Build and install.** From `cli/`, run `npm --prefix cli run check` and
   confirm it exits `0` (typecheck, tests, build). Then run `npm link` from
   `cli/` and confirm `antmay --version` resolves the linked binary on `PATH`
   and exits `0`. (If you prefer not to mutate global npm state, run
   `node cli/dist/main.js --version` instead and confirm it exits `0`; the
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
