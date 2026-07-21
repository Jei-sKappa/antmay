// Pure human-attention counting and classification. A thread needs human
// attention when it carries a non-empty pending-decisions or pending-reviews
// bundle set. Filesystem enumeration lives outside this module; here we only
// count, classify, and shape the deterministic attention projection so the same
// counts always reduce to the same reported entries.

import type { AttentionInput } from "./status";

/** Raw pending-bundle counts observed for one thread workspace. */
export type ThreadPendingCounts = {
  readonly repositoryPath: string;
  readonly threadPath: string;
  readonly pendingDecisions: number;
  readonly pendingReviews: number;
};

/**
 * True when a thread carries at least one pending bundle. An empty workspace —
 * zero pending decisions and zero pending reviews — needs no attention.
 */
export function needsAttention(counts: {
  readonly pendingDecisions: number;
  readonly pendingReviews: number;
}): boolean {
  return counts.pendingDecisions > 0 || counts.pendingReviews > 0;
}

/**
 * Reduce raw per-thread pending counts to the attention entries a status
 * projection reports: threads whose workspaces are empty are excluded, and the
 * rest become {@link AttentionInput} values. Deterministic ordering is applied
 * later by the projection, not here.
 */
export function collectAttention(
  counts: readonly ThreadPendingCounts[],
): AttentionInput[] {
  return counts.filter(needsAttention).map((entry) => ({
    repositoryPath: entry.repositoryPath,
    threadPath: entry.threadPath,
    pendingDecisions: entry.pendingDecisions,
    pendingReviews: entry.pendingReviews,
  }));
}
