import { execFile } from "node:child_process";

/**
 * The full outcome of running `git` to completion: the numeric exit code plus
 * the captured standard output and error. A non-zero `code` is a completed
 * process, not a spawn failure — callers inspect `code` to decide what to do.
 */
export type GitResult = { code: number; stdout: string; stderr: string };

// Generous cap so large `git` output (e.g. status listings) never truncates.
const MAX_BUFFER = 64 * 1024 * 1024;

/**
 * Raised when `git` could not be run to completion at all — the executable was
 * not found, the process could not be spawned, or its output overflowed the
 * buffer. Distinct from a completed process that exited non-zero, which
 * `runGit` reports through `GitResult.code`.
 */
export class GitSpawnError extends Error {
  readonly args: readonly string[];

  constructor(args: string[], cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to run "git ${args.join(" ")}": ${message}`);
    this.name = "GitSpawnError";
    this.args = [...args];
  }
}

/**
 * Raised by `gitOrThrow` when a completed `git` invocation exits non-zero. It
 * carries the exact arguments, the exit code, and the captured streams so a
 * caller can surface the underlying failure.
 */
export class GitCommandError extends Error {
  readonly args: readonly string[];
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;

  constructor(args: string[], result: GitResult) {
    const detail = result.stderr.trim() || result.stdout.trim() || "(no output)";
    super(`git ${args.join(" ")} exited with code ${result.code}: ${detail}`);
    this.name = "GitCommandError";
    this.args = [...args];
    this.code = result.code;
    this.stdout = result.stdout;
    this.stderr = result.stderr;
  }
}

/**
 * Run the user's `git` executable with `args` in `cwd`, optionally write the
 * supplied bytes to its standard input, and resolve with its exit code, stdout,
 * and stderr. The executable is looked up on the inherited `PATH` and invoked
 * directly — never through a shell — so arguments are never word-split or
 * glob-expanded. A completed process that exits non-zero resolves normally;
 * only a genuine failure to run or feed the process rejects with a
 * `GitSpawnError`. This is the single Git access point for the package.
 */
export function runGit(
  cwd: string,
  args: string[],
  stdin?: string,
): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    let stdinError: unknown;
    const child = execFile(
      "git",
      args,
      { cwd, encoding: "utf8", maxBuffer: MAX_BUFFER },
      (error, stdout, stderr) => {
        if (stdinError !== undefined) {
          reject(new GitSpawnError(args, stdinError));
          return;
        }
        if (error !== null) {
          const code = (error as { code?: unknown }).code;
          if (typeof code === "number") {
            resolve({ code, stdout, stderr });
            return;
          }
          reject(new GitSpawnError(args, error));
          return;
        }
        resolve({ code: 0, stdout, stderr });
      },
    );
    if (stdin !== undefined) {
      if (child.stdin === null) {
        stdinError = new Error("Git process has no writable stdin");
        child.kill();
        return;
      }
      child.stdin.once("error", (error) => {
        stdinError = error;
      });
      child.stdin.end(stdin);
    }
  });
}

/**
 * Run `git` and require a clean (zero) exit. Returns the `GitResult` on success
 * and throws a `GitCommandError` carrying the command and stderr on any
 * non-zero exit. A spawn failure still surfaces as a `GitSpawnError`.
 */
export async function gitOrThrow(
  cwd: string,
  args: string[],
): Promise<GitResult> {
  const result = await runGit(cwd, args);
  if (result.code !== 0) {
    throw new GitCommandError(args, result);
  }
  return result;
}

/**
 * Split a NUL-delimited `git` output stream into its individual fields,
 * dropping the trailing empty field the terminator leaves behind. Using `-z`
 * output throughout keeps spaces, quotes, and newlines inside filenames from
 * corrupting the parse the way the default line/quoted form would.
 */
export function splitNul(stdout: string): string[] {
  return stdout.split("\0").filter((field) => field.length > 0);
}
