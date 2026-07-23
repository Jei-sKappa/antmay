# Task 13: Signal handling

**Objective:** Handle `SIGINT`, `SIGTERM`, and `SIGHUP` gracefully: stop scheduling, abort the active attempt, persist interruption durably, release the lock, and exit with the conventional codes — with an immediate hard path on a second signal.

**Input / context:** `spec.md` §"Signals and interruption"; `decisions.md DR40` (first/second-signal behavior, conventional codes, pre-checkpoint behavior, abort classified as interruption), `DR26` (attempt finished as `interrupted`), `DR16` (hard kills stay manual recovery). Builds on the runner's `AbortSignal` plumbing (Task 10 — the aborted category maps to waiting kind `interrupted`) and the `run` command wiring (Task 12).

**Steps:**

1. Create `cli/src/runner/signals.ts` exporting `installSignalHandlers(deps: { abort: AbortController; stderr: NodeJS.WritableStream }): SignalState` where `SignalState = { signaled: () => NodeJS.Signals | null; exitCodeFor: (sig: NodeJS.Signals) => number; uninstall: () => void }`: register `process.on` handlers for the three signals; the first signal writes a brief notice to stderr, records the signal, and calls `abort.abort(new SignalInterruption(sig))` (a typed reason class); a second signal during cleanup calls `process.exit` immediately with the conventional code (`130`/`143`/`129`). Export the `SignalInterruption` reason type.
2. In `cli/src/runner/runner.ts`, complete the interruption classification: when an attempt fails with category `aborted` and the abort reason is a `SignalInterruption`, finish the attempt as `interrupted` and persist `waiting-for-user` with kind `interrupted`, `diagnostics.origin` recording the signal name; never classify it as `harness-error`; never start a new attempt or stage once the context signal is aborted (check at the top of the loop and between attempt settle and next stage).
3. In `cli/src/commands/run.ts`, wire the controller: install handlers before preflight; a signal arriving before the initial checkpoint exists makes the command return the signal's exit code without creating a run (check `signaled()` at the allocation boundary and before launching the runner); after the runner settles due to interruption, release the lock, then return `exitCodeFor(sig)`; in `ready` condition between stages the durable cursor is left unchanged (the runner's loop-top signal check returns a paused-by-signal result without touching the checkpoint condition beyond what the settled attempt already persisted). Uninstall handlers on the way out.
4. Add `cli/src/runner/signals.test.ts` (in-process: fabricate the controller and assert first-signal abort + recorded signal, exit-code mapping, reason typing) and extend `cli/src/runner/runner.test.ts` with: a hang-until-abort fake-harness attempt aborted mid-flight → attempt `interrupted`, run `waiting-for-user` kind `interrupted` with signal origin, files/logs preserved, no further attempt started (AC-17.1, AC-17.3); abort between stages in `ready` → checkpoint untouched. Extend `cli/src/commands/run.test.ts` with a pre-checkpoint abort → no run directory created and the signal exit code returned (AC-17.2 first half). Cover the second-signal immediate-exit path in `signals.test.ts` by stubbing `process.exit`.

**Files modified:** `cli/src/runner/signals.ts` (NEW), `cli/src/runner/runner.ts`, `cli/src/commands/run.ts`, `cli/src/runner/signals.test.ts` (NEW), `cli/src/runner/runner.test.ts`, `cli/src/commands/run.test.ts`

**Verification:** `npm --prefix cli run check` exits 0; `npm --prefix cli run test -- src/runner src/commands` exits 0. Manual smoke: start a run against a script-backed fake `PATH` harness that sleeps, press Ctrl-C once, observe exit code `130` (`echo $?`), a `waiting-for-user` checkpoint with kind `interrupted`, and no leftover lock file.

**Acceptance criteria:**

- First signal during an executing attempt: abort, attempt `interrupted`, run `waiting-for-user`, lock released, conventional exit code (AC-17.1).
- Signal before the initial checkpoint: exit without a run; second signal: immediate exit with the conventional code and no further cleanup guarantees (AC-17.2).
- Abort rejections are classified as interruption, never `harness-error`; nothing new starts after the first signal (AC-17.3).

**Consumes:** `executeRun` and its `AbortSignal` plumbing plus the fake harness's hang-until-abort mode (Task 10); `runCommand` wiring (Task 12); exit-code constants (Task 1).

**Produces:** `installSignalHandlers(deps): SignalState` and the `SignalInterruption` abort-reason class from `cli/src/runner/signals.ts`; interruption-complete runner and `run` command behavior that Task 14's resume relies on (abandoned `executing` checkpoints, `interrupted` waiting kind).
