import type { AttemptInterval } from "../gitops/boundary.js";
import {
  gateErrorMessage,
  pendingQueuesMessage,
  queueReasons,
} from "../runner/classify.js";
import { DONE_OUTCOME } from "../runner/outcome.js";
import type {
  AttemptReference,
  WaitingInfo,
  WaitingReason,
  WaitingReasonOf,
  WaitingReasons,
  WaitingRecovery,
} from "../state/checkpoint/types.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";
import {
  artifactMismatchesEqual,
  describeContractSide,
} from "../thread/artifacts.js";
import type {
  GitFinalizationFailure,
  WorktreeCleanliness,
} from "./recovery.js";

/**
 * Every pause the executor can record, and the one equality that says whether
 * two of them mean the same thing.
 *
 * A pause is one value with three parts — the ordered reasons that explain it,
 * the single recovery that decides its resume, and the one instruction that
 * belongs to the run rather than to any reason — and assembling it correctly is
 * a judgement per situation, not a shape to spread. Every such judgement lives
 * here, one function per situation, so the whole set of pauses the terminal can
 * draw is readable from one file and every distinct one can be given a demo
 * scenario deliberately rather than by accident.
 *
 * Each builder is a pure function of the facts it is handed: it reads no
 * filesystem, runs no Git, consults no clock, and persists nothing. Deciding
 * *which* situation holds belongs to the caller; wording it belongs here.
 */

/**
 * The instruction every non-DONE and boundary pause carries: the attempt's file
 * changes never passed the terminal-outcome gate, so a human must dispose of
 * them deliberately before the stage runs again.
 */
const UNVALIDATED_CHANGES_NOTE =
  "The attempt's file changes are unvalidated: revert them or deliberately " +
  "commit them before resuming.";

/**
 * The instruction an artifact-contract pause carries. The attempt reported `DONE`
 * without leaving the artifact state its stage promises, so the human chooses
 * which of the two recoveries resume takes: repairing the artifact finalizes the
 * completed attempt, and reverting its changes runs the stage again.
 */
const CONTRACT_REPAIR_NOTE =
  "Repair the promised artifact and resume to finalize the completed attempt, " +
  "or revert the attempt's unvalidated changes and resume to run the stage again.";

/**
 * The instruction a pre-attempt prerequisite pause carries: the stage was never
 * launched, so there is nothing to revert — the artifacts the pause listed have
 * to come back, and the worktree has to be clean, before the stage can run.
 *
 * One static sentence, never composed from the unmet dimensions: the pause's
 * requirement sections already show which thread files need attention.
 */
const RESTORE_PREREQUISITE_NOTE =
  "Fix the thread files shown above and leave the worktree clean, then resume.";

/**
 * The instruction an advisory `HEAD`-movement pause carries. One resume may
 * accept the movement, so the note says what a reader can safely expect rather
 * than asking them to dispose of anything.
 */
const HEAD_MOVEMENT_NOTE =
  "Inspect the attempt's commits if needed. This HEAD movement will not block " +
  "the next resume; Antmay will continue if the promised artifact and remaining Git checks pass.";

/** What an attempt that never reached a terminal outcome reports as its reason. */
const INTERRUPTED_MESSAGE =
  "The attempt was interrupted before producing a terminal outcome.";

/**
 * Why a still-unmet promise is reported without running the stage again: a dirty
 * worktree holds the attempt's own changes, which only a human may dispose of.
 */
const DIRTY_WORKTREE_DETAIL =
  "The worktree is dirty, so the stage was not run again: those " +
  "changes are the attempt's own and no executor may discard them.";

/** Why a still-unmet promise keeps its saved `DONE` rather than discarding it. */
const PRESERVED_DONE_DETAIL =
  `The saved ${DONE_OUTCOME} remains preserved until the promised artifact ` +
  "is repaired and its Git boundary can be retried.";

/** The stage a prerequisite pause names, as the pause states it. */
type PausedStage = { stagePosition: string; stageId: string };

/**
 * What a post-DONE pause needs to keep its saved attempt finalizable: which
 * attempt it is, the tip observed at the pause, and the post-attempt queue
 * observation, whose own reasons are reported alongside the violation.
 */
type PreservedDone = {
  attempt: AttemptReference;
  pausedAtHead: string;
  pendingFiles: string[];
  queueScanError: string | null;
};

/**
 * Whether the stage's Git boundary was reached and refused. A refusal leaves a
 * finalizable `DONE`, which is what makes the pause's recovery a boundary retry
 * rather than a stage retry, and only a refusal can be advisory — so the
 * advisory flag and the tip it is measured from cannot be stated without one.
 */
export type BoundaryOutcome =
  | { refused: false }
  | { refused: true; advisoryHeadMovement: boolean; observedHead: string };

/**
 * The trailing reasons with every queue-scan diagnostic dropped. A refreshed
 * pause explains the scan it just performed, so an earlier scan's reason is
 * stale evidence rather than a second problem.
 */
function withoutGateErrors(
  reasons: readonly WaitingReason[],
): WaitingReason[] {
  return reasons.filter((reason) => reason.kind !== "gate-error");
}

/** The reason a failed pending-queue scan carries, with its own error text. */
function gateErrorReason(scanMessage: string): WaitingReasonOf<"gate-error"> {
  return {
    kind: "gate-error",
    message: gateErrorMessage(scanMessage),
    errorMessage: scanMessage,
  };
}

/** The reason a set of still-present bundle files carries. */
function pendingQueuesReason(
  pendingFiles: string[],
): WaitingReasonOf<"pending-queues"> {
  return {
    kind: "pending-queues",
    message: pendingQueuesMessage(pendingFiles),
    pendingFiles,
  };
}

function prerequisiteMessage(
  stage: PausedStage,
  unmet: readonly ArtifactMismatch[],
): string {
  return (
    `Stage ${stage.stagePosition} "${stage.stageId}" cannot start: it requires ` +
    `${describeContractSide(unmet, "expected")}, but the thread's current ` +
    `artifact state has ${describeContractSide(unmet, "observed")}.`
  );
}

function contractViolationMessage(unmet: readonly ArtifactMismatch[]): string {
  return (
    `The stage reported ${DONE_OUTCOME} without leaving the artifact state it promises: ` +
    `it promises ${describeContractSide(unmet, "expected")}, but the thread ` +
    `has ${describeContractSide(unmet, "observed")}.`
  );
}

function stillUnmetContractMessage(unmet: readonly ArtifactMismatch[]): string {
  return (
    `The stage reported ${DONE_OUTCOME} and the artifact state it promises is still ` +
    `missing: it promises ${describeContractSide(unmet, "expected")}, but the ` +
    `thread has ${describeContractSide(unmet, "observed")}.`
  );
}

function uninspectablePromiseMessage(message: string): string {
  return (
    `The stage reported ${DONE_OUTCOME} but its promised artifact state could not be ` +
    `verified: ${message}`
  );
}

/**
 * The reason text an attempt-owned `HEAD` movement its stage's policy does not
 * expect carries. Exported because the same movement is worded identically
 * whether the run observes it at the stage's own boundary or a later resume
 * observes it at a retried one.
 */
export function unexpectedHeadMovementMessage(interval: AttemptInterval): string {
  return (
    "The stage produced a commit even though its Git policy does not expect " +
    `one; the attempt moved HEAD from ${interval.headAtStart} to ${interval.headAfterAttempt}.`
  );
}

/**
 * Whether a boundary refusal is the advisory `HEAD` movement one resume may
 * accept, rather than a violation that holds until a human repairs it. The
 * caller needs the answer before it can word the reason, so the predicate is
 * exported alongside the builder that acts on it.
 */
export function isAdvisoryHeadMovement(failure: GitFinalizationFailure): boolean {
  return (
    failure.kind === "git-policy-violation" &&
    failure.treatment === "advisory-head-movement"
  );
}

/** The pre-attempt queue gate could not evaluate the invariant at all. */
function queueUnreadable(scanMessage: string): WaitingInfo {
  return {
    reasons: [gateErrorReason(scanMessage)],
    recovery: { kind: "retry-stage" },
  };
}

/** The pre-attempt queue gate found work a human still owes the thread. */
function queueBlocked(pendingFiles: string[]): WaitingInfo {
  return {
    reasons: [pendingQueuesReason(pendingFiles)],
    recovery: { kind: "retry-stage" },
  };
}

/** The stage's requirements could not be checked, so it was not started. */
function prerequisiteUninspectable(
  args: PausedStage & { message: string },
): WaitingInfo {
  return {
    reasons: [
      {
        kind: "stage-prerequisite-uninspectable",
        message:
          `The requirements for stage ${args.stagePosition} "${args.stageId}" could not ` +
          `be checked: ${args.message}`,
        errorMessage: args.message,
      },
    ],
    recovery: { kind: "retry-stage" },
    nextAction: RESTORE_PREREQUISITE_NOTE,
  };
}

/** The stage's requirements are not met by the thread's current state. */
function prerequisiteUnmet(
  args: PausedStage & { unmet: ArtifactMismatch[] },
): WaitingInfo {
  return {
    reasons: [
      {
        kind: "stage-prerequisite-unmet",
        message: prerequisiteMessage(args, args.unmet),
        contract: args.unmet,
      },
    ],
    recovery: { kind: "retry-stage" },
    nextAction: RESTORE_PREREQUISITE_NOTE,
  };
}

/**
 * A recognized `DONE` whose promised artifact state could not be read at all.
 * The completed attempt is preserved: a promise that could not be evaluated is
 * never credited as kept, and never discarded on that basis either.
 */
function contractUninspectable(
  args: PreservedDone & { message: string },
): WaitingInfo {
  return {
    reasons: [
      {
        kind: "stage-contract-uninspectable",
        message: uninspectablePromiseMessage(args.message),
        errorMessage: args.message,
      },
      ...queueReasons(args.pendingFiles, args.queueScanError),
    ],
    recovery: {
      kind: "recheck-stage-contract",
      attempt: args.attempt,
      pausedAtHead: args.pausedAtHead,
    },
    nextAction: CONTRACT_REPAIR_NOTE,
  };
}

/**
 * A recognized `DONE` that did not leave the artifact state its stage promises.
 * The stage's boundary is never reached, so the finalization a repair unlocks is
 * the one and only judgement of the stage's `HEAD` rule — which is why the
 * recovery carries the tip observed here.
 */
function contractViolated(
  args: PreservedDone & { unmet: ArtifactMismatch[] },
): WaitingInfo {
  return {
    reasons: [
      {
        kind: "stage-contract-unmet",
        message: contractViolationMessage(args.unmet),
        contract: args.unmet,
        // A fresh violation owes no note about who owns the uncommitted work:
        // the attempt has only just settled, and its own changes are all there is.
        preservationNote: null,
      },
      ...queueReasons(args.pendingFiles, args.queueScanError),
    ],
    recovery: {
      kind: "recheck-stage-contract",
      attempt: args.attempt,
      pausedAtHead: args.pausedAtHead,
    },
    nextAction: CONTRACT_REPAIR_NOTE,
  };
}

/**
 * The stage succeeded and its boundary is committed; only the queue holds the
 * run. Releasing it applies the resolution the stage declared and never
 * finalizes the attempt a second time, so the pause carries no instruction of
 * its own.
 */
function donePendingQueues(args: {
  classified: WaitingReasons;
  attempt: AttemptReference;
  queueResolution: "advance" | "rerun";
}): WaitingInfo {
  return {
    reasons: args.classified,
    recovery: {
      kind: "resume-finalized-done",
      attempt: args.attempt,
      queueResolution: args.queueResolution,
    },
  };
}

/**
 * Every settlement that did not reach a finalized `DONE`: a BLOCKED or REFUSED
 * verdict, an unrecognizable terminal line, a harness failure, an abort, and a
 * boundary that was reached and refused.
 *
 * An abort replaces the stage's own reason with the interruption, but the
 * queue-level reasons observed alongside it still hold and are still reported.
 * Otherwise the classifier's reasons stand exactly as it produced them.
 */
function attemptStopped(args: {
  classified: WaitingReasons;
  /** Where the abort came from, for the settlement a signal ended; else `null`. */
  abort: { origin: string } | null;
  attempt: AttemptReference;
  boundary: BoundaryOutcome;
}): WaitingInfo {
  const abort = args.abort;
  const reasons: WaitingReasons =
    abort === null
      ? args.classified
      : [
          {
            kind: "interrupted",
            message: INTERRUPTED_MESSAGE,
            origin: abort.origin,
          },
          ...args.classified.filter(
            (reason) =>
              reason.kind === "pending-queues" || reason.kind === "gate-error",
          ),
        ];
  return {
    reasons,
    // A refused boundary preserves a finalizable DONE, so its recovery retries
    // that boundary rather than the stage. Every other non-DONE pause has no
    // attempt to finalize and runs the stage again.
    recovery: args.boundary.refused
      ? {
          kind: "retry-git-finalization",
          attempt: args.attempt,
          pausedAtHead: args.boundary.observedHead,
        }
      : { kind: "retry-stage" },
    nextAction:
      args.boundary.refused && args.boundary.advisoryHeadMovement
        ? HEAD_MOVEMENT_NOTE
        : UNVALIDATED_CHANGES_NOTE,
  };
}

/**
 * A reserved attempt finished by a signal. The interruption is what stopped the
 * run; pending paths observed on the way out are a second, independent reason it
 * cannot simply resume.
 */
function attemptInterrupted(args: {
  origin: string;
  pendingFiles: string[];
}): WaitingInfo {
  const reasons: WaitingReasons = [
    { kind: "interrupted", message: INTERRUPTED_MESSAGE, origin: args.origin },
  ];
  if (args.pendingFiles.length > 0) {
    reasons.push(pendingQueuesReason(args.pendingFiles));
  }
  return {
    reasons,
    recovery: { kind: "retry-stage" },
    nextAction: UNVALIDATED_CHANGES_NOTE,
  };
}

/**
 * The pause a resume found still held by bundle files, with its queue reason
 * restated over the files the fresh scan just found. A pause that recorded no
 * queue reason gains one, because files present now are the reason this resume
 * cannot proceed and the reader is owed that list either way.
 */
function refreshPendingBundles(args: {
  paused: WaitingInfo;
  pendingFiles: string[];
}): WaitingInfo {
  const refreshed = pendingQueuesReason(args.pendingFiles);
  let replaced = false;
  const reasons = args.paused.reasons.map((reason) => {
    if (reason.kind !== "pending-queues") return reason;
    replaced = true;
    return { ...reason, message: refreshed.message, pendingFiles: refreshed.pendingFiles };
  }) as WaitingReasons;
  return {
    ...args.paused,
    reasons: replaced ? reasons : [...reasons, refreshed],
  };
}

/**
 * The pause a resume could not scan the queues at, where the scan failure is the
 * whole of what the pause now explains. What a later resume may do about it is
 * carried through untouched.
 */
function refreshQueueUnreadable(args: {
  paused: WaitingInfo;
  recovery: WaitingRecovery;
  scanMessage: string;
}): WaitingInfo {
  return {
    ...args.paused,
    reasons: [gateErrorReason(args.scanMessage)],
    recovery: args.recovery,
  };
}

/**
 * The same failed scan at a pause awaiting no-harness finalization — a Git
 * boundary or an unmet promised artifact. Such a pause keeps its own governing
 * reason and records the scan diagnostic behind it, because downgrading it to a
 * gate-error would describe away the saved `DONE` the pause is holding.
 */
function refreshQueueUnreadableHoldingDone(args: {
  paused: WaitingInfo;
  recovery: WaitingRecovery;
  scanMessage: string;
}): WaitingInfo {
  const [governing, ...rest] = args.paused.reasons;
  return {
    ...args.paused,
    reasons: [governing, gateErrorReason(args.scanMessage), ...withoutGateErrors(rest)],
    recovery: args.recovery,
  };
}

/**
 * The pause a resume could not re-read the promised artifact state at. Nothing
 * about the promise was decided, so the saved `DONE` stays finalizable for once
 * the thread can be read again.
 */
function refreshPromiseUninspectable(args: {
  paused: WaitingInfo;
  recovery: WaitingRecovery;
  message: string;
}): WaitingInfo {
  const [, ...rest] = args.paused.reasons;
  return {
    reasons: [
      {
        kind: "stage-contract-uninspectable",
        message: uninspectablePromiseMessage(args.message),
        errorMessage: args.message,
      },
      ...withoutGateErrors(rest),
    ],
    recovery: args.recovery,
    nextAction: CONTRACT_REPAIR_NOTE,
  };
}

/**
 * The pause a resume found the promised artifact state still missing at, worded
 * over the freshly observed mismatch and over what the worktree says about who
 * owns the uncommitted work.
 */
function refreshPromiseUnmet(args: {
  paused: WaitingInfo;
  recovery: WaitingRecovery;
  unmet: ArtifactMismatch[];
  worktree: WorktreeCleanliness;
}): WaitingInfo {
  const [, ...rest] = args.paused.reasons;
  return {
    reasons: [
      {
        kind: "stage-contract-unmet",
        message: stillUnmetContractMessage(args.unmet),
        contract: args.unmet,
        preservationNote:
          args.worktree === "dirty" ? DIRTY_WORKTREE_DETAIL : PRESERVED_DONE_DETAIL,
      },
      ...withoutGateErrors(rest),
    ],
    recovery: args.recovery,
    nextAction: CONTRACT_REPAIR_NOTE,
  };
}

/**
 * The pause a resume retried a Git boundary at and had it refused again. The
 * refusal is the whole of what this pause now explains, and whether it is
 * advisory decides both how it is named and what the reader is asked to do.
 */
function refreshBoundaryRefused(args: {
  recovery: WaitingRecovery;
  failure: GitFinalizationFailure;
  message: string;
}): WaitingInfo {
  const advisory = isAdvisoryHeadMovement(args.failure);
  return {
    reasons: [
      {
        kind: advisory
          ? "unexpected-head-movement"
          : args.failure.kind === "git-policy-violation"
            ? "git-policy-violation"
            : "commit-error",
        message: args.message,
      },
    ],
    recovery: args.recovery,
    nextAction: advisory ? HEAD_MOVEMENT_NOTE : UNVALIDATED_CHANGES_NOTE,
  };
}

/**
 * The complete set of pauses the executor can record: nine the stage loop
 * reaches, and five a resume that stays paused reaches.
 */
export const Pause = {
  queueUnreadable,
  queueBlocked,
  prerequisiteUninspectable,
  prerequisiteUnmet,
  contractUninspectable,
  contractViolated,
  donePendingQueues,
  attemptStopped,
  attemptInterrupted,
  refreshPendingBundles,
  refreshQueueUnreadable,
  refreshQueueUnreadableHoldingDone,
  refreshPromiseUninspectable,
  refreshPromiseUnmet,
  refreshBoundaryRefused,
} as const;

function pendingFilesEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((file, index) => file === b[index]);
}

/**
 * Whether two reasons say the same thing: their kind, their message, and the
 * evidence that kind carries.
 *
 * The switch is total over the kind union rather than defaulting, so a
 * sixteenth kind fails to compile here until it states what comparing it means
 * — which is the only thing that keeps an unchanged refresh from rewriting the
 * checkpoint over evidence nobody remembered to compare.
 */
function reasonEquals(a: WaitingReason, b: WaitingReason): boolean {
  if (a.kind !== b.kind || a.message !== b.message) return false;
  switch (a.kind) {
    case "outcome-blocked":
      return b.kind === "outcome-blocked" && a.agentReason === b.agentReason;
    case "outcome-refused":
      return b.kind === "outcome-refused" && a.agentReason === b.agentReason;
    case "pending-queues":
      return (
        b.kind === "pending-queues" &&
        pendingFilesEqual(a.pendingFiles, b.pendingFiles)
      );
    case "malformed-outcome":
      return b.kind === "malformed-outcome" && a.candidateLine === b.candidateLine;
    case "interrupted":
      return b.kind === "interrupted" && a.origin === b.origin;
    case "gate-error":
      return b.kind === "gate-error" && a.errorMessage === b.errorMessage;
    case "stage-prerequisite-uninspectable":
      return (
        b.kind === "stage-prerequisite-uninspectable" &&
        a.errorMessage === b.errorMessage
      );
    case "stage-contract-uninspectable":
      return (
        b.kind === "stage-contract-uninspectable" &&
        a.errorMessage === b.errorMessage
      );
    case "stage-prerequisite-unmet":
      return (
        b.kind === "stage-prerequisite-unmet" &&
        artifactMismatchesEqual(a.contract, b.contract)
      );
    case "stage-contract-unmet":
      return (
        b.kind === "stage-contract-unmet" &&
        artifactMismatchesEqual(a.contract, b.contract) &&
        a.preservationNote === b.preservationNote
      );
    // These kinds carry no evidence beyond the message the two already agree on.
    case "harness-error":
    case "idle-timeout":
    case "unexpected-head-movement":
    case "git-policy-violation":
    case "commit-error":
      return true;
  }
}

function referenceEquals(a: AttemptReference, b: AttemptReference): boolean {
  return a.stageIndex === b.stageIndex && a.attempt === b.attempt;
}

/** Whether two recoveries authorize the same resume of the same attempt. */
function recoveryEquals(a: WaitingRecovery, b: WaitingRecovery): boolean {
  switch (a.kind) {
    case "retry-stage":
      return b.kind === a.kind;
    case "resume-finalized-done":
      return (
        b.kind === a.kind &&
        referenceEquals(a.attempt, b.attempt) &&
        a.queueResolution === b.queueResolution
      );
    case "recheck-stage-contract":
    case "retry-git-finalization":
      return (
        b.kind === a.kind &&
        referenceEquals(a.attempt, b.attempt) &&
        a.pausedAtHead === b.pausedAtHead
      );
  }
}

/**
 * Whether two pauses say the same thing: every field of every reason in order,
 * the recovery, and the instruction, compared by value.
 *
 * Serializing them instead would answer a different question. `JSON.stringify`
 * is key-insertion-order sensitive, so under it a pause rebuilt from its fields
 * compares unequal to a byte-identical persisted one that happened to be
 * assembled in another order — and every unchanged refresh would then rewrite
 * the checkpoint and restamp `updatedAt`. Key order is not one of the facts a
 * pause carries. Reason *order* is a fact: it is what the pause reads as.
 *
 * A run that is not paused at all is not a pause that says the same thing, so a
 * `null` never compares equal.
 */
export function waitingEquals(a: WaitingInfo, b: WaitingInfo | null): boolean {
  if (b === null) return false;
  return (
    a.nextAction === b.nextAction &&
    recoveryEquals(a.recovery, b.recovery) &&
    a.reasons.length === b.reasons.length &&
    a.reasons.every((reason, index) => reasonEquals(reason, b.reasons[index]!))
  );
}
