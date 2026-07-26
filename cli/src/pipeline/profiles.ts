import type { AfkSettings, HarnessId, ProfileFields } from "../config/settings.js";
import type { Pipeline, StageProfile } from "./types.js";

/**
 * The result of resolving every stage's execution profile. On success the
 * `profiles` array is index-aligned with `pipeline.stages`; on failure every
 * stage problem is reported together.
 */
export type ProfilesResult =
  | { ok: true; profiles: StageProfile[] }
  | { ok: false; errors: string[] };

const SUPPORTED_HARNESSES: ReadonlySet<HarnessId> = new Set<HarnessId>([
  "codex",
  "claude-code",
]);

/**
 * How often a live attempt reports that it is still working, when the settings
 * name no interval. Five minutes is quiet enough to stay out of the way of an
 * unattended run and frequent enough to prove the executor has not died.
 */
export const DEFAULT_HEARTBEAT_SECONDS = 300;

/**
 * Shallow-merge one profile layer over an accumulator: a field present in the
 * layer replaces the accumulated value; an omitted field inherits.
 */
function mergeLayer(base: ProfileFields, layer: ProfileFields): ProfileFields {
  const merged: ProfileFields = { ...base };
  if (layer.harness !== undefined) merged.harness = layer.harness;
  if (layer.model !== undefined) merged.model = layer.model;
  if (layer.prompt !== undefined) merged.prompt = layer.prompt;
  if (layer.idleTimeoutSeconds !== undefined) {
    merged.idleTimeoutSeconds = layer.idleTimeoutSeconds;
  }
  if (layer.heartbeatSeconds !== undefined) {
    merged.heartbeatSeconds = layer.heartbeatSeconds;
  }
  return merged;
}

/**
 * Resolve the execution profile for every stage of `pipeline`. For each stage,
 * resolution seeds `{ prompt: "", idleTimeoutSeconds: 86400, heartbeatSeconds:
 * 300 }`, shallow-merges
 * `settings.defaults`, then the matching `settings.stages[stage.id]` override,
 * using plain field replacement. A missing or unsupported harness or a
 * missing/empty model after merging is an error naming the stage; all stage
 * errors are reported together.
 */
export function resolveStageProfiles(
  pipeline: Pipeline,
  settings: AfkSettings,
): ProfilesResult {
  const profiles: StageProfile[] = [];
  const errors: string[] = [];

  for (const stage of pipeline.stages) {
    const seed: ProfileFields = {
      prompt: "",
      idleTimeoutSeconds: 86400,
      heartbeatSeconds: DEFAULT_HEARTBEAT_SECONDS,
    };
    const withDefaults = mergeLayer(seed, settings.defaults);
    const override = settings.stages[stage.id] ?? {};
    const resolved = mergeLayer(withDefaults, override);

    if (resolved.harness === undefined || !SUPPORTED_HARNESSES.has(resolved.harness)) {
      errors.push(
        `Stage "${stage.id}" has no supported harness; set "harness" in afk.defaults or afk.stages.${stage.id}.`,
      );
    }
    if (resolved.model === undefined || resolved.model.length === 0) {
      errors.push(
        `Stage "${stage.id}" has no model; set a non-empty "model" in afk.defaults or afk.stages.${stage.id}.`,
      );
    }

    // seed guarantees prompt, idleTimeoutSeconds and heartbeatSeconds are
    // always defined.
    if (resolved.harness !== undefined && resolved.model !== undefined && resolved.model.length > 0) {
      profiles.push({
        harness: resolved.harness,
        model: resolved.model,
        prompt: resolved.prompt ?? "",
        idleTimeoutSeconds: resolved.idleTimeoutSeconds ?? 86400,
        heartbeatSeconds: resolved.heartbeatSeconds ?? DEFAULT_HEARTBEAT_SECONDS,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, profiles };
}
