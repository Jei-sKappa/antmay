### Task 4: Compose and render native continuation commands

**Objective:** Provide one pure command composer for safely reopening a native provider conversation and an optional pause action line that renders its result.

**Input / context:** Implement the presentation contract in `spec.md` FR-3 according to `decisions.md` DR5, DR20, and DR22, while retaining the clean-worktree presentation boundary in `decisions.md` DR19. The session ID is an opaque non-empty string; command construction performs no provider lookup or process launch.

**Steps:**

1. Create `cli/src/harness/native-session.ts` exporting `nativeContinuationCommand(harness: HarnessId, sessionId: string): string`.
2. Implement one POSIX single-argument quoting routine used by both harness branches: wrap the whole ID in single quotes and encode each embedded single quote as `'\''`.
3. Map `codex` to `codex resume <quoted-id>` and `claude-code` to `claude --resume <quoted-id>` with no provider filesystem access, transcript probing, or subprocess call.
4. Create `cli/src/harness/native-session.test.ts` covering both harness command spellings, an ordinary ID, whitespace/metacharacters, and an embedded single quote as one POSIX-safe argument.
5. Add an optional composed continuation-command field to `Display.runPaused` in `cli/src/display/types.ts`; keep it optional so existing callers remain valid until Task 5 wires persisted attempts into it.
6. Add `Continue` to the pause action block's aligned key set in `cli/src/display/terminal.ts` and render it after `Log` and before `Resume` exactly when the optional command is present. Keep `Resume` as the last line.
7. Extend `cli/src/display/terminal.test.ts` to assert the exact `Continue` line, omission when no command is provided, absence of a separate harness-name label, preserved `Log`/`Resume` lines, and no added clean-worktree caution.

**Files modified:**

- `cli/src/harness/native-session.ts` (NEW)
- `cli/src/harness/native-session.test.ts` (NEW)
- `cli/src/display/types.ts`
- `cli/src/display/terminal.ts`
- `cli/src/display/terminal.test.ts`

**Verification:**

1. `npm --prefix cli run test -- src/harness/native-session.test.ts src/display/terminal.test.ts`
2. `npm --prefix cli run check`

**Acceptance criteria:**

- `nativeContinuationCommand("codex", "S")` returns `codex resume 'S'`.
- `nativeContinuationCommand("claude-code", "S")` returns `claude --resume 'S'`.
- An ID containing a single quote is encoded as one POSIX-safe shell argument.
- Command composition is pure and performs no provider-transcript lookup or provider launch.
- A supplied continuation command renders once under `Continue`; an absent command renders no such line.
- The pause block retains its existing reason, `Next`, `Log`, and `Resume` behavior, with `Resume` last and no separate harness label or clean-worktree caution.

**Consumes:** none

**Produces:** `nativeContinuationCommand(harness: HarnessId, sessionId: string): string`; optional continuation-command input on `Display.runPaused`.
