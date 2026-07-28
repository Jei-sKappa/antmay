import path from "node:path";

import { GitCommandError, type GitResult, runGit } from "./git.js";

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

/**
 * How this check reaches `git`. It defaults to the package's `runGit` and is
 * injectable only so a focused test can drive the completed-error and
 * spawn-error paths deterministically.
 */
export type GitRunner = (cwd: string, args: string[]) => Promise<GitResult>;

/**
 * The outcome of the check. A failure carries the entire user-visible text —
 * either the structured refusal or the Git-error report — so a command prints
 * it as-is and composes no wording of its own.
 */
export type TemporaryWorkspaceCheckResult =
  | { ok: true }
  | { ok: false; message: string };

const INTRO =
  "Antmay skills write .pending-decisions/, .pending-reviews/, and " +
  ".implementation-runs/ inside the thread while a run is in progress. Git " +
  "has to ignore all three and track nothing under them, or the files a " +
  "skill writes there make a later stage fail its Git boundary.";

/**
 * Verify that every one of the thread's three temporary directories is covered
 * by Git's ignore rules and holds no content Git tracks. Both are required and
 * they fail independently: an ignore-covered directory holding tracked content
 * needs untracking only, an unignored one holding tracked content needs both
 * corrections, and each failing directory appears under every group whose probe
 * it failed.
 *
 * Ignore coverage is asked of the directory itself, with the trailing slash that
 * makes a trailing-slash ignore rule match and a filename-restricted rule (say
 * one ending `/*.md`) correctly report as uncovered, and with `--no-index` so
 * the answer describes pattern coverage alone. Tracked content is a separate
 * single probe over the three paths.
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

  const uncovered: string[] = [];
  let trackedPaths: string[] = [];

  try {
    for (const name of WORKSPACE_NAMES) {
      // The trailing slash asks about the directory; `--no-index` keeps the
      // answer about ignore patterns rather than index membership.
      const args = [
        "check-ignore",
        "-q",
        "--no-index",
        "--",
        `${relPathOf(name)}/`,
      ];
      const result = await gitRunner(repoRoot, args);
      if (result.code === 0) {
        continue;
      }
      if (result.code === 1) {
        uncovered.push(name);
        continue;
      }
      return gitFailure(repoRoot, args, result);
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
    trackedPaths = result.stdout.split("\0").filter((field) => field.length > 0);
  } catch (error) {
    // `git` could not be run at all. Fail closed with the underlying reason.
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
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
    message: refusal(repoRoot, {
      uncovered: uncovered.map((name) => relPathOf(name)),
      uncoveredRules: uncovered.map((name) => `docs/threads/**/${name}/`),
      trackedPaths,
      trackedDirs: trackedWorkspaces.map((name) => relPathOf(name)),
    }),
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
    message: `Cannot inspect the Git state of ${repoRoot}: ${detail}`,
  };
}

/**
 * Render the refusal: the explanation, then one group per failure kind, each
 * immediately followed by its own copyable correction. Missing coverage comes
 * first because its rules are repository-wide and fix every thread at once. A
 * group with nothing to report is omitted entirely.
 *
 * Every tracked path Git emitted is listed, and the `git rm` correction names
 * the directories those paths belong to — so a path that belongs to none of
 * them is still shown, with no correction claiming to remove it.
 */
function refusal(
  repoRoot: string,
  failures: {
    uncovered: string[];
    uncoveredRules: string[];
    trackedPaths: string[];
    trackedDirs: string[];
  },
): string {
  const sections: string[] = [INTRO];

  if (failures.uncovered.length > 0) {
    sections.push(
      block(
        "Not covered by Git's ignore rules:",
        failures.uncovered.map((rel) => `  - ${rel}/`),
      ),
      block(
        `Add these repository-wide rules to the .gitignore of ${repoRoot}:`,
        failures.uncoveredRules.map((rule) => `  ${rule}`),
      ),
    );
  }

  if (failures.trackedPaths.length > 0) {
    sections.push(
      block(
        "Tracked by Git:",
        failures.trackedPaths.map((tracked) => `  - ${tracked}`),
      ),
    );
  }

  if (failures.trackedDirs.length > 0) {
    sections.push(
      block("Untrack these directories and commit the removal:", [
        `  git rm -r --cached -- ${failures.trackedDirs.join(" ")}`,
      ]),
    );
  }

  return sections.join("\n\n");
}

function block(heading: string, lines: string[]): string {
  return [heading, ...lines].join("\n");
}
