// The `antmay spawn` command: the complete interactive and non-interactive
// launch transaction from input gathering through a durable pane, run binding,
// observer startup, and optional attachment.
//
// The command layer resolves every input first — gathering missing thread,
// skill, harness, and adapter values only on an interactive terminal, prompting
// for a request only when the selected catalog entry requires one, and asking to
// confirm an additional run only when the active-run guard triggers. With a full
// set of flags it never prompts. On a non-interactive stream a missing required
// value, an empty required request, a forbidden `--request`, or an unconfirmed
// active-run guard fails before any side effect, naming the flag to pass.
//
// Only after a side-effect-free preflight — which validates the repository,
// thread, catalog, request posture, skill installation, and harness executable —
// and the herdr executable presence check does the transaction run its three
// durable steps IN ORDER: (1) launch the harness pane, (2) register the complete
// run binding, (3) start the detached observer worker. Success is reported only
// once all three exist. If registration or worker startup fails after the pane
// was created, the command fails non-zero, names the retained pane, and never
// touches or closes it. `--attach` joins that pane through the same operation
// `antmay attach` uses, only after registration and worker startup succeed.

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  type AttachmentHandle,
  asRunId,
  findCatalogEntry,
  type Harness,
  type RunId,
  type RunRecord,
} from "@antmay/core";
import type { Command } from "@commander-js/extra-typings";
import {
  HerdrAdapter,
  herdrProgram,
  resolveHerdrExecutable,
} from "../adapters/herdr";
import type { ExecutionAdapter } from "../adapters/types";
import { attachRun } from "../attach/operation";
import {
  type LaunchRequest,
  launchHarness,
  type ObservationBinding,
} from "../harnesses/index";
import { launchObserver } from "../observer/worker-launcher";
import {
  type ActiveRunLookup,
  type NormalizedSpawnRequest,
  preflightSpawn,
  SpawnPreflightError,
} from "../preflight/spawn";
import {
  NodeProcessRunner,
  type ProcessRunner,
  type ProcessRunOptions,
  type ProcessRunResult,
} from "../process/process-runner";
import {
  type PromptField,
  type PromptProvider,
  TerminalPromptProvider,
} from "../prompts";
import { FilesystemRegistryStore } from "../state/registry-store";
import { resolveStateRoot } from "../state/root";
import { CODEX_SPAWNED_AT_MS_ENV } from "../worker-env";

/** The parsed spawn flags. Every value is optional so any may be prompted. */
export type SpawnOptions = {
  readonly thread?: string | undefined;
  readonly skill?: string | undefined;
  readonly harness?: string | undefined;
  readonly adapter?: string | undefined;
  readonly request?: string | undefined;
  readonly attach?: boolean | undefined;
  readonly force?: boolean | undefined;
};

/** The registry surface spawn needs: the active-run lookup plus registration. */
export interface SpawnRegistry extends ActiveRunLookup {
  register(record: RunRecord): RunRecord;
}

/** Every injectable seam of the spawn transaction. Production wires real ones. */
export type SpawnDeps = {
  /** The invocation directory used to resolve the repository. */
  readonly cwd: string;
  /** The environment consulted for skill roots, executables, and state root. */
  readonly env: NodeJS.ProcessEnv;
  /** The process boundary for git, executable lookup, and the adapter. */
  readonly runner: ProcessRunner;
  /** The transient-prompt boundary. */
  readonly prompt: PromptProvider;
  /** The run registry. */
  readonly store: SpawnRegistry;
  /** The adapter that creates the pane. */
  readonly adapter: ExecutionAdapter;
  /** The adapter used to join the pane interactively for `--attach`. */
  readonly attachAdapter: ExecutionAdapter;
  /** Where success output is written; defaults to stdout. */
  readonly write?: ((message: string) => void) | undefined;
  /** Preflight resolver; defaults to {@link preflightSpawn}. */
  readonly preflight?: typeof preflightSpawn | undefined;
  /** herdr presence resolver; defaults to {@link resolveHerdrExecutable}. */
  readonly resolveHerdr?: typeof resolveHerdrExecutable | undefined;
  /** Harness launcher; defaults to {@link launchHarness}. */
  readonly launchHarness?: typeof launchHarness | undefined;
  /** Observer launcher; defaults to {@link launchObserver}. */
  readonly launchObserver?: typeof launchObserver | undefined;
  /** Attachment operation; defaults to {@link attachRun}. */
  readonly attachRun?: typeof attachRun | undefined;
  /** Deterministic run-ID source; defaults to a random UUID. */
  readonly generateRunId?: (() => RunId) | undefined;
  /** Deterministic Claude session-ID source; forwarded to the launcher. */
  readonly generateSessionId?: (() => string) | undefined;
  /** Deterministic spawn-time source; forwarded to the launcher. */
  readonly now?: (() => number) | undefined;
};

/** The outcome of a successful spawn transaction. */
export type SpawnResult = {
  readonly runId: RunId;
  readonly handle: AttachmentHandle;
  readonly attached: boolean;
};

/** Raised when required input is missing, rejected, or unconfirmed. */
export class SpawnInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpawnInputError";
  }
}

/**
 * Raised when a step after pane creation fails. Carries the retained pane handle
 * so the diagnostic can point the user at the orphaned session; the pane is
 * never closed or mutated.
 */
export class RetainedPaneError extends Error {
  readonly retainedHandle: AttachmentHandle;

  constructor(handle: AttachmentHandle, message: string) {
    super(message);
    this.name = "RetainedPaneError";
    this.retainedHandle = handle;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function defaultGenerateRunId(): RunId {
  return asRunId(randomUUID());
}

function coerceHarness(value: string): Harness {
  if (value === "claude" || value === "codex") {
    return value;
  }
  throw new SpawnInputError(
    `Unsupported harness "${value}"; --harness must be "claude" or "codex".`,
  );
}

// Resolve one required scalar input. A provided non-blank flag wins; otherwise a
// prompt is attempted only on an interactive terminal; otherwise the command
// fails naming the exact flag before any side effect.
async function requireValue(
  value: string | undefined,
  field: PromptField,
  flag: string,
  interactive: boolean,
  prompt: PromptProvider,
): Promise<string> {
  const provided = value?.trim();
  if (provided !== undefined && provided.length > 0) {
    return provided;
  }
  if (interactive) {
    const gathered = (await prompt.gather(field, {})).trim();
    if (gathered.length === 0) {
      throw new SpawnInputError(`No ${field} was provided; pass ${flag}.`);
    }
    return gathered;
  }
  throw new SpawnInputError(`Missing required input; pass ${flag}.`);
}

// Layer the observation config the detached worker needs onto the base env: the
// Claude transcript root, or the Codex session root and recorded spawn time.
function observerEnv(
  base: NodeJS.ProcessEnv,
  observation: ObservationBinding,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base };
  if (observation.kind === "claude") {
    if (observation.transcriptRoot !== null) {
      env.ANTMAY_CLAUDE_TRANSCRIPT_ROOT = observation.transcriptRoot;
    }
    return env;
  }
  if (observation.sessionRoot !== null) {
    env.ANTMAY_CODEX_SESSION_ROOT = observation.sessionRoot;
  }
  env[CODEX_SPAWNED_AT_MS_ENV] = String(observation.spawnedAtMs);
  return env;
}

function successMessage(
  runId: RunId,
  handle: AttachmentHandle,
  normalized: NormalizedSpawnRequest,
): string {
  return [
    `Launched run ${runId}.`,
    `  repository: ${normalized.repositoryPath}`,
    `  thread:     ${normalized.threadPath}`,
    `  skill:      ${normalized.skill.name} (${normalized.harness}, ${normalized.adapter})`,
    `  pane:       ${handle}`,
    `  attach:     antmay attach ${runId}`,
    "",
  ].join("\n");
}

/**
 * Run the full spawn transaction. Resolves and validates every input, runs the
 * side-effect-free preflight and the herdr presence check, then — and only then
 * — launches the pane, registers the binding, and starts the observer in that
 * order. Returns only after all three durable components exist; throws before any
 * side effect on rejected input, and throws a {@link RetainedPaneError} naming
 * the pane when a post-pane step fails.
 */
export async function runSpawn(
  options: SpawnOptions,
  deps: SpawnDeps,
): Promise<SpawnResult> {
  const interactive = deps.prompt.isInteractive();

  const thread = await requireValue(
    options.thread,
    "thread",
    "--thread <thread>",
    interactive,
    deps.prompt,
  );
  const skill = await requireValue(
    options.skill,
    "skill",
    "--skill <catalog-name>",
    interactive,
    deps.prompt,
  );
  const harness = coerceHarness(
    await requireValue(
      options.harness,
      "harness",
      "--harness <claude|codex>",
      interactive,
      deps.prompt,
    ),
  );
  const adapter = await requireValue(
    options.adapter,
    "adapter",
    "--adapter herdr",
    interactive,
    deps.prompt,
  );

  // A request is prompted for only when the selected catalog entry requires one
  // and none was supplied; optional and forbidden postures never prompt.
  let request = options.request;
  const entry = findCatalogEntry(skill);
  if (
    entry?.requestPosture === "required" &&
    (request === undefined || request.trim().length === 0)
  ) {
    if (interactive) {
      request = await deps.prompt.gather("request", { skill });
    } else {
      throw new SpawnInputError(
        `The "${skill}" skill requires a request; pass --request <text>.`,
      );
    }
  }

  // Side-effect-free preflight: repository, adapter, catalog, posture, thread,
  // skill installation, harness executable, and the active-run guard. It creates
  // no pane, writes no record, and launches no worker.
  const preflight = deps.preflight ?? preflightSpawn;
  const normalized = preflight({
    cwd: deps.cwd,
    thread,
    skill,
    harness,
    adapter,
    request,
    runner: deps.runner,
    activeRuns: deps.store,
    env: deps.env,
  });

  // herdr executable presence — validated before any launch side effect.
  const resolveHerdr = deps.resolveHerdr ?? resolveHerdrExecutable;
  if (resolveHerdr(deps.runner, deps.env) === null) {
    throw new SpawnPreflightError(
      `The herdr executable "${herdrProgram(deps.env)}" was not found on PATH; install herdr or set ANTMAY_HERDR_BIN before spawning.`,
    );
  }

  // Active-run guard: scoped by canonical repository folder; terminal runs never
  // appear here. `--force` permits an additional record without touching prior
  // runs; interactive invocations confirm; non-interactive ones fail.
  const guard = normalized.activeRunGuard;
  if (guard.hasActiveRun && options.force !== true) {
    const ids = guard.activeRuns.map((run) => run.id);
    if (interactive) {
      const confirmed = await deps.prompt.confirmAdditionalRun(ids);
      if (!confirmed) {
        throw new SpawnInputError(
          `Spawn cancelled: an active run already exists for this repository (${ids.join(", ")}).`,
        );
      }
    } else {
      throw new SpawnInputError(
        `An active run already exists for this repository (${ids.join(", ")}); re-run with --force to launch an additional run.`,
      );
    }
  }

  const launchRequest: LaunchRequest = {
    skill: normalized.skill,
    harness: normalized.harness,
    repositoryPath: normalized.repositoryPath,
    threadPath: normalized.threadPath,
    request: normalized.request,
    harnessExecutable: normalized.harnessExecutable,
    env: deps.env,
    generateSessionId: deps.generateSessionId,
    now: deps.now,
  };

  // (1) Launch the harness pane. An adapter failure propagates unchanged so its
  // own retained-pane diagnostic (when a pane came up before a later adapter step
  // failed) survives; nothing is registered and no worker starts.
  const doLaunch = deps.launchHarness ?? launchHarness;
  const launch = doLaunch(deps.adapter, launchRequest);

  const generateRunId = deps.generateRunId ?? defaultGenerateRunId;
  const runId = generateRunId();
  const record: RunRecord = {
    id: runId,
    repositoryPath: normalized.repositoryPath,
    threadPath: normalized.threadPath,
    skill: normalized.skill.name,
    harness: normalized.harness,
    adapter: normalized.adapter,
    session: launch.session,
    attachment: { available: true, handle: launch.handle },
    classification: "active",
    reason: null,
    workerHealth: { state: "healthy", detail: null },
  };

  // (2) Register the complete binding. A failure here retains the pane.
  try {
    deps.store.register(record);
  } catch (error) {
    throw new RetainedPaneError(
      launch.handle,
      `The harness pane ${launch.handle} is running, but registering run ${runId} failed: ${messageOf(error)}. The pane was left untouched; attach to it or close it manually.`,
    );
  }

  // (3) Start the detached observer worker. A failure here also retains the pane.
  const startObserver = deps.launchObserver ?? launchObserver;
  try {
    startObserver(runId, {
      env: observerEnv(deps.env, launch.observation),
    });
  } catch (error) {
    throw new RetainedPaneError(
      launch.handle,
      `Run ${runId} is registered and its harness pane ${launch.handle} is running, but starting the observer worker failed: ${messageOf(error)}. The pane was left untouched; attach to it manually.`,
    );
  }

  const write =
    deps.write ??
    ((message: string): void => {
      process.stdout.write(message);
    });

  // `--attach` joins the pane through the shared attach operation, only now that
  // registration and worker startup have both succeeded.
  if (options.attach === true) {
    write(`Launched run ${runId}; attaching to pane ${launch.handle}.\n`);
    const doAttach = deps.attachRun ?? attachRun;
    doAttach(deps.attachAdapter, launch.handle);
    return { runId, handle: launch.handle, attached: true };
  }

  write(successMessage(runId, launch.handle, normalized));
  return { runId, handle: launch.handle, attached: false };
}

// A process boundary that hands the real terminal to the child instead of
// capturing its output, so `spawn --attach` joins the pane interactively.
// Executable lookup delegates to the standard captured runner.
class InteractiveProcessRunner implements ProcessRunner {
  private readonly locator: NodeProcessRunner;

  constructor(env: NodeJS.ProcessEnv) {
    this.locator = new NodeProcessRunner(env);
  }

  run(
    program: string,
    args: readonly string[],
    options?: ProcessRunOptions,
  ): ProcessRunResult {
    const result = spawnSync(program, [...args], {
      cwd: options?.cwd,
      stdio: "inherit",
      shell: false,
    });
    if (result.error !== undefined) {
      return { code: null, stdout: "", stderr: result.error.message };
    }
    return { code: result.status, stdout: "", stderr: "" };
  }

  locate(program: string): string | null {
    return this.locator.locate(program);
  }
}

/** Assemble the production spawn dependencies from the real environment. */
export function createProductionSpawnDeps(
  cwd: string,
  env: NodeJS.ProcessEnv,
): SpawnDeps {
  const runner = new NodeProcessRunner(env);
  return {
    cwd,
    env,
    runner,
    prompt: new TerminalPromptProvider(),
    store: new FilesystemRegistryStore(resolveStateRoot(env)),
    adapter: new HerdrAdapter(runner, env),
    attachAdapter: new HerdrAdapter(new InteractiveProcessRunner(env), env),
  };
}

/**
 * Register the `antmay spawn` command on the program. Every value flag is
 * optional at the parser level so an interactive terminal can prompt for missing
 * ones; the exact non-interactive command shape is preserved.
 */
export function registerSpawnCommand(program: Command): void {
  program
    .command("spawn")
    .description("Launch a supported Antmay skill run in a herdr pane")
    .option(
      "--thread <thread>",
      "Active thread: folder name, docs/threads/<name>, or absolute root",
    )
    .option("--skill <catalog-name>", "Supported catalog skill to invoke")
    .option("--harness <claude|codex>", "Harness to launch")
    .option("--adapter <herdr>", "Execution adapter (v0 supports only herdr)")
    .option(
      "--request <text>",
      "Literal request text for skills that permit or require one",
    )
    .option("--attach", "Attach to the new pane after a successful launch")
    .option("--force", "Permit an additional active run for this repository")
    .action(async (options) => {
      await runSpawn(
        options,
        createProductionSpawnDeps(process.cwd(), process.env),
      );
    });
}
