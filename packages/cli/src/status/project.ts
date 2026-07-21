// The single canonical status projection. Every `status` invocation — human or
// JSON, repository or all scope — reconciles its scoped runs, restores stale
// observation for still-active runs, and folds the result together with the
// independent attention scan into exactly one {@link StatusDocumentV1}. The
// document is the sole projection source: human and JSON renderings both read
// it, so they can never disagree. Reconciliation is idempotent and never
// regresses an already-terminal record; observer restoration never creates a
// second run.

import {
  collectAttention,
  isTerminalClassification,
  projectStatusDocument,
  type RunRecord,
  type StatusDocumentV1,
  type StatusScope,
  type ThreadPendingCounts,
} from "@antmay/core";
import type { EnsureObserverResult } from "../observer/ensure-observer";
import type { ReconcileRunResult } from "../observer/reconcile-run";

/** The seams a status projection composes over. */
export type StatusProjectionInput = {
  /** The projected scope: repository (canonical folder) or all repositories. */
  readonly scope: StatusScope;
  /** The scoped run records to reconcile and report. */
  readonly runs: readonly RunRecord[];
  /** Reconcile one run against current transcript and endpoint evidence. */
  readonly reconcile: (record: RunRecord) => ReconcileRunResult;
  /** Restore observation for a still-active run whose worker is stale/degraded. */
  readonly ensureObserver: (record: RunRecord) => EnsureObserverResult;
  /** Raw pending-bundle counts scanned from the scoped active thread roots. */
  readonly attention: readonly ThreadPendingCounts[];
};

/** The canonical projection plus any diagnostics to route to stderr. */
export type StatusProjection = {
  readonly document: StatusDocumentV1;
  readonly diagnostics: readonly string[];
};

/**
 * Build the one canonical status document. Each scoped run is reconciled before
 * projection; a still-active run whose observation is stale, degraded, or
 * missing has its detached observer relaunched for the SAME run. An
 * already-terminal record is left exactly as recorded. Attention is derived
 * independently of run classification and empty workspaces are dropped.
 */
export function buildStatusProjection(
  input: StatusProjectionInput,
): StatusProjection {
  const diagnostics: string[] = [];
  const reconciled: RunRecord[] = [];

  for (const run of input.runs) {
    const result = input.reconcile(run);
    reconciled.push(result.record);
    if (result.diagnostic !== null) {
      diagnostics.push(`${result.record.id}: ${result.diagnostic}`);
    }
    if (!isTerminalClassification(result.record.classification)) {
      const ensured = input.ensureObserver(result.record);
      if (ensured.action === "restored") {
        diagnostics.push(`${result.record.id}: ${ensured.reason}`);
      }
    }
  }

  const document = projectStatusDocument({
    scope: input.scope,
    runs: reconciled,
    attention: collectAttention(input.attention),
  });

  return { document, diagnostics };
}
