import type { Dirent } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const QUEUE_DIR_NAMES = [".pending-decisions", ".pending-reviews"] as const;

/**
 * The result of scanning a thread's pending queues. `pendingFiles` holds the
 * normalized, repository-relative POSIX paths of every direct regular file
 * across both queues, lexically sorted. A filesystem error other than an absent
 * directory yields `{ ok: false }` so callers can distinguish a genuine scan
 * failure from empty queues.
 */
export type QueueScan =
  | { ok: true; pendingFiles: string[] }
  | { ok: false; message: string };

/**
 * Scan a thread's `.pending-decisions/` and `.pending-reviews/` queues for
 * direct regular files. Only the direct entries of each queue are considered;
 * subdirectories and other non-file entries are ignored and their contents are
 * never descended into. Bundle contents are never read — emptiness is the only
 * signal.
 *
 * An absent queue directory (`ENOENT`) counts as empty. Any other filesystem
 * error surfaces as `{ ok: false }`. On success, the returned paths are
 * repository-relative POSIX paths (relative to `repoRoot`), lexically sorted
 * across both queues combined.
 */
export async function scanPendingQueues(
  repoRoot: string,
  threadRelPath: string,
): Promise<QueueScan> {
  const pendingFiles: string[] = [];

  for (const queueName of QUEUE_DIR_NAMES) {
    const queueRelPath = path.posix.join(threadRelPath, queueName);
    const queueAbsPath = path.join(repoRoot, threadRelPath, queueName);

    let entries: Dirent[];
    try {
      entries = await fs.readdir(queueAbsPath, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // An absent queue directory counts as empty.
        continue;
      }
      return {
        ok: false,
        message: `Cannot scan ${queueAbsPath}: ${(error as Error).message}`,
      };
    }

    for (const entry of entries) {
      if (!entry.isFile()) {
        // Ignore subdirectories and every other non-file entry.
        continue;
      }
      pendingFiles.push(path.posix.join(queueRelPath, entry.name));
    }
  }

  pendingFiles.sort();
  return { ok: true, pendingFiles };
}
