import type { AttemptOutcome } from "../harness/types.js";
import type { WaitingKind } from "../state/checkpoint.js";
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
 */
export type Classification =
  | { action: "advance" }
  | { action: "pause"; kind: WaitingKind; message: string }
  | { action: "pause-done"; kind: "pending-queues"; message: string };

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

function scanDiagnostic(queueScanError: string): string {
  return `The post-attempt pending-queue scan also failed and must be repeated before finalizing: ${queueScanError}`;
}

function harnessMessage(
  outcome: Extract<AttemptOutcome, { kind: "failed" }>,
): string {
  return `The harness attempt failed (${outcome.category}): ${outcome.errorClass}: ${outcome.errorMessage}.`;
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

/**
 * The pure precedence function that turns an attempt's outcome, harness result,
 * queue state, and finalized boundary into the single next action, in strict
 * precedence order (DR41/DR44/DR52/DR57). Pure — no I/O.
 */
export function classifyAttempt(input: ClassificationInput): Classification {
  const { attemptOutcome, parse, pendingFiles, queueScanError, boundary } = input;
  const isDone = parse !== null && parse.token === "DONE";
  const sorted = sortPending(pendingFiles);

  // 1. A parsed DONE with a failed boundary keeps its boundary kind, listing any
  //    pending files and folding a failed scan diagnostic into the same message
  //    rather than downgrading to gate-error (DR57).
  if (isDone && boundary.evaluated && !boundary.ok) {
    let message = boundary.message;
    if (sorted.length > 0) {
      message += ` Pending bundle files present at this boundary: ${sorted.join(", ")}.`;
    }
    if (queueScanError !== null) {
      message += ` ${scanDiagnostic(queueScanError)}`;
    }
    return { action: "pause", kind: boundary.kind, message };
  }

  // 2. Otherwise a failed queue scan is a gate error.
  if (queueScanError !== null) {
    return {
      action: "pause",
      kind: "gate-error",
      message: `The advancement invariant could not be evaluated because the pending-queue scan failed: ${queueScanError}`,
    };
  }

  // 3. A parsed DONE with a finalized-ok boundary advances on an empty queue,
  //    else pauses as a DONE-finalized pending-queues pause.
  if (isDone) {
    if (sorted.length === 0) {
      return { action: "advance" };
    }
    return {
      action: "pause-done",
      kind: "pending-queues",
      message: pendingQueuesMessage(sorted),
    };
  }

  // 4. For every non-DONE result, pending files take precedence over BLOCKED,
  //    REFUSED, and provider errors.
  if (sorted.length > 0) {
    return {
      action: "pause",
      kind: "pending-queues",
      message: pendingQueuesMessage(sorted),
    };
  }

  // 5 & 6. Harness failure: idle timeout stays distinct; every other failure is
  //         a harness error.
  if (attemptOutcome.kind === "failed") {
    const kind: WaitingKind =
      attemptOutcome.category === "idle-timeout" ? "idle-timeout" : "harness-error";
    return { action: "pause", kind, message: harnessMessage(attemptOutcome) };
  }

  // 7. The parsed token: BLOCKED, REFUSED, or a missing/unrecognizable token.
  if (parse !== null && parse.token !== null) {
    if (parse.token === "BLOCKED") {
      const detail = parse.detail.length > 0 ? ` ${parse.detail}` : "";
      return {
        action: "pause",
        kind: "outcome-blocked",
        message: `The stage reported Outcome: BLOCKED and paused for human attention.${detail}`,
      };
    }
    if (parse.token === "REFUSED") {
      const detail = parse.detail.length > 0 ? ` ${parse.detail}` : "";
      return {
        action: "pause",
        kind: "outcome-refused",
        message: `The stage reported Outcome: REFUSED and paused for human attention.${detail}`,
      };
    }
  }

  return {
    action: "pause",
    kind: "malformed-outcome",
    message: malformedMessage(parse === null ? null : parse.candidateLine),
  };
}
