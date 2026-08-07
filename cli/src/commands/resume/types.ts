/**
 * Arguments for `antmay afk resume` after CLI parsing.
 */
export type ResumeArgs = {
  runId: string;
};

/**
 * A plain-message preflight refusal. The command writes the message to stderr
 * and selects the failure exit code.
 */
export type ResumeMessageRefusal = {
  kind: "message";
  message: string;
};

/**
 * Inert refusal facts for resume preflight. No renderer callback or exit code —
 * presentation and exit selection stay in `resumeCommand`.
 */
export type ResumePreflightRefusal = ResumeMessageRefusal;

/**
 * Typed success or inert refusal from a resume preflight step.
 */
export type ResumePreflightResult<T> =
  | ({ ok: true } & T)
  | { ok: false; refusal: ResumePreflightRefusal };
