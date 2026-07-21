// Reconcile a single registered run against its current transcript and endpoint
// evidence, then apply the resulting decision to durable state. This is the
// CLI-side composition of the pure `reconcileEvidence` decision with the Task 3
// registry store, the Task 5 transcript readers, and the Task 6 execution
// adapter's liveness probe. It NEVER closes, exits, sends input to, attaches to,
// or otherwise mutates the harness pane — the only adapter call it makes is the
// read-only liveness probe. Applying a terminal transition goes through the
// store's atomic, regression-proof `terminalize`, so a duplicate or racing
// reconciliation yields exactly one immutable terminal record.

import {
  type AttachmentHandle,
  type EndpointLiveness,
  isTerminalClassification,
  type RunId,
  type RunRecord,
  reconcileEvidence,
  type TranscriptOutcomeSignal,
  type WorkerHealth,
} from "@antmay/core";
import type { ExecutionAdapter } from "../adapters/types";
import {
  type FilesystemRegistryStore,
  TerminalConflictError,
} from "../state/registry-store";
import type { TranscriptEvidence } from "../transcripts/types";

/** Reads structured transcript evidence for a specific registered run. */
export type RunEvidenceReader = (record: RunRecord) => TranscriptEvidence;

/** The collaborators a single reconciliation composes over. */
export type ReconcileRunDeps = {
  /** The atomic per-user registry store. */
  readonly store: FilesystemRegistryStore;
  /** The execution adapter used solely for a read-only liveness probe. */
  readonly adapter: ExecutionAdapter;
  /** Reads the run's harness transcript into four-state evidence. */
  readonly readEvidence: RunEvidenceReader;
};

/** The result of reconciling one run. */
export type ReconcileRunResult = {
  /** The run record after reconciliation (terminal or still active). */
  readonly record: RunRecord;
  /** True only when THIS call caused the terminal transition. */
  readonly terminalized: boolean;
  /** The observer health for the run after this reconciliation. */
  readonly health: WorkerHealth;
  /** A retained diagnostic for degraded observation, or `null`. */
  readonly diagnostic: string | null;
};

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Map four-state transcript evidence onto the abstract signal the pure decision
// consumes, keeping a diagnostic for the non-final kinds.
function transcriptSignal(evidence: TranscriptEvidence): {
  signal: TranscriptOutcomeSignal;
  diagnostic: string | null;
} {
  switch (evidence.kind) {
    case "final":
      return {
        signal: { kind: "final", outcome: evidence.outcome },
        diagnostic: null,
      };
    case "pending":
      // The transcript read cleanly but carries no outcome yet: not a gap.
      return { signal: { kind: "none" }, diagnostic: null };
    case "unavailable":
      return {
        signal: { kind: "indeterminate", detail: evidence.detail },
        diagnostic: evidence.detail,
      };
    case "malformed":
      return {
        signal: { kind: "indeterminate", detail: evidence.detail },
        diagnostic: `${evidence.detail} (${evidence.skippedLines} malformed line(s) skipped)`,
      };
  }
}

// Probe the endpoint through the adapter's read-only liveness operation. A
// thrown adapter error is an indeterminate observation gap, never proof the
// endpoint ended; a reported non-alive pane is positive absence evidence.
function probeLiveness(
  adapter: ExecutionAdapter,
  handle: AttachmentHandle | null,
): EndpointLiveness {
  if (handle === null) {
    return {
      kind: "indeterminate",
      detail: "no attachment handle is recorded for this run.",
    };
  }
  try {
    return adapter.liveness(handle).alive
      ? { kind: "alive" }
      : { kind: "ended" };
  } catch (error) {
    return {
      kind: "indeterminate",
      detail: `endpoint liveness probe failed: ${describeError(error)}`,
    };
  }
}

/**
 * Reconcile a single run by public ID. Loads exactly one record, reads its
 * harness transcript, probes its endpoint liveness, and applies the pure
 * decision: an atomic terminal transition through the store, otherwise a worker
 * health update. An already-terminal record is returned untouched so a
 * duplicate reconciliation never regresses or rewrites it.
 */
export function reconcileRun(
  runId: RunId,
  deps: ReconcileRunDeps,
): ReconcileRunResult {
  const record = deps.store.findByIdGlobal(runId);
  if (record === undefined) {
    throw new Error(`No run registered with ID "${runId}".`);
  }

  // A record that already holds a terminal classification is immutable. Skip
  // every probe and leave it exactly as recorded.
  if (isTerminalClassification(record.classification)) {
    return {
      record,
      terminalized: false,
      health: record.workerHealth,
      diagnostic: record.workerHealth.detail,
    };
  }

  const transcript = transcriptSignal(deps.readEvidence(record));
  const liveness = probeLiveness(deps.adapter, record.attachment.handle);
  const decision = reconcileEvidence({
    transcript: transcript.signal,
    liveness,
  });

  if (decision.action === "terminalize") {
    try {
      // The record was active on entry, so this atomic transition is the one
      // that finalizes it.
      const next = deps.store.terminalize(
        record.repositoryPath,
        runId,
        decision.outcome,
      );
      return {
        record: next,
        terminalized: true,
        health: decision.health,
        diagnostic: null,
      };
    } catch (error) {
      if (error instanceof TerminalConflictError) {
        // Another reconciliation already finalized this run differently. Accept
        // the existing immutable terminal record rather than regress it.
        const current = deps.store.findByIdGlobal(runId) ?? record;
        return {
          record: current,
          terminalized: false,
          health: current.workerHealth,
          diagnostic: current.workerHealth.detail,
        };
      }
      throw error;
    }
  }

  const updated = deps.store.updateWorkerHealth(
    record.repositoryPath,
    runId,
    decision.health,
  );
  const diagnostic = transcript.diagnostic ?? decision.health.detail;
  return {
    record: updated,
    terminalized: false,
    health: decision.health,
    diagnostic,
  };
}
