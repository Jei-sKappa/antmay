import { promises as fs } from "node:fs";
import path from "node:path";

import { EXIT_FAILURE, EXIT_OK } from "../cli/exit-codes.js";
import { resolveStateRoot } from "../config/roots.js";
import type { RunCheckpoint, RunCondition } from "../state/checkpoint.js";
import { readCheckpoint } from "../state/persist.js";
import { runsDirectory } from "../state/runs.js";

/**
 * The dependency bag `listCommand` runs against. `env` and `homedir` resolve the
 * state root; `stdout`/`stderr` carry rows and warnings; `isTTY` (with a
 * non-empty `NO_COLOR`) decides whether meaning-free color is emitted. `list`
 * never resolves a config root, reads settings, acquires a lock, or writes.
 */
export type ListDeps = {
  env: NodeJS.ProcessEnv;
  homedir: string | undefined;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  isTTY: boolean;
};

const ANSI = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
} as const;

const CONDITION_LABELS: Record<RunCondition, string> = {
  ready: "Ready",
  "waiting-for-user": "Waiting for user",
  completed: "Completed",
  executing: "Executing (unverified)",
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Build one whitespace-separated row for a valid checkpoint: updated time,
 * friendly condition, run ID, recipe, one-based stage position with stage ID,
 * current harness/model, absolute repository path, and repository-relative
 * thread path. A completed run shows the final stage count and omits the current
 * stage ID and harness/model, since it has no live stage.
 */
function renderRow(checkpoint: RunCheckpoint): string {
  const condition = CONDITION_LABELS[checkpoint.condition];
  const stageCount = checkpoint.stages.length;
  const columns: string[] = [
    checkpoint.updatedAt,
    condition,
    checkpoint.runId,
    checkpoint.recipeName,
  ];

  if (checkpoint.condition === "completed") {
    columns.push(`${stageCount}/${stageCount}`);
  } else {
    const stage = checkpoint.stages[checkpoint.stageIndex]!;
    columns.push(`${checkpoint.stageIndex + 1}/${stageCount} [${stage.id}]`);
    columns.push(`${stage.profile.harness}/${stage.profile.model}`);
  }

  columns.push(checkpoint.repoRoot, checkpoint.threadRelPath);
  return columns.join("  ");
}

/**
 * Read-only `antmay afk list`. Resolves only the state root, then reads every
 * immediate run directory independently, ignoring non-directory entries. A
 * missing or empty runs directory prints `No AFK runs found.` and returns `0`
 * without creating anything. Each malformed or unreadable checkpoint emits a
 * stderr warning naming the directory, its `state.json` path, and the validation
 * error, while valid runs still print sorted by `updatedAt` descending. Acquires
 * no lock and writes no file; returns `1` when any warning was emitted, else `0`.
 */
export async function listCommand(deps: ListDeps): Promise<number> {
  const stateRootResult = resolveStateRoot(deps.env, deps.homedir);
  if (!stateRootResult.ok) {
    deps.stderr.write(`${stateRootResult.message}\n`);
    return EXIT_FAILURE;
  }
  const runsDir = runsDirectory(stateRootResult.root);

  let entries;
  try {
    entries = await fs.readdir(runsDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      deps.stdout.write("No AFK runs found.\n");
      return EXIT_OK;
    }
    deps.stderr.write(`Cannot read the runs directory ${runsDir}: ${errorMessage(error)}\n`);
    return EXIT_FAILURE;
  }

  const runDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  if (runDirs.length === 0) {
    deps.stdout.write("No AFK runs found.\n");
    return EXIT_OK;
  }

  const checkpoints: RunCheckpoint[] = [];
  let warned = false;

  for (const name of runDirs) {
    const runDir = path.join(runsDir, name);
    const result = await readCheckpoint(runDir);
    if (result.ok) {
      checkpoints.push(result.checkpoint);
    } else {
      warned = true;
      const statePath = path.join(runDir, "state.json");
      deps.stderr.write(
        `warning: skipping run directory ${runDir}: its checkpoint (${statePath}) is unreadable or invalid:\n${result.errors.map((e) => `  ${e}`).join("\n")}\n`,
      );
    }
  }

  checkpoints.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  const useColor = deps.isTTY && (deps.env.NO_COLOR ?? "") === "";
  const paint = (text: string): string =>
    useColor ? `${ANSI.cyan}${text}${ANSI.reset}` : text;

  for (const checkpoint of checkpoints) {
    deps.stdout.write(`${paint(renderRow(checkpoint))}\n`);
  }

  return warned ? EXIT_FAILURE : EXIT_OK;
}
