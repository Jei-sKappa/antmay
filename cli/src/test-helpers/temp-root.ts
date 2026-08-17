import { promises as fs, mkdtempSync } from "node:fs";
import path from "node:path";

/**
 * Names the one directory every temporary tree in the suite is allocated under.
 * `vitest.config.ts` creates that directory and publishes it here, and the
 * global teardown removes it once the last file has finished.
 *
 * The suite runs its Git-backed cases concurrently, and concurrent creation and
 * recursive removal of fixture trees is itself what makes every `git` call in
 * flight alongside it expensive. Collecting everything under one root turns
 * hundreds of removals racing live cases into a single removal that races
 * nothing.
 */
export const TEMP_ROOT_ENV = "ANTMAY_TEST_TEMP_ROOT";

function sharedRoot(): string {
  const root = process.env[TEMP_ROOT_ENV];
  if (root === undefined || root === "") {
    throw new Error(
      `${TEMP_ROOT_ENV} is unset, so there is no root to allocate under. It is ` +
        "set by `vitest.config.ts`; a helper reaching this line is running " +
        "outside the suite's configuration.",
    );
  }
  return root;
}

/**
 * A fresh directory under the run's one temporary root.
 *
 * Nothing removes it on its own, and no caller registers teardown for it: a
 * per-file hook would reach into a tree a still-running case in another file is
 * using. The root is already canonical, so every path handed out here is too.
 */
export async function tempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(sharedRoot(), prefix));
}

/** The synchronous form, for the cases that allocate outside an async hook. */
export function tempDirSync(prefix: string): string {
  return mkdtempSync(path.join(sharedRoot(), prefix));
}

/**
 * Restore write and search permission on every directory under `root`, so a
 * tree a case deliberately narrowed can still be removed. A directory must be
 * made searchable before its own entries can be read, hence the chmod ahead of
 * the descent.
 */
async function restorePermissions(root: string): Promise<void> {
  await fs.chmod(root, 0o700).catch(() => undefined);
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      await restorePermissions(path.join(root, entry.name));
    }
  }
}

/**
 * Remove a tree, including one holding a directory whose permissions a case
 * narrowed to prove the executor reports an unreadable path. The repair walk is
 * the slow path and runs only once the ordinary removal has failed.
 */
export async function removeTree(root: string): Promise<void> {
  try {
    await fs.rm(root, { recursive: true, force: true });
    return;
  } catch {
    await restorePermissions(root);
  }
  await fs.rm(root, { recursive: true, force: true });
}
