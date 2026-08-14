import type { StageBindingMap } from "../../../config/binding/types.js";
import { loadStageSettings } from "../../../config/settings/load.js";
import type { RunPreflightResult } from "../types.js";

/**
 * Load and validate the optional settings document. A missing file is an empty
 * stage map, so a complete profile runs without one.
 */
export function loadRunSettings(
  configRoot: string,
): RunPreflightResult<{ stages: StageBindingMap }> {
  const settings = loadStageSettings(configRoot);
  if (!settings.ok) {
    return {
      ok: false,
      refusal: {
        kind: "rejected-document",
        label: "settings document",
        sourcePath: settings.sourcePath,
        errors: settings.errors,
      },
    };
  }
  return { ok: true, stages: settings.stages };
}
