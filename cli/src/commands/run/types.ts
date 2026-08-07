import type { CommandDeps } from "../deps.js";
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
  SnapshottedStage,
} from "../../state/checkpoint/types.js";

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
 * Run-command dependencies: every shared command seam plus the optional
 * candidate-ID generator so a test can force a queue race or ID collision.
 * Identifier generation is absent from `CommandDeps`.
 */
export type RunDeps = CommandDeps & {
  generateId?: () => string;
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
