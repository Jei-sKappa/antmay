// Restore observation for a still-active run whose worker is missing, stale, or
// degraded. This is the recovery path a later `status` reconciliation uses: it
// inspects the run's operational sidecar, and when observation is no longer
// healthy it relaunches a detached observer for the SAME run. It never registers
// a second run, never mutates the authoritative record, and never terminalizes
// or otherwise regresses the run — a terminal run needs no observer and is left
// untouched.

import type { RunId } from "@antmay/core";
import { isTerminalClassification } from "@antmay/core";
import type { FilesystemRegistryStore } from "../state/registry-store";
import { type LaunchObserverOptions, launchObserver } from "./worker-launcher";

/** How long a heartbeat may age before its observer is considered stale. */
export const DEFAULT_STALE_MS = 60_000;

/** The collaborators the recovery check composes over. */
export type EnsureObserverDeps = {
  /** The atomic per-user registry store. */
  readonly store: FilesystemRegistryStore;
  /** The current wall-clock time source, in epoch milliseconds. */
  readonly now: () => number;
  /** The heartbeat-age threshold; defaults to {@link DEFAULT_STALE_MS}. */
  readonly staleMs?: number;
  /** The launcher used to restore observation; defaults to `launchObserver`. */
  readonly launch?: (
    runId: RunId,
    options?: LaunchObserverOptions,
  ) => {
    readonly pid: number | null;
  };
  /** Launch options forwarded to the launcher when restoring observation. */
  readonly launchOptions?: LaunchObserverOptions;
};

/** The outcome of an ensure-observer check. */
export type EnsureObserverResult = {
  /**
   * - `not-applicable` — the run is unknown to the registry or already terminal.
   * - `healthy` — a live, fresh, healthy observer is already watching the run.
   * - `restored` — observation was stale/degraded/absent and was relaunched.
   */
  readonly action: "not-applicable" | "healthy" | "restored";
  /** A one-line explanation of the decision. */
  readonly reason: string;
  /** The relaunched observer's process id when `action` is `restored`. */
  readonly pid?: number | null;
};

/**
 * Ensure an active run is being observed, relaunching a detached observer when
 * its worker is missing, stale, or degraded. The run's classification and every
 * other recorded field are left exactly as they are.
 */
export function ensureObserver(
  runId: RunId,
  deps: EnsureObserverDeps,
): EnsureObserverResult {
  const record = deps.store.findByIdGlobal(runId);
  if (record === undefined) {
    return {
      action: "not-applicable",
      reason: `No run registered with ID "${runId}".`,
    };
  }
  if (isTerminalClassification(record.classification)) {
    return {
      action: "not-applicable",
      reason: "The run is terminal and needs no observer.",
    };
  }

  const staleMs = deps.staleMs ?? DEFAULT_STALE_MS;
  const launch = deps.launch ?? launchObserver;
  const worker = deps.store.readWorkerRecord(record.repositoryPath, runId);

  const restore = (reason: string): EnsureObserverResult => {
    const result = launch(runId, deps.launchOptions);
    return { action: "restored", reason, pid: result.pid };
  };

  if (worker === undefined) {
    return restore("No observer heartbeat is recorded for the run.");
  }
  if (worker.health.state !== "healthy") {
    return restore(
      `The observer is ${worker.health.state}; restoring observation.`,
    );
  }
  if (worker.heartbeatAt === null) {
    return restore("The observer recorded no heartbeat timestamp.");
  }
  const heartbeatMs = Date.parse(worker.heartbeatAt);
  if (!Number.isFinite(heartbeatMs)) {
    return restore("The observer heartbeat timestamp is unreadable.");
  }
  if (deps.now() - heartbeatMs > staleMs) {
    return restore("The observer heartbeat is stale; restoring observation.");
  }

  return {
    action: "healthy",
    reason: "A healthy observer is already watching the run.",
  };
}
