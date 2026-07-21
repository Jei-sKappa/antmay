// The filesystem-backed run registry. It serializes versioned records under the
// resolved per-user state root only, keyed by the canonical absolute repository
// folder path, and never writes into a repository or a harness configuration
// directory. Every authoritative mutation runs under a repository-scoped lock
// with bounded stale-lock recovery and replaces the record file by writing a
// sibling and renaming it, so no partially written record is ever observable.
// Malformed loaded state is reported as an operational error, never silently
// dropped or quarantined. Terminal regression protection is delegated to the
// core `terminalizeRun`/`applyTerminalOutcome` helpers; it is not re-derived.

import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join, resolve } from "node:path";
import {
  asAttachmentHandle,
  asRepositoryPath,
  asRunId,
  asThreadPath,
  findRunById,
  listRuns,
  listRunsForRepository,
  type RepositoryPath,
  type RunId,
  type RunRecord,
  type RunRegistry,
  registerRun,
  registryFromRecords,
  type SessionIdentity,
  type TerminalOutcome,
  terminalizeRun,
  updateWorkerHealth,
  type WorkerHealth,
} from "@antmay/core";

const REGISTRY_SCHEMA_VERSION = 1 as const;
const WORKER_SCHEMA_VERSION = 1 as const;
const LOCK_TIMEOUT_MS = 5_000;
const LOCK_STALE_MS = 30_000;
const LOCK_RETRY_MS = 10;

/**
 * Operational, execution-agnostic sidecar data for a run: worker heartbeat and
 * health, its latest diagnostic, the transcript tail cursor, the bound harness
 * session identity, the adapter name, and the opaque attach handle. These
 * fields live beneath the same state root as the authoritative record but are
 * kept out of the core run contract.
 */
export type WorkerOperationalRecord = {
  readonly runId: string;
  readonly heartbeatAt: string | null;
  readonly health: WorkerHealth;
  readonly diagnostic: string | null;
  readonly tailCursor: number | null;
  readonly session: SessionIdentity;
  readonly adapter: "herdr";
  readonly attachHandle: string | null;
};

/** Raised when a conflicting terminal transition is requested for a run. */
export class TerminalConflictError extends Error {
  constructor(runId: string) {
    super(
      `Run "${runId}" already holds a conflicting terminal classification; refusing to rewrite it.`,
    );
    this.name = "TerminalConflictError";
  }
}

/** Raised when persisted state cannot be read as a valid registry record. */
export class MalformedStateError extends Error {
  constructor(source: string, detail: string) {
    super(`Malformed registry state in ${source}: ${detail}`);
    this.name = "MalformedStateError";
  }
}

/**
 * Canonicalize a repository folder path to the absolute key used by the
 * registry. This resolves symlinks by reading the filesystem only; it never
 * writes anything into the repository.
 */
export function canonicalizeRepositoryPath(
  repositoryPath: string,
): RepositoryPath {
  const absolute = resolve(repositoryPath);
  const canonical = existsSync(absolute)
    ? realpathSync.native(absolute)
    : absolute;
  return asRepositoryPath(canonical);
}

type SerializedRegistry = {
  schemaVersion: typeof REGISTRY_SCHEMA_VERSION;
  repositoryPath: string;
  runs: readonly RunRecord[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireString(value: unknown, source: string, field: string): string {
  if (typeof value !== "string") {
    throw new MalformedStateError(source, `"${field}" must be a string.`);
  }
  return value;
}

function requireNullableString(
  value: unknown,
  source: string,
  field: string,
): string | null {
  if (value === null) {
    return null;
  }
  return requireString(value, source, field);
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  source: string,
  field: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new MalformedStateError(
      source,
      `"${field}" must be one of ${allowed.join(", ")}.`,
    );
  }
  return value as T;
}

function parseRunRecord(value: unknown, source: string): RunRecord {
  if (!isObject(value)) {
    throw new MalformedStateError(source, "run entry must be an object.");
  }
  const session = value.session;
  if (!isObject(session)) {
    throw new MalformedStateError(source, '"session" must be an object.');
  }
  const attachment = value.attachment;
  if (!isObject(attachment)) {
    throw new MalformedStateError(source, '"attachment" must be an object.');
  }
  const workerHealth = value.workerHealth;
  if (!isObject(workerHealth)) {
    throw new MalformedStateError(source, '"workerHealth" must be an object.');
  }
  if (typeof attachment.available !== "boolean") {
    throw new MalformedStateError(
      source,
      '"attachment.available" must be a boolean.',
    );
  }
  const handleValue = requireNullableString(
    attachment.handle,
    source,
    "attachment.handle",
  );

  return {
    id: asRunId(requireString(value.id, source, "id")),
    repositoryPath: asRepositoryPath(
      requireString(value.repositoryPath, source, "repositoryPath"),
    ),
    threadPath: asThreadPath(
      requireString(value.threadPath, source, "threadPath"),
    ),
    skill: requireString(value.skill, source, "skill"),
    harness: requireEnum(
      value.harness,
      ["claude", "codex"] as const,
      source,
      "harness",
    ),
    adapter: requireEnum(value.adapter, ["herdr"] as const, source, "adapter"),
    session: {
      kind: requireEnum(
        session.kind,
        ["pinned", "heuristic"] as const,
        source,
        "session.kind",
      ),
      id: requireNullableString(session.id, source, "session.id"),
    },
    attachment: {
      available: attachment.available,
      handle: handleValue === null ? null : asAttachmentHandle(handleValue),
    },
    classification: requireEnum(
      value.classification,
      ["active", "done", "blocked", "refused", "unknown"] as const,
      source,
      "classification",
    ),
    reason: requireNullableString(value.reason, source, "reason"),
    workerHealth: {
      state: requireEnum(
        workerHealth.state,
        ["healthy", "degraded", "stale"] as const,
        source,
        "workerHealth.state",
      ),
      detail: requireNullableString(
        workerHealth.detail,
        source,
        "workerHealth.detail",
      ),
    },
  };
}

function parseRegistryDocument(raw: string, source: string): RunRegistry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new MalformedStateError(
      source,
      `not valid JSON (${(error as Error).message}).`,
    );
  }
  if (!isObject(parsed)) {
    throw new MalformedStateError(source, "document must be an object.");
  }
  if (parsed.schemaVersion !== REGISTRY_SCHEMA_VERSION) {
    throw new MalformedStateError(
      source,
      `unsupported schemaVersion ${String(parsed.schemaVersion)}.`,
    );
  }
  if (!Array.isArray(parsed.runs)) {
    throw new MalformedStateError(source, '"runs" must be an array.');
  }
  const runs = parsed.runs.map((entry) => parseRunRecord(entry, source));
  return registryFromRecords(runs);
}

function parseWorkerDocument(
  raw: string,
  source: string,
): WorkerOperationalRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new MalformedStateError(
      source,
      `not valid JSON (${(error as Error).message}).`,
    );
  }
  if (!isObject(parsed) || parsed.schemaVersion !== WORKER_SCHEMA_VERSION) {
    throw new MalformedStateError(source, "unsupported worker document.");
  }
  const health = parsed.health;
  if (!isObject(health)) {
    throw new MalformedStateError(source, '"health" must be an object.');
  }
  const session = parsed.session;
  if (!isObject(session)) {
    throw new MalformedStateError(source, '"session" must be an object.');
  }
  const tailCursor = parsed.tailCursor;
  if (tailCursor !== null && typeof tailCursor !== "number") {
    throw new MalformedStateError(source, '"tailCursor" must be a number.');
  }
  return {
    runId: requireString(parsed.runId, source, "runId"),
    heartbeatAt: requireNullableString(
      parsed.heartbeatAt,
      source,
      "heartbeatAt",
    ),
    health: {
      state: requireEnum(
        health.state,
        ["healthy", "degraded", "stale"] as const,
        source,
        "health.state",
      ),
      detail: requireNullableString(health.detail, source, "health.detail"),
    },
    diagnostic: requireNullableString(parsed.diagnostic, source, "diagnostic"),
    tailCursor: tailCursor,
    session: {
      kind: requireEnum(
        session.kind,
        ["pinned", "heuristic"] as const,
        source,
        "session.kind",
      ),
      id: requireNullableString(session.id, source, "session.id"),
    },
    adapter: requireEnum(parsed.adapter, ["herdr"] as const, source, "adapter"),
    attachHandle: requireNullableString(
      parsed.attachHandle,
      source,
      "attachHandle",
    ),
  };
}

function briefSleep(ms: number): void {
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}

/**
 * A filesystem run registry rooted at a single resolved state root. All files
 * this store creates live beneath that root.
 */
export class FilesystemRegistryStore {
  private readonly runsRoot: string;

  constructor(stateRoot: string) {
    this.runsRoot = join(stateRoot, "runs");
  }

  private repositoryDir(repositoryPath: RepositoryPath): string {
    const key = createHash("sha256").update(repositoryPath).digest("hex");
    return join(this.runsRoot, key);
  }

  private recordFile(repositoryPath: RepositoryPath): string {
    return join(this.repositoryDir(repositoryPath), "record.json");
  }

  private workerFile(repositoryPath: RepositoryPath, runId: RunId): string {
    return join(this.repositoryDir(repositoryPath), "workers", `${runId}.json`);
  }

  private loadRegistry(repositoryPath: RepositoryPath): RunRegistry {
    const file = this.recordFile(repositoryPath);
    if (!existsSync(file)) {
      return registryFromRecords([]);
    }
    return parseRegistryDocument(readFileSync(file, "utf8"), file);
  }

  private persistRegistry(
    repositoryPath: RepositoryPath,
    registry: RunRegistry,
  ): void {
    const document: SerializedRegistry = {
      schemaVersion: REGISTRY_SCHEMA_VERSION,
      repositoryPath,
      runs: listRuns(registry),
    };
    this.atomicWrite(
      this.recordFile(repositoryPath),
      `${JSON.stringify(document, null, 2)}\n`,
    );
  }

  private atomicWrite(target: string, content: string): void {
    const dir = join(target, "..");
    mkdirSync(dir, { recursive: true });
    const sibling = `${target}.${randomBytes(8).toString("hex")}.tmp`;
    writeFileSync(sibling, content, "utf8");
    renameSync(sibling, target);
  }

  private withRepositoryLock<T>(
    repositoryPath: RepositoryPath,
    body: () => T,
  ): T {
    const dir = this.repositoryDir(repositoryPath);
    mkdirSync(dir, { recursive: true });
    const lockFile = join(dir, "registry.lock");
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    for (;;) {
      try {
        const fd = openSync(lockFile, "wx");
        writeSync(
          fd,
          JSON.stringify({ acquiredAt: Date.now(), owner: process.pid }),
        );
        closeSync(fd);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw error;
        }
        this.recoverStaleLock(lockFile);
        if (Date.now() >= deadline) {
          throw new Error(
            `Timed out acquiring the registry lock at ${lockFile}.`,
          );
        }
        briefSleep(LOCK_RETRY_MS);
      }
    }
    try {
      return body();
    } finally {
      rmSync(lockFile, { force: true });
    }
  }

  private recoverStaleLock(lockFile: string): void {
    let acquiredAt: number | undefined;
    try {
      const parsed = JSON.parse(readFileSync(lockFile, "utf8")) as {
        acquiredAt?: number;
      };
      acquiredAt = parsed.acquiredAt;
    } catch {
      // An unreadable or truncated lock is treated as stale.
      acquiredAt = undefined;
    }
    if (acquiredAt === undefined || Date.now() - acquiredAt > LOCK_STALE_MS) {
      rmSync(lockFile, { force: true });
    }
  }

  /** Register a new run binding. The public ID must be unique. */
  register(record: RunRecord): RunRecord {
    return this.withRepositoryLock(record.repositoryPath, () => {
      const registry = this.loadRegistry(record.repositoryPath);
      const next = registerRun(registry, record);
      this.persistRegistry(record.repositoryPath, next);
      return record;
    });
  }

  /** Every run keyed to the given canonical repository folder. */
  listForRepository(repositoryPath: RepositoryPath): readonly RunRecord[] {
    return listRunsForRepository(
      this.loadRegistry(repositoryPath),
      repositoryPath,
    );
  }

  /** Every run across every repository folder known to the state root. */
  listAll(): readonly RunRecord[] {
    if (!existsSync(this.runsRoot)) {
      return [];
    }
    const all: RunRecord[] = [];
    for (const entry of readdirSync(this.runsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const file = join(this.runsRoot, entry.name, "record.json");
      if (!existsSync(file)) {
        continue;
      }
      const registry = parseRegistryDocument(readFileSync(file, "utf8"), file);
      all.push(...listRuns(registry));
    }
    return all;
  }

  /** Find a run by public ID within a canonical repository folder. */
  findById(repositoryPath: RepositoryPath, id: RunId): RunRecord | undefined {
    return findRunById(this.loadRegistry(repositoryPath), id);
  }

  /** Find a run by public ID across every known repository folder. */
  findByIdGlobal(id: RunId): RunRecord | undefined {
    return this.listAll().find((record) => record.id === id);
  }

  /** Update the observer health of a run atomically. */
  updateWorkerHealth(
    repositoryPath: RepositoryPath,
    id: RunId,
    health: WorkerHealth,
  ): RunRecord {
    return this.withRepositoryLock(repositoryPath, () => {
      const registry = this.loadRegistry(repositoryPath);
      const update = updateWorkerHealth(registry, id, health);
      if (update.changed) {
        this.persistRegistry(repositoryPath, update.registry);
      }
      return update.record;
    });
  }

  /**
   * Apply a terminal outcome atomically. A repeated identical terminalization
   * returns the existing record without rewriting it; a conflicting terminal
   * transition throws {@link TerminalConflictError} and leaves the record
   * untouched. The regression protection itself comes from `terminalizeRun`.
   */
  terminalize(
    repositoryPath: RepositoryPath,
    id: RunId,
    outcome: TerminalOutcome,
  ): RunRecord {
    return this.withRepositoryLock(repositoryPath, () => {
      const registry = this.loadRegistry(repositoryPath);
      const update = terminalizeRun(registry, id, outcome);
      if (update.changed) {
        this.persistRegistry(repositoryPath, update.registry);
        return update.record;
      }
      // The record was already terminal, so `terminalizeRun` left it untouched.
      // A request matching the recorded outcome is an idempotent repeat; any
      // other terminal request conflicts and is refused without a rewrite.
      const identical =
        update.record.classification === outcome.classification &&
        update.record.reason === outcome.reason;
      if (!identical) {
        throw new TerminalConflictError(id);
      }
      return update.record;
    });
  }

  /** Persist a run's operational sidecar beneath the same state root. */
  writeWorkerRecord(
    repositoryPath: RepositoryPath,
    op: WorkerOperationalRecord,
  ): void {
    this.withRepositoryLock(repositoryPath, () => {
      this.atomicWrite(
        this.workerFile(repositoryPath, asRunId(op.runId)),
        `${JSON.stringify({ schemaVersion: WORKER_SCHEMA_VERSION, ...op }, null, 2)}\n`,
      );
    });
  }

  /** Read a run's operational sidecar, or `undefined` when none exists. */
  readWorkerRecord(
    repositoryPath: RepositoryPath,
    id: RunId,
  ): WorkerOperationalRecord | undefined {
    const file = this.workerFile(repositoryPath, id);
    if (!existsSync(file)) {
      return undefined;
    }
    return parseWorkerDocument(readFileSync(file, "utf8"), file);
  }
}
