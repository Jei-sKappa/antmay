// Exact active-thread resolution. The `--thread` argument accepts exactly three
// forms — the complete thread folder name, the repo-relative root path
// `docs/threads/<name>`, or the absolute thread-root path — and all three
// canonicalize to the same directory. The resolved directory must be a direct
// child of `<repository>/docs/threads`, which rejects a file path inside a
// thread, a partial timestamp or slug, an archived root under
// `docs/threads/archive/`, an external root, and a nonexistent value. There is
// no fuzzy or most-recent fallback: a value that does not resolve exactly fails.

import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  asThreadPath,
  type RepositoryPath,
  type ThreadPath,
} from "@antmay/core";

/** Raised when a `--thread` value cannot be resolved to an active thread root. */
export class ThreadResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThreadResolutionError";
  }
}

function canonicalOrSelf(path: string): string {
  return existsSync(path) ? realpathSync.native(path) : path;
}

/**
 * Resolve a `--thread` argument to the canonical absolute thread-root path. The
 * value is interpreted as an absolute path, a repo-relative path, or a bare
 * folder name under `<repository>/docs/threads`; the result must be an existing
 * directory that is a direct child of that folder.
 */
export function resolveThread(input: {
  threadArg: string;
  repositoryPath: RepositoryPath;
}): ThreadPath {
  const { threadArg, repositoryPath } = input;
  const trimmed = threadArg.trim();
  if (trimmed.length === 0) {
    throw new ThreadResolutionError("A --thread value is required.");
  }

  const threadsDir = join(repositoryPath, "docs", "threads");

  const candidate = isAbsolute(trimmed)
    ? resolve(trimmed)
    : trimmed.includes("/")
      ? resolve(repositoryPath, trimmed)
      : join(threadsDir, trimmed);

  if (!existsSync(candidate)) {
    throw new ThreadResolutionError(
      `No thread resolves from "${threadArg}"; expected a direct child directory of ${threadsDir} named as its complete folder name, repo-relative docs/threads/<name> path, or absolute thread-root path.`,
    );
  }
  if (!statSync(candidate).isDirectory()) {
    throw new ThreadResolutionError(
      `"${threadArg}" points at a file, not a thread-root directory; pass the thread folder, not a file inside it.`,
    );
  }

  const canonicalCandidate = canonicalOrSelf(candidate);
  const canonicalThreadsDir = canonicalOrSelf(threadsDir);

  if (dirname(canonicalCandidate) !== canonicalThreadsDir) {
    throw new ThreadResolutionError(
      `"${threadArg}" does not resolve to a direct child of ${threadsDir}; archived roots (docs/threads/archive/), nested paths, and external roots are rejected.`,
    );
  }

  return asThreadPath(canonicalCandidate);
}
