import type {
  AttemptRecord,
  RunCheckpoint,
  SnapshottedStage,
  WaitingInfo,
} from "../state/checkpoint/types.js";
import { writeCheckpoint } from "../state/persist.js";
import { waitingEquals } from "./pause.js";

/**
 * A run's durable cursor, and the closed set of things that can happen to it.
 *
 * A state change here is a value rather than an assignment: every way the cursor
 * can move is a named `Transition`, applied through one reducer, so a caller
 * states what happened and never how the resulting document is shaped. That is
 * what keeps the invariants a checkpoint carries — an appended attempt is the
 * only executing one, a pause carries a waiting object and nothing else does,
 * completion is the cursor reaching the stage count — in one readable place
 * instead of in the reading order of the procedure that used to rebuild them.
 *
 * `commit` is the whole persistence boundary of a run in flight: the one place
 * `updatedAt` is stamped, the one place the atomic writer is called after
 * allocation, and the one place a pause the checkpoint already records is
 * recognized as needing no write at all.
 */

/**
 * How a run's durable state is written. The transition applier is the only thing
 * that holds one, so a collaborator handed a cursor cannot persist it.
 */
export type CheckpointWriter = (
  runDir: string,
  checkpoint: RunCheckpoint,
) => Promise<void>;

/**
 * Everything that can happen to a run's durable cursor.
 *
 * - `reserve-attempt` appends a live attempt and makes the run `executing`.
 * - `attach-session` records the provider session captured for that live
 *   attempt, leaving it live.
 * - `settle-attempt` replaces the live attempt with its settled record.
 * - `finalize-preserved-done` flips the exact saved `DONE` a recovery named to
 *   `done`, wherever in the history it sits.
 * - `pause` records the waiting object a durable pause explains itself with.
 * - `become-ready` clears the pause and leaves the cursor runnable at its stage.
 * - `advance` moves past the current stage, `completed` once the snapshot is
 *   exhausted.
 *
 * The set is closed, so a new way for a run to move fails to build until the
 * reducer below says what it does to the document.
 */
export type Transition =
  | { kind: "reserve-attempt"; attempt: AttemptRecord }
  | { kind: "attach-session"; attempt: AttemptRecord }
  | { kind: "settle-attempt"; attempt: AttemptRecord }
  | { kind: "finalize-preserved-done"; attempt: AttemptRecord }
  | { kind: "pause"; waiting: WaitingInfo }
  | { kind: "become-ready" }
  | { kind: "advance" };

/**
 * Whether one durable step reached disk, and the raw failure when it did not.
 * A caller decides what a failure means to it; the applier never renders one.
 */
export type CommitOutcome = { ok: true } | { ok: false; message: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The history with its final record replaced: the live attempt's own slot. */
function replaceLast(
  attempts: AttemptRecord[],
  record: AttemptRecord,
): AttemptRecord[] {
  return [...attempts.slice(0, -1), record];
}

/**
 * The history with the one record naming the same `(stageIndex, attempt)`
 * replaced. A preserved `DONE` is addressed by identity rather than by position,
 * because what makes it finalizable is which attempt it is.
 */
function replaceAttempt(
  attempts: AttemptRecord[],
  record: AttemptRecord,
): AttemptRecord[] {
  return attempts.map((attempt) =>
    attempt.stageIndex === record.stageIndex && attempt.attempt === record.attempt
      ? record
      : attempt,
  );
}

/**
 * The cursor one transition leaves behind. Pure: it stamps no time, reads
 * nothing, and returns a fresh document rather than editing the one it was
 * given.
 */
function applyTransition(
  current: RunCheckpoint,
  transition: Transition,
): RunCheckpoint {
  switch (transition.kind) {
    case "reserve-attempt":
      return {
        ...current,
        condition: "executing",
        waiting: null,
        attempts: [...current.attempts, transition.attempt],
      };

    // Capturing a session and settling an attempt both replace the live record
    // the run is holding. They stay separate transitions because they are
    // separate situations — one leaves the attempt live and its write is
    // advisory, the other ends it — not because they shape the history
    // differently.
    case "attach-session":
    case "settle-attempt":
      return {
        ...current,
        attempts: replaceLast(current.attempts, transition.attempt),
      };

    case "finalize-preserved-done":
      return {
        ...current,
        attempts: replaceAttempt(current.attempts, transition.attempt),
      };

    case "pause":
      return { ...current, condition: "waiting-for-user", waiting: transition.waiting };

    case "become-ready":
      return { ...current, condition: "ready", waiting: null };

    case "advance": {
      const nextIndex = current.stageIndex + 1;
      return {
        ...current,
        stageIndex: nextIndex,
        condition: nextIndex === current.stages.length ? "completed" : "ready",
        waiting: null,
      };
    }
  }
}

/**
 * Where a run's cursor sits: on the stage the snapshot holds there, or past the
 * final one. One read answers both questions, so a caller cannot conclude the
 * run has a stage left without also holding that stage.
 */
export type RunCursor =
  | { kind: "at-stage"; stage: SnapshottedStage }
  | { kind: "exhausted" };

export class RunState {
  private current: RunCheckpoint;
  private readonly runDir: string;
  private readonly clock: () => Date;
  private readonly persistCheckpoint: CheckpointWriter;

  constructor(args: {
    checkpoint: RunCheckpoint;
    runDir: string;
    clock: () => Date;
    persistCheckpoint?: CheckpointWriter;
  }) {
    this.current = args.checkpoint;
    this.runDir = args.runDir;
    this.clock = args.clock;
    this.persistCheckpoint = args.persistCheckpoint ?? writeCheckpoint;
  }

  /** The cursor as it now stands, durably except across a bare `apply`. */
  get checkpoint(): Readonly<RunCheckpoint> {
    return this.current;
  }

  /**
   * The cursor as a position: the stage it is on, or the exhaustion the run's
   * loop ends at. Checkpoint validation keeps `stageIndex` within the snapshot
   * and one past its end only once the run is completed, so an absent stage and
   * an exhausted snapshot are the same fact.
   */
  get cursor(): RunCursor {
    const stage = this.current.stages[this.current.stageIndex];
    return stage === undefined ? { kind: "exhausted" } : { kind: "at-stage", stage };
  }

  /**
   * Move the cursor in memory alone. For a transition whose durability the next
   * write will carry, or which restores a condition the checkpoint on disk
   * already records.
   */
  apply(transition: Transition): void {
    this.current = applyTransition(this.current, transition);
  }

  /**
   * Apply the transitions as one durable step, in the order given.
   *
   * The step is atomic in both directions: the whole sequence reaches disk as
   * one document, and a failed write leaves the cursor exactly where it was.
   *
   * A step whose sole effect is a pause the checkpoint already records writes
   * nothing and restamps nothing, because rendering an unchanged pause is not a
   * change to the run. Every other step is stamped and written.
   */
  async commit(...transitions: Transition[]): Promise<CommitOutcome> {
    if (this.isRecordedPause(transitions)) return { ok: true };
    const next = transitions.reduce(applyTransition, this.current);
    const stamped: RunCheckpoint = {
      ...next,
      updatedAt: this.clock().toISOString(),
    };
    try {
      await this.persistCheckpoint(this.runDir, stamped);
      this.current = stamped;
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  }

  /**
   * Whether the step says nothing the checkpoint does not already say: one
   * pause, carrying a waiting object equal to the recorded one. A step carrying
   * anything else changes the run even when its pause does not.
   */
  private isRecordedPause(transitions: Transition[]): boolean {
    const only = transitions.length === 1 ? transitions[0] : undefined;
    if (only === undefined || only.kind !== "pause") return false;
    return waitingEquals(only.waiting, this.current.waiting);
  }
}
