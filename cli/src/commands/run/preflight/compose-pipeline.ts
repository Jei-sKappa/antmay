import type { ArtifactState } from "../../../thread/artifacts.js";
import { composePipeline } from "../../../pipeline/composition.js";
import type { PipelineDocument } from "../../../pipeline/types.js";
import type { RunCompositionResult } from "../types.js";

/**
 * Compose the selected pipeline suffix against the thread's concrete artifact
 * state, proving every selected stage can run from the state at its position
 * and resolving its concrete target. Returns the prepared stages or the
 * structured composition failure; presentation stays with the command.
 */
export function composeRunPipeline(
  document: PipelineDocument,
  artifactState: ArtifactState,
  threadRelPath: string,
  fromStage: string | null,
): RunCompositionResult {
  const composition = composePipeline(
    document,
    artifactState,
    threadRelPath,
    fromStage,
  );
  if (!composition.ok) {
    return { ok: false, failure: composition.failure };
  }
  return { ok: true, stages: composition.stages };
}
