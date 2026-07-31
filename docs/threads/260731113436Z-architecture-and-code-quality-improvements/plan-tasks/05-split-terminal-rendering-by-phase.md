# Task 5: Split terminal rendering by phase

**Objective:** Divide terminal presentation into phase-specific modules while keeping a narrow synchronous lifecycle sink for execution and preserving every existing rendering.

**Input / context:** `spec.md` section 7 and FR-7; `decisions.md DR8` requires shared primitives, listing, preflight, startup/developer, and execution-lifecycle modules rather than one wide presentation interface.

**Steps:**
1. Create `cli/src/display/format.ts` for ANSI painting, emitting, indentation, truncation, duration, padding, and other formatting primitives shared by more than one display phase.
2. Move run-list types and rendering to `cli/src/display/list.ts`.
3. Move structured composition and temporary-workspace refusal types/rendering to `cli/src/display/preflight.ts`.
4. Move run summary, unrestricted warning, scripted-mode startup, and resolved-prompt diagnostics to `cli/src/display/startup.ts`.
5. Move attempt events, heartbeats, stage results, waiting reasons, completion, interruption, warnings, and fatal execution rendering to `cli/src/display/execution.ts`.
6. Rename the lifecycle-only `Display` contract to `ExecutionDisplay` in `cli/src/display/types.ts`, keep `nullDisplay` limited to that interface, and export `createTerminalExecutionDisplay` from the execution renderer.
7. Reduce `cli/src/display/terminal.ts` to a small compatibility barrel and make run, resume, and list import the focused renderers for the phases they own; make the current stage runner depend only on `ExecutionDisplay`.
8. Keep the existing terminal assertions and snapshots as the compatibility oracle; add structural assertions that list and command preflight consumers do not depend on execution lifecycle methods and execution test doubles need no list/startup/refusal methods.
9. Run display, command, list, and runner tests, then run the complete CLI gate.

**Files modified:**
- `cli/src/display/format.ts` (NEW)
- `cli/src/display/list.ts` (NEW)
- `cli/src/display/preflight.ts` (NEW)
- `cli/src/display/startup.ts` (NEW)
- `cli/src/display/execution.ts` (NEW)
- `cli/src/display/terminal.ts`
- `cli/src/display/types.ts`
- `cli/src/display/terminal.test.ts`
- `cli/src/display/__snapshots__/terminal.test.ts.snap`
- `cli/src/commands/list.ts`
- `cli/src/commands/run.ts`
- `cli/src/commands/resume.ts`
- `cli/src/runner/runner.ts`
- `cli/src/runner/runner.test.ts`

**Verification:**
- `npm --prefix cli run test -- src/display/terminal.test.ts src/commands/list.test.ts src/commands/run.test.ts src/commands/resume.test.ts src/runner/runner.test.ts`
- `test "$(wc -l < cli/src/display/terminal.ts)" -lt 80`
- `rg -n "interface ExecutionDisplay|createTerminalExecutionDisplay" cli/src/display/types.ts cli/src/display/execution.ts`
- `npm --prefix cli run check`

**Acceptance criteria:**
- FR-7 / AC-7.1: shared formatting, listing, preflight, startup/developer, and execution lifecycle code reside in focused modules, with no wide all-phase interface.
- FR-7 / AC-7.2: execution tests implement only `ExecutionDisplay`; list and command tests call their phase-specific renderers.
- FR-7 / AC-7.3: existing assertions and snapshots preserve text, stream, ordering, ANSI gating, wrapping-sensitive content, and non-color meaning.
- Existing commands retain their display calls through focused imports or the small barrel without changing terminal behavior.

**Consumes:** none

**Produces:** `ExecutionDisplay`, `createTerminalExecutionDisplay`, and focused display renderers under `cli/src/display/`.
