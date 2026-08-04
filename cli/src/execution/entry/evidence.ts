import type { WaitingRecovery } from "../../state/checkpoint.js";
import { evaluatePromisedState } from "../../thread/artifacts.js";
import type { QueueScan } from "../../thread/queues.js";
import { scanPendingQueues } from "../../thread/queues.js";
import type { StageContext } from "../context.js";
import { signalReason } from "../interruption.js";
import { readWorktreeCleanliness } from "../observations.js";
import type {
  ContractEvidence,
  QueueEvidence,
  RecoveryEvidence,
} from "../recovery-policy.js";

/**
 * The fresh facts a resumed pause is decided from, observed before anything is
 * decided.
 *
 * Queue evidence gates every recovery alike, so it is read first and read always.
 * The rest is observed only where the recorded recovery calls for it: held queues
 * decide the pause on their own, and nothing further is read while a human still
 * owes the thread work.
 */

export type EvidenceOutcome =
  | { kind: "gathered"; evidence: RecoveryEvidence }
  /** A signal arrived while the cursor was still durably at rest. */
  | { kind: "interrupted"; signal: NodeJS.Signals }
  /** The worktree could not be inspected, so who owns the uncommitted work — the
   * fact an unmet promise is read against — cannot be established. */
  | { kind: "worktree-unreadable"; message: string };

/** A fresh queue scan in the shape the recovery policy reads it. */
function queueEvidence(scan: QueueScan): QueueEvidence {
  if (!scan.ok) return { kind: "scan-failed", message: scan.message };
  if (scan.pendingFiles.length > 0) {
    return { kind: "pending", pendingFiles: scan.pendingFiles };
  }
  return { kind: "clear" };
}

export async function gatherRecoveryEvidence(
  ctx: StageContext,
  recovery: WaitingRecovery,
): Promise<EvidenceOutcome> {
  const queues = queueEvidence(
    await scanPendingQueues(ctx.repoRoot, ctx.threadRelPath),
  );
  const sig = signalReason(ctx.signal);
  if (sig !== null) return { kind: "interrupted", signal: sig };

  let contract: ContractEvidence | undefined;
  if (
    queues.kind === "clear" &&
    (recovery.kind === "recheck-stage-contract" ||
      recovery.kind === "retry-git-finalization")
  ) {
    const inspection = await ctx.inspectArtifacts(ctx.repoRoot, ctx.threadRelPath);
    if (!inspection.ok) {
      // A thread the artifacts cannot be read in is also a thread whose queues
      // cannot be scanned, and the queue gate above already holds the pause in
      // that case — so no end-to-end path reaches this branch. It is written
      // anyway because pausing is the fail-closed direction: a promise that
      // could not be evaluated is never credited as kept.
      contract = { kind: "uninspectable", message: inspection.message };
    } else {
      const unmet = evaluatePromisedState(inspection.state, ctx.stage.promises);
      if (unmet.length === 0) {
        contract = { kind: "satisfied" };
      } else {
        const worktree = await readWorktreeCleanliness(ctx);
        if (!worktree.ok) {
          return { kind: "worktree-unreadable", message: worktree.message };
        }
        contract = { kind: "unmet", unmet, worktree: worktree.value };
      }
    }
  }

  return {
    kind: "gathered",
    evidence: {
      queues,
      ...(contract !== undefined ? { contract } : {}),
    },
  };
}
