import { readCheckpoint } from "../../../state/checkpoint/read.js";
import type { RunCheckpoint } from "../../../state/checkpoint/types.js";
import type { ResumePreflightResult } from "../types.js";

/**
 * Read and validate the checkpoint for an already-located run directory.
 */
export async function loadResumeCheckpoint(
  runDir: string,
  runId: string,
): Promise<ResumePreflightResult<{ checkpoint: RunCheckpoint }>> {
  const loaded = await readCheckpoint(runDir);
  if (!loaded.ok) {
    return {
      ok: false,
      refusal: {
        kind: "message",
        message: `The checkpoint for run "${runId}" is malformed or unreadable:\n${loaded.errors.join("\n")}`,
      },
    };
  }
  return { ok: true, checkpoint: loaded.checkpoint };
}
