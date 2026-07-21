// Pure, storage-agnostic run-registry semantics: register unique run bindings,
// list them globally or by canonical repository, find one by public ID, update
// observer health, and apply immutable terminal transitions. This module holds
// no filesystem, serialization, or execution-lane concept — a persistence layer
// composes these functions over whatever medium it owns. Terminal regression
// protection is delegated entirely to `applyTerminalOutcome`; it is never
// re-derived here.

import {
  applyTerminalOutcome,
  type RepositoryPath,
  type RunId,
  type RunRecord,
  type TerminalOutcome,
  type WorkerHealth,
} from "./run";

/**
 * An immutable snapshot of registered run bindings. Every mutating operation
 * returns a fresh snapshot; the input is never modified.
 */
export type RunRegistry = {
  readonly runs: readonly RunRecord[];
};

/** Result of a mutating registry operation. */
export type RegistryUpdate = {
  readonly registry: RunRegistry;
  readonly record: RunRecord;
  readonly changed: boolean;
};

/** An empty registry snapshot. */
export function emptyRegistry(): RunRegistry {
  return { runs: [] };
}

/**
 * Build a registry from a set of records, rejecting duplicate public IDs so a
 * loaded snapshot always has a unique identity per run.
 */
export function registryFromRecords(
  records: readonly RunRecord[],
): RunRegistry {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) {
      throw new Error(`Duplicate run ID "${record.id}" in registry.`);
    }
    seen.add(record.id);
  }
  return { runs: [...records] };
}

/** Every registered run, in registration order. */
export function listRuns(registry: RunRegistry): readonly RunRecord[] {
  return registry.runs;
}

/** Every registered run keyed to the given canonical repository folder. */
export function listRunsForRepository(
  registry: RunRegistry,
  repositoryPath: RepositoryPath,
): readonly RunRecord[] {
  return registry.runs.filter(
    (record) => record.repositoryPath === repositoryPath,
  );
}

/** The run with the given public ID, or `undefined` when none exists. */
export function findRunById(
  registry: RunRegistry,
  id: RunId,
): RunRecord | undefined {
  return registry.runs.find((record) => record.id === id);
}

/**
 * Register a new run binding. The public ID must be unique; registering an
 * already-known ID is rejected so no two bindings ever share an identity.
 */
export function registerRun(
  registry: RunRegistry,
  record: RunRecord,
): RunRegistry {
  if (findRunById(registry, record.id) !== undefined) {
    throw new Error(`Run ID "${record.id}" is already registered.`);
  }
  return { runs: [...registry.runs, record] };
}

/**
 * Report that a registered run is missing, used before any per-run mutation.
 */
function requireRun(registry: RunRegistry, id: RunId): RunRecord {
  const record = findRunById(registry, id);
  if (record === undefined) {
    throw new Error(`No run registered with ID "${id}".`);
  }
  return record;
}

function replaceRecord(registry: RunRegistry, next: RunRecord): RunRegistry {
  return {
    runs: registry.runs.map((record) =>
      record.id === next.id ? next : record,
    ),
  };
}

/**
 * Update the observer health of a registered run. `changed` is `false` when the
 * new health equals the recorded health, so an idempotent refresh is a no-op.
 */
export function updateWorkerHealth(
  registry: RunRegistry,
  id: RunId,
  health: WorkerHealth,
): RegistryUpdate {
  const record = requireRun(registry, id);
  if (
    record.workerHealth.state === health.state &&
    record.workerHealth.detail === health.detail
  ) {
    return { registry, record, changed: false };
  }
  const next: RunRecord = { ...record, workerHealth: health };
  return {
    registry: replaceRecord(registry, next),
    record: next,
    changed: true,
  };
}

/**
 * Apply a terminal outcome to a registered run through {@link
 * applyTerminalOutcome}. A run that already holds a terminal classification is
 * returned unchanged (`changed: false`); the regression rule lives entirely in
 * the reused helper and is not re-derived here.
 */
export function terminalizeRun(
  registry: RunRegistry,
  id: RunId,
  outcome: TerminalOutcome,
): RegistryUpdate {
  const record = requireRun(registry, id);
  const result = applyTerminalOutcome(record, outcome);
  if (!result.changed) {
    return { registry, record: result.record, changed: false };
  }
  return {
    registry: replaceRecord(registry, result.record),
    record: result.record,
    changed: true,
  };
}
