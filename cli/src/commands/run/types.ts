import type { CommandDeps } from "../deps.js";
import type { TemporaryWorkspaceProblems } from "../../gitops/temporary-workspaces.js";
import type { HarnessId } from "../../harness/id.js";
import type { HarnessRuntimeFailure } from "../../harness/runtime.js";
import type { HarnessInvoker } from "../../harness/types.js";
import type {
  CompositionFailure,
  PreparedStage,
} from "../../pipeline/composition.js";
import type { CatalogStageId } from "../../pipeline/types.js";
import type {
  HarnessRuntimeIdentity,
  ProfileSelection,
  RunCheckpoint,
  RunCondition,
  SnapshottedStage,
} from "../../state/checkpoint/types.js";
import type { LockHandle } from "../../state/lock.js";

/**
 * Arguments for `antmay afk run` after CLI parsing.
 */
export type RunArgs = {
  pipeline: string;
  thread: string;
  from?: string;
  profile?: string;
  dangerouslySkipPermissions: boolean;
};

/**
 * How allocation persists the initial `ready` checkpoint. Production uses the
 * atomic writer; tests inject a failing writer without reaching the filesystem
 * seam under it. Absent from `CommandDeps`.
 */
export type RunInitialCheckpointWriter = (
  runDir: string,
  checkpoint: RunCheckpoint,
) => Promise<void>;

/**
 * Run-command dependencies: every shared command seam plus the optional
 * candidate-ID generator so a test can force a queue race or ID collision, and
 * the optional initial-checkpoint writer so a test can force a write failure.
 * Both seams are absent from `CommandDeps`.
 */
export type RunDeps = CommandDeps & {
  generateId?: () => string;
  writeInitialCheckpoint?: RunInitialCheckpointWriter;
};

/**
 * A plain-message preflight refusal. The command writes the message to stderr
 * and selects the failure exit code.
 */
export type RunMessageRefusal = {
  kind: "message";
  message: string;
};

/**
 * A rejected loadable document. Field-level schema problems name no file of
 * their own, so the refusal carries the label and resolved source the command
 * needs to reproduce the existing presentation.
 */
export type RunRejectedDocumentRefusal = {
  kind: "rejected-document";
  label: string;
  sourcePath: string;
  errors: string[];
};

/**
 * Inert refusal facts for run preflight. No renderer callback or exit code —
 * presentation and exit selection stay in `runCommand`.
 */
export type RunPreflightRefusal = RunMessageRefusal | RunRejectedDocumentRefusal;

/**
 * Typed success or inert refusal from a run preflight step.
 */
export type RunPreflightResult<T> =
  | ({ ok: true } & T)
  | { ok: false; refusal: RunPreflightRefusal };

/**
 * Pipeline composition for a new run: the prepared selected suffix, or the
 * structured composition failure the command renders.
 */
export type RunCompositionResult =
  | { ok: true; stages: PreparedStage[] }
  | { ok: false; failure: CompositionFailure };

/**
 * Immutable stage snapshots for a new run: selected stages with bindings,
 * profile selection, and the optional entry point recorded at allocation.
 */
export type RunStageSnapshot = {
  stages: SnapshottedStage[];
  profileSelection: ProfileSelection;
  fromStage: CatalogStageId | null;
};

/**
 * Binding resolution and stage snapshotting: the immutable facts, or an inert
 * refusal when a selected stage has no complete local binding.
 */
export type RunStageSnapshotResult = RunPreflightResult<RunStageSnapshot>;

/**
 * Resolved harness runtime for a new run: identity, invoker, observed versions,
 * the non-empty process-local version map, and optional scripted scenario path.
 */
export type RunResolvedRuntime = {
  runtime: HarnessRuntimeIdentity;
  invoker: HarnessInvoker;
  observedHarnessVersions: Partial<Record<HarnessId, string>>;
  harnessVersions: Record<string, string>;
  scenarioPath?: string;
};

/**
 * Runtime resolution for a new run: the resolved facts, or the structured
 * harness-runtime failure the command renders.
 */
export type RunRuntimeResult =
  | ({ ok: true } & RunResolvedRuntime)
  | { ok: false; failure: HarnessRuntimeFailure };

/**
 * Temporary-workspace Git safety for a new run. Unsafe problems stay structured
 * for the rich refusal renderer; an inspection error is a plain diagnostic.
 */
export type RunTemporaryWorkspaceResult =
  | { ok: true }
  | { ok: false; kind: "inspection-error"; message: string }
  | { ok: false; kind: "unsafe"; problems: TemporaryWorkspaceProblems };

/**
 * Clean-worktree gate for a new run: success, or an inert refusal when
 * inspection fails or the tree is dirty.
 */
export type RunCleanWorktreeResult =
  | { ok: true }
  | { ok: false; refusal: RunPreflightRefusal };

/**
 * Pending-queue scan for a new run: repository-relative pending paths on
 * success, or a scan-failure diagnostic. Emptiness and exit selection stay
 * with the command.
 */
export type RunPendingQueuesResult =
  | { ok: true; pendingFiles: string[] }
  | { ok: false; message: string };

/**
 * An unreadable sibling checkpoint the unfinished-run scan skipped. The
 * command prints the warning and continues.
 */
export type RunUnreadableCheckpointWarning = {
  runDir: string;
  errors: string[];
};

/**
 * A non-completed checkpoint for the same workspace and thread.
 */
export type RunUnfinishedRunMatch = {
  runId: string;
  condition: Exclude<RunCondition, "completed">;
  runDir: string;
};

/**
 * Sibling unfinished-run scan: warnings for unreadable checkpoints, a matching
 * unfinished run, or a runs-directory scan failure.
 */
export type RunUnfinishedRunResult =
  | { ok: true; warnings: RunUnreadableCheckpointWarning[] }
  | { ok: false; kind: "scan-error"; message: string }
  | {
      ok: false;
      kind: "unfinished";
      match: RunUnfinishedRunMatch;
      warnings: RunUnreadableCheckpointWarning[];
    };

/**
 * Prepared facts the allocation transaction needs after every preflight gate
 * has passed. Clock and ID generation carry production defaults inside
 * `allocateRun` when omitted from `RunDeps`.
 */
export type RunAllocationInput = {
  stateRoot: string;
  repoRoot: string;
  threadRelPath: string;
  dangerouslySkipPermissions: boolean;
  pipelineName: string;
  pipelineSourcePath: string;
  profileSelection: ProfileSelection;
  fromStage: CatalogStageId | null;
  stages: SnapshottedStage[];
  observedHarnessVersions: Partial<Record<HarnessId, string>>;
  runtime: HarnessRuntimeIdentity;
  clock: () => Date;
  generateId?: () => string;
  writeInitialCheckpoint?: RunInitialCheckpointWriter;
};

/**
 * Successful allocation: the durable run directory, the exact persisted initial
 * checkpoint, and the still-held workspace lock whose release ownership
 * transfers to `runCommand`.
 */
export type RunAllocationSuccess = {
  runDir: string;
  checkpoint: RunCheckpoint;
  lock: LockHandle;
};

/**
 * Structured allocation refusal. No exit code or renderer — presentation and
 * exit selection stay in `runCommand`.
 */
export type RunAllocationRefusal =
  | {
      kind: "lock-contention";
      lockPath: string;
      existingRecord: string;
    }
  | { kind: "queue-scan-error"; message: string }
  | { kind: "pending-files"; pendingFiles: string[] }
  | {
      kind: "checkpoint-write-failed";
      runDir: string;
      message: string;
    };

/**
 * Allocation transaction result: success with held lock, or an inert refusal.
 */
export type RunAllocationResult =
  | ({ ok: true } & RunAllocationSuccess)
  | { ok: false; refusal: RunAllocationRefusal };
