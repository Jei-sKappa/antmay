// Contextual run selection for `antmay attach` when no explicit id is given.
// The adapter's liveness probe is the sole authority for whether a pane is
// attachable: a record is a candidate only when it carries a handle AND the
// adapter positively reports that pane alive. Classification is never consulted,
// so both active runs and terminal runs whose retained pane is still up qualify,
// and recency is never used to break a tie. Selection is pure and side-effect
// free: it filters, then reports whether exactly one, none, or several
// candidates remain, leaving the interactive/non-interactive decision and every
// pane operation to the caller.

import type { AttachmentHandle, RunRecord } from "@antmay/core";

/** A run whose recorded pane the adapter positively reports attachable. */
export type AttachCandidate = {
  readonly record: RunRecord;
  readonly handle: AttachmentHandle;
};

/** Probes whether the pane behind a handle is currently alive. */
export type LivenessProbe = (handle: AttachmentHandle) => boolean;

/**
 * The contextual selection over a repository's runs: exactly one attachable
 * candidate, none at all, or several that require an explicit choice.
 */
export type ContextualSelection =
  | { readonly kind: "single"; readonly candidate: AttachCandidate }
  | { readonly kind: "none" }
  | {
      readonly kind: "ambiguous";
      readonly candidates: readonly AttachCandidate[];
    };

/**
 * Filter records to the panes the adapter positively reports attachable. A
 * record with no recorded handle is skipped without a probe; every other record
 * is kept only when the probe reports its pane alive. Order is preserved.
 */
export function attachableCandidates(
  records: readonly RunRecord[],
  isAlive: LivenessProbe,
): readonly AttachCandidate[] {
  const candidates: AttachCandidate[] = [];
  for (const record of records) {
    const handle = record.attachment.handle;
    if (handle === null) {
      continue;
    }
    if (!isAlive(handle)) {
      continue;
    }
    candidates.push({ record, handle });
  }
  return candidates;
}

/**
 * Decide the contextual selection for a repository's runs. Returns the sole
 * candidate directly, reports `none` when nothing is attachable, and reports
 * `ambiguous` (never a recency pick) when several candidates remain.
 */
export function selectContextualRun(
  records: readonly RunRecord[],
  isAlive: LivenessProbe,
): ContextualSelection {
  const candidates = attachableCandidates(records, isAlive);
  if (candidates.length === 0) {
    return { kind: "none" };
  }
  const [only] = candidates;
  if (candidates.length === 1 && only !== undefined) {
    return { kind: "single", candidate: only };
  }
  return { kind: "ambiguous", candidates };
}
