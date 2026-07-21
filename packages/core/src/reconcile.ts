// Pure, mode-agnostic reconciliation decision logic. Given a structured
// transcript signal and an execution-endpoint liveness signal, decide whether a
// run settles into a terminal outcome or stays active with observer health.
// This module owns no filesystem, adapter, or endpoint-querying concept; it
// reasons only over the two abstract signals it is handed. The priority is
// fixed:
//
//   1. A reliable structured-transcript outcome is the sole terminal authority
//      and wins over every liveness signal, producing an immutable
//      DONE/BLOCKED/REFUSED with the complete reason.
//   2. Otherwise, only positive ended/absent endpoint evidence together with
//      this final reconciliation finding no reliable outcome yields `unknown`.
//   3. Any indeterminate or transiently-unavailable evidence keeps the run
//      active and downgrades observer health so observation can be restored;
//      it never turns the run terminal.

import {
  type EndpointEndEvidence,
  type TerminalOutcome,
  unknownOutcome,
  type WorkerHealth,
} from "./run";

/**
 * The abstract execution-endpoint liveness signal reconciliation consumes.
 * `ended` is POSITIVE evidence that the endpoint is finished or absent; an
 * `indeterminate` read failure is never treated as an end.
 */
export type EndpointLiveness =
  | { readonly kind: "alive" }
  | { readonly kind: "ended" }
  | { readonly kind: "indeterminate"; readonly detail: string };

/**
 * The abstract structured-transcript signal reconciliation consumes. `final`
 * carries a reliable terminal outcome; `none` means the transcript was read
 * cleanly but carries no outcome yet; `indeterminate` means the transcript
 * could not be read reliably (missing, unreadable, or malformed).
 */
export type TranscriptOutcomeSignal =
  | { readonly kind: "final"; readonly outcome: TerminalOutcome }
  | { readonly kind: "none" }
  | { readonly kind: "indeterminate"; readonly detail: string };

/** The two abstract signals a single reconciliation weighs. */
export type ReconcileInput = {
  readonly transcript: TranscriptOutcomeSignal;
  readonly liveness: EndpointLiveness;
};

/**
 * A reconciliation decision. `terminalize` carries the resolved outcome to
 * apply idempotently; `keep-active` carries the observer health to record. Both
 * carry the health the caller should persist for the run's worker.
 */
export type ReconcileDecision =
  | {
      readonly action: "terminalize";
      readonly outcome: TerminalOutcome;
      readonly health: WorkerHealth;
    }
  | { readonly action: "keep-active"; readonly health: WorkerHealth };

const HEALTHY: WorkerHealth = { state: "healthy", detail: null };

function degraded(detail: string): WorkerHealth {
  return { state: "degraded", detail };
}

/**
 * Decide a run's reconciliation from its transcript and liveness signals. Pure:
 * the same inputs always yield the same decision, and no side effect or
 * environment read occurs here.
 */
export function reconcileEvidence(input: ReconcileInput): ReconcileDecision {
  // Rung 1: a reliable structured-transcript outcome is the sole terminal
  // authority and wins over every liveness signal.
  if (input.transcript.kind === "final") {
    return {
      action: "terminalize",
      outcome: input.transcript.outcome,
      health: HEALTHY,
    };
  }

  // Rung 2: no reliable outcome exists. Positive ended/absent endpoint evidence
  // plus this final reconciliation without an outcome yields terminal
  // `unknown`; the evidence gate is enforced by `unknownOutcome`.
  if (input.liveness.kind === "ended") {
    const evidence: EndpointEndEvidence = { endpointEnded: true };
    return {
      action: "terminalize",
      outcome: unknownOutcome(evidence),
      health: HEALTHY,
    };
  }

  // Rung 3: indeterminate or transiently-unavailable evidence keeps the run
  // active with degraded observer health so a later reconciliation can restore
  // observation. A transcript gap is reported before a liveness gap because the
  // transcript is the outcome authority.
  if (input.transcript.kind === "indeterminate") {
    return { action: "keep-active", health: degraded(input.transcript.detail) };
  }
  if (input.liveness.kind === "indeterminate") {
    return { action: "keep-active", health: degraded(input.liveness.detail) };
  }

  // The transcript read cleanly with no outcome and the endpoint is alive: the
  // run is healthy and still in progress.
  return { action: "keep-active", health: HEALTHY };
}
