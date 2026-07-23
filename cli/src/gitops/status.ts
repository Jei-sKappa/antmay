import { gitOrThrow } from "./git.js";

/**
 * Split a NUL-delimited `git` output stream into its individual fields,
 * dropping the trailing empty field the terminator leaves behind. Using `-z`
 * output throughout keeps spaces, quotes, and newlines inside filenames from
 * corrupting the parse the way the default line/quoted form would.
 */
function splitNul(stdout: string): string[] {
  return stdout.split("\0").filter((field) => field.length > 0);
}

/**
 * Collect the boundary status set of `repoRoot`: every staged, unstaged,
 * deleted, and untracked path, with untracked directories expanded to their
 * individual files (`-uall`) and ignored files excluded (no `--ignored`).
 *
 * The porcelain v1 `-z` form emits one `XY <path>\0` record per entry with no
 * quoting, so filenames containing whitespace, quotes, or newlines round-trip
 * intact. `--no-renames` disables rename detection so each record carries a
 * single path; should a rename/copy record ever appear (`XY <new>\0<old>\0`),
 * both fields are still absorbed as observed paths. Paths are returned as
 * repository-relative POSIX paths — git already emits them forward-slashed and
 * repo-relative — deduplicated and sorted.
 */
export async function collectBoundaryStatus(
  repoRoot: string,
): Promise<string[]> {
  const result = await gitOrThrow(repoRoot, [
    "status",
    "--porcelain=v1",
    "-z",
    "-uall",
    "--no-renames",
  ]);

  const fields = splitNul(result.stdout);
  const paths = new Set<string>();

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index] ?? "";
    // Each record is `XY <path>`: a two-character status, a space, the path.
    const status = field.slice(0, 2);
    const primary = field.slice(3);
    if (primary.length > 0) {
      paths.add(primary);
    }
    // A rename/copy status ('R'/'C' in either column) puts the original path in
    // the immediately following NUL field; absorb it defensively even though
    // `--no-renames` should prevent it from ever appearing.
    if (status.includes("R") || status.includes("C")) {
      const origin = fields[index + 1];
      if (origin !== undefined) {
        paths.add(origin);
        index += 1;
      }
    }
  }

  return [...paths].sort();
}

/**
 * Read the current `HEAD` commit object name of `repoRoot`.
 */
export async function readHead(repoRoot: string): Promise<string> {
  const result = await gitOrThrow(repoRoot, ["rev-parse", "HEAD"]);
  return result.stdout.trim();
}

/**
 * Whether `repoRoot` has an empty boundary status set — the clean-worktree
 * preflight run and resume share this exact status set.
 */
export async function isWorktreeClean(repoRoot: string): Promise<boolean> {
  const paths = await collectBoundaryStatus(repoRoot);
  return paths.length === 0;
}
