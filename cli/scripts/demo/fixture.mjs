/**
 * Helpers a scenario's own `action` steps use to reach into the fixture. The
 * driver builds the context these operate on; a scenario imports only the ones
 * it needs, so no scenario carries setup belonging to another.
 *
 * Every path argument is relative to the fixture repository root unless the name
 * says otherwise.
 */

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

/** Both pending-queue directory names, relative to the thread root. */
export const QUEUE_DIRS = [".pending-decisions", ".pending-reviews"];

/**
 * Run `git` in the fixture repository and return its captured result. Throws on
 * failure, because a scenario's setup silently not applying is worse than the
 * demo stopping.
 */
export function git(ctx, args) {
  const result = spawnSync("git", args, {
    cwd: ctx.repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`;
    throw new Error(`git ${args.join(" ")} failed: ${detail}`);
  }
  return result.stdout ?? "";
}

/**
 * Commit everything currently in the worktree under one subject. A scenario
 * that seeds thread state before the run uses this, because the executor's
 * preflight requires a clean worktree.
 */
export function commitAll(ctx, subject) {
  git(ctx, ["add", "-A"]);
  git(ctx, ["commit", "--quiet", "-m", subject]);
}

/** Absolute path of a thread-relative path inside the fixture's active thread. */
export function threadPath(ctx, threadRelativePath) {
  return path.join(ctx.threadRoot, threadRelativePath);
}

/** Write a file inside the active thread, creating parent directories. */
export function writeThreadFile(ctx, threadRelativePath, content) {
  const target = threadPath(ctx, threadRelativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

/**
 * Delete every direct file from both of the thread's pending queues — what a
 * human settling the queued work leaves behind. Absent queues are already
 * settled and are left alone.
 */
export function resolvePendingBundles(ctx) {
  const removed = [];
  for (const queueName of QUEUE_DIRS) {
    const queueDir = threadPath(ctx, queueName);
    let entries;
    try {
      entries = readdirSync(queueDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      rmSync(path.join(queueDir, entry.name));
      removed.push(`${queueName}/${entry.name}`);
    }
  }
  return removed;
}

/**
 * Set the mode of a path inside the active thread, creating it as a directory
 * first when it does not exist. Returns a restore function, so a scenario that
 * makes something unreadable can always hand the directory back in a state the
 * driver can clean up.
 */
export function chmodThreadPath(ctx, threadRelativePath, mode) {
  const target = threadPath(ctx, threadRelativePath);
  mkdirSync(target, { recursive: true });
  const original = statSync(target).mode & 0o777;
  chmodSync(target, mode);
  return () => chmodSync(target, original);
}

/** Set the mode of an absolute path, returning a restore function. */
export function chmodPath(absPath, mode) {
  const original = statSync(absPath).mode & 0o777;
  chmodSync(absPath, mode);
  return () => chmodSync(absPath, original);
}

/**
 * Leave the worktree dirty by writing an untracked file at the repository root.
 * The preflight clean-worktree check is what this is for.
 */
export function dirtyWorktree(ctx, relativePath = "stray-uncommitted-file.txt") {
  const target = path.join(ctx.repoRoot, relativePath);
  writeFileSync(target, "Uncommitted work the executor must not run over.\n");
  return target;
}
