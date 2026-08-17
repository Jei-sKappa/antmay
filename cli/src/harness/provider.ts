import type { HarnessId } from "./id.js";

/**
 * One agentic harness the executor can drive: everything Antmay must know about
 * it that is independent of how it is invoked.
 *
 * An adapter drives a harness; this is the harness itself, so nothing declared
 * here performs I/O or knows a provider SDK. That is what lets the prompt
 * renderer and the engine reach a harness statically without loading an adapter
 * family.
 */
export interface AgentHarness {
  /** The id settings, profiles, snapshots, and attempt headers name it by. */
  readonly id: HarnessId;
  /** The executable a locally installed harness is reached through on `PATH`. */
  readonly executable: string;
  /** The prompt prefix that triggers `skill` in this harness. */
  skillTrigger(skill: string): string;
  /** The paste-ready command that reopens the conversation `sessionId` held. */
  continuationCommand(sessionId: string): string;
}
