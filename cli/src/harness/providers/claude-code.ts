import type { AgentHarness } from "../provider.js";
import { posixSingleQuote } from "./shell-quote.js";

/** Claude Code recognizes a skill trigger written with a leading `/`. */
function skillTrigger(skill: string): string {
  return `/${skill}`;
}

/**
 * `claude --resume <id>` reopens the conversation an attempt held. Pure: no
 * provider filesystem access, transcript probe, or subprocess launch.
 */
function continuationCommand(sessionId: string): string {
  return `claude --resume ${posixSingleQuote(sessionId)}`;
}

export const CLAUDE_CODE: AgentHarness = {
  id: "claude-code",
  executable: "claude",
  skillTrigger,
  continuationCommand,
};
