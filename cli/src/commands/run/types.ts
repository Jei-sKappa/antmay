import type { CommandDeps } from "../deps.js";

/**
 * Arguments for `antmay afk run` after CLI parsing.
 */
export type RunArgs = {
  pipeline: string;
  thread: string;
  from?: string;
  profile?: string;
  dangerouslySkipPermissions: boolean;
};

/**
 * Run-command dependencies: every shared command seam plus the optional
 * candidate-ID generator so a test can force a queue race or ID collision.
 * Identifier generation is absent from `CommandDeps`.
 */
export type RunDeps = CommandDeps & {
  generateId?: () => string;
};

/**
 * A plain-message preflight refusal. The command writes the message to stderr
 * and selects the failure exit code.
 */
export type RunMessageRefusal = {
  kind: "message";
  message: string;
};

/**
 * A rejected loadable document. Field-level schema problems name no file of
 * their own, so the refusal carries the label and resolved source the command
 * needs to reproduce the existing presentation.
 */
export type RunRejectedDocumentRefusal = {
  kind: "rejected-document";
  label: string;
  sourcePath: string;
  errors: string[];
};

/**
 * Inert refusal facts for run preflight. No renderer callback or exit code —
 * presentation and exit selection stay in `runCommand`.
 */
export type RunPreflightRefusal = RunMessageRefusal | RunRejectedDocumentRefusal;

/**
 * Typed success or inert refusal from a run preflight step.
 */
export type RunPreflightResult<T> =
  | ({ ok: true } & T)
  | { ok: false; refusal: RunPreflightRefusal };
