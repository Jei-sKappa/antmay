// Mode-agnostic run identity, classification, and terminal-transition semantics.
// These contracts describe a registered run without any pane, multiplexer,
// process, transcript-path, or filesystem concept: attachment data is an opaque
// execution-lane binding, never a pane type. Every command and worker reasons
// about runs through these types.

/**
 * Nominal string brand. The phantom `__brand` tag makes each identity a
 * distinct type at compile time while remaining a plain printable string at
 * runtime.
 */
type Brand<Tag extends string> = string & { readonly __brand: Tag };

/** Opaque, printable, registry-unique public run identifier. */
export type RunId = Brand<"RunId">;

/** Canonical absolute repository folder path used as the state key. */
export type RepositoryPath = Brand<"RepositoryPath">;

/** Canonical absolute active-thread-root path bound to a run. */
export type ThreadPath = Brand<"ThreadPath">;

/** Opaque execution-lane binding used to rejoin a run; never a pane type. */
export type AttachmentHandle = Brand<"AttachmentHandle">;

/** The two v0 harnesses. */
export type Harness = "claude" | "codex";

/** The single v0 multiplexer-neutral adapter value carried in the registry. */
export type Adapter = "herdr";

/**
 * How the harness session identity was obtained: `pinned` for a deterministic
 * launch-time identity, `heuristic` for a best-effort join identity.
 */
export type SessionKind = "pinned" | "heuristic";

/** Harness session identity bound to a run. */
export type SessionIdentity = {
  readonly kind: SessionKind;
  readonly id: string | null;
};

/**
 * Opaque execution-lane binding recorded so a run can later be rejoined. The
 * handle is an opaque string; core never interprets it as a pane.
 */
export type AttachmentBinding = {
  readonly available: boolean;
  readonly handle: AttachmentHandle | null;
};

/** Observer health for a run, independent of run classification. */
export type WorkerHealthState = "healthy" | "degraded" | "stale";

/** Observer health data attached to a run. */
export type WorkerHealth = {
  readonly state: WorkerHealthState;
  readonly detail: string | null;
};

/**
 * The closed run classification union. `active` covers a registered run with no
 * confirmed terminal outcome — including while observation health is degraded.
 * `done`, `blocked`, and `refused` come from a genuine transcript-derived final
 * outcome; `unknown` comes from positively confirmed endpoint end/absence with
 * no reliable terminal outcome.
 */
export type RunClassification =
  | "active"
  | "done"
  | "blocked"
  | "refused"
  | "unknown";

/** The four terminal classifications a run can settle into. */
export type TerminalClassification = "done" | "blocked" | "refused" | "unknown";

/** True when a classification is any terminal state (i.e. not `active`). */
export function isTerminalClassification(
  classification: RunClassification,
): classification is TerminalClassification {
  return classification !== "active";
}

/**
 * A complete registry run binding. Holds the public identity, canonical
 * repository/thread identities, harness/session identity, adapter, opaque
 * attachment binding, current classification with its terminal reason when
 * available, and observer health.
 */
export type RunRecord = {
  readonly id: RunId;
  readonly repositoryPath: RepositoryPath;
  readonly threadPath: ThreadPath;
  readonly skill: string;
  readonly harness: Harness;
  readonly adapter: Adapter;
  readonly session: SessionIdentity;
  readonly attachment: AttachmentBinding;
  readonly classification: RunClassification;
  readonly reason: string | null;
  readonly workerHealth: WorkerHealth;
};

// biome-ignore lint/suspicious/noControlCharactersInRegex: run IDs must be printable, so rejecting control characters is the point.
const CONTROL_CHARACTERS = /[\x00-\x1F\x7F]/;

function requirePrintable(label: string, value: string): void {
  if (value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  if (CONTROL_CHARACTERS.test(value)) {
    throw new Error(`${label} must be printable (no control characters).`);
  }
}

/** Brand a validated printable string as a {@link RunId}. */
export function asRunId(value: string): RunId {
  requirePrintable("Run ID", value);
  return value as RunId;
}

/** Brand a non-empty string as a canonical {@link RepositoryPath}. */
export function asRepositoryPath(value: string): RepositoryPath {
  requirePrintable("Repository path", value);
  return value as RepositoryPath;
}

/** Brand a non-empty string as a canonical {@link ThreadPath}. */
export function asThreadPath(value: string): ThreadPath {
  requirePrintable("Thread path", value);
  return value as ThreadPath;
}

/** Brand a non-empty string as an opaque {@link AttachmentHandle}. */
export function asAttachmentHandle(value: string): AttachmentHandle {
  requirePrintable("Attachment handle", value);
  return value as AttachmentHandle;
}

/**
 * Positive evidence that the execution endpoint has ended or is absent. Only
 * such evidence — never an indeterminate observation error — may resolve a run
 * to `unknown`.
 */
export type EndpointEndEvidence = {
  readonly endpointEnded: true;
};

/**
 * A resolved terminal outcome. Transcript-derived outcomes carry a complete,
 * non-empty reason; `unknown` carries no reason because none exists.
 */
export type TerminalOutcome =
  | { readonly classification: "done"; readonly reason: string }
  | { readonly classification: "blocked"; readonly reason: string }
  | { readonly classification: "refused"; readonly reason: string }
  | { readonly classification: "unknown"; readonly reason: null };

/** The transcript-derived terminal kinds that carry a reason. */
export type TranscriptTerminalKind = "done" | "blocked" | "refused";

/**
 * Build a transcript-derived terminal outcome. The reason must be a complete,
 * non-empty string; a blank reason is rejected because no genuine outcome
 * omits its reason.
 */
export function transcriptTerminalOutcome(
  kind: TranscriptTerminalKind,
  reason: string,
): TerminalOutcome {
  if (reason.trim().length === 0) {
    throw new Error(
      `A transcript-derived ${kind} outcome requires a complete reason.`,
    );
  }
  return { classification: kind, reason };
}

/**
 * Build an `unknown` terminal outcome. Requires positive endpoint-end evidence;
 * an indeterminate observation error must not reach this helper.
 */
export function unknownOutcome(evidence: EndpointEndEvidence): TerminalOutcome {
  if (evidence?.endpointEnded !== true) {
    throw new Error(
      "An unknown outcome requires positive endpoint-end evidence.",
    );
  }
  return { classification: "unknown", reason: null };
}

/** Result of applying a terminal outcome to a run record. */
export type TerminalTransitionResult = {
  readonly record: RunRecord;
  readonly changed: boolean;
};

/**
 * Apply a terminal outcome to a run record idempotently. A record that already
 * holds a terminal classification is returned unchanged (`changed: false`) so a
 * duplicate reconciliation never regresses to `active`, rewrites the recorded
 * outcome, or produces a conflicting terminal record. Only an `active` record
 * transitions.
 */
export function applyTerminalOutcome(
  record: RunRecord,
  outcome: TerminalOutcome,
): TerminalTransitionResult {
  if (isTerminalClassification(record.classification)) {
    return { record, changed: false };
  }
  return {
    record: {
      ...record,
      classification: outcome.classification,
      reason: outcome.reason,
    },
    changed: true,
  };
}
