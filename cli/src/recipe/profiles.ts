import type { AfkSettings, HarnessId, ProfileFields } from "../config/settings.js";
import type { Recipe, StageProfile } from "./types.js";

/**
 * The result of resolving every stage's execution profile. On success the
 * `profiles` array is index-aligned with `recipe.stages`; on failure every
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
  return merged;
}

/**
 * Resolve the execution profile for every stage of `recipe`. For each stage,
 * resolution seeds `{ prompt: "", idleTimeoutSeconds: 86400 }`, shallow-merges
 * `settings.defaults`, then the matching `settings.stages[stage.id]` override,
 * using plain field replacement. A missing or unsupported harness or a
 * missing/empty model after merging is an error naming the stage; all stage
 * errors are reported together.
 */
export function resolveStageProfiles(
  recipe: Recipe,
  settings: AfkSettings,
): ProfilesResult {
  const profiles: StageProfile[] = [];
  const errors: string[] = [];

  for (const stage of recipe.stages) {
    const seed: ProfileFields = { prompt: "", idleTimeoutSeconds: 86400 };
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

    // seed guarantees prompt and idleTimeoutSeconds are always defined.
    if (resolved.harness !== undefined && resolved.model !== undefined && resolved.model.length > 0) {
      profiles.push({
        harness: resolved.harness,
        model: resolved.model,
        prompt: resolved.prompt ?? "",
        idleTimeoutSeconds: resolved.idleTimeoutSeconds ?? 86400,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, profiles };
}
