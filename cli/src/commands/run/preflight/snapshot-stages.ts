import type { StageBindingMap } from "../../../config/execution.js";
import { resolveStageBindings } from "../../../config/execution.js";
import type { PreparedStage } from "../../../pipeline/composition.js";
import type {
  ProfileSelection,
  SnapshottedStage,
} from "../../../state/checkpoint/types.js";
import type { RunStageSnapshotResult } from "../types.js";

/**
 * Resolve one complete local binding per selected stage and build the
 * immutable stage snapshots, carrying through the profile selection and the
 * optional entry point already established by composition. Binding refusals
 * are inert message facts; presentation stays with the command.
 */
export function snapshotRunStages(
  prepared: readonly PreparedStage[],
  settingsStages: StageBindingMap,
  profileStages: StageBindingMap | null,
  profileSelection: ProfileSelection,
  requestedFrom: string | undefined,
): RunStageSnapshotResult {
  const bindings = resolveStageBindings(
    prepared.map((entry) => entry.stage.id),
    settingsStages,
    profileStages,
  );
  if (!bindings.ok) {
    return {
      ok: false,
      refusal: { kind: "message", message: bindings.errors.join("\n") },
    };
  }

  // Composition accepted the entry point, so the first selected stage is
  // exactly the stage `--from` named.
  const fromStage = requestedFrom === undefined ? null : prepared[0]!.stage.id;

  const stages: SnapshottedStage[] = prepared.map((entry, index) => ({
    ...entry.stage,
    resolvedTarget: entry.target,
    ...(entry.instructions !== undefined
      ? { instructions: entry.instructions }
      : {}),
    binding: bindings.bindings[index]!,
  }));

  return {
    ok: true,
    stages,
    profileSelection,
    fromStage,
  };
}
