/**
 * The rule that binds one selected stage to exactly one source document, and the
 * intrinsic timing defaults that rule applies. The defaults live here rather
 * than with the vocabulary because they are only ever read as a fallback, and
 * this is the one place a fallback happens.
 */

import type { CatalogStageId } from "../../pipeline/stage-id.js";

import type {
  ResolvedStageBinding,
  StageBindingMap,
  StageBindingsResult,
} from "./types.js";

/**
 * How long an attempt may go without output before the executor abandons it,
 * when the binding names no idle timeout. A full day lets a long unattended
 * stage finish while still bounding a wedged provider connection.
 */
export const DEFAULT_IDLE_TIMEOUT_SECONDS = 86_400;

/**
 * How often a live attempt reports that it is still working, when the binding
 * names no interval. Five minutes is quiet enough to stay out of the way of an
 * unattended run and frequent enough to prove the executor has not died.
 */
export const DEFAULT_HEARTBEAT_SECONDS = 300;

/**
 * Resolve the complete local execution binding of every selected stage.
 *
 * A selected stage takes the whole binding from the execution profile when the
 * profile binds it, and otherwise the whole binding from settings. Fields never
 * merge across the two sources, so a profile entry cannot inherit a settings
 * timing value or pair its model with a settings harness. Only the intrinsic
 * defaults fill an omitted timing field. A selected stage bound by neither
 * source is an error naming that stage; every such stage is reported together.
 */
export function resolveStageBindings(
  selectedStageIds: readonly CatalogStageId[],
  settingsStages: StageBindingMap,
  profileStages: StageBindingMap | null,
): StageBindingsResult {
  const bindings: ResolvedStageBinding[] = [];
  const errors: string[] = [];

  for (const stageId of selectedStageIds) {
    const binding = profileStages?.[stageId] ?? settingsStages[stageId];
    if (binding === undefined) {
      errors.push(
        profileStages === null
          ? `Stage "${stageId}" has no execution binding; add an "afk.stages.${stageId}" entry to settings.json.`
          : `Stage "${stageId}" has no execution binding; add a "${stageId}" entry to the selected execution profile or an "afk.stages.${stageId}" entry to settings.json.`,
      );
      continue;
    }
    bindings.push({
      agent: { ...binding.agent },
      idleTimeoutSeconds:
        binding.idleTimeoutSeconds ?? DEFAULT_IDLE_TIMEOUT_SECONDS,
      heartbeatSeconds: binding.heartbeatSeconds ?? DEFAULT_HEARTBEAT_SECONDS,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, bindings };
}
