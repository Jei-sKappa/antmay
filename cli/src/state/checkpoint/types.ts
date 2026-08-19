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
 *
 * A kind whose evidence is not functionally determined by it is two kinds. Both
 * artifact-contract checks therefore name the check that ran and failed apart
 * from the check that could not run at all: the pause is called the same thing
 * either way, and it carries the mismatches in one case and the failed
 * inspection's error text in the other.
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
  | "stage-prerequisite-uninspectable"
  | "stage-contract-unmet"
  | "stage-contract-uninspectable";

/** The evidence a kind that carries none declares: its `message` alone. */
export type NoWaitingEvidence = Record<never, never>;

/**
 * What each waiting kind carries beyond the `message` every kind carries.
 *
 * This is the one statement of the pairing, and `WaitingReason` below is derived
 * from it, so a new kind fails to compile until this table says what it carries
 * and no other module can restate the pairing. A field is required and nullable
 * wherever its absence is a real state rather than a missing key.
 *
 * `contract` holds every artifact-state dimension an artifact-contract check
 * found unmet, with what the contract required and what the thread actually
 * held, so the terminal diagnostic and any later reading of the checkpoint
 * describe the failure without consulting a live pipeline document.
 *
 * `agentReason` is the agent's own text after its outcome token, and
 * `preservationNote` says who owns the uncommitted changes at a refreshed
 * contract violation. They are separate fields because they mean unrelated
 * things, and neither kind may pick up the other's.
 *
 * Diagnostics are deliberately lighter than the rest: `origin` and
 * `errorMessage` are recorded for a later reading of the checkpoint, nothing
 * renders them, and the two shapes have nothing in common beyond being
 * diagnostic, so no type spans them.
 */
export interface WaitingEvidence {
  "outcome-blocked": { agentReason: string | null };
  "outcome-refused": { agentReason: string | null };
  "pending-queues": { pendingFiles: string[] };
  "malformed-outcome": { candidateLine: string | null };
  "harness-error": NoWaitingEvidence;
  "idle-timeout": NoWaitingEvidence;
  interrupted: { origin: string };
  "gate-error": { errorMessage: string };
  "unexpected-head-movement": NoWaitingEvidence;
  "git-policy-violation": NoWaitingEvidence;
  "commit-error": NoWaitingEvidence;
  "stage-prerequisite-unmet": { contract: ArtifactMismatch[] };
  "stage-prerequisite-uninspectable": { errorMessage: string };
  "stage-contract-unmet": {
    contract: ArtifactMismatch[];
    preservationNote: string | null;
  };
  "stage-contract-uninspectable": { errorMessage: string };
}

/**
 * One reason a run stopped, as a union over the kind that names it. Several can
 * hold at once — a stage that reported REFUSED while a pending bundle also awaits
 * resolution stops for both — so a pause records every reason it observed rather
 * than only the one that governs the resume path.
 */
export type WaitingReason = {
  [K in WaitingKind]: { kind: K; message: string } & WaitingEvidence[K];
}[WaitingKind];

/** The one reason of a given kind, for a site that acts per kind. */
export type WaitingReasonOf<K extends WaitingKind> = Extract<
  WaitingReason,
  { kind: K }
>;

/**
 * Every reason one pause stopped for, never empty and ordered by precedence so
 * the most explanatory one reads first. The order is presentation only: what a
 * resume does is decided by the pause's `recovery` alone.
 */
export type WaitingReasons = [WaitingReason, ...WaitingReason[]];

/**
 * Which harness implementation a run contacts. Fixed when the run is allocated
 * and immutable for its whole life, so a later invocation cannot move an
 * existing run between the real provider and the developer's simulated harness.
 */
export type HarnessRuntimeIdentity = { kind: "real" } | { kind: "simulated" };

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
 * The terminal text result of an attempt that reported the advancing outcome.
 * The `done` disposition is named for that verdict, so its arm states it rather
 * than leaving a `done` attempt able to carry any token at all.
 */
export type DoneTerminalResult = TerminalResult & { token: "DONE" };

/**
 * The post-attempt pending-queue observation a settled attempt records.
 *
 * A scan that could not complete is its own case rather than an empty list: an
 * unreadable queue is never an empty one, and the finalization of a saved
 * `DONE` answers the two differently. The unavailable case carries no message,
 * because the scan's failure is reported as the pause's `gate-error` reason.
 */
export type QueueObservation =
  | { kind: "observed"; pendingFiles: string[] }
  | { kind: "unavailable" };

/**
 * What an attempt reports about the failure that stopped it. The kind is the
 * pause vocabulary's, because the attempt records the reason that governs the
 * pause it settled into.
 */
export type AttemptFailure = { kind: WaitingKind; message: string };

/**
 * What every entry in the attempt history carries whatever became of it: which
 * attempt of which stage it is, when and from which tip it was launched, and
 * where its log lives.
 */
export type AttemptIdentity = {
  attempt: number;
  stageIndex: number;
  stageId: string;
  startedAt: string;
  headAtStart: string;
  logPath: string;
  /** Opaque provider session ID when one was captured for this attempt. */
  agentSession?: { id: string };
};

/**
 * What an attempt that reached an ending carries on top of its identity.
 *
 * `headAfterAttempt` is the second of the two `HEAD` observations that bind Git
 * evidence to the attempt that produced it: the tip its settlement left behind
 * — the tip observed once the attempt ended when no boundary was finalized for
 * it, and otherwise the tip the finalization settled its boundary at, that
 * boundary's commit included, whether the run or a later recovery finalized it.
 */
export type AttemptSettlement = {
  endedAt: string;
  headAfterAttempt: string;
  queues: QueueObservation;
};

/**
 * One entry in the ordered attempt history, as a union over the disposition it
 * ended in.
 *
 * Each arm carries exactly what that disposition has. An attempt still
 * executing has reached neither an ending, nor a post-attempt `HEAD`
 * observation, nor a queue observation, and carries none of the three. Both
 * non-DONE dispositions carry the failure that stopped them; a `done` attempt
 * carries the advancing verdict it is named for instead.
 */
export type AttemptRecord =
  | (AttemptIdentity & { result: "executing"; terminalResult: null })
  | (AttemptIdentity &
      AttemptSettlement & {
        result: "done";
        terminalResult: DoneTerminalResult;
      })
  | (AttemptIdentity &
      AttemptSettlement & {
        result: "waiting";
        terminalResult: TerminalResult | null;
        failure: AttemptFailure;
      })
  | (AttemptIdentity &
      AttemptSettlement & {
        result: "interrupted";
        terminalResult: TerminalResult | null;
        failure: AttemptFailure;
      });

/** The attempt a run is holding live, which the checkpoint records as its last. */
export type ExecutingAttemptRecord = Extract<AttemptRecord, { result: "executing" }>;

/**
 * Every attempt that reached an ending. What a recovery names and what a pause
 * describes are both of these, so a caller holding one reads the settlement's
 * own fields without asking whether they are there.
 */
export type SettledAttemptRecord = Exclude<AttemptRecord, { result: "executing" }>;

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
