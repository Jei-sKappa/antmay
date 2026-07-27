import type { HarnessId } from "../config/execution.js";

/**
 * Render the inline stage prompt for a harness. The catalog-owned trigger is the
 * first prompt content: `$<skill>` for Codex, `/<skill>` for Claude Code,
 * followed by a space and the concrete resolved target in backticks and a
 * period. The pipeline entry's portable instructions are appended after a single
 * space when the entry carried any; a stage without instructions adds nothing
 * beyond the trigger and target.
 */
export function renderStagePrompt(
  harness: HarnessId,
  skill: string,
  resolvedTarget: string,
  instructions?: string,
): string {
  const trigger = harness === "codex" ? `$${skill}` : `/${skill}`;
  const base = `${trigger} \`${resolvedTarget}\`.`;
  return instructions === undefined || instructions.length === 0
    ? base
    : `${base} ${instructions}`;
}
