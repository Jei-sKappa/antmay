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

function notImplemented(name: string): () => Promise<number> {
  return async () => {
    process.stderr.write(`antmay: '${name}' is not implemented yet\n`);
    return EXIT_FAILURE;
  };
}

/**
 * Side-effect-free entry used by the bootstrap: dispatches through `runMain`
 * with placeholder handlers. Later tasks replace these placeholders with real
 * handlers that dynamically import their heavy dependencies on selection.
 */
export async function runProgram(argv: string[]): Promise<number> {
  return runMain(argv, {
    run: notImplemented("afk run"),
    resume: notImplemented("afk resume"),
    list: notImplemented("afk list"),
  });
}
