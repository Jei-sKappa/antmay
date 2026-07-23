// The herdr execution adapter. herdr is invoked strictly as an external program
// through the injectable `ANTMAY_HERDR_BIN` executable and the Task 4
// ProcessRunner, always with an argv array and never a shell string — no herdr
// code is linked or embedded. The adapter maps its six operations onto herdr's
// real CLI: `pane split` creates a pane with the repository cwd and environment,
// `pane run` launches the harness and submits the initial input as one literal
// turn, `pane read`/`pane get`/`pane list` observe, and `terminal attach` joins.
// Pane identifiers are treated as opaque handles. Attachment resolves the
// pane's live terminal identifier immediately before handing the user's TTY to
// herdr. A partial spawn failure after the pane already exists throws a
// diagnostic that names the RETAINED pane so the user can find the orphaned
// session; classification and registry state are never touched here.

import {
  type Adapter,
  type AttachmentHandle,
  asAttachmentHandle,
} from "@antmay/core";
import type {
  ProcessRunner,
  ProcessRunResult,
} from "../process/process-runner";
import type {
  ExecutionAdapter,
  LivenessResult,
  ObservationEnrichments,
  ReadOptions,
  ReadResult,
  SpawnedSession,
  SpawnSpec,
} from "./types";

/** Environment carrying the injectable external herdr executable. */
export type HerdrEnv = {
  readonly ANTMAY_HERDR_BIN?: string | undefined;
};

/** The default program name resolved from `PATH` when no override is set. */
const DEFAULT_HERDR_PROGRAM = "herdr";

/** How long spawn waits for the launched harness to reach an idle prompt. */
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

/**
 * The herdr program name to invoke: the `ANTMAY_HERDR_BIN` override when set to
 * a non-empty value, otherwise the default `herdr` resolved from `PATH`.
 */
export function herdrProgram(env: HerdrEnv = {}): string {
  const override = env.ANTMAY_HERDR_BIN;
  return override !== undefined && override.length > 0
    ? override
    : DEFAULT_HERDR_PROGRAM;
}

/**
 * Resolve and validate the external herdr executable through the ProcessRunner
 * `locate` seam, returning its absolute path or `null` when it is unavailable.
 * This is exposed for a later preflight presence check; it is not wired into any
 * command here.
 */
export function resolveHerdrExecutable(
  runner: ProcessRunner,
  env: HerdrEnv = {},
): string | null {
  return runner.locate(herdrProgram(env));
}

/** Raised when a herdr invocation fails. Carries any retained pane handle. */
export class HerdrAdapterError extends Error {
  /** The pane that survived a partial failure, or `null` when none was created. */
  readonly retainedHandle: AttachmentHandle | null;

  constructor(message: string, retainedHandle: AttachmentHandle | null = null) {
    super(message);
    this.name = "HerdrAdapterError";
    this.retainedHandle = retainedHandle;
  }
}

function describeFailure(result: ProcessRunResult): string {
  const parts: string[] = [];
  if (result.code !== null) {
    parts.push(`exit ${result.code}`);
  }
  const stderr = result.stderr.trim();
  if (stderr.length > 0) {
    parts.push(stderr);
  }
  return parts.length > 0 ? parts.join(": ") : "no output";
}

function tryParseJson(stdout: string): Record<string, unknown> | null {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readNested(
  value: Record<string, unknown> | null,
  ...path: readonly string[]
): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

// The pane id herdr reports for a freshly created pane, read from the documented
// `result.pane.pane_id` shape.
function paneIdFromSplit(stdout: string): string | null {
  const value = readNested(tryParseJson(stdout), "result", "pane", "pane_id");
  return typeof value === "string" && value.length > 0 ? value : null;
}

// The terminal id associated with a live pane, read from `pane get` output.
// herdr's `terminal attach` accepts this id rather than the pane id recorded as
// the durable attachment handle.
function terminalIdFromPane(stdout: string): string | null {
  const value = readNested(
    tryParseJson(stdout),
    "result",
    "pane",
    "terminal_id",
  );
  return typeof value === "string" && value.length > 0 ? value : null;
}

// The advisory agent state herdr reports for a pane, if present.
function agentStateFrom(stdout: string): string | undefined {
  const value = readNested(
    tryParseJson(stdout),
    "result",
    "pane",
    "agent_status",
  );
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function enrichmentsFrom(stdout: string): ObservationEnrichments | undefined {
  const agentState = agentStateFrom(stdout);
  return agentState === undefined ? undefined : { agentState };
}

export type HerdrAdapterOptions = {
  /** Runner that hands the user's TTY to `herdr terminal attach`. */
  readonly interactiveRunner?: ProcessRunner | undefined;
  /** Spawn readiness timeout; tests may override the production default. */
  readonly idleTimeoutMs?: number | undefined;
};

/** The herdr adapter. All external calls go through injected process runners. */
export class HerdrAdapter implements ExecutionAdapter {
  readonly name: Adapter = "herdr";

  private readonly program: string;

  constructor(
    private readonly runner: ProcessRunner,
    env: HerdrEnv = {},
    options: HerdrAdapterOptions = {},
  ) {
    this.program = herdrProgram(env);
    this.interactiveRunner = options.interactiveRunner ?? runner;
    this.idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  }

  private readonly interactiveRunner: ProcessRunner;

  private readonly idleTimeoutMs: number;

  private herdr(args: readonly string[]): ProcessRunResult {
    return this.runner.run(this.program, args);
  }

  spawn(spec: SpawnSpec): SpawnedSession {
    const splitArgs: string[] = [
      "pane",
      "split",
      "--current",
      "--direction",
      "down",
      "--no-focus",
      "--cwd",
      spec.cwd,
    ];
    for (const [key, value] of Object.entries(spec.env)) {
      splitArgs.push("--env", `${key}=${value}`);
    }
    const split = this.herdr(splitArgs);
    if (split.code !== 0) {
      // The pane never came up, so nothing was retained.
      throw new HerdrAdapterError(
        `herdr pane split failed (${describeFailure(split)}).`,
        null,
      );
    }
    const paneId = paneIdFromSplit(split.stdout);
    if (paneId === null) {
      throw new HerdrAdapterError(
        "herdr pane split returned no pane id.",
        null,
      );
    }
    const handle = asAttachmentHandle(paneId);

    // From here on the pane exists; any failure retains it and must be reported
    // with the handle so the user can find the orphaned session.
    if (spec.label !== undefined) {
      const rename = this.herdr(["pane", "rename", paneId, spec.label]);
      if (rename.code !== 0) {
        throw new HerdrAdapterError(
          `herdr pane rename failed (${describeFailure(rename)}).`,
          handle,
        );
      }
    }

    const launch = this.herdr([
      "pane",
      "run",
      paneId,
      [spec.command, ...spec.args].join(" "),
    ]);
    if (launch.code !== 0) {
      throw new HerdrAdapterError(
        `herdr failed to launch the harness in pane ${paneId} (${describeFailure(launch)}).`,
        handle,
      );
    }

    const ready = this.herdr([
      "wait",
      "agent-status",
      paneId,
      "--status",
      "idle",
      "--timeout",
      String(this.idleTimeoutMs),
    ]);
    if (ready.code !== 0) {
      throw new HerdrAdapterError(
        `the harness in pane ${paneId} never reached an idle prompt (${describeFailure(ready)}).`,
        handle,
      );
    }

    const submit = this.herdr(["pane", "run", paneId, spec.initialInput]);
    if (submit.code !== 0) {
      throw new HerdrAdapterError(
        `herdr failed to submit the initial invocation to pane ${paneId} (${describeFailure(submit)}).`,
        handle,
      );
    }

    return { handle, enrichments: enrichmentsFrom(ready.stdout) };
  }

  send(handle: AttachmentHandle, input: string): void {
    const result = this.herdr(["pane", "run", handle, input]);
    if (result.code !== 0) {
      throw new HerdrAdapterError(
        `herdr failed to send input to pane ${handle} (${describeFailure(result)}).`,
        handle,
      );
    }
  }

  read(handle: AttachmentHandle, options?: ReadOptions): ReadResult {
    const args = [
      "pane",
      "read",
      handle,
      "--source",
      options?.source ?? "recent-unwrapped",
    ];
    if (options?.lines !== undefined) {
      args.push("--lines", String(options.lines));
    }
    const result = this.herdr(args);
    if (result.code !== 0) {
      throw new HerdrAdapterError(
        `herdr failed to read pane ${handle} (${describeFailure(result)}).`,
        handle,
      );
    }
    return {
      output: result.stdout,
      enrichments: enrichmentsFrom(result.stdout),
    };
  }

  liveness(handle: AttachmentHandle): LivenessResult {
    const result = this.herdr(["pane", "get", handle]);
    return {
      alive: result.code === 0,
      enrichments:
        result.code === 0 ? enrichmentsFrom(result.stdout) : undefined,
    };
  }

  enumerate(): readonly AttachmentHandle[] {
    const result = this.herdr(["pane", "list"]);
    if (result.code !== 0) {
      return [];
    }
    const panes = readNested(tryParseJson(result.stdout), "result", "panes");
    if (!Array.isArray(panes)) {
      return [];
    }
    const handles: AttachmentHandle[] = [];
    for (const pane of panes) {
      if (typeof pane === "object" && pane !== null) {
        const id = (pane as Record<string, unknown>).pane_id;
        if (typeof id === "string" && id.length > 0) {
          handles.push(asAttachmentHandle(id));
        }
      }
    }
    return handles;
  }

  attach(handle: AttachmentHandle): void {
    const pane = this.herdr(["pane", "get", handle]);
    if (pane.code !== 0) {
      throw new HerdrAdapterError(
        `herdr could not resolve a terminal for pane ${handle} (${describeFailure(pane)}).`,
        handle,
      );
    }
    const terminalId = terminalIdFromPane(pane.stdout);
    if (terminalId === null) {
      throw new HerdrAdapterError(
        `herdr pane ${handle} returned no terminal id.`,
        handle,
      );
    }

    const result = this.interactiveRunner.run(this.program, [
      "terminal",
      "attach",
      terminalId,
    ]);
    if (result.code !== 0) {
      throw new HerdrAdapterError(
        `herdr could not attach to pane ${handle} (${describeFailure(result)}).`,
        handle,
      );
    }
  }
}
