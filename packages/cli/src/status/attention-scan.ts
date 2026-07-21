// Filesystem attention scanning. `status` reports threads needing human
// attention independently of any run classification: it walks each scoped
// repository's DIRECT active thread roots under `docs/threads/`, counts the
// files in their `.pending-decisions/` and `.pending-reviews/` workspaces, and
// leaves the empty-workspace exclusion and deterministic ordering to the core
// projection. Archived threads live under `docs/threads/archive/` and are never
// descended into, so they contribute no attention signal. This module owns only
// enumeration and counting; the classification of what counts as attention is
// the pure core helper.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { RepositoryPath, ThreadPendingCounts } from "@antmay/core";

/** The folder name under `docs/threads/` that holds archived, inert threads. */
const ARCHIVE_DIR = "archive";

// Count the regular files directly inside a workspace folder, or 0 when the
// folder is absent. Nested directories are not counted; a pending bundle is a
// single file directly in the workspace.
function countBundleFiles(workspace: string): number {
  if (!existsSync(workspace)) {
    return 0;
  }
  let count = 0;
  for (const entry of readdirSync(workspace, { withFileTypes: true })) {
    if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

/**
 * Scan one repository's direct active thread roots, returning the raw pending
 * counts for each. Archived threads and any repository without a
 * `docs/threads/` folder yield no entries. Empty workspaces are returned with
 * zero counts and filtered out by the core projection.
 */
export function scanRepositoryAttention(
  repositoryPath: RepositoryPath,
): ThreadPendingCounts[] {
  const threadsRoot = join(repositoryPath, "docs", "threads");
  if (!existsSync(threadsRoot)) {
    return [];
  }
  const counts: ThreadPendingCounts[] = [];
  for (const entry of readdirSync(threadsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === ARCHIVE_DIR) {
      continue;
    }
    const threadPath = join(threadsRoot, entry.name);
    counts.push({
      repositoryPath,
      threadPath,
      pendingDecisions: countBundleFiles(
        join(threadPath, ".pending-decisions"),
      ),
      pendingReviews: countBundleFiles(join(threadPath, ".pending-reviews")),
    });
  }
  return counts;
}

/**
 * Scan every given repository's active thread roots for pending-bundle
 * attention. Repository paths are de-duplicated so a repository referenced more
 * than once is scanned exactly once.
 */
export function scanAttention(
  repositoryPaths: readonly RepositoryPath[],
): ThreadPendingCounts[] {
  const seen = new Set<string>();
  const counts: ThreadPendingCounts[] = [];
  for (const repositoryPath of repositoryPaths) {
    if (seen.has(repositoryPath)) {
      continue;
    }
    seen.add(repositoryPath);
    counts.push(...scanRepositoryAttention(repositoryPath));
  }
  return counts;
}
