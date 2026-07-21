// The injectable process boundary for every non-shell external invocation and
// executable-availability check the CLI performs. Production runs real programs
// (git, herdr, Claude Code, Codex) through Node's `spawnSync` with an argv array
// and `shell: false`, so a request value can never be interpreted as a shell
// fragment. Tests substitute a fake runner to stand in for those programs
// without touching the real environment. Preflight and later launch code depend
// on this interface, never on `child_process` directly.

import { spawnSync } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { delimiter, isAbsolute, join, resolve, sep } from "node:path";

/** The captured result of running an external program. */
export type ProcessRunResult = {
  /** The exit code, or `null` when the program could not be spawned at all. */
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
};

/** Options for a single external invocation. */
export type ProcessRunOptions = {
  readonly cwd?: string;
};

/**
 * The process boundary. `run` invokes a program with an explicit argv array —
 * never a shell string — and captures its output. `locate` resolves an
 * executable to an absolute path from `PATH` (or verifies a path-qualified
 * program), returning `null` when it is unavailable.
 */
export interface ProcessRunner {
  run(
    program: string,
    args: readonly string[],
    options?: ProcessRunOptions,
  ): ProcessRunResult;
  locate(program: string): string | null;
}

function isExecutableFile(candidate: string): boolean {
  try {
    if (!statSync(candidate).isFile()) {
      return false;
    }
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The production process boundary. It reads `PATH` from the supplied environment
 * (defaulting to `process.env`) and never spawns through a shell.
 */
export class NodeProcessRunner implements ProcessRunner {
  private readonly pathValue: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.pathValue = env.PATH ?? "";
  }

  run(
    program: string,
    args: readonly string[],
    options?: ProcessRunOptions,
  ): ProcessRunResult {
    const result = spawnSync(program, [...args], {
      cwd: options?.cwd,
      encoding: "utf8",
      shell: false,
    });
    if (result.error !== undefined) {
      return { code: null, stdout: "", stderr: result.error.message };
    }
    return {
      code: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }

  locate(program: string): string | null {
    if (program.includes(sep) || program.includes("/")) {
      const absolute = isAbsolute(program) ? program : resolve(program);
      return isExecutableFile(absolute) ? absolute : null;
    }
    for (const dir of this.pathValue.split(delimiter)) {
      if (dir.length === 0) {
        continue;
      }
      const candidate = join(dir, program);
      if (isExecutableFile(candidate)) {
        return candidate;
      }
    }
    return null;
  }
}
