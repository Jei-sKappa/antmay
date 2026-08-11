import path from "node:path";

import type { ExecutionDisplay } from "../display/types.js";
import { finalizeGitBoundary } from "../gitops/boundary.js";
import { readHead } from "../gitops/status.js";
import type { HarnessInvoker } from "../harness/types.js";
import type { RunCheckpoint, SnapshottedStage } from "../state/checkpoint/types.js";
import { inspectArtifactState } from "../thread/artifacts.js";
import { RunState } from "./run-state.js";
import type { CheckpointWriter } from "./run-state.js";

/**
 * What a command hands the engine, and the context every phase of the engine
 * reads it through.
 *
 * A command's own work ends at allocation or preflight; from there one value
 * carries the whole run. The two builders below are where the injected seams get
 * their defaults and where everything a run is fixed at is derived once, so no
 * phase recomputes a path, a name, or a fallback for itself.
 */

/**
 * How a command hands one run to the engine. `allocated` carries the initial
 * checkpoint `run` just wrote, which is durably `ready` with no history behind
 * it; `resume` carries the checkpoint `resume` validated out of an existing run
 * directory, verbatim and in whatever condition it was found. Both name the same
 * thing to the engine — the starting cursor, whose `stageIndex` is where the loop
 * begins — and the variant is what tells the engine whether the cursor has a
 * durable past to recover from before that loop may start.
 */
export type ExecutionEntry =
  | { kind: "allocated"; checkpoint: RunCheckpoint }
  | { kind: "resume"; checkpoint: RunCheckpoint };

/**
 * The unstable and injected dependencies plus the durable inputs the engine
 * drives one run to a pause or completion from. The caller owns the lock's
 * acquire/release symmetry; the engine never releases it.
 */
export type ExecutionContext = {
  entry: ExecutionEntry;
  runDir: string;
  invoker: HarnessInvoker;
  display: ExecutionDisplay;
  harnessVersions: Record<string, string>;
  signal: AbortSignal;
  clock?: () => Date;
  /**
   * Checkpoint-writing seam the run's cursor persists through. Tests inject a
   * wrapper to control ordering and failure without changing production callers.
   */
  persistCheckpoint?: CheckpointWriter;
  /** Artifact inspector seam for deterministic recovery-path tests. */
  inspectArtifactState?: typeof inspectArtifactState;
  /** Git HEAD reader seam for exercising refusal and recovery paths. */
  readHead?: typeof readHead;
  /** Git-boundary seam for exercising structured finalization failures. */
  finalizeGitBoundary?: typeof finalizeGitBoundary;
};

/**
 * One run in flight: its durable cursor, the collaborators its phases drive, and
 * everything about it that no transition moves.
 *
 * `run` is the only field that changes across a phase. Every other one is
 * resolved at construction, which is what lets a phase state a fact about the
 * run — the repository it observes, the command that resumes it — without
 * deriving it a second time.
 */
export type RunContext = {
  /** The run's durable cursor, and the only way its state changes. */
  readonly run: RunState;
  readonly display: ExecutionDisplay;
  readonly invoker: HarnessInvoker;
  readonly signal: AbortSignal;
  readonly clock: () => Date;
  readonly harnessVersions: Record<string, string>;
  /** The run's own directory, and the checkpoint document inside it. */
  readonly runDir: string;
  readonly checkpointPath: string;
  /** The repository and thread every observation is made against. */
  readonly repoRoot: string;
  readonly threadRelPath: string;
  /** The thread's folder name, which a commit subject renders from. */
  readonly threadFolder: string;
  /** What the run is called, how long its pipeline is, and how it is resumed. */
  readonly runId: string;
  readonly pipelineName: string;
  readonly stageCount: number;
  readonly resumeCommand: string;
  /** The injected observations, defaults already applied. */
  readonly inspectArtifacts: typeof inspectArtifactState;
  readonly readHead: typeof readHead;
  readonly finalizeBoundary: typeof finalizeGitBoundary;
};

/**
 * A run at one cursor position: what a stage-level phase reads. The stage is the
 * snapshot the checkpoint carries, never a live catalog lookup, so a phase reads
 * only what the run was allocated with.
 */
export type StageContext = RunContext & {
  /** Where the cursor sits, as the checkpoint records it. */
  readonly stageIndex: number;
  /** Its one-based position, as a reader and a log path spell it. */
  readonly ordinal: number;
  /** `"2/3"`, as every stage-level display event spells it. */
  readonly stagePosition: string;
  /** The stage's own snapshotted definition. */
  readonly stage: SnapshottedStage;
};

/** The run one command's handoff describes, with every default resolved. */
export function createRunContext(execution: ExecutionContext): RunContext {
  const { checkpoint } = execution.entry;
  const clock = execution.clock ?? (() => new Date());
  return {
    run: new RunState({
      checkpoint,
      runDir: execution.runDir,
      clock,
      persistCheckpoint: execution.persistCheckpoint,
    }),
    display: execution.display,
    invoker: execution.invoker,
    signal: execution.signal,
    clock,
    harnessVersions: execution.harnessVersions,
    runDir: execution.runDir,
    checkpointPath: path.join(execution.runDir, "state.json"),
    repoRoot: checkpoint.repoRoot,
    threadRelPath: checkpoint.threadRelPath,
    threadFolder: path.posix.basename(checkpoint.threadRelPath),
    runId: checkpoint.runId,
    pipelineName: checkpoint.pipelineName,
    stageCount: checkpoint.stages.length,
    resumeCommand: `antmay afk resume ${checkpoint.runId}`,
    inspectArtifacts: execution.inspectArtifactState ?? inspectArtifactState,
    readHead: execution.readHead ?? readHead,
    finalizeBoundary: execution.finalizeGitBoundary ?? finalizeGitBoundary,
  };
}

/**
 * The context of the stage the cursor sits on. The stage arrives as a value the
 * caller already read off the cursor, so a context for a stage the snapshot does
 * not hold cannot be built here at all.
 */
export function stageContext(
  ctx: RunContext,
  stage: SnapshottedStage,
): StageContext {
  const stageIndex = ctx.run.checkpoint.stageIndex;
  const ordinal = stageIndex + 1;
  return {
    ...ctx,
    stageIndex,
    ordinal,
    stagePosition: `${ordinal}/${ctx.stageCount}`,
    stage,
  };
}
