import path from "node:path";

import type { HarnessId } from "../config/settings.js";
import type {
  GitPolicy,
  PathSelector,
  StageDescriptor,
  StageProfile,
  StageTarget,
} from "../recipe/types.js";
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
  | "commit-error";

/**
 * Structured harness/gate diagnostics kept on a waiting object.
 */
export type WaitingDiagnostics = {
  category: string;
  errorClass?: string;
  errorMessage?: string;
  origin?: string;
};

/**
 * The single waiting object a `waiting-for-user` checkpoint carries. It always
 * names a kind and a complete human message; pending paths, a candidate outcome
 * line, and structured diagnostics are present when applicable.
 */
export type WaitingInfo = {
  kind: WaitingKind;
  message: string;
  pendingFiles?: string[];
  candidateLine?: string;
  diagnostics?: WaitingDiagnostics;
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
  logPath: string;
};

/**
 * An immutable snapshot of one resolved stage: its declarative descriptor, its
 * fully resolved execution profile, and the resolved target path.
 */
export type SnapshottedStage = StageDescriptor & {
  profile: StageProfile;
  resolvedTarget: string;
};

/**
 * The full `state.json` document at `schemaVersion: 1`.
 */
export type RunCheckpoint = {
  schemaVersion: 1;
  runId: string;
  executor: { pid: number; version: string };
  createdAt: string;
  updatedAt: string;
  repoRoot: string;
  threadRelPath: string;
  workspace: WorkspaceConfig;
  dangerouslySkipPermissions: boolean;
  recipeName: string;
  stages: SnapshottedStage[];
  observedHarnessVersions: Partial<Record<HarnessId, string>>;
  stageIndex: number;
  condition: RunCondition;
  attempts: AttemptRecord[];
  waiting: WaitingInfo | null;
  gitCursor: {
    stageIndex: number;
    headAtStageEntry: string | null;
    observedHead: string | null;
  };
};

/**
 * The outcome of validating an untrusted checkpoint document.
 */
export type CheckpointResult =
  | { ok: true; checkpoint: RunCheckpoint }
  | { ok: false; errors: string[] };

const HARNESS_IDS: ReadonlySet<string> = new Set<HarnessId>([
  "codex",
  "claude-code",
]);

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
]);

const TERMINAL_TOKENS: ReadonlySet<string> = new Set([
  "DONE",
  "BLOCKED",
  "REFUSED",
]);

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function validateStageProfile(value: unknown, label: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (typeof value.harness !== "string" || !HARNESS_IDS.has(value.harness)) {
    errors.push(`${label}.harness must be a known harness id.`);
  }
  if (!isNonEmptyString(value.model)) {
    errors.push(`${label}.model must be a non-empty string.`);
  }
  if (typeof value.prompt !== "string") {
    errors.push(`${label}.prompt must be a string.`);
  }
  const idle = value.idleTimeoutSeconds;
  if (typeof idle !== "number" || !Number.isInteger(idle) || idle <= 0) {
    errors.push(`${label}.idleTimeoutSeconds must be a positive integer.`);
  }
}

/**
 * Validate one snapshotted stage. Returns the stage id when structurally sound
 * enough for cross-field checks, else `undefined`.
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
  if (!isNonEmptyString(value.id)) {
    errors.push(`${label}.id must be a non-empty string.`);
  } else {
    id = value.id;
  }
  if (!isNonEmptyString(value.skill)) {
    errors.push(`${label}.skill must be a non-empty string.`);
  }
  validateStageTarget(value.target, `${label}.target`, errors);
  validateGitPolicy(value.gitPolicy, `${label}.gitPolicy`, errors);
  if (value.queueResolution !== "advance" && value.queueResolution !== "rerun") {
    errors.push(`${label}.queueResolution must be "advance" or "rerun".`);
  }
  validateStageProfile(value.profile, `${label}.profile`, errors);
  if (!isNonEmptyString(value.resolvedTarget)) {
    errors.push(`${label}.resolvedTarget must be a non-empty string.`);
  }
  const harness =
    isPlainObject(value.profile) && typeof value.profile.harness === "string"
      ? value.profile.harness
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
  if (!isNormalizedRelPosix(value.logPath)) {
    errors.push(`${label}.logPath must be a normalized run-relative POSIX path.`);
  }
}

function validateWaiting(value: unknown, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`waiting object must be an object.`);
    return;
  }
  if (typeof value.kind !== "string" || !WAITING_KINDS.has(value.kind)) {
    errors.push(`waiting.kind must be a known waiting kind.`);
  }
  if (!isNonEmptyString(value.message)) {
    errors.push(`waiting.message must be a non-empty string.`);
  }
  if (value.pendingFiles !== undefined) {
    validateSortedUniquePending(value.pendingFiles, "waiting.pendingFiles", errors);
  }
  if (value.candidateLine !== undefined && typeof value.candidateLine !== "string") {
    errors.push(`waiting.candidateLine must be a string.`);
  }
  if (value.diagnostics !== undefined) {
    const d = value.diagnostics;
    if (!isPlainObject(d)) {
      errors.push(`waiting.diagnostics must be an object.`);
    } else {
      if (!isNonEmptyString(d.category)) {
        errors.push(`waiting.diagnostics.category must be a non-empty string.`);
      }
      for (const key of ["errorClass", "errorMessage", "origin"] as const) {
        if (d[key] !== undefined && typeof d[key] !== "string") {
          errors.push(`waiting.diagnostics.${key} must be a string.`);
        }
      }
    }
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
 * Validate an untrusted document against the `schemaVersion: 1` checkpoint
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
    errors.push(`schemaVersion is required and must be 1.`);
  } else if (doc.schemaVersion !== 1) {
    errors.push(
      `Unsupported schemaVersion ${JSON.stringify(doc.schemaVersion)}; this executor only reads schemaVersion 1 and performs no migration.`,
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
  if (!isNonEmptyString(doc.recipeName)) {
    errors.push(`recipeName must be a non-empty string.`);
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
      if (!HARNESS_IDS.has(key)) {
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

  // gitCursor.
  let cursorIndex: number | undefined;
  let cursorHeadsNonNull = false;
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
    for (const key of ["headAtStageEntry", "observedHead"] as const) {
      const v = gc[key];
      if (v !== null && !isNonEmptyString(v)) {
        errors.push(`gitCursor.${key} must be a commit string or null.`);
      } else if (isNonEmptyString(v)) {
        cursorHeadsNonNull = true;
      }
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

  // gitCursor names the current stage when its HEAD fields are populated.
  if (cursorHeadsNonNull && cursorIndex !== checkpoint.stageIndex) {
    errors.push(
      `gitCursor.stageIndex (${cursorIndex}) must name the current stage (${checkpoint.stageIndex}) when its HEAD fields are set.`,
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
