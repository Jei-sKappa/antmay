import type { HarnessEvent } from "../harness/types.js";
import type { WaitingInfo } from "../state/checkpoint.js";

/**
 * How a stage that did not finalize ended, as the stage itself reported it —
 * derived from the attempt's own terminal token, never from the reason that
 * governs the run's pause.
 */
export type StageDisposition = "refused" | "blocked" | "failed" | "interrupted";

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
  /** A stage finalized. Emitted both when the run advances past it and when a
   * DONE-finalized stage holds for a pending-queue bundle. */
  stageSucceeded(info: { stagePosition: string; durationMs: number }): void;
  /** A stage ended without finalizing. Exactly one `stageSucceeded` or
   * `stageStopped` follows every `attemptStarted`. */
  stageStopped(info: {
    stagePosition: string;
    durationMs: number;
    disposition: StageDisposition;
  }): void;
  /** The run durably paused for a human. `logAbsPath` is null for a pause taken
   * before any attempt was allocated. */
  runPaused(info: {
    waiting: WaitingInfo;
    runId: string;
    recipeName: string;
    totalElapsedMs: number;
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
    stageCount: number;
  }): void;
  /** A signal stopped the run between stages, leaving the checkpoint untouched
   * and the run resumable exactly where it stood. */
  runInterrupted(info: {
    runId: string;
    recipeName: string;
    totalElapsedMs: number;
    checkpointPath: string;
    resumeCommand: string;
    signal: NodeJS.Signals;
  }): void;
  /** The run could not persist its own state and ended without pausing safely.
   * Carries no resume command: the checkpoint on disk is not known to reflect
   * where the run actually stood. */
  runFailed(info: {
    runId: string;
    recipeName: string;
    totalElapsedMs: number;
    checkpointPath: string;
    message: string;
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
  stageStopped: () => undefined,
  runPaused: () => undefined,
  runCompleted: () => undefined,
  runInterrupted: () => undefined,
  runFailed: () => undefined,
  warn: () => undefined,
};
