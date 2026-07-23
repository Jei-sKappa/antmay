import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * The Antmay-authored header written to the top of every attempt log before the
 * harness's verbose stream is appended.
 */
export type AttemptLogHeader = {
  runId: string;
  stageId: string;
  stageOrdinal: number;
  attempt: number;
  harness: string;
  model: string;
  harnessVersion: string;
  repoRoot: string;
  threadRelPath: string;
  startedAt: string;
};

/**
 * The absolute and run-relative paths of the attempt log for a given stage
 * ordinal, stage id, and attempt number.
 */
export type AttemptLogPaths = {
  absPath: string;
  runRelPath: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Compute the attempt-log paths `logs/<NN>-<stage-id>-attempt-<NN>.log` (ordinal
 * and attempt zero-padded to two digits). Pure, so the runner can persist the
 * attempt record with its final log path before the file is created.
 */
export function attemptLogPaths(
  runDir: string,
  stageOrdinal: number,
  stageId: string,
  attempt: number,
): AttemptLogPaths {
  const name = `${pad2(stageOrdinal)}-${stageId}-attempt-${pad2(attempt)}.log`;
  return {
    absPath: path.join(runDir, "logs", name),
    runRelPath: path.posix.join("logs", name),
  };
}

/**
 * The header field order written to the log, one field per line.
 */
const HEADER_LINES: ReadonlyArray<[string, (h: AttemptLogHeader) => string]> = [
  ["Run", (h) => h.runId],
  ["Stage", (h) => h.stageId],
  ["Stage ordinal", (h) => String(h.stageOrdinal)],
  ["Attempt", (h) => String(h.attempt)],
  ["Harness", (h) => h.harness],
  ["Model", (h) => h.model],
  ["Harness version", (h) => h.harnessVersion],
  ["Repository root", (h) => h.repoRoot],
  ["Thread", (h) => h.threadRelPath],
  ["Started at", (h) => h.startedAt],
];

function renderHeader(header: AttemptLogHeader): string {
  const lines = HEADER_LINES.map(([label, get]) => `${label}: ${get(header)}`);
  // A trailing blank line separates the header from the appended stream.
  return `${lines.join("\n")}\n\n`;
}

/**
 * Create the attempt log at `paths.absPath`, making `logs/` (mode `0700`) as
 * needed, exclusively creating the file (flag `wx`, mode `0600`), writing and
 * flushing the full header, and closing the file before returning. A second
 * creation of the same path fails with `EEXIST`; the file is never appended to
 * or overwritten here.
 */
export async function createAttemptLog(
  paths: AttemptLogPaths,
  header: AttemptLogHeader,
): Promise<void> {
  const logsDir = path.dirname(paths.absPath);
  await fs.mkdir(logsDir, { recursive: true, mode: 0o700 });
  await fs.chmod(logsDir, 0o700);

  const handle = await fs.open(paths.absPath, "wx", 0o600);
  try {
    await handle.write(renderHeader(header));
    await handle.sync();
  } finally {
    await handle.close();
  }
}
