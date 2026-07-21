### Task 6: Implement the herdr and harness execution boundaries

**Objective:** Launch and attach durable interactive harness sessions through a thin external herdr adapter while preserving native skill identity, literal request input, and harness-specific session binding.

**Input / context:** Normalized preflight requests from Task 4 and transcript identity requirements from Task 5; `spec.md` §3.3, §4.1, §4.4, FR-3, and FR-10; `decisions.md DR1`–`DR3`, `decisions.md DR14`, `decisions.md DR19`, `decisions.md DR20`, and `decisions.md DR22`–`DR24`.

**Steps:**
1. Define the CLI-owned `ExecutionAdapter` surface for spawn, send, read, liveness, enumerate, and attach with opaque handles and optional observation enrichments; keep detection and registry mutation out of it.
2. Implement `HerdrAdapter` exclusively through the injectable external `ANTMAY_HERDR_BIN` process boundary, passing argv without a shell and returning precise retained-pane diagnostics after partial failures.
3. Render the initial skill invocation from the fixed catalog identity, canonical thread path, and permitted literal request so request text cannot replace the skill or execute as a shell fragment.
4. Implement Claude launch with a generated UUID passed through `--session-id` and a pinned session binding; implement Codex launch with recorded canonical cwd/spawn time and a heuristic session binding without claiming a deterministic ID.
5. Start both harnesses in the canonical repository cwd with their configured permission behavior unchanged and with transcript/session roots injectable for later observation.
6. Implement one common `attachRun(adapter, handle)` operation that `spawn --attach` and the public attach command can both call, leaving classification and stored handles untouched on failure.
7. Add tests using scripted process responses to assert exact argv/cwd/environment boundaries, request literalness, Claude/Codex identity differences, herdr arm's-length execution, adapter liveness, retained-pane diagnostics, and common attach delegation.

**Files modified:**
- `packages/cli/src/adapters/types.ts` (NEW)
- `packages/cli/src/adapters/herdr.ts` (NEW)
- `packages/cli/src/harnesses/invocation.ts` (NEW)
- `packages/cli/src/harnesses/claude.ts` (NEW)
- `packages/cli/src/harnesses/codex.ts` (NEW)
- `packages/cli/src/harnesses/index.ts` (NEW)
- `packages/cli/src/attach/operation.ts` (NEW)
- `packages/cli/test/herdr-adapter.test.ts` (NEW)
- `packages/cli/test/harness-invocation.test.ts` (NEW)
- `packages/cli/test/harness-launch.test.ts` (NEW)
- `packages/cli/test/attach-operation.test.ts` (NEW)

**Verification:** `bun run test -- packages/cli/test/herdr-adapter.test.ts packages/cli/test/harness-invocation.test.ts packages/cli/test/harness-launch.test.ts packages/cli/test/attach-operation.test.ts`, `bun run build`, `bun run typecheck`, and `bun run check` all exit 0; `rg 'from .*herdr|require\(.*herdr' packages package.json` returns no linked herdr dependency.

**Acceptance criteria:**
- The adapter implements only spawn/send/read/liveness/enumerate/attach and contains no outcome classifier or registry mutation.
- Herdr is invoked as an external executable selected by `ANTMAY_HERDR_BIN` and is not linked or embedded.
- Claude records a pinned generated session UUID; Codex records a heuristic cwd/spawn-time identity.
- Rendered invocations preserve the exact catalog identity, canonical thread, and literal permitted request without shell interpretation.
- Immediate and later attachment share one operation and never mutate run state on failure.

**Consumes:** `NormalizedSpawnRequest`, `ProcessRunner`, catalog identities, and transcript/session binding requirements from Tasks 2, 4, and 5.

**Produces:** `ExecutionAdapter`, `HerdrAdapter`, Claude/Codex harness launchers, `renderSkillInvocation()`, and common `attachRun()`.
