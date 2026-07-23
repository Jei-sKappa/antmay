import { execFile } from "node:child_process";

import type { HarnessId } from "../config/settings.js";

/** The `--version` probe timeout, fixed at 10 seconds. */
const PROBE_TIMEOUT_MS = 10_000;

/** The executable name each harness is invoked through. */
const HARNESS_BINARY: Record<HarnessId, string> = {
  codex: "codex",
  "claude-code": "claude",
};

/**
 * One failing harness probe: the harness that failed, the binary that was
 * probed, and a human-readable reason distinguishing spawn, timeout, signal,
 * exit-code, and empty-output failures.
 */
export type ProbeFailure = {
  harness: HarnessId;
  binary: string;
  reason: string;
};

/**
 * The aggregate result of probing every requested harness executable. On
 * success, `versions` carries each requested harness's trimmed `--version`
 * line. On failure, `failures` lists every harness that failed, each diagnosed
 * distinctly.
 */
export type ProbeResult =
  | { ok: true; versions: Partial<Record<HarnessId, string>> }
  | { ok: false; failures: ProbeFailure[] };

/** The normalized outcome of running one `<binary> --version` invocation. */
export type ProbeExecResult =
  | { kind: "exit"; code: number; stdout: string; stderr: string }
  | { kind: "spawn-error"; message: string; code?: string }
  | { kind: "timeout" }
  | { kind: "signal"; signal: string };

/**
 * Runs `<binary> --version` and normalizes the outcome. Injected in tests; the
 * default drives `child_process.execFile` with no shell.
 */
export type ProbeExec = (
  binary: string,
  cwd: string,
  timeoutMs: number,
) => Promise<ProbeExecResult>;

const defaultExec: ProbeExec = (binary, cwd, timeoutMs) =>
  new Promise((resolve) => {
    execFile(
      binary,
      ["--version"],
      {
        cwd,
        timeout: timeoutMs,
        shell: false,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error === null) {
          resolve({ kind: "exit", code: 0, stdout, stderr });
          return;
        }
        const err = error as NodeJS.ErrnoException & {
          killed?: boolean;
          signal?: NodeJS.Signals | null;
        };
        if (err.killed === true) {
          resolve({ kind: "timeout" });
          return;
        }
        if (typeof err.code === "string") {
          resolve({ kind: "spawn-error", message: err.message, code: err.code });
          return;
        }
        if (err.signal !== null && err.signal !== undefined) {
          resolve({ kind: "signal", signal: String(err.signal) });
          return;
        }
        resolve({
          kind: "exit",
          code: typeof err.code === "number" ? err.code : 1,
          stdout: stdout ?? "",
          stderr: stderr ?? "",
        });
      },
    );
  });

/** The first non-whitespace line of the output, trimmed. */
function firstVersionLine(stdout: string): string | undefined {
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
}

/**
 * Turn one probe outcome into a version line or a failure reason. Success
 * requires exit `0` and non-whitespace output; every other outcome is a
 * distinctly diagnosed failure.
 */
function interpret(
  result: ProbeExecResult,
): { ok: true; version: string } | { ok: false; reason: string } {
  switch (result.kind) {
    case "exit": {
      if (result.code !== 0) {
        const stderr = result.stderr.trim();
        const detail = stderr.length > 0 ? `: ${stderr}` : "";
        return {
          ok: false,
          reason: `exited with code ${result.code}${detail}`,
        };
      }
      const version = firstVersionLine(result.stdout);
      if (version === undefined) {
        return {
          ok: false,
          reason: "exited 0 but produced no version output",
        };
      }
      return { ok: true, version };
    }
    case "spawn-error":
      return {
        ok: false,
        reason:
          result.code === "ENOENT"
            ? "executable not found on PATH"
            : `could not be spawned (${result.code ?? result.message})`,
      };
    case "timeout":
      return {
        ok: false,
        reason: `timed out after ${PROBE_TIMEOUT_MS / 1000}s`,
      };
    case "signal":
      return {
        ok: false,
        reason: `terminated by signal ${result.signal}`,
      };
  }
}

/**
 * Probe every requested harness's executable with `<binary> --version`.
 *
 * De-duplicates the requested harnesses, runs each probe with the fixed binary
 * mapping (`codex` → `codex`, `claude-code` → `claude`), inherited `PATH`,
 * `cwd: repoRoot`, and a fixed 10-second timeout. Success requires exit `0` and
 * non-whitespace output; the trimmed version line is recorded under the
 * requested harness. Every failing harness is reported together, each diagnosed
 * distinctly. No version parsing, minimum checking, or auth/model probing.
 */
export async function probeHarnessExecutables(
  harnesses: HarnessId[],
  repoRoot: string,
  exec: ProbeExec = defaultExec,
): Promise<ProbeResult> {
  const unique = [...new Set(harnesses)];
  const versions: Partial<Record<HarnessId, string>> = {};
  const failures: ProbeFailure[] = [];

  await Promise.all(
    unique.map(async (harness) => {
      const binary = HARNESS_BINARY[harness];
      const outcome = interpret(await exec(binary, repoRoot, PROBE_TIMEOUT_MS));
      if (outcome.ok) {
        versions[harness] = outcome.version;
      } else {
        failures.push({ harness, binary, reason: outcome.reason });
      }
    }),
  );

  if (failures.length > 0) {
    return { ok: false, failures };
  }
  return { ok: true, versions };
}
