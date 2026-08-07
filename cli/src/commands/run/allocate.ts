import { randomBytes } from "node:crypto";

import { VERSION } from "../../cli/help.js";
import type { RunCheckpoint } from "../../state/checkpoint/types.js";
import { acquireWorkspaceLock } from "../../state/lock.js";
import { writeCheckpoint } from "../../state/persist.js";
import { createRunDirectory, generateRunId } from "../../state/runs.js";
import { resolveCurrentCheckoutWorkspace } from "../../workspace/current-checkout.js";
import { scanRunPendingQueues } from "./preflight/scan-pending-queues.js";
import type {
  RunAllocationInput,
  RunAllocationResult,
  RunInitialCheckpointWriter,
} from "./types.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Allocate a new run as one transaction: resolve the canonical workspace, then
 * for each candidate ID acquire the lock, rescan queues under it, create the
 * directory, and persist the initial `ready` checkpoint. Success returns the
 * run directory, checkpoint, and still-held lock together; every failure after
 * lock acquisition releases the lock. Collision releases and restarts with a
 * fresh ID including lock and queue checks. Does not render, select an exit
 * code, inspect signals, or invoke the engine.
 */
export async function allocateRun(
  input: RunAllocationInput,
): Promise<RunAllocationResult> {
  const {
    stateRoot,
    repoRoot,
    threadRelPath,
    dangerouslySkipPermissions,
    pipelineName,
    pipelineSourcePath,
    profileSelection,
    fromStage,
    stages,
    observedHarnessVersions,
    runtime,
    clock,
    generateId = () => generateRunId(clock(), (n) => randomBytes(n)),
  } = input;
  const persistInitialCheckpoint: RunInitialCheckpointWriter =
    input.writeInitialCheckpoint ?? writeCheckpoint;

  const workspace = await resolveCurrentCheckoutWorkspace(repoRoot);

  for (;;) {
    const candidate = generateId();

    const lockOutcome = await acquireWorkspaceLock(
      stateRoot,
      workspace.path,
      candidate,
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
    const lock = lockOutcome.handle;

    const lockedScan = await scanRunPendingQueues(repoRoot, threadRelPath);
    if (!lockedScan.ok || lockedScan.pendingFiles.length > 0) {
      await lock.release();
      if (!lockedScan.ok) {
        return {
          ok: false,
          refusal: { kind: "queue-scan-error", message: lockedScan.message },
        };
      }
      return {
        ok: false,
        refusal: {
          kind: "pending-files",
          pendingFiles: lockedScan.pendingFiles,
        },
      };
    }

    const created = await createRunDirectory(stateRoot, candidate);
    if (created.kind === "collision") {
      await lock.release();
      continue;
    }

    const now = clock().toISOString();
    const checkpoint: RunCheckpoint = {
      schemaVersion: 0,
      runId: candidate,
      executor: { pid: process.pid, version: VERSION },
      createdAt: now,
      updatedAt: now,
      repoRoot,
      threadRelPath,
      workspace,
      dangerouslySkipPermissions,
      pipelineName,
      pipelineSourcePath,
      profileSelection,
      ...(fromStage !== null ? { fromStage } : {}),
      stages,
      observedHarnessVersions,
      runtime,
      stageIndex: 0,
      condition: "ready",
      attempts: [],
      waiting: null,
    };
    try {
      await persistInitialCheckpoint(created.runDir, checkpoint);
    } catch (error) {
      await lock.release();
      return {
        ok: false,
        refusal: {
          kind: "checkpoint-write-failed",
          runDir: created.runDir,
          message: errorMessage(error),
        },
      };
    }

    return { ok: true, runDir: created.runDir, checkpoint, lock };
  }
}
