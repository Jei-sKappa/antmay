/**
 * The Antmay-owned, JSON-serializable description of how a resolved workspace
 * runs a harness. These values let the workspace strategy supply cwd, sandbox,
 * and branch behavior to the runner and checkpoint without leaking any
 * Sandcastle type into either.
 *
 * In v0 the only strategy is `current-checkout`, which runs unsandboxed in the
 * user's existing checkout against its current `HEAD`.
 */
export type WorkspaceExecution = {
  cwd: string;
  sandbox: "none";
  branchStrategy: "head";
};

/**
 * A fully resolved workspace configuration, snapshotted into the checkpoint.
 * For `current-checkout`, `path` is the canonical repository root and always
 * equals `execution.cwd`.
 */
export type WorkspaceConfig = {
  strategy: "current-checkout";
  path: string;
  execution: WorkspaceExecution;
};
