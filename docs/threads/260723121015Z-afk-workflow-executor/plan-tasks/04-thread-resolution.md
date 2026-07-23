# Task 4: Thread-target resolution

**Objective:** Provide the Git process helper and resolve `--thread` in all three accepted forms to a canonical repository root and normalized repository-relative thread path, enforcing containment and seed/decision genesis validation.

**Input / context:** `spec.md` §"Thread-target resolution"; `decisions.md DR47` (three forms, canonicalization, worktree-root equality, one-direct-child rule, symlink/nested/archived/bare rejections), `DR11` (genesis validation of `seed.md` and `decisions.md`; no other artifact preconditions), `DR31` (runner never duplicates skill preconditions), `DR33`/`DR48` (user's `git` executable via built-in process APIs; successful resolution establishes Git availability). Pure functions plus `git`/filesystem calls; no state, lock, or settings access.

**Steps:**

1. Create `cli/src/gitops/git.ts` exporting `runGit(cwd: string, args: string[]): Promise<GitResult>` with `GitResult = { code: number; stdout: string; stderr: string }`, spawning the user's `git` via `child_process` (`execFile`-style, no shell), plus a thin `gitOrThrow` convenience that raises a typed error carrying the command and stderr on non-zero exit. All later Git access in the package goes through this module.
2. Create `cli/src/thread/resolve.ts` exporting `resolveThreadTarget(threadArg: string, cwd: string): Promise<ThreadResult>` where `ThreadResult = { ok: true; repoRoot: string; threadRelPath: string; threadFolder: string } | { ok: false; message: string }`; `repoRoot` is the absolute canonical Git worktree root, `threadRelPath` is exactly `docs/threads/<threadFolder>`.
3. Implement form detection: a value containing a path separator is a relative path (resolved against `cwd`) or an absolute path; both must lexically end in exactly `docs/threads/<single-thread-folder>` (reject nested suffixes such as `…/docs/threads/a/docs/threads/b` and multi-segment tails); a bare name resolves as `docs/threads/<name>` beneath the worktree root containing `cwd` (`git rev-parse --show-toplevel` from `cwd`).
4. Implement validation: canonicalize the existing target via `fs.realpath`; run `git rev-parse --show-toplevel` *from the target* and canonicalize it; require the canonical Git root to equal the path portion preceding `docs/threads`; require the canonical target to be exactly one direct child of `<root>/docs/threads/`. Reject symlink escapes (canonical target outside the canonical root's `docs/threads/`), archived-thread paths (any `docs/threads/archive…` or target not a direct child), bare repositories (`git rev-parse --is-bare-repository` true or no worktree top-level), and mismatched worktree roots — each with a distinct clear message.
5. Implement genesis validation: `seed.md` and `decisions.md` must both exist as regular files directly inside the thread and each must contain non-whitespace text after trimming. Do not check any other artifact.
6. Create `cli/src/test-helpers/git-fixture.ts` exporting `createRepoFixture(options?): Promise<RepoFixture>` — init a disposable Git repository under `fs.mkdtemp`, optionally create `docs/threads/<t>/` with seed/decisions content, commit, and return paths plus a cleanup function. Later tasks reuse it for every Git-backed test.
7. Add `cli/src/thread/resolve.test.ts` built on the fixture. Cover: all three forms resolving to the same canonical result (AC-5.1); each rejection in step 4 (AC-5.2); missing/empty/whitespace seed or decisions (AC-5.3); a symlinked thread folder pointing outside the repo; resolution from a subdirectory `cwd` for the bare-name form. Add `cli/src/gitops/git.test.ts` for `runGit` success/failure surfaces.

**Files modified:** `cli/src/gitops/git.ts` (NEW), `cli/src/thread/resolve.ts` (NEW), `cli/src/test-helpers/git-fixture.ts` (NEW), `cli/src/gitops/git.test.ts` (NEW), `cli/src/thread/resolve.test.ts` (NEW)

**Verification:** `npm --prefix cli run check` exits 0; `npm --prefix cli run test -- src/thread src/gitops` exits 0.

**Acceptance criteria:**

- All three `--thread` forms resolve to the identical `{ repoRoot, threadRelPath, threadFolder }` for the same thread (AC-5.1).
- Every DR47 rejection case fails with a distinct message and performs no writes (AC-5.2).
- Genesis validation enforces non-whitespace `seed.md` and `decisions.md` and checks nothing else (AC-5.3, AC-6.4 posture).
- `runGit` uses no shell and no Git library dependency.

**Consumes:** the `cli/` package scaffold from Task 1.

**Produces:** `runGit(cwd, args): Promise<GitResult>` from `cli/src/gitops/git.ts` (the package-wide Git access point); `resolveThreadTarget(threadArg, cwd): Promise<ThreadResult>` from `cli/src/thread/resolve.ts`; `createRepoFixture(options?)` from `cli/src/test-helpers/git-fixture.ts` for every later Git-backed test.
