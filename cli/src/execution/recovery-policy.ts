import type { AttemptReference, WaitingRecovery } from "../state/checkpoint.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";

/**
 * The fresh pending-queue observation. It gates every recovery, because no
 * recovery may act while a human still owes the thread a decision or a review.
 * A scan that could not complete is its own state: an unreadable queue is never
 * an empty one.
 */
export type QueueEvidence =
  | { kind: "clear" }
  | { kind: "pending"; pendingFiles: string[] }
  | { kind: "scan-failed"; message: string };

/** Whether the worktree holds uncommitted work. */
export type WorktreeCleanliness = "clean" | "dirty";

/**
 * The fresh reinspection of the promised artifact state a saved `DONE` attempt
 * was supposed to leave.
 *
 * `unmet` carries the worktree observation with it, because those two facts are
 * only ever read together: a promise that is still unmet means something
 * different depending on whether anything is uncommitted. `uninspectable` means
 * the thread could not be read at all, so nothing about the promise was decided.
 */
export type ContractEvidence =
  | { kind: "satisfied" }
  | {
      kind: "unmet";
      unmet: ArtifactMismatch[];
      worktree: WorktreeCleanliness;
    }
  | { kind: "uninspectable"; message: string };

/** The structured boundary failure observed during this recovery pass. */
export type GitFinalizationFailure =
  | {
      kind: "git-policy-violation";
      treatment: "advisory-head-movement" | "blocking";
    }
  | { kind: "commit-error" }
  | { kind: "git-error" };

/**
 * Whether the Git boundary of the referenced saved `DONE` attempt is still
 * waiting to be attempted, or has just been attempted and failed. A failure
 * carries the tip as observed after it, which is where the next attempt at the
 * same boundary has to measure from.
 */
export type GitReadiness =
  | { kind: "ready" }
  | {
      kind: "finalization-failed";
      failure: GitFinalizationFailure;
      message: string;
      observedHead: string;
    };

/**
 * Everything the policy is allowed to know about the world, gathered by the
 * caller before it decides anything.
 *
 * `queues` is always required. `contract` is required for either recovery that
 * may finalize a saved `DONE` once queues are clear, and `git` is supplied only
 * after a requested finalization has come back. A finalization failure settles
 * that pass without consulting contract evidence again.
 */
export type RecoveryEvidence = {
  queues: QueueEvidence;
  contract?: ContractEvidence;
  git?: GitReadiness;
};

/**
 * Which of the boundary's recovery contexts a requested finalization is. A
 * contract repair applies the referenced attempt's own `HEAD` rule for the first
 * time; a retry re-runs a boundary that was already judged under that rule.
 */
export type BoundaryFinalizationContext = "after-contract-repair" | "boundary-retry";

/**
 * The two recovery variants that hold a saved `DONE` attempt whose Git boundary
 * has still to succeed. They are the only ones a finalization can be requested
 * for, and the only ones a failed finalization can be re-decided from, so naming
 * them as a type keeps that invariant checked rather than assumed.
 */
export type FinalizingRecovery = Extract<
  WaitingRecovery,
  { kind: "recheck-stage-contract" } | { kind: "retry-git-finalization" }
>;

/**
 * Whether `recovery` is holding a saved `DONE` for later Git finalization. Such
 * a pause is waiting for uncommitted repair work, so it is what exempts a resume
 * from the clean-worktree rule and what keeps its own diagnostic kind when fresh
 * evidence arrives.
 */
export function holdsPreservedDone(
  recovery: WaitingRecovery,
): recovery is FinalizingRecovery {
  return (
    recovery.kind === "recheck-stage-contract" ||
    recovery.kind === "retry-git-finalization"
  );
}

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
  git: Extract<GitReadiness, { kind: "finalization-failed" }>,
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
 * Decide what a resume does about a paused run, from its recorded recovery and
 * fresh evidence alone.
 *
 * The pause's diagnostic reasons are deliberately not an input. They accumulate
 * and change precedence for presentation, so neither their kinds nor their order
 * can reach a directive: two pauses with the same recovery and the same evidence
 * always decide the same way.
 *
 * Queues come first, ahead of every recovery-specific action. Work a human still
 * owes the thread, and a queue that could not be read, both leave the run paused
 * on the recovery it already had, so nothing this resume does can cost the run
 * the action it was waiting to take.
 *
 * The function is pure: it reads no filesystem, runs no Git, invokes no harness,
 * consults no clock, renders nothing, and persists nothing.
 */
export function decideRecovery(
  recovery: WaitingRecovery,
  evidence: RecoveryEvidence,
): RecoveryDirective {
  const queues = evidence.queues;
  if (queues.kind === "scan-failed") {
    return {
      kind: "remain-paused",
      recovery,
      facts: { kind: "queue-scan-failed", message: queues.message },
    };
  }
  if (queues.kind === "pending") {
    return {
      kind: "remain-paused",
      recovery,
      facts: { kind: "pending-bundles", pendingFiles: queues.pendingFiles },
    };
  }

  const git = evidence.git ?? { kind: "ready" };

  switch (recovery.kind) {
    case "retry-stage":
      return { kind: "retry-stage" };

    case "resume-finalized-done":
      // The attempt is already finalized and is never touched again; releasing
      // the queue applies the resolution its stage declared.
      return recovery.queueResolution === "advance"
        ? { kind: "advance-stage" }
        : { kind: "retry-stage" };

    case "recheck-stage-contract": {
      // A finalization that already ran and failed settles this pass on its own:
      // the promise it was requested on had passed, so it is not reconsidered.
      if (git.kind === "finalization-failed") {
        return stillFinalizable(recovery.attempt, git);
      }
      const contract = evidence.contract;
      if (contract === undefined) {
        throw new Error(
          "a recheck-stage-contract recovery requires fresh promised-artifact evidence",
        );
      }
      switch (contract.kind) {
        case "satisfied":
          // The repair landed, so the saved DONE is finalizable for the first
          // time and its own HEAD rule applies here.
          return {
            kind: "finalize-boundary",
            recovery,
            context: "after-contract-repair",
          };
        case "unmet":
          // A clean worktree holds nothing a human is in the middle of, so the
          // stage runs again. A dirty one holds the failed attempt's own
          // changes, and only a human can say whether they are a repair or
          // something to revert.
          return contract.worktree === "clean"
            ? { kind: "retry-stage" }
            : {
                kind: "remain-paused",
                recovery,
                facts: {
                  kind: "promise-unmet",
                  unmet: contract.unmet,
                  worktree: contract.worktree,
                },
              };
        case "uninspectable":
          // Nothing about the promise was decided. Staying paused is the only
          // move that keeps the saved DONE finalizable once the thread can be
          // read again; running the stage on "cannot verify" would discard it.
          return {
            kind: "remain-paused",
            recovery,
            facts: {
              kind: "promise-uninspectable",
              message: contract.message,
            },
          };
      }
    }

    case "retry-git-finalization":
      if (git.kind === "finalization-failed") {
        return stillFinalizable(recovery.attempt, git);
      }
      {
        const contract = evidence.contract;
        if (contract === undefined) {
          throw new Error(
            "a retry-git-finalization recovery requires fresh promised-artifact evidence",
          );
        }
        switch (contract.kind) {
          case "satisfied":
            return {
              kind: "finalize-boundary",
              recovery,
              context: "boundary-retry",
            };
          case "unmet":
            return {
              kind: "remain-paused",
              recovery: {
                kind: "recheck-stage-contract",
                attempt: recovery.attempt,
                pausedAtHead: recovery.pausedAtHead,
              },
              facts: {
                kind: "promise-unmet",
                unmet: contract.unmet,
                worktree: contract.worktree,
              },
            };
          case "uninspectable":
            return {
              kind: "remain-paused",
              recovery: {
                kind: "recheck-stage-contract",
                attempt: recovery.attempt,
                pausedAtHead: recovery.pausedAtHead,
              },
              facts: {
                kind: "promise-uninspectable",
                message: contract.message,
              },
            };
        }
      }
  }
}
