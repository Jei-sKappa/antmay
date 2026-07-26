import type { AttemptOutcome } from "../harness/types.js";
import type {
  WaitingKind,
  WaitingReason,
  WaitingReasons,
} from "../state/checkpoint.js";
import type { OutcomeParse } from "./outcome.js";

/**
 * The outcome of evaluating a stage's per-stage Git boundary. `evaluated: false`
 * means the boundary was not reached (no parsed DONE); a finalized-ok boundary
 * carries `ok: true`; a failed boundary carries the concrete failure kind and a
 * complete human message describing the violation or commit failure.
 */
export type BoundaryDisposition =
  | { evaluated: false }
  | { evaluated: true; ok: true }
  | {
      evaluated: true;
      ok: false;
      kind: "git-policy-violation" | "commit-error";
      message: string;
    };

/**
 * Everything the pure precedence function needs to turn one attempt into the
 * single next action. The runner evaluates and finalizes the boundary (for a
 * parsed DONE) before calling classify. The concrete queue-scan diagnostic is
 * preserved as a string rather than a boolean so a `gate-error` pause carries a
 * complete human message.
 */
export type ClassificationInput = {
  attemptOutcome: AttemptOutcome;
  parse: OutcomeParse | null;
  pendingFiles: string[];
  queueScanError: string | null;
  boundary: BoundaryDisposition;
};

/**
 * The single next action for a classified attempt. `advance` moves to the next
 * stage; `pause` records the attempt as `waiting`; `pause-done` is the
 * DONE-finalized queue pause whose attempt records `done`.
 *
 * A pause lists every reason that held, in precedence order, so `reasons[0]` is
 * the governing reason the resume path dispatches on. A stage that stopped for
 * its own result while a queue reason also held reports both.
 */
export type Classification =
  | { action: "advance" }
  | { action: "pause"; reasons: WaitingReasons }
  | { action: "pause-done"; reasons: WaitingReasons };

const EXPECTED_PREFIXES =
  "Outcome: DONE, Outcome: BLOCKED, or Outcome: REFUSED";

function sortPending(pendingFiles: string[]): string[] {
  return [...pendingFiles].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function pendingQueuesMessage(sorted: string[]): string {
  const subject =
    sorted.length === 1
      ? "a pending bundle file awaits"
      : "pending bundle files await";
  return `The stage cannot advance while ${subject} human resolution: ${sorted.join(", ")}.`;
}

function gateErrorMessage(queueScanError: string): string {
  return (
    "The advancement invariant could not be evaluated because the " +
    `pending-queue scan failed: ${queueScanError}`
  );
}

function harnessMessage(
  outcome: Extract<AttemptOutcome, { kind: "failed" }>,
): string {
  return `The harness attempt failed (${outcome.category}): ${outcome.errorClass}: ${outcome.errorMessage}.`;
}

/**
 * The agent's own reason text, ready to stand on its own line: the verbatim
 * remainder after the outcome token, stripped of the dash that separated it from
 * that token. Absent when the attempt supplied no reason.
 */
function detailOf(detail: string): string | undefined {
  const clean = detail.replace(/^[—–-]+\s*/, "").trim();
  return clean.length > 0 ? clean : undefined;
}

function malformedMessage(candidateLine: string | null): string {
  const opening =
    "The attempt produced no recognizable terminal outcome. The trimmed final non-empty line must begin with one of: " +
    `${EXPECTED_PREFIXES}.`;
  if (candidateLine !== null && candidateLine.length > 0) {
    return `${opening} The final non-empty line was: "${candidateLine}".`;
  }
  return `${opening} No candidate final line was present.`;
}

function candidateLineOf(parse: OutcomeParse | null): string | undefined {
  if (parse === null || parse.candidateLine === null) return undefined;
  return parse.candidateLine;
}

/**
 * Every queue-level reason that holds, scan failure first: a scan that could not
 * complete and a pending list that was observed are separate problems, and a
 * caller that reports both gets both.
 */
function queueReasons(
  sorted: string[],
  queueScanError: string | null,
): WaitingReason[] {
  const reasons: WaitingReason[] = [];
  if (queueScanError !== null) {
    reasons.push({ kind: "gate-error", message: gateErrorMessage(queueScanError) });
  }
  if (sorted.length > 0) {
    reasons.push({
      kind: "pending-queues",
      message: pendingQueuesMessage(sorted),
      pendingFiles: sorted,
    });
  }
  return reasons;
}

/**
 * The stage-level reason for an attempt that did not reach a finalized DONE: a
 * harness failure if the provider never returned, else the parsed BLOCKED or
 * REFUSED verdict, else an unrecognizable terminal line.
 */
function stageReason(
  attemptOutcome: AttemptOutcome,
  parse: OutcomeParse | null,
): WaitingReason {
  if (attemptOutcome.kind === "failed") {
    const kind: WaitingKind =
      attemptOutcome.category === "idle-timeout" ? "idle-timeout" : "harness-error";
    return { kind, message: harnessMessage(attemptOutcome) };
  }
  if (parse !== null && (parse.token === "BLOCKED" || parse.token === "REFUSED")) {
    const blocked = parse.token === "BLOCKED";
    return {
      kind: blocked ? "outcome-blocked" : "outcome-refused",
      message: `The stage reported Outcome: ${parse.token} and paused for human attention.`,
      detail: detailOf(parse.detail),
      candidateLine: parse.candidateLine,
    };
  }
  return {
    kind: "malformed-outcome",
    message: malformedMessage(parse === null ? null : parse.candidateLine),
    candidateLine: candidateLineOf(parse),
  };
}

/**
 * The pure precedence function that turns an attempt's outcome, harness result,
 * queue state, and finalized boundary into the single next action, in strict
 * precedence order (DR41/DR44/DR52/DR57). Pure — no I/O.
 *
 * Precedence decides which reason governs the resume path and therefore leads
 * the list; it never discards the others. A stage-level reason and a
 * queue-level reason that both hold are both reported.
 */
export function classifyAttempt(input: ClassificationInput): Classification {
  const { attemptOutcome, parse, pendingFiles, queueScanError, boundary } = input;
  const isDone = parse !== null && parse.token === "DONE";
  const sorted = sortPending(pendingFiles);
  const queues = queueReasons(sorted, queueScanError);

  // 1. A parsed DONE with a failed boundary is governed by its boundary kind
  //    rather than downgrading to gate-error (DR57).
  if (isDone && boundary.evaluated && !boundary.ok) {
    const governing: WaitingReason = { kind: boundary.kind, message: boundary.message };
    return { action: "pause", reasons: [governing, ...queues] };
  }

  // 2. Otherwise a failed queue scan governs, because nothing downstream of it
  //    can be evaluated. A stage that also failed on its own terms says so.
  if (queueScanError !== null) {
    const [governing, ...rest] = queues as WaitingReasons;
    return {
      action: "pause",
      reasons: isDone
        ? [governing, ...rest]
        : [governing, ...rest, stageReason(attemptOutcome, parse)],
    };
  }

  // 3. A parsed DONE with a finalized-ok boundary advances on an empty queue,
  //    else pauses as a DONE-finalized pending-queues pause.
  if (isDone) {
    const [governing, ...rest] = queues;
    if (governing === undefined) {
      return { action: "advance" };
    }
    return { action: "pause-done", reasons: [governing, ...rest] };
  }

  // 4. For every non-DONE result, pending files govern over BLOCKED, REFUSED,
  //    and provider errors — but the stage's own result is reported alongside.
  const stage = stageReason(attemptOutcome, parse);
  const [governing, ...rest] = queues;
  if (governing === undefined) {
    return { action: "pause", reasons: [stage] };
  }
  return { action: "pause", reasons: [governing, ...rest, stage] };
}
