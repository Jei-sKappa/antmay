import type { HarnessId } from "../../config/execution.js";
import type { AgentHarness } from "../provider.js";
import { CLAUDE_CODE } from "./claude-code.js";
import { CODEX } from "./codex.js";

/**
 * Every harness the executor can drive, by id. Total over `HarnessId`, so a new
 * harness is a new file plus a row here and fails to compile until both exist.
 * Every caller that needs harness-specific behavior indexes this record; none
 * imports a provider directly, which is what keeps a caller from handling one
 * harness and not the other.
 */
export const HARNESSES: Record<HarnessId, AgentHarness> = {
  codex: CODEX,
  "claude-code": CLAUDE_CODE,
};
