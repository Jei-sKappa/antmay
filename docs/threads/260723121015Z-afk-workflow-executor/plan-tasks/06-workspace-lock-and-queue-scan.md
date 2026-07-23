# Task 6: Workspace strategy, locking, queue scanning

**Objective:** Provide the `current-checkout` workspace strategy, the exclusive sha256-addressed workspace lock with owner-token release, and the pending-queue scanner the gates are built on.

**Input / context:** `spec.md` §"Workspace strategy and locking" and the queue-gate portion of §"Interpreting a stage result"; `decisions.md DR10` (workspace-strategy abstraction; paused runs hold no lock), `DR24` (`current-checkout` only, resolved internally, snapshotted), `DR28` (lock path, record, acquisition, release, contention behavior), `DR16` (no automatic stale-lock recovery), `DR3`/`DR44` (queue scans: direct regular files, no content reads, absent-directory-as-empty, error taxonomy split). Consumes `runGit` from Task 4 only indirectly (workspace path comes in resolved); this task is filesystem + crypto only.

**Steps:**

1. Create `cli/src/workspace/current-checkout.ts` exporting `type WorkspaceConfig = { strategy: "current-checkout"; path: string }` and `resolveCurrentCheckoutWorkspace(repoRoot: string): Promise<WorkspaceConfig>` — `path` is `fs.realpath(repoRoot)`. This module is the single place the runner obtains execution directory and workspace identity from; no settings field selects a strategy.
2. Create `cli/src/state/lock.ts` exporting `acquireWorkspaceLock(stateRoot: string, workspacePath: string, runId: string, now: Date): Promise<LockOutcome>` where `LockOutcome = { ok: true; handle: LockHandle } | { ok: false; lockPath: string; existingRecord: string }`:
   - lock path: `<state-root>/afk-locks/<sha256hex(workspacePath)>.lock` (the caller passes the already-`realpath`ed workspace path; hash with `node:crypto`); create `afk-locks/` lazily with mode `0700`;
   - acquisition: exclusively create the file (flag `wx`, mode `0600`), then write and flush a versioned JSON record `{ lockVersion: 1, workspacePath, runId, pid, acquiredAt, ownerToken }` with a crypto-random `ownerToken`;
   - contention: on `EEXIST`, read the existing record (best effort) and return `{ ok: false, lockPath, existingRecord }` — never delete, modify, or reclaim;
   - `LockHandle = { lockPath: string; ownerToken: string; release: () => Promise<void> }` — `release` re-reads the file and unlinks only when the stored `ownerToken` matches; a mismatch or missing file logs nothing destructive and leaves the file alone.
3. Create `cli/src/thread/queues.ts` exporting `scanPendingQueues(repoRoot: string, threadRelPath: string): Promise<QueueScan>` with `QueueScan = { ok: true; pendingFiles: string[] } | { ok: false; message: string }`: list the *direct* entries of `<thread>/.pending-decisions/` and `<thread>/.pending-reviews/`, keep regular files only (ignore subdirectories and non-file entries), never read contents, treat an absent directory (`ENOENT`) as empty, surface any other filesystem error as `{ ok: false }`; return normalized repository-relative POSIX paths, lexically sorted across both queues.
4. Add tests: `cli/src/workspace/current-checkout.test.ts` (realpath resolution through a symlinked repo path); `cli/src/state/lock.test.ts` (path is sha256 of the workspace path; mode `0600`; record fields present; second acquisition returns contention with the record and path; release with matching token unlinks; release with tampered token leaves the file; release is idempotent); `cli/src/thread/queues.test.ts` (absent dirs empty; direct regular files collected from both queues sorted repo-relative; nested directories and their contents ignored; an unreadable queue directory — e.g. a file where the directory should be, or `chmod 000` — yields `{ ok: false }`; file contents never read, proven with unreadable-content fixtures).

**Files modified:** `cli/src/workspace/current-checkout.ts` (NEW), `cli/src/state/lock.ts` (NEW), `cli/src/thread/queues.ts` (NEW), `cli/src/workspace/current-checkout.test.ts` (NEW), `cli/src/state/lock.test.ts` (NEW), `cli/src/thread/queues.test.ts` (NEW)

**Verification:** `npm --prefix cli run check` exits 0; `npm --prefix cli run test -- src/workspace src/state/lock.test.ts src/thread/queues.test.ts` exits 0.

**Acceptance criteria:**

- Lock path, mode, record content, contention behavior, and owner-token-guarded release match AC-8.1–AC-8.3.
- No settings field or public option selects a workspace strategy; `WorkspaceConfig` is the shape snapshotted into checkpoints (AC-8.4).
- Queue scans satisfy AC-11.1's mechanics (direct regular files, absent-as-empty, no content reads, normalized sorted repo-relative paths) and distinguish scan errors for AC-11.5's taxonomy.

**Consumes:** the state-root conventions from Task 5 (`afk-locks/` sits beside `afk-runs/` under the same state root; directory mode discipline `0700`).

**Produces:** `resolveCurrentCheckoutWorkspace(repoRoot): Promise<WorkspaceConfig>` and `WorkspaceConfig` from `cli/src/workspace/current-checkout.ts`; `acquireWorkspaceLock(stateRoot, workspacePath, runId, now)` and `LockHandle` from `cli/src/state/lock.ts`; `scanPendingQueues(repoRoot, threadRelPath): Promise<QueueScan>` from `cli/src/thread/queues.ts`.
