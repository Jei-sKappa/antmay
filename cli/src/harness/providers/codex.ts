import type { AgentHarness } from "../provider.js";
import { posixSingleQuote } from "./shell-quote.js";

/** Codex recognizes a skill trigger written with a leading `$`. */
function skillTrigger(skill: string): string {
  return `$${skill}`;
}

/**
 * `codex resume <id>` reopens the conversation an attempt held. Pure: no
 * provider filesystem access, transcript probe, or subprocess launch.
 */
function continuationCommand(sessionId: string): string {
  return `codex resume ${posixSingleQuote(sessionId)}`;
}

export const CODEX: AgentHarness = {
  id: "codex",
  executable: "codex",
  skillTrigger,
  continuationCommand,
};
