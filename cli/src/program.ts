import { EXIT_FAILURE, EXIT_OK } from "./cli/exit-codes.js";
import { VERSION_LINE } from "./cli/help.js";
import { parseCliArguments, type CliCommand } from "./cli/parse.js";

type RunCommand = Extract<CliCommand, { kind: "run" }>;
type ResumeCommand = Extract<CliCommand, { kind: "resume" }>;
type ListCommand = Extract<CliCommand, { kind: "list" }>;

/**
 * Injection point for the concrete command implementations. Every handler's
 * command/config/state/Git/harness imports occur dynamically inside the selected
 * handler, keeping the pre-dispatch import graph light.
 */
export interface CommandHandlers {
  run(command: RunCommand): Promise<number>;
  resume(command: ResumeCommand): Promise<number>;
  list(command: ListCommand): Promise<number>;
}

/**
 * Whether the display emits ANSI color, resolved once from the process the
 * handlers below read and handed to a command as the single answer rather than
 * the inputs to recombine. Dispatch owns it because dispatch is the only place
 * the real environment and the real stdout are read.
 *
 * `NO_COLOR` outranks everything: any non-empty value keeps color off, so an
 * explicit off never loses to an on switch a wrapper exported. Otherwise
 * `FORCE_COLOR` turns color on — any value but empty or `0` — which is what
 * makes a piped stdout render in color for a pager, a CI log, or a driver
 * capturing the stream. With neither set, a terminal stdout decides. No
 * color-level value is interpreted: color is on or off.
 */
export function resolveDisplayColor(
  env: NodeJS.ProcessEnv,
  isTTY: boolean,
): boolean {
  if ((env.NO_COLOR ?? "") !== "") return false;
  const forced = env.FORCE_COLOR ?? "";
  if (forced !== "" && forced !== "0") return true;
  return isTTY;
}

/**
 * Parse `argv` and dispatch. `help`/`version`/`usage-error` are handled here
 * before any handler runs; the three real subcommands defer to the injected
 * handlers. Never prompts and has no effect merely from being imported.
 */
export async function runMain(
  argv: string[],
  handlers: CommandHandlers,
): Promise<number> {
  const command = parseCliArguments(argv);
  switch (command.kind) {
    case "help":
      process.stdout.write(`${command.text}\n`);
      return EXIT_OK;
    case "version":
      process.stdout.write(`${VERSION_LINE}\n`);
      return EXIT_OK;
    case "usage-error":
      process.stderr.write(`${command.message}\n${command.usage}\n`);
      return EXIT_FAILURE;
    case "run":
      return handlers.run(command);
    case "resume":
      return handlers.resume(command);
    case "list":
      return handlers.list(command);
  }
}

/**
 * The real `run` handler. It dynamically imports the command implementation and
 * the lazy harness-runtime loader only when `run` was selected, so the
 * command/config/state/Git/harness subsystems stay out of the pre-dispatch
 * static import graph and never load for help, version, or grammar errors.
 * Neither adapter family is imported here: the loader resolves exactly the one
 * the run's runtime selects.
 */
async function runHandler(command: RunCommand): Promise<number> {
  const [{ runCommand }, { productionHarnessRuntimeLoader }, os] =
    await Promise.all([
      import("./commands/run.js"),
      import("./harness/runtime.js"),
      import("node:os"),
    ]);

  return runCommand(
    {
      pipeline: command.pipeline,
      thread: command.thread,
      ...(command.from !== undefined ? { from: command.from } : {}),
      ...(command.profile !== undefined ? { profile: command.profile } : {}),
      dangerouslySkipPermissions: command.dangerouslySkipPermissions,
    },
    {
      env: process.env,
      cwd: process.cwd(),
      homedir: os.homedir(),
      harnessRuntime: productionHarnessRuntimeLoader,
      stdout: process.stdout,
      stderr: process.stderr,
      color: resolveDisplayColor(process.env, process.stdout.isTTY === true),
    },
  );
}

/**
 * The real `resume` handler. Like `run`, it dynamically imports the command
 * implementation and the lazy harness-runtime loader only when `resume` was
 * selected. `resume` accepts no execution overrides and rereads no pipeline,
 * execution-profile, or settings document, so it imports none of their loaders.
 */
async function resumeHandler(command: ResumeCommand): Promise<number> {
  const [{ resumeCommand }, { productionHarnessRuntimeLoader }, os] =
    await Promise.all([
      import("./commands/resume.js"),
      import("./harness/runtime.js"),
      import("node:os"),
    ]);

  return resumeCommand(
    { runId: command.runId },
    {
      env: process.env,
      cwd: process.cwd(),
      homedir: os.homedir(),
      harnessRuntime: productionHarnessRuntimeLoader,
      stdout: process.stdout,
      stderr: process.stderr,
      color: resolveDisplayColor(process.env, process.stdout.isTTY === true),
    },
  );
}

/**
 * The real `list` handler. Like `run` and `resume`, it dynamically imports the
 * command implementation only when `list` was selected, keeping the state
 * modules out of the pre-dispatch static import graph. `list` reads only the
 * state root, so it imports no config, harness, or Git dependency.
 */
async function listHandler(_command: ListCommand): Promise<number> {
  const [{ listCommand }, os] = await Promise.all([
    import("./commands/list.js"),
    import("node:os"),
  ]);

  return listCommand({
    env: process.env,
    homedir: os.homedir(),
    stdout: process.stdout,
    stderr: process.stderr,
    color: resolveDisplayColor(process.env, process.stdout.isTTY === true),
  });
}

/**
 * Side-effect-free entry used by the bootstrap: dispatches through `runMain`.
 * Each of the three subcommand handlers dynamically imports its dependencies on
 * selection, so nothing heavy loads for help, version, or grammar errors.
 */
export async function runProgram(argv: string[]): Promise<number> {
  return runMain(argv, {
    run: runHandler,
    resume: resumeHandler,
    list: listHandler,
  });
}
