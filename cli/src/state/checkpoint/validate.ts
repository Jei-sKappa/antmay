/**
 * Checkpoint validation: the untrusted-input boundary of the durable run state.
 * A parsed `state.json` document is assumed to be nothing until this module has
 * checked every field shape and every cross-field invariant it declares.
 */

import path from "node:path";

import { isHarnessId } from "../../harness/id.js";
import { isCatalogStageId } from "../../pipeline/stage-id.js";
import {
  DONE_OUTCOME,
  isTerminalOutcome,
  TERMINAL_OUTCOMES,
} from "../../runner/outcome.js";
import { isPlainObject } from "../../shared/validation.js";
import {
  validateSerializedArtifactMismatches,
  validateSerializedArtifactPattern,
} from "../../thread/artifacts.js";

import type {
  AttemptReference,
  AttemptResult,
  CheckpointResult,
  RunCheckpoint,
  RunCondition,
  WaitingKind,
} from "./types.js";

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
    if (!isHarnessId(agent.harness)) {
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
 * resolved local binding.
 */
function validateStage(value: unknown, label: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
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
}

function validateTerminalResult(value: unknown, label: string, errors: string[]): void {
  if (value === null) return;
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object or null.`);
    return;
  }
  const token = value.token;
  if (token !== null && !isTerminalOutcome(token)) {
    errors.push(
      `${label}.token must be ${TERMINAL_OUTCOMES.join(", ")}, or null.`,
    );
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
  if (value.kind !== "real" && value.kind !== "simulated") {
    errors.push(`runtime.kind must be "real" or "simulated".`);
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

/** One cross-field invariant: a pure question asked of an accepted checkpoint. */
type CrossFieldInvariant = (checkpoint: RunCheckpoint) => string[];

function stageIndexWithinConditionBounds(checkpoint: RunCheckpoint): string[] {
  const stageCount = checkpoint.stages.length;
  if (checkpoint.condition === "completed") {
    if (checkpoint.stageIndex !== stageCount) {
      return [
        `stageIndex must equal the stage count (${stageCount}) when the run is completed.`,
      ];
    }
    return [];
  }
  if (checkpoint.stageIndex >= stageCount) {
    return [
      `stageIndex ${checkpoint.stageIndex} is out of range for a "${checkpoint.condition}" run with ${stageCount} stages.`,
    ];
  }
  return [];
}

function everyStageHarnessObserved(checkpoint: RunCheckpoint): string[] {
  const errors: string[] = [];
  checkpoint.stages.forEach((stage, i) => {
    const harness = stage.binding.agent.harness;
    if (checkpoint.observedHarnessVersions[harness] === undefined) {
      errors.push(
        `stages[${i}] selects harness "${harness}" but observedHarnessVersions has no entry for it.`,
      );
    }
  });
  return errors;
}

function workspacePathMatchesExecutionCwd(checkpoint: RunCheckpoint): string[] {
  if (checkpoint.workspace.path !== checkpoint.workspace.execution.cwd) {
    return [
      `workspace.path must equal workspace.execution.cwd for a current-checkout workspace.`,
    ];
  }
  return [];
}

function attemptsAgreeWithSnapshottedStages(checkpoint: RunCheckpoint): string[] {
  const errors: string[] = [];
  const stageCount = checkpoint.stages.length;
  const perStageNumbers = new Map<number, Set<number>>();
  checkpoint.attempts.forEach((attempt, i) => {
    const snapshotted = checkpoint.stages[attempt.stageIndex];
    if (snapshotted === undefined) {
      errors.push(
        `attempts[${i}].stageIndex ${attempt.stageIndex} is out of range for ${stageCount} stages.`,
      );
    } else if (snapshotted.id !== attempt.stageId) {
      errors.push(
        `attempts[${i}].stageId "${attempt.stageId}" does not match snapshotted stage ${attempt.stageIndex} ("${snapshotted.id}").`,
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
      errors.push(
        `attempts[${i}] is "done" but does not carry a parsed ${DONE_OUTCOME} outcome.`,
      );
    }
  });
  return errors;
}

function executingAttemptIsFinal(checkpoint: RunCheckpoint): string[] {
  const executingIdx = checkpoint.attempts
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.result === "executing")
    .map(({ i }) => i);
  if (checkpoint.condition === "executing") {
    if (checkpoint.attempts.length === 0) {
      return [`an "executing" run must have at least one attempt.`];
    }
    if (
      executingIdx.length !== 1 ||
      executingIdx[0] !== checkpoint.attempts.length - 1
    ) {
      return [
        `an "executing" run requires exactly the final attempt to be "executing".`,
      ];
    }
    return [];
  }
  if (executingIdx.length > 0) {
    return [
      `a "${checkpoint.condition}" run must have no attempt with result "executing".`,
    ];
  }
  return [];
}

/**
 * Resolve one recovery's attempt reference against the recorded history and
 * report every way it fails to name the attempt that recovery kind can act on.
 */
function attemptReferenceDiagnostics(
  checkpoint: RunCheckpoint,
  reference: AttemptReference,
  requiredResult: "done" | "waiting",
  kind: string,
): string[] {
  if (reference.stageIndex !== checkpoint.stageIndex) {
    return [
      `waiting.recovery.attempt.stageIndex (${reference.stageIndex}) must name the current stage (${checkpoint.stageIndex}).`,
    ];
  }
  const referenced = checkpoint.attempts.find(
    (attempt) =>
      attempt.stageIndex === reference.stageIndex &&
      attempt.attempt === reference.attempt,
  );
  if (referenced === undefined) {
    return [
      `waiting.recovery.attempt names no recorded attempt (stage ${reference.stageIndex}, attempt ${reference.attempt}).`,
    ];
  }
  const errors: string[] = [];
  const finalAttempt = checkpoint.attempts[checkpoint.attempts.length - 1];
  if (referenced !== finalAttempt) {
    errors.push(
      `waiting.recovery.attempt must name the final attempt in the ordered history; stage ${reference.stageIndex}, attempt ${reference.attempt} is stale.`,
    );
  }
  if (referenced.terminalResult?.token !== "DONE") {
    errors.push(
      `waiting.recovery.attempt must name an attempt whose terminal token is ${DONE_OUTCOME}.`,
    );
  }
  if (referenced.result !== requiredResult) {
    errors.push(
      `waiting.recovery.attempt must name an attempt with result "${requiredResult}" on a "${kind}" recovery, not "${referenced.result}".`,
    );
  }
  return errors;
}

/**
 * The pause's recovery must resolve to the final attempt in the ordered
 * history, in the exact state that action requires. An older matching record
 * is stale once another attempt follows it: recovering the older DONE could
 * otherwise advance past the newer attempt. A reference that names no recorded
 * attempt, an attempt of another stage, a stale attempt, a non-DONE verdict, or
 * a result the action cannot start from all make the document unrecoverable
 * rather than approximately recoverable.
 */
function recoveryResolvesAgainstAttemptHistory(checkpoint: RunCheckpoint): string[] {
  const recovery = checkpoint.waiting?.recovery;
  if (recovery === undefined) return [];
  switch (recovery.kind) {
    case "retry-stage":
      return [];
    case "resume-finalized-done": {
      const current = checkpoint.stages[checkpoint.stageIndex];
      return [
        ...attemptReferenceDiagnostics(checkpoint, recovery.attempt, "done", recovery.kind),
        ...(current !== undefined && recovery.queueResolution !== current.queueResolution
          ? [
              `waiting.recovery.queueResolution "${recovery.queueResolution}" does not match the current stage's snapshotted resolution "${current.queueResolution}".`,
            ]
          : []),
      ];
    }
    case "recheck-stage-contract":
    case "retry-git-finalization":
      return attemptReferenceDiagnostics(checkpoint, recovery.attempt, "waiting", recovery.kind);
  }
}

const CROSS_FIELD_INVARIANTS: readonly CrossFieldInvariant[] = [
  stageIndexWithinConditionBounds,
  everyStageHarnessObserved,
  workspacePathMatchesExecutionCwd,
  attemptsAgreeWithSnapshottedStages,
  executingAttemptIsFinal,
  recoveryResolvesAgainstAttemptHistory,
];

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

  if (!Array.isArray(doc.stages)) {
    errors.push(`stages must be an array.`);
  } else if (doc.stages.length === 0) {
    errors.push(`stages must contain at least one stage.`);
  } else {
    doc.stages.forEach((stage, i) => validateStage(stage, `stages[${i}]`, errors));
  }

  if (!isPlainObject(doc.observedHarnessVersions)) {
    errors.push(`observedHarnessVersions must be an object.`);
  } else {
    for (const [key, val] of Object.entries(doc.observedHarnessVersions)) {
      if (!isHarnessId(key)) {
        errors.push(`observedHarnessVersions.${key} is not a known harness id.`);
      } else if (!isNonEmptyString(val)) {
        errors.push(`observedHarnessVersions.${key} must be a non-empty string.`);
      }
    }
  }

  validateRuntime(doc.runtime, errors);

  if (
    typeof doc.stageIndex !== "number" ||
    !Number.isInteger(doc.stageIndex) ||
    doc.stageIndex < 0
  ) {
    errors.push(`stageIndex must be a non-negative integer.`);
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

  errors.push(...CROSS_FIELD_INVARIANTS.flatMap((invariant) => invariant(checkpoint)));

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, checkpoint };
}
