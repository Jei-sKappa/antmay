### Task 10: Implement `antmay attach`

**Objective:** Join the retained pane for an explicitly or contextually selected active/terminal run without restarting work or mutating registry state.

**Input / context:** Common adapter attachment from Task 6, registry/status data from Tasks 3 and 9, and prompt boundary from Task 8; `spec.md` §4.4 and FR-8; `decisions.md DR18` and `decisions.md DR19`.

**Steps:**
1. Replace the attach placeholder with the optional positional `[run-id]` argument and resolve explicit IDs globally without prompting.
2. When the ID is omitted, resolve cwd repository scope, filter records to panes the adapter positively reports attachable, select the sole candidate directly, and use a transient picker only when several candidates exist on a TTY.
3. For zero candidates or non-interactive ambiguity, fail with an exact `antmay attach <run-id>` re-invocation hint; do not choose by recency.
4. Permit both active runs and terminal runs whose retained pane remains available, including terminal records excluded from the active-run spawn guard.
5. Delegate attachment through the record's adapter and opaque handle; on missing run or unavailable pane, return non-zero while preserving classification, reason, handle, worker data, and all other registry bytes.
6. Ensure attachment never restarts the harness, sends skill input, resolves pending bundles, creates another run, or introduces pane cleanup/expiry behavior.
7. Add tests for explicit active/terminal IDs, sole contextual selection, multi-run TTY selection, non-interactive ambiguity, zero/missing/unavailable panes, adapter delegation, and byte-for-byte registry non-mutation.

**Files modified:**
- `packages/cli/src/attach/select-run.ts` (NEW)
- `packages/cli/src/commands/attach.ts` (NEW)
- `packages/cli/src/program.ts`
- `packages/cli/test/attach-selection.test.ts` (NEW)
- `packages/cli/test/attach-command.test.ts` (NEW)

**Verification:** `bun run test -- packages/cli/test/attach-selection.test.ts packages/cli/test/attach-command.test.ts`, `bun run build`, `bun run typecheck`, and `bun run check` all exit 0; `node packages/cli/dist/index.js attach --help` shows only optional `[run-id]` input and no cleanup/expiry option.

**Acceptance criteria:**
- Explicit IDs attach active and retained terminal panes non-interactively.
- Omitted IDs select one cwd-scoped attachable run, prompt among several only on TTY, and otherwise fail with an exact explicit-ID hint.
- Missing or unavailable panes fail honestly and leave the complete registry record unchanged.
- Attachment shares the adapter operation used by `spawn --attach` and performs no restart, outcome, bundle, or cleanup mutation.
- No v0 command automatically closes, expires, or cleans a pane.

**Consumes:** `attachRun()`, `FilesystemRegistryStore`, `PromptProvider`, adapter liveness, and canonical cwd repository resolution from Tasks 3, 4, 6, 8, and 9.

**Produces:** fully operational `antmay attach [run-id]` command and contextual run-selection logic.
