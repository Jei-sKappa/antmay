import type { HarnessId } from "./id.js";
import { HARNESSES } from "./providers/index.js";

/**
 * Render the inline stage prompt for a harness. The harness's own skill trigger
 * is the first prompt content, followed by a space and the concrete resolved
 * target in backticks and a period. The pipeline entry's portable instructions
 * are appended after a single space when the entry carried any; a stage without
 * instructions adds nothing beyond the trigger and target.
 */
export function renderStagePrompt(
  harness: HarnessId,
  skill: string,
  resolvedTarget: string,
  instructions?: string,
): string {
  const trigger = HARNESSES[harness].skillTrigger(skill);
  const base = `${trigger} \`${resolvedTarget}\`.`;
  return instructions === undefined || instructions.length === 0
    ? base
    : `${base} ${instructions}`;
}
