### Task 1: Implement the temporary-workspace Git-safety check

**Objective:** Provide one shared, fail-closed check that proves all three thread temporary workspaces are ignore-covered and contain no tracked files.

**Input / context:** `spec.md` FR-1 and FR-3; `decisions.md DR1`, `decisions.md DR2`, `decisions.md DR4`, and `decisions.md DR13`; the sole Git process boundary in `cli/src/gitops/git.ts`; and the cached real-Git fixture in `cli/src/test-helpers/git-fixture.ts`.

**Steps:**
1. Add `cli/src/gitops/temporary-workspaces.test.ts` first, with a focused suite that initially fails because the shared check does not exist. Cover the three exact workspace names; a trailing-slash directory ignore rule passing; a filename-limited rule such as `/*.md` failing; exact `check-ignore -q --no-index -- <thread-path>/<workspace>/` arguments; one `ls-files -z -- <p1> <p2> <p3>` call with paths lacking trailing slashes; NUL-delimited tracked-path attribution; and aggregation across several workspaces and both failure kinds.
2. In the same suite, inject completed Git results to prove exit `0` means coverage, exit `1` means missing coverage, and exit `128` is returned as a Git error rather than rendered as missing coverage. Inject a rejected runner using `GitSpawnError` to prove a spawn failure follows the same fail-closed path.
3. Assert the rendered refusal's complete structure: the explanation that Antmay skills write the directories and a later Git boundary would fail; the missing-coverage group first; only the failing repository-wide `docs/threads/**/<workspace>/` rules; the tracked file paths exactly as emitted; a copyable `git rm -r --cached -- ...` correction over only the affected workspace directories; and the instruction to commit. Include one ignore-covered tracked workspace, one unignored tracked workspace, and one passing workspace to prove independent classification and omission.
4. Create `cli/src/gitops/temporary-workspaces.ts` exporting `checkTemporaryWorkspaces(repoRoot, threadRelPath, gitRunner?)`, where the optional runner defaults to the package's `runGit` and exists only to make completed-error and spawn-error paths deterministic in focused tests. Return a discriminated result carrying either success or the complete refusal/Git-error message so command callers need no formatting logic.
5. Represent the workspace names once in that module. Probe ignore coverage once per workspace with the mandatory trailing slash and `--no-index`, probe tracked content once with the three non-suffixed paths, parse the tracked output by NUL, and finish all non-fatal probes before deciding whether to render a refusal.
6. Keep every Git invocation behind `runGit`; do not add shell execution, stdin plumbing, per-stage workspace selection, repository mutation, or fallback treatment for unexpected Git exits.
7. Run the focused suite, then the repository's full CLI gate.

**Files modified:**

- `cli/src/gitops/temporary-workspaces.ts` (NEW)
- `cli/src/gitops/temporary-workspaces.test.ts` (NEW)

**Verification:**

- `npm --prefix cli run test -- src/gitops/temporary-workspaces.test.ts` exits `0`.
- `npm --prefix cli run check` exits `0`.
- `rg -n 'check-ignore|-q|--no-index|ls-files|-z' cli/src/gitops/temporary-workspaces.ts` shows the required probes in the one shared module.

**Acceptance criteria:**

- One exported check evaluates `.pending-decisions/`, `.pending-reviews/`, and `.implementation-runs/` unconditionally.
- Directory coverage, tracked content, aggregation, independent failure grouping, exit `128`, and spawn failure are each covered by a focused test that was observed failing before implementation and passing afterward.
- The result message is complete and actionable without command-specific wording.
- The check performs no writes and introduces no Git execution path outside `cli/src/gitops/git.ts`.

**Consumes:** none

**Produces:** `checkTemporaryWorkspaces(repoRoot: string, threadRelPath: string, gitRunner?): Promise<TemporaryWorkspaceCheckResult>` from `cli/src/gitops/temporary-workspaces.ts`, including the complete user-visible refusal or Git-error message on failure.
