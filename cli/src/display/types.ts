import type { HarnessEvent } from "../harness/types.js";
import type { WaitingInfo } from "../state/checkpoint.js";

/**
 * The sink the stage runner emits every operational event to. Every method is
 * synchronous and fire-and-forget: the runner never awaits a display call, and
 * a display implementation must not throw back into the runner. The concrete
 * terminal renderer implements this; tests pass `nullDisplay`.
 */
export interface Display {
  /** A fresh attempt is about to launch its harness. */
  attemptStarted(info: {
    stagePosition: string;
    stageId: string;
    harness: string;
    model: string;
    attempt: number;
    logAbsPath: string;
  }): void;
  /** One normalized event from the live harness stream. */
  harnessEvent(event: HarnessEvent): void;
  /** The five-minute elapsed-time heartbeat for the live attempt. */
  heartbeat(elapsedMs: number): void;
  /** A stage finalized and the run advanced past it. */
  stageSucceeded(info: { stagePosition: string; durationMs: number }): void;
  /** The run durably paused for a human. `logAbsPath` is null for a pause taken
   * before any attempt was allocated. */
  runPaused(info: {
    waiting: WaitingInfo;
    runId: string;
    logAbsPath: string | null;
    resumeCommand: string;
    checkpointPath: string;
  }): void;
  /** The final stage finalized and the whole recipe completed. */
  runCompleted(info: {
    runId: string;
    recipeName: string;
    totalElapsedMs: number;
    checkpointPath: string;
  }): void;
  /** An out-of-band warning that is not itself a pause. */
  warn(message: string): void;
}

/**
 * A `Display` that discards every event. Used by tests that drive the runner
 * without asserting on rendered output.
 */
export const nullDisplay: Display = {
  attemptStarted: () => undefined,
  harnessEvent: () => undefined,
  heartbeat: () => undefined,
  stageSucceeded: () => undefined,
  runPaused: () => undefined,
  runCompleted: () => undefined,
  warn: () => undefined,
};
