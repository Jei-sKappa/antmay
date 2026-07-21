// The private observer worker. This is a package-internal entry point, NOT a
// public `antmay` command: it is packaged as `dist/worker.js`, is never added to
// Commander or `bin`, and never appears in `antmay --help`. It receives exactly
// one run's identity through the package-internal run-ID contract (the
// `ANTMAY_WORKER_RUN_ID` environment entry, or the first positional argument as
// a fallback), monitors only that run with bounded backoff, writes heartbeat and
// health/diagnostic data under the state root, and exits after the run reaches a
// terminal or `unknown` classification. It survives its spawning CLI because the
// launcher detaches it; nothing here keeps a timer or handle alive past the
// observed run's finalization.

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  asRunId,
  isTerminalClassification,
  type RunId,
  type RunRecord,
} from "@antmay/core";
import { HerdrAdapter } from "./adapters/herdr";
import type { HarnessObservationEnv } from "./harnesses/index";
import {
  type ReconcileRunDeps,
  type ReconcileRunResult,
  type RunEvidenceReader,
  reconcileRun,
} from "./observer/reconcile-run";
import { NodeProcessRunner } from "./process/process-runner";
import {
  FilesystemRegistryStore,
  type WorkerOperationalRecord,
} from "./state/registry-store";
import { resolveStateRoot } from "./state/root";
import {
  readClaudeTranscriptEvidence,
  readCodexTranscriptEvidence,
  unavailableEvidence,
} from "./transcripts";
import { CODEX_SPAWNED_AT_MS_ENV, WORKER_RUN_ID_ENV } from "./worker-env";

export { CODEX_SPAWNED_AT_MS_ENV, WORKER_RUN_ID_ENV } from "./worker-env";

// Read the recorded Codex spawn time from the worker environment, defaulting to
// 0 when it is absent or unparseable so the discovery heuristic falls back to its
// recorded-cwd filter and most-recently-modified tiebreak.
function readCodexSpawnedAtMs(env: HarnessObservationEnv): number {
  const raw = (env as Record<string, string | undefined>)[
    CODEX_SPAWNED_AT_MS_ENV
  ];
  if (raw === undefined || raw.length === 0) {
    return 0;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** The package-internal contract by which the worker learns its one run. */
export type WorkerInvocation = {
  readonly argv: readonly string[];
  readonly env: NodeJS.ProcessEnv;
};

/**
 * Resolve the single run ID this worker observes from the package-internal
 * contract: the `ANTMAY_WORKER_RUN_ID` environment entry, falling back to the
 * first positional argument. A missing identity is a hard error.
 */
export function resolveWorkerRunId(invocation: WorkerInvocation): RunId {
  const fromEnv = invocation.env[WORKER_RUN_ID_ENV];
  const raw =
    fromEnv !== undefined && fromEnv.length > 0 ? fromEnv : invocation.argv[2];
  if (raw === undefined || raw.length === 0) {
    throw new Error(
      `The observer worker requires a run ID via ${WORKER_RUN_ID_ENV} or the first argument.`,
    );
  }
  return asRunId(raw);
}

/** Bounded-backoff polling configuration. */
export type BackoffConfig = {
  /** The delay before the first re-poll, in milliseconds. */
  readonly baseMs: number;
  /** The multiplier applied after each non-terminal poll. */
  readonly factor: number;
  /** The maximum delay between polls, in milliseconds. */
  readonly maxMs: number;
};

const DEFAULT_BACKOFF: BackoffConfig = {
  baseMs: 500,
  factor: 2,
  maxMs: 15_000,
};

/** The collaborators the observation loop composes over. */
export type ObserveDeps = ReconcileRunDeps & {
  /** Wait the given number of milliseconds before the next poll. */
  readonly sleep: (ms: number) => Promise<void>;
  /** The current wall-clock time source, in epoch milliseconds. */
  readonly now: () => number;
  /** Backoff overrides; defaults are used for any omitted field. */
  readonly backoff?: Partial<BackoffConfig>;
  /**
   * A hard cap on poll iterations. Left `undefined` in production so the worker
   * runs until finalization; tests set it to bound a non-terminal scenario.
   */
  readonly maxPolls?: number;
};

function heartbeatRecord(
  runId: RunId,
  result: ReconcileRunResult,
  atMs: number,
): WorkerOperationalRecord {
  const record: RunRecord = result.record;
  return {
    runId,
    heartbeatAt: new Date(atMs).toISOString(),
    health: result.health,
    diagnostic: result.diagnostic,
    tailCursor: null,
    session: record.session,
    adapter: "herdr",
    attachHandle: record.attachment.handle,
  };
}

/**
 * Observe exactly one run until it finalizes. Each poll reconciles the run,
 * writes a heartbeat with the latest health/diagnostic, and — when the run is
 * still active — waits a bounded, growing delay before the next poll. Returns
 * the terminal reconciliation result. Terminalization stops only this observer;
 * it never touches the retained harness pane.
 */
export async function observeRun(
  runId: RunId,
  deps: ObserveDeps,
): Promise<ReconcileRunResult> {
  const backoff: BackoffConfig = { ...DEFAULT_BACKOFF, ...deps.backoff };
  let delay = backoff.baseMs;
  let polls = 0;
  for (;;) {
    const result = reconcileRun(runId, deps);
    deps.store.writeWorkerRecord(
      result.record.repositoryPath,
      heartbeatRecord(runId, result, deps.now()),
    );
    if (
      result.terminalized ||
      isTerminalClassification(result.record.classification)
    ) {
      return result;
    }
    polls += 1;
    if (deps.maxPolls !== undefined && polls >= deps.maxPolls) {
      return result;
    }
    await deps.sleep(delay);
    delay = Math.min(delay * backoff.factor, backoff.maxMs);
  }
}

// Build a transcript-evidence reader for the observed run from the injectable
// observation roots. Claude reads its pinned transcript by session id under the
// configured transcript root; Codex discovers its rollout under the configured
// session root. When a required root or identity is absent the evidence is
// transiently unavailable, which keeps the run active.
function buildEvidenceReader(env: HarnessObservationEnv): RunEvidenceReader {
  return (record: RunRecord): ReturnType<RunEvidenceReader> => {
    if (record.harness === "claude") {
      const root = env.ANTMAY_CLAUDE_TRANSCRIPT_ROOT;
      const sessionId = record.session.id;
      if (root === undefined || root.length === 0 || sessionId === null) {
        return unavailableEvidence(
          "No Claude transcript root or pinned session id is available yet.",
        );
      }
      return readClaudeTranscriptEvidence({
        transcriptPath: join(root, `${sessionId}.jsonl`),
        repositoryPath: record.repositoryPath,
        sessionId,
      });
    }
    const root = env.ANTMAY_CODEX_SESSION_ROOT;
    if (root === undefined || root.length === 0) {
      return unavailableEvidence("No Codex session root is available yet.");
    }
    return readCodexTranscriptEvidence({
      sessionRoot: root,
      repositoryPath: record.repositoryPath,
      spawnedAtMs: readCodexSpawnedAtMs(env),
    });
  };
}

/** Assemble the production observation dependencies from the environment. */
function productionDeps(env: NodeJS.ProcessEnv): ObserveDeps {
  const store = new FilesystemRegistryStore(resolveStateRoot(env));
  const adapter = new HerdrAdapter(new NodeProcessRunner(env), env);
  return {
    store,
    adapter,
    readEvidence: buildEvidenceReader(env),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  };
}

async function main(invocation: WorkerInvocation): Promise<void> {
  const runId = resolveWorkerRunId(invocation);
  await observeRun(runId, productionDeps(invocation.env));
}

// Run only when executed directly as the packaged worker module, never when
// imported by a test. Node resolves `import.meta.url` to the running file, so
// this comparison is true only for `node dist/worker.js`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main({ argv: process.argv, env: process.env }).then(
    () => {
      process.exitCode = 0;
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`observer worker error: ${message}\n`);
      process.exitCode = 1;
    },
  );
}
