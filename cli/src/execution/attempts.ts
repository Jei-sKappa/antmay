import type { AttemptInterval } from "../gitops/boundary.js";
import type {
  AttemptRecord,
  AttemptReference,
  RunCheckpoint,
} from "../state/checkpoint/types.js";
import type { InvariantResult } from "./result.js";

/**
 * What the attempt history says about one attempt: which record a recovery names,
 * the interval a boundary is judged across, and the session a record carries.
 *
 * Each is a fact more than one phase needs and no phase owns.
 */

/**
 * The one attempt a recovery reference names. Checkpoint validation already
 * proved it exists in the state resuming from it requires, so a caller holding a
 * validated recovery reads the record itself and never the history's tail.
 */
export function referencedAttempt(
  checkpoint: RunCheckpoint,
  reference: AttemptReference,
): InvariantResult<AttemptRecord> {
  const found = checkpoint.attempts.find(
    (attempt) =>
      attempt.stageIndex === reference.stageIndex &&
      attempt.attempt === reference.attempt,
  );
  if (found === undefined) {
    return {
      ok: false,
      message: `The validated checkpoint records no attempt ${reference.attempt} for stage ${reference.stageIndex}.`,
    };
  }
  return { ok: true, value: found };
}

/**
 * The interval a preserved attempt's `HEAD` rule is judged across. Checkpoint
 * validation requires the post-attempt observation on every settled attempt, so
 * a record without one was never settled and no boundary of it can be judged.
 */
export function attemptInterval(
  attempt: AttemptRecord,
): InvariantResult<AttemptInterval> {
  const headAfterAttempt = attempt.headAfterAttempt;
  if (headAfterAttempt === undefined) {
    return {
      ok: false,
      message: `Attempt ${attempt.attempt} of stage ${attempt.stageIndex} records no post-attempt HEAD observation.`,
    };
  }
  return {
    ok: true,
    value: { headAtStart: attempt.headAtStart, headAfterAttempt },
  };
}

/** The record with the provider session it ended up holding, when it held one. */
export function withAgentSession(
  record: AttemptRecord,
  session: { id: string } | undefined,
): AttemptRecord {
  if (session === undefined) return record;
  return { ...record, agentSession: session };
}
