import { promises as fs } from "node:fs";
import path from "node:path";

const RUNS_DIR_NAME = "afk-runs";

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/**
 * Produce a run ID of the form `<YYYYMMDDTHHmmssSSSZ>-<8-lowercase-hex>`. The
 * timestamp is `now` in UTC to millisecond precision; the suffix is eight
 * lowercase hex characters from four bytes supplied by `random`.
 */
export function generateRunId(now: Date, random: (n: number) => Buffer): string {
  const stamp =
    `${pad(now.getUTCFullYear(), 4)}` +
    `${pad(now.getUTCMonth() + 1, 2)}` +
    `${pad(now.getUTCDate(), 2)}` +
    `T` +
    `${pad(now.getUTCHours(), 2)}` +
    `${pad(now.getUTCMinutes(), 2)}` +
    `${pad(now.getUTCSeconds(), 2)}` +
    `${pad(now.getUTCMilliseconds(), 3)}` +
    `Z`;
  const suffix = random(4).toString("hex").toLowerCase();
  return `${stamp}-${suffix}`;
}

/**
 * The `afk-runs/` directory under a state root. Pure; creates nothing.
 */
export function runsDirectory(stateRoot: string): string {
  return path.join(stateRoot, RUNS_DIR_NAME);
}

/**
 * The directory for a specific run under a state root. Pure; creates nothing.
 */
export function runDirectoryFor(stateRoot: string, runId: string): string {
  return path.join(runsDirectory(stateRoot), runId);
}

/**
 * Exclusively create the run directory for `runId`, lazily creating the state
 * root and `afk-runs/` at mode `0700` first. Returns `created` with the run
 * directory path, or `collision` when the run directory already exists
 * (`EEXIST`) so the caller can regenerate the ID while keeping its lock record.
 */
export async function createRunDirectory(
  stateRoot: string,
  runId: string,
): Promise<{ kind: "created"; runDir: string } | { kind: "collision" }> {
  const runsDir = runsDirectory(stateRoot);
  await fs.mkdir(runsDir, { recursive: true, mode: 0o700 });
  // mkdir honors the umask, so set the modes explicitly to guarantee 0700.
  await fs.chmod(stateRoot, 0o700);
  await fs.chmod(runsDir, 0o700);

  const runDir = runDirectoryFor(stateRoot, runId);
  try {
    await fs.mkdir(runDir, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return { kind: "collision" };
    }
    throw error;
  }
  await fs.chmod(runDir, 0o700);
  return { kind: "created", runDir };
}
