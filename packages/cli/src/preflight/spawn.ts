// Spawn preflight resolution. This composes every spawn input and external
// prerequisite into one NormalizedSpawnRequest before any side effect is
// possible: it creates no pane, writes no registry record, and launches no
// worker. Every failure path returns or throws before those boundaries could be
// reached. The active-run guard is resolved and returned explicitly — this
// module reports whether an active run already exists for the canonical
// repository folder, and the later interactive-confirm / `--force` policy in the
// spawn command decides what to do with it.

import {
  type Adapter,
  type CatalogEntry,
  findCatalogEntry,
  type Harness,
  isTerminalClassification,
  type RepositoryPath,
  type RunRecord,
  type ThreadPath,
  validateRequestPosture,
} from "@antmay/core";
import type { ProcessRunner } from "../process/process-runner";
import { resolveRepositoryRoot } from "./repository";
import {
  resolveSkillAvailability,
  type SkillRootsEnv,
  SkillUnavailableError,
} from "./skill-availability";
import { resolveThread } from "./thread";

/** The fixed v0 adapter value; any other value is a preflight error. */
const REQUIRED_ADAPTER: Adapter = "herdr";

/** A read-only view of the run registry used only to resolve the active guard. */
export interface ActiveRunLookup {
  listForRepository(repositoryPath: RepositoryPath): readonly RunRecord[];
}

/** Environment consumed by preflight: skill roots plus harness executables. */
export type SpawnPreflightEnv = SkillRootsEnv & {
  readonly ANTMAY_CLAUDE_BIN?: string | undefined;
  readonly ANTMAY_CODEX_BIN?: string | undefined;
};

/** The raw, pre-resolution spawn inputs. */
export type SpawnPreflightInput = {
  readonly cwd: string;
  readonly thread: string;
  readonly skill: string;
  readonly harness: Harness;
  readonly adapter: string;
  readonly request?: string | undefined;
  readonly runner: ProcessRunner;
  readonly activeRuns: ActiveRunLookup;
  readonly env?: SpawnPreflightEnv;
};

/**
 * The active-run guard result. `hasActiveRun` reflects whether any non-terminal
 * run is already recorded for the canonical repository folder; `activeRuns`
 * carries those records for the policy layer to report. Terminal runs and runs
 * for a different repository folder never appear here.
 */
export type ActiveRunGuard = {
  readonly hasActiveRun: boolean;
  readonly activeRuns: readonly RunRecord[];
};

/**
 * The fully resolved, side-effect-free launch request. Every field has been
 * validated; producing this value is the sole successful outcome of preflight.
 */
export type NormalizedSpawnRequest = {
  readonly repositoryPath: RepositoryPath;
  readonly threadPath: ThreadPath;
  readonly skill: CatalogEntry;
  readonly harness: Harness;
  readonly adapter: Adapter;
  readonly request: string | null;
  readonly harnessExecutable: string;
  readonly skillDir: string;
  readonly activeRunGuard: ActiveRunGuard;
};

/** Raised on any invalid spawn input that is not a more specific resolution error. */
export class SpawnPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpawnPreflightError";
  }
}

function harnessProgram(harness: Harness, env: SpawnPreflightEnv): string {
  if (harness === "claude") {
    const override = env.ANTMAY_CLAUDE_BIN;
    return override !== undefined && override.length > 0 ? override : "claude";
  }
  const override = env.ANTMAY_CODEX_BIN;
  return override !== undefined && override.length > 0 ? override : "codex";
}

/**
 * Resolve every spawn prerequisite into a {@link NormalizedSpawnRequest}. Order
 * is deliberate: the canonical repository, then the fixed adapter value, catalog
 * membership, request posture, the exact thread, harness-specific skill
 * availability, the harness executable, and finally the active-run guard. Any
 * failure returns before the guard is queried and before any pane, registry
 * write, or worker launch could occur.
 */
export function preflightSpawn(
  input: SpawnPreflightInput,
): NormalizedSpawnRequest {
  const env = input.env ?? {};

  const repositoryPath = resolveRepositoryRoot(input.cwd, input.runner);

  if (input.adapter !== REQUIRED_ADAPTER) {
    throw new SpawnPreflightError(
      `Unsupported adapter "${input.adapter}"; v0 supports only "${REQUIRED_ADAPTER}".`,
    );
  }
  const adapter: Adapter = REQUIRED_ADAPTER;

  const skill = findCatalogEntry(input.skill);
  if (skill === undefined) {
    throw new SpawnPreflightError(
      `Unknown catalog skill "${input.skill}"; --skill must name a supported catalog entry.`,
    );
  }

  const posture = validateRequestPosture(skill, input.request);
  if (!posture.ok) {
    throw new SpawnPreflightError(posture.reason);
  }

  const threadPath = resolveThread({
    threadArg: input.thread,
    repositoryPath,
  });

  const availability = resolveSkillAvailability({
    harness: input.harness,
    skill: skill.name,
    repositoryPath,
    env,
  });
  if (!availability.available) {
    throw new SkillUnavailableError(availability);
  }

  const program = harnessProgram(input.harness, env);
  const harnessExecutable = input.runner.locate(program);
  if (harnessExecutable === null) {
    throw new SpawnPreflightError(
      `The ${input.harness} harness executable "${program}" was not found on PATH.`,
    );
  }

  const activeRuns = input.activeRuns
    .listForRepository(repositoryPath)
    .filter((record) => !isTerminalClassification(record.classification));

  return {
    repositoryPath,
    threadPath,
    skill,
    harness: input.harness,
    adapter,
    request: input.request ?? null,
    harnessExecutable,
    skillDir: availability.skillDir,
    activeRunGuard: {
      hasActiveRun: activeRuns.length > 0,
      activeRuns,
    },
  };
}
