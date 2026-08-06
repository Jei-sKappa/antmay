import type {
  AttemptReference,
  WaitingRecovery,
} from "../state/checkpoint/types.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";

/**
 * What a paused run's recovery is, and what deciding one requires.
 *
 * A resume observes the world, then decides. The two halves are written in
 * different modules — one reaches the filesystem and Git, the other is pure —
 * and they have to agree on which observations each recovery's decision rests
 * on. That agreement is stated here once, as a table total over the recovery
 * union, and both halves derive from it: the observer asks which evidence a
 * recorded recovery declared, and the decision receives that recovery already
 * paired with it. Neither can test a recovery kind for itself, so neither can
 * be the one that forgot a kind.
 *
 * Nothing here reads the world or decides anything. It is the vocabulary the two
 * sides of that handshake are written in.
 */

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

/**
 * A queue observation that decides the pause on its own. Work a human still owes
 * the thread and a queue that could not be read both leave the run paused on the
 * recovery it already had, so nothing further about the world is worth observing.
 */
export type HeldQueues = Exclude<QueueEvidence, { kind: "clear" }>;

/** Whether the worktree holds uncommitted work. */
export type WorktreeCleanliness = "clean" | "dirty";

/** The structured boundary failure observed during this recovery pass. */
export type GitFinalizationFailure =
  | {
      kind: "git-policy-violation";
      treatment: "advisory-head-movement" | "blocking";
    }
  | { kind: "commit-error" }
  | { kind: "git-error" };

/**
 * A finalization this pass requested and did not complete. It carries the tip as
 * observed after it, which is where the next attempt at the same boundary has to
 * measure from.
 */
export type FailedFinalization = {
  kind: "finalization-failed";
  failure: GitFinalizationFailure;
  message: string;
  observedHead: string;
};

/**
 * What a recovery holding a saved `DONE` is decided from: the finalization this
 * pass requested and that failed, or the fresh reinspection of the promised
 * artifact state that attempt was supposed to leave.
 *
 * Exactly one of the two holds. A finalization that already ran and failed
 * settles the pass on its own — the promise it was requested on had passed, so
 * it is not reconsidered — which is why these are one closed union rather than
 * two independently optional facts.
 *
 * `promise-unmet` carries the worktree observation with it, because those two
 * facts are only ever read together: a promise that is still unmet means
 * something different depending on whether anything is uncommitted.
 * `promise-uninspectable` means the thread could not be read at all, so nothing
 * about the promise was decided.
 */
export type PreservedDoneEvidence =
  | FailedFinalization
  | { kind: "promise-satisfied" }
  | {
      kind: "promise-unmet";
      unmet: ArtifactMismatch[];
      worktree: WorktreeCleanliness;
    }
  | { kind: "promise-uninspectable"; message: string };

/**
 * The closed set of fresh evidence a recovery's decision can rest on, beyond the
 * queue observation that gates them all.
 */
export type RecoveryEvidenceKind = "queues-only" | "preserved-done";

/**
 * What each recovery kind is decided from. Total over the recovery union, so a
 * new kind fails to compile until it declares the evidence its decision rests
 * on — and the observer that gathers that evidence needs no edit at all when the
 * new kind rests on evidence already gathered for another.
 */
export const DECIDED_FROM = {
  "retry-stage": "queues-only",
  "resume-finalized-done": "queues-only",
  "recheck-stage-contract": "preserved-done",
  "retry-git-finalization": "preserved-done",
} as const satisfies Record<WaitingRecovery["kind"], RecoveryEvidenceKind>;

/** Every recovery that declared `E` in the table above. */
export type RecoveryDecidedFrom<E extends RecoveryEvidenceKind> = Extract<
  WaitingRecovery,
  {
    kind: {
      [K in WaitingRecovery["kind"]]: (typeof DECIDED_FROM)[K] extends E ? K : never;
    }[WaitingRecovery["kind"]];
  }
>;

/**
 * The two recovery variants that hold a saved `DONE` attempt whose Git boundary
 * has still to succeed. They are the only ones a finalization can be requested
 * for, and the only ones a failed finalization can be re-decided from, so naming
 * them as a type keeps that invariant checked rather than assumed.
 */
export type FinalizingRecovery = RecoveryDecidedFrom<"preserved-done">;

/**
 * Whether `recovery` is holding a saved `DONE` for later Git finalization. Such
 * a pause is waiting for uncommitted repair work, so it is what exempts a resume
 * from the clean-worktree rule and what keeps its own diagnostic kind when fresh
 * evidence arrives.
 */
export function holdsPreservedDone(
  recovery: WaitingRecovery,
): recovery is FinalizingRecovery {
  return DECIDED_FROM[recovery.kind] === "preserved-done";
}

/**
 * Every recovery that names one exact attempt in the ordered history, as opposed
 * to claiming nothing about any earlier attempt.
 */
export type AttemptReferencingRecovery = Extract<
  WaitingRecovery,
  { attempt: AttemptReference }
>;

/**
 * Whether the recovery names an attempt the history has to bear out. Answered
 * from the reference itself rather than from a list of kinds, so a recovery
 * carrying one is never mistaken for a recovery that carries none.
 */
export function referencesAttempt(
  recovery: WaitingRecovery,
): recovery is AttemptReferencingRecovery {
  return "attempt" in recovery;
}

/**
 * A recovery paired with the evidence its kind declared, before that evidence is
 * observed.
 */
export type ClassifiedRecovery =
  | { decidedFrom: "queues-only"; recovery: RecoveryDecidedFrom<"queues-only"> }
  | { decidedFrom: "preserved-done"; recovery: FinalizingRecovery };

/**
 * Which evidence this recorded recovery's decision rests on.
 *
 * The table above is the declaration; this is the one place a recorded value is
 * matched against it. The compiler holds the match: a branch that classified a
 * kind into a group the table excludes could not construct its result, so the
 * two cannot drift apart.
 */
export function classifyRecovery(recovery: WaitingRecovery): ClassifiedRecovery {
  switch (recovery.kind) {
    case "retry-stage":
    case "resume-finalized-done":
      return { decidedFrom: "queues-only", recovery };
    case "recheck-stage-contract":
    case "retry-git-finalization":
      return { decidedFrom: "preserved-done", recovery };
  }
}

/**
 * One pause, with exactly the fresh evidence its recovery declared: what a
 * decision is made from, as a single value.
 *
 * Held queues decide the pause on their own, so that case carries the queue
 * observation and nothing else — no evidence gathered under a held queue can
 * reach a decision, because there is nowhere to put it. Once the queues are
 * clear, the recovery's own declaration says what the case carries, so a
 * decision can never be asked for on evidence that was never observed.
 */
export type RecoveryCase =
  | { decidedFrom: "held-queues"; recovery: WaitingRecovery; queues: HeldQueues }
  | { decidedFrom: "queues-only"; recovery: RecoveryDecidedFrom<"queues-only"> }
  | {
      decidedFrom: "preserved-done";
      recovery: FinalizingRecovery;
      evidence: PreservedDoneEvidence;
    };
