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
