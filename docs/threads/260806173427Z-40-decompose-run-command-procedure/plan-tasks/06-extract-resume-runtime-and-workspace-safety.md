### Task 6: Extract resume runtime and workspace safety

**Objective:** Complete read-only resume preparation with explicit runtime, canonical-workspace, and temporary-workspace steps while preserving all pre-lock signal boundaries.

**Input / context:** Task 5's validated unchanged checkpoint and recorded identities; `spec.md`; `decisions.md DR2`, `decisions.md DR3`, `decisions.md DR4`, `decisions.md DR5`, and `decisions.md DR7`; existing resume runtime, workspace, temporary-workspace, signal, and read-only coverage.

**Steps:**

1. Create `cli/src/commands/resume/preflight/resolve-runtime.ts` exporting `resolveResumeRuntime`; enforce the checkpoint's immutable runtime, probe only the current stage's harness, resolve config only through the lazy scripted path, preserve scripted-prompt observation, and return invoker, optional scenario path, and merged version map without checkpoint mutation.
2. Create `validate-workspace.ts` exporting `validateResumeWorkspace`; resolve the canonical current checkout and require its path to match the recorded workspace.
3. Create `check-temporary-workspaces.ts` exporting `checkResumeTemporaryWorkspaces`; return inspection or structured safety failures and run before lock acquisition and every checkpoint mutation.
4. Replace the inline blocks in `resume.ts` with this order after task 5's thread revalidation signal: runtime resolution, signal, workspace validation, signal, temporary-workspace safety, then the existing immediate pre-lock signal.
5. Keep runtime/temporary-workspace rendering, scripted-prompt/startup presentation, exit mapping, signal lifecycle, lock acquisition, engine handoff, and cleanup in `resume.ts`.
6. Add a table-driven command regression that injects a signal at each of the six pre-lock observations now visible across tasks 5–6. Every row must prove the conventional signal code, byte-for-byte unchanged checkpoint, no newly held lock, and no engine call.
7. Ensure no new step imports another preflight step, either orchestrator, exit codes, concrete display renderers, signal handling, or engine, and no step writes or acquires the lock.
8. Run the focused resume suite and full gate.

**Files modified:**

- `cli/src/commands/resume/preflight/resolve-runtime.ts` (NEW)
- `cli/src/commands/resume/preflight/validate-workspace.ts` (NEW)
- `cli/src/commands/resume/preflight/check-temporary-workspaces.ts` (NEW)
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`

**Verification:** `npm --prefix cli run test -- src/commands/resume.test.ts` exits 0; `npm --prefix cli run check` exits 0; `rg -n 'resolveHarnessRuntime|resolveCurrentCheckoutWorkspace|checkTemporaryWorkspaces' cli/src/commands/resume.ts` returns no matches.

**Acceptance criteria:**

- `resume.ts` states the complete read-only preparation order and retains all six pre-lock signal observations at their specified boundaries.
- Runtime probes only the current harness, enforces immutable runtime, resolves config only for scripted mode, and merges versions without checkpoint mutation.
- Canonical workspace validation precedes temporary-workspace safety, which precedes lock acquisition and every checkpoint mutation.
- All pre-lock refusals and signal exits leave checkpoint bytes unchanged and no newly held lock while preserving observable behavior.
- The signal matrix, focused resume suite, and full gate pass.

**Consumes:** Task 5's `checkpoint`, `repoRoot`, `threadRelPath`, `stateRoot`, and `runDir` facts.

**Produces:** `resolveResumeRuntime`, `validateResumeWorkspace`, and `checkResumeTemporaryWorkspaces`; fully prepared resume invoker, scenario path, harness-version map, validated workspace, and safety evidence in `resume.ts`.
