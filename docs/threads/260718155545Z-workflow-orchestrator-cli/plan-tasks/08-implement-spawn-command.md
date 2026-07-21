### Task 8: Implement `antmay spawn`

**Objective:** Deliver the complete interactive and non-interactive spawn transaction from input gathering through durable pane, run binding, observer startup, and optional attachment.

**Input / context:** Tasks 1–7 outputs; `spec.md` §4.1 and FR-2 through FR-4; `decisions.md DR6`, `decisions.md DR10`–`DR16`, `decisions.md DR19`, `decisions.md DR20`, `decisions.md DR23`, and `decisions.md DR24`.

**Steps:**
1. Replace the spawn placeholder with typed Commander options for `--thread`, `--skill`, `--harness`, `--adapter`, `--request`, `--attach`, and `--force`, preserving the exact non-interactive command shape.
2. Add an injectable transient-prompt interface that gathers missing thread, skill, harness, and adapter values only on a TTY, prompts for request only when the selected catalog entry requires one, and prompts for active-run confirmation only when needed.
3. Make non-interactive missing values, empty required request, forbidden request, and active-run ambiguity fail with named flags and exact remediation without invoking any launch side effect.
4. Run the normalized preflight, then launch the harness pane, register the complete binding, and start the detached observer in that order; return success only when all three durable components exist.
5. If registration or worker startup fails after pane creation, return non-zero with the retained pane handle and never print a successful run result; do not close or mutate the pane.
6. Implement `--force` as permission for an additional active record without modifying the prior run, and scope the guard by canonical repository folder/worktree.
7. Print the stable public run ID plus attach information after a detached success; for `--attach`, call the common Task 6 attachment operation only after successful registration and worker startup.
8. Add command-level tests for complete non-prompting input, every prompt branch, request postures, preflight failures, guard confirmation/force behavior, successful ordering, partial failures, literal invocation, and immediate attachment.

**Files modified:**
- `packages/cli/src/commands/spawn.ts` (NEW)
- `packages/cli/src/prompts.ts` (NEW)
- `packages/cli/src/program.ts`
- `packages/cli/test/spawn-command.test.ts` (NEW)
- `packages/cli/test/spawn-transaction.test.ts` (NEW)

**Verification:** `bun run test -- packages/cli/test/spawn-command.test.ts packages/cli/test/spawn-transaction.test.ts`, `bun run build`, `bun run typecheck`, and `bun run check` all exit 0; `node packages/cli/dist/index.js spawn --help` lists exactly the specified flags.

**Acceptance criteria:**
- TTY invocations prompt only for missing values and required requests; fully flagged invocations never prompt.
- Non-interactive missing/rejected input and every preflight failure create no pane, run, or worker.
- A successful detached spawn returns only after pane creation, complete registration, and observer startup and prints the stable run ID.
- Active-run confirmation and `--force` follow the repository-folder guard without altering existing runs.
- Post-pane failures identify the retained pane and never report success.
- `spawn --attach` delegates to the same attachment implementation as `attach <run-id>`.

**Consumes:** `createProgram()`, `preflightSpawn()`, `HerdrAdapter`, harness launchers, `FilesystemRegistryStore`, `launchObserver()`, and `attachRun()` from Tasks 1–7.

**Produces:** fully operational `antmay spawn` command and its normalized success/error output contract.
