import { promises as fs } from "node:fs";
import path from "node:path";

import { HARNESS_IDS } from "../config/execution.js";
import type { HarnessId, ResolvedStageBinding } from "../config/execution.js";
import { isCatalogStageId } from "../pipeline/catalog.js";
import type { CatalogStage } from "../pipeline/catalog.js";
import type { CatalogStageId } from "../pipeline/types.js";
import { isPlainObject } from "../shared/validation.js";
import {
  validateSerializedArtifactMismatches,
  validateSerializedArtifactPattern,
} from "../thread/artifacts.js";
import type { ArtifactMismatch } from "../thread/artifacts.js";
import type { WorkspaceConfig } from "../workspace/types.js";

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
 * The instruction every non-DONE and boundary pause carries: the attempt's file
 * changes never passed the terminal-outcome gate, so a human must dispose of
 * them deliberately before the stage runs again.
 */
export const UNVALIDATED_CHANGES_NOTE =
  "The attempt's file changes are unvalidated: revert them or deliberately " +
  "commit them before resuming.";

/**
 * The instruction a `stage-contract-violation` pause carries. The attempt
 * reported `DONE` without leaving the artifact state its stage promises, so the
 * human chooses which of the two recoveries resume takes: repairing the
 * artifact finalizes the completed attempt, and reverting its changes runs the
 * stage again.
 */
export const CONTRACT_REPAIR_NOTE =
  "Repair the promised artifact and resume to finalize the completed attempt, " +
  "or revert the attempt's unvalidated changes and resume to run the stage again.";

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
  token: "DONE" | "BLOCKED" | "REFUSED" | null;
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

const RUN_CONDITIONS: ReadonlySet<string> = new Set<RunCondition>([
  "ready",
  "executing",
  "waiting-for-user",
  "completed",
]);

const ATTEMPT_RESULTS: ReadonlySet<string> = new Set<AttemptResult>([
  "executing",
  "done",
  "waiting",
  "interrupted",
]);

const WAITING_KINDS: ReadonlySet<string> = new Set<WaitingKind>([
  "outcome-blocked",
  "outcome-refused",
  "pending-queues",
  "malformed-outcome",
  "harness-error",
  "idle-timeout",
  "interrupted",
  "gate-error",
  "unexpected-head-movement",
  "git-policy-violation",
  "commit-error",
  "stage-prerequisite-unmet",
  "stage-contract-violation",
]);

const TERMINAL_TOKENS: ReadonlySet<string> = new Set([
  "DONE",
  "BLOCKED",
  "REFUSED",
]);

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isIsoUtc(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_UTC.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isAbsoluteHostPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    path.isAbsolute(value) &&
    path.normalize(value) === value
  );
}

/**
 * A non-empty, normalized, relative POSIX path (no drive, no `\`, no `..`
 * ascent, no `.` segments, no trailing slash, no `//`).
 */
function isNormalizedRelPosix(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("\\")) return false;
  if (path.posix.isAbsolute(value)) return false;
  if (value === ".." || value.startsWith("../")) return false;
  if (value.endsWith("/")) return false;
  return path.posix.normalize(value) === value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * A resolved stage target without its directory marker. A thread-root target
 * resolves to the thread path with one trailing slash, so the marker is dropped
 * before the shared relative-path check runs.
 */
function stripTrailingSlash(value: unknown): unknown {
  return typeof value === "string" && value.endsWith("/")
    ? value.slice(0, -1)
    : value;
}

function validateStageTarget(value: unknown, label: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  const kind = value.kind;
  if (kind === "thread-root") {
    return;
  }
  if (kind === "thread-file") {
    if (!isNormalizedRelPosix(value.path)) {
      errors.push(`${label}.path must be a normalized relative POSIX path.`);
    }
    return;
  }
  errors.push(`${label}.kind must be "thread-root" or "thread-file".`);
}

function validatePathSelector(value: unknown, label: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (value.kind !== "exact-file" && value.kind !== "subtree") {
    errors.push(`${label}.kind must be "exact-file" or "subtree".`);
  }
  if (!isNormalizedRelPosix(value.threadRelativePath)) {
    errors.push(
      `${label}.threadRelativePath must be a normalized relative POSIX path.`,
    );
  }
}

function validateGitPolicy(value: unknown, label: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (typeof value.headMayChange !== "boolean") {
    errors.push(`${label}.headMayChange must be a boolean.`);
  }
  if (!Array.isArray(value.allowedChanges)) {
    errors.push(`${label}.allowedChanges must be an array.`);
  } else {
    value.allowedChanges.forEach((selector, i) =>
      validatePathSelector(selector, `${label}.allowedChanges[${i}]`, errors),
    );
  }
  if (typeof value.changeRequired !== "boolean") {
    errors.push(`${label}.changeRequired must be a boolean.`);
  }
  const template = value.commitSubjectTemplate;
  if (template !== null && typeof template !== "string") {
    errors.push(`${label}.commitSubjectTemplate must be a string or null.`);
  }
}

/**
 * Validate a snapshotted stage's fully resolved local binding: the atomic
 * harness/model agent pair and both settled timing values.
 */
function validateStageBinding(value: unknown, label: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  const agent = value.agent;
  if (!isPlainObject(agent)) {
    errors.push(`${label}.agent must be an object.`);
  } else {
    if (typeof agent.harness !== "string" || !HARNESS_IDS.includes(agent.harness)) {
      errors.push(`${label}.agent.harness must be a known harness id.`);
    }
    if (!isNonEmptyString(agent.model)) {
      errors.push(`${label}.agent.model must be a non-empty string.`);
    }
  }
  const idle = value.idleTimeoutSeconds;
  if (typeof idle !== "number" || !Number.isInteger(idle) || idle <= 0) {
    errors.push(`${label}.idleTimeoutSeconds must be a positive integer.`);
  }
  const heartbeat = value.heartbeatSeconds;
  if (
    typeof heartbeat !== "number" ||
    !Number.isInteger(heartbeat) ||
    heartbeat <= 0
  ) {
    errors.push(`${label}.heartbeatSeconds must be a positive integer.`);
  }
}

/**
 * Validate one declarative target rule: `fixed` names one target, and
 * `when-spec-present` names the target for each branch of the spec dimension.
 */
function validateTargetRule(value: unknown, label: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (value.kind === "fixed") {
    validateStageTarget(value.target, `${label}.target`, errors);
    return;
  }
  if (value.kind === "when-spec-present") {
    validateStageTarget(value.whenPresent, `${label}.whenPresent`, errors);
    validateStageTarget(value.otherwise, `${label}.otherwise`, errors);
    return;
  }
  errors.push(`${label}.kind must be "fixed" or "when-spec-present".`);
}

/**
 * Validate one snapshotted stage: its catalog descriptor and artifact contract,
 * the concrete resolved target, the optional portable instructions, and the
 * resolved local binding. Returns the stage id and bound harness when
 * structurally sound enough for cross-field checks, else `undefined`.
 */
function validateStage(
  value: unknown,
  label: string,
  errors: string[],
): { id: string; harness: string } | undefined {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return undefined;
  }
  let id: string | undefined;
  // Naming a catalog stage is the whole of what the id has to do: the rest of
  // the snapshotted descriptor is validated for shape alone and never compared
  // with the catalog's current entry for that id. Deliberately so — it is what
  // lets the generic runner be proven pipeline-agnostic with synthetic fixtures,
  // which snapshot target rules, prerequisites, promises, and Git policies no
  // catalog entry carries and drive the runner through contracts the catalog
  // never offers. Comparing the descriptor would reject every such checkpoint
  // and take that coverage with it.
  if (typeof value.id !== "string" || !isCatalogStageId(value.id)) {
    errors.push(`${label}.id must name a catalog stage.`);
  } else {
    id = value.id;
  }
  if (!isNonEmptyString(value.skill)) {
    errors.push(`${label}.skill must be a non-empty string.`);
  }
  validateTargetRule(value.targetRule, `${label}.targetRule`, errors);
  errors.push(
    ...validateSerializedArtifactPattern(
      value.prerequisite,
      `${label}.prerequisite`,
    ),
    ...validateSerializedArtifactPattern(value.promises, `${label}.promises`),
  );
  validateGitPolicy(value.gitPolicy, `${label}.gitPolicy`, errors);
  if (value.queueResolution !== "advance" && value.queueResolution !== "rerun") {
    errors.push(`${label}.queueResolution must be "advance" or "rerun".`);
  }
  if (!isNormalizedRelPosix(stripTrailingSlash(value.resolvedTarget))) {
    errors.push(
      `${label}.resolvedTarget must be a normalized repository-relative POSIX path.`,
    );
  }
  if (value.instructions !== undefined && !isNonEmptyString(value.instructions)) {
    errors.push(`${label}.instructions must be a non-empty string when present.`);
  }
  validateStageBinding(value.binding, `${label}.binding`, errors);
  const harness =
    isPlainObject(value.binding) &&
    isPlainObject(value.binding.agent) &&
    typeof value.binding.agent.harness === "string"
      ? value.binding.agent.harness
      : undefined;
  if (id === undefined || harness === undefined) return undefined;
  return { id, harness };
}

function validateTerminalResult(value: unknown, label: string, errors: string[]): void {
  if (value === null) return;
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object or null.`);
    return;
  }
  const token = value.token;
  if (token !== null && (typeof token !== "string" || !TERMINAL_TOKENS.has(token))) {
    errors.push(`${label}.token must be DONE, BLOCKED, REFUSED, or null.`);
  }
  const candidate = value.candidateLine;
  if (candidate !== null && typeof candidate !== "string") {
    errors.push(`${label}.candidateLine must be a string or null.`);
  }
  if (typeof value.detail !== "string") {
    errors.push(`${label}.detail must be a string.`);
  }
}

function validateSortedUniquePending(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  let allPaths = true;
  value.forEach((entry, i) => {
    if (!isNormalizedRelPosix(entry)) {
      errors.push(`${label}[${i}] must be a normalized relative POSIX path.`);
      allPaths = false;
    }
  });
  if (!allPaths) return;
  for (let i = 1; i < value.length; i += 1) {
    if (value[i - 1] === value[i]) {
      errors.push(`${label} must not contain duplicate paths (${value[i]}).`);
      return;
    }
    if (value[i - 1] > value[i]) {
      errors.push(`${label} must be lexically sorted.`);
      return;
    }
  }
}

function validateAttempt(value: unknown, label: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (
    typeof value.attempt !== "number" ||
    !Number.isInteger(value.attempt) ||
    value.attempt <= 0
  ) {
    errors.push(`${label}.attempt must be a positive integer.`);
  }
  if (
    typeof value.stageIndex !== "number" ||
    !Number.isInteger(value.stageIndex) ||
    value.stageIndex < 0
  ) {
    errors.push(`${label}.stageIndex must be a non-negative integer.`);
  }
  if (!isNonEmptyString(value.stageId)) {
    errors.push(`${label}.stageId must be a non-empty string.`);
  }
  if (!isIsoUtc(value.startedAt)) {
    errors.push(`${label}.startedAt must be an ISO-8601 UTC timestamp.`);
  }
  if (value.endedAt !== undefined && !isIsoUtc(value.endedAt)) {
    errors.push(`${label}.endedAt must be an ISO-8601 UTC timestamp.`);
  }
  if (typeof value.result !== "string" || !ATTEMPT_RESULTS.has(value.result)) {
    errors.push(`${label}.result must be a known attempt result.`);
  }
  if (!("terminalResult" in value)) {
    errors.push(`${label}.terminalResult is required (object or null).`);
  } else {
    validateTerminalResult(value.terminalResult, `${label}.terminalResult`, errors);
  }
  if (value.pendingFiles !== undefined) {
    validateSortedUniquePending(value.pendingFiles, `${label}.pendingFiles`, errors);
  }
  if (value.failure !== undefined) {
    if (!isPlainObject(value.failure)) {
      errors.push(`${label}.failure must be an object.`);
    } else {
      if (!isNonEmptyString(value.failure.kind)) {
        errors.push(`${label}.failure.kind must be a non-empty string.`);
      }
      if (typeof value.failure.message !== "string") {
        errors.push(`${label}.failure.message must be a string.`);
      }
    }
  }
  if (value.agentSession !== undefined) {
    if (!isPlainObject(value.agentSession)) {
      errors.push(`${label}.agentSession must be an object.`);
    } else if (!isNonEmptyString(value.agentSession.id)) {
      errors.push(`${label}.agentSession.id must be a non-empty string.`);
    }
  }
  if (!isNonEmptyString(value.headAtStart)) {
    errors.push(`${label}.headAtStart must be a commit string.`);
  }
  if (value.result === "executing") {
    if (value.headAfterAttempt !== undefined) {
      errors.push(
        `${label}.headAfterAttempt is not permitted while the attempt is executing.`,
      );
    }
  } else if (!isNonEmptyString(value.headAfterAttempt)) {
    errors.push(
      `${label}.headAfterAttempt must be a commit string on a settled attempt.`,
    );
  }
  if (!isNormalizedRelPosix(value.logPath)) {
    errors.push(`${label}.logPath must be a normalized run-relative POSIX path.`);
  }
}

function validateAttemptReference(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object naming a stage index and attempt.`);
    return;
  }
  validateAllowedKeys(value, label, ["stageIndex", "attempt"], errors);
  if (
    typeof value.stageIndex !== "number" ||
    !Number.isInteger(value.stageIndex) ||
    value.stageIndex < 0
  ) {
    errors.push(`${label}.stageIndex must be a non-negative integer.`);
  }
  if (
    typeof value.attempt !== "number" ||
    !Number.isInteger(value.attempt) ||
    value.attempt <= 0
  ) {
    errors.push(`${label}.attempt must be a positive integer.`);
  }
}

/** Reject every object key outside one closed serialized shape. */
function validateAllowedKeys(
  value: Record<string, unknown>,
  label: string,
  allowed: readonly string[],
  errors: string[],
  context?: string,
): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (allowedKeys.has(key)) continue;
    errors.push(
      `${label}.${key} is not permitted${context === undefined ? "" : ` ${context}`}.`,
    );
  }
}

/**
 * Validate the pause's recovery value for shape alone: its kind, and for each
 * kind exactly the evidence that kind acts on — no more and no less. Which
 * attempt the reference resolves to is a cross-field question, checked once the
 * attempt history itself is known to be sound.
 */
function validateWaitingRecovery(value: unknown, errors: string[]): void {
  const label = "waiting.recovery";
  if (!isPlainObject(value)) {
    errors.push(`${label} is required and must be an object.`);
    return;
  }
  const kind = value.kind;
  const requireReference = (): void => {
    if (value.attempt === undefined) {
      errors.push(`${label}.attempt is required on a "${String(kind)}" recovery.`);
      return;
    }
    validateAttemptReference(value.attempt, `${label}.attempt`, errors);
  };
  const requireExactKeys = (allowed: readonly string[]): void => {
    validateAllowedKeys(
      value,
      label,
      allowed,
      errors,
      `on a "${String(kind)}" recovery`,
    );
  };

  if (kind === "retry-stage") {
    requireExactKeys(["kind"]);
    return;
  }
  if (kind === "resume-finalized-done") {
    requireExactKeys(["kind", "attempt", "queueResolution"]);
    requireReference();
    if (value.queueResolution !== "advance" && value.queueResolution !== "rerun") {
      errors.push(`${label}.queueResolution must be "advance" or "rerun".`);
    }
    return;
  }
  if (kind === "recheck-stage-contract" || kind === "retry-git-finalization") {
    requireExactKeys(["kind", "attempt", "pausedAtHead"]);
    requireReference();
    if (!isNonEmptyString(value.pausedAtHead)) {
      errors.push(
        `${label}.pausedAtHead must be a commit string on a "${kind}" recovery.`,
      );
    }
    return;
  }
  validateAllowedKeys(value, label, ["kind"], errors, "on an unknown recovery");
  errors.push(`${label}.kind must be a known waiting recovery kind.`);
}

/**
 * Validate the recorded reason list. It must be non-empty — a pause always has
 * something to explain — and each entry must name a known kind and carry a
 * complete message.
 */
function validateWaitingReasons(value: unknown, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`waiting.reasons must be a non-empty array.`);
    return;
  }
  value.forEach((entry, index) => {
    const label = `waiting.reasons[${index}]`;
    if (!isPlainObject(entry)) {
      errors.push(`${label} must be an object.`);
      return;
    }
    if (typeof entry.kind !== "string" || !WAITING_KINDS.has(entry.kind)) {
      errors.push(`${label}.kind must be a known waiting kind.`);
    }
    if (!isNonEmptyString(entry.message)) {
      errors.push(`${label}.message must be a non-empty string.`);
    }
    if (entry.detail !== undefined && !isNonEmptyString(entry.detail)) {
      errors.push(`${label}.detail must be a non-empty string.`);
    }
    if (entry.pendingFiles !== undefined) {
      validateSortedUniquePending(entry.pendingFiles, `${label}.pendingFiles`, errors);
    }
    if (entry.candidateLine !== undefined && typeof entry.candidateLine !== "string") {
      errors.push(`${label}.candidateLine must be a string.`);
    }
    if (entry.contract !== undefined) {
      errors.push(
        ...validateSerializedArtifactMismatches(
          entry.contract,
          `${label}.contract`,
        ),
      );
    }
    if (entry.diagnostics !== undefined) {
      const d = entry.diagnostics;
      if (!isPlainObject(d)) {
        errors.push(`${label}.diagnostics must be an object.`);
      } else {
        for (const key of ["errorClass", "errorMessage", "origin"] as const) {
          if (d[key] !== undefined && typeof d[key] !== "string") {
            errors.push(`${label}.diagnostics.${key} must be a string.`);
          }
        }
      }
    }
  });
}

function validateWaiting(value: unknown, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`waiting object must be an object.`);
    return;
  }
  if (value.nextAction !== undefined && !isNonEmptyString(value.nextAction)) {
    errors.push(`waiting.nextAction must be a non-empty string.`);
  }
  validateWaitingReasons(value.reasons, errors);
  validateWaitingRecovery(value.recovery, errors);
}

/**
 * Validate the run's harness runtime identity. It is required on every
 * checkpoint and has exactly two legal meanings, so an unrecognized or absent
 * one is rejected rather than defaulted.
 */
function validateRuntime(value: unknown, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`runtime is required and must be an object.`);
    return;
  }
  if (value.kind !== "real" && value.kind !== "scripted") {
    errors.push(`runtime.kind must be "real" or "scripted".`);
  }
}

/**
 * Validate the recorded profile selection: either the settings-only selection,
 * which carries nothing further, or a selected profile with both its declared
 * name and its resolved source provenance.
 */
function validateProfileSelection(value: unknown, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`profileSelection must be an object.`);
    return;
  }
  if (value.kind === "settings-only") {
    return;
  }
  if (value.kind !== "profile") {
    errors.push(`profileSelection.kind must be "settings-only" or "profile".`);
    return;
  }
  if (!isNonEmptyString(value.name)) {
    errors.push(`profileSelection.name must be a non-empty string.`);
  }
  if (!isAbsoluteHostPath(value.sourcePath)) {
    errors.push(
      `profileSelection.sourcePath must be a normalized absolute host path.`,
    );
  }
}

function validateWorkspace(value: unknown, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`workspace must be an object.`);
    return;
  }
  if (value.strategy !== "current-checkout") {
    errors.push(`workspace.strategy must be "current-checkout".`);
  }
  if (!isAbsoluteHostPath(value.path)) {
    errors.push(`workspace.path must be a normalized absolute host path.`);
  }
  const exec = value.execution;
  if (!isPlainObject(exec)) {
    errors.push(`workspace.execution must be an object.`);
    return;
  }
  if (!isAbsoluteHostPath(exec.cwd)) {
    errors.push(`workspace.execution.cwd must be a normalized absolute host path.`);
  }
  if (exec.sandbox !== "none") {
    errors.push(`workspace.execution.sandbox must be "none".`);
  }
  if (exec.branchStrategy !== "head") {
    errors.push(`workspace.execution.branchStrategy must be "head".`);
  }
}

/**
 * Validate an untrusted document against the `schemaVersion: 0` checkpoint
 * schema. Reports every field-shape and cross-field invariant problem at once.
 * An unknown `schemaVersion` is a distinct clear error; no migration is
 * attempted.
 */
export function validateCheckpoint(doc: unknown): CheckpointResult {
  const errors: string[] = [];

  if (!isPlainObject(doc)) {
    return { ok: false, errors: ["The checkpoint document root must be an object."] };
  }

  if (!("schemaVersion" in doc)) {
    errors.push(`schemaVersion is required and must be 0.`);
  } else if (doc.schemaVersion !== 0) {
    errors.push(
      `Unsupported schemaVersion ${JSON.stringify(doc.schemaVersion)}; this executor only reads schemaVersion 0 and performs no migration.`,
    );
  }

  if (!isNonEmptyString(doc.runId)) {
    errors.push(`runId must be a non-empty string.`);
  }

  if (!isPlainObject(doc.executor)) {
    errors.push(`executor must be an object.`);
  } else {
    if (
      typeof doc.executor.pid !== "number" ||
      !Number.isInteger(doc.executor.pid)
    ) {
      errors.push(`executor.pid must be an integer.`);
    }
    if (!isNonEmptyString(doc.executor.version)) {
      errors.push(`executor.version must be a non-empty string.`);
    }
  }

  if (!isIsoUtc(doc.createdAt)) {
    errors.push(`createdAt must be an ISO-8601 UTC timestamp.`);
  }
  if (!isIsoUtc(doc.updatedAt)) {
    errors.push(`updatedAt must be an ISO-8601 UTC timestamp.`);
  }
  if (!isAbsoluteHostPath(doc.repoRoot)) {
    errors.push(`repoRoot must be a normalized absolute host path.`);
  }
  if (!isNormalizedRelPosix(doc.threadRelPath)) {
    errors.push(`threadRelPath must be a normalized relative POSIX path.`);
  }

  validateWorkspace(doc.workspace, errors);

  if (typeof doc.dangerouslySkipPermissions !== "boolean") {
    errors.push(`dangerouslySkipPermissions must be a boolean.`);
  }
  if (!isNonEmptyString(doc.pipelineName)) {
    errors.push(`pipelineName must be a non-empty string.`);
  }
  if (!isAbsoluteHostPath(doc.pipelineSourcePath)) {
    errors.push(`pipelineSourcePath must be a normalized absolute host path.`);
  }
  validateProfileSelection(doc.profileSelection, errors);
  if (
    doc.fromStage !== undefined &&
    (typeof doc.fromStage !== "string" || !isCatalogStageId(doc.fromStage))
  ) {
    errors.push(`fromStage must name a catalog stage when present.`);
  }

  const stageInfos: Array<{ id: string; harness: string } | undefined> = [];
  if (!Array.isArray(doc.stages)) {
    errors.push(`stages must be an array.`);
  } else if (doc.stages.length === 0) {
    errors.push(`stages must contain at least one stage.`);
  } else {
    doc.stages.forEach((stage, i) => {
      stageInfos.push(validateStage(stage, `stages[${i}]`, errors));
    });
  }
  const stageCount = Array.isArray(doc.stages) ? doc.stages.length : 0;

  const observedHarnesses = new Map<string, string>();
  if (!isPlainObject(doc.observedHarnessVersions)) {
    errors.push(`observedHarnessVersions must be an object.`);
  } else {
    for (const [key, val] of Object.entries(doc.observedHarnessVersions)) {
      if (!HARNESS_IDS.includes(key)) {
        errors.push(`observedHarnessVersions.${key} is not a known harness id.`);
      } else if (!isNonEmptyString(val)) {
        errors.push(`observedHarnessVersions.${key} must be a non-empty string.`);
      } else {
        observedHarnesses.set(key, val);
      }
    }
  }

  validateRuntime(doc.runtime, errors);

  let stageIndexValid = false;
  if (
    typeof doc.stageIndex !== "number" ||
    !Number.isInteger(doc.stageIndex) ||
    doc.stageIndex < 0
  ) {
    errors.push(`stageIndex must be a non-negative integer.`);
  } else {
    stageIndexValid = true;
  }

  let condition: RunCondition | undefined;
  if (typeof doc.condition !== "string" || !RUN_CONDITIONS.has(doc.condition)) {
    errors.push(`condition must be a known run condition.`);
  } else {
    condition = doc.condition as RunCondition;
  }

  if (!Array.isArray(doc.attempts)) {
    errors.push(`attempts must be an array.`);
  } else {
    doc.attempts.forEach((attempt, i) =>
      validateAttempt(attempt, `attempts[${i}]`, errors),
    );
  }

  // waiting / condition consistency.
  if (!("waiting" in doc)) {
    errors.push(`waiting is required (a waiting object or null).`);
  } else if (condition === "waiting-for-user") {
    if (doc.waiting === null) {
      errors.push(`condition "waiting-for-user" requires a non-null waiting object.`);
    } else {
      validateWaiting(doc.waiting, errors);
    }
  } else if (condition !== undefined && doc.waiting !== null) {
    errors.push(`condition "${condition}" requires waiting to be null.`);
  }

  // Bail before cross-field invariants if anything structural failed, so the
  // invariants can trust the shapes they inspect.
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const checkpoint = doc as unknown as RunCheckpoint;

  // stageIndex bounds by condition.
  if (stageIndexValid && condition !== undefined) {
    if (condition === "completed") {
      if (checkpoint.stageIndex !== stageCount) {
        errors.push(
          `stageIndex must equal the stage count (${stageCount}) when the run is completed.`,
        );
      }
    } else if (checkpoint.stageIndex >= stageCount) {
      errors.push(
        `stageIndex ${checkpoint.stageIndex} is out of range for a "${condition}" run with ${stageCount} stages.`,
      );
    }
  }

  // observed-harness-version coverage for every snapshotted stage.
  for (let i = 0; i < stageInfos.length; i += 1) {
    const info = stageInfos[i];
    if (info && !observedHarnesses.has(info.harness)) {
      errors.push(
        `stages[${i}] selects harness "${info.harness}" but observedHarnessVersions has no entry for it.`,
      );
    }
  }

  // workspace.path == execution.cwd for current-checkout.
  if (checkpoint.workspace.path !== checkpoint.workspace.execution.cwd) {
    errors.push(
      `workspace.path must equal workspace.execution.cwd for a current-checkout workspace.`,
    );
  }

  // Attempt-level cross-field invariants.
  const perStageNumbers = new Map<number, Set<number>>();
  checkpoint.attempts.forEach((attempt, i) => {
    if (attempt.stageIndex >= stageCount) {
      errors.push(
        `attempts[${i}].stageIndex ${attempt.stageIndex} is out of range for ${stageCount} stages.`,
      );
    } else if (checkpoint.stages[attempt.stageIndex].id !== attempt.stageId) {
      errors.push(
        `attempts[${i}].stageId "${attempt.stageId}" does not match snapshotted stage ${attempt.stageIndex} ("${checkpoint.stages[attempt.stageIndex].id}").`,
      );
    }
    let seen = perStageNumbers.get(attempt.stageIndex);
    if (!seen) {
      seen = new Set<number>();
      perStageNumbers.set(attempt.stageIndex, seen);
    }
    if (seen.has(attempt.attempt)) {
      errors.push(
        `attempts[${i}] reuses attempt number ${attempt.attempt} for stage ${attempt.stageIndex}.`,
      );
    } else {
      seen.add(attempt.attempt);
    }
    if (
      attempt.result === "done" &&
      (attempt.terminalResult === null || attempt.terminalResult.token !== "DONE")
    ) {
      errors.push(`attempts[${i}] is "done" but does not carry a parsed DONE outcome.`);
    }
  });

  // Exactly the final attempt is executing iff the run is executing.
  const executingIdx = checkpoint.attempts
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.result === "executing")
    .map(({ i }) => i);
  if (condition === "executing") {
    if (checkpoint.attempts.length === 0) {
      errors.push(`an "executing" run must have at least one attempt.`);
    } else if (
      executingIdx.length !== 1 ||
      executingIdx[0] !== checkpoint.attempts.length - 1
    ) {
      errors.push(
        `an "executing" run requires exactly the final attempt to be "executing".`,
      );
    }
  } else if (executingIdx.length > 0) {
    errors.push(
      `a "${condition}" run must have no attempt with result "executing".`,
    );
  }

  // The pause's recovery must resolve to the final attempt in the ordered
  // history, in the exact state that action requires. An older matching record
  // is stale once another attempt follows it: recovering the older DONE could
  // otherwise advance past the newer attempt. A reference that names no recorded
  // attempt, an attempt of another stage, a stale attempt, a non-DONE verdict, or
  // a result the action cannot start from all make the document unrecoverable
  // rather than approximately recoverable.
  const recovery = checkpoint.waiting?.recovery;
  if (recovery !== undefined && recovery.kind !== "retry-stage") {
    const reference = recovery.attempt;
    if (reference.stageIndex !== checkpoint.stageIndex) {
      errors.push(
        `waiting.recovery.attempt.stageIndex (${reference.stageIndex}) must name the current stage (${checkpoint.stageIndex}).`,
      );
    } else {
      const referenced = checkpoint.attempts.find(
        (attempt) =>
          attempt.stageIndex === reference.stageIndex &&
          attempt.attempt === reference.attempt,
      );
      if (referenced === undefined) {
        errors.push(
          `waiting.recovery.attempt names no recorded attempt (stage ${reference.stageIndex}, attempt ${reference.attempt}).`,
        );
      } else {
        const finalAttempt = checkpoint.attempts[checkpoint.attempts.length - 1];
        if (referenced !== finalAttempt) {
          errors.push(
            `waiting.recovery.attempt must name the final attempt in the ordered history; stage ${reference.stageIndex}, attempt ${reference.attempt} is stale.`,
          );
        }
        if (referenced.terminalResult?.token !== "DONE") {
          errors.push(
            `waiting.recovery.attempt must name an attempt whose terminal token is DONE.`,
          );
        }
        const requiredResult =
          recovery.kind === "resume-finalized-done" ? "done" : "waiting";
        if (referenced.result !== requiredResult) {
          errors.push(
            `waiting.recovery.attempt must name an attempt with result "${requiredResult}" on a "${recovery.kind}" recovery, not "${referenced.result}".`,
          );
        }
      }
    }
    if (recovery.kind === "resume-finalized-done") {
      const current = checkpoint.stages[checkpoint.stageIndex];
      if (
        current !== undefined &&
        recovery.queueResolution !== current.queueResolution
      ) {
        errors.push(
          `waiting.recovery.queueResolution "${recovery.queueResolution}" does not match the current stage's snapshotted resolution "${current.queueResolution}".`,
        );
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, checkpoint };
}

/**
 * Read and validate `<runDir>/state.json`. Only `state.json` is authoritative;
 * leftover temp files are ignored. A missing or unreadable file, malformed
 * JSON, or a schema/invariant violation all return a failed result carrying
 * human-readable errors.
 *
 * Loading a checkpoint lives with the document it validates, and deliberately
 * apart from the writer: a consumer that may only read one — a resume preflight —
 * then cannot reach a writer through the module it reads from.
 */
export async function readCheckpoint(runDir: string): Promise<CheckpointResult> {
  const statePath = path.join(runDir, "state.json");

  let raw: string;
  try {
    raw = await fs.readFile(statePath, "utf8");
  } catch (error) {
    return {
      ok: false,
      errors: [`Cannot read ${statePath}: ${(error as Error).message}`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      errors: [`${statePath} is not valid JSON: ${(error as Error).message}`],
    };
  }

  return validateCheckpoint(parsed);
}
