import type {
  AttemptRecord,
  AttemptReference,
  RunCheckpoint,
  SettledAttemptRecord,
} from "../state/checkpoint/types.js";
import type { InvariantResult } from "./result.js";

/**
 * What the attempt history says about one attempt: which record a recovery names,
 * which record a pause describes, and the session a record carries.
 *
 * Each is a fact more than one phase needs and no phase owns.
 */

/**
 * The one attempt a recovery reference names. Checkpoint validation already
 * proved it exists and reached an ending, so a caller holding a validated
 * recovery reads the settlement's own fields off the record and never the
 * history's tail.
 */
export function referencedAttempt(
  checkpoint: RunCheckpoint,
  reference: AttemptReference,
): InvariantResult<SettledAttemptRecord> {
  const found = checkpoint.attempts.find(
    (attempt): attempt is SettledAttemptRecord =>
      attempt.result !== "executing" &&
      attempt.stageIndex === reference.stageIndex &&
      attempt.attempt === reference.attempt,
  );
  if (found === undefined) {
    return {
      ok: false,
      message: `The validated checkpoint records no settled attempt ${reference.attempt} for stage ${reference.stageIndex}.`,
    };
  }
  return { ok: true, value: found };
}

/**
 * The newest attempt the history settled. A pause describes one, and a paused
 * run's history ends with it — reading it as a settlement rather than as the
 * bare tail is what lets the pause word an attempt's own `HEAD` movement.
 */
export function latestSettledAttempt(
  checkpoint: RunCheckpoint,
): SettledAttemptRecord | undefined {
  for (let i = checkpoint.attempts.length - 1; i >= 0; i -= 1) {
    const attempt = checkpoint.attempts[i]!;
    if (attempt.result !== "executing") return attempt;
  }
  return undefined;
}

/** The record with the provider session it ended up holding, when it held one. */
export function withAgentSession(
  record: AttemptRecord,
  session: { id: string } | undefined,
): AttemptRecord {
  if (session === undefined) return record;
  return { ...record, agentSession: session };
}
