# Plan: AFK Workflow Executor CLI (v0)

Build the strict, non-interactive `antmay afk` CLI as a self-contained Node/TypeScript package under `cli/`: a generic recipe runner that executes the built-in six-stage `standard` recipe unattended against one selected thread through Codex or Claude Code (via Sandcastle 0.12.0 behind an Antmay-owned adapter), with durable checkpoints, workspace locking, pending-queue gating, per-stage Git-boundary enforcement and executor commits, durable pause/resume, and run listing.

The plan proceeds bottom-up: package scaffold and CLI grammar first, then the pure foundations (config, recipe model, thread resolution), the durable-state primitives (checkpoints, logs, locks, queue scans), the harness adapter, the pure decision engines (outcome parsing, result classification, Git boundaries), and finally the orchestrating runner, the terminal display, the three commands, signal handling, and a verification closeout. Every task adds its own Vitest coverage using injected fakes and disposable fixtures — never real model calls — and keeps `npm --prefix cli run check` green.

Decision citations of the form `decisions.md DR<N>` refer to the thread's settled decision log; `spec.md` is the authoritative statement of behavior and acceptance. The module layout below is this plan's concrete choice within the spec's degree of freedom 1; each task file names its exact paths.

```
cli/src/
├── main.ts          thin entry (Node guard, wiring)
├── cli/             parseArgs grammar, help/version, exit codes
├── config/          config/state roots, settings validation
├── recipe/          recipe types, built-in standard, targets, profiles
├── thread/          --thread resolution, genesis validation, queue scans
├── gitops/          git process helper, boundary status, boundary engine
├── harness/         HarnessInvoker interface, prompt rendering, Sandcastle adapter, version probe
├── state/           checkpoint schema, atomic persistence, run dirs, attempt logs, locks
├── workspace/       current-checkout workspace strategy
├── runner/          outcome parsing, classification, stage loop, signals
├── display/         Display interface, terminal renderer
└── commands/        run, resume, list implementations
```

Source: spec.md

## Global Constraints

- **Placement (DR17):** the executor is a self-contained private Node/TypeScript package under `cli/`, with its own `package.json`, lockfile, TypeScript configuration, source, tests, build output, dependencies, and the `antmay` binary mapping. The repository root does not become an npm workspace. Development commands run from `cli/` or via `npm --prefix cli …`; local install is `npm link` from `cli/`.
- **Toolchain (DR33):** Node.js ≥ 22, ESM, strict TypeScript, `tsup` for the executable entry (built shebang entry exposed as `antmay`), Vitest for tests, npm with a package-local lockfile. Command parsing uses Node's `util.parseArgs`; state, lock, hashing, signal, and path behavior use built-in Node APIs; settings and checkpoint schemas use manual typed validators. Sandcastle is pinned to exactly `0.12.0`. No CLI, logging, configuration, database, schema, or dependency-injection framework is added. Package scripts: `build`, `typecheck`, `test`, and `check` (typecheck + tests + build).
- **Git access:** thread resolution, boundary inspection, and commits are Git-backed via the user's `git` executable through built-in process APIs — successful thread resolution is what establishes Git availability (DR47, DR48); no Git library dependency is introduced (DR33).
- **Architecture (DR46):** binding dependency directions — command dispatch must not own workflow behavior; the runner must consume resolved recipe and stage data without branching on `standard` or individual skill names; Sandcastle-specific types and behavior must remain behind the harness adapter; persistent-state, queue-gate, and terminal-display concerns must not be conflated. Prefer plain typed functions; inject only unstable boundaries needed for deterministic tests; no DI framework, repository abstraction, or class hierarchy.
- **Platform (DR25):** support is claimed and tested on macOS only. Platform-neutral Node APIs may be used where convenient, but Linux and Windows behavior is incidental and undocumented.
- **Privacy (DR27):** state directories mode `0700`; checkpoints and attempt logs mode `0600`.
- **Safety:** the default permission policy is AI-mediated; unrestricted host access requires the explicit `--dangerously-skip-permissions` flag and a prominent warning (DR8, DR43). The executor runs unsandboxed in the user's checkout (DR1) and never pushes, amends, rebases, rewrites history, or bypasses hooks (DR49).
- **Skill suite:** invoked skills are the installed Antmay skills; the executor treats their availability and behavior as the harness's concern and captures their failures through the normal stage gate (DR23, DR31).

## Tasks

1. **Package scaffold and CLI grammar** — create the `cli/` package (toolchain, scripts, bin) and the strict `util.parseArgs` grammar with help/version and exit-code constants. → `plan-tasks/01-package-scaffold-and-cli-grammar.md`
2. **Config/state roots and settings validation** — resolve config/state roots with documented precedence and load/validate `settings.json` as strict JSON, plus the copyable settings example doc. → `plan-tasks/02-config-roots-and-settings.md`
3. **Recipe model, standard recipe, profiles, prompt rendering** — serializable stage descriptors, the built-in `standard` recipe with Git policies and queue-resolution behaviors, target resolution, execution-profile resolution, and per-harness prompt rendering. → `plan-tasks/03-recipe-model-and-prompt-rendering.md`
4. **Thread-target resolution** — the Git process helper plus `--thread` resolution in all three forms with canonicalization, containment checks, and seed/decision genesis validation. → `plan-tasks/04-thread-resolution.md`
5. **Checkpoint schema, atomic persistence, run IDs, attempt logs** — `state.json` schema v1 with manual validators, atomic writes, run-ID generation and exclusive run directories, exclusive attempt logs with the required header. → `plan-tasks/05-checkpoint-and-attempt-logs.md`
6. **Workspace strategy, locking, queue scanning** — the `current-checkout` workspace strategy, the sha256 workspace lock with owner-token release, and the pending-queue scanner. → `plan-tasks/06-workspace-lock-and-queue-scan.md`
7. **Sandcastle adapter and harness probe** — the Antmay-owned `HarnessInvoker` boundary, the Sandcastle 0.12.0-backed implementation with exact option mapping and permission policies, and the `--version` executable preflight. → `plan-tasks/07-sandcastle-adapter-and-harness-probe.md`
8. **Outcome parsing and result classification** — the authoritative `Outcome:` final-line parser and the pure classification-precedence function over queues, errors, and outcomes. → `plan-tasks/08-outcome-parsing-and-classification.md`
9. **Git boundary engine** — boundary status collection, declarative policy evaluation (HEAD rule, selectors, change requirement), and boundary finalization with exact-subject executor commits. → `plan-tasks/09-git-boundary-engine.md`
10. **Stage runner** — the generic recipe-agnostic stage loop: attempt lifecycle, queue gates, boundary finalization, classification, checkpoint transitions, pauses, and the `Display` interface it emits to. → `plan-tasks/10-stage-runner.md`
11. **Terminal display** — the terminal implementation of `Display`: startup summaries, permission warnings, live view, heartbeat, pause/completion rendering, color and stream rules. → `plan-tasks/11-terminal-display.md`
12. **`antmay afk run`** — the full ordered preflight, run allocation under the lock, and end-to-end wiring of the runner with real dependencies. → `plan-tasks/12-run-command.md`
13. **Signal handling** — SIGINT/SIGTERM/SIGHUP: abort the active attempt, persist interruption, release the lock, exit with conventional codes. → `plan-tasks/13-signal-handling.md`
14. **`antmay afk resume`** — checkpoint revalidation, per-kind resume behavior including declared queue-resolution advance/rerun and harness-free boundary finalization, then continuation through the snapshot. → `plan-tasks/14-resume-command.md`
15. **`antmay afk list`** — read-only run listing with sorting, friendly conditions, corrupt-checkpoint warnings, and exit codes. → `plan-tasks/15-list-command.md`
16. **Smoke checklist and verification closeout** — the documented manual real-harness checklist, the FR-20 coverage audit, architectural-boundary checks, and the final whole-package gate. → `plan-tasks/16-smoke-checklist-and-closeout.md`
