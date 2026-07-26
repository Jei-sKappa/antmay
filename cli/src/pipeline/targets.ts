import path from "node:path";

import type { PathSelector, StageTarget } from "./types.js";

/**
 * The result of resolving a stage target to a repository-relative path. A
 * thread-file path that lexically escapes the selected thread — absolute,
 * empty, or containing a `..` segment — is rejected with a typed error.
 */
export type TargetResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

/**
 * A path selector resolved to a repository-relative location: the exact file
 * path, or the subtree prefix the boundary engine matches descendants against.
 */
export type ResolvedSelector = {
  kind: "exact-file" | "subtree";
  path: string;
};

/**
 * Validate a thread-relative path and join it beneath `threadRelPath`,
 * returning the normalized repository-relative POSIX path. Rejects absolute
 * paths, the empty path, and any `..` traversal that would escape the thread.
 */
function joinThreadRelative(
  threadRelPath: string,
  threadRelativePath: string,
): { ok: true; path: string } | { ok: false; error: string } {
  if (threadRelativePath.length === 0) {
    return { ok: false, error: "thread-relative path must not be empty" };
  }
  if (path.posix.isAbsolute(threadRelativePath)) {
    return {
      ok: false,
      error: `thread-relative path must not be absolute: "${threadRelativePath}"`,
    };
  }
  const segments = threadRelativePath.split("/");
  if (segments.some((segment) => segment === "..")) {
    return {
      ok: false,
      error: `thread-relative path must not contain ".." segments: "${threadRelativePath}"`,
    };
  }
  const joined = path.posix.join(threadRelPath, threadRelativePath);
  const base = path.posix.normalize(`${threadRelPath}/`);
  if (joined !== base.slice(0, -1) && !joined.startsWith(base)) {
    return {
      ok: false,
      error: `thread-relative path escapes the thread: "${threadRelativePath}"`,
    };
  }
  return { ok: true, path: joined };
}

/**
 * Resolve a stage target to a repository-relative path. The thread root
 * resolves to `threadRelPath` with a trailing slash; a thread file resolves to
 * the validated join beneath `threadRelPath`.
 */
export function resolveStageTarget(
  target: StageTarget,
  threadRelPath: string,
): TargetResult {
  if (target.kind === "thread-root") {
    const normalized = path.posix.normalize(threadRelPath).replace(/\/+$/, "");
    return { ok: true, path: `${normalized}/` };
  }
  const joined = joinThreadRelative(threadRelPath, target.path);
  if (!joined.ok) {
    return { ok: false, error: joined.error };
  }
  return { ok: true, path: joined.path };
}

/**
 * Resolve a path selector to its repository-relative location for the boundary
 * engine. Escaping paths are rejected the same way as stage targets.
 */
export function resolveSelector(
  selector: PathSelector,
  threadRelPath: string,
): { ok: true; selector: ResolvedSelector } | { ok: false; error: string } {
  const joined = joinThreadRelative(threadRelPath, selector.threadRelativePath);
  if (!joined.ok) {
    return { ok: false, error: joined.error };
  }
  return { ok: true, selector: { kind: selector.kind, path: joined.path } };
}
