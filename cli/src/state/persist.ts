import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { RunCheckpoint } from "./checkpoint/types.js";

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
 * The injectable filesystem seam the atomic writer uses. It exists solely so
 * tests can inject write- and rename-time failures; production passes the
 * default backed by `node:fs/promises`. `open` must create the file on disk
 * (flag `wx`) so a failed write can be cleaned up by unlinking the exact path.
 */
export type FsOps = {
  open(filePath: string, flags: string, mode?: number): Promise<FileHandleLike>;
  rename(oldPath: string, newPath: string): Promise<void>;
};

const defaultFsOps: FsOps = {
  open: (filePath, flags, mode) => fs.open(filePath, flags, mode),
  rename: (oldPath, newPath) => fs.rename(oldPath, newPath),
};

/**
 * Best-effort discard of a temp file that never became `state.json`: close the
 * handle if it is still open, then unlink that exact path. Both failures are
 * swallowed so the caller sees the original write or rename error.
 */
async function discardTemp(
  tmpPath: string,
  handle: FileHandleLike | null,
): Promise<void> {
  if (handle) {
    try {
      await handle.close();
    } catch {
      // Ignore secondary close failures during unwind.
    }
  }
  try {
    await fs.unlink(tmpPath);
  } catch {
    // Best effort: the prior state.json is intact either way.
  }
}

/**
 * Serialize `checkpoint` as deterministic two-space JSON with a trailing
 * newline and persist it atomically over `<runDir>/state.json`.
 *
 * A uniquely named temp file is exclusively created beside `state.json` (flag
 * `wx`, mode `0600`), fully written, flushed, and closed, then renamed over
 * `state.json`; the containing directory is best-effort flushed. The previous
 * `state.json` is never truncated in place and no backup is kept, so any write,
 * flush, close, or rename failure leaves the prior document intact. That
 * failure also discards the temp file before propagating, so a failed attempt
 * leaves the run directory as it found it: each attempt draws a fresh random
 * name, and leftovers would otherwise accumulate one per failure.
 */
export async function writeCheckpoint(
  runDir: string,
  checkpoint: RunCheckpoint,
  fsOps: FsOps = defaultFsOps,
): Promise<void> {
  const json = `${JSON.stringify(checkpoint, null, 2)}\n`;
  const statePath = path.join(runDir, "state.json");
  const tmpPath = path.join(
    runDir,
    `.state.json.${randomBytes(6).toString("hex")}.tmp`,
  );

  const handle = await fsOps.open(tmpPath, "wx", 0o600);
  let closed = false;
  try {
    await handle.write(json);
    await handle.sync();
    await handle.close();
    closed = true;
    await fsOps.rename(tmpPath, statePath);
  } catch (error) {
    await discardTemp(tmpPath, closed ? null : handle);
    throw error;
  }

  // Best-effort flush of the containing directory so the rename is durable.
  try {
    const dir = await fsOps.open(runDir, "r");
    try {
      await dir.sync();
    } finally {
      await dir.close();
    }
  } catch {
    // Directory fsync is best-effort; ignore platforms/handles that reject it.
  }
}
