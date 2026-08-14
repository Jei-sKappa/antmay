/**
 * The durable checkpoint vocabulary: the `state.json` document a run persists,
 * every value it is assembled from, and the outcome of validating one.
 *
 * It declares and does nothing — only `import type` statements and exported
 * declarations — so a command, a display renderer, an execution phase, and the
 * validator all state their dependency on the document's shape without loading
 * anything. Nothing here reaches the execution or display domains: the document
 * is what they are written in terms of, not the other way round.
 */

import type { ResolvedStageBinding } from "../../config/binding/types.js";
import type { HarnessId } from "../../harness/id.js";
import type { CatalogStage } from "../../pipeline/catalog.js";
import type { CatalogStageId } from "../../pipeline/stage-id.js";
import type { TerminalOutcome } from "../../runner/outcome.js";
import type { ArtifactMismatch } from "../../thread/artifacts.js";
import type { WorkspaceConfig } from "../../workspace/types.js";

/**
 * The run's high-level condition. `ready` sits between stages, `executing`
 * means a harness attempt is live, `waiting-for-user` is a durable pause, and
 * `completed` is terminal.
 */
export type RunCondition = "ready" | "executing" | "waiting-for-user" | "completed";

/**
 * The disposition of a single attempt: `executing` while live, `done` for a
 * DONE-finalized stage, `waiting` for any non-DONE pause, and `interrupted`
 * for a signal- or recovery-abandoned attempt.
 */
export type AttemptResult = "executing" | "done" | "waiting" | "interrupted";

/**
 * The closed set of reasons a run pauses in `waiting-for-user`.
 */
export type WaitingKind =
  | "outcome-blocked"
  | "outcome-refused"
  | "pending-queues"
  | "malformed-outcome"
  | "harness-error"
  | "idle-timeout"
  | "interrupted"
  | "gate-error"
  | "unexpected-head-movement"
  | "git-policy-violation"
  | "commit-error"
  | "stage-prerequisite-unmet"
  | "stage-contract-violation";

/**
 * Structured harness/gate diagnostics about the reason that carries them. They
 * are recorded for later inspection of the checkpoint and are never rendered.
 */
export type WaitingDiagnostics = {
  errorClass?: string;
  errorMessage?: string;
  origin?: string;
};

/**
 * One reason a run stopped. Several can hold at once — a stage that reported
 * REFUSED while a pending bundle also awaits resolution stops for both — so a
 * pause records every reason it observed rather than only the one that governs
 * the resume path.
 */
export type WaitingReason = {
  kind: WaitingKind;
  message: string;
  detail?: string;
  pendingFiles?: string[];
  candidateLine?: string;
  diagnostics?: WaitingDiagnostics;
  /**
   * Every artifact-state dimension an artifact-contract check found unmet, with
   * what the stage's contract required and what the thread actually held. It is
   * recorded so the terminal diagnostic and any later reading of the checkpoint
   * describe the failure without consulting a live pipeline document.
   */
  contract?: ArtifactMismatch[];
};

/**
 * Every reason one pause stopped for, never empty and ordered by precedence so
 * the most explanatory one reads first. The order is presentation only: what a
 * resume does is decided by the pause's `recovery` alone.
 */
export type WaitingReasons = [WaitingReason, ...WaitingReason[]];

/**
 * Which harness implementation a run contacts. Fixed when the run is allocated
 * and immutable for its whole life, so a later invocation cannot move an
 * existing run between the real provider and the developer's scripted harness.
 */
export type HarnessRuntimeIdentity = { kind: "real" } | { kind: "scripted" };

/**
 * One exact attempt in the history: the stage it belongs to and its one-based
 * number within that stage. Both halves are required, so a recovery can never
 * be satisfied by "whichever attempt happens to be last".
 */
export type AttemptReference = { stageIndex: number; attempt: number };

/**
 * What resume does with a paused run. Exactly one variant is recorded on every
 * pause, and it is the only thing a recovery is selected from.
 *
 * - `retry-stage` launches a new attempt at the current stage once the
 *   applicable gates pass. It claims nothing about any earlier attempt.
 * - `resume-finalized-done` names an attempt that is already finalized `done`
 *   and carries the queue resolution its stage declared, so releasing the queue
 *   applies that resolution without touching the attempt again.
 * - `recheck-stage-contract` names a `DONE` attempt whose promised artifact
 *   state was not accepted. Reinspecting the promise is what chooses between
 *   finalizing it, retrying the stage, and staying paused.
 * - `retry-git-finalization` names a `DONE` attempt whose promise already holds
 *   and whose Git boundary still has to succeed; it retries that boundary
 *   without invoking the harness.
 *
 * `pausedAtHead` is the pause's own latest `HEAD` observation. The two variants
 * that may finalize a boundary after a human worked across the pause carry it,
 * because they alone need to tell that movement apart from the attempt's own;
 * the other two must not, having nothing to measure it against.
 */
export type WaitingRecovery =
  | { kind: "retry-stage" }
  | {
      kind: "resume-finalized-done";
      attempt: AttemptReference;
      queueResolution: "advance" | "rerun";
    }
  | {
      kind: "recheck-stage-contract";
      attempt: AttemptReference;
      pausedAtHead: string;
    }
  | {
      kind: "retry-git-finalization";
      attempt: AttemptReference;
      pausedAtHead: string;
    };

/**
 * The single waiting object a `waiting-for-user` checkpoint carries. `reasons`
 * explains everything observed at the pause, `recovery` states what resume may
 * do about it, and `nextAction` is the one instruction that belongs to the run
 * as a whole rather than to any single reason.
 */
export type WaitingInfo = {
  reasons: WaitingReasons;
  recovery: WaitingRecovery;
  nextAction?: string;
};

/**
 * The parsed terminal text result of an attempt. `token` is the recognized
 * `Outcome:` token, or `null` when a candidate line was seen but no token
 * parsed. `terminalResult` on the attempt is itself `null` only before any
 * terminal text has returned.
 */
export type TerminalResult = {
  token: TerminalOutcome | null;
  candidateLine: string | null;
  detail: string;
};

/**
 * One entry in the ordered attempt history.
 *
 * The two `HEAD` observations bind Git evidence to the attempt that produced it:
 * `headAtStart` is the tip the attempt was launched from, and
 * `headAfterAttempt` the tip its settlement left behind — the tip observed once
 * the attempt ended when no boundary was finalized for it, and otherwise the
 * tip the finalization settled its boundary at, that boundary's commit
 * included, whether the run or a later recovery finalized it. An attempt still
 * executing has not reached its second observation yet and carries none.
 */
export type AttemptRecord = {
  attempt: number;
  stageIndex: number;
  stageId: string;
  startedAt: string;
  endedAt?: string;
  result: AttemptResult;
  terminalResult: TerminalResult | null;
  pendingFiles?: string[];
  failure?: { kind: string; message: string };
  /** Opaque provider session ID when one was captured for this attempt. */
  agentSession?: { id: string };
  headAtStart: string;
  headAfterAttempt?: string;
  logPath: string;
};

/**
 * An immutable snapshot of one selected stage: the complete catalog descriptor
 * with its artifact contract, the concrete repository-relative target
 * composition settled on, the pipeline entry's portable instructions when it
 * carried any, and the fully resolved local execution binding.
 *
 * Everything an attempt and its recovery need is here, so resume rereads no
 * pipeline, execution-profile, or settings document.
 */
export type SnapshottedStage = CatalogStage & {
  resolvedTarget: string;
  instructions?: string;
  binding: ResolvedStageBinding;
};

/**
 * Which local document supplied the run's stage bindings: an execution profile
 * selected by reference, carrying its declared name and resolved source
 * provenance, or the settings file alone.
 */
export type ProfileSelection =
  | { kind: "settings-only" }
  | { kind: "profile"; name: string; sourcePath: string };

/**
 * The full `state.json` document at `schemaVersion: 0`.
 *
 * `pipelineName` is the pipeline document's declared identity and
 * `pipelineSourcePath` the absolute source it was read from; the two are
 * independent, because moving the file changes the provenance and not the
 * identity. `fromStage` is present only when the invocation named an entry
 * point, and `stages` holds exactly the selected suffix.
 */
export type RunCheckpoint = {
  schemaVersion: 0;
  runId: string;
  executor: { pid: number; version: string };
  createdAt: string;
  updatedAt: string;
  repoRoot: string;
  threadRelPath: string;
  workspace: WorkspaceConfig;
  dangerouslySkipPermissions: boolean;
  pipelineName: string;
  pipelineSourcePath: string;
  profileSelection: ProfileSelection;
  fromStage?: CatalogStageId;
  stages: SnapshottedStage[];
  observedHarnessVersions: Partial<Record<HarnessId, string>>;
  runtime: HarnessRuntimeIdentity;
  stageIndex: number;
  condition: RunCondition;
  attempts: AttemptRecord[];
  waiting: WaitingInfo | null;
};

/**
 * The outcome of validating an untrusted checkpoint document.
 */
export type CheckpointResult =
  | { ok: true; checkpoint: RunCheckpoint }
  | { ok: false; errors: string[] };
