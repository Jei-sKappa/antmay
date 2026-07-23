import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { CheckpointResult, RunCheckpoint } from "./checkpoint.js";
import { validateCheckpoint } from "./checkpoint.js";

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
 * default backed by `node:fs/promises`.
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
 * Serialize `checkpoint` as deterministic two-space JSON with a trailing
 * newline and persist it atomically over `<runDir>/state.json`.
 *
 * A uniquely named temp file is exclusively created beside `state.json` (flag
 * `wx`, mode `0600`), fully written, flushed, and closed, then renamed over
 * `state.json`; the containing directory is best-effort flushed. The previous
 * `state.json` is never truncated in place and no backup is kept, so any write
 * or rename failure leaves the prior document intact.
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
  try {
    await handle.write(json);
    await handle.sync();
  } finally {
    await handle.close();
  }

  await fsOps.rename(tmpPath, statePath);

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

/**
 * Read and validate `<runDir>/state.json`. Only `state.json` is authoritative;
 * leftover temp files are ignored. A missing or unreadable file, malformed
 * JSON, or a schema/invariant violation all return a failed result carrying
 * human-readable errors.
 */
export async function readCheckpoint(runDir: string): Promise<CheckpointResult> {
  const statePath = path.join(runDir, "state.json");

  let raw: string;
  try {
    raw = await fs.readFile(statePath, "utf8");
  } catch (error) {
    return {
      ok: false,
      errors: [`Cannot read ${statePath}: ${(error as Error).message}`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      errors: [`${statePath} is not valid JSON: ${(error as Error).message}`],
    };
  }

  return validateCheckpoint(parsed);
}
