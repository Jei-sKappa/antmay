// Harness-neutral transcript-reading result. Reading a Claude or Codex
// transcript resolves to exactly one of four evidence kinds, and the caller
// (the observer) must keep them distinct:
//
//   - `final`     — a reliable transcript-derived terminal outcome was found.
//   - `pending`   — the transcript parsed cleanly but carries no final outcome
//                   yet; the run stays active.
//   - `unavailable` — the transcript is missing, unreadable, or does not match
//                   the run's identity; this is a transient observation gap, not
//                   evidence that the endpoint ended.
//   - `malformed` — individual lines were skipped as malformed and no outcome
//                   was found; the run stays active and the skip is a
//                   diagnostic, never a claim that the endpoint ended.
//
// A missing or unreadable transcript (`unavailable`) is deliberately NOT the
// same as an ended-without-outcome run: only positive endpoint-end evidence,
// resolved elsewhere, may turn a run terminal without a transcript outcome.

import type { TerminalOutcome } from "@antmay/core";

export type TranscriptEvidence =
  | { readonly kind: "final"; readonly outcome: TerminalOutcome }
  | { readonly kind: "pending"; readonly detail: string }
  | { readonly kind: "unavailable"; readonly detail: string }
  | {
      readonly kind: "malformed";
      readonly detail: string;
      readonly skippedLines: number;
    };

/** A reliable transcript-derived terminal outcome. */
export function finalEvidence(outcome: TerminalOutcome): TranscriptEvidence {
  return { kind: "final", outcome };
}

/** The transcript parsed cleanly but no final outcome exists yet. */
export function pendingEvidence(detail: string): TranscriptEvidence {
  return { kind: "pending", detail };
}

/** Missing, unreadable, or identity-mismatched transcript evidence. */
export function unavailableEvidence(detail: string): TranscriptEvidence {
  return { kind: "unavailable", detail };
}

/**
 * No final outcome was found and some lines were skipped as malformed. Distinct
 * from `pending` so the observer can retain the skip as a diagnostic without
 * ever reading it as an ended-without-outcome signal.
 */
export function malformedEvidence(
  detail: string,
  skippedLines: number,
): TranscriptEvidence {
  return { kind: "malformed", detail, skippedLines };
}

/**
 * Resolve the no-outcome result: `malformed` when lines were skipped, otherwise
 * `pending`. Either way the run stays active; the distinction is diagnostic.
 */
export function noOutcomeEvidence(
  detail: string,
  skippedLines: number,
): TranscriptEvidence {
  return skippedLines > 0
    ? malformedEvidence(detail, skippedLines)
    : pendingEvidence(detail);
}
