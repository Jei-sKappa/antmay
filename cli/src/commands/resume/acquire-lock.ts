import type { LockHandle } from "../../state/lock.js";
import { acquireWorkspaceLock } from "../../state/lock.js";

/**
 * Structured refusal when the recorded workspace is already locked. No exit
 * code or renderer — presentation stays in `resumeCommand`.
 */
export type ResumeLockContention = {
  kind: "lock-contention";
  lockPath: string;
  existingRecord: string;
};

/**
 * Successful acquisition: the still-held workspace lock whose release ownership
 * transfers to `resumeCommand`.
 */
export type ResumeLockAcquisitionSuccess = {
  lock: LockHandle;
};

/**
 * Resume lock acquisition result: a still-held lock, or inert contention facts.
 */
export type ResumeLockAcquisitionResult =
  | ({ ok: true } & ResumeLockAcquisitionSuccess)
  | { ok: false; refusal: ResumeLockContention };

/**
 * Acquire the recorded workspace lock for an existing run. Calls the shared
 * lock primitive once and returns either the still-held handle or contention
 * facts. Does not generate IDs, create directories, mutate checkpoints, render,
 * choose exits, inspect signals, or invoke the engine.
 */
export async function acquireResumeLock(
  stateRoot: string,
  workspacePath: string,
  runId: string,
  clock: () => Date,
): Promise<ResumeLockAcquisitionResult> {
  const lockOutcome = await acquireWorkspaceLock(
    stateRoot,
    workspacePath,
    runId,
    clock(),
  );
  if (!lockOutcome.ok) {
    return {
      ok: false,
      refusal: {
        kind: "lock-contention",
        lockPath: lockOutcome.lockPath,
        existingRecord: lockOutcome.existingRecord,
      },
    };
  }
  return { ok: true, lock: lockOutcome.handle };
}
