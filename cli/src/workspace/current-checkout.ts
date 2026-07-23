import { promises as fs } from "node:fs";

import type { WorkspaceConfig } from "./types.js";

/**
 * Resolve the `current-checkout` workspace for a repository. This is the single
 * place the run builder obtains its execution directory, sandbox choice, branch
 * strategy, and mutable-workspace identity; no settings field selects a
 * strategy.
 *
 * The workspace path and execution cwd are the canonical repository root
 * (`repoRoot` resolved through `realpath`), so the snapshotted config carries a
 * stable identity even when the caller passed a symlinked path. The strategy
 * always runs unsandboxed against the current `HEAD`.
 */
export async function resolveCurrentCheckoutWorkspace(
  repoRoot: string,
): Promise<WorkspaceConfig> {
  const canonicalRoot = await fs.realpath(repoRoot);
  return {
    strategy: "current-checkout",
    path: canonicalRoot,
    execution: {
      cwd: canonicalRoot,
      sandbox: "none",
      branchStrategy: "head",
    },
  };
}
