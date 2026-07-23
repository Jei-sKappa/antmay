import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const LOCKS_DIR_NAME = "afk-locks";
const LOCK_VERSION = 1;

/**
 * A minimal open file handle: enough to write, flush, and close. The default
 * implementation is a `node:fs/promises` `FileHandle`.
 */
export type FileHandleLike = {
  write(data: string): Promise<unknown>;
  sync(): Promise<void>;
  close(): Promise<void>;
};

/**
 * The injectable open seam the lock acquirer uses. It exists solely so tests
 * can inject record write/flush failures over a really-created lock file;
 * production passes the default backed by `node:fs/promises`. `open` must
 * create the file on disk (flag `wx`) so a failed write can be cleaned up by
 * unlinking the exact path.
 */
export type LockFsOps = {
  open(filePath: string, flags: string, mode: number): Promise<FileHandleLike>;
};

const defaultLockFsOps: LockFsOps = {
  open: (filePath, flags, mode) => fs.open(filePath, flags, mode),
};

/**
 * The versioned JSON record written into a workspace lock file. `ownerToken` is
 * a crypto-random hex string that guards release: only the process holding the
 * matching token may unlink the file.
 */
export type LockRecord = {
  lockVersion: 1;
  workspacePath: string;
  runId: string;
  pid: number;
  acquiredAt: string;
  ownerToken: string;
};

/**
 * A held workspace lock. `release` re-reads the file and unlinks it only when
 * the stored owner token still matches this handle's token; a mismatch or a
 * missing file leaves the filesystem untouched.
 */
export type LockHandle = {
  lockPath: string;
  ownerToken: string;
  release: () => Promise<void>;
};

/**
 * The result of an acquisition attempt. On success the caller receives the
 * handle; on contention it receives the exact lock path and the existing
 * record's raw contents (best effort, empty string if unreadable) so it can
 * print the owning run's metadata for manual recovery.
 */
export type LockOutcome =
  | { ok: true; handle: LockHandle }
  | { ok: false; lockPath: string; existingRecord: string };

/**
 * The `afk-locks/` directory under a state root. Pure; creates nothing.
 */
export function locksDirectory(stateRoot: string): string {
  return path.join(stateRoot, LOCKS_DIR_NAME);
}

/**
 * The lock path for a workspace: `<state-root>/afk-locks/<sha256hex>.lock`,
 * where the digest is the sha256 of the (already-`realpath`ed) workspace path.
 * Pure; creates nothing.
 */
export function lockPathFor(stateRoot: string, workspacePath: string): string {
  const digest = createHash("sha256").update(workspacePath).digest("hex");
  return path.join(locksDirectory(stateRoot), `${digest}.lock`);
}

/**
 * Acquire an exclusive lock over `workspacePath` (which the caller has already
 * resolved through `realpath`). The `afk-locks/` directory is created lazily at
 * mode `0700`; the lock file is exclusively created at mode `0600` and holds a
 * versioned JSON record with a crypto-random owner token.
 *
 * If writing or flushing the just-created record fails, the handle is closed,
 * the exact just-created path is best-effort unlinked, and the error is
 * rethrown — acquisition never strands a lock the caller never received.
 *
 * On `EEXIST` the existing record is read best-effort and returned; the file is
 * never deleted, modified, or reclaimed.
 */
export async function acquireWorkspaceLock(
  stateRoot: string,
  workspacePath: string,
  runId: string,
  now: Date,
  fsOps: LockFsOps = defaultLockFsOps,
): Promise<LockOutcome> {
  const locksDir = locksDirectory(stateRoot);
  await fs.mkdir(locksDir, { recursive: true, mode: 0o700 });
  // mkdir honors the umask, so set the modes explicitly to guarantee 0700.
  await fs.chmod(stateRoot, 0o700);
  await fs.chmod(locksDir, 0o700);

  const lockPath = lockPathFor(stateRoot, workspacePath);

  let handle: FileHandleLike;
  try {
    handle = await fsOps.open(lockPath, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      let existingRecord = "";
      try {
        existingRecord = await fs.readFile(lockPath, "utf8");
      } catch {
        // Best effort: report an empty record if it cannot be read.
      }
      return { ok: false, lockPath, existingRecord };
    }
    throw error;
  }

  const ownerToken = randomBytes(16).toString("hex");
  const record: LockRecord = {
    lockVersion: LOCK_VERSION,
    workspacePath,
    runId,
    pid: process.pid,
    acquiredAt: now.toISOString(),
    ownerToken,
  };

  try {
    await handle.write(`${JSON.stringify(record, null, 2)}\n`);
    await handle.sync();
  } catch (error) {
    // The just-created record could not be persisted: never leave a lock the
    // caller never received. Close, best-effort unlink this exact path, rethrow.
    try {
      await handle.close();
    } catch {
      // Ignore secondary close failures during unwind.
    }
    try {
      await fs.unlink(lockPath);
    } catch {
      // Best effort: the caller never received a handle regardless.
    }
    throw error;
  }

  await handle.close();

  return {
    ok: true,
    handle: {
      lockPath,
      ownerToken,
      release: () => releaseLock(lockPath, ownerToken),
    },
  };
}

/**
 * Release a lock: re-read the file and unlink it only when the stored owner
 * token matches. A missing file, unreadable/malformed record, or a mismatched
 * token leaves the file alone and performs no destructive action.
 */
async function releaseLock(lockPath: string, ownerToken: string): Promise<void> {
  let raw: string;
  try {
    raw = await fs.readFile(lockPath, "utf8");
  } catch {
    // Missing or unreadable: nothing to release.
    return;
  }

  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    // Malformed record: leave the file untouched.
    return;
  }

  if (
    typeof stored === "object" &&
    stored !== null &&
    (stored as { ownerToken?: unknown }).ownerToken === ownerToken
  ) {
    try {
      await fs.unlink(lockPath);
    } catch {
      // Best effort: another actor may have already removed it.
    }
  }
}
