# Task 15: `antmay afk list`

**Objective:** Implement the read-only `list` command: independent checkpoint reads, `updatedAt`-descending sorting, friendly condition rendering, corrupt-checkpoint warnings, and the documented exit codes.

**Input / context:** `spec.md` §"Listing runs"; `decisions.md DR38` (columns, sorting, warning-plus-partial-output, exit codes, no locks, no mutation), `DR42` (absent state/runs directories are "no runs", never created), `DR15` (no other lifecycle commands). Consumes the state modules from Task 5 and the display's color discipline from Task 11.

**Steps:**

1. Create `cli/src/commands/list.ts` exporting `listCommand(deps: { env: NodeJS.ProcessEnv; homedir: string | undefined; stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream; isTTY: boolean }): Promise<number>`.
2. Implement: resolve roots; if `runsDirectory(stateRoot)` does not exist or has no run directories, print `No AFK runs found.` and return `0` without creating anything; otherwise read each immediate subdirectory independently (`readCheckpoint` + `validateCheckpoint`), ignoring unrelated non-directory entries; each malformed or unreadable checkpoint emits a stderr warning naming the directory, the `state.json` path, and the validation error, while valid rows still print.
3. Render valid runs sorted by `updatedAt` descending, one row each: updated time, friendly condition (`Ready`, `Waiting for user`, `Completed`, `Executing (unverified)`), run ID, recipe name, one-based stage position plus stage ID, current harness/model, absolute repository path, repository-relative thread path. Completed runs show the final stage count (e.g. `6/6`) and no harness/model. Optional color only when TTY and `NO_COLOR` is unset, carrying no meaning. Acquire no lock; write no file.
4. Return `1` when any checkpoint warning was emitted, else `0`.
5. Wire the real handler in `cli/src/main.ts` (replace the `list` placeholder).
6. Add `cli/src/commands/list.test.ts` with fixture state directories: absent state root and absent/empty runs dir → `No AFK runs found.`, exit `0`, nothing created (AC-2.4); multiple valid runs sorted by `updatedAt` descending with all columns and friendly conditions; a completed run's row shape; one corrupt `state.json` → stderr warning with directory/path/error, other rows printed, exit `1` (AC-16.3); stray non-directory entries ignored; no lock file appears during listing.

**Files modified:** `cli/src/commands/list.ts` (NEW), `cli/src/main.ts`, `cli/src/commands/list.test.ts` (NEW)

**Verification:** `npm --prefix cli run check` exits 0; `npm --prefix cli run test -- src/commands/list.test.ts` exits 0. Manual smoke: `ANTMAY_STATE_HOME=$(mktemp -d)/nowhere node cli/dist/main.js afk list` prints `No AFK runs found.`, exits `0`, and creates no directory (`test ! -d` the path).

**Acceptance criteria:**

- AC-16.1: independent reads, `updatedAt`-descending sort, no locks, no writes.
- AC-16.2: documented columns and condition renderings; completed rows show final stage count and no harness/model.
- AC-16.3: per-corruption stderr warnings with partial output and exit `1`; clean listings exit `0`; TTY-only color honoring `NO_COLOR`.
- AC-2.4: absent directories mean "no runs", exit `0`, nothing created.

**Consumes:** `resolveRoots` (Task 2); `runsDirectory`, `readCheckpoint`, `validateCheckpoint` (Task 5); color/stream conventions (Task 11); `runMain` handler seam (Task 1).

**Produces:** `listCommand(deps): Promise<number>` from `cli/src/commands/list.ts`; the wired `list` handler in `cli/src/main.ts` — with this task all three `CommandHandlers` placeholders are gone.
