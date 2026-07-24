import { EXIT_FAILURE, EXIT_OK } from "./cli/exit-codes.js";
import { VERSION_LINE } from "./cli/help.js";
import { parseCliArguments, type CliCommand } from "./cli/parse.js";

type RunCommand = Extract<CliCommand, { kind: "run" }>;
type ResumeCommand = Extract<CliCommand, { kind: "resume" }>;
type ListCommand = Extract<CliCommand, { kind: "list" }>;

/**
 * Injection point for the concrete command implementations. Later tasks supply
 * handlers whose command/config/state/Git/harness imports occur dynamically
 * inside the selected handler, keeping the pre-dispatch import graph light.
 */
export interface CommandHandlers {
  run(command: RunCommand): Promise<number>;
  resume(command: ResumeCommand): Promise<number>;
  list(command: ListCommand): Promise<number>;
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
 * the concrete harness dependencies only when `run` was selected, so the
 * command/config/state/Git/harness subsystems stay out of the pre-dispatch
 * static import graph and never load for help, version, or grammar errors.
 */
async function runHandler(command: RunCommand): Promise<number> {
  const [{ runCommand }, { createSandcastleInvoker }, { probeHarnessExecutables }, os] =
    await Promise.all([
      import("./commands/run.js"),
      import("./harness/sandcastle.js"),
      import("./harness/probe.js"),
      import("node:os"),
    ]);

  return runCommand(
    {
      recipe: command.recipe,
      thread: command.thread,
      dangerouslySkipPermissions: command.dangerouslySkipPermissions,
    },
    {
      env: process.env,
      cwd: process.cwd(),
      homedir: os.homedir(),
      invoker: createSandcastleInvoker(),
      probe: probeHarnessExecutables,
      stdout: process.stdout,
      stderr: process.stderr,
      isTTY: process.stdout.isTTY === true,
    },
  );
}

/**
 * The real `resume` handler. Like `run`, it dynamically imports the command
 * implementation and the concrete harness dependencies only when `resume` was
 * selected. `resume` accepts no execution overrides and never rereads settings
 * or recipe definitions, so it imports neither `loadSettings` nor
 * `builtInRecipes` for resolution.
 */
async function resumeHandler(command: ResumeCommand): Promise<number> {
  const [{ resumeCommand }, { createSandcastleInvoker }, { probeHarnessExecutables }, os] =
    await Promise.all([
      import("./commands/resume.js"),
      import("./harness/sandcastle.js"),
      import("./harness/probe.js"),
      import("node:os"),
    ]);

  return resumeCommand(
    { runId: command.runId },
    {
      env: process.env,
      cwd: process.cwd(),
      homedir: os.homedir(),
      invoker: createSandcastleInvoker(),
      probe: probeHarnessExecutables,
      stdout: process.stdout,
      stderr: process.stderr,
      isTTY: process.stdout.isTTY === true,
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
    isTTY: process.stdout.isTTY === true,
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
