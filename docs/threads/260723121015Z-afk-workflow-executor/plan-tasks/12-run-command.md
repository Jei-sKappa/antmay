# Task 12: `antmay afk run`

**Objective:** Implement the `run` command end-to-end: the complete ordered preflight, run allocation under the workspace lock, checkpoint snapshotting, and delegation to the stage runner — wired into the real binary.

**Input / context:** `spec.md` §"Creating a run" (preflight order 1–8, allocation sequence, failure semantics), §"Execution-profile resolution" (snapshotting), and the exit-code table; `decisions.md DR37` (complete preflight before allocation; failure semantics), `DR55` (unfinished same-thread-run guard), `DR49` (clean-worktree start), `DR44` (queue recheck under lock), `DR5`/`DR12` (immutable snapshot), `DR23`/`DR48` (harness preflight), `DR22` (final output names run ID and condition). Composes everything from Tasks 1–11. The command takes an injected dependency bag so end-to-end tests run with the fake harness and fake probes; `main.ts` wires the real ones.

**Steps:**

1. Create `cli/src/commands/run.ts` exporting `runCommand(args: { recipe: string; thread: string; dangerouslySkipPermissions: boolean }, deps: RunDeps): Promise<number>` (the exit code) with `type RunDeps = { env: NodeJS.ProcessEnv; cwd: string; homedir: string | undefined; invoker: HarnessInvoker; probe: typeof probeHarnessExecutables; stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream; isTTY: boolean; clock?: () => Date; signal: AbortSignal }` (`noColor` derives from `env.NO_COLOR`).
2. Implement preflight in the spec's order, every failure printing to stderr and returning `1` with no run directory, no checkpoint, and no held lock:
   1. arguments are already grammar-validated by Task 1's parser — validate only recipe existence here: `builtInRecipes[args.recipe]` or fail naming known recipes;
   2. thread resolution via `resolveThreadTarget` (includes genesis validation);
   3. roots via `resolveRoots`, settings via `loadSettings(configRoot, knownStageIds(builtInRecipes))`; resolve every stage target (`resolveStageTarget`) and profile (`resolveStageProfiles`), building the `SnapshottedStage[]`;
   4. harness preflight: `probe` over the distinct harnesses in the resolved profiles, keeping the returned version lines;
   5. clean worktree via `isWorktreeClean(repoRoot)` (boundary status set) or fail;
   6. queue check via `scanPendingQueues` — non-empty or scan error both exit `1` here (preflight, no run);
   7. unfinished-run guard: scan `runsDirectory(stateRoot)` (absent → no runs, do not create); for each entry `readCheckpoint`; a corrupt/unreadable checkpoint prints a stderr warning and does not block; a run with condition ≠ `completed` whose `workspace.path` and `threadRelPath` both match refuses with exit `1`, naming its run ID, condition, exact resume command, and the manual remedy of deleting its run directory if abandoned.
3. Implement allocation, only after all preflight passes: resolve `resolveCurrentCheckoutWorkspace(repoRoot)`; generate the run ID and acquire the lock via `acquireWorkspaceLock` (contention prints the lock's metadata and exact path, exits `1`); **re-scan both queues under the lock** — a file that appeared releases the lock and exits `1` with no run; `allocateRunDirectory`; build the initial `RunCheckpoint` (condition `ready`, `stageIndex 0`, empty attempts, `waiting: null`, the full snapshot, `dangerouslySkipPermissions`, workspace config, timestamps) and `writeCheckpoint`. A run-directory or initial-checkpoint failure releases the lock, identifies any partial path, exits `1`, launches nothing.
4. After the initial checkpoint exists: print the run summary via `printRunSummary` (with the unrestricted warning when applicable), then call `executeRun` with the real terminal display, the injected invoker, the probed `harnessVersions`, and the abort signal; map `RunnerResult` to exit codes — `completed` → `0`, `paused` → `2`, `fatal-checkpoint` → stderr report and `1`; release the lock in a `finally`. The final printed line names the run ID and its condition; waiting output includes the reason and exact resume command (already rendered by `runPaused`).
5. Wire the real handler in `cli/src/main.ts`: replace the `run` placeholder with a call to `runCommand` using `createSandcastleInvoker()`, `probeHarnessExecutables`, real streams/TTY/`NO_COLOR`, `process.env`, `process.cwd()`, `os.homedir()`.
6. Add `cli/src/commands/run.test.ts` driving `runCommand` directly with the fake harness on the repo fixture: happy path to completion (exit `0`, six commits per policy on a scripted all-DONE standard run — or use a synthetic recipe for speed plus one standard-shape run); each preflight failure (bad recipe, bad thread, missing/invalid settings, failed probe, dirty worktree, pending file, queue-read error, existing unfinished run, lock contention) exits `1` and leaves no `afk-runs` entry, no lock file (AC-7.1); the under-lock queue re-check race (drop a file between first scan and lock via a hook in deps or by pre-acquiring the lock briefly) prevents creation (AC-7.4); settings edited after creation don't change the snapshot mid-run (AC-4.2 creation half); corrupt sibling checkpoint warns without blocking (AC-7.6); pause path exits `2` with resume command printed.

**Files modified:** `cli/src/commands/run.ts` (NEW), `cli/src/main.ts`, `cli/src/commands/run.test.ts` (NEW)

**Verification:** `npm --prefix cli run check` exits 0; `npm --prefix cli run test -- src/commands` exits 0. Manual smoke: in a disposable repo with a thread, `ANTMAY_STATE_HOME=$(mktemp -d) ANTMAY_CONFIG_HOME=<dir-with-settings> node cli/dist/main.js afk run standard --thread <t>` fails at harness preflight (exit `1`) when `codex`/`claude` are absent from a stripped `PATH`, leaving the state dir empty.

**Acceptance criteria:**

- Preflight order and failure semantics match AC-7.1–AC-7.6 (no run, no lock, aggregate harness reporting, guard messaging, warn-don't-block on corrupt checkpoints).
- The initial checkpoint is `ready`, snapshot-complete, and written before any harness launch; the queue check repeats under the lock (AC-7.4, AC-7.5).
- Exit codes: `0` full completion, `2` durable waiting, `1` everything preflight/fatal (AC-1.3 for `run`).
- Dispatch stays thin: `commands/run.ts` owns the workflow; `main.ts` only wires dependencies (AC-19.4).

**Consumes:** `parseCliArguments`/`runMain`/exit codes (Task 1); `resolveRoots`, `loadSettings` (Task 2); `builtInRecipes`, `knownStageIds`, `resolveStageTarget`, `resolveStageProfiles` (Task 3); `resolveThreadTarget`, `createRepoFixture` (Task 4); checkpoint/persist/runs/logs (Task 5); workspace, lock, queues (Task 6); `createSandcastleInvoker`, `probeHarnessExecutables` (Task 7); `executeRun`, fake harness (Task 10); `createTerminalDisplay`, `printRunSummary` (Task 11).

**Produces:** `runCommand(args, deps): Promise<number>` and `RunDeps` from `cli/src/commands/run.ts`; the wired `run` handler in `cli/src/main.ts`; the working `antmay afk run` path Tasks 13–14 extend.
