// The `antmay attach [run-id]` command: join the retained pane of an explicitly
// or contextually selected run without restarting work or mutating registry
// state.
//
// An explicit id resolves globally through the registry and attaches without
// prompting. With the id omitted the command resolves the cwd repository, filters
// its runs to the panes the adapter positively reports attachable, attaches the
// sole candidate directly, and — only on an interactive terminal — presents a
// transient picker when several candidates exist; zero candidates or a
// non-interactive tie fails with an exact `antmay attach <run-id>` re-invocation
// hint and never chooses by recency. Both active runs and terminal runs whose
// retained pane is still live are attachable.
//
// Attachment delegates through the record's recorded adapter and opaque handle
// with the SAME operation `spawn --attach` uses. Because that operation takes no
// registry store, a missing run or an unavailable pane fails non-zero while every
// byte of the registry record — classification, reason, handle, worker data, and
// all else — is left exactly as it was. Attaching never restarts the harness,
// sends input, resolves pending bundles, creates another run, or cleans, expires,
// or closes any pane.

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import {
  type AttachmentHandle,
  asRunId,
  type RepositoryPath,
  type RunId,
  type RunRecord,
} from "@antmay/core";
import type { Command } from "@commander-js/extra-typings";
import { HerdrAdapter } from "../adapters/herdr";
import type { ExecutionAdapter } from "../adapters/types";
import { attachRun } from "../attach/operation";
import {
  type AttachCandidate,
  selectContextualRun,
} from "../attach/select-run";
import { resolveRepositoryRoot } from "../preflight/repository";
import {
  NodeProcessRunner,
  type ProcessRunner,
  type ProcessRunOptions,
  type ProcessRunResult,
} from "../process/process-runner";
import { TerminalPromptProvider } from "../prompts";
import { FilesystemRegistryStore } from "../state/registry-store";
import { resolveStateRoot } from "../state/root";

/** The parsed attach input: the optional positional run id. */
export type AttachOptions = {
  readonly runId?: string | undefined;
};

/** The registry surface attach reads. It performs no registry mutation. */
export interface AttachRegistry {
  findByIdGlobal(id: RunId): RunRecord | undefined;
  listForRepository(repositoryPath: RepositoryPath): readonly RunRecord[];
}

/** Choose one candidate among several on an interactive terminal. */
export type RunPicker = (
  candidates: readonly AttachCandidate[],
) => Promise<RunId>;

/** Every injectable seam of the attach command. Production wires real ones. */
export type AttachDeps = {
  /** The invocation directory used to resolve the cwd repository scope. */
  readonly cwd: string;
  /** The process boundary used to resolve the git worktree root. */
  readonly runner: ProcessRunner;
  /** The run registry (read-only for attach). */
  readonly store: AttachRegistry;
  /** The adapter whose liveness probe decides which panes are attachable. */
  readonly adapter: ExecutionAdapter;
  /** The adapter that joins the pane interactively (inherit-stdio in prod). */
  readonly attachAdapter: ExecutionAdapter;
  /** Whether prompting is possible; a transient picker runs only on a TTY. */
  readonly isInteractive: () => boolean;
  /** Transient picker used only when several candidates exist on a TTY. */
  readonly pickRun: RunPicker;
  /** Repository resolver; defaults to {@link resolveRepositoryRoot}. */
  readonly resolveRepository?:
    | ((cwd: string, runner: ProcessRunner) => RepositoryPath)
    | undefined;
  /** Attachment operation; defaults to {@link attachRun}. */
  readonly attachRun?: typeof attachRun | undefined;
  /** Where progress output is written; production uses stdout. */
  readonly writeOut?: ((message: string) => void) | undefined;
};

/** The outcome of a successful attachment. */
export type AttachResult = {
  readonly runId: RunId;
  readonly handle: AttachmentHandle;
};

/** Raised when a run cannot be selected or its pane cannot be joined. */
export class AttachError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachError";
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Join the run's pane through its recorded adapter and handle. A record without
// a recorded handle, or an adapter failure joining the pane, fails non-zero; the
// shared attach operation takes no registry store, so no registry byte changes.
function attachToRecord(record: RunRecord, deps: AttachDeps): AttachResult {
  const handle = record.attachment.handle;
  if (handle === null) {
    throw new AttachError(
      `Run ${record.id} has no attachable pane recorded; its pane is unavailable. The run record was left unchanged.`,
    );
  }
  const write =
    deps.writeOut ??
    ((message: string): void => {
      process.stdout.write(message);
    });
  write(`Attaching to run ${record.id} in pane ${handle}.\n`);
  const doAttach = deps.attachRun ?? attachRun;
  try {
    doAttach(deps.attachAdapter, handle);
  } catch (error) {
    throw new AttachError(
      `Could not attach to the pane for run ${record.id}: ${messageOf(error)}. The run record was left unchanged.`,
    );
  }
  return { runId: record.id, handle };
}

/**
 * Resolve the target run and join its pane. An explicit id resolves globally
 * without prompting; an omitted id selects the sole cwd-scoped attachable run,
 * prompts among several only on a TTY, and otherwise fails with an exact
 * `antmay attach <run-id>` hint. Never mutates the registry.
 */
export async function runAttach(
  options: AttachOptions,
  deps: AttachDeps,
): Promise<AttachResult> {
  const explicit = options.runId?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    const record = deps.store.findByIdGlobal(asRunId(explicit));
    if (record === undefined) {
      throw new AttachError(
        `No run "${explicit}" is registered; run \`antmay status --all\` to list known run ids.`,
      );
    }
    return attachToRecord(record, deps);
  }

  const resolve = deps.resolveRepository ?? resolveRepositoryRoot;
  const repositoryPath = resolve(deps.cwd, deps.runner);
  const records = deps.store.listForRepository(repositoryPath);
  const selection = selectContextualRun(
    records,
    (handle) => deps.adapter.liveness(handle).alive,
  );

  if (selection.kind === "none") {
    throw new AttachError(
      "No attachable run was found for this repository; " +
        "re-run as `antmay attach <run-id>` with an explicit run id.",
    );
  }

  if (selection.kind === "single") {
    return attachToRecord(selection.candidate.record, deps);
  }

  // Several candidates: prompt only on a TTY; otherwise fail with the exact hint
  // and the ambiguous ids, never a recency pick.
  if (!deps.isInteractive()) {
    const ids = selection.candidates.map((c) => c.record.id).join(", ");
    throw new AttachError(
      `Several attachable runs exist for this repository (${ids}); ` +
        "re-run as `antmay attach <run-id>` with one of them.",
    );
  }
  const chosenId = await deps.pickRun(selection.candidates);
  const chosen = selection.candidates.find((c) => c.record.id === chosenId);
  if (chosen === undefined) {
    throw new AttachError(
      `The selected run "${chosenId}" is not one of the attachable runs; ` +
        "re-run as `antmay attach <run-id>`.",
    );
  }
  return attachToRecord(chosen.record, deps);
}

function describeCandidate(candidate: AttachCandidate): string {
  const { record } = candidate;
  return `${record.id}  ${record.skill} (${record.harness}, ${record.classification})  pane ${candidate.handle}`;
}

// The production transient picker: list the candidates, ask for a number, and
// return the chosen run id. The readline interface opens and closes per prompt so
// nothing lingers on the event loop.
async function terminalPickRun(
  candidates: readonly AttachCandidate[],
): Promise<RunId> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    process.stdout.write("Multiple attachable runs:\n");
    candidates.forEach((candidate, index) => {
      process.stdout.write(
        `  [${index + 1}] ${describeCandidate(candidate)}\n`,
      );
    });
    const answer = (await rl.question("Select a run to attach [1]: ")).trim();
    const index = answer.length === 0 ? 0 : Number(answer) - 1;
    const chosen = candidates[index];
    if (chosen === undefined || !Number.isInteger(index)) {
      throw new AttachError(`"${answer}" is not a listed choice.`);
    }
    return chosen.record.id;
  } finally {
    rl.close();
  }
}

// A process boundary that hands the real terminal to the child instead of
// capturing its output, so `attach` joins the pane interactively. Executable
// lookup delegates to the standard captured runner.
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

/** Assemble the production attach dependencies from the real environment. */
export function createProductionAttachDeps(
  cwd: string,
  env: NodeJS.ProcessEnv,
): AttachDeps {
  const runner = new NodeProcessRunner(env);
  const prompt = new TerminalPromptProvider();
  return {
    cwd,
    runner,
    store: new FilesystemRegistryStore(resolveStateRoot(env)),
    adapter: new HerdrAdapter(runner, env),
    attachAdapter: new HerdrAdapter(runner, env, {
      interactiveRunner: new InteractiveProcessRunner(env),
    }),
    isInteractive: () => prompt.isInteractive(),
    pickRun: terminalPickRun,
    writeOut: (message) => {
      process.stdout.write(message);
    },
  };
}

/**
 * Register the `antmay attach` command on the program. The single optional
 * positional `[run-id]` is the only input; the command exposes no cleanup or
 * expiry option.
 */
export function registerAttachCommand(program: Command): void {
  program
    .command("attach")
    .description("Attach to an active or retained Antmay run pane")
    .argument(
      "[run-id]",
      "Run to attach to; omit to select the sole attachable run in this repository",
    )
    .action(async (runId) => {
      await runAttach(
        { runId },
        createProductionAttachDeps(process.cwd(), process.env),
      );
    });
}
