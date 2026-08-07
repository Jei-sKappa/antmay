import type { RunCheckpoint } from "../../../state/checkpoint/types.js";
import type { ResumePreflightResult } from "../types.js";

/**
 * Refuse a completed checkpoint. Call only after the signal observation that
 * follows checkpoint loading so completed-run behavior retains its exact
 * boundary.
 */
export function requireIncompleteRun(
  checkpoint: RunCheckpoint,
  runId: string,
): ResumePreflightResult<{
  checkpoint: RunCheckpoint;
  repoRoot: string;
  threadRelPath: string;
}> {
  if (checkpoint.condition === "completed") {
    return {
      ok: false,
      refusal: {
        kind: "message",
        message: `Run "${runId}" already completed the whole "${checkpoint.pipelineName}" pipeline; there is nothing to resume.`,
      },
    };
  }
  return {
    ok: true,
    checkpoint,
    repoRoot: checkpoint.repoRoot,
    threadRelPath: checkpoint.threadRelPath,
  };
}
