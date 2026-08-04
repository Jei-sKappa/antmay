import type { AttemptReference, WaitingRecovery } from "../state/checkpoint.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";
import type {
  FailedFinalization,
  FinalizingRecovery,
  GitFinalizationFailure,
  HeldQueues,
  PreservedDoneEvidence,
  RecoveryCase,
  RecoveryDecidedFrom,
  WorktreeCleanliness,
} from "./recovery.js";

/**
 * Which of the boundary's recovery contexts a requested finalization is. A
 * contract repair applies the referenced attempt's own `HEAD` rule for the first
 * time; a retry re-runs a boundary that was already judged under that rule.
 */
export type BoundaryFinalizationContext = "after-contract-repair" | "boundary-retry";

/**
 * What a still-paused run has newly learned. These are diagnostic facts alone:
 * the directive's recovery, not any of these, says what a later resume may do.
 */
export type RefreshedPauseFacts =
  | { kind: "pending-bundles"; pendingFiles: string[] }
  | { kind: "queue-scan-failed"; message: string }
  | { kind: "promise-uninspectable"; message: string }
  | {
      kind: "promise-unmet";
      unmet: ArtifactMismatch[];
      worktree: WorktreeCleanliness;
    }
  | {
      kind: "git-finalization-failed";
      failure: GitFinalizationFailure;
      message: string;
    };

/**
 * The closed vocabulary of what a resume may do about a paused run.
 *
 * - `retry-stage` launches a fresh attempt at the current stage.
 * - `advance-stage` moves to the next stage of the snapshot.
 * - `finalize-boundary` asks for the Git boundary of the saved `DONE` its
 *   `recovery` names, measured against the tip that recovery observed at the
 *   pause, in the named context. Carrying the whole recovery is what lets a
 *   failed finalization be re-decided from the same value.
 * - `remain-paused` leaves the run paused, carrying the recovery a later resume
 *   acts on and the facts that pause now has to explain.
 *
 * These are domain directives: none of them is a checkpoint, a patch of one, or
 * a rendering. Turning one into a durable transition belongs to the caller.
 */
export type RecoveryDirective =
  | { kind: "retry-stage" }
  | { kind: "advance-stage" }
  | {
      kind: "finalize-boundary";
      recovery: FinalizingRecovery;
      context: BoundaryFinalizationContext;
    }
  | { kind: "remain-paused"; recovery: WaitingRecovery; facts: RefreshedPauseFacts };

/**
 * A boundary that could not be finalized leaves its attempt exactly as
 * finalizable as it was, so the pause keeps a `retry-git-finalization` recovery
 * aimed at the same attempt — re-aimed at the tip this failure left behind, so
 * the next attempt measures from where this one stopped.
 */
function stillFinalizable(
  attempt: AttemptReference,
  git: FailedFinalization,
): RecoveryDirective {
  return {
    kind: "remain-paused",
    recovery: {
      kind: "retry-git-finalization",
      attempt,
      pausedAtHead: git.observedHead,
    },
    facts: {
      kind: "git-finalization-failed",
      failure: git.failure,
      message: git.message,
    },
  };
}

/**
 * Queues held. The run stays paused on the recovery it already had, so nothing
 * this resume does can cost it the action it was waiting to take.
 */
function heldByQueues(
  recovery: WaitingRecovery,
  queues: HeldQueues,
): RecoveryDirective {
  switch (queues.kind) {
    case "scan-failed":
      return {
        kind: "remain-paused",
        recovery,
        facts: { kind: "queue-scan-failed", message: queues.message },
      };
    case "pending":
      return {
        kind: "remain-paused",
        recovery,
        facts: { kind: "pending-bundles", pendingFiles: queues.pendingFiles },
      };
  }
}

/** The recoveries a clear queue is the whole of the evidence for. */
function decideWithoutFreshEvidence(
  recovery: RecoveryDecidedFrom<"queues-only">,
): RecoveryDirective {
  switch (recovery.kind) {
    case "retry-stage":
      return { kind: "retry-stage" };
    case "resume-finalized-done":
      // The attempt is already finalized and is never touched again; releasing
      // the queue applies the resolution its stage declared.
      return recovery.queueResolution === "advance"
        ? { kind: "advance-stage" }
        : { kind: "retry-stage" };
  }
}

/** The recoveries holding a saved `DONE` whose boundary has still to succeed. */
function decidePreservedDone(
  recovery: FinalizingRecovery,
  evidence: PreservedDoneEvidence,
): RecoveryDirective {
  // A finalization that already ran and failed settles this pass on its own: the
  // promise it was requested on had passed, so it is not reconsidered.
  if (evidence.kind === "finalization-failed") {
    return stillFinalizable(recovery.attempt, evidence);
  }

  switch (recovery.kind) {
    case "recheck-stage-contract":
      switch (evidence.kind) {
        case "promise-satisfied":
          // The repair landed, so the saved DONE is finalizable for the first
          // time and its own HEAD rule applies here.
          return {
            kind: "finalize-boundary",
            recovery,
            context: "after-contract-repair",
          };
        case "promise-unmet":
          // A clean worktree holds nothing a human is in the middle of, so the
          // stage runs again. A dirty one holds the failed attempt's own
          // changes, and only a human can say whether they are a repair or
          // something to revert.
          return evidence.worktree === "clean"
            ? { kind: "retry-stage" }
            : {
                kind: "remain-paused",
                recovery,
                facts: {
                  kind: "promise-unmet",
                  unmet: evidence.unmet,
                  worktree: evidence.worktree,
                },
              };
        case "promise-uninspectable":
          // Nothing about the promise was decided. Staying paused is the only
          // move that keeps the saved DONE finalizable once the thread can be
          // read again; running the stage on "cannot verify" would discard it.
          return {
            kind: "remain-paused",
            recovery,
            facts: {
              kind: "promise-uninspectable",
              message: evidence.message,
            },
          };
      }

    case "retry-git-finalization":
      switch (evidence.kind) {
        case "promise-satisfied":
          return {
            kind: "finalize-boundary",
            recovery,
            context: "boundary-retry",
          };
        case "promise-unmet":
          // The promise this boundary was accepted on no longer holds, so the
          // pause returns to contract repair without discarding the attempt.
          return {
            kind: "remain-paused",
            recovery: {
              kind: "recheck-stage-contract",
              attempt: recovery.attempt,
              pausedAtHead: recovery.pausedAtHead,
            },
            facts: {
              kind: "promise-unmet",
              unmet: evidence.unmet,
              worktree: evidence.worktree,
            },
          };
        case "promise-uninspectable":
          return {
            kind: "remain-paused",
            recovery: {
              kind: "recheck-stage-contract",
              attempt: recovery.attempt,
              pausedAtHead: recovery.pausedAtHead,
            },
            facts: {
              kind: "promise-uninspectable",
              message: evidence.message,
            },
          };
      }
  }
}

/**
 * Decide what a resume does about a paused run, from its recorded recovery and
 * the fresh evidence that recovery's kind declared.
 *
 * The pause's diagnostic reasons are deliberately not an input. They accumulate
 * and change precedence for presentation, so neither their kinds nor their order
 * can reach a directive: two pauses with the same recovery and the same evidence
 * always decide the same way.
 *
 * Queues come first, ahead of every recovery-specific action, and the case says
 * so: a pause whose queues are held carries no other evidence, so no recovery
 * can act while a human still owes the thread work.
 *
 * The function is total and pure: every case it can be handed is one it decides,
 * and it reads no filesystem, runs no Git, invokes no harness, consults no clock,
 * renders nothing, and persists nothing.
 */
export function decideRecovery(paused: RecoveryCase): RecoveryDirective {
  switch (paused.decidedFrom) {
    case "held-queues":
      return heldByQueues(paused.recovery, paused.queues);
    case "queues-only":
      return decideWithoutFreshEvidence(paused.recovery);
    case "preserved-done":
      return decidePreservedDone(paused.recovery, paused.evidence);
  }
}
