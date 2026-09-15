# Task 4: Deepen Git-boundary finalization

**Objective:** Replace caller-assembled Git sequences with one semantic finalization operation for normal attempts, repaired contracts, and boundary retries.

**Input / context:** Attempt-local and pause-local HEAD evidence from Task 2 and the exact-finalization directives from Task 3; `spec.md` section 4 and FR-4; `decisions.md DR3`, `DR11`, and `DR12` define the three contexts and the preserved Git-policy semantics.

**Steps:**
1. Replace the public `evaluateBoundary` plus `finalizeBoundary` call protocol in `cli/src/gitops/boundary.ts` with one asynchronous `finalizeGitBoundary(request)` operation whose request contains repository/thread identity, the stage Git policy, and a discriminated context for normal attempt, first-time contract repair, or retry after boundary/commit failure.
2. Make the operation resolve selectors, observe staged/unstaged/deleted/untracked paths, apply `headMayChange` and `changeRequired`, stage only the validated set, verify exact staged-set equality, make the declared commit when configured, and read the final HEAD.
3. Preserve attempt-interval semantics: normal and contract-repair contexts enforce the saved start/post-attempt pair; retry treats movement since `pausedAtHead` as diagnostic; an intentionally precommitted intended change may satisfy `changeRequired` during recovered finalization.
4. Return structured success, Git-policy violation, or commit failure values carrying all observed paths, final HEAD evidence, commit facts, and any diagnostic cross-pause HEAD movement. Do not import checkpoint persistence, stage advancement, queue policy, or display code.
5. Change the current runner and resume callers to invoke only `finalizeGitBoundary` and translate its result into their existing durable consequences; remove their boundary observation/evaluation/staging/commit/final-HEAD sequences.
6. Rewrite the real-Git-fixture tests to call the one public operation in all three contexts and cover clean advance, allowed commit, out-of-bounds changes, forbidden attempt HEAD movement, required-change failure, precommitted recovery, staged-set mismatch, and commit-hook failure.
7. Preserve the existing selector, NUL-safe path, commit-subject, active-hook, no-empty-commit, and exact-staged-set assertions.
8. Run boundary, runner, and resume tests, then run the complete CLI gate.

**Files modified:**
- `cli/src/gitops/boundary.ts`
- `cli/src/gitops/boundary.test.ts`
- `cli/src/runner/runner.ts`
- `cli/src/runner/runner.test.ts`
- `cli/src/commands/resume.ts`
- `cli/src/commands/resume.test.ts`

**Verification:**
- `npm --prefix cli run test -- src/gitops/boundary.test.ts src/runner/runner.test.ts src/commands/resume.test.ts`
- `rg -n "finalizeGitBoundary" cli/src/gitops/boundary.ts cli/src/runner/runner.ts cli/src/commands/resume.ts`
- `! rg -n "evaluateBoundary|finalizeBoundary" cli/src/runner/runner.ts cli/src/commands/resume.ts`
- `npm --prefix cli run check`

**Acceptance criteria:**
- FR-4 / AC-4.1: real Git fixtures exercise one public operation for all three contexts and every specified success/failure case.
- FR-4 / AC-4.2: normal and repaired-contract finalization enforce the attempt interval, while retry reports later human HEAD movement as diagnostic evidence.
- FR-4 / AC-4.3: every result carries the Git observation the transition owner must persist for the named attempt or recovery.
- FR-4 / AC-4.4: callers do not sequence the Git protocol, and the Git domain imports no checkpoint persistence or display implementation.
- FR-4 / AC-4.5: selector matching, NUL-safe paths, commit subjects, hooks, empty-commit prevention, and exact staged sets retain their established meaning.

**Consumes:** Attempt `headAtStart`/`headAfterAttempt`, recovery `pausedAtHead`, and exact-attempt finalization directives.

**Produces:** `finalizeGitBoundary(request): Promise<GitBoundaryResult>` from `cli/src/gitops/boundary.ts`.
