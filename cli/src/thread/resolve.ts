import { promises as fs } from "node:fs";
import path from "node:path";

import { GitSpawnError, runGit } from "../gitops/git.js";

/**
 * The outcome of resolving a `--thread` argument. On success it carries the
 * absolute canonical Git worktree root, the normalized repository-relative
 * thread path `docs/threads/<threadFolder>`, and the bare thread-folder name.
 * On failure it carries a single human-readable message; a failed resolution
 * performs no writes.
 */
export type ThreadResult =
  | {
      ok: true;
      repoRoot: string;
      threadRelPath: string;
      threadFolder: string;
    }
  | { ok: false; message: string };

const GENESIS_FILES = ["seed.md", "decisions.md"] as const;

/**
 * Split an absolute path into its segments, dropping a trailing empty segment
 * left by a trailing separator. The leading empty segment of a POSIX absolute
 * path is preserved so the segments rejoin to an absolute path.
 */
function segmentsOf(absPath: string): string[] {
  const parts = path.normalize(absPath).split(path.sep);
  while (parts.length > 1 && parts[parts.length - 1] === "") {
    parts.pop();
  }
  return parts;
}

type LexicalResult =
  | { ok: true; threadFolder: string; precedingRoot: string }
  | { ok: false; message: string };

/**
 * Validate, purely lexically, that `absPath` names a single thread folder
 * directly inside a repository's `docs/threads/`. Enforces the exact
 * `…/docs/threads/<single-thread-folder>` tail, rejects archived-thread paths
 * (`docs/threads/archive/…`), nested thread suffixes
 * (`…/docs/threads/a/docs/threads/b`), and multi-segment tails. Returns the
 * thread-folder name and the path portion preceding `docs/threads`.
 */
function lexicalThreadPath(absPath: string): LexicalResult {
  const parts = segmentsOf(absPath);

  // Archived-thread guard: any `docs/threads/archive` triple anywhere.
  for (let i = 0; i + 2 < parts.length; i++) {
    if (
      parts[i] === "docs" &&
      parts[i + 1] === "threads" &&
      parts[i + 2] === "archive"
    ) {
      return {
        ok: false,
        message: `--thread points at an archived thread; archived threads under docs/threads/archive/ cannot be run: ${absPath}`,
      };
    }
  }

  const n = parts.length;
  if (n < 4 || parts[n - 3] !== "docs" || parts[n - 2] !== "threads") {
    return {
      ok: false,
      message: `--thread must name a single thread folder ending in "docs/threads/<thread-folder>": ${absPath}`,
    };
  }

  const threadFolder = parts[n - 1];
  if (threadFolder === "" || threadFolder === "." || threadFolder === "..") {
    return {
      ok: false,
      message: `--thread does not name a thread folder: ${absPath}`,
    };
  }

  // Nested-suffix guard: the portion preceding the final docs/threads pair must
  // not itself contain a docs/threads pair.
  const preceding = parts.slice(0, n - 3);
  for (let i = 0; i + 1 < preceding.length; i++) {
    if (preceding[i] === "docs" && preceding[i + 1] === "threads") {
      return {
        ok: false,
        message: `--thread has a nested docs/threads suffix, which is not a valid thread path: ${absPath}`,
      };
    }
  }

  const precedingRoot = preceding.join(path.sep) || path.sep;
  return { ok: true, threadFolder, precedingRoot };
}

/**
 * Return true when `value` names a path (relative or absolute) rather than a
 * bare thread-folder name.
 */
function containsSeparator(value: string): boolean {
  return value.includes("/") || value.includes(path.sep);
}

/**
 * Resolve a `--thread` argument in any of the three accepted forms to a
 * canonical repository root and normalized repository-relative thread path.
 *
 * A value containing a path separator is treated as a path — relative values
 * are resolved against `cwd`, absolute values are taken as-is — and must
 * lexically end in exactly `docs/threads/<single-thread-folder>`. A bare name
 * resolves as `docs/threads/<name>` beneath the Git worktree root containing
 * `cwd`.
 *
 * The existing target is canonicalized with `fs.realpath`; the worktree top
 * level is obtained by running `git` from the target and canonicalized; the
 * canonical Git root must equal the path preceding `docs/threads`, and the
 * canonical target must be exactly one direct child of that root's
 * `docs/threads/`. Symlink escapes, nested suffixes, archived paths, bare
 * repositories, and mismatched worktree roots each fail with a distinct
 * message. Finally `seed.md` and `decisions.md` must both exist as regular
 * files inside the thread and each contain non-whitespace text; no other
 * artifact is checked. Any failure returns `{ ok: false }` and performs no
 * writes.
 */
export async function resolveThreadTarget(
  threadArg: string,
  cwd: string,
): Promise<ThreadResult> {
  if (threadArg === "") {
    return { ok: false, message: "--thread must not be empty." };
  }

  try {
    let absTarget: string;

    if (containsSeparator(threadArg)) {
      absTarget = path.resolve(cwd, threadArg);
      const lexical = lexicalThreadPath(absTarget);
      if (!lexical.ok) {
        return lexical;
      }
    } else {
      // Bare-name form: resolve beneath the worktree containing `cwd`.
      const top = await runGit(cwd, ["rev-parse", "--show-toplevel"]);
      if (top.code !== 0 || top.stdout.trim() === "") {
        return {
          ok: false,
          message: `The current directory is not inside a Git worktree, so the bare thread name "${threadArg}" cannot be resolved.`,
        };
      }
      absTarget = path.join(top.stdout.trim(), "docs", "threads", threadArg);
      const lexical = lexicalThreadPath(absTarget);
      if (!lexical.ok) {
        return lexical;
      }
    }

    // Canonicalize the existing target.
    let canonicalTarget: string;
    try {
      canonicalTarget = await fs.realpath(absTarget);
    } catch {
      return {
        ok: false,
        message: `Thread target does not exist: ${absTarget}`,
      };
    }

    const targetStat = await fs.lstat(canonicalTarget);
    if (!targetStat.isDirectory()) {
      return {
        ok: false,
        message: `Thread target is not a directory: ${canonicalTarget}`,
      };
    }

    // Re-validate the canonical location. Passing the input lexical check but
    // failing here means the target reaches outside docs/threads through a
    // symlink.
    const canonicalLexical = lexicalThreadPath(canonicalTarget);
    if (!canonicalLexical.ok) {
      return {
        ok: false,
        message: `--thread resolves through a symlink to a location outside any docs/threads directory: ${canonicalTarget}`,
      };
    }
    const { threadFolder, precedingRoot: canonicalPrecedingRoot } =
      canonicalLexical;

    // Establish the owning worktree from the target itself.
    const bare = await runGit(canonicalTarget, [
      "rev-parse",
      "--is-bare-repository",
    ]);
    if (bare.code !== 0) {
      return {
        ok: false,
        message: `The thread is not inside a Git worktree: ${canonicalTarget}`,
      };
    }
    if (bare.stdout.trim() === "true") {
      return {
        ok: false,
        message: `Cannot run against a bare repository (the thread has no worktree): ${canonicalTarget}`,
      };
    }

    const topLevel = await runGit(canonicalTarget, [
      "rev-parse",
      "--show-toplevel",
    ]);
    if (topLevel.code !== 0 || topLevel.stdout.trim() === "") {
      return {
        ok: false,
        message: `The thread has no Git worktree top level: ${canonicalTarget}`,
      };
    }
    const canonicalRoot = await fs.realpath(topLevel.stdout.trim());

    // The canonical Git root must equal the path preceding docs/threads, which
    // also guarantees the target is exactly one direct child of the root's
    // active docs/threads/.
    if (canonicalRoot !== canonicalPrecedingRoot) {
      return {
        ok: false,
        message: `The thread is not directly inside its Git worktree's docs/threads/. Worktree root is ${canonicalRoot} but the thread sits under ${canonicalPrecedingRoot}.`,
      };
    }

    // Genesis validation: seed.md and decisions.md must be regular files with
    // non-whitespace content. Nothing else is checked.
    for (const name of GENESIS_FILES) {
      const filePath = path.join(canonicalTarget, name);
      let fileStat;
      try {
        fileStat = await fs.lstat(filePath);
      } catch {
        return {
          ok: false,
          message: `Thread genesis file ${name} is missing: ${filePath}`,
        };
      }
      if (!fileStat.isFile()) {
        return {
          ok: false,
          message: `Thread genesis file ${name} must be a regular file: ${filePath}`,
        };
      }
      const contents = await fs.readFile(filePath, "utf8");
      if (contents.trim() === "") {
        return {
          ok: false,
          message: `Thread genesis file ${name} must contain non-whitespace text: ${filePath}`,
        };
      }
    }

    return {
      ok: true,
      repoRoot: canonicalRoot,
      threadRelPath: path.posix.join("docs", "threads", threadFolder),
      threadFolder,
    };
  } catch (error) {
    if (error instanceof GitSpawnError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
