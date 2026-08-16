import path from "node:path";

import { GitCommandError, type GitResult, runGit, splitNul } from "./git.js";

/**
 * The three directories Antmay skills create on demand inside a thread. They
 * hold work in progress rather than thread artifacts, so Git must ignore them
 * and track nothing under them. This is the one place the CLI names them for
 * that purpose.
 */
const WORKSPACE_NAMES = [
  ".pending-decisions",
  ".pending-reviews",
  ".implementation-runs",
] as const;

type TemporaryWorkspaceName = (typeof WORKSPACE_NAMES)[number];

export type TemporaryWorkspaceProblems = {
  uncovered: {
    directory: string;
    repositoryRule: string;
  }[];
  trackedPaths: string[];
  trackedDirectories: string[];
};

/**
 * How this check reaches `git`. It defaults to the package's `runGit` and is
 * injectable only so a focused test can drive the completed-error and
 * spawn-error paths deterministically.
 */
export type GitRunner = (
  cwd: string,
  args: string[],
  stdin?: string,
) => Promise<GitResult>;

/**
 * The outcome of the check. An unsafe repository carries facts and correction
 * inputs for the terminal layer to present in the context of either a new run
 * or a resume. A failure to inspect Git remains a short diagnostic because the
 * check has no trustworthy repository-state facts to report.
 */
export type TemporaryWorkspaceCheckResult =
  | { ok: true }
  | {
      ok: false;
      kind: "unsafe";
      problems: TemporaryWorkspaceProblems;
    }
  | { ok: false; kind: "inspection-error"; message: string };

/**
 * Verify that every one of the thread's three temporary directories is covered
 * by Git's ignore rules and holds no content Git tracks. Both are required and
 * they fail independently: an ignore-covered directory holding tracked content
 * needs untracking only, an unignored one holding tracked content needs both
 * corrections, and each failing directory appears under every group whose probe
 * it failed.
 *
 * Ignore coverage is asked of all three directories in one NUL-delimited probe.
 * Each path carries the trailing slash that makes a trailing-slash ignore rule
 * match and a filename-restricted rule (say one ending `/*.md`) correctly report
 * as uncovered, and `--no-index` keeps the answer about pattern coverage alone.
 * Tracked content is a separate single probe over the three paths.
 *
 * The check reads and never writes. Every probe that completes is finished
 * before anything is reported, so one refusal names every failing directory. A
 * `git` invocation that fails outright — an unexpected exit code, or a process
 * that could not be run — aborts with a Git error instead: an unreadable
 * repository is never read as a passing or a failing property.
 */
export async function checkTemporaryWorkspaces(
  repoRoot: string,
  threadRelPath: string,
  gitRunner: GitRunner = runGit,
): Promise<TemporaryWorkspaceCheckResult> {
  const relPathOf = (name: string): string =>
    path.posix.join(threadRelPath, name);

  const uncovered: TemporaryWorkspaceName[] = [];
  let trackedPaths: string[] = [];

  try {
    const coveragePaths = WORKSPACE_NAMES.map(
      (name) => `${relPathOf(name)}/`,
    );
    const coverageArgs = [
      "check-ignore",
      "--no-index",
      "-z",
      "--stdin",
    ];
    const coverage = await gitRunner(
      repoRoot,
      coverageArgs,
      coveragePaths.map((workspacePath) => `${workspacePath}\0`).join(""),
    );
    if (coverage.code !== 0 && coverage.code !== 1) {
      return gitFailure(repoRoot, coverageArgs, coverage);
    }
    const covered = new Set(splitNul(coverage.stdout));
    const requested = new Set(coveragePaths);
    const inconsistentCoverage =
      [...covered].some((workspacePath) => !requested.has(workspacePath)) ||
      (coverage.code === 0) !== (covered.size > 0);
    if (inconsistentCoverage) {
      return {
        ok: false,
        kind: "inspection-error",
        message: `Cannot inspect the Git state of ${repoRoot}: git check-ignore returned inconsistent coverage output`,
      };
    }
    for (const name of WORKSPACE_NAMES) {
      if (!covered.has(`${relPathOf(name)}/`)) {
        uncovered.push(name);
      }
    }

    const args = [
      "ls-files",
      "-z",
      "--",
      ...WORKSPACE_NAMES.map((name) => relPathOf(name)),
    ];
    const result = await gitRunner(repoRoot, args);
    if (result.code !== 0) {
      return gitFailure(repoRoot, args, result);
    }
    trackedPaths = splitNul(result.stdout);
  } catch (error) {
    // `git` could not be run at all. Fail closed with the underlying reason.
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      kind: "inspection-error",
      message: `Cannot inspect the Git state of ${repoRoot}: ${reason}`,
    };
  }

  const trackedWorkspaces = WORKSPACE_NAMES.filter((name) => {
    const rel = relPathOf(name);
    return trackedPaths.some(
      (tracked) => tracked === rel || tracked.startsWith(`${rel}/`),
    );
  });

  // Any path Git emitted is a failure, whether or not it attributes to one of
  // the three directories: the verdict never rests on this module's own
  // attribution, so an unattributable path is reported instead of dropped.
  if (uncovered.length === 0 && trackedPaths.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    kind: "unsafe",
    problems: {
      uncovered: uncovered.map((name) => ({
        directory: relPathOf(name),
        repositoryRule: `docs/threads/**/${name}/`,
      })),
      trackedPaths,
      trackedDirectories: trackedWorkspaces.map((name) => relPathOf(name)),
    },
  };
}

/**
 * Report a `git` invocation that completed with an exit code the check does not
 * interpret. The command, its code, and its output come from the package's own
 * rendering of a failed invocation.
 */
function gitFailure(
  repoRoot: string,
  args: string[],
  result: GitResult,
): TemporaryWorkspaceCheckResult {
  const detail = new GitCommandError(args, result).message;
  return {
    ok: false,
    kind: "inspection-error",
    message: `Cannot inspect the Git state of ${repoRoot}: ${detail}`,
  };
}
