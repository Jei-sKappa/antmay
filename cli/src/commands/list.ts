import { promises as fs } from "node:fs";
import path from "node:path";

import { EXIT_FAILURE, EXIT_OK } from "../cli/exit-codes.js";
import { resolveStateRoot } from "../config/roots.js";
import {
  printRunList,
  type RunListSummary,
} from "../display/list.js";
import type {
  AttemptRecord,
  RunCheckpoint,
} from "../state/checkpoint.js";
import { readCheckpoint } from "../state/checkpoint.js";
import { runsDirectory } from "../state/runs.js";

/**
 * The dependency bag `listCommand` runs against. `env` and `homedir` resolve the
 * state root; `stdout`/`stderr` carry summaries and warnings; the resolved
 * `color` decides whether meaning-free color is emitted. `list` never resolves a
 * config root, reads settings, acquires a lock, or writes.
 */
export type ListDeps = {
  env: NodeJS.ProcessEnv;
  homedir: string | undefined;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  color: boolean;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Walk attempts from newest to oldest and return the first that carries a
 * captured provider session. Pure: no I/O and no condition-specific rules.
 */
function latestSessionAttempt(
  attempts: readonly AttemptRecord[],
): AttemptRecord | undefined {
  for (let i = attempts.length - 1; i >= 0; i -= 1) {
    const attempt = attempts[i]!;
    if (attempt.agentSession !== undefined) {
      return attempt;
    }
  }
  return undefined;
}

/**
 * Resolve the optional latest session from the selected attempt and its stage
 * snapshot. Returns `undefined` when no attempt captured a session.
 */
function latestSessionOf(
  checkpoint: RunCheckpoint,
): RunListSummary["latestSession"] | undefined {
  const attempt = latestSessionAttempt(checkpoint.attempts);
  if (attempt?.agentSession === undefined) {
    return undefined;
  }
  const stage = checkpoint.stages[attempt.stageIndex]!;
  return {
    harness: stage.binding.agent.harness,
    id: attempt.agentSession.id,
  };
}

/**
 * Project one valid checkpoint into the facts the list renderer presents. A
 * completed run has no current stage ID or agent. The latest session, when
 * present, belongs to the newest session-carrying attempt and can therefore
 * come from a different stage than the checkpoint cursor.
 */
function summarizeRun(checkpoint: RunCheckpoint): RunListSummary {
  const stageCount = checkpoint.stages.length;
  const latestSession = latestSessionOf(checkpoint);
  const common = {
    condition: checkpoint.condition,
    updatedAt: checkpoint.updatedAt,
    runId: checkpoint.runId,
    pipelineName: checkpoint.pipelineName,
    threadRelPath: checkpoint.threadRelPath,
    repoRoot: checkpoint.repoRoot,
    ...(latestSession !== undefined ? { latestSession } : {}),
  };

  if (checkpoint.condition === "completed") {
    return {
      ...common,
      stage: { position: stageCount, count: stageCount },
    };
  }

  const stage = checkpoint.stages[checkpoint.stageIndex]!;
  return {
    ...common,
    stage: {
      position: checkpoint.stageIndex + 1,
      count: stageCount,
      id: stage.id,
    },
    currentAgent: {
      harness: stage.binding.agent.harness,
      model: stage.binding.agent.model,
    },
  };
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

  printRunList(
    {
      stdout: deps.stdout,
      stderr: deps.stderr,
      color: deps.color,
    },
    checkpoints.map(summarizeRun),
  );

  return warned ? EXIT_FAILURE : EXIT_OK;
}
