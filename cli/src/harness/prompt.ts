import type { HarnessId } from "../config/settings.js";

/**
 * Render the inline stage prompt for a harness. The trigger is the first prompt
 * content: `$<skill>` for Codex, `/<skill>` for Claude Code, followed by a
 * space and the resolved target in backticks and a period. The resolved profile
 * prompt is appended after a single space only when it is non-empty. No generic
 * or workflow-specific instructions are added.
 */
export function renderStagePrompt(
  harness: HarnessId,
  skill: string,
  resolvedTarget: string,
  profilePrompt: string,
): string {
  const trigger = harness === "codex" ? `$${skill}` : `/${skill}`;
  const base = `${trigger} \`${resolvedTarget}\`.`;
  return profilePrompt.length > 0 ? `${base} ${profilePrompt}` : base;
}
