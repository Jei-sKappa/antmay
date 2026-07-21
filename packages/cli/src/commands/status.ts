// The `antmay status` command: reconcile and report repository-scoped or global
// runs plus independent pending-bundle attention through faithful human and
// exact JSON projections.
//
// Without `--all`, the command requires the current git worktree and reports
// only that canonical folder's runs; with `--all` it enumerates every
// repository folder known to the home-state registry. Before any output it
// reconciles every scoped run against current transcript and endpoint evidence
// and, for a still-active run whose observation is stale or degraded, relaunches
// that run's detached observer WITHOUT creating a second run. It builds exactly
// one canonical projection: `--json` prints that {@link StatusDocumentV1} as a
// single JSON document on stdout with diagnostics on stderr, while the default
// human rendering reads the same document, so the two can never disagree.

import {
  allScope,
  type RepositoryPath,
  type RunRecord,
  repositoryScope,
  type StatusScope,
  type ThreadPendingCounts,
} from "@antmay/core";
import type { Command } from "@commander-js/extra-typings";
import { HerdrAdapter } from "../adapters/herdr";
import type { ExecutionAdapter } from "../adapters/types";
import type { HarnessObservationEnv } from "../harnesses/index";
import {
  type EnsureObserverDeps,
  type EnsureObserverResult,
  ensureObserver,
} from "../observer/ensure-observer";
import {
  type ReconcileRunDeps,
  type ReconcileRunResult,
  type RunEvidenceReader,
  reconcileRun,
} from "../observer/reconcile-run";
import { resolveRepositoryRoot } from "../preflight/repository";
import {
  NodeProcessRunner,
  type ProcessRunner,
} from "../process/process-runner";
import { FilesystemRegistryStore } from "../state/registry-store";
import { resolveStateRoot } from "../state/root";
import { scanAttention } from "../status/attention-scan";
import { formatStatusHuman } from "../status/format-human";
import { buildStatusProjection } from "../status/project";
import {
  readClaudeTranscriptEvidence,
  readCodexTranscriptEvidence,
  unavailableEvidence,
} from "../transcripts";
import { CODEX_SPAWNED_AT_MS_ENV } from "../worker-env";

/** The parsed status flags. */
export type StatusOptions = {
  readonly all?: boolean | undefined;
  readonly json?: boolean | undefined;
};

/** Every injectable seam of the status command. Production wires real ones. */
export type StatusDeps = {
  /** The invocation directory used to resolve the repository in scope. */
  readonly cwd: string;
  /** The process boundary used to resolve the git worktree root. */
  readonly runner: ProcessRunner;
  /** List the runs bound to one canonical repository folder. */
  readonly listForRepository: (
    repositoryPath: RepositoryPath,
  ) => readonly RunRecord[];
  /** List every run across every repository folder known to the state root. */
  readonly listAll: () => readonly RunRecord[];
  /** Reconcile one run against current transcript and endpoint evidence. */
  readonly reconcile: (record: RunRecord) => ReconcileRunResult;
  /** Restore observation for a still-active run whose worker is stale/degraded. */
  readonly ensureObserver: (record: RunRecord) => EnsureObserverResult;
  /** Scan the given repositories' active thread roots for pending bundles. */
  readonly scanAttention: (
    repositoryPaths: readonly RepositoryPath[],
  ) => readonly ThreadPendingCounts[];
  /** Repository resolver; defaults to {@link resolveRepositoryRoot}. */
  readonly resolveRepository?:
    | ((cwd: string, runner: ProcessRunner) => RepositoryPath)
    | undefined;
  /** Where the primary report is written; production uses stdout. */
  readonly writeOut: (message: string) => void;
  /** Where diagnostics are written; production uses stderr. */
  readonly writeErr: (message: string) => void;
};

function uniqueRepositoryPaths(runs: readonly RunRecord[]): RepositoryPath[] {
  const seen = new Set<string>();
  const repositories: RepositoryPath[] = [];
  for (const run of runs) {
    if (seen.has(run.repositoryPath)) {
      continue;
    }
    seen.add(run.repositoryPath);
    repositories.push(run.repositoryPath);
  }
  return repositories;
}

/**
 * Reconcile and report the scoped runs and independent attention. Resolves the
 * scope, reconciles every scoped run (restoring stale active observation),
 * scans the scoped repositories' active thread roots, and renders exactly one
 * canonical projection: a single JSON document on stdout under `--json`, or the
 * human rendering of the same document otherwise. Diagnostics always go to the
 * diagnostic stream, never onto the JSON stdout.
 */
export function runStatus(options: StatusOptions, deps: StatusDeps): void {
  let scope: StatusScope;
  let runs: readonly RunRecord[];
  let repositories: readonly RepositoryPath[];

  if (options.all === true) {
    scope = allScope();
    runs = deps.listAll();
    repositories = uniqueRepositoryPaths(runs);
  } else {
    const resolve = deps.resolveRepository ?? resolveRepositoryRoot;
    const repositoryPath = resolve(deps.cwd, deps.runner);
    scope = repositoryScope(repositoryPath);
    runs = deps.listForRepository(repositoryPath);
    repositories = [repositoryPath];
  }

  const attention = deps.scanAttention(repositories);
  const projection = buildStatusProjection({
    scope,
    runs,
    reconcile: deps.reconcile,
    ensureObserver: deps.ensureObserver,
    attention,
  });

  for (const diagnostic of projection.diagnostics) {
    deps.writeErr(`${diagnostic}\n`);
  }

  if (options.json === true) {
    deps.writeOut(`${JSON.stringify(projection.document, null, 2)}\n`);
    return;
  }
  deps.writeOut(formatStatusHuman(projection.document));
}

// Build the transcript-evidence reader `status` reconciliation composes over.
// Claude reads its pinned transcript by session id under the configured
// transcript root; Codex discovers its rollout under the configured session
// root. When a required root or identity is absent the evidence is transiently
// unavailable, which keeps an unended run active rather than terminalizing it.
function buildEvidenceReader(env: HarnessObservationEnv): RunEvidenceReader {
  const spawnedAtMs = ((): number => {
    const raw = (env as Record<string, string | undefined>)[
      CODEX_SPAWNED_AT_MS_ENV
    ];
    if (raw === undefined || raw.length === 0) {
      return 0;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  })();
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
        transcriptPath: `${root}/${sessionId}.jsonl`,
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
      spawnedAtMs,
    });
  };
}

/** Assemble the production status dependencies from the real environment. */
export function createProductionStatusDeps(
  cwd: string,
  env: NodeJS.ProcessEnv,
): StatusDeps {
  const runner = new NodeProcessRunner(env);
  const store = new FilesystemRegistryStore(resolveStateRoot(env));
  const adapter: ExecutionAdapter = new HerdrAdapter(runner, env);
  const reconcileDeps: ReconcileRunDeps = {
    store,
    adapter,
    readEvidence: buildEvidenceReader(env),
  };
  const ensureDeps: EnsureObserverDeps = { store, now: () => Date.now() };
  return {
    cwd,
    runner,
    listForRepository: (repositoryPath) =>
      store.listForRepository(repositoryPath),
    listAll: () => store.listAll(),
    reconcile: (record) => reconcileRun(record.id, reconcileDeps),
    ensureObserver: (record) => ensureObserver(record.id, ensureDeps),
    scanAttention: (repositoryPaths) => scanAttention(repositoryPaths),
    writeOut: (message) => {
      process.stdout.write(message);
    },
    writeErr: (message) => {
      process.stderr.write(message);
    },
  };
}

/** Register the `antmay status` command on the program. */
export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Reconcile and report Antmay runs")
    .option("--all", "Report runs for every repository known to the registry")
    .option(
      "--json",
      "Emit exactly one StatusDocumentV1 JSON document on stdout",
    )
    .action((options) => {
      runStatus(
        options,
        createProductionStatusDeps(process.cwd(), process.env),
      );
    });
}
