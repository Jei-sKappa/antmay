// Canonical worktree resolution. The current repository is the worktree root
// reported by `git rev-parse --show-toplevel` from the invocation cwd, so a
// nested cwd still resolves to the one repository folder. A cwd that is not
// inside a git worktree — or an unavailable git executable — is rejected with a
// precise diagnostic before any side effect. The resolved path is canonicalized
// through the same helper the registry keys on, so a run binds the identical
// repository identity the state store uses.

import type { RepositoryPath } from "@antmay/core";
import type { ProcessRunner } from "../process/process-runner";
import { canonicalizeRepositoryPath } from "../state/registry-store";

/** Raised when the invocation cwd cannot be resolved to a git worktree root. */
export class RepositoryResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryResolutionError";
  }
}

/**
 * Resolve the canonical repository folder for the given cwd. Requires the git
 * executable and a cwd inside a git worktree; the returned path is the
 * canonicalized `--show-toplevel` root, keyed identically to the registry.
 */
export function resolveRepositoryRoot(
  cwd: string,
  runner: ProcessRunner,
): RepositoryPath {
  if (runner.locate("git") === null) {
    throw new RepositoryResolutionError(
      "The git executable was not found on PATH; antmay requires git to resolve the repository worktree.",
    );
  }
  const result = runner.run("git", ["rev-parse", "--show-toplevel"], { cwd });
  if (result.code !== 0) {
    throw new RepositoryResolutionError(
      `The current directory "${cwd}" is not inside a git worktree; run antmay from within a repository.`,
    );
  }
  const toplevel = result.stdout.trim();
  if (toplevel.length === 0) {
    throw new RepositoryResolutionError(
      `git reported no worktree root for "${cwd}"; antmay requires a git worktree.`,
    );
  }
  return canonicalizeRepositoryPath(toplevel);
}
