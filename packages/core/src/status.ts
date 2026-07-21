// The exact `status --json` structural contract and the deterministic
// projections that produce it. The document is self-contained for later
// federation and preserves the same run classifications, reasons, attach data,
// and pending-bundle counts as human output. Additional JSON fields are
// prohibited unless `schemaVersion` changes.

import type { RunRecord } from "./run";

/**
 * The v0 `status --json` document. This structural contract is fixed: the same
 * fields and unions ship in every projection, and no field is added unless
 * `schemaVersion` changes.
 */
export type StatusDocumentV1 = {
  schemaVersion: 1;
  scope:
    | { mode: "repository"; repositoryPath: string }
    | { mode: "all"; repositoryPath: null };
  runs: Array<{
    id: string;
    repositoryPath: string;
    threadPath: string;
    skill: string;
    harness: "claude" | "codex";
    adapter: "herdr";
    classification: "active" | "done" | "blocked" | "refused" | "unknown";
    reason: string | null;
    session: {
      kind: "pinned" | "heuristic";
      id: string | null;
    };
    attach: {
      available: boolean;
      handle: string | null;
    };
  }>;
  attention: Array<{
    repositoryPath: string;
    threadPath: string;
    pendingDecisions: number;
    pendingReviews: number;
  }>;
};

/** The scope union of a status document, derived from the fixed contract. */
export type StatusScope = StatusDocumentV1["scope"];

/** One projected run entry, derived from the fixed contract. */
export type StatusRun = StatusDocumentV1["runs"][number];

/** One projected attention entry, derived from the fixed contract. */
export type StatusAttention = StatusDocumentV1["attention"][number];

/** Attention input describing pending human-attention bundle counts. */
export type AttentionInput = {
  readonly repositoryPath: string;
  readonly threadPath: string;
  readonly pendingDecisions: number;
  readonly pendingReviews: number;
};

/** Build a `repository`-scoped status scope. */
export function repositoryScope(repositoryPath: string): StatusScope {
  return { mode: "repository", repositoryPath };
}

/** Build an `all`-scoped status scope. */
export function allScope(): StatusScope {
  return { mode: "all", repositoryPath: null };
}

/** Project a single run record into its JSON run entry. */
export function projectRun(record: RunRecord): StatusRun {
  return {
    id: record.id,
    repositoryPath: record.repositoryPath,
    threadPath: record.threadPath,
    skill: record.skill,
    harness: record.harness,
    adapter: record.adapter,
    classification: record.classification,
    reason: record.reason,
    session: {
      kind: record.session.kind,
      id: record.session.id,
    },
    attach: {
      available: record.attachment.available,
      handle: record.attachment.handle,
    },
  };
}

function compareStrings(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/**
 * Project a scope, run records, and attention inputs into an exact
 * {@link StatusDocumentV1}. Runs are ordered by run ID and attention entries by
 * repository path then thread path, so the same state always yields the same
 * document regardless of input order.
 */
export function projectStatusDocument(input: {
  scope: StatusScope;
  runs: readonly RunRecord[];
  attention: readonly AttentionInput[];
}): StatusDocumentV1 {
  const runs = [...input.runs]
    .map(projectRun)
    .sort((a, b) => compareStrings(a.id, b.id));

  const attention = input.attention
    .map(
      (entry): StatusAttention => ({
        repositoryPath: entry.repositoryPath,
        threadPath: entry.threadPath,
        pendingDecisions: entry.pendingDecisions,
        pendingReviews: entry.pendingReviews,
      }),
    )
    .sort(
      (a, b) =>
        compareStrings(a.repositoryPath, b.repositoryPath) ||
        compareStrings(a.threadPath, b.threadPath),
    );

  return {
    schemaVersion: 1,
    scope: input.scope,
    runs,
    attention,
  };
}
