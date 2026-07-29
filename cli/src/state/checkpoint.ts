import path from "node:path";

import { HARNESS_IDS } from "../config/execution.js";
import type { HarnessId, ResolvedStageBinding } from "../config/execution.js";
import { isCatalogStageId } from "../pipeline/catalog.js";
import type { CatalogStage } from "../pipeline/catalog.js";
import type { CatalogStageId, PlanState } from "../pipeline/types.js";
import { isPlainObject } from "../shared/validation.js";
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
  /**
   * The `HEAD` the attempt this pause preserves started from. A
   * `stage-contract-violation` stops the run before the stage's Git boundary is
   * ever judged, so it is the later finalization that applies the stage's
   * `HEAD` rule, and this is the only value that rule may be measured against:
   * it isolates the movement the preserved attempt itself caused from every
   * earlier attempt of the stage and every commit a human made across an
   * earlier pause.
   */
  headAtAttemptStart?: string;
};

/**
 * Every reason one pause stopped for, in precedence order and never empty: a
 * pause always has at least the reason that governs it, which is `[0]`.
 */
export type WaitingReasons = [WaitingReason, ...WaitingReason[]];

/**
 * The single waiting object a `waiting-for-user` checkpoint carries. Everything
 * about why the run stopped lives in `reasons`; `nextAction` is the one thing
 * that belongs to the run as a whole rather than to any single reason.
 */
export type WaitingInfo = {
  reasons: WaitingReasons;
  nextAction?: string;
};

/**
 * The reason that decides how `resume` behaves: always the first one recorded,
 * because `reasons` is written in precedence order.
 */
export function governingReason(waiting: WaitingInfo): WaitingReason {
  return waiting.reasons[0];
}

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
  stageIndex: number;
  condition: RunCondition;
  attempts: AttemptRecord[];
  waiting: WaitingInfo | null;
  gitCursor: {
    stageIndex: number;
    observedHead: string | null;
  };
  /** Present only when the run started in scripted test harness mode. */
  startedScripted?: true;
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

const PLAN_STATES: ReadonlySet<string> = new Set<PlanState>([
  "absent",
  "brief",
  "strict",
  "malformed",
]);

const BOOLEAN_ARTIFACT_DIMENSIONS = [
  "validThread",
  "proposal",
  "spec",
  "implementationReport",
] as const;

/**
 * Validate one artifact-state pattern — a stage's prerequisite or its promised
 * transition. Every named dimension must carry its own value type, and no other
 * key may appear.
 */
function validateArtifactPattern(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  for (const key of Object.keys(value)) {
    if (
      key !== "plan" &&
      !(BOOLEAN_ARTIFACT_DIMENSIONS as readonly string[]).includes(key)
    ) {
      errors.push(`${label}.${key} is not an artifact-state dimension.`);
    }
  }
  for (const dimension of BOOLEAN_ARTIFACT_DIMENSIONS) {
    if (dimension in value && typeof value[dimension] !== "boolean") {
      errors.push(`${label}.${dimension} must be a boolean.`);
    }
  }
  if (
    "plan" in value &&
    (typeof value.plan !== "string" || !PLAN_STATES.has(value.plan))
  ) {
    errors.push(`${label}.plan must be a known plan state.`);
  }
}

/**
 * Whether `value` is a legal value for the named artifact-state dimension: a
 * plan state for `plan`, and a boolean for every other dimension.
 */
function isArtifactDimensionValue(dimension: string, value: unknown): boolean {
  if (dimension === "plan") {
    return typeof value === "string" && PLAN_STATES.has(value);
  }
  return typeof value === "boolean";
}

/**
 * Validate a recorded contract failure: a non-empty list of unmet dimensions,
 * each naming one artifact-state dimension and carrying an expected and an
 * observed value of that dimension's own type.
 */
function validateContractMismatches(
  value: unknown,
  label: string,
  errors: string[],
): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} must be a non-empty array.`);
    return;
  }
  value.forEach((entry, index) => {
    const entryLabel = `${label}[${index}]`;
    if (!isPlainObject(entry)) {
      errors.push(`${entryLabel} must be an object.`);
      return;
    }
    const dimension = entry.dimension;
    if (
      typeof dimension !== "string" ||
      (dimension !== "plan" &&
        !(BOOLEAN_ARTIFACT_DIMENSIONS as readonly string[]).includes(dimension))
    ) {
      errors.push(`${entryLabel}.dimension is not an artifact-state dimension.`);
      return;
    }
    for (const side of ["expected", "observed"] as const) {
      if (!isArtifactDimensionValue(dimension, entry[side])) {
        errors.push(
          `${entryLabel}.${side} must be a valid value for the "${dimension}" dimension.`,
        );
      }
    }
  });
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
  validateArtifactPattern(value.prerequisite, `${label}.prerequisite`, errors);
  validateArtifactPattern(value.promises, `${label}.promises`, errors);
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
  if (!isNormalizedRelPosix(value.logPath)) {
    errors.push(`${label}.logPath must be a normalized run-relative POSIX path.`);
  }
}

/**
 * Validate the recorded reason list. It must be non-empty — the first entry is
 * the reason that governs the resume path — and each entry must name a known
 * kind and carry a complete message.
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
      validateContractMismatches(entry.contract, `${label}.contract`, errors);
    }
    if (
      entry.headAtAttemptStart !== undefined &&
      !isNonEmptyString(entry.headAtAttemptStart)
    ) {
      errors.push(`${label}.headAtAttemptStart must be a commit string.`);
    } else if (
      entry.kind === "stage-contract-violation" &&
      entry.headAtAttemptStart === undefined
    ) {
      // The finalization this pause exists to enable judges the stage's HEAD
      // rule against the attempt's own start, so a contract pause that does not
      // carry one is not recoverable.
      errors.push(
        `${label}.headAtAttemptStart is required on a stage-contract-violation reason.`,
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

  if ("startedScripted" in doc) {
    if (doc.startedScripted !== true) {
      errors.push(`startedScripted must be true when present.`);
    }
  }

  // gitCursor.
  let cursorIndex: number | undefined;
  let cursorHeadObserved = false;
  if (!isPlainObject(doc.gitCursor)) {
    errors.push(`gitCursor must be an object.`);
  } else {
    const gc = doc.gitCursor;
    if (
      typeof gc.stageIndex !== "number" ||
      !Number.isInteger(gc.stageIndex) ||
      gc.stageIndex < 0
    ) {
      errors.push(`gitCursor.stageIndex must be a non-negative integer.`);
    } else {
      cursorIndex = gc.stageIndex;
    }
    const observed = gc.observedHead;
    if (observed !== null && !isNonEmptyString(observed)) {
      errors.push(`gitCursor.observedHead must be a commit string or null.`);
    } else if (isNonEmptyString(observed)) {
      cursorHeadObserved = true;
    }
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

  // gitCursor names the current stage when its HEAD observation is populated.
  if (cursorHeadObserved && cursorIndex !== checkpoint.stageIndex) {
    errors.push(
      `gitCursor.stageIndex (${cursorIndex}) must name the current stage (${checkpoint.stageIndex}) when gitCursor.observedHead is set.`,
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

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, checkpoint };
}
